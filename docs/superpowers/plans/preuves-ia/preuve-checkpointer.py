"""Preuve P1 du plan 0.5 (IA) : `AsyncPostgresSaver` avec le réglage de pool de popote-api, un graphe parent et un
sous-graphe interrompu, en mode strict de sérialisation.

Un processus Python neuf par phase :
  init              crée les tables du saver (DDL de `MIGRATIONS` sans CONCURRENTLY, versions 0 à 9) dans une base jetable ;
  run               exécute le parent et son sous-graphe jusqu'à l'interrupt de validation (le « sommeil » du conteneur) ;
  mauvaise_reprise  une reprise invalide est refusée et n'écrit aucun point de contrôle ;
  elague            `aprune(keep_latest)` ne garde qu'un point de contrôle **par espace de noms** (le parent et le sous-graphe : 2),
                    l'interruption en attente est conservée ;
  reprise           la bonne reprise, dans un processus neuf, continue (après un élagage aussi) sans refaire l'appel au modèle ;
  rejeu             une seconde reprise après la fin ne fait rien ;
  course            (à lancer après `run`, à la place de `reprise`) deux reprises simultanées : l'écriture a lieu deux fois ;
  nouvelle_entree   (après `run`) un nouveau message sur un fil dont un sous-graphe est interrompu : l'ancienne interruption
                    est abandonnée, le sous-graphe repart de zéro (un second appel au modèle) sur la nouvelle phrase ;
  efface            `adelete_thread` vide les trois tables.

Le pool est celui de `popote_api.infra.db.cree_pool` **sans `row_factory`** (le saver pose `dict_row` sur ses curseurs) ;
le saver reçoit un sérialiseur **strict** (`allowed_msgpack_modules=None`) : l'état ne contient que des types simples.

Rejeu, depuis un dossier de travail neuf (jamais dans un dépôt : l'interpréteur lit son dossier courant) :
  psql "$PGURL_ADMIN" -c 'create database ia_essai'          # pile Supabase locale, jamais l'essai ni la prod
  uv venv venv && VIRTUAL_ENV=venv uv pip install --exclude-newer 2026-10-29T00:00:00Z \
      langgraph langgraph-checkpoint-postgres "psycopg[binary]" psycopg-pool pydantic
  seq() { T=$(python3 -c 'import uuid;print(uuid.uuid4())'); for p in "$@"; do
      LANGGRAPH_STRICT_MSGPACK=true venv/bin/python -I preuve-checkpointer.py $p $T || exit 1; done; }
  seq init run mauvaise_reprise elague reprise rejeu efface   # A : reprise, élagage, rejeu, effacement
  seq init run course                                         # B : deux reprises simultanées (écriture 2 : d'où le verrou)
  seq init run nouvelle_entree                                # C : un nouveau message abandonne l'interruption
  psql "$PGURL_ADMIN" -c 'drop database ia_essai'
Le DSN ci-dessous est celui, documenté, de la pile locale (`docs/dev.md` de popote-api) : aucune donnée réelle.
"""

import asyncio
import json
import sys
from typing import TypedDict

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt
from psycopg_pool import AsyncConnectionPool
from pydantic import BaseModel, Field

DSN = "postgresql://postgres:postgres@127.0.0.1:54322/ia_essai"


def pool() -> AsyncConnectionPool:
    # Le réglage de `popote_api.infra.db.cree_pool`, sans `row_factory`.
    return AsyncConnectionPool(
        DSN,
        min_size=0,
        max_size=3,
        open=False,
        timeout=2.0,
        check=AsyncConnectionPool.check_connection,
        kwargs={"autocommit": True, "prepare_threshold": None, "connect_timeout": 5},
    )


class Recap(BaseModel):
    repas: str = Field(max_length=80)
    kcal: int = Field(ge=0, le=3000)
    confirme: bool


class Etat(TypedDict, total=False):  # que des types simples : le mode strict n'accepte rien d'autre
    phrase: str
    recap: dict
    ecrit: bool


async def un(c, sql, params=()):
    return (await (await c.execute(sql, params)).fetchone())[0]


async def compte(p: AsyncConnectionPool, nom: str) -> None:
    async with p.connection() as c:
        await c.execute("create table if not exists effets(nom text, n int default 0)")
        await c.execute(
            "insert into effets(nom,n) select %s,0 where not exists (select 1 from effets where nom=%s)", (nom, nom)
        )
        await c.execute("update effets set n=n+1 where nom=%s", (nom,))


def sous_graphe(p: AsyncConnectionPool):
    async def comprendre(e: Etat) -> Etat:
        await compte(p, "appel_modele")  # simule l'appel au modèle (payant) : il ne doit se faire qu'une fois
        return {"recap": {"repas": e["phrase"], "kcal": 650, "confirme": False}}

    async def valider(e: Etat) -> Etat:
        await compte(p, "avant_interrupt")  # un effet AVANT interrupt() se rejoue à chaque reprise
        rep = interrupt(e["recap"], response_schema=Recap)
        return {"recap": rep.model_dump()}

    async def ecrire(e: Etat) -> Etat:
        await compte(p, "ecriture")
        return {"ecrit": True}

    g = StateGraph(Etat)
    g.add_node("comprendre", comprendre)
    g.add_node("valider", valider)
    g.add_node("ecrire", ecrire)
    g.add_edge(START, "comprendre")
    g.add_edge("comprendre", "valider")
    g.add_edge("valider", "ecrire")
    g.add_edge("ecrire", END)
    return g.compile()


def graphe(p: AsyncConnectionPool, saver: AsyncPostgresSaver):
    async def route(e: Etat) -> Etat:
        return {}

    g = StateGraph(Etat)
    g.add_node("route", route)
    g.add_node("noter", sous_graphe(p))
    g.add_edge(START, "route")
    g.add_edge("route", "noter")
    g.add_edge("noter", END)
    return g.compile(checkpointer=saver)


BONNE = {"repas": "pâtes au pesto", "kcal": 620, "confirme": True}


async def nb_points(p, thread) -> int:
    async with p.connection() as c:
        return await un(c, "select count(*) from checkpoints where thread_id=%s", (thread,))


async def main(phase: str, thread: str) -> None:
    p = pool()
    await p.open()
    saver = AsyncPostgresSaver(p, serde=JsonPlusSerializer(allowed_msgpack_modules=None))  # strict
    if phase == "init":
        async with p.connection() as c:
            await c.execute("drop table if exists checkpoint_migrations, checkpoints, checkpoint_blobs, checkpoint_writes, effets")
            for i, m in enumerate(AsyncPostgresSaver.MIGRATIONS):
                await c.execute(m.replace("CONCURRENTLY ", ""))  # comme le ferait notre migration
                await c.execute("insert into checkpoint_migrations(v) values (%s)", (i,))  # versions 0 à 9, comme setup()
        print("init ok :", len(AsyncPostgresSaver.MIGRATIONS), "migrations du saver")
        await p.close()
        return
    g = graphe(p, saver)
    cfg = {"configurable": {"thread_id": thread}}
    if phase == "run":
        out = [c async for c in g.astream({"phrase": "pâtes au pesto"}, cfg, durability="sync")]
        print("RUN", json.dumps(out, default=str)[:160])
    elif phase == "mauvaise_reprise":
        avant = await nb_points(p, thread)
        try:
            async for _ in g.astream(Command(resume={"repas": "x", "kcal": 99999, "confirme": True}), cfg, durability="sync"):
                pass
        except Exception as e:  # noqa: BLE001 - on veut le type, rien d'autre
            print("MAUVAISE REPRISE ->", type(e).__name__)
        apres = await nb_points(p, thread)
        print("encore en attente :", (await g.aget_state(cfg)).next, "| points de contrôle avant/après :", avant, apres)
        assert avant == apres, "une reprise invalide a écrit un point de contrôle"
    elif phase == "elague":
        avant = await nb_points(p, thread)
        await saver.aprune([thread], strategy="keep_latest")
        apres = await nb_points(p, thread)
        st = await g.aget_state(cfg)
        print("élagage : points de contrôle", avant, "->", apres, "| toujours interrompu :", bool(st.next), st.next)
        assert apres == 2 and st.next, "l'élagage a perdu un espace de noms ou l'interruption"
    elif phase == "reprise":
        out = [c async for c in g.astream(Command(resume=BONNE), cfg, durability="sync")]
        print("REPRISE", json.dumps(out, default=str)[:160])
        st = await g.aget_state(cfg)
        print("fin :", st.values, "| suite :", st.next)
    elif phase == "rejeu":
        out = [c async for c in g.astream(Command(resume=BONNE), cfg, durability="sync")]
        print("REJEU", out)
    elif phase == "course":

        async def une():
            return [c async for c in g.astream(Command(resume=BONNE), cfg, durability="sync")]

        res = await asyncio.gather(une(), une(), return_exceptions=True)
        print("COURSE", [type(r).__name__ if isinstance(r, Exception) else len(r) for r in res])
        async with p.connection() as c:
            n = await un(c, "select n from effets where nom='ecriture'")
        assert n == 2, "la course n'a pas reproduit la double écriture que le verrou de reprise du plan doit fermer"
    elif phase == "nouvelle_entree":
        out = [c async for c in g.astream({"phrase": "autre phrase"}, cfg, durability="sync")]
        st = await g.aget_state(cfg)
        print("NOUVELLE ENTREE", json.dumps(out, default=str)[:200])
        print("   état :", st.values, "| suite :", st.next)
        assert st.values.get("phrase") == "autre phrase" and st.next, "l'ancienne interruption n'a pas été abandonnée"
        async with p.connection() as c:
            assert await un(c, "select n from effets where nom='appel_modele'") == 2, "le sous-graphe devait repartir de zéro"
    elif phase == "efface":
        await saver.adelete_thread(thread)
        async with p.connection() as c:
            for t in ("checkpoints", "checkpoint_blobs", "checkpoint_writes"):
                print(t, await un(c, f"select count(*) from {t} where thread_id=%s", (thread,)))  # noqa: S608
    async with p.connection() as c:
        rows = await (await c.execute("select nom, n from effets order by nom")).fetchall()
        print("effets :", {r[0]: r[1] for r in rows})
    await p.close()


asyncio.run(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "t"))
