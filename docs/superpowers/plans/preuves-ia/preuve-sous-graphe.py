"""Preuve P2 du plan 0.5 (IA) : un sous-graphe interrompu se reprend par le parent ; la diffusion `custom` des nœuds
d'un sous-graphe n'arrive qu'avec `subgraphs=True`.

Rejeu (mêmes réserves que `preuve-checkpointer.py`, saveur mémoire : aucune base) :
  VIRTUAL_ENV=venv uv pip install --exclude-newer 2026-10-29T00:00:00Z langgraph && venv/bin/python -I preuve-sous-graphe.py
Sortie relevée le 13/11/2026 :
  plat  [('custom', {'delta': 'x'}), ('updates', ...)]
  sous  [('custom', {'delta': 'x'}), ('updates', ...), ('updates', ...)]            # le 'y' du sous-graphe est absent
        custom + subgraphs=True : [((), {'delta': 'x'}), (('s:<id>',), {'delta': 'y'})]
  reprise : interruption dans le sous-graphe, reprise par le parent, `kcal` 620 écrit une fois.
"""

import asyncio
import operator
from typing import Annotated, TypedDict

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt


class E(TypedDict, total=False):
    a: str


async def n(e: E) -> E:
    get_stream_writer()({"delta": "x"})
    return {"a": "ok"}


async def m(e: E) -> E:
    get_stream_writer()({"delta": "y"})
    return {}


def construit(avec_sous_graphe: bool):
    g = StateGraph(E)
    if avec_sous_graphe:
        s = StateGraph(E)
        s.add_node("m", m)
        s.add_edge(START, "m")
        s.add_edge("m", END)
        g.add_node("n", n)
        g.add_node("s", s.compile())
        g.add_edge(START, "n")
        g.add_edge("n", "s")
        g.add_edge("s", END)
    else:
        g.add_node("n", n)
        g.add_edge(START, "n")
        g.add_edge("n", END)
    return g.compile(checkpointer=InMemorySaver())


class Parent(TypedDict, total=False):
    messages: Annotated[list, operator.add]
    phrase: str
    recap: dict
    ecrit: bool


class Sous(TypedDict, total=False):
    phrase: str
    recap: dict
    ecrit: bool


def avec_interruption():
    async def comprendre(e: Sous) -> Sous:
        return {"recap": {"repas": e["phrase"], "kcal": 650}}

    async def valider(e: Sous) -> Sous:
        return {"recap": {**e["recap"], **interrupt(e["recap"])}}

    async def ecrire(e: Sous) -> Sous:
        return {"ecrit": True}

    s = StateGraph(Sous)
    for nom, f in (("comprendre", comprendre), ("valider", valider), ("ecrire", ecrire)):
        s.add_node(nom, f)
    s.add_edge(START, "comprendre")
    s.add_edge("comprendre", "valider")
    s.add_edge("valider", "ecrire")
    s.add_edge("ecrire", END)

    async def route(e: Parent) -> Parent:
        return {"phrase": e["messages"][-1]}

    g = StateGraph(Parent)
    g.add_node("route", route)
    g.add_node("noter", s.compile())
    g.add_edge(START, "route")
    g.add_edge("route", "noter")
    g.add_edge("noter", END)
    return g.compile(checkpointer=InMemorySaver())


async def main() -> None:
    for sous in (False, True):
        g = construit(sous)
        sortie = [x async for x in g.astream({"a": ""}, {"configurable": {"thread_id": "t"}}, stream_mode=["custom", "updates"])]
        print("sous" if sous else "plat", sortie)
        sortie = [
            x
            async for x in g.astream({"a": ""}, {"configurable": {"thread_id": "t2"}}, stream_mode="custom", subgraphs=True)
        ]
        print("   custom + subgraphs=True :", sortie)
    g = avec_interruption()
    cfg = {"configurable": {"thread_id": "t3"}}
    print("run   :", [x async for x in g.astream({"messages": ["lasagnes"]}, cfg)][-1])
    print("reprise:", [x async for x in g.astream(Command(resume={"kcal": 620}), cfg)])


asyncio.run(main())
