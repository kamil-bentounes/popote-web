"""Preuve P1 du plan 0.5 (IA) : `AsyncPostgresSaver` avec le réglage de pool de popote-api.

Ce que le script prouve, un processus Python neuf par phase :
  init              crée les tables du saver (DDL de `MIGRATIONS` sans CONCURRENTLY) dans une base jetable ;
  run               exécute le graphe jusqu'à l'interrupt de validation (le « sommeil » du conteneur) ;
  mauvaise_reprise  une reprise invalide est refusée et n'écrit rien ;
  reprise           la bonne reprise, dans un autre processus, continue sans refaire l'appel au modèle ;
  rejeu             une seconde reprise après la fin ne fait rien ;
  course            (à lancer après `run`, à la place de `reprise`) deux reprises simultanées : l'écriture a lieu deux
                    fois (d'où le verrou de reprise du plan) ;
  elague            `aprune(keep_latest)` ramène le fil à un seul point de contrôle (à lancer après `run` ou `reprise`) ;
  efface            `adelete_thread` vide les trois tables.

Rejeu, depuis un dossier de travail neuf (jamais dans un dépôt : l'interpréteur lit son dossier courant) :
  psql "$PGURL_ADMIN" -c 'create database ia_essai'          # pile Supabase locale, jamais l'essai ni la prod
  uv venv venv && VIRTUAL_ENV=venv uv pip install --exclude-newer 2026-10-29T00:00:00Z \
      langgraph langgraph-checkpoint-postgres "psycopg[binary]" psycopg-pool pydantic
  T=$(python3 -c 'import uuid;print(uuid.uuid4())'); for p in init run mauvaise_reprise reprise rejeu efface; do
      venv/bin/python -I preuve-checkpointer.py $p $T; done
  psql "$PGURL_ADMIN" -c 'drop database ia_essai'
Le DSN ci-dessous est celui, documenté, de la pile locale (`docs/dev.md` de popote-api) : aucune donnée réelle.
"""

import asyncio
import json
import sys
from typing import TypedDict

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from pydantic import BaseModel, Field

DSN = "postgresql://postgres:postgres@127.0.0.1:54322/ia_essai"


def pool() -> AsyncConnectionPool:
    # Le réglage de `popote_api.infra.db.cree_pool`, plus `row_factory` (exigé par le saver).
    return AsyncConnectionPool(
        DSN,
        min_size=0,
        max_size=3,
        open=False,
        timeout=2.0,
        check=AsyncConnectionPool.check_connection,
        kwargs={"autocommit": True, "prepare_threshold": None, "connect_timeout": 5, "row_factory": dict_row},
    )


class Recap(BaseModel):
    repas: str = Field(max_length=80)
    kcal: int = Field(ge=0, le=3000)
    confirme: bool


class Etat(TypedDict, total=False):
    phrase: str
    recap: dict
    ecrit: bool


async def compte(p: AsyncConnectionPool, nom: str) -> None:
    async with p.connection() as c:
        await c.execute("create table if not exists effets(nom text, n int default 0)")
        await c.execute(
            "insert into effets(nom,n) select %s,0 where not exists (select 1 from effets where nom=%s)", (nom, nom)
        )
        await c.execute("update effets set n=n+1 where nom=%s", (nom,))


def graphe(p: AsyncConnectionPool, saver: AsyncPostgresSaver):
    async def comprendre(e: Etat) -> Etat:
        await compte(p, "appel_modele")  # simule l'appel au modèle (payant) : il ne doit se faire qu'une fois
        return {"recap": {"repas": "pâtes au pesto", "kcal": 650, "confirme": False}}

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
    return g.compile(checkpointer=saver)


BONNE = {"repas": "pâtes au pesto", "kcal": 620, "confirme": True}


async def main(phase: str, thread: str) -> None:
    p = pool()
    await p.open()
    saver = AsyncPostgresSaver(p)
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
        print("RUN", json.dumps(out, default=str)[:200])
    elif phase == "mauvaise_reprise":
        async with p.connection() as c:
            avant = (await (await c.execute("select count(*) n from checkpoints where thread_id=%s", (thread,))).fetchone())["n"]
        try:
            async for _ in g.astream(Command(resume={"repas": "x", "kcal": 99999, "confirme": True}), cfg, durability="sync"):
                pass
        except Exception as e:  # noqa: BLE001 - on veut le type, rien d'autre
            print("MAUVAISE REPRISE ->", type(e).__name__)
        async with p.connection() as c:
            apres = (await (await c.execute("select count(*) n from checkpoints where thread_id=%s", (thread,))).fetchone())["n"]
        print("encore en attente :", (await g.aget_state(cfg)).next, "| points de contrôle avant/après :", avant, apres)
        assert avant == apres, "une reprise invalide a écrit un point de contrôle"
        # (l'état du graphe est inchangé ; le nœud interrompu s'est rejoué, d'où `avant_interrupt`)
    elif phase == "reprise":
        out = [c async for c in g.astream(Command(resume=BONNE), cfg, durability="sync")]
        print("REPRISE", json.dumps(out, default=str)[:200])
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
    elif phase == "elague":
        async with p.connection() as c:
            avant = (await (await c.execute("select count(*) n from checkpoints where thread_id=%s", (thread,))).fetchone())["n"]
        await saver.aprune([thread], strategy="keep_latest")
        async with p.connection() as c:
            apres = (await (await c.execute("select count(*) n from checkpoints where thread_id=%s", (thread,))).fetchone())["n"]
        print("élagage : points de contrôle", avant, "->", apres, "| état relu :", (await g.aget_state(cfg)).next)
        assert apres == 1
    elif phase == "efface":
        await saver.adelete_thread(thread)
        async with p.connection() as c:
            for t in ("checkpoints", "checkpoint_blobs", "checkpoint_writes"):
                r = await (await c.execute(f"select count(*) n from {t} where thread_id=%s", (thread,))).fetchone()  # noqa: S608
                print(t, r["n"])
    async with p.connection() as c:
        rows = await (await c.execute("select nom, n from effets order by nom")).fetchall()
        print("effets :", {r["nom"]: r["n"] for r in rows})
    await p.close()


asyncio.run(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "t"))
