# « Cuisiner », voie Courses, dresser, ranger, coût : K8, K13 à K15, K16 (rayons, prix) — C1 à C10

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** la liste de courses **du foyer** (dérivée, avec un état gardé pour ce qui est coché), le dressage des barquettes, « Tout ranger » en une
écriture, le coût réel d'une session. **Interfaces, contrat, données, menaces, règles :** [`2026-11-14-api-cuisiner.md`](2026-11-14-api-cuisiner.md),
qui prime. **Dépend de la voie S** pour `cook_session` (C2 ← S4 ; C7 ← S4, C6).

**Choix d'architecture de cette voie.** **La dérivation de la liste (besoins, placard, répartition entre sessions, arrondis) est écrite UNE fois, en SQL**
(`private.cuisiner_liste`), parce que **l'état d'une session** (prête ou pas) en dépend **dans la même transaction** que l'écriture qui le change ; **son
oracle est un modèle Python indépendant dans les tests** (C1), comparé à la fonction SQL sur des centaines de cas tirés au hasard : deux implémentations
d'une même règle, dont une seule tourne en production. Le dressage, lui, est du **Python pur** (`domain/dressage.py`) appelé par la route, et son résultat est
écrit par une fonction réservée à `popote_api` qui **revérifie la version du dressage** sous verrou.

**Fichiers de la voie (carte).**

```
src/popote_api/domain/oracle_courses.py     C1 (tests/ seulement : tests/oracle/) l'oracle de la liste
src/popote_api/domain/dressage.py           C5 partage, poids, valeurs, diagnostic, complément
src/popote_api/domain/rangement.py          C7 la proposition frigo / congélateur
src/popote_api/domain/ticket.py             C8 nettoyage d'un ticket, rapprochement
src/popote_api/api/courses.py, dressage.py, rangement.py, cout.py ; schemas/courses.py, dressage.py, cout.py
supabase/migrations/<M-C1> la_liste_du_foyer.sql · <M-C2> le_dressage.sql · <M-C2b> ranger.sql · <M-C3> le_cout.sql
```

---

### C1 : L'oracle de la liste et les vecteurs d'or (tests seulement)

**Pourquoi :** § 9.1, § 9.2 ; critères 8, 26, 46. **Dépend de :** rien. **Fichiers :** `tests/oracle/courses.py`, `tests/unit/vecteurs_courses.json`, `tests/oracle/test_oracle.py`.

- [ ] **Test rouge d'abord** (`uv run pytest tests/oracle/test_oracle.py -q` : `ModuleNotFoundError`). Les cas, en entrées (besoins par session, placard, lignes cochées) et sorties (à acheter, déjà chez toi, quantités) :

```python
from tests.oracle.courses import liste

def test_critere_26_le_placard_sert_d_abord_la_session_en_cuisine():
    sortie = liste(besoins=[("A", 0, "riz", 300, "g"), ("B", 1, "riz", 300, "g")], placard={"riz": (300, "g")})
    assert sortie["riz"].a_acheter == 300 and sortie["riz"].couverte == {"A"}          # B demande 300 g, pas « déjà chez toi »

def test_arrondi_sur_la_somme_par_aliment_pas_par_recette():
    # 30 g + 30 g de crème : somme 60 g, au pas de 50 g : 100 g ; recette par recette : 50 + 50 = 100 aussi, mais 20 + 20 + 20 = 60 → 100, non 150
    sortie = liste(besoins=[("A", 1, "creme", 20, "g"), ("A", 1, "creme", 20, "g"), ("B", 2, "creme", 20, "g")], placard={})
    assert sortie["creme"].a_acheter == 100

def test_le_debit_arrondit_les_pieces_vers_le_bas_sur_la_somme_de_la_session():
    assert debit([("A", "oignon", 1.5, "piece"), ("A", "oignon", 1.5, "piece")]) == {"oignon": 3}   # trois, pas deux

def test_besoin_qui_monte_apres_l_achat():
    sortie = liste(besoins=[("A", 0, "riz", 500, "g")], placard={"riz": (300, "g")})
    assert sortie["riz"].a_acheter == 200 and sortie["riz"].au_placard == 300        # « Riz 200 g, tu en as 300 g »
```

- [ ] **L'oracle** (`tests/oracle/courses.py`, ≤ 120 lignes, **sans SQL, sans import de `popote_api`** : il doit rester indépendant) : `liste(besoins, placard, apprentissages) -> dict[aliment, Ligne]` : par aliment, convertit en grammes **quand c'est comparable** (poids d'une pièce
  connu), répartit le placard **par session dans l'ordre de rang** (la session en cuisine, en pause ou à ranger d'abord, puis les autres par création), somme les restes, **arrondit vers le haut une seule fois** (`PAS = {"g": 50, "ml": 10, "piece": 1}`), `Ligne(a_acheter, au_placard, couverte, inconnue)` ;
  `debit(consommations)` : somme par aliment **puis** arrondi vers le bas des pièces.
- [ ] **Vecteurs d'or** `vecteurs_courses.json` (≥ 40 cas : la spec § 9.1 à § 9.5, les critères 8, 26, 46) lus **par l'oracle et par `tests/db`** : si l'une des deux dérive, l'autre échoue.
- [ ] Propriétés (graine fixe, 500 tirages) **de l'oracle seul** : ne rend jamais un négatif ; `a_acheter + au_placard_utilise ≥ besoin total` ; plus de placard ne fait jamais acheter plus.
- **Retour arrière :** supprimer les fichiers.

### C2 : La liste du foyer, la base et la lecture (M-C1, K8)

**Pourquoi :** § 9.1, § 9.2, § 13 (estimation) ; critères 8, 11, 26, 27, 46. **Dépend de :** S4, C1. **Coupe prévue :** tables et gardes (C2a, migration M-C1) ; conversions et `cuisiner_besoins` (C2b, migration M-C1b) ; répartition, arrondis,
`cuisiner_liste` et `besoins_couverts` (C2c, migration M-C1c) ; route de lecture (C2d). **Fichiers :** `supabase/migrations/<M-C1>_la_liste_du_foyer.sql`, `<M-C1b>_les_besoins.sql`, `<M-C1c>_la_liste.sql`, `api/courses.py`, `schemas/courses.py`,
`tests/db/courses-liste.test.ts`, `tests/integration/test_liste.py`, `tests/oracle/test_oracle_vs_sql.py`, matrice.

- [ ] **Premier pas : relire** `0002`/`0025` (`unit_conversion`, `density`, `unit_weight`, `poids_unitaire`), `0014`/`0017` (`store`, `aisle_order`, `tg_shopping_check`) et `0024`/`0026` (`household_price`) et **écrire l'écart** à ce plan en tête du fichier de la tâche (les colonnes exactes comptent ici).
- [ ] **Tables** (M-C1, retour arrière en tête, `lock_timeout`) :

```sql
create table public.shopping_line (                       -- l'ÉTAT gardé d'une ligne ; la liste elle-même est dérivée
  household_id uuid not null references public.household(id) on delete cascade,
  line_key text not null check (line_key ~ '^(food:[0-9a-f-]{36}|label:[a-z0-9-]{1,80})$'),   -- l'identité : (aliment, foyer)
  food_id uuid references public.food(id) on delete set null,
  label text not null check (length(label) between 1 and 80),
  aisle text check (aisle in ('produce','butcher_fish','chilled','frozen','dry_savory','dry_sweet','drinks','cleaning','hygiene','other')),
  taken jsonb,                                            -- [{"amount": 300, "unit": "g"}] : la quantité PRISE, celle que la personne avait sous les yeux
  checked_by uuid references public.user_profile(id) on delete set null, checked_at timestamptz,
  detached boolean not null default false,                -- « Garde-les » ou ajoutée à la main : ne dépend d'aucune session
  detached_amount numeric, detached_unit text,
  resume_later boolean not null default false,            -- « Je repasserai »
  recurring boolean not null default false, recurring_since timestamptz,
  removed_at timestamptz, version int not null default 1,
  primary key (household_id, line_key)
);
create table public.cook_substitution (                    -- « Remplacer » : la recette de la session note le remplacement
  session_id uuid not null references public.cook_session(id) on delete cascade, recipe_id uuid not null,                               -- sans clé étrangère (A3)
  from_food_id uuid not null, to_food_id uuid not null,       -- sans clé étrangère (A3)
  to_amount numeric not null check (to_amount > 0), to_unit text not null, primary key (session_id, recipe_id, from_food_id)
);
create table public.cook_need_override (                   -- « Je les ai », « Garde-les », « On fait sans »
  session_id uuid not null references public.cook_session(id) on delete cascade, food_id uuid not null,                                   -- sans clé étrangère (A3)
  mode text not null check (mode in ('have','kept','without')), primary key (session_id, food_id)
);
alter table public.stock_item add column shopping_line_id text;           -- nulle : l'ancienne appli n'écrit pas cette colonne
alter table public.portion add column cook_session_id uuid references public.cook_session(id) on delete set null;   -- nulle (§ 7 du plan commun)
create index shopping_line_actives on public.shopping_line (household_id) where removed_at is null;
create index stock_item_par_ligne on public.stock_item (household_id, shopping_line_id) where shopping_line_id is not null;
```

  RLS foyer en lecture ; `authenticated` : `select` seul ; **tout s'écrit par des fonctions** ; **gardes en déclencheur** : `household_id`, `line_key`, `food_id` immuables ; `version` incrémentée par déclencheur ; `taken` toujours un tableau d'au plus 2 éléments de quantité > 0.
- [ ] **`private.cuisiner_besoins(p_household uuid, p_hypothese jsonb default null)`** (`security invoker`, `stable`) : une ligne par (session active, aliment, unité) ; **sessions actives** = états `menu`, `shopping`, `ready`, `cooking`, `paused`, `to_store` (**une session rangée, annulée ou arrêtée ne demande plus rien** ; une session `cooking`/`paused`/`to_store` **garde ses besoins
  jusqu'au débit du placard**, C7) ; **rang** = 0 pour `cooking`/`paused`/`to_store`, sinon `1 + row_number()` par création ; `quantité = grammes de l'ingrédient (grams_reference) × facteur (parts retenues ÷ parts de la recette)` ; un ingrédient `seasoning` ou sans quantité : **aucun besoin** ; remplacements et « On fait sans »
  appliqués ; `p_hypothese` (`[{recipe_id, servings}]`) remplace les recettes d'une session : sert à **l'estimation d'un menu proposé** (S6) sans rien écrire.
- [ ] **`private.cuisiner_liste(p_household uuid)`** : répartition du placard **par session dans l'ordre du rang** (somme cumulée par fenêtre `rows between unbounded preceding and 1 preceding`) ; **`couvert = least(besoin, greatest(0, placard − déjà alloué))`** ; **arrondi vers le haut une seule fois, sur la somme des restes par aliment** (`ceil(x / pas) * pas`, pas 50 g / 10 cl / 1 pièce) ; **comparer des pièces et des grammes seulement quand le poids d'une
  pièce est connu** (appris du foyer, sinon la table) ; sinon deux quantités sur une ligne (« Courgettes 300 g + 2 ») ; **placard sans quantité comparable** (« un pot » contre des grammes) : à acheter **en entier**, `at_home_unknown: true` ; lignes **détachées** et manuelles ajoutées **sans** être couvertes par le placard ; **une ligne cochée reste visible 24 h** (`HIDE_CHECKED_AFTER`, choix pris seul) ;
  `à reprendre` = `resume_later` ; chaque ligne garde **pour chaque session ce qu'elle en demande** (`needs: [{session_id, amount, unit}]` : c'est ce qui dit quand une session est prête) et `for` (`recipe_ids`, `manual`) ; **les rayons** dans l'ordre appris (C9).
  `private.cuisiner_besoins_couverts(p_session)` : **vrai si, pour la session, chaque besoin est couvert** (pris, chez soi, remplacé, « Je les ai », « Garde-les » d'un ingrédient mineur, « On fait sans ») — **remplace le stub de S5**.
- [ ] **Lecture** `GET /shopping-list` : `{aisles:[{aisle, lines:[{line_key, name, to_buy:[{amount,unit}], taken, at_home, at_home_unknown, state: to_buy | checked | partly | to_resume, checked_by, needs, for, recurring, version}]}], at_home:[…], counts{done,total}, estimate_cents | null, other_person_aisle (rayon de son dernier cochage), version}` ;
  `ETag`, `304` ; **relue toutes les 3 s** ; l'estimation (§ 13) : `private.cuisiner_estimation` = somme, pour chaque article alimentaire à acheter, du **dernier prix** de `household_price` ramené à la quantité, **de moins de 12 mois** ; **rendue seulement si chaque article alimentaire a un prix**, sinon `null` (cas normal au début).
- Cas de test : **oracle contre SQL** (`test_oracle_vs_sql.py` : les vecteurs d'or et **500 tirages** : mêmes lignes, mêmes quantités) ; critères **8** (menu validé : la liste existe ; aliment couvert dans « Déjà chez toi » ; retirer une recette retire ses articles pas pris), **26**, **27** (menu couvert : session prête sans courses), **46** (volets liste) ; deux sessions qui se recouvrent ; pièce sans poids connu : deux quantités ; placard « un pot » : à acheter en entier ; **une session rangée ne demande plus rien** ;
  `p_hypothese` ne change aucune ligne ; **l'ancienne appli** : `tests/db` (`courses*`, `stock*`) verts avant/après ; Léa lit la liste (foyer), un autre foyer `404` ; liste vide ; **p95 de `cuisiner_liste` ≤ 100 ms** (3 sessions, 60 lignes, 200 `stock_item`).
- **Mutations :** arrondi par recette ; placard réparti dans l'ordre de création au lieu du rang ; session rangée comptée ; pièces additionnées aux grammes sans poids connu ; estimation affichée avec un prix manquant.
- **Retour arrière :** retirer la route ; `drop function` ; `drop table cook_need_override, cook_substitution, shopping_line` ; `alter table … drop column` ×2.

### C3 : Cocher et décocher (K8, cycle de vie)

**Pourquoi :** § 9.2 ; critères 9, 46 ; menaces (course de deux téléphones). **Dépend de :** C2. **Fichiers :** `supabase/migrations/<M-C1d>_cocher.sql`, `api/courses.py`, `tests/db/courses-cocher.test.ts`, `tests/integration/test_cocher.py`, `tests/integration/test_course_cochage.py`, matrice.

- [ ] `public.cuisiner_coche(p_op uuid, p_line text, p_taken jsonb, p_version int)` (`security definer`, foyer et personne explicites, **statut rendu**) : **cocher pose un état, pas une bascule** ; ordre des verrous **ligne (`shopping_line` par `line_key`), puis `stock_item` par identifiant** ; (1) la ligne n'existe pas encore (dérivée, jamais écrite) : créée à ce moment avec `version = 1` ; (2) **déjà cochée avec la même quantité prise** : `already_done`, **une seule fois au placard** (deux téléphones, critère 9) ;
  (3) cochée avec une autre quantité, ou `p_version` périmée : `ligne_changee` (« Léa vient de la changer. », avec la liste à jour) ; (4) sinon : écrit `taken`, `checked_by`, `checked_at`, et **entre au placard** : une `stock_item` rattachée (`shopping_line_id = line_key`, `source = 'courses'`, lieu selon le rayon : surgelés → congélateur ; frais, fruits et légumes, boucherie → frigo ; reste → placard ; **entretien et hygiène : aucune entrée**) ; **apprend l'ordre des rayons** (C9) ; recalcule l'état des sessions concernées (`private.cuisiner_recalcule_l_etat`, S5) ; dernier article d'une session : elle devient **prête** (le front fait les confettis).
- [ ] **Cocher vise (aliment, foyer), avec une quantité prise** : « Riz : 300 g pris » ; **si le besoin retombe** (Sam retire une recette pendant que Léa coche), la ligne cochée **reste valable** pour ce qu'elle a pris et ne demande plus rien ; **si le besoin monte après l'achat**, la liste redemande la **différence** seulement (le placard l'a déjà : la dérivation de C2 le fait sans rien de plus).
- [ ] **Décocher** `DELETE …/taken` : défait ce que la cochée a écrit, **jamais sous ce que le placard contient encore** : `retire = least(pris, quantité du placard comparable)`, retiré d'abord de la `stock_item` de la ligne, puis des autres du même aliment (plus récentes d'abord) ; **le placard ne descend jamais sous zéro** ; la réponse dit `removed` et `kept` (« Le riz est déjà utilisé : je ne retire que 0 g. ») ; décocher une ligne non cochée : `already_done`.
- [ ] Routes `PUT /shopping-lines/{line_key}/taken` `{taken:[…], version}` (`Idempotency-Key`, `If-Match` sur la version de ligne ; `428` s'il manque) et `DELETE`. **La clé de ligne d'un aliment inconnu** est `label:<nom_comparable>`.
- Cas de test (critères) : **9** (Léa coche, Sam voit l'initiale de Léa et son rayon) ; **46** (riz 300 g cochée par Léa puis une recette retirée par Sam : la ligne cochée reste valable ; besoin à 500 g : redemande 200 g ; **décocher après le débit du placard ne le fait pas passer sous zéro** ; « Garde-les » survit à la session : C4) ; **deux téléphones cochent la même ligne** : cochée, une seule `stock_item` ; **mille tirages** de cochages croisés deux à deux
  sur 20 lignes : jamais de `40P01`, placard identique à la somme des quantités prises ; quantité prise 0, négative, 100 001 g : `422` ; entretien : aucune `stock_item` ; lieu par rayon ; « Léa vient de la changer » rend la liste ; cocher sans réseau : **l'écran rejoue avec sa clé** (la file est en mémoire de la page), un cochage dont la ligne a changé entre-temps est refusé `409 ligne_changee` ; décocher la ligne cochée **de l'autre** : permis (le foyer), journalisé par `checked_by`.
- **Mutations :** bascule au lieu d'état ; décocher retire plus que le placard ; verrou `stock_item` avant la ligne ; deux `stock_item` pour un même cochage ; la ligne cochée oubliée quand le besoin retombe.
- **Retour arrière :** retirer les routes ; `drop function`.

### C4 : Ajouter, retirer, « Pas trouvé », « J'ai tout » (K8)

**Pourquoi :** § 9.3 à § 9.5 ; critères 10, 11. **Dépend de :** C2, C3, S5, R10 (allergies). **Coupe prévue :** ajouter, retirer, « Toujours » (C4a) ; « Pas trouvé » et le remplaçant (C4b) ; « Je n'en ai plus », « J'ai tout » (C4c). **Fichiers :** `supabase/migrations/<M-C1e>_ajouter_retirer.sql`, `<M-C1f>_pas_trouve.sql`, `<M-C1g>_finir_les_courses.sql`,
`domain/substitution.py`, `api/courses.py`, `tests/integration/test_courses_gestes.py`, `tests/db/courses-gestes.test.ts`, matrice.

- [ ] **Ajouter** `POST /shopping-lines {id, name (≤ 80), quantity?}` (« Ajoute du sopalin » dit à Popote passe par `public.cuisiner_ajoute_un_article`, **bloc `item` de K17**, avec `p_op` = identifiant du bloc) : la ligne **détachée** apparaît dans son rayon (deviné par `domain/rayons.py` sur le nom, corrigeable par `PATCH`) ; **sans quantité dite, sans quantité** ; rejeu par l'identifiant ; **un nom qui contient `ignore tes règles` est stocké et rendu tel quel** ;
  **« Le remettre à chaque fois »** `PUT …/recurring` : la ligne revient dès qu'elle est cochée depuis plus de **7 jours** (`private.cuisiner_remet_les_habituelles(p_now)`, SQL pur, `pg_cron` quotidien, idempotent).
- [ ] **Retirer** `DELETE /shopping-lines/{line_key}` : une ligne **détachée** : `removed_at` ; **un article d'une recette** : pas d'écriture, `200 {decision: "remove_recipe", recipes:[…]}` (« Sans épinards, pas de lasagnes. Je les enlève du menu ? ») : le front rappelle `DELETE /cooking-sessions/{id}/recipes/{rid}` (S5) s'il dit « Oui », sinon `PUT …/at-home` (« Non, j'en ai »).
- [ ] **« Pas trouvé »** `POST /shopping-lines/{line_key}/not-found {choice: replace | later | without, key}` : **`replace`** → `domain/substitution.py` : un aliment **voisin** (même sous-groupe CIQUAL, **table de remplacements écrite à la main** `substitutions.yaml`, avec le rapport de quantité et l'état cuit/cru ; « épinards frais » → « épinards surgelés » 1:1 ; **jamais un aliment qui contient un allergène enregistré ni `unverifiable`** si des allergies sont connues, D7)
  rendu en `proposal {food, amount, unit, aisle}` ; **« D'accord »** (`POST …/substitutions {key, proposal}`) écrit `cook_substitution` (la recette de la session **note** le remplacement), la ligne change de nom et de rayon ; **sans voisin sûr** : `proposal: null` (« Je n'ai pas de remplaçant sûr », et les deux autres choix) ; **`later`** (« Je repasserai ») : `resume_later = true`, **la session ne devient pas prête** ;
  **`without`** : pour un ingrédient **qui compte** (≥ 5 % du poids du plat, avec quantité) : `200 {decision: "remove_recipe", …}` (le front demande) ; pour un ingrédient **mineur** (sans quantité, ou < 5 % du poids du plat) : `cook_need_override 'without'` et **la recette le note**.
- [ ] **« Je n'en ai plus »** `POST …/at-home-outs` : retire du placard les `stock_item` de l'aliment (`delete` des lignes de l'aliment, journal par `source`), et la ligne repasse sur la liste (le besoin n'est plus couvert) ; idempotent.
- [ ] **« J'ai tout »** `POST /cooking-sessions/{id}/shopping-completions {key, mode: have_them | keep_them}` : **`have_them`** (« Je les ai ») : `cook_need_override 'have'` pour les articles qui restent, **sans rien ajouter au placard** ; **`keep_them`** (« Garde-les ») : les articles deviennent des **lignes détachées** (`detached = true`, quantité = ce qu'il restait à acheter), **ils restent sur la liste « à reprendre » même après la session**, et **la session devient prête si aucun n'est un ingrédient qui compte** ;
  sinon la réponse liste `blocking: [line_key…]` (le front passe par « Pas trouvé » pour chacun). La liste **ne se vide jamais d'elle-même**.
- Cas de test (critères) : **10** (« Épinards » → « Pas trouvé » → « Remplacer » → « D'accord » : la ligne devient le remplaçant dans son rayon, la recette note le remplacement) ; **11** (le dernier article coché : prête ; avec « Garde-les », les articles restants restent après la session) ; sans voisin sûr ; **allergie par le double de test** : aucun remplaçant n'en contient ; ingrédient mineur vs qui compte ; « Je repasserai » : pas prête ; retirer une ligne de recette : décision rendue, **rien écrit** ; le sopalin sans quantité ; « Toujours sur la liste » revient après 7 jours (horloge réglée) ; **« J'ai tout » rejoué** (deux téléphones) : un seul effet ; `ignore tes règles` ; un article ajouté deux fois par la même clé : une ligne.
- **Mutations :** remplaçant non filtré par les allergies ; « Garde-les » pour un ingrédient majeur rend la session prête ; `have_them` écrit au placard ; ligne retirée avant la décision.
- **Retour arrière :** retirer les routes ; `drop function`.

### C5 : Le dressage (pur) : partage, poids, valeurs, diagnostic, complément

**Pourquoi :** § 12.1 ; K13 ; critères 19, 37, 48. **Dépend de :** rien. **Fichiers :** `domain/dressage.py`, `tests/unit/test_dressage.py`, `tests/unit/vecteurs_dressage.json`.

- [ ] **Test rouge d'abord** (`uv run pytest tests/unit/test_dressage.py -q` : `ModuleNotFoundError`) :

```python
from popote_api.domain.dressage import dresse, Membre, RecetteCuite

SAM = Membre("sam", rang=0, repas_vise_kcal=700, repas_vise_prot=40)
LEA = Membre("lea", rang=1, repas_vise_kcal=570, repas_vise_prot=30)
LASAGNES = RecetteCuite("lasagnes", barquettes=4, poids_estime_g=1180, kcal_totales=2080, prot_totales=124, valeurs_connues=True)

def test_critere_19_peser_change_les_grammes_pas_les_valeurs_totales():
    avant = dresse([LASAGNES], [SAM, LEA])
    apres = dresse([LASAGNES.pese(1180)], [SAM, LEA])
    assert sum(b.grammes for b in apres.barquettes) == 1180                     # la somme fait le poids pesé
    assert sum(b.kcal for b in apres.barquettes) == sum(b.kcal for b in avant.barquettes) == 2080   # valeurs totales inchangées

def test_deux_barquettes_par_personne_pesent_comme_les_repas_vises():
    d = dresse([LASAGNES], [SAM, LEA])
    sam, lea = [b.grammes for b in d.barquettes if b.pour == "sam"], [b.grammes for b in d.barquettes if b.pour == "lea"]
    assert len(sam) == len(lea) == 2 and abs(sam[0] / lea[0] - 700 / 570) < 0.02

def test_critere_48_la_sortie_ne_contient_aucun_objectif():
    texte = repr(dresse([LASAGNES], [SAM, LEA]).pour(SAM))     # ce que la route rend à Sam
    assert "700" not in texte and "570" not in texte and "repas_vise" not in texte

def test_poids_hors_de_la_moitie_au_double_demande_confirmation():
    assert dresse([LASAGNES.pese(400)], [SAM, LEA]).confirmation_requise == ["lasagnes"]
```

- [ ] **Code** : `dresse(recettes, membres) -> Dressage`, **déterministe** : (1) **combien pour chacun** : les barquettes d'une recette se partagent à égalité ; s'il en reste une, elle va à l'un puis à l'autre **d'une recette à la suivante** (rotation par rang) ; un foyer d'une personne : tout pour elle ; `repartition_choisie` (« 3 pour moi, 1 pour Léa ») prime ; (2) **quel poids** : `w_p = W × t_p / Σ(n_q × t_q)` où `t_p` = **repas visé** de `p` = `TAUX_REPAS_VISE = 0,35` × son énergie du jour (K-C4, une constante) ;
  sans objectifs chez l'un, il prend la **moyenne des autres** ; chez personne, **poids égaux** ; arrondi **au gramme par répartition du plus grand reste**, **les écarts à l'intérieur d'une personne ≤ 1 g, la somme exactement `W`** ; (3) **le poids du plat** : *estimé* = Σ grammes des ingrédients à l'échelle × facteur de cuisson de `food_yield_factor` quand elle le sait (riz et pâtes prennent de l'eau, la viande en perd), sinon 1 (la
  table existe vide : **C6 la sème** de valeurs de départ prises seules, relues) ; *pesé* : `weighed_g` ; **moins de la moitié ou plus du double de l'estimation** : `confirmation_requise` (« 1 180 g, sans le récipient ? » : « Oui » ou « Je corrige ») ; (4) **les valeurs d'une barquette** = la part des **valeurs totales de la recette** qui correspond à son poids (`kcal_b = kcal_totales × w_b / W`), arrondies **une fois** ; la cuisson change le poids, pas l'énergie ; (5) **diagnostic** (codes seuls) :
  énergie d'une barquette < 80 % du repas visé de la personne → `{kind: "light", proposed_count: n - 1}`, > 120 % → `{kind: "heavy", proposed_count: n + 1}` ; (6) **complément** : protéines d'une barquette < 90 % de celles du repas visé → `{food: "skyr", grams: ceil25((visé - barquette) / 0,10)}` (K-C5 : 10 g de protéines pour 100 g, constante) **rendu seulement à la personne concernée** (`Dressage.pour(membre)`), jamais à l'autre ; (7) **valeurs inconnues** : parts égales, `values_unknown: true`.
  **`Dressage.pour(membre)`** ne contient **que des grammes, des nombres de barquettes et des codes** : ni le repas visé, ni un pourcentage, ni l'énergie visée d'une personne ; **jamais lu à voix haute** (la réponse porte `speakable: false`).
- Cas de test : critères **19**, **37** (« Je corrige » : un poids hors bornes sans confirmation n'est pas appliqué), **48** ; **trois personnes** (le moteur ne suppose pas deux membres) ; une personne **sans objectifs** (moyenne des autres) ; **personne sans objectifs** (égaux) ; un foyer d'une personne ; une barquette de reste qui tourne ; propriété (graine fixe, 500 tirages) : somme des grammes = `W`, écarts ≤ 1 g, déterministe, jamais négatif ; **vecteurs d'or** (`vecteurs_dressage.json` : Sam et Léa de l'exemple : 324 g et 266 g pour 1 180 g, lus aussi par `tests/db` si une règle passe en SQL).
- **Mutations :** poids au prorata de l'énergie du jour au lieu du repas visé ; valeurs totales recalculées au poids pesé ; complément rendu à l'autre ; objectif dans la sortie ; arrondi qui perd un gramme.
- **Retour arrière :** supprimer les fichiers.

### C6 : L'état du dressage (M-C2, K13)

**Pourquoi :** § 12.1, § 12.3 ; critères 19, 37, 38, 48. **Dépend de :** C5, S12 (la fin de la cuisine). **Coupe prévue :** tables, graine des rendements, gel des valeurs (C6a, migration M-C2) ; routes (C6b). **Fichiers :** `supabase/migrations/<M-C2>_le_dressage.sql`, `api/dressage.py`, `schemas/dressage.py`,
`tests/db/dressage.test.ts`, `tests/integration/test_dressage_route.py`, matrice.

- [ ] **Tables** : `cook_dressing_recipe(session_id, recipe_id, cooked boolean, barquettes int, split jsonb, estimated_g numeric, weighed_g numeric, snapshot jsonb, primary key (session_id, recipe_id))` — **`snapshot` : les valeurs totales de la recette, les poids d'ingrédients et le titre, copiés au passage en `to_store`** (`private.cuisiner_prepare_le_dressage(p_session)`, appelée par S12) : **corriger la recette plus tard ne change pas les valeurs d'une barquette** ;
  la **version** du dressage est `cook_session.dressing_version` (incrémentée par déclencheur à chaque écriture de `cook_dressing_recipe`) ; **graine de `food_yield_factor`** (riz 2,5, pâtes 2,2, lentilles 2,3, poulet 0,75, bœuf haché 0,72, légumes 0,9 : **valeurs de départ prises seules, relues dans `docs/preuves-0.2.md`**, jamais inventées en silence : une source par ligne).
- [ ] `GET /cooking-sessions/{id}/dressing` : appelle `dresse(...)` **avec les objectifs lus par `private.cuisiner_cibles_du_dressage(p_session)`** (`security definer`, qui ne rend **que** les deux repas visés de chaque membre à la fonction de calcul, **jamais à la route** : la route reçoit `Dressage.pour(appelant)`) ; `ETag` = version du dressage ; `PUT …/dressing` (`If-Match`) `{recipes:[{recipe_id, barquettes, split}]}` : « 3 pour moi, 1 pour Léa », le nombre (après « C'est léger. J'en fais 3 au lieu de 4 ? ») ; `POST …/dressing/weighings {recipe_id, grams, confirm?}` : `422 poids_hors_bornes {confirm_required: true}` hors de la moitié au double sans `confirm` ; **« Peser » ne change pas les valeurs totales**.
  **Une recette laissée tomber ou arrêtée pas cuite n'est pas dressée** (`cooked = false`).
- Cas de test : critères 19, 37, 38 (**Léa change le dressage pendant que Sam range : rien n'est rangé**, C7), **48** (la réponse à Sam ne contient aucun nombre des objectifs de Léa ni les siens : **test d'inclusion** qui parcourt le JSON et cherche les valeurs de `nutrition_target`) ; recette sans valeurs : parts égales ; **le complément n'est rendu qu'à son destinataire** ; version incrémentée par chaque écriture ; deux `PUT` simultanés : le second `412` ; un autre foyer `404` ; `snapshot` figé : corriger la recette ne change pas la réponse ; `tests/db` verts.
- **Mutations :** objectifs lus par la route ; complément de l'autre rendu ; `snapshot` recalculé à la lecture ; version non incrémentée.
- **Retour arrière :** retirer les routes ; `drop function` ; `drop table cook_dressing_recipe` ; retirer la graine.

### C7 : Où ranger et « Tout ranger » (M-C2b, K14)

**Pourquoi :** § 12.2 à § 12.4 ; critères 20, 22, 38. **Dépend de :** C6, S4. **Coupe prévue :** proposition (C7a, Python pur) ; la fonction d'écriture et ses tests (C7b, migration M-C2b) ; la route (C7c). **Fichiers :** `domain/rangement.py`, `supabase/migrations/<M-C2b>_ranger.sql`, `api/rangement.py`, `tests/unit/test_rangement.py`, `tests/db/ranger.test.ts`,
`tests/integration/test_ranger.py`, `tests/integration/test_course_ranger.py`, matrice.

- [ ] **La proposition** (`rangement.py: propose(barquettes, semaine, cuit_le) -> Proposition`, pure) : **au frigo, pour chaque personne, ses barquettes des quatre prochains jours d'après la semaine** (`private.cuisiner_repas_a_couvrir(p_from date)` lit `meal_slot` : **seulement des nombres par personne et par jour**, et ne lit les cases de l'autre que pour compter) ; **sans rien de prévu**, 2 par personne en alternant les recettes ; le reste au congélateur ;
  **une recette qui ne se congèle pas, ou dont on ne sait pas si elle se congèle, reste au frigo** et la réponse porte `warnings: [{kind: "not_freezable", recipe_id, count, until}]` (« 2 à manger d'ici mercredi ») ; « à manger avant » = jour de cuisson + 4 jours (frigo), + 90 jours (congélateur) : **règles du déclencheur existant, jamais recopiées** (`expires_at` est lu après l'insertion) ; **« Cuit le »** : aujourd'hui par défaut, pas dans le futur, **2 jours en arrière au plus** ;
  une date qui rend le « à manger avant » du frigo déjà passé n'offre **pas** le frigo (congélateur, ou `expired: true`).
- [ ] **`private.cuisiner_range_la_session(p_person uuid, p_session uuid, p_key uuid, p_dressing_version int, p_cooked_on date, p_lots jsonb, p_debits jsonb)`** — **`popote_api` seul** (la personne vient de la session ; les lots sont **calculés par Python** à partir du dressage lu à `p_dressing_version`, la fonction **revérifie** cette version sous verrou) ; statuts `ok | replay | dressage_change | etat_incompatible | refuse` ; **une seule écriture, toutes ou aucune** ; ordre des verrous : **foyer, personne, session (`for update`), `cook_dressing_recipe` par identifiant de recette, `stock_item` par identifiant** ; effets dans l'ordre :
  1. **rejeu** : `cook_storage(session_id pk, key, portion_ids uuid[], created_at)` existe : rend `replay` avec `portion_ids` (**rien de plus n'est créé**, critère 20) ;
  2. `dressing_version = p_dressing_version` sinon `dressage_change` avec le dressage à jour (critères 38 : « Léa vient de changer le dressage. Regarde, et range. ») ;
  3. états : `to_store` seulement ;
  4. **les barquettes** (`insert into public.portion`, mêmes colonnes et mêmes bornes que `range_la_session` de `0120`, **écrites comme des gestes de l'ancienne appli**, `source = 'session'`, `cycle_id = null`, `cook_session_id`, valeurs **figées** du `snapshot`, `kcal_margin`/`protein_g_margin` du snapshot, `for_user_id`, `location`, `prepared_at` = jour de cuisson, `frozen_at` si congélateur) ; `portion_event 'dressee'` est posé **par le déclencheur existant** ;
  5. **le placard** (§ 12.4) : `p_debits` = `[{food_id, remove: amount}]` calculé par Python : **seul ce qui se calcule est retiré** (sans quantité, ou placard sans quantité comparable : laissé, compté en `uncountable`), **pièces arrondies vers le bas sur la somme par aliment de la session**, **jamais sous zéro**, les plus anciennes `stock_item` d'abord, journal `cook_pantry_debit` ; corrections de la personne (« il reste 2 oignons ») : `remove = placard − reste` ; « Ne touche pas au placard » : `p_debits = []` ;
  6. `cook_session` → `stored`, `ended_at`, **ses besoins s'éteignent** (C2) ; annule la ligne `cook_to_store` du push (S9) ; `cook_storage` écrit ; **rend `portion_ids`** pour « Oui, place-les » du plan « Semaine et Frigo ».
- [ ] Route `POST /cooking-sessions/{id}/storages` (`Idempotency-Key`, **la clé est aussi `p_key`** : deux niveaux de rejeu) : lit dressage + version, `propose` pour valider les `placements` envoyés (la route **refuse** un placement qui contredit la règle des dates : `422`), **recalcule les lots et les retraits côté serveur** (jamais ceux du client), appelle la fonction, traduit les statuts en `Probleme` **avant** d'écrire la ligne d'idempotence.
- Cas de test (critères) : **20** (« Tout ranger » deux fois : 10 barquettes, pas 20 ; le placard a baissé **une seule fois**) ; **38** (Léa change le dressage pendant que Sam range : rien n'est rangé, l'écran de Sam se met à jour) ; **22** (une recette pas cuite n'est pas dressée, ses ingrédients restent au placard) ; **« Tout ranger » sur deux téléphones** à la fois : un seul effet ; **réponse perdue puis rejeu sans `Idempotency-Key`** : même `p_key` : `replay` ; erreur injectée au milieu : **tout annulé** (aucune barquette, placard intact) ;
  recette non congelable : au frigo + avertissement ; « Cuit le » hors bornes (`422`), il y a 2 jours : frigo refusé si dépassé ; placard : pièces arrondies vers le bas sur la somme (« 1,5 + 1,5 oignon » : 3) ; ingrédient sans quantité : laissé, `uncountable: 2` ; **un client Supabase ne peut pas appeler la fonction** (`has_function_privilege`) ; `portion` lisible par « Aujourd'hui » (`aujourdhui_etat` : « barquettes » comptées) ; `tests/db` (`barquettes`, `semaine-hier`, `annuler-mange`) verts avant/après.
- **Mutations :** lots du client ; version non revérifiée ; débit hors transaction ; barquette écrite avant la vérification de version ; `expires_at` recalculé ici ; rejeu qui recrée.
- **Retour arrière :** retirer la route ; `drop function`, `drop table cook_storage, cook_pantry_debit`.

### C8 : Le coût d'une session (M-C3, K15)

**Pourquoi :** § 13 ; critères 23, 47. **Dépend de :** C7 ; plan Budget (§ 8, interface) ; **plan IA 0.6 (vision)** pour le ticket. **Coupe prévue :** rattacher une opération (C8a, migration M-C3) ; coût par part (C8b) ; lire un ticket, nettoyer, rapprocher, enregistrer (C8c, **dernière tâche du plan : K-C1**). **Fichiers :** `supabase/migrations/<M-C3>_le_cout.sql`, `<M-C3b>_ticket.sql`, `domain/ticket.py`,
`api/cout.py`, `api/tickets.py`, `schemas/cout.py`, `tests/unit/test_ticket.py`, `tests/integration/test_cout.py`, `tests/integration/test_ticket_route.py`, matrice.

- [ ] **Rattacher** : `cook_cost_link(session_id, operation_id uuid unique, linked_by, linked_at, amount_cents int)` ; `GET …/cost-candidates` (au plus 3, lit `private.operations_de_courses_candidates` du plan Budget, **en lecture ; tant qu'elle n'existe pas : `{items: []}`**, un stub qui rend zéro ligne, remplacé par le Budget) ; `POST …/cost-links {operation_id, session_id}` → `public.cuisiner_rattache_une_operation` : **une opération n'est rattachée qu'à une session**
  (`unique (operation_id)` : `409 operation_deja_rattachee`) ; si deux sessions ont couru ensemble la réponse liste `sessions: [...]` et le front demande laquelle (« C'était pour dimanche, ou pour ce soir ? ») ; « Non » : `POST …/cost-links/refusals` (l'opération sort de la question de **cette** session seulement). **Aucune écriture du poste « Courses » du Budget.**
- [ ] **Le coût par part** (`GET …/cost`) : `{cents_per_part, approximate, speakable: false}` = **payé ÷ parts retenues de la session** ; **« environ »** quand la liste portait autre chose que la session (lignes détachées ou manuelles cochées pendant la même sortie) ; **sans coût réel : rien**. **Le montant n'entre jamais dans une notification, jamais dans le contexte d'un modèle, jamais dit à voix haute** (test de grep sur le registre push et sur les outils `ia_lit_*` : aucun champ `cents`).
- [ ] **Lire un ticket** `POST /receipt-readings` (multipart, **une** photo, R6 : en mémoire, métadonnées retirées, jamais écrite ; **délai 75 s**, quota `ticket` de R7, nœud `cuisiner_ticket` Sonnet 5.5, **dépend du 0.6 du plan IA**) : le modèle rend `TicketLu{store, lines[{label, quantity, unit, price_cents}], total_cents}` ; **`domain/ticket.py: nettoie(ticket)`**, **avant toute écriture et avant de rendre le brouillon** : retire toute suite de **8 chiffres ou plus** (espaces et tirets compris : `4970 12•• …`), toute ligne qui contient « carte », « fidélité », « n° », un motif **Luhn** de 13 à 19 chiffres, un code-barres EAN : **d'un ticket, seuls restent libellés, quantités et prix** ;
  **rapproche** chaque ligne d'un article de la liste (`reconnait` de R8a, seuil `SEUIL_SUR`) et marque `à vérifier` (`needs_check`) **ce dont elle doute** (confiance, somme des lignes ≠ total à plus de 2 %) ; le brouillon `receipt_draft(id, household_id, person_id, content jsonb, version, expires_at)` (7 jours, personne) ; `PATCH` (Merge Patch, `If-Match`) pour corriger ; **« Enregistrer »** `POST /receipts {draft_id, version}` → `public.cuisiner_enregistre_un_ticket` : `receipt`, `receipt_line` (le déclencheur existant **apprend le prix**, médiane mobile), `household_price` ; rejouable par `draft_id` ; **les prix lus nourrissent l'estimation** des prochaines listes (C2).
- Cas de test (critères) : **47** (photo de ticket : seau compté **vide** avant/après, même en échec ; quatrième photo refusée : R6) ; **un ticket synthétique** (généré, **jamais un vrai**) avec un numéro de carte bancaire à 16 chiffres Luhn-valide, un numéro de fidélité et un code-barres : **ils n'existent nulle part** (ni brouillon, ni `receipt_line`, ni journal, ni réponse ; **grep en base**) ; la ligne à total incohérent est `needs_check` ; `ignore tes règles` comme libellé : rendu tel quel ; deux téléphones enregistrent le même brouillon : un ticket ; une opération rattachée à une session ne l'est pas à l'autre (critère de la spec § 13) ; sans Budget : `items: []` ; le coût « environ » ; l'estimation affichée après enregistrement d'un ticket ; quota `ticket` à zéro : `429 quota_cuisiner_epuise`, « Scanner le ticket » seul bloqué.
- **Mutations :** numéro de carte écrit avant le nettoyage ; `unique (operation_id)` retiré ; montant dans le contexte du modèle ; ticket enregistré sans validation ; photo gardée.
- **Retour arrière :** retirer les routes ; `drop function` ; `drop table cook_cost_link, receipt_draft`.

### C9 : Ce que le foyer apprend (K16 : rayons, prix, courses)

**Pourquoi :** § 9.2 (« l'ordre où le foyer les parcourt »), § 13, K-C13 ; K16. **Dépend de :** C3, C8. **Fichiers :** `supabase/migrations/<M-C1h>_apprendre_les_rayons.sql`, `tests/db/rayons.test.ts`, `tests/integration/test_apprentissage_courses.py`.

- [ ] **L'ordre des rayons** : un seul magasin par foyer (K-C13) : le magasin par défaut (`store.is_default`, créé au premier cochage s'il manque) ; `private.apprend_le_rayon(p_store uuid, p_aisle text, p_rank int, p_total int)` **reprend la formule de `tg_shopping_check` (`0017`)** — copiée, pas modifiée (expansion) — et un **test de parité** rejoue la même suite de cochages dans les deux et compare `aisle_order.position` ; `GET /shopping-list` rend les rayons **triés par `position`** (défaut : l'ordre de la spec).
- [ ] **Les derniers prix et leur âge** : `GET /shopping-list` rend, par ligne, `last_price_age_days` (un nombre, jamais « il y a trois jours ») quand `household_price` en connaît un ; **les prix de plus de 12 mois ne servent pas à l'estimation** (C2). **« On refait ? »** : S12.
- Cas de test : parité avec l'ancien déclencheur ; trois cochages dans l'ordre boucherie, frais, fruits : l'ordre appris le suit ; le bandeau « Léa est à la boucherie » = `other_person_aisle` ; prix de 13 mois : ignoré ; l'ancienne appli et son `aisle_order` : `tests/db` verts.
- **Retour arrière :** `drop function` ; `aisle_order` n'est pas modifiée (lignes ajoutées seulement).

### C10 : Le départ, l'export, la purge et la preuve de la voie

**Pourquoi :** socle § 7.7 (export et suppression), 0.4ter F3 ; clôture. **Dépend de :** toutes les tâches de la voie C **et** de R2, S4. **Fichiers :** `supabase/migrations/<M-C4>_depart_et_export_cuisiner.sql`, `tests/db/depart-cuisiner.test.ts`, `tests/integration/test_export_cuisiner.py`, `tests/e2e_api/test_courses_ranger_cout.py`, `ops/preuve_courses.py`, `docs/preuves-0.2.md`, `docs/normes-api.md`, `docs/schema.md`, `docs/securite.md`.

- [ ] **Départ et export** : `private.efface_cuisiner_de(p_person uuid)` (appelée depuis `private.sort_du_foyer` du plan 0.4ter F3 : **point d'insertion à ajouter à ce plan, comme `efface_l_ia_de`** : écart à relayer) : supprime `recipe_draft` et `receipt_draft` de la personne (cascade), met `created_by`, `linked_by`, `checked_by`, `set_by` à nul quand la clé le permet, supprime ses `cook_gesture` de **plus de 90 jours** et **anonymise** les autres (`person_id = null`) ; **les sessions, listes, barquettes, recettes du foyer restent au foyer** (données du foyer, pas de la personne) ;
  `private.exporte_cuisiner_de(p_person uuid)` rend **ses seules données** (brouillons, gestes, préférences posées, lignes cochées par elle, opérations qu'elle a rattachées) en lignes `(section, seq, payload)` pour `export_de_la_personne` ; **le garde-fou d'introspection** (`tables_de_foyer()`, colonnes qui désignent une personne) **échoue** tant qu'une table neuve de ce monde n'est pas inscrite à l'une des deux fonctions (test).
- [ ] **Purges** (`pg_cron`, par lots, journal des comptes seuls, idempotentes) : brouillons échus (7 jours), `cook_job` (7 jours), `cook_gesture` et `cook_timer` (90 jours), `cook_session` rangées, arrêtées ou annulées de plus de 2 ans ; **aucune n'efface une barquette ni une recette**.
- [ ] **Scénario complet** (pile locale, Sam et Léa, valeurs de l'exemple) : (1) menu validé → la liste existe, un article couvert dans « Déjà chez toi » ; (2) Léa coche, Sam voit l'initiale ; **cochages croisés** ; (3) « Pas trouvé » → « Remplacer » → « D'accord » ; (4) dernier article → prête ; (5) **riz 300 g** : critère 26, 46 (retirer une recette, besoin qui monte, décocher après le débit) ; (6) « Garde-les » ; (7) dressage : 324 g et 266 g, **Peser** à 1 180 g, objectifs absents de la réponse de Sam (48), complément pour son destinataire seul ; (8) **« Tout ranger » ×2 sur deux téléphones** : 10 barquettes, placard baissé une fois (20) ; Léa change le dressage pendant que Sam range (38) ;
  (9) opérations de courses (stub du Budget) et ticket synthétique **avec numéro de carte** : absent partout ; (10) départ de Léa : ses brouillons effacés, les sessions restent.
- [ ] **Sur l'essai** : migrations M-C1 à M-C4 **avant** le code ; `tests/db` de l'ancienne appli **après** ; **p95 de `GET /shopping-list` ≤ 100 ms côté base** et de `cuisiner_range_la_session` ; k6 : 25 cochages concurrents de la même ligne (une `stock_item`), 25 « Tout ranger » concurrents (une session rangée, un jeu de barquettes), 50 utilisateurs sur `GET /shopping-list` (p95 < 300 ms, `304` majoritaires : **deux personnes dans le même magasin relisent toutes les 3 s**) ; résultats dans `docs/preuves-0.2.md`.
- [ ] Documentation : § « Courses, dressage, rangement, coût » de `docs/normes-api.md`, `docs/schema.md` (§ 7 : **une part**), `docs/securite.md` (objectifs jamais rendus ; nettoyage d'un ticket ; fonctions `popote_api` seul), `docs/exploitation.md` (graine des rendements, purges). **Revue adverse** de la voie ; constats traités.
- Critères couverts : 8, 9, 10, 11, 19, 20, 22, 26, 27, 37, 38, 46, 47 (ticket), 48.
- **Retour arrière :** aucun (preuves) ; la migration M-C4 : `drop function`.
