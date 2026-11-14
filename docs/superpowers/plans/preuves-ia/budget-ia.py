"""Budget de l'IA de Popote (plan IA v3, 14/11/2026) : arithmétique seule, aucun appel, aucune clé.

Rejeu : `python3 -I budget-ia.py` (bibliothèque standard seulement). Les prix sont ceux de la page
<https://aistudio.google.com/docs/pricing> relevée le 14/11/2026, **au 01/01/2027** (le prix le plus haut annoncé) :
  gemini-3.5-flash-lite 0,30 / 2,50 $ (aucun changement annoncé) ; gemini-4-hydrogen 1,50 / 7,50 $ (aucun changement) ;
  gemini-4-argon et gemini-4-carbon 4,00 / 20,00 $ (depuis le 01/12/2026) ; gemini-3.8-flash 1,50 / 7,50 $ (depuis le 01/01/2027) ;
  voix `gemini-3.8-flash-lite-tts` 1,00 $ (texte) / 12,00 $ (audio) ; dictée `gemini-3.5-transcribe` ≈ 0,005 $ la minute.
Les jetons par tâche sont des HYPOTHÈSES (le plan les mesure en I16) ; la réflexion est comptée en sortie.
"""

from dataclasses import dataclass

JOURS = 30

# prix en dollars par million de jetons : (entrée, sortie)
PRIX = {
    "F": (0.30, 2.50),   # gemini-3.5-flash-lite
    "H": (1.50, 7.50),   # gemini-4-hydrogen
    "A": (4.00, 20.00),  # gemini-4-argon, gemini-4-carbon (01/12/2026)
    "T38": (1.50, 7.50), # gemini-3.8-flash (01/01/2027)
    "Hb": (0.75, 3.75),  # gemini-4-hydrogen, API Batch (« Batch API (50% cost reduction) », page des prix du 14/11/2026)
}


def appel(modele: str, entree: int, sortie: int, reflexion: int) -> float:
    """Coût d'UN appel, à froid (sans cache), réflexion comprise dans la sortie."""
    pe, ps = PRIX[modele]
    return (entree * pe + (sortie + reflexion) * ps) / 1e6


def repondre_directe(m: str) -> float:
    """Une passe : 4 900 jetons d'entrée (système + outils 2 500, contexte 1 000, 12 messages 1 200, situation et question 200)."""
    return appel(m, 4900, 450, 300 if m == "F" else 400)


def repondre_outils(m: str) -> float:
    """Deux passes : la seconde rejoue la première et ajoute 1 650 jetons d'appel et de résultats d'outils."""
    r = 300 if m == "F" else 400
    return appel(m, 4900, 150, r) + appel(m, 6550, 450, r)


def repondre_prechargee(m: str) -> float:
    """Une passe, mais l'aiguillage a nommé les données utiles : le serveur les met dans le contexte (+1 500 jetons) au lieu
    d'une boucle d'outils (levier « un appel au lieu de deux »)."""
    return appel(m, 6400, 450, 300 if m == "F" else 400)


@dataclass
class Poste:
    nom: str
    par_jour: float
    cout_appel: float          # dollars par appel (ou par unité)
    modele: str

    @property
    def mois(self) -> float:
        return self.par_jour * JOURS * self.cout_appel


def postes_hors_reponses(fort: str) -> list[Poste]:
    """Tout sauf `repondre` ; `fort` = le modèle des tâches difficiles."""
    return [
        Poste("estimer", 1.5, appel(fort, 3000, 500, 400), fort),
        Poste("lire une recette (texte, lien, dictée)", 2, appel(fort, 6000, 1200, 400), fort),
        Poste("photo de recette", 1, appel(fort, 2400, 2000, 400), fort),
        Poste("ticket", 1, appel(fort, 3500, 800, 400), fort),
        Poste("étiquette", 2, appel(fort, 2200, 300, 400), fort),
        Poste("photo du frigo", 1, appel(fort, 3000, 600, 400), fort),
        Poste("inventer (ou ajuster)", 2, appel(fort, 1800, 2500, 600), fort),
        # banque : un lot par soir et par compte (joint + deux comptes perso), 25 opérations au plus par lot
        # le soir, personne n'attend : API Batch à moitié prix quand le fort est Hydrogen
        Poste("classer la banque (3 lots par soir)", 3, appel("Hb" if fort == "H" else fort, 2600, 300, 300), fort),
        Poste("repas dit (comprendre)", 3, appel("F", 4340, 450, 200), "F"),
        # l'aide sur l'appli : 6 000 jetons de sections du manuel retrouvées (pas les 58 000 du manuel entier)
        Poste("aider (sections du manuel)", 3, appel("F", 6000, 400, 300), "F"),
    ]


def petites_tches_payantes_au_pire() -> list[Poste]:
    """Ce que le payant porte si tout le gratuit (Groq, Gemini gratuit, Cloudflare) est épuisé."""
    return [
        Poste("aiguillage", 14, appel("F", 2100, 80, 0), "F"),
        Poste("résumer", 4, appel("F", 3040, 350, 100), "F"),
        Poste("extraire des filtres", 2, appel("F", 1200, 150, 0), "F"),
    ]


VOIX_PAR_REPONSE = (75 * 1.00 + 500 * 12.00) / 1e6   # 300 caractères ≈ 75 jetons de texte, ≈ 20 s ≈ 500 jetons audio (25 par seconde)
DICTEE_PAR_MINUTE = 0.005


def scenario(nom: str, part_outils: float, modele_outils: str, modele_direct: str, fort: str,
             reponses_par_jour: float = 50, voix_par_jour: float = 8, dictee_min_par_jour: float = 4,
             au_pire: bool = False) -> dict:
    d = repondre_directe(modele_direct)
    o = repondre_prechargee(modele_outils)
    par_reponse = (1 - part_outils) * d + part_outils * o
    reponses = reponses_par_jour * JOURS * par_reponse
    autres = sum(p.mois for p in postes_hors_reponses(fort))
    petites = sum(p.mois for p in petites_tches_payantes_au_pire()) if au_pire else 0.0
    voix = voix_par_jour * JOURS * VOIX_PAR_REPONSE
    dictee = dictee_min_par_jour * JOURS * DICTEE_PAR_MINUTE if au_pire else 0.0
    total = reponses + autres + petites + voix + dictee
    return {"nom": nom, "par_reponse": par_reponse, "reponses": reponses, "autres": autres, "petites": petites,
            "voix": voix, "dictee": dictee, "total": total}


def reponses_par_jour_possibles(plafond_reponses: float, par_reponse: float) -> float:
    return plafond_reponses / (JOURS * par_reponse)


# --- le coût des mesures (une fois, avant l'ouverture) : cas, jetons (entrée, sortie, réflexion) et modèles essayés ---
# (jeu, nombre de cas, entrée, sortie, réflexion, difficile ?) ; « difficile » : le fort est mesuré aussi
JEUX = [
    ("repondre (avec outils, deux passes comptées)", 140, 11450, 600, 700, True),
    ("repondre : chiffres, abstention, aide, recherche (une passe)", 160, 4900, 450, 400, True),
    ("declarer_charges (10 dialogues de 30 tours, une passe par tour)", 300, 4900, 300, 300, True),
    ("naviguer", 80, 2100, 80, 0, False),
    ("aiguillage", 120, 2100, 80, 0, False),
    ("noter_repas (comprendre)", 80, 4340, 450, 200, False),
    ("estimer (100 plats)", 100, 3000, 500, 400, True),
    ("lire une recette (texte 40, lien 20)", 60, 6000, 1200, 400, True),
    ("lire une recette (photo)", 30, 2400, 2000, 400, True),
    ("ticket", 60, 3500, 800, 400, True),
    ("étiquette", 60, 2200, 300, 400, True),
    ("frigo", 40, 3000, 600, 400, True),
    ("inventer (40 recettes, dont allergènes)", 40, 1800, 2500, 600, True),
    ("remplacer un ingrédient", 60, 1500, 300, 300, True),
    ("préférences alimentaires (tranche bloquante)", 80, 4900, 450, 400, True),
    ("classer la banque (300 libellés en lots de 25, deux temps)", 24, 2600, 600, 300, True),
    ("résumer", 30, 3040, 350, 100, False),
    ("dictée : Whisper contre Gemini (secondes d'audio, hors jetons)", 0, 0, 0, 0, False),
]


def cout_des_mesures() -> dict:
    """Étage 1 : le petit (F) sur tout, le fort Hydrogen (H) sur les jeux difficiles, une passe.
    Étage 2 : le plus fort de Gemini (Carbon, 4,00 / 20,00 $) sur 20 cas tirés de chaque jeu difficile (borne haute de la qualité).
    Étage 3 : une seconde passe des finalistes sur les tranches proches d'un seuil (20 % des cas des jeux difficiles)."""
    e1 = e2 = e3 = 0.0
    for _, n, ent, sor, ref, dur in JEUX:
        e1 += n * appel("F", ent, sor, ref if ref else 0)
        if dur:
            e1 += n * appel("H", ent, sor, ref)
            e2 += min(n, 20) * appel("A", ent, sor, ref)
            e3 += 0.2 * n * appel("H", ent, sor, ref)
    audio = 60 * 2 * 25 / 60 * DICTEE_PAR_MINUTE + 60 * 5 / 60 * DICTEE_PAR_MINUTE  # 120 dictées de 25 s et 60 phrases de cuisine de 5 s
    voix = 40 * VOIX_PAR_REPONSE * 6  # 10 phrases × 4 voix candidates × 1 relecture
    embeddings = 2161 * 400 / 1e6 * 0.20  # 2 161 recettes de ≈ 400 jetons, gemini-embedding-2 à 0,20 $ le million (texte)
    return {"étage 1": e1, "étage 2": e2, "étage 3": e3, "dictée": audio, "voix": voix, "embeddings": embeddings,
            "total": e1 + e2 + e3 + audio + voix + embeddings}


def main() -> None:
    print("coût d'un appel, à froid, aux prix du 01/01/2027 (dollars)")
    for m in ("F", "H", "A"):
        print(f"  {m}: directe {repondre_directe(m):.4f}   préchargée {repondre_prechargee(m):.4f}   avec outils {repondre_outils(m):.4f}")
    print()
    cas = [  # (nom, part des réponses au fort, modèle des réponses fortes, modèle des réponses directes, modèle des autres tâches difficiles)
        ("A  le petit partout (jeu égal mesuré)", 0.0, "F", "F", "F"),
        ("A' le petit répond, tâches difficiles au fort Hydrogen", 0.0, "F", "F", "H"),
        ("B  DÉFAUT : 5 % des réponses au fort Hydrogen", 0.05, "H", "F", "H"),
        ("B2 12 % des réponses au fort (limite en usage normal)", 0.12, "H", "F", "H"),
        ("B3 20 % des réponses au fort Hydrogen", 0.20, "H", "F", "H"),
        ("B4 40 % des réponses au fort Hydrogen", 0.40, "H", "F", "H"),
        ("C  le fort Hydrogen partout pour répondre", 1.0, "H", "H", "H"),
        ("D  le fort Argon partout (et pour tout)", 1.0, "A", "A", "A"),
    ]
    PLAFOND = 15.0
    for au_pire in (False, True):
        print("AU PIRE (tout le gratuit épuisé)" if au_pire else "NORMAL (Groq et gratuit portent les petites tâches)")
        for nom, part, mo, md, fort in cas:
            r = scenario(nom, part, mo, md, fort, au_pire=au_pire)
            reste = PLAFOND - (r["autres"] + r["voix"] + r["petites"] + r["dictee"])
            cap = reponses_par_jour_possibles(reste, r["par_reponse"])
            print(f"  {nom:<56} réponses {r['reponses']:6.2f}  autres {r['autres']:5.2f}  voix {r['voix']:4.2f}"
                  f"  petites {r['petites'] + r['dictee']:4.2f}  TOTAL {r['total']:6.2f} $  | capacité {cap:6.1f} réponses/jour dans les {reste:5.2f} $ restants")
        print()
    print("capacité = (plafond 15 $ − tout ce qui n'est pas répondre) ÷ (30 jours × coût moyen d'une réponse)")
    print()
    print("mesures, une fois (dollars) :", {k: round(v, 2) for k, v in cout_des_mesures().items()})


if __name__ == "__main__":
    main()
