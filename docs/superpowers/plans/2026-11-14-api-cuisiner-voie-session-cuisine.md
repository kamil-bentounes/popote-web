# « Cuisiner », voie Session, plan et cuisine : K1 à K3, K9 à K12, K16 (durées) — S1 à S14

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** la session (créer, régler, retenir, annuler), le menu proposé, **le calcul du plan** (déterministe, prouvé, asynchrone,
stable), la cuisine pas à pas à deux téléphones et hors ligne (les cinq gestes), les minuteurs et leurs rappels, la pause, l'arrêt, la fin,
et l'apprentissage des durées. **Interfaces, contrat, données, menaces, règles :** [`2026-11-14-api-cuisiner.md`](2026-11-14-api-cuisiner.md),
qui prime. **Dépend de la voie R** pour les recettes (S4 ← R2 ; S6 ← R3) et alimente la voie C (`cook_session`).

**Fichiers de la voie (carte).**

```
src/popote_api/domain/plan/__init__.py
  modele.py        S1  Etape, Lien, Cuisinier, Appareil, Instance, Plan, Phrase
  echelle.py       S1  recette retenue → étapes à l'échelle (durées, places, sorties, préchauffages, liens)
  fusion.py        S2  candidats de fusion, durée fusionnée, refus d'un cycle
  generateur.py    S2  schéma sériel de génération sur des blocs enchaînés, règles du four
  validation.py    S2  vérificateur INDÉPENDANT du générateur (toutes les contraintes)
  recherche.py     S3  candidats, essais semés, recherche locale, coût de déviation
  bornes.py        S3  bornes inférieures (chemin critique, mains, appareils)
  empreinte.py     S3  version = empreinte des entrées
  phrases.py       S3  les phrases typées, le goulot
src/popote_api/domain/menu.py              S6  classement déterministe, raisons typées
src/popote_api/cuisiner/travaux.py         S7  bail, reprise, exécuteur de processus
src/popote_api/cuisiner/gestes.py          S10 horloge : jeton de synchro, bornes
src/popote_api/api/{cuisine,sessions,plans,menu}.py, schemas/{cuisine,sessions,plans}.py
supabase/migrations/<M-S1> la_session.sql · <M-S2> le_plan.sql · <M-S3> la_cuisine.sql
tests/plan/ (cas de référence, exact_grille.py, exact_ordres.py, test_proprietes.py)
```

---

### S1 : Le modèle du plan et la mise à l'échelle (pur)

**Pourquoi :** § 4.3, § 4.5, § 10.3 (« ce qui entre », « les places », « sortir ») ; critère 29. **Dépend de :** R1 (`durees.py`). **Fichiers :** `domain/plan/modele.py`, `echelle.py`,
`tests/unit/plan/test_echelle.py`, `tests/unit/plan/test_modele.py`.

- [ ] **Test rouge d'abord** (`uv run pytest tests/unit/plan/test_echelle.py -q` : `ModuleNotFoundError`) :

```python
from popote_api.domain.plan.echelle import retient, places_prises
from popote_api.domain.plan.modele import Nature
from tests.unit.plan.fabrique import lasagnes   # recette inventée : 6 étapes, un four 180 °C, 4 parts

def test_critere_29_recette_retenue_deux_fois():
    inst = retient([(lasagnes(), 8)], cuisiniers=2, appareils={"four": 2, "plaques": 4})
    par_id = {e.id: e for e in inst.etapes}
    assert par_id["lasagnes:2"].duree == 2 * 6          # tes gestes ×2 (linéaire)
    assert par_id["lasagnes:3"].duree == round(10 * 2 ** 0.5)   # à surveiller : ×√2 ≈ 14
    assert par_id["lasagnes:5"].duree == 40             # sans toi : ne bouge pas
    assert par_id["lasagnes:5"].places == 2             # 2 fois la recette : 2 places dans le four

def test_places_par_fois_et_demie_entamee():
    assert [places_prises(f) for f in (0.5, 1, 1.5, 1.6, 2, 3, 3.5)] == [1, 1, 1, 2, 2, 2, 3]   # spec : 2× → 2 places ; 3,5× → 3
```

- [ ] **Types** (`modele.py`, `@dataclass(frozen=True, slots=True)`) : `Nature(StrEnum)` = `HANDS`, `WATCH`, `ALONE` (correspondance base : `actif`, `bloquant`, `passif`) ; `Etape(id, recette, label_code,
  nature, duree, appareil, temperature, places, aliment, geste, coupe)` ; `Lien(avant, apres, ecart_max)` (**un seul vocabulaire pour les trois enchaînements** : `lancement` d'une étape « sans toi » par le geste qui la
  lance, écart 0 ; `enchainee`, écart ≤ `ecart_chaine` ; `sortie`, le geste de sortie dans les `ecart_chaine` minutes après le minuteur) ; `Dependance(avant, apres)` (précédence simple) ; `Cuisinier(index, a_un_compte)` ;
  `Appareil(code, places)` ; `Instance(session, etapes, liens, dependances, cuisiniers, appareils, ecart_chaine, fixes)` ; `Fixe(etape, cuisinier, debut_rel, fin_rel)` (étapes en cours épinglées pour un recalcul).
- [ ] **Mise à l'échelle** (`echelle.py: retient(recettes, cuisiniers, appareils, *, ecart_chaine=2, apprises=None, fixes=())`) : pour chaque recette `(recette, parts)`, `f = parts / recette.parts` (un seul endroit ; **les
  quantités d'étape ne sont pas réécrites** : elles se montrent à part, spec § 11.1) ; durée = `arrondie(duree_a_l_echelle(base, regle, f))` (R1), **ou la durée apprise** si `apprises` en donne une (médiane, R1/S12) ;
  `places_prises(f) = max(1, ceil(f / 1.5))` (**défini par le test**, pas au hasard) ; **sans dépendance écrite, chaque étape suit la précédente de sa recette** ; une étape « sans toi » qui occupe un appareil reçoit :
  - un **lien de lancement** avec son prédécesseur le plus récent (écart 0) ;
  - un **geste de sortie synthétique** de 1 minute (`HANDS`, label_code `exit_<geste>` : `take_out`, `drain`, `turn_off`), lié par un lien `sortie` — **sauf** si l'étape suivante de la recette est déjà une étape `enchainee`
    (« égoutte » après « fais cuire les pâtes » est le geste de sortie : pas de doublon) ;
  - pour le four : un **préchauffage** par groupe de températures (`regroupe_les_temperatures(temps, ecart=10)`) : étape synthétique « Allume le four » (1 min, `HANDS`) puis `PREHEAT_MIN = 5` min `ALONE` sans sortie ;
    chaque plat du groupe en dépend (D9).
- [ ] **Refus d'avance** (`controle_la_taille(inst)`) : plus de `MAX_ETAPES_PLAN` étapes (recettes **et** synthétiques) → `PlanTropGros` ; une recette qui prend plus de places qu'un appareil n'en a → `AppareilTropPetit(appareil,
  besoin, places)` (jamais coupée en fournées) ; une dépendance en boucle (tri topologique de Kahn) → `DependanceEnBoucle(recette, etapes)` ; un appareil éteint dont une recette a besoin → `AppareilManquant(appareil,
  recettes)` (le front propose « Je rallume le four, ou je les enlève ? »). **Ces refus se décident avant tout calcul** (spec § 10.3, critère 54 : 14 fois une recette dans un four de 8 places → `places_prises = 10` > 8).
- Cas de test : critère 29 ; critère 54 (« Le four n'a que 8 places, il en faut 10 ») ; boucle `4 → 6 → 4` ; 201 étapes → refus ; sortie synthétique **absente** quand la suite est « égoutte » enchaînée ; préchauffage unique
  pour deux plats à 180 et 185 °C, **deux** pour 150 et 220 ; une durée apprise remplace l'estimation ; propriété (graine fixe, 300 menus) : `mise à l'échelle` déterministe, aucune durée < 1, aucune étape sans lien de lancement si
  `ALONE` avec appareil et prédécesseur.
- **Mutations :** `√f` ↔ `f` ; places arrondies vers le bas ; sortie en double ; boucle non détectée.
- **Retour arrière :** supprimer les fichiers.

### S2 : Le générateur (schéma sériel sur blocs enchaînés) et le vérificateur

**Pourquoi :** § 10.3 (contraintes, four, fusion, sortir, enchaîner) ; critères 13, 28, 54. **Dépend de :** S1. **Coupe prévue :** `fusion.py` (S2a) ; `generateur.py` (S2b, ≈ 350 lignes) ; `validation.py` (S2c).
**Fichiers :** `domain/plan/fusion.py`, `generateur.py`, `validation.py`, `tests/unit/plan/test_{fusion,generateur,validation}.py`.

- [ ] **Fusion** (`fusion.py`) : `candidats(inst) -> list[Groupe]` : étapes `HANDS`, **sans appareil**, de recettes **différentes**, de même `(geste, aliment, coupe)` (« émincer » des oignons ; pas des rondelles et des dés).
  `duree_fusionnee(durees) = somme - Σ_{tous sauf la plus longue} min(d_i / 2, 2.5)` (8 et 4 → 10, critère 28 ; 8, 4, 4 → 12). `applique(inst, groupe)` rend une instance où l'étape fusionnée porte les étiquettes de
  ses recettes, les dépendances et successeurs **réunis** ; **refusée si elle crée une boucle** (Kahn) ; **une cuisson ne se fusionne jamais** (`appareil is not None` exclut). Une fusion est **un choix** : l'instance d'origine
  reste valable ; la recherche (S3) décide.
- [ ] **Le générateur** (`generateur.py`) — un bloc est un arbre d'étapes reliées par des `Lien` (racine = l'étape sans lien entrant) ; `genere(inst, priorite, *, restreint_a=None) -> Plan | None` :

```python
def genere(inst: Instance, priorite: Sequence[str], restreint_a: frozenset[int] | None = None) -> Plan | None:
    """Pose les blocs dans l'ordre de `priorite` (le plus prioritaire des blocs prêts), chacun au plus tôt.
    Rend un plan VALIDE ou None. Jamais un plan qui viole une contrainte : `valide(plan, inst)` est rejouée à la fin."""
    occ = Occupation(len(inst.cuisiniers), inst.appareils, inst.fixes)
    blocs = blocs_de(inst)                                   # composantes liées ; dict racine -> arbre
    rang = {e: i for i, e in enumerate(priorite)}
    posees: dict[str, Pose] = {}
    restants = set(blocs)
    while restants:
        prets = [b for b in restants if all(d in posees for d in dependances_externes(blocs[b], inst))]
        if not prets:                                          # une boucle entre blocs : impossible par construction (S1), donc un bug
            raise ErreurInterne("blocs sans issue")
        b = min(prets, key=lambda r: (rang[r], r))
        pret = max((posees[d].fin for d in dependances_externes(blocs[b], inst)), default=0)
        pose = place_le_bloc(blocs[b], pret, inst, occ, posees, restreint_a)
        if pose is None:
            return None                                        # aucun début ne convient jusqu'à l'horizon : « aucun plan » pour cet ordre
        posees.update(pose)
        restants.discard(b)
    plan = Plan.de(posees, inst)
    return plan if not valide(plan, inst) else None            # défense en profondeur

def place_le_bloc(arbre, pret, inst, occ, posees, restreint_a):
    for t in occ.debuts_candidats(pret, horizon=inst.horizon):   # `pret` puis chaque fin connue (+5 pour le four) : plans semi-actifs
        essai: dict[str, Pose] = {}
        if place_l_arbre(arbre.racine, t, arbre, inst, occ, essai, posees, restreint_a):
            occ.valide(essai)                                   # inscrit les réservations (annulables : `occ.annule(essai)`)
            return essai
        occ.annule(essai)
    return None

def place_l_arbre(noeud, debut, arbre, inst, occ, essai, posees, restreint_a) -> bool:
    e = inst.etape(noeud)
    for c in occ.cuisiniers_possibles(e, debut, restreint_a):     # libres sur [debut, fin[ ; triés par (minutes de mains déjà prises, index)
        if not occ.appareil_convient(e, debut):                   # places, écart de température ≤ 10 °C, 5 min de plus de 20 °C
            return False
        essai[noeud] = Pose(noeud, c, debut, debut + e.duree)
        occ.reserve(essai[noeud], e)
        if all(place_un_enfant(f, lien, essai[noeud].fin, arbre, inst, occ, essai, posees, restreint_a)
               for f, lien in arbre.enfants(noeud)):
            return True
        occ.annule_un(essai[noeud])                               # on tente le cuisinier suivant
    return False
# place_un_enfant : essaie les débuts fin, fin+1, … fin+lien.ecart_max (0 pour un lancement) ; exige début ≥ fin de chaque dépendance
# externe de l'enfant ; rend True au premier qui convient (le même parcours récursif, jamais plus de trois niveaux de blocs).
```

  **Règles du four** (`Occupation.appareil_convient`) : (a) somme des `places` des plats qui se recouvrent ≤ places de l'appareil, **à chaque instant** (balayage des bornes) ; (b) pour le four, **deux plats qui se recouvrent**
  ont un écart de température ≤ 10 °C ; (c) deux plats **voisins dans le temps** (le plus proche qui finit avant, le plus proche qui commence après) dont l'écart de température dépasse 20 °C, vers le haut **comme vers le bas**,
  sont séparés d'au moins `CHANGEMENT_DE_TEMPERATURE_MIN = 5` minutes ; (d) un appareil non four n'a que (a). Un cuisinier est libre si aucun de ses intervalles ne recouvre `[début, fin[`. Les `Fixe` (étapes en cours
  d'un recalcul) sont inscrits d'avance. **Horizon** = somme de toutes les durées + 120 (une borne dure : le générateur ne tourne jamais sans fin).
- [ ] **Le vérificateur** (`validation.py: valide(plan, inst) -> list[Violation]`), **écrit sans réutiliser `Occupation`** (tableaux et boucles naïves, lisibles, lents) : une étape ne commence qu'après la fin de ses dépendances ;
  un cuisinier ne fait qu'une étape `HANDS` ou `WATCH` à la fois ; places d'un appareil à chaque minute ; four : écart ≤ 10 °C entre plats simultanés, ≥ 5 min entre températures à plus de 20 °C d'écart ; **une cuisson avec appareil
  a, dans les `ecart_chaine` minutes après sa fin, un geste de sortie** ; une étape `enchainee` commence au plus `ecart_chaine` minutes après la fin de la précédente ; un lancement commence **à l'instant** de la fin du geste ; aucune
  étape de durée nulle ; toutes les étapes sont posées. **C'est lui qui juge le générateur** (S3 et les tests par propriétés) : deux implémentations indépendantes de la même spécification.
- Cas de test : critère 13 (le plan de l'exemple : aucune étape avant ses dépendances, aucun cuisinier à deux gestes, le four jamais plus de plats que de places ni deux plats à plus de 10 °C d'écart, chaque cuisson a quelqu'un pour
  la sortir) ; critère 28 (8 + 4 = 10 ; deux cuissons ne fusionnent jamais ; fusion refusée si elle crée une boucle) ; **« aucun plan possible »** (un seul cuisinier, deux étapes enchaînées qui tombent ensemble, `ecart_chaine = 2` : `genere`
  rend `None` ; avec `ecart_chaine = 5` ou 2 cuisiniers : un plan) ; critère 54 (passer de 220 à 150 °C ajoute 5 minutes comme 150 → 220) ; deux plats à 180 et 190 °C partagent le four, 180 et 200 non ; un plat qui prend 2 places ;
  sortie en retard impossible : `valide` rejette un plan **fabriqué à la main** qui oublie la sortie (le vérificateur ne se fie pas au générateur) ; un plan fabriqué avec un cuisinier à deux gestes est refusé.
- **Mutations :** `<=` ↔ `<` sur les bornes d'intervalle ; écart de température `< 10` ; changement de température ignoré vers le bas ; oublier la sortie ; lien de lancement avec un écart > 0 ; `restreint_a` ignoré.
- **Retour arrière :** supprimer les fichiers.

### S3 : La recherche, les preuves et la mesure du pire cas

**Pourquoi :** § 10.3 (« ce que le plan cherche », « garantit »), exigence 1 ; critères 12, 13, 44, 45. **Dépend de :** S2. **Coupe prévue :** recherche, candidats et stabilité (S3a) ; bornes, empreinte, phrases, goulot (S3b) ;
solveurs exacts et cas de référence (S3c) ; propriétés et mesure (S3d). **Fichiers :** `domain/plan/{recherche,bornes,empreinte,phrases}.py`, `tests/plan/{cas_de_reference.json,exact_grille.py,exact_ordres.py,test_reference.py,
test_proprietes.py}`, `ops/mesure_plan.py`, `docs/plan-de-cuisine.md`, `docs/preuves-0.2.md`.

- [ ] **L'objectif** (dans l'ordre de la spec § 10.3, comparé comme un tuple) : `(leave, finish, idle, imbalance, changed)` — `leave` = dernier instant où un geste ou une surveillance (sortie comprise) retient quelqu'un ; `finish` =
  fin de la dernière cuisson ; `idle` = somme, par cuisinier, des trous entre son premier début et sa dernière fin ; `imbalance` = écart entre les minutes de `HANDS + WATCH` du cuisinier le plus et le moins chargé ; **`changed` =
  nombre d'étapes à venir dont (cuisinier, rang) diffère du plan courant** (la stabilité : « à fin égale, il garde le plan qui change le moins de cartes à venir »). Pas de coût chiffré arbitraire (décision de la revue).
- [ ] **La recherche** (`recherche.py: cherche(inst, *, precedent=None, essais=None) -> Resultat`) — **nombre d'essais fixé, jamais borné par l'horloge** :

```python
ESSAIS_PAR_ETAPE = 20            # valeur de départ : S3d la remplace par la mesure
PART_ALEATOIRE = 0.6             # le reste va à la recherche locale

def cherche(inst, precedent=None, essais=None):
    n = len(inst.etapes)
    essais = essais if essais is not None else ESSAIS_PAR_ETAPE * n          # proportionnel à la taille
    rng = random.Random(graine_de(inst.session, empreinte(inst)))             # semé par la session ET les entrées : mêmes entrées, même plan
    candidats = [(*sequentiel(inst), frozenset({0})),                         # « l'une après l'autre » : UN SEUL cuisinier, TOUJOURS un candidat (s'il est valide)
                 (*ordre_du_menu(inst), None)]
    if precedent: candidats.append((*ordre_de(precedent), None))
    meilleur = None
    def propose(plan):
        nonlocal meilleur
        if plan is not None and (meilleur is None or cle(plan, precedent) < cle(meilleur, precedent)):
            meilleur = plan
    for ordre, fusions, restreint in candidats: propose(genere(applique_les_fusions(inst, fusions), ordre, restreint))
    for _ in range(int(essais * PART_ALEATOIRE)):
        fusions = tuple(rng.random() < 0.5 for _ in candidats_de_fusion(inst))
        propose(genere(applique_les_fusions(inst, fusions), priorite_bruitee(inst, rng)))
    ordre = ordre_de(meilleur) if meilleur else ordre_du_menu(inst)[0]
    for _ in range(essais - int(essais * PART_ALEATOIRE)):                    # recherche locale : permutations voisines de la meilleure liste
        i = rng.randrange(len(ordre) - 1)
        voisin = echange(ordre_de(meilleur), i, i + 1)             # TOUJOURS depuis le meilleur : une escalade, pas une marche aléatoire
        propose(genere(inst_de(meilleur), voisin))
    return Resultat(plan=meilleur, sequentiel=…, evaluations=essais + len(candidats))
```

  `priorite_bruitee` : priorité de base = chemin le plus long restant (décroissant) **plus un bruit** de `rng` ; **un plan n'est rendu que s'il est valide** (`genere` le garantit) ; `sequentiel(inst)` = chaque recette à la suite par
  **un seul cuisinier** (`restreint_a = {0}`), ordre du menu, puis ordre des étapes ; `leave_sequentiel` = **somme des « en tout » des recettes cuisinées seules** (l'affichage « au lieu de 3 h 05 »). **Résultat : le meilleur plan
  valide, ou `None` (« aucun plan »)** ; si le séquentiel est valide, `plan.leave ≤ séquentiel.leave` **par construction** (il est un candidat et la clé est lexicographique).
- [ ] **Les bornes inférieures** (`bornes.py: bornes(inst) -> Bornes`) : `chemin_critique` (plus long chemin de dépendances, liens compris, sorties comprises) ≤ `finish` ; `mains_par_cuisinier = ceil(Σ minutes HANDS+WATCH / n_cuisiniers)` ≤
  `leave` ; `charge_appareil[a] = ceil(Σ duree × places / places_de_a)` ≤ `finish`. **À taille réelle, on ne prouve pas l'optimum : on prouve que le plan ne passe jamais sous une borne** (propriété) et on écrit l'**écart à la
  borne** (`gap = leave / borne - 1`) dans la réponse et les preuves.
- [ ] **L'empreinte** (`empreinte.py: empreinte(inst) -> str`) : SHA-256 hexadécimal (16 premiers octets) du JSON canonique (clés triées, séparateurs fixes) de : `PLAN_ALGO_VERSION`, étapes **après mise à l'échelle** (durée, nature,
  appareil, température, places, geste), liens, dépendances, nombre de cuisiniers et leurs index, appareils et places, `ecart_chaine`, étapes faites ou en cours (`fixes`). **Aucun prénom, aucun identifiant de personne.** C'est **la
  version du plan** : les mêmes entrées, la même version.
- [ ] **Les phrases** (`phrases.py`, liste **fermée**, remplies par des codes et des nombres, **trois au plus**, dans l'ordre de la spec) : `merged{recipes, gesture}` (dite **seulement si la fusion est retenue**), `oven_chain{appliance, recipes[2]}`,
  `during_cooking{cooking_recipe, working_recipe}` (la plus longue étape `HANDS` posée pendant une étape `ALONE`), `shared_work{minutes: [int…]}` (≥ 2 cuisiniers, **par rang de cuisinier, jamais un prénom**), `longest_first{recipe}`.
  **Le goulot** (`goulot(inst, resultat)`) : l'appareil occupé sans pause sur le chemin le plus long dont **une place de plus** fait gagner ≥ `5` minutes de `leave` (recherche rejouée, même graine, mêmes essais) →
  `{appliance, places, places_plus_one, gain_min}` ; sinon `None`. **La comparaison « au lieu de »** n'est rendue que si `leave_sequentiel - leave ≥ 10`.
- [ ] **Les solveurs exacts** (tests seulement, **sans bibliothèque**) : `exact_grille.py` — recherche en profondeur **indépendante du générateur**, sur la grille des minutes entières, avec coupe par la meilleure valeur, pour
  **au plus 5 blocs, durées ≤ 6, horizon ≤ 24** : il valide **à la fois** les règles du générateur (le générateur ne manque pas de meilleur plan sur ces cas) et la règle des 5 % ; `exact_ordres.py` — **toutes les listes de priorité** ×
  toutes les fusions pour **au plus 8 blocs** : il mesure la qualité de **la recherche** contre l'optimum du générateur.
- [ ] **Les cas de référence** (`tests/plan/cas_de_reference.json`, **40 cas**, fabriqués par `tests/plan/fabrique.py` à graine fixe **et** 6 écrits à la main dont l'exemple de la spec réduit : lasagnes, curry, gratin) : **sur chacun, `leave`
  de la recherche ≤ 1,05 × `leave` exact** (`ceil` au minute : `leave ≤ ceil(1.05 × exact)`). Un cas qui échoue se garde comme `@example` du test (jamais supprimé).
- [ ] **Les propriétés** (`test_proprietes.py`, graines fixes, **500 instances aléatoires** de 1 à 6 recettes, 1 à 4 cuisiniers, 0 à 3 appareils, un four) : `valide(plan, inst) == []` ; **même instance, même plan, même version (deux appels)** ;
  `leave ≥ max(bornes)` ; `leave ≤ séquentiel.leave` quand le séquentiel est valide ; **un plan n'est jamais rendu s'il viole une contrainte** (le générateur est attaqué : instances adverses à liens contradictoires : `None`) ;
  « un cuisinier de plus ne rend jamais le plan plus long » **n'est pas** une propriété (la recherche est heuristique : écrit, et testé en tendance seulement, sans assertion dure).
- [ ] **La mesure du pire cas** (`ops/mesure_plan.py`, **marqueur `perf`, ne tourne pas en CI de PR**) : génère l'instance maximale de la spec § 4.2 (8 recettes × 40 étapes, 4 cuisiniers, 3 appareils) **et** les tailles
  intermédiaires (50, 100, 150, 200, 320 étapes) dans le processus de calcul de S7, imprime la durée et `evaluations` par taille. **Règle** : le pire cas mesuré sur le conteneur de l'essai doit tenir en **30 s** ; sinon on
  baisse d'abord `ESSAIS_PAR_ETAPE` (jusqu'à 8 au plus bas, la qualité est revérifiée par les cas de référence), puis `MAX_ETAPES_PLAN` jusqu'à la plus grande taille qui tient. Les deux constantes **et le tableau mesuré** sont écrits
  dans `docs/plan-de-cuisine.md` ; un test épingle `MAX_ETAPES_PLAN` (le changer échoue le test jusqu'à ce que la mesure suive). Critère 44.
- Cas de test (critères) : 12 (éteindre Léa : un plan pour un cuisinier, plus long ; rallumer : **la même version et le même plan**) ; 13 ; 44 (taille maximale → refus ou calcul dans le pire cas mesuré) ; **stabilité** : rejouer avec
  `precedent` et une entrée modifiée loin dans le futur garde les cartes proches ; **empreinte** : modifier un prénom ne la change pas, modifier une durée la change ; phrases : « fusion » absente quand elle n'est pas retenue ;
  comparaison absente sous 10 minutes ; goulot : un four à 1 place avec trois plats, +1 place gagne ≥ 5 min : carte rendue.
- **Mutations :** horloge dans la boucle d'essais ; graine tirée de `time` ; séquentiel retiré des candidats ; plan non revalidé ; empreinte qui contient un prénom ; `changed` placé avant `leave`.
- **Retour arrière :** supprimer les fichiers.

### S4 : La session, la base (M-S1)

**Pourquoi :** § 4.2 ; K2 ; décision D5. **Dépend de :** R2 (recettes). **Coupe prévue :** tables et gardes (S4a) ; fonctions de lecture (S4b). **Fichiers :** `supabase/migrations/<M-S1>_la_session.sql`,
`tests/db/session.test.ts`, `tests/integration/test_session_sql.py`, `docs/schema.md`.

- [ ] Migration (retour arrière en tête) :

```sql
set local lock_timeout = '3s'; set local statement_timeout = '30s';
create table public.cook_session (
  id uuid primary key,                                     -- créé par le client : le rejeu relit
  household_id uuid not null references public.household(id) on delete cascade,
  created_by uuid references public.user_profile(id) on delete set null,
  state text not null default 'menu' check (state in ('menu','shopping','ready','cooking','paused','to_store','stored','stopped','cancelled')),
  target_servings int not null check (target_servings between 1 and 40),
  day date,                                                -- « c'est pour dimanche » (jour de Paris) ; nul : « Session du <created_on> »
  created_on date not null,                                -- jour de Paris à la création (lu par `public.aujourdhui()`)
  version int not null default 1,                          -- ETag ; incrémenté par déclencheur
  menu_validated_at timestamptz, started_at timestamptz, ended_at timestamptz,
  last_activity_at timestamptz not null default now(), last_gesture_at timestamptz,
  hands_free_device uuid,                                  -- un seul appareil en mains libres par session (critère 52)
  plan_version text, current_plan_id uuid, dressing_version int not null default 1,
  created_at timestamptz not null default now()
);
create unique index cook_session_une_active on public.cook_session (household_id) where state in ('cooking','paused','to_store');
create index cook_session_par_foyer on public.cook_session (household_id, state, created_at desc);
create table public.cook_session_recipe (
  session_id uuid not null references public.cook_session(id) on delete cascade,
  recipe_id uuid not null,                              -- SANS clé étrangère (A3 : l'ancienne appli peut supprimer une recette du foyer) ; `title_copy` ci-dessous
  title_copy text,
  servings int not null check (servings between 1 and 20), position int not null, dropped_at timestamptz,
  primary key (session_id, recipe_id)
);
create table public.cook_session_cook (
  id uuid primary key default gen_random_uuid(), session_id uuid not null references public.cook_session(id) on delete cascade,
  person_id uuid references public.user_profile(id) on delete cascade,             -- nul : un cuisinier sans compte
  display_name text check (display_name is null or length(display_name) between 1 and 40),
  added_by uuid references public.user_profile(id) on delete set null, rank int not null, present boolean not null default true,
  check ((person_id is null) = (display_name is not null)),
  unique (session_id, person_id)
);
create table public.cook_session_appliance (
  session_id uuid not null references public.cook_session(id) on delete cascade,
  appliance_code text not null references public.appliance_catalog(code), places int not null check (places between 1 and 8),
  available boolean not null default true, primary key (session_id, appliance_code)
);
create table public.cook_session_transition (from_state text, to_state text, primary key (from_state, to_state));  -- table de référence, comme `cycle_transition`
```

  **Gardes en déclencheur** (jamais en politique) : `BEFORE UPDATE OF state` refuse toute transition absente de `cook_session_transition` (menu→shopping, menu→ready, menu→cancelled, shopping→ready, shopping→menu, shopping→cancelled,
  ready→shopping, ready→cooking, ready→cancelled, cooking→paused, cooking→to_store, cooking→stopped, paused→cooking, paused→stopped, paused→to_store, to_store→stored) ; `version` incrémentée par déclencheur ; `household_id`, `created_on`
  immuables ; `cook_session_recipe` : refus d'ajout (`insert`) hors des états `menu | shopping | ready` ; **la mise à l'échelle d'une recette retenue n'est pas figée** (elle suit `servings`) ; `cook_session_cook` : au plus **4** par session
  (déclencheur) ; un cuisinier avec `person_id` doit être **membre du foyer de la session**.
  RLS foyer (`current_household()`), `select` seul à `authenticated`. Aucune table de l'ancien monde n'est modifiée.
- Cas de test : une seule session active par foyer (l'index refuse la seconde) ; transition interdite (`ready → stored`) `check_violation` ; une personne d'un autre foyer comme cuisinier : refusée ; 5ᵉ cuisinier refusé ; `tests/db`
  complets verts avant/après ; Léa lit les sessions de Sam (foyer), **un autre foyer non** ; `authenticated` ne peut rien écrire (`42501`) ; **l'ancienne appli** : insert dans `cycle` / `cycle_recipe` inchangé.
- **Mutations :** index unique retiré ; transition `cooking → stored` ajoutée ; `grant insert`.
- **Retour arrière :** `drop table cook_session_transition, cook_session_appliance, cook_session_cook, cook_session_recipe, cook_session` (vider d'abord) ; `drop function`.

### S5 : La session et l'état du monde (K1, K2)

**Pourquoi :** § 4.2, § 5, § 14 ; K1, K2 ; critères 1, 21, 27, 33. **Dépend de :** S4 ; « Aujourd'hui » A5 (signature du fournisseur). **Coupe prévue :** fonctions de la session (S5a, migration M-S1b) ; état du monde et fournisseur de la tuile (S5b,
migration M-S1c) ; routes (S5c). **Fichiers :** `supabase/migrations/<M-S1b>_gerer_la_session.sql`, `<M-S1c>_etat_du_monde_cuisiner.sql`, `api/sessions.py`, `api/cuisine_etat.py`, `schemas/sessions.py`, `tests/integration/test_sessions.py`,
`tests/db/etat-du-monde.test.ts`, matrice.

- [ ] **Fonctions** (`security definer`, `current_household()` et `auth.uid()` explicites, **statut rendu**, jamais une exception pour un refus) : `cuisiner_cree_une_session(p_id, p_target, p_day, p_reuse)` (statuts `ok | replay |
  session_au_menu_existe{id}` : « Tu as déjà un menu en cours. Je le reprends, ou j'en ouvre un autre ? » ; `p_day` pas dans le passé de plus de 0 jour ; **une création toujours possible**, quel que soit l'état de la semaine ou du frigo,
  décision du propriétaire) ; `cuisiner_regle_la_session(p_id, p_version, p_target, p_day)` ; `cuisiner_retient_une_recette(p_op, p_session, p_recipe, p_servings)` (**boîte d'interface de K17**) : `1 à 8 recettes`, parts 1 à 20,
  recette déjà retenue → `recette_deja_retenue` (rend l'état), **recette non planifiable acceptée** (les durées seront demandées au plan), recette « Plus jamais » ou sans nombre de parts (`yield_servings` nul) → `recette_sans_parts` (« Pour combien
  de parts est-elle écrite ? ») ; `cuisiner_regle_les_parts`, `cuisiner_retire_une_recette` (avant « C'est parti » ; **après, seulement une recette dont aucune étape n'est commencée**, jamais d'ajout), `cuisiner_annule_la_session`
  (avant la cuisine ; les articles pas pris quittent la liste, ceux pris restent au placard : appelle `private.cuisiner_libere_les_besoins` de C2) ; chacune **incrémente `version`**, met `last_activity_at` à jour **au plus une fois toutes les
  5 minutes** (socle § 3.6) et appelle **`private.cuisiner_recalcule_l_etat(p_session)`** (menu validé → `shopping` ou **`ready` tout de suite si rien n'est à acheter**, critère 27 ; une session `ready` dont on change le menu redevient `shopping` s'il manque un
  article) qui lit **`private.cuisiner_besoins_couverts(p_session)`** (**fournie par C2** ; en attendant, un stub `true` s'il n'y a aucune recette, sinon `false`).
- [ ] **État du monde** `GET /cooking/state` (K1) : `public.cuisiner_etat(p_now timestamptz)` `security invoker`, `stable`, **une requête** : `sessions` (id, `state`, recettes en vignettes (`recipe_id`, `image_id`), `target_servings`, `retained_servings`, `day`,
  `created_on`, `current_step {done, total}` quand en cuisine, `ask_still_current` si menu/courses/prête sans activité depuis 14 jours), `bubble` (**les huit situations de la spec § 5 dans l'ordre de priorité**, codes seuls : `ringing`, `cooking`,
  `to_store`, `paused`, `ready`, `shopping{to_buy}`, `menu{servings,target}`, `nothing`), `tile` (même union que § 6 du plan commun), `ringing` (minuteurs dont `ends_at <= p_now` et `state = 'running'`), `quotas` (`reads`, `inventions`, `tickets` restants et `resets_on`,
  vue de `cook_quota`), `allergies_known`. **`ETag` fort**, `304` sur `If-None-Match` (le front relit toutes les 3 s en cuisine, toutes les 60 s ailleurs). **Aucun texte rédigé.**
- [ ] **Le fournisseur de la tuile** : `create or replace function private.etat_monde_cuisine(...)` (même signature que celle d'« Aujourd'hui ») rend l'union à huit états (plan commun § 6) ; `private.cuisiner_choses_a_faire(p_person, p_now)` rend
  « à ranger depuis plus d'une heure » et « en pause depuis plus de 24 heures » ; **lecture, aucune écriture** ; l'appel de `private.chose_a_faire` d'« Aujourd'hui » est un écart à relayer.
- [ ] **Pause automatique** : `private.cuisiner_pause_les_oubliees(p_now)` (SQL pur, **sans réveiller le conteneur**) : une session `cooking` sans aucun geste depuis 12 heures **et sans minuteur en cours** passe en `paused` (une étape « sans toi »
  de plusieurs heures ne la met donc pas en pause) ; planifiée par `pg_cron` toutes les 10 minutes (tolérante si l'extension manque, comme 0126) ; idempotente.
- Cas de test : critère 1 (semaine pleine et frigo plein : création libre) ; critère 21 (une session en cuisine : en lancer une seconde propose d'abord de finir la première : `409 autre_session_en_cuisine`) ; critère 27 (menu couvert par le
  placard : `ready` sans courses) ; critère 33 (arrêtée sans recette cuite : « Nouvelle session » de nouveau libre) ; création rejouée (même `id`) : `200` ; **deux téléphones créent en même temps** : un seul menu (`session_au_menu_existe`) ;
  9ᵉ recette : refusée ; **chaque situation de la bulle** (8) et sa priorité ; **une tuile par état** ; aucun montant ni prénom ; le fournisseur est lisible par « Aujourd'hui » (`aujourdhui_etat` complet, test dans la suite d'« Aujourd'hui ») ; pause à 11 h 59 et
  12 h 01, avec et sans minuteur ; `ETag` change après une écriture ; **p95 de `cuisiner_etat` ≤ 100 ms** sur 50 sessions d'historique.
- **Mutations :** index « une seule active » contourné par un état oublié ; priorités inversées (« minuteur » après « en cuisine ») ; `last_activity_at` écrit à chaque lecture ; session de l'autre foyer lisible.
- **Retour arrière :** retirer les routes ; `drop function` ; `create or replace` du fournisseur d'« Aujourd'hui » à son corps de départ.

### S6 : Proposer un menu (K3)

**Pourquoi :** § 6.2 ; K3 ; critères 2, 3, 7. **Dépend de :** R3, S5, C2 (estimation d'un menu : `private.cuisiner_besoins` avec `p_hypothese`). **Coupe prévue :** classement pur (S6a) ; lecture des entrées et route (S6b) ; phrase → filtres typés (S6c). **Fichiers :** `domain/menu.py`,
`domain/type_de_plat.py`, `cuisiner/menu.py`, `api/menu.py`, `ia/prompts/cuisiner/filtres.v1.md`, `tests/unit/test_menu.py`, `tests/integration/test_menu_route.py`.

- [ ] **Le classement est du Python pur** (`menu.py: classe(candidates, contexte, cible) -> list[Menu]`, **déterministe**) : (1) **écartées d'office** : « Plus jamais », sans parts, **non planifiables**, appareil manquant au foyer, **allergène enregistré**
  ou `unverifiable` (D7 : sans allergie connue, aucun filtre et `allergy_notice: "unknown"`), exclues par un filtre de la personne ; (2) **la somme des parts fait la cible**, avec 2 à 5 recettes (une seule sous 4 parts, jusqu'à 8 au-delà de 30), parts par
  recette ∈ `{1, 2, 3, 4, 6, 8, 10, 12}` **et jamais plus de 3 fois la recette** ; si la cible ne se fait pas : le plus grand total atteignable et `reduced_to` dans la réponse (« Je m'arrête à 30 parts ») ; (3) **la note** : somme pondérée à poids
  constants dans `POIDS_DU_MENU` (un seul endroit) de `placard` (parts couvertes, ce qui périme d'abord), `objectifs` (protéines et énergie d'un repas : **moyennes des deux membres lues par `private.cuisiner_cibles_du_menu`, qui ne rend que deux nombres**,
  jamais par personne), `temps` (somme des gestes ÷ cuisiniers de la dernière session, **estimé vite pour classer**), `variete` (pas deux fois le même ingrédient principal, pas une recette cuisinée depuis 3 semaines sauf « On aime »), `aime`, `congelable`
  (au-delà de ce qui se mange en quatre jours) ; (4) **égalité : `recipe_id` croissant** ; `rank` = l'indice dans la liste des 10 meilleurs menus : « Autre menu » = `rank + 1`, « Changer » = la recette suivante du classement hors menu, mêmes parts.
  **La raison de chaque recette est un code d'une liste fermée** : `with_stock{food}`, `protein{grams}`, `never_tried{minutes}`, `liked`, `quick{minutes}`, `freezes_well`. « Tout se congèle » n'est rendu que si **chaque** recette a `freezable is true`.
- [ ] **Le résumé** : `servings`, `minutes_two` (**le temps du vrai plan** : un travail `preview` de S7 sur les cuisiniers et appareils de la dernière session, rendu par `GET …/plan-jobs/{id}` ; `null` tant qu'il tourne), `estimate_cents` (C2, `null` si un
  article alimentaire n'a pas de prix de moins de 12 mois : **cas normal au début**).
- [ ] **Phrase → filtres** (`POST …/menu-proposals {mode, phrase}`) : nœud `cuisiner_filtres` (Haiku, `low`) rend `FiltresDuMenu{exclude_dish_types: [enum fermé], exclude_foods: [texte], want_appliance, max_minutes}` ; **le serveur** traduit les noms en
  aliments par R8a, **ignore tout ce qui sort de l'énumération**, et rend `understood: {filters}` pour le récapitulatif (« Sans soupe : compris. ») ; **aucun filtre reconnu : `understood: null`, rien ne change** (critère 3) ; le type de plat vient de
  `type_de_plat.py` (règles sur le titre et les ingrédients : `soup`, `salad`, `oven_dish`, `stew`, `pasta`, `rice`, `curry`, `gratin`, `pie`, `other`). Quota général de Popote (`ia_reserve`), pas `cook_quota`. **Un menu n'écrit rien tant que « Ça me va »
  n'est pas appuyé** : `POST …/menu-confirmations {key, menu_hash}` → `public.cuisiner_valide_un_menu` retient les recettes **en une écriture** et pose `menu_validated_at` (rejouable ; `menu_hash` périmé → `409`).
- Cas de test (critères) : **2** (10 parts : un menu de 10, raisons de la liste fermée, « Autre menu » donne un autre, **les mêmes entrées redonnent le même**) ; **3** (« Pas de soupe » : filtre récapitulé, une recette change, le résumé suit ; une phrase
  incomprise ne change rien) ; **7** (menu sans placard : estimation absente) ; 30 parts (« Je m'arrête à 30 ») ; recette sans parts écartée ; appareil manquant écarté ; **allergie par le double de test** : aucune recette qui en contient (critère 50) ; **le modèle ne
  reçoit ni prénom, ni objectif, ni montant** (`verifie_la_charge`) ; un filtre injecté (« ignore tes règles ») : ignoré ; `rank` hors des 10 : `409 plus_de_menu` ; propriété (graine fixe) : somme des parts = cible, aucune recette > 3× , ordre total.
- **Mutations :** note aléatoire ; égalité non départagée ; objectifs par personne dans la réponse ; filtre hors énumération appliqué ; « Tout se congèle » avec un « on ne sait pas ».
- **Retour arrière :** retirer les routes ; `drop function`.

### S7 : Le plan, le travail asynchrone et « C'est parti ! » (K9, K10)

**Pourquoi :** § 10, § 10.4 ; critères 12, 13, 44. **Dépend de :** S3, S5. **Coupe prévue :** tables et bail (S7a, migration M-S2) ; exécuteur et reprise (S7b) ; routes (S7c) ; lancement (S7d, migration M-S2b). **Fichiers :**
`supabase/migrations/<M-S2>_le_plan.sql`, `<M-S2b>_lancer_la_session.sql`, `cuisiner/travaux.py`, `api/plans.py`, `api/internes.py` (route `/internal/cooking/jobs/resume`), `tests/integration/test_plan_travail.py`, `tests/db/plan.test.ts`.

- [ ] **Tables** (M-S2) : `cook_plan(id, session_id, version text, inputs_hash text, leave_min, finish_min, sequential_min, bounds jsonb, phrases jsonb, bottleneck jsonb, chain_gap int, no_plan boolean, created_at)` ; `cook_plan_step(plan_id, step_id text,
  cook_index int, start_min int, duration_min int, rank int, primary key (plan_id, step_id))` ; **`cook_job(id uuid pk (client), session_id, kind check in ('plan','replan','preview'), inputs jsonb, inputs_hash text, base_version text, state check in
  ('queued','running','done','failed','superseded'), locked_until timestamptz, attempts int default 0, result_plan_id uuid, result jsonb, error_code text, created_at, finished_at)`** ; index unique partiel
  `(session_id, inputs_hash) where state in ('queued','running')` : **les mêmes entrées partagent un seul travail**. RLS foyer en lecture ; **aucune colonne de texte libre dans l'erreur** (`error_code` fermé : `trop_gros`, `calcul_abandonne`,
  `calcul_trop_long`, `entree_invalide`).
- [ ] **Les entrées** (`POST …/plans`, `PUT …/crew`) : `PUT …/crew` pose cuisiniers (membres cochés, « + Quelqu'un d'autre » : un prénom 1 à 40 caractères, **4 au plus**) et appareils (places 1 à 8) ; **s'ouvre sur les choix de la dernière session** ; `POST …/plans` (`Idempotency-Key`,
  accusé court) : `S1.controle_la_taille` **d'abord** (refus `422 plan_trop_gros`, `appareil_trop_petit`, `dependance_en_boucle`, ou `409 appareil_manquant`) ; **des durées manquent** : `422 durees_manquantes {steps:[…], estimates:[…]}` (le front pose les questions de R9 avec l'estimation
  proposée en premier ; la réponse **écrit** `household_step_duration` ou la durée de la recette selon que la recette est du catalogue ou du foyer) ; sinon `202` + `Location: …/plan-jobs/{id}` ; `inputs_hash` = l'empreinte de S3 (**cela rend `200` immédiat si le plan courant a déjà cette version**).
- [ ] **Le bail et la reprise** (`travaux.py`) : `private.cuisiner_prend_un_travail(p_job uuid, p_bail_s int)` (`for update skip locked` ; `running`, `locked_until = now() + 90 s`, `attempts + 1`, **au plus 3 essais puis `failed calcul_abandonne`** ; `popote_api` seul) ;
  le calcul tourne dans **un processus à part** (`concurrent.futures.ProcessPoolExecutor(max_workers=1, mp_context=spawn)` créé au démarrage ; le calcul est pur, donc sans état partagé), **garde de sécurité** `JOB_MAX_S = 60` (le calcul est borné en essais, pas en temps :
  la garde ne sert qu'à ne jamais pendre ; dépassement = `failed calcul_trop_long`, compteur) ; la **pose** `private.cuisiner_pose_le_plan(p_job, p_plan jsonb, p_base_version text)` vérifie sous verrou de la session que `plan_version` vaut encore **`base_version`** (sinon
  `superseded` : le travail est refait sur la version à jour, jamais appliqué) et que l'état de la session le permet. **Comment le conteneur qui s'endort le termine** — trois filets, du plus rapide au plus lent : (1) **la lecture qui le suit** (`GET …/plan-jobs/{id}`, que l'écran relit chaque seconde ou deux)
  reprend atomiquement un travail `queued` ou dont le bail est échu et le relance (un conteneur réveillé par cette requête est un conteneur vivant) ; (2) **`pg_cron` chaque minute** (migration M-S2b) n'appelle `/internal/cooking/jobs/resume` (signature HMAC du socle, `pg_net`) **que s'il existe un travail échu**, avec
  attente de 5 minutes après un statut ≠ 200 (même modèle que `push-reveil`) ; (3) **le calcul est déterministe et idempotent** : le refaire donne la même version, la pose d'une version déjà posée ne fait rien. Un conteneur tué en plein calcul perd au plus un bail (90 s). **Test** : tuer le processus de calcul au milieu,
  avancer l'horloge de la base, `GET` : le travail est repris et le plan identique.
- [ ] **Lire** : `GET …/plans/current` (`ETag` = version) : `{version, leave_min, finish_min, sequential_min \| null, finish_at (heure du serveur si on commence maintenant), steps:[{step_id, recipe_id, cook_ref, start_min, duration_min, nature, appliance, temperature}], phrases[], bottleneck, bounds{gap}, no_plan}` ; **`plan: null` + `no_plan_reason`
  et `exits: ["add_cook", "gap_5"]`** quand aucun plan n'est trouvé (10 D10) ; l'**équivalent en liste** pour le lecteur d'écran se compose côté écran depuis `steps` (par cuisinier, dans l'ordre, avec l'heure de début) ; **aucune phrase rédigée**.
- [ ] **« C'est parti ! »** `POST …/starts` → `public.cuisiner_lance_la_session(p_session, p_key, p_plan_version)` (`security definer`) : **une fois, à l'heure du serveur** (`public.maintenant()`) ; verrou session ; `ready → cooking` ; l'index unique refuse une seconde session active (`409
  autre_session_en_cuisine {id}`) ; copie le plan en `cook_step_state` (S8) ; `p_plan_version` doit être le plan courant (`409 plan_perime`) ; **lancer deux fois (deux téléphones) ne lance qu'une fois** : le second reçoit `200` et l'état ; met en file `cook_started` pour l'**autre** cuisinier avec compte coché (S9).
- Cas de test (critères) : **12** ; **13** ; **44** (taille maximale : calcul asynchrone dans le pire cas mesuré, au-delà refus `plan_trop_gros` avec le texte du front « Il y a trop de recettes pour un seul plan » ; repli « plan valide ou aucun plan ») ;
  **deux `POST …/plans` simultanés** : un seul travail ; **processus tué** : repris ; **bail échu** : repris par `GET` et par la route interne ; version déjà posée : rien ne change (`200`) ; `superseded` : refait ; **150 `POST` d'une même session** : aucun doublon de plan ; boucle
  de recette : `422 dependance_en_boucle {recipe_id, steps}` ; `appareil_trop_petit` (critère 54) ; « C'est parti » ×2 ; une autre session en cuisine ; `plan_perime` ; **la route interne refuse sans signature**, `404` sans l'en-tête secret du relais ; `pg_cron` n'appelle rien sans travail échu (compteur d'appels).
- **Mutations :** appliquer un plan dont la version de base a changé ; `skip locked` oublié ; calcul dans la boucle d'événements (le test mesure qu'un `GET` répond pendant un calcul de 5 s) ; bail jamais renouvelé ; plan posé sans revérifier la session.
- **Retour arrière :** retirer les routes ; `cron.unschedule` ; `drop function`, `drop table cook_job, cook_plan_step, cook_plan`.

### S8 : La cuisine en lecture, prendre, « Fait » et son annulation (K11, 1ʳᵉ partie)

**Pourquoi :** § 11.1, § 11.2, § 11.4 ; critères 14, 17, 31, 32, 45. **Dépend de :** S7. **Coupe prévue :** tables et distribution (S8a, migration M-S3) ; lecture (S8b) ; « Fait », claims, annulation (S8c). **Fichiers :** `supabase/migrations/<M-S3>_la_cuisine.sql`,
`api/cuisine.py`, `schemas/cuisine.py`, `tests/integration/test_cuisine.py`, `tests/db/cuisine.test.ts`, `tests/integration/test_course_deux_fait.py`.

- [ ] **Tables** (M-S3) : `cook_step_state(session_id, step_id text, recipe_id, rank int, label_code text, text text, nature, duration_min, appliance, temperature, depends_on text[], cook_index int, state check in ('todo','done','skipped','dropped'), done_at timestamptz,
  done_by uuid, timer_started_by_gesture text, primary key (session_id, step_id))` : **la copie (texte, durée) fait à « C'est parti » : corriger la recette ensuite ne change pas une cuisine commencée** ; `cook_pause(session_id, from_at, to_at)` ; `cook_gesture` et `cook_timer` : S9, S10.
- [ ] **Qui a quelle carte** : **dérivée, jamais stockée** (l'autre n'a pas à être réveillé) : la carte *en cours* d'un cuisinier = la première étape `todo` qui lui est affectée (`cook_index`) **dont toutes les dépendances sont finies** (une étape `ALONE` est finie à `ends_at` si elle n'a pas de sortie, sinon à son « Sorti »), dans l'ordre du plan ;
  `given_at` = `max(fin de sa dernière étape, fin de ses dépendances)` : **c'est de là que se mesure la durée réelle** (S12). Si rien n'est prêt : `{current: null, waiting_for: [{step_id, ready_in_min \| null}]}` (« Rien pour toi pour l'instant. Le curry mijote encore 6 min. »).
- [ ] **Lire** `GET …/kitchen?cook_id=` (défaut : le cuisinier de la personne ; `cook_id` = un cuisinier sans compte que **cette personne** a ajouté, pour « On partage cet écran ») : `{current, ahead:[…6 cartes d'avance au plus, chacune {step_id, nature, label_code, text, duration_min, appliance, temperature, recipes[], passable}], progress{done,total},
  finish_at, others:[{cook_id, step_label_code \| null}], timers:[{id, ends_at, label_code, appliance, recipe_ids, state}], session_state, server_now, sync_token}` ; **`display_name` rendu seulement pour un cuisinier sans compte ajouté par l'appelant**, les membres se retrouvent par leur identifiant (l'écran
  les connaît) ; **`ahead` est calculée par le serveur** : l'écran n'en calcule aucune (spec K11, critère 18) ; `ETag` sur tout l'état de la session (étapes, minuteurs, cuisiniers, version du plan), `304` ; **relu toutes les 3 s** ; `Cache-Control: no-store`.
- [ ] **Les quantités du dos de la carte** : `ingredients[{food_ref, quantity, unit}]` **à l'échelle** par le service d'échelle de R3 (jamais côté écran) ; le texte de l'étape n'est jamais réécrit.
- [ ] **« Fait »** : `public.cuisiner_fait(p_session, p_key, p_step)` (`security definer`, **sans instant** : `public.maintenant()`) — verrou session (`for update`) puis étapes par identifiant : refus si l'étape n'est pas **la carte en cours de cet appelant** (`409 etape_deja_prise` si elle est à l'autre, `409 plan_perime` si elle a
  changé, avec le **plan à jour dans l'extension** : « Le plan a changé. Regarde ta nouvelle carte. ») ; **« Fait » sur une étape qui est toujours en cours pour ce cuisinier est accepté quel que soit le numéro de plan qu'il avait sous les yeux** (un geste vise une étape, pas une version) ; marque `done`, démarre les minuteurs que ce geste lance
  (S9), **rend la carte suivante du plan courant tout de suite** et, **dans la même transaction**, met en file un recalcul **seulement** si l'écart à l'heure prévue dépasse 5 minutes ou si l'événement est de ceux du § 11.4 (S13) ; **« Fait » n'attend jamais le recalcul** (critère 45) ; **deux « Fait » simultanés** s'écrivent l'un après l'autre (verrou de
  session), la suite de chacun venant du plan courant au moment où il est écrit.
- [ ] **Annuler le dernier « Fait »** `POST …/gesture-cancellations {key}` : permis tant qu'**aucune étape qui en dépend n'est donnée** (c'est-à-dire que le suivant du plan n'est pas devenu *la carte en cours* d'un cuisinier, **donnée à un cuisinier, pas seulement faite**, critère 31) ; remet l'étape `todo`, **arrête le minuteur** qu'il avait lancé
  et annule ses pushs (S9) ; refus `409 annulation_impossible` ; sans limite de temps (le 10 s est un affichage, l'équivalent dans « … » existe : WCAG 2.2.1) ; **non rejouable hors ligne** (la file ne contient que les cinq gestes).
- [ ] **Prendre une étape de l'autre** `POST …/steps/{sid}/claims` (« Aider Léa ») : seulement une étape **à venir et faisable** (dépendances finies) **qui n'est pas la carte en cours de l'autre** ; l'étape lui est affectée (`cook_index`), retirée de la file de l'autre ; refus `409 etape_deja_prise` sinon (« Léa l'a déjà prise. »).
- [ ] **« Passer »** : `private` via le geste `skip` (S10) : l'étape est remise à plus tard **si rien ne l'attend** (aucune étape `todo` ne la nomme en dépendance), sinon `409 etape_non_passable` ; `ahead[].passable` le dit d'avance.
- Cas de test (critères) : **14** (« Fait » → carte suivante, anneau avance, « Annuler » remet l'étape) ; **17** (deux téléphones prennent la même étape : un seul l'obtient, **mille tirages**, deux connexions, ordres inversés : aucun `40P01`) ; **31** (annuler alors que l'étape dépendante vient d'être donnée à Léa, même pas commencée : refus ; annulé à temps, le minuteur
  s'arrête) ; **32** (plan refait pendant que Sam regardait l'ancien : « Fait » sur une étape qui n'est plus la sienne n'écrit rien et rend sa nouvelle carte) ; **45** (« Fait » pendant qu'un recalcul tourne : carte immédiate ; deux « Fait » simultanés l'un après l'autre) ; une étape sans carte prête : `waiting_for` ; aider Léa : jamais sa carte en cours ; **la copie à « C'est parti »** : corriger la recette
  après ne change pas la cuisine ; **l'autre foyer** : `404` ; l'autre membre lit la cuisine (foyer) mais `display_name` d'un cuisinier sans compte d'un autre appelant est nul ; un texte d'étape avec du HTML rendu tel quel ; `ETag`/`304` ; **p95 de `GET …/kitchen` ≤ 100 ms** (deux téléphones, 31 étapes).
- **Mutations :** carte stockée au lieu de dérivée ; « Fait » qui attend le recalcul ; verrou sur les étapes avant la session ; annulation permise après la distribution ; claim d'une carte en cours.
- **Retour arrière :** retirer les routes ; `drop function`, `drop table cook_pause, cook_step_state`.

### S9 : Les minuteurs et les rappels (K11, 2ᵉ partie ; § 16)

**Pourquoi :** § 11.3, § 16 ; critères 15, 23, 41, 53. **Dépend de :** S8 ; plan push **N3b** (file) et sa recette. **Coupe prévue :** table et démarrage (S9a, migration M-S3b) ; « Sorti », « + 5 min », à la demande (S9b) ; types de rappel et annulation (S9c, migration M-S3c, **plus une PR de 150 lignes dans le registre push**).
**Fichiers :** `supabase/migrations/<M-S3b>_les_minuteurs.sql`, `<M-S3c>_rappels_de_la_cuisine.sql`, `src/popote_api/push/types.py`, `tests/db/minuteurs.test.ts`, `tests/integration/test_minuteurs.py`, `tests/unit/test_push_types_cuisine.py`.

- [ ] **Table** `cook_timer(id uuid pk default gen_random_uuid(), session_id, step_id text null, kind check in ('step','custom'), minutes int, started_at timestamptz, ends_at timestamptz, generation int default 1, state check in ('running','done','cancelled'), done_at, appliance text, recipe_ids uuid[],
  created_by uuid)` ; RLS foyer en lecture. **Un minuteur démarre tout seul** quand le geste qui le lance est fait : dans `cuisiner_fait`, pour chaque étape `ALONE` dont **toutes** les dépendances sont maintenant finies, `ends_at = at + duration_min` (**heure du serveur**, ou l'heure bornée d'un geste hors ligne : un minuteur lancé hors ligne finit
  donc à l'heure que l'écran montrait, critère 18) ; « il sonne » = `ends_at <= now()` et `state = 'running'` (**aucun processus ne tourne à zéro** ; K1 et la cuisine le disent) ; deux minuteurs à zéro : triés par `ends_at` croissant.
- [ ] **« Sorti »** (geste `out`) : termine le minuteur **et** son étape `ALONE` **et** son geste de sortie, à l'heure du geste ; **un seul « Sorti » l'arrête partout** (état en base, relu par les deux téléphones) ; annule ses pushs. **« + 5 min »** (geste `plus5`) : `generation + 1`, `ends_at = greatest(ends_at, at) + 5 min`, **annule puis remet en file** (génération suivante), écrit
  `cook_extension(household, recipe, step_rank, session, 5)` (S12), et met en file un recalcul si l'heure de fin bouge de plus de 5 minutes. **Un minuteur à la demande** `POST …/timers {id, minutes 1 à 600, label_code}` : sans étape, ajouté à « Pendant ce temps » (une phrase de mains libres ou un bouton).
- [ ] **Les pushs** (`private.cuisiner_met_en_file_le_minuteur`) : § 5 du plan commun. `cook_timer_rang` à `ends_at`, **pour chaque cuisinier avec compte** (membres seulement ; un cuisinier sans compte n'a pas d'appareil) ; clé `timer:<id>:<génération>` ; `cook_timer_forgotten` à `ends_at + 10 min` (clé `…:forgot`).
  `private.cuisiner_annule_les_pushs(p_timer uuid, p_generation int)` : `update push_outbox set state = 'dropped' where state = 'queued' and dedupe_key = …` (`security definer`, `search_path` fixé, **aucun rôle d'API** n'y a accès, appelée par les fonctions de geste) ; **une ligne déjà `sending`/`sent` n'est pas rattrapée** : « annulation tardive », écrite dans la fiche et testée.
  `cook_started` à l'arrivée en cuisine (l'**autre**, avec compte, coché) ; `cook_to_store` une heure après « C'est cuit ! » **si rien n'est rangé** (ligne posée à la fin de la cuisson, `dedupe_key = 'store:<session>'`, retirée par « Tout ranger » : même annulation).
- [ ] **Le registre** (PR de moins de 150 lignes) : quatre `DefinitionDePush` (§ 5), textes constants, `chemin = "/cuisiner"`, `monde = None`, `heures_calmes = False` pour les minuteurs ; `test_push_types.py` du plan push **les vérifie sans test de plus** ; un test propre : **aucun texte ne contient un nom de plat, un chiffre ni un montant** (critère 23).
- [ ] **La latence écrite** : `pg_cron` chaque minute + réveil + envoi ⇒ **au plus ≈ 70 s** après `ends_at` ; **mesurée en S14** sur l'essai avec un vrai abonnement de test et inscrite dans `docs/preuves-0.2.md` ; l'écran d'alarme, lui, sonne à l'heure.
- Cas de test (critères) : **15** (« Enfourne » fait : minuteur de 35 min sur les deux téléphones, à zéro il sonne sur les deux, « Sorti » sur l'un l'arrête sur l'autre) ; **41** et **53** (minuteur à zéro, appli à l'arrière-plan : une ligne par cuisinier avec compte, au plus une minute après ; « Sorti », « + 5 min », « Annuler » **avant l'envoi** la retire de la file ; **après l'envoi** : non, dit) ; « + 5 min » : nouvelle génération, nouvelle ligne,
  ancienne annulée ; deux minuteurs ensemble ; minuteur pendant la pause (il sonne quand même) ; minuteur à la demande ; un cuisinier sans compte : aucune ligne ; **fusion de lignes** : deux « + 5 min » à la suite ne laissent qu'une ligne vivante ; annulation d'un minuteur déjà `sent` : sans effet et sans erreur ; grep du registre (critère 23).
- **Mutations :** clé de dédoublonnage sans génération ; annulation qui supprime au lieu de passer à `dropped` ; push envoyé à un prénom sans compte ; `ends_at` calculé depuis `now()` d'un geste hors ligne.
- **Retour arrière :** `drop function` ; retirer les quatre types du registre ; `drop table cook_timer`.

### S10 : Les cinq gestes hors ligne et l'heure bornée (K11, 3ᵉ partie)

**Pourquoi :** § 19 (« sans réseau »), D2 ; critères 18, 43, 45. **Dépend de :** S8, S9. **Coupe prévue :** jeton et bornes, Python pur (S10a) ; fonctions SQL et route (S10b, migration M-S3d). **Fichiers :** `cuisiner/gestes.py`, `supabase/migrations/<M-S3d>_gestes.sql`, `api/cuisine.py`,
`tests/unit/test_gestes.py`, `tests/integration/test_gestes.py`, `tests/db/gestes.test.ts`, `tests/unit/test_architecture.py` (liste fermée de `base.connexion()`).

- [ ] **Le jeton de synchro** (`gestes.py`) : chaque lecture de la cuisine rend `sync_token = base64url(payload) + "." + base64url(HMAC-SHA256(clé_d_environnement, payload))` avec `payload = {s: session, p: personne, t: server_now_ms}` (**clé propre à chaque environnement**, tournée comme les autres secrets, lue par le module de configuration ; **comparaison en temps constant**). `at = t_sync + elapsed_ms`.
- [ ] **Les bornes** (`borne_l_heure(at, *, now, t_sync, etape_precedente) -> instant | Refus`) : `at ≤ now + 2 s` (jamais dans le futur) ; `at ≥ t_sync` ; `at − t_sync ≤ 12 h` (pas plus vieux que la coupure possible) ; `at ≥ fin de l'étape précédente du cuisinier` ; `elapsed_ms ≥ 0` et ≤ 12 h ; sinon `422 geste_hors_bornes`, jeton falsifié ou d'une autre session/personne : `422 jeton_de_synchro_invalide`.
  **Le client ne fournit jamais d'instant** : il fournit un `elapsed` ; l'**horloge de l'appareil décalée de 10 minutes ne change ni un décompte ni l'heure d'un geste** (critère 43) puisqu'aucune des deux n'entre dans le calcul.
- [ ] **Les cinq gestes** `POST …/gestures {key (uuid, = l'identifiant du geste), kind: done | out | plus5 | skip | pause, target_id, sync_token?, elapsed_ms?}` : **rejouables avec leur clé, sans doublon** — `cook_gesture(session_id, key uuid, person_id, kind, target_id, at, offline boolean, result jsonb, created_at, primary key (session_id, key))` ;
  un second envoi de la même clé par la **même personne** rend le résultat gardé (`200`) ; **par une autre personne : `403 geste_d_un_autre_compte`** (rejeu sous le compte d'origine seulement) ; la file hors ligne **part dans l'ordre**, un geste par requête ; **un geste dont la cible a changé** (étape refaite, minuteur déjà arrêté) rend `200` avec `outcome: "already_done"` pour `out`/`plus5`
  (idempotents par nature), `409` pour `done`/`skip` avec l'état à jour. **Sans réseau, rien n'est calculé par l'écran** : les cartes d'avance de S8 sont ce qu'il a ; sans carte d'avance il le dit (front).
- [ ] **Deux fonctions, deux portes** : `public.cuisiner_geste(p_session, p_key, p_kind, p_target)` (`authenticated`, **sans instant**, `public.maintenant()`) pour **le geste en ligne** ; `private.cuisiner_geste_hors_ligne(p_person, p_session, p_key, p_kind, p_target, p_at)` (`popote_api` **seul** ; la personne vient de la session ; **l'instant est celui que Python a recalculé du jeton** et que la fonction **revérifie** : `p_at ≤ now() + 2 s`,
  `≥ now() − 12 h`, `≥ fin de l'étape précédente`) ; elles partagent `private.cuisiner_applique_un_geste` ; un client Supabase ouvert **ne peut pas** forger d'instant (la seconde n'est exécutable par aucun rôle de personne : test `has_function_privilege`). `base.connexion()` y est utilisé : **la route entre dans la liste fermée** de `test_architecture.py` avec sa raison.
  `pause` : session `paused`, intervalle `cook_pause` ouvert ; **les minuteurs continuent et sonnent** ; la reprise (`POST …/resumptions`) ferme l'intervalle, remet `cooking`, **met en file un recalcul depuis l'heure qu'il est** (S13) ; une pause de plus de 24 h : K1 la signale (S5).
- Cas de test (critères) : **18** (hors ligne : « Fait » part au retour avec l'heure de l'appui ; un minuteur lancé hors ligne finit à l'heure affichée ; recharger ne perd ni la carte ni les « Fait » en attente : côté écran, **le serveur rejoue la file sans doublon**) ; **43** (heure de l'appareil décalée : sans effet ; `Sorti`, `+ 5 min`, `Passer`, `Pause` partent avec leur clé, **dans l'ordre**, sans doublon) ; **jeton falsifié**, d'une autre session,
  d'une autre personne : `422` ; instant futur, avant `t_sync`, 13 h après : `422` ; **geste de Sam rejoué par Léa** : `403` ; **même clé deux fois** : un seul effet, deux `200` ; trois « Fait » en file dans l'ordre ; un « Sorti » rejoué après le « Sorti » de l'autre : `already_done` ; un appel direct de la fonction privée par `authenticated` : refusé ; **aucun instant n'est lu dans le corps** (`extra="forbid"`
  refuse `at`) ; `p_at` forgé dans la fonction privée en dehors des bornes : refusé par la fonction elle-même.
- **Mutations :** accepter `at` du client ; jeton sans HMAC ; comparaison non constante ; clé unique sans la personne comparée ; fonction hors ligne exécutable par `authenticated` ; bornes de 12 h supprimées.
- **Retour arrière :** retirer les routes ; `drop function` ×3 ; `drop table cook_gesture`.

### S11 : Les soucis et les départs (K11, 4ᵉ partie)

**Pourquoi :** § 11.2 (« Un souci »), § 11.4 ; critères 16, 22 (suite). **Dépend de :** S8, S10, C4 (le remplaçant). **Fichiers :** `supabase/migrations/<M-S3e>_les_soucis.sql`, `api/cuisine.py`, `tests/integration/test_soucis.py`, `tests/db/soucis.test.ts`.

- [ ] `POST …/problems {key, kind: missing_ingredient | failed, step_id, choice?}` : **`missing_ingredient`** → `{replacement: {food, quantity} \| null, can_continue_without, can_drop_recipe}` (le remplaçant vient de C4, **qui respecte les allergies**, D7 ; « continuer sans » seulement pour un ingrédient mineur : sans quantité ou < 5 % du poids du plat ; « retirer la recette » seulement si **aucune de ses
  étapes n'est commencée** ; sinon la fonction **note** le manque et on continue) ; **`failed`** : `choice: redo | drop` — « refaire » remet l'étape **et celles qui en dépendent, dites une à une** (liste rendue), « laisser tomber » retire les étapes restantes de la recette, **qui ne sera pas dressée** ; l'**écriture** est une fonction `security definer` (statut rendu), qui met en file un recalcul (S13).
- [ ] `POST …/cooks/{cid}/departures` (« Je m'en vais », ou « l'autre le dit pour lui ») et `…/arrivals` : `present` bascule ; **la carte en cours d'un cuisinier qui part revient au plan** (les étapes déjà données et pas faites repartent dans le recalcul : choix pris seul, écrit) ; **le dernier cuisinier qui part met la session en pause** (« Plus personne en cuisine ») ;
  `POST …/appliance-outages {appliance}` (« Le four est pris ») : `available = false`, recalcul, les recettes qui en dépendent attendent (`AppareilManquant` de S1 → le front propose les choix de § 10.1). **Aucun de ces gestes ne touche une étape en cours ni un minuteur** (critère 16).
- Cas de test : critère 16 (Léa s'en va : le plan est refait pour Sam seul, l'heure de fin est rendue, aucune étape commencée ne bouge) ; « Raté » refait **dit** les étapes ; laisser tomber : la recette n'est pas dressée (C6) ; manque mineur vs majeur ; retrait refusé si une étape est commencée ; dernier cuisinier : pause ; le même geste rejoué (même `key`) ne refait rien ; allergie (double de test) : aucun remplaçant contenant l'allergène ; « Le four est pris » : les lasagnes attendent.
- **Mutations :** étape en cours déplacée par le recalcul ; dernier départ sans pause ; « continuer sans » pour un ingrédient majeur ; remplaçant non filtré.
- **Retour arrière :** retirer les routes ; `drop function`.

### S12 : La pause, l'arrêt, la fin, et ce que les sessions apprennent (K12, K16 durées)

**Pourquoi :** § 11.6, § 4.5 ; critères 22, 30, 33. **Dépend de :** S8 à S11, C7 (rangement). **Coupe prévue :** pause, arrêt, fin (S12a, migration M-S3f) ; mesures et médiane (S12b, migration M-S3g) ; propositions d'allonger une cuisson (S12c). **Fichiers :** `supabase/migrations/<M-S3f>_arreter_et_finir.sql`, `<M-S3g>_apprendre_les_durees.sql`, `api/cuisine.py`, `domain/durees.py`
(S12 s'appuie sur R1), `tests/integration/test_arret.py`, `tests/db/apprendre-durees.test.ts`.

- [ ] **Arrêter** `POST …/stops {key, cooked: {recipe_id: bool}}` : « Le gratin : il est cuit ? » **recette par recette** (une réponse par recette **non finie**) ; les recettes cuites vont au rangement (`to_store`), les autres ne sont pas dressées ; **une recette commencée et pas cuite** demande ce qui a été utilisé (carte du placard de C7) ; **une recette pas commencée laisse ses ingrédients au placard** ; aucune recette cuite : `stopped`
  après cette seule carte (critères 22 et 33). **« Terminer quand même »** `POST …/forced-finishes` : n'est offerte que s'il reste des étapes non faites (les « passées » comprises) **et** que plus aucune n'est en cours ; rend la **liste nommée** des étapes ; même question recette par recette. **La dernière étape faite** : `cooking → to_store`, `ended_at`, durée réelle (hors pauses) et **écart au plan** (`{real_min, planned_min, delta_min}`) rendus ; met en file `cook_to_store`.
- [ ] **Mesurer** (`cook_duration_sample(household_id, recipe_id, step_rank, factor numeric, scale_rule, minutes numeric, offline boolean, created_at)`) : à chaque « Fait » d'une étape `HANDS`/`WATCH`, `minutes = done_at − given_at − recouvrement des pauses` ; **les mesures prises avec un geste hors ligne sont écartées** (« sans les pauses ni le temps hors ligne ») ; **seules les étapes `HANDS`/`WATCH` s'apprennent** ; **une étape `ALONE` ne s'apprend jamais du « Sorti »** (sortir en retard n'allonge pas la cuisson : critère 30).
  `private.cuisiner_duree_apprise(p_household, p_recipe, p_rank)` : à partir de **3** mesures retenues (écart < prévu/4 ou > 4× prévu écarté), la médiane ramenée à la quantité (`mediane_apprise`, R1) ; elle **remplace l'estimation**, et la fiche (R3b) le dit (`time_origin = 'learned'`, `learned_from: 3`). L'overlay `household_step_duration(household_id, recipe_id, step_rank, minutes, origin check in ('learned','said'))`
  porte les durées dites ou apprises **sans toucher aux recettes du catalogue** ; `retient()` de S1 le lit (`apprises`).
- [ ] **Allonger une cuisson** : `cook_extension(household_id, recipe_id, step_rank, session_id, extra_min)` écrit par « + 5 min » (S9) ; **quand le foyer a rallongé la même cuisson à 3 sessions de suite**, la carte de fin rend `proposals: [{recipe_id, step_rank, new_minutes}]` (« Les lasagnes : 40 min au four la prochaine fois ? ») ; `POST …/duration-proposals {recipe_id, step_rank, accept}` : « Oui » écrit l'overlay, « Non » mémorise le refus (une
  proposition refusée ne revient pas avant 3 nouvelles sessions). **Une cuisson n'est jamais raccourcie toute seule** (test). « Sorti » en retard trois fois : durée inchangée (critère 30).
- [ ] **Le pouce** (`POST …/thumbs {recipe_id, kind: up | down, reason?: never | not_now}`) : un pouce levé écrit `recipe_preference` `like` ; baissé, `never` ou `not_now` (ce dernier **n'écrit rien** : « juste pas tout de suite ») ; rien d'obligatoire ; idempotent.
- Cas de test : critère 22 (arrêt avec un gratin pas cuit : pas dressé, ingrédients au placard) ; critère 33 (aucune cuite : `stopped`, « Nouvelle session » libre) ; critère 30 (cuisson sortie en retard à trois sessions : durée inchangée ; rallongée de 5 min à trois sessions de suite : proposition, **rien ne change sans « Oui »**) ; médiane de 3 mesures ; mesure aberrante écartée ; mesure hors ligne écartée ; pause exclue de la mesure ; « Terminer quand même » absent quand une étape est en cours ;
  « C'est cuit ! » deux fois ; écart au plan rendu (8 min de moins) ; les deux téléphones arrêtent en même temps : un arrêt.
- **Mutations :** étape `ALONE` apprise du « Sorti » ; médiane de 2 mesures ; mesure hors ligne gardée ; une cuisson raccourcie toute seule ; pause comptée.
- **Retour arrière :** retirer les routes ; `drop function` ; `drop table cook_duration_sample, cook_extension, household_step_duration`.

### S13 : Le plan qui se refait tout seul (K11, version attendue)

**Pourquoi :** § 11.4, exigence 1 ; critères 16, 32, 45. **Dépend de :** S3, S7, S8, S11. **Fichiers :** `cuisiner/recalcul.py`, `supabase/migrations/<M-S3h>_recalcul.sql`, `tests/integration/test_recalcul.py`, `tests/plan/test_stabilite.py`.

- [ ] **Déclencheurs** (liste fermée, `private.cuisiner_met_en_file_un_recalcul(p_session, p_reason)` appelée **dans la transaction de l'effet**) : écart de plus de 5 minutes à la fin d'une étape ; un cuisinier part ou arrive ; une étape passée, ratée ou une recette retirée ; un appareil en moins ; « + 5 min » qui déplace la fin de plus de 5 minutes ; **la reprise après une pause**
  (depuis l'heure qu'il est). Elle écrit un `cook_job (kind = 'replan', base_version = session.plan_version, inputs = …)`.
- [ ] **Les entrées d'un recalcul** : `fixes` = les étapes **faites** (leurs dépendances sont satisfaites, `fin_rel ≤ 0`) et **les étapes en cours épinglées** (la carte donnée à un cuisinier, durée restante `max(1, prévu − écoulé)`) et **les minuteurs en cours** (appareil occupé jusqu'à `ends_at − maintenant`) ; **un recalcul ne touche jamais une étape en cours ni un minuteur ; il ne change que la suite**. La version = l'empreinte (étapes faites ou en cours comprises).
- [ ] **La version attendue** : la pose vérifie `session.plan_version = base_version` ; sinon **le recalcul est refusé et refait sur la version à jour** (jamais appliqué) ; un autre « Fait » qui a déjà fait changer la version suffit à le refuser ; **stabilité** : `cherche(..., precedent=plan_courant)` (S3) garde, à fin égale, le plan qui change le moins de cartes à venir ; la réponse d'un « Fait » rend `plan_changed: true` quand la carte suivante a changé
  (le front dit « Le plan a changé »).
- [ ] **Ce que rend la lecture** : `finish_at` redit seulement si elle bouge de plus de 5 minutes (le front compare à la dernière valeur ; l'API rend toujours la valeur, jamais une phrase).
- Cas de test : critère 16 ; critère 32 ; critère 45 (« Fait » pendant un recalcul : carte immédiate, recalcul sur la version attendue, **refusé et refait** si un autre « Fait » est passé) ; **stabilité** (un recalcul après une étape plus longue de 3 minutes ne déplace pas les cartes proches) ; une étape en cours et un minuteur **intouchés** ; recalcul à la reprise depuis l'heure qu'il est ; **100 « Fait » à deux téléphones** : jamais deux plans courants, jamais un plan basé sur une version morte ;
  `superseded` rejoué sans effet.
- **Mutations :** épinglage oublié ; pose sans `base_version` ; plan recalculé qui déplace une étape en cours ; `precedent` ignoré.
- **Retour arrière :** retirer les déclencheurs ; `drop function`.

### S14 : La preuve de la voie et sa clôture

**Dépend de :** S1 à S13. **Fichiers :** `tests/e2e_api/test_cuisine.py`, `ops/preuve_cuisine.py`, `ops/mesure_plan.py`, `docs/preuves-0.2.md`, `docs/plan-de-cuisine.md`, `docs/normes-api.md`, `docs/schema.md`, `docs/securite.md`, `docs/exploitation.md`.

- [ ] **Scénario complet** (Sam et Léa, exemple de la spec, `ModeleSimule`, horloge réglée par `popote.maintenant`) : (1) nouvelle session, 10 parts, « Propose-moi », « Autre menu », « Pas de soupe » ; (2) menu validé → courses (voie C) → prête ; (3) cuisiniers, appareils, **plan asynchrone**, version stable à l'identique après avoir éteint et rallumé Léa ;
  (4) « C'est parti » ×2 ; (5) la cuisine à deux téléphones : « Fait », annuler, aider, une étape prise par les deux ; (6) le minuteur : sonne sur les deux, « Sorti », « + 5 min » ; (7) **hors ligne** : trois gestes en file, rejoués dans l'ordre, heure décalée, jeton falsifié, geste rejoué par Léa ; (8) Léa s'en va, le plan est refait ; (9) pause, minuteur qui sonne en pause,
  reprise ; (10) arrêt avec un gratin pas cuit ; (11) un cuisinier sans compte ; (12) panne : processus de calcul tué, repris.
- [ ] **Sur l'essai** : migrations M-S1 à M-S3 **avant** le code ; `tests/db` de l'ancienne appli **après** (aucune régression) ; **`ops/mesure_plan.py`** : le tableau des tailles et **le pire cas** écrits dans `docs/plan-de-cuisine.md` et `docs/preuves-0.2.md` ; **la latence du push du minuteur** (de `ends_at` à la réception, 20 minuteurs, vrai abonnement de test) ; k6 : 25 « Fait » concurrents sur 12 étapes
  (exactement 12 acceptés), 50 utilisateurs sur `GET …/kitchen` (p95 < 300 ms, 304 majoritaires), 10 plans simultanés de taille maximale (aucun blocage de la boucle d'événements : p95 de `GET /healthz` < 300 ms pendant le calcul).
- [ ] Documentation : § « Cuisine » de `docs/normes-api.md` (routes, codes, `sync_token`), `docs/schema.md`, `docs/securite.md` (jeton, bornes, rejeu sous le compte d'origine, route interne des travaux), `docs/exploitation.md` (travail repris, constantes de `plan-de-cuisine.md`, clé du jeton de synchro à tourner).
- [ ] **Revue adverse** de la voie ; constats traités.
- Critères couverts : 1, 2, 3, 12 à 18, 21, 22, 27, 28, 29, 30 à 33, 41, 43 à 45, 53, 54 (côté API).
- **Retour arrière :** aucun (preuves).
