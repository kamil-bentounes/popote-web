# Monde « Cuisiner » : le plan de l'API (K1 à K16, interfaces de K17 et des rappels)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal :** ajouter à `popote-api` tout ce que le monde « Cuisiner » lit et écrit (spec : `2026-11-14-monde-cuisiner-design.md`
de la session design, § 17 K1 à K16) : le catalogue et la lecture de recettes, la session et son plan calculé, la cuisine
pas à pas (minuteurs, gestes hors ligne), la liste de courses du foyer, le dressage, le rangement et le coût ; plus **les
interfaces** de K17 (Popote dans ce monde) et des rappels (§ 16).

**Architecture :** (1) **trois voies** qui n'écrivent jamais la même migration en même temps : *Recettes* (R), *Session, plan et
cuisine* (S), *Courses, dresser, ranger, coût* (C), chacune dans son fichier ; ce fichier porte ce qu'elles partagent.
(2) **Le calcul est du Python pur** (`domain/`, sans entrée-sortie, déterministe, testé par propriétés) : le plan, les
valeurs d'une recette, la liste de courses dérivée, le dressage. La base ne garde que **des états et des écritures
atomiques** (fonctions SQL qui rendent un statut, jamais une exception pour un refus métier). (3) **Le plan est un travail
asynchrone repris** (table `cook_job`, bail, reprise par la lecture qui le suit et par `pg_cron`) : le conteneur qui
s'endort le termine au réveil suivant. (4) **Expansion seule** : tables neuves à côté de l'ancien monde (`cycle`,
`shopping_item`, `session_task`), colonnes neuves nulles ou à défaut sur `recipe_*`, `portion`, `stock_item` ; les barquettes
et le placard sont **les mêmes tables** que l'ancienne appli et que « Aujourd'hui ».

**Tech Stack :** celui de `popote-api` (Python 3.13, FastAPI, Pydantic v2, psycopg 3, Postgres Supabase, `Pillow` pour les
photos) ; **une seule dépendance ajoutée** : `Pillow` (R6), à passer par `managing-dependencies-and-licenses` dans sa PR. Le
solveur exact des tests est écrit à la main, sans bibliothèque.

**Hors périmètre :** les écrans ; la transcription vocale (plan IA 0.6) ; le Budget (interface seulement, § 8) ; la
semaine et le frigo (interface seulement, § 7) ; les foyers amis ; l'ingestion du catalogue commun (tâche d'opérateur).

**Fichiers du plan :** [`…-api-cuisiner-voie-recettes.md`](2026-11-14-api-cuisiner-voie-recettes.md) (R1 à R12),
[`…-voie-session-cuisine.md`](2026-11-14-api-cuisiner-voie-session-cuisine.md) (S1 à S14),
[`…-voie-courses-ranger-cout.md`](2026-11-14-api-cuisiner-voie-courses-ranger-cout.md) (C1 à C10).

---

## Les décisions de ce plan (à relire ; chacune est une constante ou un seul endroit à changer)

| N° | Décision | Pourquoi |
|---|---|---|
| D1 | **Le calcul du plan est une recherche à nombre d'essais fixé, semée par l'identifiant de la session**, jamais bornée par l'horloge ; le « plan l'une après l'autre » est toujours un candidat ; au-delà d'une taille mesurée, refus d'avance (`422 plan_trop_gros`). Valeurs de départ : `ESSAIS_PAR_ETAPE = 20`, `MAX_ETAPES_PLAN = 200` (étapes de recette **plus** gestes de sortie) ; **S3 les remplace par la mesure** (règle : le pire cas sur le conteneur de l'essai tient en 30 s ; sinon la taille permise baisse jusqu'à ce qu'il tienne) | spec § 10.3 ; la limite de 8 recettes × 40 étapes (320) ne tient peut-être pas en Python : la mesure décide, le test épingle la valeur |
| D2 | **Un geste hors ligne ne porte aucun instant** : il porte un `sync_token` (instant du serveur signé, rendu par chaque lecture de la cuisine) et `elapsed_ms` (horloge monotone de l'appareil depuis cette lecture). Le serveur calcule `at = t_sync + elapsed`, vérifie la signature, puis borne (pas dans le futur, pas avant `t_sync`, pas plus de 12 h après lui, pas avant la fin de l'étape précédente du cuisinier) | spec § 19 ; « aucune écriture ne reçoit d'instant » (socle § 5) : le client ne peut forger qu'un `elapsed` plausible |
| D3 | **Le placard est la même table `stock_item`** ; cocher y écrit une ligne rattachée à la ligne de courses (`stock_item.shopping_line_id`, colonne neuve nulle) ; décocher retire `min(pris, placard)` | « décocher ne fait jamais passer le placard sous zéro » (spec § 9.2) |
| D4 | **Une part est une ligne `portion`** (l'unique définition, § 7). « Tout ranger » écrit des `portion` avec `source = 'session'`, `cycle_id = null`, `cook_session_id` (colonne neuve nulle) | « Aujourd'hui » et « Semaine et Frigo » lisent `portion` ; pas de table de plus |
| D5 | **La session de ce monde n'est pas un `cycle`** : table neuve `cook_session`. L'ancien monde garde `cycle` ; la liste de courses ne lit plus `shopping_item`. **Rien de ce qui est écrit par la nouvelle appli n'est visible de l'ancienne** hors recettes, barquettes et placard ; la fiche de bascule exige donc **aucun cycle en cuisine ni au dressage au jour J** | l'ancien `cycle` est unique par semaine et par foyer (`cycle_un_seul_vivant`) : incompatible avec plusieurs sessions ouvertes (spec § 4.2) ; on ne le contracte pas (expansion seule) |
| D6 | **Les lectures du monde sont du texte-libre-zéro** : codes et nombres. Les phrases de la spec (« 1 h 50 à deux », « Il manque 6 parts ») sont composées par l'écran depuis des champs typés ; **les raisons du menu, les phrases du plan, les causes de refus sont des énumérations fermées** | socle § 3.1 ; critères 2 et 13 |
| D7 | **Allergies : interface, pas stockage.** Le plan IA (§ Mémoire) interdit de ranger une donnée de santé et renvoie l'enregistrement d'une allergie à une décision du propriétaire (consentement, article 9). Ce plan écrit donc **le filtre complet** et lit une seule fonction, `private.allergies_du_foyer(p_household)` (stub : aucune ligne, `connues = false`) ; avec le stub, l'API dit « Je ne connais pas tes allergies » (`allergies_connues: false`) et ne filtre rien | la consigne dit « faits typés du plan IA » : **ils n'existent pas** (voir Question 1) |
| D8 | **Toute lecture d'une recette, d'une page, d'une photo ou d'un ticket est une seule requête longue** (délai 75 s côté API, 90 s côté relais, comme `…/threads/{id}/messages` : exception par chemin dans `limites.py`), **sans fichier intermédiaire** : la photo est lue en mémoire par flux, réduite, envoyée au modèle, jamais écrite. « Supprimée à la fin de la lecture » est donc **prouvé par un test qui compte les objets du seau avant et après, y compris sur échec** (zéro écriture) | pas de seau, pas de fenêtre de 30 jours, pas de purge à rater ; le conteneur qui s'endort ne laisse rien |
| D9 | **Le préchauffage du four** est une étape synthétique « Allume le four » (1 min, « tes gestes ») suivie de `PREHEAT_MIN = 5` min « sans toi » sans geste de sortie, posée avant le premier plat d'une température ; changer de plus de 20 °C (chaud ou froid) impose 5 min d'écart | la spec dit « un préchauffage par température » sans durée : valeur prise seule, une constante |
| D10 | **« Aucun plan possible » veut dire : aucun plan valide trouvé dans le budget d'essais** (et, pour les cas détectés par la preuve de § S2, impossibilité démontrée). L'écran dit « Je n'y arrive pas » dans les deux cas et offre les deux issues (`chain_gap_max_min` 2 → 5 ; un cuisinier de plus) | un plan jamais faux vaut mieux qu'un plan trouvé de justesse ; incomplétude écrite, pas cachée |

## Constats vérifiés (`origin/main` de `popote-api` `3d9cc46`, migrations jusqu'à 0149 ; 0.4bis, 0.4ter, push, IA et « Aujourd'hui » à venir)

| N° | Constat | Preuve |
|---|---|---|
| V1 | **Les recettes existent** : `recipe` (origine `importee`/`generee`/`manuelle`, `owner_household_id`, `yield_servings`, `freezable` nul = « on ne sait pas », `plannable`, `image_url`/`image_path`), `recipe_ingredient` (`raw_text`, `qty`, `unit`, `food_id`, `grams_reference`, `resolution_source`, `confidence`), `recipe_step` (`text`, `verb`, `duration_min`, `duration_source` ∈ `declaree`/`defaut`/`llm`/`confirmee`, `appliance_type`, `temperature_c`, `load_type` ∈ `actif`/`passif`/`bloquant`, `gesture_min`, `quantity_g`), `recipe_step_dependency`, `recipe_nutrition` (par part, avec marge et couverture). Correspondance des natures : `actif` = **tes gestes**, `bloquant` = **à surveiller**, `passif` = **sans toi**. | `0003`, `0019`, `0034`, `0092`, `docs/schema.md` |
| V2 | **Le catalogue est de classe B, la recette d'un foyer de classe C** : `tg_class_b_guard` refuse l'`UPDATE` d'une ligne sûre (`confidence >= 0.8`) du catalogue ; `tg_recipe_photo` et `tg_recipe_source` refusent à tout rôle sauf le service de poser `image_url` / changer la source du catalogue. Les écritures de ce monde passent donc par des fonctions `security definer`. | `0036`, `0038`, `0092`, `docs/schema.md` |
| V3 | **Les tables de la session existent mais sont celles du `cycle`** (`cycle`, `cycle_recipe`, `session_task`, `session_appliance`, `duration_observation`, `shopping_item`, `shopping_trip`, `store`, `aisle_order`) : un seul cycle vivant par foyer, états `vide`…`interrompue`, une liste de courses *par cycle*. Rien de tout cela ne sait porter plusieurs sessions ni une liste de foyer. | `0013`, `0014`, `0015`, `docs/schema.md` |
| V4 | **Le plan de l'ancienne appli est du TypeScript** (`src/lib/plan/ordonnance.ts`, 423 lignes : schéma sériel de génération piloté par une liste de priorité, recherche locale, tirage semé par l'identifiant du cycle ; `fusion.ts`, `duree.ts`, `equipement.ts` ; tests par propriétés). C'est la **référence à porter**, pas à réutiliser : le front ne calcule plus rien. | ancien dépôt, lecture seule |
| V5 | **Le stock** : `stock_item(label, food_id, quantity, unit, location ∈ frigo/congelateur/placard, source ∈ manuel/courses/photo, shopping_item_id, frozen_at, expires_at)`. `range_la_session` (0120) retire du stock et crée les barquettes en une transaction, avec ses refus levés en exceptions : **modèle de « Tout ranger »**, à réécrire en fonction à statut. | `0120` |
| V6 | **Les barquettes** : `portion(recipe_id, label, grams, kcal, protein_g, fiber_g, carb_g, fat_g, kcal_margin, protein_g_margin, cost_eur, for_user_id, location, state, prepared_at, frozen_at, expires_at, cycle_id nullable, source)` ; `tg_portion_peremption` pose `expires_at` (frigo 4 j, congélateur 90 j, décongelée 24 h) à partir de `prepared_at`. | `0016`, `0046`, `0047` |
| V7 | **Les prix et tickets existent** : `receipt`, `receipt_line` (`tg_receipt_line_apprend` apprend le prix, médiane mobile), `household_price`, vue `price_knowledge` ; **les poids appris** : `weighing`, `household_unit_weight` (médiane, seuil 3 ou 5), `poids_unitaire(food, unit)` ; **les corrections de rattachement** : `household_ingredient_resolution` (table, RLS et tests, aucun écran). | `0025`, `docs/prix.md` |
| V8 | **L'analyseur d'ingestion n'est pas encore en Python** (socle § 2 : porté « à l'étape 0.6 » avec ses cas de test) : `worker/src/{ingredient,aliment,etape,relecture}.ts` (≈ 1 660 lignes) lisent une ligne d'ingrédient, la rattachent à un aliment CIQUAL (3 185 lignes `food`), convertissent en grammes (`unit_conversion`, `density`, `unit_weight`) et estiment les durées (`default_duration`, 55 lignes). Ce plan **en porte la part dont il a besoin** (R1, R8) avec les cas de test existants comme référence. | ancien dépôt `worker/src` ; socle § 2 |
| V9 | **L'idempotence** est une classe de routeur (`RouteIdempotente`) : la réponse gardée tient en 64 Kio, un `409` est levé, jamais rendu ; les effets longs sont des travaux asynchrones dont le `POST` de création est court. **Une lecture de recette (75 s) sort de ce cadre** : elle est exemptée par écrit (`tests/unit/test_posts_idempotents.py`) et protégée par **l'identifiant du brouillon créé par le client** (même schéma que les repas de « Aujourd'hui »). | `security/idempotence.py` |
| V10 | **Le plan IA fige l'interface des appels au modèle** : `Modele.structure(...)`, nœuds et plafonds dans `llm-config.yaml`, `private.ia_reserve` / `ia_regle` appelées sous `popote_api`, `disponibilite_de_popote`, blocs typés validés par `public.ia_valide_le_bloc` (X2). La photo et le ticket attendent **son étape 0.6** (vision). | plan IA § Passerelle, § Quota unique, § Esquisse de 0.6 |
| V11 | **Le plan push fige la file** : `private.met_en_file_push(kind, person, dedupe_key, send_at, ttl_s, subscription)`, `DefinitionDePush` (le type `minuteur` est annoncé, `monde = None`, `heures_calmes = False`), `pg_cron` chaque minute qui n'appelle le conteneur que s'il y a une ligne échue. **Il n'existe aucune fonction d'annulation** : S9 l'ajoute (§ 5). | plan push § Contrat, N3a, « Recette » |
| V12 | **« Aujourd'hui » fige le fournisseur de la tuile** `private.etat_monde_cuisine(p_person, p_household, p_now, p_day, p_meal) returns jsonb`, avec **trois** états (`new_session`, `suggest`, `in_progress`) alors que la spec § 14 en demande **huit** : écart à relayer (§ 6). | plan API Aujourd'hui § Fournisseurs |

---

## Contrat

Toutes les routes sont sous `/api/v1`, **fermées par défaut** (session + `PersonneDuFoyer`), `Cache-Control: no-store`, champs en
anglais `snake_case`, UUID, jours `YYYY-MM-DD` (Paris), instants RFC 3339, durées en minutes entières, quantités en grammes,
centilitres ou pièces avec leur `unit`, argent en centimes. **Aucun texte rédigé** : codes et nombres. Les modèles d'entrée
refusent les champs inconnus. Toute écriture porte une clé d'opération (`Idempotency-Key` **et** un identifiant créé par le client
quand elle crée) et une version explicite (`If-Match` ou champ `version`) quand elle modifie.

### Voie R : recettes

| Route | Besoin | Réponses |
|---|---|---|
| `GET /recipes?q&filters&cursor&limit=10` | K4 | `{items:[{id, title, image_id, active_min, kcal, protein_g, freezable, missing_count \| null, provenance}], next_cursor}` ; `filters` ∈ `quick`, `protein`, `freezable`, `with_fridge`, `never_cooked`, `liked`, `mine` (cumulables, liste fermée) ; ordre total ; `ETag` |
| `GET /recipes/{id}?servings=n` | K4 | la fiche **à l'échelle** : ingrédients (quantité, unité, état, aliment reconnu), étapes (nature, durée, origine de la durée, appareil, température, `needs_check`), trois temps, valeurs par part **ou** `values_unknown: {reason, count}` ; `404` si autre foyer |
| `PUT /recipes/{id}/preference` | K4 | `{kind: "like" \| "never" \| null}` (`If-Match`) |
| `DELETE /recipes/{id}` | K4 | seulement une recette du foyer jamais cuisinée (`409 recette_deja_cuisinee`) |
| `POST /recipe-readings` | K5 | `201 {draft_id}` (lecture d'un texte, d'un lien, d'une dictée ou de 1 à 3 photos, **multipart ou JSON**, délai 75 s) ; `422 lecture_illisible`, `422 lien_refuse`, `429 quota_cuisiner_epuise`, `429 limite_assistant`, `503 assistant_indisponible` |
| `GET /recipe-drafts/{id}` | K5/K6 | le brouillon : titre, parts (`servings`, `servings_origin`), lignes avec état, étapes, valeurs, **`questions`** (liste ordonnée, § R9), `needs_check`, `multiple: [..]`, `version`, `ETag` |
| `PATCH /recipe-drafts/{id}` | K6 | JSON Merge Patch, `If-Match` ; recalcule les valeurs ; `412` périmé |
| `POST /recipe-drafts/{id}/answers` | K5 | répond à **la** question en tête : `{question_id, answer}` (une à la fois, dans l'ordre de l'API) |
| `GET /food-references?q&limit` | K6 | recherche d'un aliment (CIQUAL et « nos aliments »), texte intégral, accents ignorés |
| `POST /recipe-drafts/{id}/keeps` | K6 | `201 {recipe_id}` ; `409 brouillon_incomplet` ; `409 etape_a_verifier` (recette inventée) ; rejouable |
| `POST /recipes/{id}/corrections` | K6 | ouvre un brouillon d'une recette existante (la version du foyer d'une recette du catalogue) |
| `POST /recipe-inventions` | K7 | `201 {draft_id}` : `{id, scope: fridge\|plus3\|free, wish}` ; `POST /recipe-drafts/{id}/adjustments` ajuste par une phrase ; `409 invention_non_tenue {why}` |

### Voie S : session, plan, cuisine

| Route | Besoin | Réponses |
|---|---|---|
| `GET /cooking/state` | K1 | `{sessions:[…], bubble:{situation, …}, tile:{state, …}, ringing:[…], quotas:{reads, inventions, tickets, resets_on}, allergies_known}` ; `ETag`, `304` |
| `POST /cooking-sessions` | K2 | `201 {id, …}` ; corps `{id, target_servings, day?}` ; `409 session_au_menu_existe {id}` seulement si `reuse = false` n'est pas dit |
| `GET /cooking-sessions/{id}` · `PATCH` (`If-Match`) | K2 | cible, jour ; `POST …/recipes` · `PATCH …/recipes/{rid}` · `DELETE …/recipes/{rid}` ; `POST …/cancellations` |
| `POST /cooking-sessions/{id}/menu-proposals` | K3 | `{mode: propose \| another \| change \| complete, card?, phrase?, filters?}` → `{menu:[{recipe_id, servings, reason:{code, n?}}], summary:{servings, minutes_two, estimate_cents\|null}, understood?:{filters}}` ; `POST …/menu-confirmations` |
| `PUT /cooking-sessions/{id}/crew` | K9 | cuisiniers (membres ou prénom) et appareils (places) ; `POST …/plans` → `202` + `Location` ; `GET …/plans/current` ; `GET …/plan-jobs/{job_id}` |
| `POST /cooking-sessions/{id}/starts` | K10 | une fois ; `409 autre_session_en_cuisine {id}` |
| `GET /cooking-sessions/{id}/kitchen` | K11 | l'état pour **un cuisinier** (carte, cartes d'avance, avancement, fin prévue, autres, minuteurs, `server_now`, `sync_token`) ; `ETag`, `304` |
| `POST …/gestures` | K11 | `{key, kind: done\|out\|plus5\|skip\|pause, target_id, sync_token?, elapsed_ms?}` : **les cinq gestes**, rejouables |
| `POST …/steps/{sid}/claims` | K11 | prendre l'étape de l'autre ; `409 etape_deja_prise {by:"other"}` |
| `POST …/problems` | K11 | `{kind: missing_ingredient \| failed \| …}` |
| `POST …/cooks/{cid}/departures` · `…/arrivals` · `POST …/appliance-outages` | K11 | recalcul ; `POST …/timers` (à la demande) |
| `POST …/resumptions` · `…/stops` · `…/forced-finishes` | K12 | reprise, arrêt (recette par recette), terminer quand même |

### Voie C : courses, dresser, ranger, coût

| Route | Besoin | Réponses |
|---|---|---|
| `GET /shopping-list` | K8 | `{aisles:[{aisle, lines:[…]}], at_home:[…], counts, estimate_cents\|null, checked_by:{…}, last_aisle_of_other, version}` ; `ETag`, `304` |
| `PUT /shopping-lines/{line_key}/taken` | K8 | cocher : `{taken:{amount, unit}, version}` ; `DELETE …/taken` décocher ; `409 ligne_changee {list}` (« Léa vient de la changer ») |
| `POST /shopping-lines` · `DELETE /shopping-lines/{line_key}` · `PUT …/recurring` | K8 | ajouter à la main, retirer, « le remettre à chaque fois » |
| `POST /shopping-lines/{line_key}/not-found` · `POST …/at-home-outs` | K8 | « Pas trouvé » (trois choix), « Je n'en ai plus » |
| `POST /cooking-sessions/{id}/shopping-completions` | K8 | « J'ai tout » : `{mode: have_them \| keep_them}` |
| `GET /cooking-sessions/{id}/dressing` · `PUT …/dressing` (`If-Match`) · `POST …/dressing/weighings` | K13 | partage, nombre, poids, valeurs, complément, diagnostic |
| `POST /cooking-sessions/{id}/storages` | K14 | **« Tout ranger »**, une écriture, `{key, dressing_version, cooked_on, placements, pantry_corrections}` ; `409 dressage_change {dressing}` |
| `GET …/cost-candidates` · `POST …/cost-links` · `POST /receipt-readings` · `POST /receipts` | K15 | coût réel |

### Codes d'erreur nouveaux (`https://notre-popote.fr/problemes/<code>`)

`quota_cuisiner_epuise` (429, `kind`, `resets_on`), `lecture_illisible` (422), `lien_refuse` (422), `photos_trop_nombreuses` (422),
`brouillon_incomplet` (409), `etape_a_verifier` (409), `invention_non_tenue` (409), `recette_deja_cuisinee` (409),
`session_introuvable` (404), `session_etat_incompatible` (409, `state`), `autre_session_en_cuisine` (409), `plan_trop_gros` (422,
`max_steps`), `appareil_trop_petit` (422, `appliance`, `needed`, `places`), `dependance_en_boucle` (422, `recipe_id`, `steps`),
`aucun_plan` (200 avec `plan: null`, jamais une erreur), `plan_en_cours_de_calcul` (409), `plan_perime` (409),
`etape_deja_prise` (409), `etape_non_passable` (409), `annulation_impossible` (409), `geste_d_un_autre_compte` (403),
`geste_hors_bornes` (422), `jeton_de_synchro_invalide` (422), `ligne_changee` (409), `dressage_change` (409),
`poids_hors_bornes` (422, avec `confirm_required`), `rangement_refuse` (409). Réutilisés : `aucun_foyer`, `requete_en_cours`,
`cle_idempotence_*`, `donnees_invalides`, `limite_assistant`, `assistant_indisponible`, `trop_de_requetes`. **Les `409` portent
l'état à jour** en extension (`session`, `kitchen`, `list`, `dressing`) : l'écran le fusionne sans relecture.

---

## Les données, table par table

Colonne « expansion » : tout ce qui est **neuf** (table) ou **nul / à défaut** (colonne). Aucune contrainte nouvelle sur une
table existante qui puisse refuser une écriture de l'ancienne appli. RLS : **foyer** pour tout ce qui est partagé par les deux
membres (`current_household()`), **personne** pour ce qui ne regarde que l'un (`user_profile_id = auth.uid()`). Les tables neuves
ne donnent à `authenticated` que `select` ; **tout s'écrit par des fonctions `security definer`** (`set search_path = public,
pg_temp`, `auth.uid()` et `current_household()` explicites, jamais `current_user`).

| Table | Voie, migration | Lue par | Écrite par | Portée, données personnelles |
|---|---|---|---|---|
| `recipe`, `recipe_ingredient`, `recipe_step`, `recipe_nutrition` | R | K4, K5, K9 | `public.cuisiner_garde_une_recette` (garder), `cuisiner_corrige_une_recette` | catalogue (classe B) ou foyer (C). **Colonnes neuves** : `recipe_ingredient.state`, `.container_g`, `recipe_step.scale_rule`, `.chained`, `.needs_check`, `.time_origin`, `recipe.servings_origin` (M-R1) |
| **`recipe_preference`** | R, M-R1 | K4 | `public.cuisiner_prefere_une_recette` | foyer ; « On aime » et « Plus jamais » sont des goûts du foyer, pas une donnée de santé |
| **`household_container_weight`** | R, M-R1 | K5, K6, K8 | `public.cuisiner_apprend_un_contenant` | foyer ; « un pot de crème = 125 g », **par aliment** |
| `household_unit_weight`, `household_ingredient_resolution` | R | K5 | fonctions d'apprentissage (R11) | foyer ; existantes |
| **`cook_quota`** | R, M-R1 | K1, K5, K7, K15 | `private.cuisiner_prend_un_quota`, `…_rend_un_quota` | foyer × mois × `kind` ; un compteur de **vue** (le plafond du jour reste `ia_reserve`) |
| **`recipe_draft`** (une ligne, contenu `jsonb`), **`receipt_draft`** | R, M-R2 ; C, M-C3 | K5, K6 | `public.cuisiner_*_brouillon` | **personne** (celle qui a lu) ; expire 7 jours ; effacé avec le profil (`on delete cascade`) ; le texte source n'est **jamais** gardé, seulement la structure lue |
| **`cook_session`** | S, M-S1 | K1, K2… | `public.cuisiner_*` (S5) | foyer ; index unique partiel `cook_session_une_active (household_id) where state in ('cooking','paused','to_store')` |
| **`cook_session_recipe`**, **`cook_session_cook`**, **`cook_session_appliance`** | S, M-S1 | K2, K9 | idem | foyer ; un cuisinier sans compte = un prénom (donnée personnelle du foyer : effacé avec la session, jamais envoyé au modèle) |
| **`cook_plan`**, **`cook_plan_step`**, **`cook_job`** | S, M-S2 | K9, K11 | `private.cuisiner_pose_le_plan`, la tâche de calcul | foyer ; `cook_job` : bail, jamais de donnée de recette en clair dans l'erreur |
| **`cook_step_state`**, **`cook_timer`**, **`cook_gesture`**, **`cook_duration_sample`** | S, M-S3 | K11, K16 | `public.cuisiner_*` (S8 à S12) | foyer ; `cook_gesture` : clé unique par session, **personne d'origine** |
| **`shopping_line`**, `cook_need_override`, `cook_substitution` | C, M-C1 | K8 | `public.cuisiner_*` (C2 à C5) | foyer ; `checked_by` = personne (ce que l'autre voit : initiale et rayon) |
| `stock_item` | C | K8, K14 | cocher, décocher, débit de la session | foyer ; **colonne neuve** `shopping_line_id` (nulle) |
| **`cook_dressing`**, **`cook_dressing_recipe`** | C, M-C2 | K13, K14 | `public.cuisiner_*` (C6) | foyer ; version ; **les objectifs ne sont jamais lus par une route** : seule la fonction de calcul les lit, sous `security definer`, et ne rend que des grammes |
| `portion`, `portion_event` | C | « Aujourd'hui », « Semaine et Frigo » | `public.cuisiner_range_la_session` (C7) | foyer ; **colonne neuve** `cook_session_id` (nulle) |
| **`cook_cost_link`** | C, M-C3 | K15 | `public.cuisiner_rattache_une_operation` | foyer ; `operation_id` **unique** : une opération n'a qu'une session |
| `receipt`, `receipt_line`, `household_price` | C | K15, K8 (estimation) | `public.cuisiner_enregistre_un_ticket` | foyer ; libellés, quantités, prix : **jamais** un numéro de carte ni de fidélité (retiré avant toute écriture) |
| `push_outbox` | S (lecture de son plan) | — | `private.cuisiner_annule_les_pushs` (S9) | **aucune colonne de contenu** ; texte constant « Un minuteur a sonné. » |

**Données personnelles (`protecting-personal-data`).** Nouvelles données du foyer, sans catégorie particulière : recettes,
sessions, listes, dressage (poids de barquette : pas une donnée de santé ; **les objectifs** nutritionnels, eux, restent dans
`nutrition_target` et n'en sortent pas), prix. Un prénom de cuisinier sans compte est une donnée du foyer. À inscrire au
registre des traitements et dans `private.export_de_la_personne` et `private.sort_du_foyer` (plan 0.4ter F3) : **C10** ajoute
les tables à ces deux fonctions et au garde-fou d'introspection `tables_de_foyer()`. Conservation : brouillon 7 jours ; session
rangée ou annulée 2 ans (puis purge `pg_cron`, par lots, journal des comptes seuls) ; `cook_gesture` et `cook_timer` 90 jours ;
`cook_job` 7 jours ; texte lu d'une page ou d'un ticket : **jamais gardé** ; photo : **jamais écrite** (D8). Les journaux n'ont ni
titre de recette, ni libellé, ni montant, ni prénom (socle § 3.11) ; un test de journalisation le vérifie par route.

---

## Modèle de menaces (risque : **élevé** — fournisseur de modèle, lecture d'adresses fournies par une personne, photos, argent)

| Menace | Parade | Preuve |
|---|---|---|
| **SSRF** par le lien d'une recette (API7) : nom qui se résout vers une adresse privée, redirection vers `169.254.169.254`, IPv6 qui enveloppe une IPv4, IP décimale, octale ou hexadécimale, `100.64/10`, port non standard, **rebinding DNS** entre la vérification et la connexion | `infra/lecture_de_lien.py` (R5) : résolution unique par le code, **chaque A/AAAA vérifiée**, connexion à l'IP vérifiée (épinglée, `Host` et SNI du nom), 3 redirections revérifiées, `https` et 443 seulement, aucun cookie, 2 Mo **après décompression** (flux borné), 10 s en tout, `robots.txt` et image de la page aux mêmes règles, `text/html` seulement | R5 : table de 40 adresses hostiles, serveur local qui change de réponse entre deux résolutions, bombe de décompression, redirection en chaîne |
| **Injection par une page, une photo, une dictée, un ticket** (« ignore tes règles ») | contenu délimité en **donnée**, jamais dans la consigne ; le modèle ne rend qu'une **structure** ; le serveur reconnaît les aliments, convertit, calcule, estime ; aucun outil, aucun effet : le modèle ne peut ni écrire ni lire autre chose (critère 6, 34, 51) | R7, R8 : jeu d'injections (texte, EXIF, texte dans une image simulée), `ModeleSimule` qui obéit : rien ne change |
| **Fuite d'une photo** (visage, carte bancaire, lieu) | lecture par flux en mémoire, plafond avant décodage (8 Mo, 3 photos), EXIF/ICC/XMP retirés **avant** l'envoi, ré-encodage JPEG, jamais écrite ; envoyée en base64 au fournisseur (États-Unis, `inference_geo: "us"`, dit à l'écran) ; **filtre des numéros de carte et de fidélité sur la sortie** avant toute écriture | R6, C8 : seau compté avant/après (y compris échec), image avec EXIF-GPS, ticket simulé avec un numéro de carte |
| **Coût incontrôlé** (API10, LLM10) | `cook_quota` (vue mensuelle) **puis** `ia_reserve` (compteur unique, plafond du jour) **avant** chaque appel ; rendu en cas d'échec ; `entree_max` par nœud ; 2 reprises au plus | R7 : 50 lectures simultanées pour un quota de 40 : exactement 40 acceptées |
| **Deux téléphones, une étape** | une étape n'a qu'un cuisinier : `select … for update` de la session puis des étapes (par identifiant), claim atomique ; `409 etape_deja_prise` | S8 : deux connexions, mille tirages |
| **Rejeu d'un geste hors ligne sous un autre compte** ou avec un instant forgé | clé unique par session, **personne d'origine** comparée, `sync_token` signé (HMAC, clé d'environnement), bornes d'instant | S10 : jeton falsifié, instant futur, geste de Sam rejoué par Léa |
| **Lire la liste ou la cuisine d'un autre foyer** (API1) | tout par `current_household()` ; `404` sinon ; matrice d'autorisation par route (mon foyer, un autre foyer, sans session, l'autre membre) | `tests/authz/test_matrice.py` |
| **Lire les objectifs de l'autre** par le dressage | les routes ne rendent que des grammes ; la fonction de calcul lit `nutrition_target_courante` sous `security definer` et rend une **liste de poids** ; test : la réponse ne contient aucun de ses nombres (kcal visés, pourcentage) | C6 |
| **Faux positif d'allergie** (D7) | `allergies_connues = false` tant que le propriétaire n'a pas tranché : **aucun filtre silencieux**, l'écran le dit ; avec des allergies (test double), tout aliment non vérifiable d'un allergène enregistré est refusé | R10, S6, C4 |
| **Notification qui trahit** | texte constant, aucune colonne de contenu dans `push_outbox`, aucun plat, aucun montant | S9 : grep du registre |
| **Marteau-pilon du réveil** (`pg_cron` ↔ conteneur) | n'appelle `/internal/cooking/jobs/resume` que s'il existe un travail échu ; signature HMAC ; pas de chevauchement | S7 |
| **Course sur le plafond de photos / quota** | décompte atomique en base avant l'appel | R7 |

STRIDE complet et LLM (OWASP LLM 2025 : LLM01, 02, 05, 06, 10 ; ASI01, 02, 06) : **le modèle de ce monde n'a aucun outil**. Il
lit un texte ou une image et rend une structure fermée, validée par Pydantic **et** par les règles du serveur (§ R8, § 8.6 de la
spec) ; ce qu'il rend n'est jamais exécuté, jamais interprété comme une consigne, jamais un droit. **Humain dans la boucle** :
rien n'est gardé sans le récapitulatif validé (`POST …/keeps`) ; un menu proposé sans « Ça me va » n'écrit rien.

---

## Interfaces communes

### § 5. Rappels (push) et minuteurs

Types ajoutés au registre du plan push (**une PR de moins de 150 lignes**, recette du plan push) : `cook_timer_rang`
(texte « Un minuteur a sonné. », chemin `/cuisiner`, `ttl_s = 3600`, `monde = None`, `heures_calmes = False`, `une_par_jour = False`),
`cook_timer_forgotten` (« Un minuteur attend toujours. », 10 min après), `cook_started` (« La session commence. », à l'autre
cuisinier **avec compte** coché), `cook_to_store` (« La session attend d'être rangée. », 1 h après « C'est cuit ! »). **Aucun ne
nomme un plat, aucun ne porte un montant** (critère 23).

- **Mise en file** : dans la transaction de l'effet, `private.cuisiner_met_en_file_le_minuteur(p_timer uuid)` appelle
  `private.met_en_file_push('cook_timer_rang', <personne>, 'timer:<timer_id>:<génération>', ends_at, 3600)` **pour chaque
  cuisinier ayant un compte** (jamais un prénom sans compte). La clé de dédoublonnage porte la **génération** : « + 5 min » ouvre
  la génération suivante, donc une nouvelle ligne.
- **Annulation** (interface **demandée au plan push**, écrite ici : S9) : `private.cuisiner_annule_les_pushs(p_timer uuid, p_generation int)`
  passe à `dropped` les lignes `queued` dont la clé est `timer:<id>:<génération>` ; une ligne déjà `sending` ou `sent` n'est pas
  rattrapée (« annulation tardive » : le texte reste inoffensif ; test et fiche). Appelée par « + 5 min », « Annuler », « Sorti ».
- **Latence écrite** : `pg_cron` chaque minute + réveil du conteneur (5 à 7 s) + envoi : **au plus ≈ 70 s après l'heure du
  minuteur** ; mesurée en S14 et écrite dans `docs/preuves-0.2.md`. L'écran d'alarme, lui, sonne à l'heure (spec § 11.3).
- **Hors de ce plan** : l'écran visé, le service worker, l'affichage ou non quand l'appli est ouverte (plan push N10).

### § 6. Tuile Cuisiner de l'accueil (« Aujourd'hui » P1)

`private.etat_monde_cuisine(p_person, p_household, p_now, p_day, p_meal) returns jsonb` est **remplacée** par S5 (`create or
replace`, même signature). **Écart à relayer au plan « Aujourd'hui » avant que son code ne fusionne** : son union `worlds.kitchen`
(`new_session | suggest | in_progress`) doit devenir l'union de la spec § 14, **posée en entier dès maintenant** (comme le Budget : ajouter
une valeur d'énumération ensuite est signalé par `oasdiff`) :

```json
{ "state": "ringing" }
{ "state": "cooking", "done": 7, "total": 31 }
{ "state": "to_store", "portions": 10, "since_minutes": 75 }
{ "state": "paused", "since": "2026-11-15T10:40:00+00:00" }
{ "state": "ready" }
{ "state": "shopping", "to_buy": 12 }
{ "state": "menu", "servings": 4, "target": 10 }
{ "state": "new_session", "highlight": false, "suggested_day": "2026-11-15" }
```

Priorité 1 à 8 de la spec § 5 ; `highlight` n'existe que sur `new_session` (règle de mise en avant d'« Aujourd'hui » : rien de
prévu cette semaine, inchangée). Si le code d'« Aujourd'hui » a déjà fusionné les trois états : **rupture admise** écrite dans
`docs/ruptures-admises/<date>-tuile-cuisiner.txt` (mécanisme existant), une seule fois. Les deux « choses à faire » (§ 14 : à
ranger depuis plus d'une heure ; en pause depuis plus de 24 h) sont fournies par `private.cuisiner_choses_a_faire(p_person, p_now)`,
que `private.chose_a_faire` d'« Aujourd'hui » appelle **après** ses deux priorités (écart à relayer aussi).

### § 7. Une part (« Aujourd'hui », « Semaine et Frigo », ce monde)

**Une seule définition : une ligne `portion`** (V6). Ce monde ne crée une part que par `public.cuisiner_range_la_session`, avec
`source = 'session'`, `cycle_id = null`, `cook_session_id`, `recipe_id`, `label` = titre de la recette (copie), `for_user_id`,
`grams`, `kcal`, `protein_g`, `fiber_g`, `carb_g`, `fat_g` **figés** au dressage, `kcal_margin`/`protein_g_margin`, `cost_eur`
nul, `location`, `prepared_at` = jour de cuisson, `frozen_at` (obligatoire si et seulement si congélateur). `expires_at` vient
de `tg_portion_peremption` (frigo 4 j, congélateur 90 j) : **ce monde ne le recalcule pas** ; « à manger avant » = jour de cuisson
+ 4 jours (le dernier repas est la veille au soir : l'écran retranche un jour, § 12.2 de la spec). **Attendu du plan « Semaine et
Frigo »** (branche `docs/plan-api-semaine-frigo`, vide à la date de ce plan) : (a) lire `portion` sans filtrer sur `cycle_id` ;
(b) ne pas réinterpréter `cook_session_id` ; (c) « Oui, place-les » appelle **son** geste de placement sur les `portion_ids` que
`POST …/storages` rend ; (d) les seuils du frigo restent dans `private.seuils_du_frigo()` (« Aujourd'hui » A5) et le jour de
garde de 4 jours dans le déclencheur existant : ce plan n'en copie aucun.

### § 8. Budget (B7, B14), sans le planifier

Ce plan **possède** : la table `cook_cost_link(session_id, operation_id unique, linked_by, linked_at, amount_cents)` et
les routes `…/cost-candidates` et `…/cost-links`. Il **attend du plan Budget** (branche `docs/plan-api-budget`, vide à la date
de ce plan) deux fonctions en lecture seule, signatures figées ici : `private.operations_de_courses_candidates(p_household uuid,
p_since timestamptz, p_limit int) returns table(operation_id uuid, day date, merchant_code text, amount_cents int)` (opérations
**rangées « Courses »**, **pas déjà rattachées** : le filtre `not exists cook_cost_link` est écrit par le Budget, qui lit notre
table en lecture) et `private.operation_de_courses_existe(p_household uuid, p_operation uuid) returns boolean`. Le **poste « Courses »
du Budget reste le sien** : ce monde le cite, ne l'écrit jamais. Le montant n'est jamais mis dans une notification, jamais passé
à Popote ni dit à voix haute (la réponse porte `speakable: false` sur tout champ d'argent, que le plan IA lit pour sa synthèse).
Tant que le Budget n'est pas livré, `cost-candidates` rend `{items: []}` et l'écran ne pose pas la question.

### § 9. Popote dans ce monde (K17), l'interface seulement

Même modèle que **X2** : un bloc validé par **l'identifiant du bloc** appelle la fonction d'écriture de ce plan avec `p_entry = id du
bloc` ; un bloc validé deux fois n'agit qu'une fois (identifiant client). Trois genres de bloc (ajoutés au registre du plan IA par
le plan IA, **pas ici**) et la fonction qu'ils appellent : `recipe` → `public.cuisiner_retient_une_recette(p_op, p_session, p_recipe,
p_servings)` (S5) ; `item` → `public.cuisiner_ajoute_un_article(p_op, p_label, p_quantity)` (C4) ; `menu` →
`public.cuisiner_valide_un_menu(p_op, p_session, p_menu_hash)` (S6). **Lectures** : `public.ia_lit_recette`, `ia_lit_quantite`,
`ia_lit_minuteur`, `ia_lit_session` (enveloppes `security invoker` sur les fonctions de lecture de ce plan, **sans prénom ni
objectif**, titres et textes de recette rendus comme **données délimitées**). Les statuts rendus (`ok`, `replay`,
`already_done`, `recette_deja_retenue`, `session_etat_incompatible`) sont traduits par `ia_valide_le_bloc` comme ceux de X2. Rien de
plus à écrire ici que ces cinq fonctions et leur test de signature.

---

## Ordre des tâches et dépendances

| Voie | Tâches | Migrations | Dépend de |
|---|---|---|---|
| Pur (sans base), en parallèle | **R1** quantités et valeurs · **S1** modèle du plan · **S2** générateur · **C1** oracle de la liste (tests) · **C5** dressage (pur) | — | rien |
| Recettes | **R2** (M-R1) · R3 · R4 · **R5** lien · **R6** photo · R7 IA et quotas · R8 lecture · R9 brouillon (M-R2) · R10 inventer · R11 apprendre · R12 preuves | M-R1, M-R2 | R2 ← R1 ; R7 ← plan IA I3a, I4a ; R6 photo et C8 ticket ← plan IA 0.6 |
| Session | S3 recherche · **S4** (M-S1) · S5 · S6 menu · S7 plan et travail (M-S2) · S8 à S12 cuisine (M-S3) · S13 recalcul · S14 preuves | M-S1, M-S2, M-S3 | S4 ← R2 ; S6 ← R3 ; S9 ← plan push N3b ; S5 ← « Aujourd'hui » A5 |
| Courses | **C2** (M-C1) · C3 · C4 · C6 (M-C2) · C7 · C8 (M-C3) · C9 · **C10** départ et export | M-C1, M-C2, M-C3 | C2 ← S4 (`cook_need_override` référence `cook_session`) ; C7 ← S4 + C6 ; C8 ← Budget (interface) |
| Clôture | **R12 + S14 + C10** : scénario complet, charge, preuves | — | toutes |

**Migrations** (expansion seule, numéro = le prochain libre **au moment du code** : 0.4bis 0148-0157, 0.4ter 0158-0165, push
0166+, IA 0166-0174 se partagent déjà la plage : prendre le suivant) : **M-R1** (R2) recettes, préférences, contenants, quotas ·
**M-R2** (R9) brouillons · **M-S1** (S4) session, recettes, cuisiniers, appareils · **M-S2** (S7) plan, travaux · **M-S3** (S8) étapes,
minuteurs, gestes, mesures · **M-C1** (C2) lignes et besoins, `stock_item.shopping_line_id` · **M-C2** (C6) dressage ·
**M-C3** (C8) coût. Une coupe ne coupe jamais une migration (une tâche coupée a une migration par coupe).

## Règles d'exécution (valables pour chaque tâche)

- Charger avant de coder : `sp-test-driven-development`, `designing-http-apis`, `managing-data-and-migrations`, `securing-code`,
  `protecting-personal-data`, `building-llm-features` (voie R et C8), `handling-errors`, `writing-tests`,
  `optimizing-performance-and-cost` (S3, S7, S14), `writing-commits`, `opening-pull-requests`.
- Une tâche, une PR de **400 lignes au plus** (coupes écrites), TDD (test rouge d'abord, avec son résultat attendu), commit en
  français `<type>(<portée>): <sujet>`, corps « Why: / What: », `Refs: #<issue>` (aucune ligne de co-auteur).
- Contrôles avant chaque commit : `uv run ruff format --check && uv run ruff check && uv run mypy && uv run pytest -q -m "not
  integration"` ; `uv run pytest -q -m integration` si la tâche touche la base ; `npm test` pour `tests/db` ; `uv run python
  scripts/exporte_contrat.py` après toute route ; `uv run python ops/aligne_droits.py` après toute migration.
- **Migrations** : retour arrière en commentaire en tête, `set local lock_timeout = '3s'` et `statement_timeout`, `grant` et
  `revoke` explicites par objet et par rôle ; **lectures en `security invoker`**, **écritures en `security definer`** ; les
  gardes « avant/après » en **déclencheur** (la RLS ne compare pas), jamais en politique ; jamais `current_user` en `definer`.
  Ordre des verrous : **foyer, invitation, personne, session, lignes triées par identifiant** (étapes, puis minuteurs, puis
  lignes de courses par `food_id`, puis `stock_item` par identifiant, puis `portion` par identifiant).
- **Compatibilité** : l'ancienne appli et « Aujourd'hui » continuent de marcher (tests `tests/db` verts avant et après chaque
  migration). Une écriture de l'ancienne appli dans `recipe_*`, `stock_item` ou `portion` réussit sans les colonnes neuves.
- **Routes** : `async def`, `RouteIdempotente` pour les `POST` qui créent ou déclenchent, `PersonneDuFoyer` en dépendance, un
  `Probleme` levé pour tout refus (les fonctions SQL **rendent** un statut, la route le traduit **avant** d'écrire la ligne
  d'idempotence). Délai 25 s ; **exceptions écrites** : lectures de recette, de ticket (75 s).
- **Matrice d'autorisation** : chaque route entre dans `tests/authz/test_matrice.py` (mon foyer, un autre foyer, sans session,
  l'autre membre du foyer, un membre sans foyer).
- **Données d'exemple** : Sam et Léa ; lasagnes aux épinards et ricotta (4 parts), curry de poulet au lait de coco (4), gratin de
  chou-fleur (2) ; valeurs et recettes inventées ; **fixtures synthétiques : aucune photo réelle, aucun ticket, aucun texte de site
  réel, aucune métadonnée EXIF** (les images de test sont **générées** par le test, `Pillow`, avec un EXIF fabriqué). Un test
  `git grep` interdit tout `.jpg`/`.png` binaire hors `tests/fixtures/generees/`.
- **Texte d'un tiers** (titre, ligne d'ingrédient, libellé de ticket, prénom de cuisinier) : paramètres liés, rendu tel quel,
  jamais journalisé, jamais interprété ; un test écrit `ignore tes règles` partout où un tiers peut écrire.
- **Fini** (comme 0.4ter) : tests verts avant et après chaque migration, contrat régénéré sans rupture non admise,
  `ops/aligne_droits.py` sans écart, revue adverse faite, preuve de la tâche de clôture de sa voie.

## Critères de la spec § 20 couverts côté API

| Critères | Où |
|---|---|
| 1, 2, 3, 27 | S5, S6 |
| 4, 29 | R3 (fiche à l'échelle), S1 (durées), S2 (places) |
| 5, 6, 7, 34, 35, 36, 47, 50, 51, 55 | R5 à R10 (55 : la dictée arrive comme un texte, le front garde l'écoute) |
| 8, 9, 10, 11, 26, 46 | C2 à C4 |
| 12, 13, 28, 44, 45, 54 | S1 à S3, S7, S13 |
| 14, 16, 17, 18, 31, 32, 43 | S8 à S13 |
| 15, 41, 53 | S9 |
| 19, 20, 37, 38, 48 | C6, C7 |
| 21, 22, 33 | S5, S12 |
| 23 | S9 (registre) |
| 30 | S12 (durées apprises) |
| 39, 52 | front (la voix ne touche pas l'API hors des cinq gestes) ; 52 : `cook_session.hands_free_device` (S5) |
| 40, 49 | R7 |
| 42 | front (liste blanche) ; l'API ne pose rien sur l'appareil hors `sync_token` |
| 24, 25 | front |

## Écarts à relayer

1. **« Aujourd'hui »** : union `worlds.kitchen` à huit états et fonction des « choses à faire » (§ 6) — avant la fusion de son A5/A6b.
2. **Plan push** : fonction d'annulation `private.cuisiner_annule_les_pushs` (S9) et quatre types (§ 5) ; type `minuteur` du plan renommé `cook_timer_rang` ici (le plan push l'appelle `minuteur`, provisoire).
3. **Plan IA** : nœuds `cuisiner_lire`, `cuisiner_inventer`, `cuisiner_filtres`, `cuisiner_ticket` à inscrire dans `llm-config.yaml` (R7) ; vision (photo, ticket) = son 0.6 ; blocs `recipe`, `item`, `menu` (§ 9) ; **allergies** (Question 1).
4. **Socle** : `limites.py` gagne une exception de chemin (75 s) pour `…/recipe-readings` et `…/receipt-readings` ; l'analyseur d'ingestion n'est porté qu'en partie (V8) ; la politique « rien dans le navigateur » est amendée par K-C14 (déjà acceptée) : l'API ne pose rien sur l'appareil.
5. **Spec Cuisiner** : § 12.2 « à manger avant » = cuisson + 4 jours **moins un jour** pour le dernier repas : l'API rend `expires_at` brut, l'écran dit « avant jeudi » ; à relire côté écran.

## Questions (trois au plus)

1. **Allergies** (au propriétaire) : veux-tu qu'on **enregistre** les allergies du foyer (consentement explicite, donnée de santé), ou que Popote ne filtre rien et le dise ? Le plan IA l'a laissé hors de lui ; sans réponse, ce plan livre le filtre complet mais **éteint**.
2. **Taille permise d'un plan** (au propriétaire, à relayer après la mesure de S3) : si 8 recettes de 40 étapes ne se calculent pas en 30 s sur le conteneur, acceptes-tu une limite plus basse (par exemple 5 recettes) avec le texte « Il y a trop de recettes pour un seul plan » ?
3. **Bascule** (à la session socle) : la fiche de bascule exige-t-elle « aucun cycle en cuisine au jour J » (D5), ou fait-on migrer les sessions au menu de l'ancienne appli ? Ce plan retient la première.
