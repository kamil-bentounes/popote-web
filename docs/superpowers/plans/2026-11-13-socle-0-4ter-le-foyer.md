# Socle 0.4ter : le foyer, le départ et les mails

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal :** ajouter à `popote-api`, par-dessus la connexion sans mot de passe de 0.4bis, ce que le parcours « Entrer
dans Popote » (spec du 13/11, § 9, besoins R1 à R8) demande côté API : lire le foyer et le rôle de chacun, quitter le
foyer (compte gardé 30 jours), retirer l'autre personne, transférer le foyer quand son responsable part, effacer
les comptes sans foyer au bout de 30 jours, laisser une personne dont le lien est mort en redemander un, télécharger
ses données ; plus les mails au style « Jeu » (HTML et texte).

**Architecture :** tout le plan s'appuie sur ce que 0.4bis fusionnera (sessions, verrou de personne, preuve récente,
invitations par mail, effacement `efface_mes_donnees` éclaté en deux corps privés) et sur ce que le dépôt contient
déjà (règles de départ du budget dans `efface_mes_donnees`, 0145). **Quatre choix structurent le plan, tous
vérifiés à la source (voir « Constats ») :** (1) une personne « sans foyer » **n'a plus de profil** : l'état existe
déjà dans le schéma et dans la RLS (`household_id` est `not null`, `current_household()` rend `null`) ; on ne
le rend pas nullable (171 politiques et 54 fonctions citent `current_household()`, 47 fonctions citent `user_profile`) ; (2) ce qu'elle garde 30 jours (son
prénom, la date d'effacement, **une copie de ses seules données** pour l'export) tient dans **une table neuve**,
`account_departure` ; (3) les effets d'un départ sur le budget **ne sont pas réécrits** : S14 (amendé) les range dans
`private.sort_du_foyer(personne)`, que supprimer son compte, quitter le foyer et retirer un membre appellent tous les
trois, avec un test qui prouve qu'ils laissent le foyer dans le même état ; (4) **tout mail qui compte passe par une file d'envoi persistante** écrite dans la
transaction de l'effet, livrée « au moins une fois » (F1b).

**Tech Stack :** celui de 0.4bis (Python 3.13, FastAPI, Pydantic v2, psycopg 3, Postgres Supabase, `pg_cron`,
`pg_net`, Scaleway TEM) ; **aucune dépendance ajoutée** (le HTML des mails se construit avec la bibliothèque standard,
`html.escape`).

**Hors périmètre :** les écrans (plan front d'« Entrer », E1 à E8) ; `GET /api/v1/welcome` (**R9 : étape 0.5**, elle
lit le frigo et la semaine, domaines que 0.5 branche ; d'ici là l'écran de bienvenue n'a que le bloc des
objectifs, sans route) ; le renommage du foyer, le changement d'e-mail ; un foyer de plus de deux personnes (les
tests de base en gardent à trois, la règle de deux places est posée dans les fonctions d'invitation, pas dans le
schéma) ; l'export des **données du foyer** (recettes, frigo, budget commun : chaque domaine de 0.5 l'ajoute à
l'export, garde-fou : `tables_de_foyer()`) ; la fermeture de la base (0.7) ; le pré-remplissage ou la récupération
des données d'un ancien foyer dans un nouveau (décision 11 du 13/11 : on repart de zéro).

---

## Constats vérifiés dans `popote-api` (état de `origin/main` au 13/11/2026, `253737d`, migrations jusqu'à 0147)

Chaque constat a sa preuve ; ceux qui touchent une base ont été relus sur la pile locale (Postgres `127.0.0.1:54322`,
migrations jusqu'à 0146).

| N° | Constat | Preuve |
|---|---|---|
| C1 | **Aucune colonne de rôle ni de créateur** : `household` n'a ni `created_by` ni propriétaire ; `user_profile` n'a que `id`, `household_id`, `display_name`, `created_at`, `password_set`, `entre_le`. Le créateur d'un foyer ne se lit qu'à `user_profile.created_at` (le plus ancien membre). | `supabase/migrations/0001_class_c.sql:6-17` ; `0009_create_household.sql` et `0091_le_createur_choisit_son_prenom.sql:17-39` (le premier profil d'un foyer est celui de `create_household`) |
| C2 | **Une personne sans foyer, c'est une personne sans profil.** `user_profile.household_id` est `not null` (0001:15, relu en base : `is_nullable = NO`) et le restera. `current_household()` rend `null` sans profil (0004:7-15) ; toutes les politiques cadrées sur le foyer ne rendent alors rien (`user_profile_select`, 0005:60-61 ; 171 politiques de `public` citent `current_household()`, relu en base). `GET /api/v1/me` sait déjà rendre « sans profil » : foyer et prénom absents, la ligne existe toujours. | 0004, 0005:42-66, `src/popote_api/api/moi.py:39-44` (`LIT_MOI`, jointures `left join`), `schemas/moi.py:13-20` (`household: … \| None`) |
| C3 | **Le test de base de l'« orphelin » existe mais ne couvre que 4 tables en lecture** (`household`, `user_profile`, `nutrition_target`, `invitation`) ; aucune écriture, 51 tables de foyer au total (`tables_de_foyer()`, relu en base). | `tests/db/isolation.test.ts:108-114`, `tests/db/helpers/db.ts:44` (`makeOrphan`), `docs/schema.md:137` |
| C4 | **La règle d'un départ existe déjà, en SQL, et c'est la même fonction que supprimer son compte** : `efface_mes_donnees()` (0145, redéfinie à partir de `delete_my_account` de 0112). Avec un membre qui reste : les charges dont la personne est la seule participante partent (`retire_charge(…, true)` : lignes ni confirmées ni réglées des mois ouverts et leurs saisies, la charge si elle n'a pas d'histoire, sinon elle s'archive) ; ses saisies seule-porteuse partent **dans tous les mois, clôturés compris**, le montant confirmé reste ; `cloture_choix.reste_cents` passe à `null` (le choix et `versement_id` restent : fait comptable, sans clé étrangère) ; ses comptes `perso` partent avant son profil ; le profil part (en cascade : `nutrition_target`, `revenu`, `charge_participant`, `meal_slot`, `rappel_*`, `aide_signalement`, `idempotency_key`) ; **`depense_part`, `cloture_choix` et `versement_epargne` n'ont aucune clé étrangère vers `user_profile` (relu en base) : leurs lignes, dont les parts des mois gelés et tous les versements d'épargne, restent au foyer avec l'identifiant de la personne** (fait comptable, règle du budget), après un départ, un retrait comme après « supprimer mon compte » (décision 11 du 13/11) ; les barquettes passent à « n'importe qui » (`portion.for_user_id` en `set null`) ; les mois ouverts se repartagent (`refige_pour`), les années ouvertes se recalent (`recale_la_charge`) ; **les mois clôturés gardent leur `reste_cents`**. Seule dans le foyer : factures, lignes et foyer disparaissent. Ce n'est **pas** écrit dans la spec du socle : c'est la règle du budget (spec du budget du 01/10, § 4.3 « Les comptes perso de qui part », § « Le départ du dernier membre », « Le détail part, le total reste »), tenue par `tests/db/budget-depart.test.ts` (3 `describe`, 10 cas). | `0145_efface_mes_donnees.sql:141-237` (foyer) et `:239-257` (compte : clés du journal, sessions, événement) ; `0112_budget_depart.sql:81-188` ; `0111_budget_retire.sql:16-87` (`retire_charge` lit `current_household()`, pas `auth.uid()`) ; `0016_portion.sql:31` ; `0097_budget_tables.sql:67-80` ; liste des clés étrangères vers `user_profile` relue en base |
| C5 | **Les corps de 0145 mêlent deux choses** : sortir du foyer (141-237) et effacer l'accès du compte (239-257 : `delete from login_session`, `ferme_les_sessions_auth`, événement `compte_supprime`, clés du journal). S14 (0.4bis) prévoit de les déplacer **ensemble** dans `private.efface_les_donnees_du_foyer()` : quitter le foyer ne peut pas les réutiliser tels quels (la personne perdrait ses sessions, alors qu'elle doit rester connectée pour voir « sans foyer » et télécharger ses données). D'où l'amendement A6. | `0145:239-257` ; plan 0.4bis S14 |
| C6 | **`idempotency_key.person_id` référence `user_profile(id)`**, pas `auth.users`. Pour une personne sans profil : (a) tout `POST` qui exige une `Idempotency-Key` (ajouter une clé d'accès, `/me/passkeys`) échouerait sur la clé étrangère ; (b) `POST /me/household-departure` écrirait sa ligne d'idempotence **après** avoir supprimé le profil, donc son propre départ s'annulerait. | `0135_idempotence.sql:42`, `src/popote_api/security/idempotence.py:216` (écriture de la ligne en fin de route, même transaction) ; `src/popote_api/api/moi.py:197-206` (`DELETE /me` est sans clé pour cette raison) |
| C7 | **`authenticated` a le droit `UPDATE` sur toute la table `user_profile`** et la politique `user_profile_update` ne cadre que la ligne (`id = auth.uid()`) : une colonne `role` ajoutée serait **modifiable par son titulaire** (« je me nomme responsable »). La comparaison des droits de l'essai (`ops/aligne_droits.py:140-153`) ne lit que les droits de table (`relacl`), pas ceux de colonne : un `revoke update (role)` ne serait pas surveillé. Donc : un déclencheur. | relu en base (`information_schema.table_privileges`, `column_privileges`) ; `0005_policies.sql:64-67` |
| C8 | **Tâches planifiées aujourd'hui** : `pg_cron` dans la base, planifié par des migrations tolérantes (si l'extension manque, avertissement) : purges nocturnes (`idempotence-purge` 03:17, `invite-link-purge` 03:29, `login-session-purge` 03:53, etc.) qui appellent une **fonction SQL** ; les rappels (`rappels-par-mail`, toutes les heures) appellent par `pg_net` une **Edge Function** avec un secret du coffre (`vault`). **Aucune route `/internal/*` réelle n'existe encore** (le routeur et la signature HMAC existent, pas de route) ; la façon dont `pg_cron` la signerait est écrite, non essayée (« pas encore écrite : aucune route interne réelle n'existe », réserve sur le corps envoyé par `pg_net`). GitHub Actions ne fait que la sauvegarde, la restauration, le réveil de l'essai et la CI. | `0126_rappels.sql:557-582` et `:609-645` ; `0142_invitations_par_lien.sql:174-190` ; `src/popote_api/api/internes.py:98-104` ; `docs/exploitation.md:336-375` ; `.github/workflows/reveil-essai.yml` |
| C9 | **L'export des données n'existe pas côté API et n'est planifié qu'en 0.5.** `public.export_my_data()` existe en SQL pour l'appli actuelle (dernière définition 0127) ; elle exporte **tout le foyer** (dont les profils de l'autre membre) en lisant `current_household()` : pour une personne sans profil, elle rend un document vide. Le plan 0.4 classe la route en « route de 0.5, qui y ajoutera `login_session` et `security_event` ». L'écran « sans foyer » en dépend : **ce plan livre une route d'export limitée aux données personnelles (F10)**. | `0127_export_des_rappels.sql:13-91` ; plan 0.4, § Hors périmètre (« l'export des données (route de 0.5…) ») ; `docs/inventaire-surface.md:53` |
| C10 | **Aucun mécanisme de « quitter » dans l'appli actuelle** : l'aide intégrée le dit (« je n'ai pas trouvé d'écran pour … en quitter un sans supprimer son compte »). Et `create_household()` refuse une personne sans profil en production : la création de foyer y est **fermée** (`docs/dev.md:98` : `allow_household_creation = {"enabled": false}` depuis le 21/09/2026 ; `0070_un_seul_foyer.sql:28-42` la referme dès qu'un foyer existe ; la pile locale de test peut la montrer ouverte). Son `execute` reste à retirer à J+2 (0.7), sans urgence. | `docs/aide/foyer-creer.md:44` ; `0005_policies.sql:42-48` (le commentaire dit pourquoi la suppression du profil passe par une fonction) ; `docs/dev.md:98` ; `0070_un_seul_foyer.sql:28-42` |
| C11 | **Le CHECK de `invite_link` interdit de prolonger un lien** : `expires_at <= created_at + 7 jours` (contrainte `invite_link_check`, relue en base). Un « Renvoyer » qui rend vie à un lien échu (besoin R1/R8) exige de la relâcher (A4). Le `created_by` du lien passe à `null` quand le profil de l'hôte part. | `0142_invitations_par_lien.sql:44` (et `:36`, `:43` pour les clés étrangères en `set null`) |
| C12 | **Une erreur `40P01` (interblocage) devient `503 reessayer` + `Retry-After: 1`**, jamais `500`. L'ordre « foyer, puis personne » de 0.4bis est compromis par un détail de S6 : `session_valide` prend le verrou de personne (activité périmée de plus de 5 minutes) **avant** que la route prenne celui du foyer. A2 (0.4bis) tranche : l'activité de session s'écrit dans sa propre transaction courte, avant la route. | `src/popote_api/erreurs_base.py:9,64-65` ; plan 0.4bis S6 |

| C13 | **Le catalogue de recettes est lisible et modifiable par une personne sans profil** : `recipe_read` et `recipe_update` testent `owner_household_id IS NULL OR …` (politiques relues en base) ; `recipe` est l'une des 51 tables de `tables_de_foyer()`. Sans profil, `current_household()` est nul, mais les lignes du catalogue (`owner_household_id` nul) passent. La revue adverse a relevé que `tg_class_b_guard` ne bloque que `confidence >= 0.8`. | relu en base (`pg_policy`) ; revue adverse du plan |
| C14 | **Les fonctions `security definer` exécutables par `authenticated` sont appelables par PostgREST** (schéma `public` exposé jusqu'à la fermeture, 0.7 ; `supabase/config.toml:13`) : la preuve récente n'est appliquée qu'en Python, et une fonction qui rend une adresse la rendrait à n'importe quelle session GoTrue. Même limite que `delete_my_account` aujourd'hui. | `supabase/config.toml:13` ; spec du socle § 5.2 |
| C15 | **Un garde-fou de rôle de la base est en `security invoker`**, pas `definer` : en `definer`, `current_user` vaut le propriétaire et la garde ne refuse jamais. La convention du dépôt : `if current_user <> 'authenticated' then return null` (verrou) ou refus de `authenticated` et `anon`. | `0095_budget_verrou.sql:30-48` (commentaire et `tg_verrou_instruction`), `0099`, `0101` |

| C16 | **La demande de code de S5 est déjà fusionnée et teste le profil à la main** (`exists (… user_profile …)`, deux fois) : le plan ne peut pas dire « aucune fonction n'écrit `exists (… user_profile …)` » sans la redéfinir. | `0147_codes_de_connexion.sql:288` et `:300` ; A1 de 0.4bis |
| C17 | **`public.compte_pour_invitation(adresse text)` existe déjà** (colonnes `id`, `a_un_profil`) et sert l'appli en prod ; S13 la présentait comme un nom neuf. | `0089_le_lien_suffit.sql:57-69` ; `supabase/functions/accept-invite/index.ts:80`, `supabase/functions/invite/index.ts:42` ; A5 de 0.4bis |
| C18 | **L'Edge Function `accept-invite` insère le profil directement** (clé de service), sans passer par une fonction qui prenne un verrou : tout invariant « un profil créé efface la ligne de départ » doit vivre dans un déclencheur de `user_profile`, pas dans `accepte_invitation`. Elle disparaît à J+2 (spec du socle § 11). | `supabase/functions/accept-invite/index.ts:150-165` |
| C19 | **Un mois ouvert garde ses lignes confirmées** : `refige_pour` ne supprime et ne repartage que `regle_le is null and confirme_le is null` ; la part d'une personne partie sur une ligne confirmée reste attachée à son identifiant (`depense_part` n'a pas de clé étrangère, C4). | `0100_budget_mois_gele.sql:167-199` |
| C20 | **Les mises à jour du catalogue de recettes ne sont pas que sur `recipe`** : `recipe_update`, `recipe_ingredient_update`, `recipe_step_update`, `recipe_nutrition_update` testent `owner_household_id IS NULL OR …` (quatre politiques de `pg_policies` portent ce motif, relu en base). | relu en base (`pg_policies`) ; `0038_convive_frontiere.sql:103-111` |
| C21 | **Le rejeu d'idempotence passe avant toutes les autres dépendances d'une route** (« La clé d'abord : un rejeu ne doit réveiller aucune autre dépendance ») : une réponse gardée d'une personne retirée serait rejouée sans repasser par `PersonneDuFoyer`. | `src/popote_api/security/idempotence.py:259-262` |

**Ce que ces constats changent par rapport à la spec d'« Entrer » :** voir « Écarts à la spec, à relayer à la
session de conception ».

---

## Cadre : risque, hypothèses, décisions

**Risque : élevé.** Autorisation (qui est responsable, qui peut retirer qui), effacement et conservation de données
personnelles (revenus d'une personne gardés 30 jours après son départ), tâche planifiée qui supprime des comptes,
route publique qui écrit à un tiers (R1). Conséquences, selon `planning-a-change` : plan approuvé par le propriétaire **en
conversation, en une phrase**, avant tout code ; modèle de menaces ci-dessous ; retour arrière écrit pour chaque
migration ; revue adverse de chaque tâche F2 à F9 ; preuve sur l'essai (F11).

### Décisions déjà prises (13/11/2026, par le propriétaire, non rediscutées)

- **Retirer l'autre membre** : réservé au **responsable actuel** du foyer (`owner`, rôle transmis quand le responsable part). L'autre peut seulement partir d'elle-même.
- **Quitter le foyer** : le compte est gardé **30 jours** (télécharger ses données, rejoindre un foyer par une nouvelle
  invitation), puis effacé ; rappel par mail à **J − 7**.
- **Supprimer son compte** : immédiat. Si le responsable du foyer part et qu'il reste quelqu'un, celle-ci garde
  le foyer et en devient responsable (mail « départ de l'autre »).
- **Lien d'invitation** : 7 jours. Invitation envoyée par mail (prénom + e-mail), prénom modifiable par l'invité.
- **Expéditeur** `Popote <bonjour@notre-popote.fr>` (Scaleway TEM). Le contrat de l'API peut encore rompre (la nouvelle
  appli n'est pas en ligne), par le mécanisme de S2 ; **ce plan n'a besoin d'aucune rupture** (routes et champs
  ajoutés seulement).

### Valeurs proposées par ce plan (justifiées, à relire avec le plan)

| Valeur | Choix | Pourquoi |
|---|---|---|
| Qui est `owner` (le **responsable** : celui du foyer à créer, puis celui à qui le rôle est transmis) | au départ : la personne qui a créé le foyer ; migration : **le plus ancien membre** (`created_at`, puis `id`) ; ensuite, **le premier profil d'un foyer est `owner`**, les suivants `member` (déclencheur, donc l'appli actuelle et ses Edge Functions continuent de marcher) | C1 ; la prod n'a qu'un foyer : à relire sur la copie de prod de la répétition (spec du socle § 11) |
| Transfert du rôle | **par la base** (déclencheur après suppression d'un profil `owner` : le plus ancien membre restant devient `owner`), pas par le code Python | « le foyer n'a jamais zéro responsable » est un invariant, pas une étape que chaque route doit penser à faire |
| Où va une personne qui part | **son profil est supprimé** ; `account_departure` garde son prénom, la date, la date d'effacement, l'identifiant de l'autre membre (son prénom se lit à la volée, il n'est jamais copié) et la copie de ses données | C2, C4 |
| Délai avant effacement | **30 jours** = `left_at + interval '720 hours'` (pas `'30 days'` : `timestamptz + '30 days'` dépend du fuseau de la session et fausserait de une heure le CHECK au changement d'heure), rappel quand il reste 7 jours ou moins | décision du propriétaire |
| Copie des données | `account_departure.archive` (jsonb, **sans limite de taille ni troncature** : un droit d'accès ne se tronque pas ; la taille d'une copie sur un foyer de deux ans est mesurée en F11), **seulement ses propres données** (profil, objectifs, revenus, comptes perso, charges perso, ses parts, ses saisies, ses repas, ses rappels, ses signalements), faite **dans la transaction du départ** ; effacée avec la ligne | sans elle, « télécharger mes données » après le départ rendrait un document vide (C4 : le profil emporte tout en cascade) |
| Places | **deux** (`private.places_du_foyer()`, fonction `immutable` créée par S12 en 0154, reprise par F2) ; refus `409 foyer_complet` à la création d'une invitation et à l'acceptation, lien non consommé | spec § 4.5 « Deux places en cuisine » ; pas de contrainte de schéma (les tests de base en gardent trois) |
| Prolongation d'un lien échu | **7 jours de grâce** après l'échéance (l'e-mail de l'invité est gardé jusque-là), pendant lesquels l'hôte peut « Renvoyer » ; un renvoi donne 7 jours de plus depuis l'envoi | sans l'e-mail, l'hôte ne peut plus renvoyer un lien échu ; question 4 |
| Demande de nouveau lien (R1) | limites : **10 par IP et 3 par lien et par 15 min** ; **au plus un mail à l'hôte mis en file par 24 h et par invitation** (livré au moins une fois) ; pas de mail pour un lien annulé, accepté ou inconnu | décision (sécurité du point 4) ; un lien annulé par l'hôte est un refus de l'hôte |
| Tâche quotidienne (R7) | une passe par jour à 04:11 UTC ; 20 comptes au plus par passe et par appel ; rappel à `scheduled_deletion_at − 7 jours` ; effacement à `scheduled_deletion_at` | C8 ; un foyer de deux personnes n'a jamais plus de quelques lignes |
| File d'envoi (F1b) | table `mail_outbox` ; reprise à 1, 5, 30 min puis toutes les 6 h **jusqu'à l'échéance utile de chaque mail** (rappel : l'effacement ; avis : 7 jours ; demande de lien : 24 h), puis `abandoned` avec alerte et commande de remise en file ; purge **7 jours après l'envoi** (30 jours au plus quoi qu'il arrive) ; **au moins une fois** | décision 2 du 13/11 |
| Drapeau d'effacement (F8) | `instance_setting.efface_les_departs`, **faux** par défaut, passé à vrai à J+2 quand les Edge Functions `accept-invite` et `invite` sont supprimées (spec du socle § 11) ; avant, la tâche rappelle mais n'efface pas | décision 4 du 13/11 |
| Preuve récente | 300 s, pour R3, R4, `DELETE /me` (S11) ; pas pour l'export ni R1 | spec § 5 |

### Arbitrages du 13/11/2026 (coordination, au nom du propriétaire : valeurs décidées, non rediscutées)

1. **Budget, un mois ouvert au moment d'un départ** : une ligne **déjà confirmée** garde son partage, parce qu'elle décrit un paiement
   réel (`refige_pour` ne repartage que les lignes ni réglées ni confirmées, `0100_budget_mois_gele.sql:167-199`) ; les lignes non confirmées du
   mois ouvert et les mois suivants passent à 100 % pour la personne qui reste. Le mail et les critères disent « **les charges communes
   encore à régler** », jamais « toutes ». Scénario d'essai (celui de la revue) : loyer commun confirmé à 50/50, départ le 13 : le loyer
   reste à 50/50, le reste passe à 100 %.
2. **Mails qui comptent** (rappel J − 7, demande de nouveau lien, retrait du foyer, départ de l'autre) : **une file d'envoi persistante en
   base** (F1b), écrite **dans la transaction de l'effet**, vidée après la réponse et par la tâche quotidienne. Sémantique **« au moins une
   fois »**, écrite telle quelle : un doublon reste possible si le processus meurt entre l'acceptation par TEM et l'écriture « envoyé » ;
   l'identifiant rendu par TEM est gardé. **Plus aucune promesse « un seul mail »**.
3. **F8 vide aussi `compte_a_supprimer`** (reprise après une coupure entre la base et Auth) et appelle `efface_le_compte` avec sa vraie signature.
4. **Le déclencheur de retour prend le verrou de la personne** et refuse un profil pour une personne de `compte_a_supprimer`. **L'effacement de
   F8 n'est armé (drapeau) qu'une fois fermé l'ancien chemin d'acceptation** (l'Edge Function `accept-invite`, qui insère directement le profil,
   `index.ts:165`) : voir F8.
5. **Export (F10) complet au sens du droit d'accès** : données, sessions, événements de sécurité, photos, mails envoyés. Plus d'« export partiel »
   présenté comme droit d'accès.
6. **Idempotence** : les réponses gardées d'une personne sont supprimées à tout départ ou retrait, sous le même verrou.
7. **`compte_pour_invitation` existe déjà** (0089, appelée par les Edge Functions) : la fonction de S13 a un nom neuf, `compte_pour_acceptation`.
8. **Catalogue** : l'écriture est fermée pour une personne sans foyer sur `recipe` **et** ses sous-tables ; le test parcourt **toutes les
   politiques réelles de la base**, pas une liste écrite à la main.
9. **Mails « Jeu »** : la marmite est **autorisée**, en image statique servie par `notre-popote.fr`, même adresse pour tous, sans paramètre,
   avec texte alternatif ; le mail reste lisible sans images ; aucun pixel de suivi. Neuf mails (l'empreinte ajoutée et l'empreinte retirée
   sont deux mails).
10. **Objets** : sans prénom ni code, **sauf le prénom de l'hôte** dans deux objets (invitation, retrait du foyer), filtré et coupé à 30
    caractères, avec un objet de repli.
11. **Valeurs décidées** : repartir de zéro dans un autre foyer (ni objectifs, ni revenus, ni repas notés ne suivent) ; **grâce de 7 jours**
    pour renvoyer un lien échu ; **parts des mois clôturés et versements d'épargne gardés** sous un identifiant sans nom (règle du budget
    d'aujourd'hui, on ne la change pas).

### À poser au propriétaire (une seule question ; la valeur du plan vaut tant qu'il n'a pas répondu)

1. Dans votre foyer actuel, c'est bien toi qui l'as créé, donc toi le responsable ? (valeur du plan : oui, le plus ancien membre ; vérifié sur
   la copie de la prod à la répétition)

### Hypothèses non vérifiées (à confirmer à la source avant la tâche concernée)

- **Scaleway TEM** : le champ `html` existe (relu dans la documentation « Sending an email using the API », avec `text`,
  `attachments` et `additional_headers`) ; la documentation ne dit pas si `html` ou `text` peuvent être envoyés seuls
  (on envoie toujours les deux) ni si une image en ligne (`Content-ID`) est acceptée (donc : aucune image) ni si la
  console active un suivi des ouvertures ou des clics (**à vérifier dans la console et à désactiver : F1**) ; taille
  maximale de l'API : 2 Mio, non extensible (page « capabilities and limits »).
- **`pg_net` et la signature** : le corps réellement envoyé par `net.http_post` doit être celui qui est signé
  (`docs/exploitation.md:365-375`) ; `appelle_les_rappels` envoie `'{}'::jsonb` (0126:578), donc le corps signé de la tâche
  quotidienne est **`{}`** (pas le corps vide) : prouvé sur l'essai en F8. En parallèle, un workflow planifié de GitHub
  Actions appelle la même route (idempotente) et rend visible un échec (voir F8).
- **Mails envoyés après la réponse** : l'hébergement s'endort après une demi-heure sans visite (spec d'« Entrer » § 1) ; qu'un mail en tâche d'arrière-plan parte quand la requête vient d'arriver est à **mesurer sur l'essai** (F11) ; la file d'envoi (F1b) rend la mesure sans conséquence pour les mails qui comptent (la tâche quotidienne les reprend).
- **Droits de colonne** : `ops/aligne_droits.py:149` ne compare que les droits de table (`relacl`) ; le plan n'en dépend
  pas (le garde-fou du rôle est un déclencheur, C15).
- **Redirection des réponses** (`bonjour@notre-popote.fr` vers la boîte du propriétaire) : réglage du domaine
  (le DNS est chez Cloudflare, D2 ; **Cloudflare Email Routing** est la piste, non essayée) : geste du propriétaire,
  regroupé en F11. L'API ne pose **aucun** `Reply-To` : cela publierait l'adresse du propriétaire dans chaque mail.
- **Rendu réel des mails** (Gmail, Apple Mail, Outlook, mode sombre) : non vérifiable sans boîte réelle ; F11
  regroupe l'essai du propriétaire.

## Critères d'acceptation (preuve : F11, sauf mention)

1. *Étant donné* un foyer de deux personnes (Sam a créé le foyer, Léa a été invitée), *quand* chacune lit
   `GET /api/v1/household`, *alors* elle voit les deux membres avec `owner` pour Sam et `member` pour Léa, `is_me` vrai
   pour elle seule, et `seats` à 2 ; `GET /api/v1/me` porte `role` et `household`. (F2)
2. *Étant donné* Léa avec une preuve de moins de 5 minutes, *quand* elle quitte le foyer, *alors* en une transaction
   elle n'a plus de profil, ses charges perso et ses lignes ouvertes ont quitté le budget, les mois clôturés gardent
   leur `reste_cents`, ses barquettes sont à tout le monde, son compte reste avec `scheduled_deletion_at` à 30 jours
   pile, ses sessions restent ouvertes, Sam est prévenu par mail après la réponse ; **le même foyer, laissé par
   « supprimer son compte » à la place, est dans le même état** (hors compte). (F3, F4)
3. *Étant donné* Sam et Léa, *quand* Sam retire Léa, *alors* toutes les sessions de Léa sont fermées dans la même
   transaction (une connexion de Léa en vol attend le verrou et ne survit pas), elle est prévenue par mail, et elle
   garde 30 jours ; *quand* Léa tente de retirer Sam, `403 reserve_au_createur`. (F5)
4. *Étant donné* Sam (`owner`) et Léa, *quand* Sam supprime son compte, *alors* Léa devient `owner`, le foyer est
   intact (recettes, frigo, mois clôturés), les charges communes **encore à régler** passent à elle seule (une ligne déjà confirmée garde son
   partage), elle reçoit le mail « départ de l'autre » (au moins une fois) ; seule dans le foyer, le foyer disparaît avec la personne. (F6)
5. *Étant donné* un compte sans foyer dont `scheduled_deletion_at` est dans 7 jours, *quand* la tâche quotidienne
   passe, *alors* un rappel est mis en file **une fois** et livré au moins une fois ; à `scheduled_deletion_at` le compte, sa copie de données et son
   compte Auth sont effacés ; **une personne revenue dans un foyer entre-temps n'est jamais effacée**. (F8, F7)
6. *Étant donné* un lien d'invitation échu, *quand* l'invitée appuie sur « Demander un nouveau lien », *alors* la
   réponse est `202` et identique que le lien soit connu, inconnu, accepté ou annulé (statut, corps, médiane de durée) ;
   l'hôte reçoit au plus **une mise en file** de mail par 24 h et par invitation (livrée au moins une fois) et sa liste montre `renewal_requested_at` ; un renvoi
   remet la demande à zéro. (F9)
7. *Négatif* : une personne sans foyer ne lit ni n'écrit rien du foyer (**toutes les tables à politique de la base**, lecture et
   écriture, catalogue de recettes et sous-tables compris, session ouverte avant le départ comprise ; chaque route de foyer répond `403 aucun_foyer`) ; un `member` ne peut ni se
   donner le rôle `owner` ni retirer le responsable ; R3, R4 et `DELETE /me` sans preuve récente répondent
   `403 reauthentification_requise` ; aucun nom, adresse, jeton ni code dans les journaux ; aucun code, et aucun prénom autre que celui de l'hôte (invitation, retrait) dans un objet de mail.
8. *Étant donné* Sam et Léa avec un loyer commun **confirmé** à 50/50 en novembre, *quand* Léa part le 13 novembre, *alors* le loyer reste à
   50/50 dans le mois ouvert, les lignes non confirmées du mois et les mois suivants sont à 100 % pour Sam. (F3)

**Cibles non fonctionnelles** (mesure F11, essai, instance chaude, foyer semé sur deux ans) : `GET /household`
p95 < 150 ms ; R1 p95 < 250 ms (le mail part après la réponse) ; R3 et R4 p95 < 1 s (elles refont les mois ouverts,
comme `delete_my_account` aujourd'hui : la cible est mesurée avant d'être tenue, et la valeur relevée écrite dans
`docs/preuves-0.2.md`) ; une passe de la tâche quotidienne < 20 s pour 20 comptes (le délai de requête est de 25 s,
`limites.Delai`) ; chaque migration compatible avec l'appli en prod, dite explicitement ; **mail HTML < 100 Ko** ;
ASVS niveau 2 (spec § 7.6).

## Modèle de menaces

```mermaid
flowchart LR
  subgraph internet["Frontière : Internet"]
    E1["E1 Responsable du foyer (owner)"]
    E2["E2 Membre (member)"]
    E3["E3 Personne retirée ou partie"]
    E4["E4 Anonyme avec un lien mort"]
  end
  subgraph cf["Frontière : relais Cloudflare"]
    P0["P0 Worker : /api/*"]
  end
  subgraph api["Frontière : popote-api"]
    P1["P1 Routes du foyer : household, household-departure, members"]
    P2["P2 Route publique : renewal-requests"]
    P3["P3 Route interne signée : departures"]
    P4["P4 Module d'envoi de mails"]
  end
  subgraph base["Frontière : Postgres"]
    D1[("D1 user_profile et rôle")]
    D2[("D2 account_departure et copie des données")]
    D3[("D3 invite_link")]
    D4[("D4 login_session, login_code, webauthn")]
    D5["D5 pg_cron"]
  end
  subgraph tiers["Frontière : tiers"]
    X1["X1 Scaleway TEM"]
    X2["X2 Supabase Auth admin"]
  end
  E1 -- "L1 session, preuve récente" --> P0
  E2 -- "L2 session" --> P0
  E3 -- "L3 session, puis code" --> P0
  E4 -- "L4 jeton dans le corps, sans session" --> P0
  P0 -- "L5 /api/* + IP lue" --> P1
  P0 --> P2
  P1 -- "L6 SQL, verrous foyer puis personne" --> D1
  P1 --> D2
  P1 --> D4
  P2 -- "L7 SQL, un seul appel" --> D3
  D5 -- "L8 appel signé HMAC" --> P3
  P3 -- "L9 service" --> D2
  P3 -- "L10 suppression du compte" --> X2
  P1 -- "L11 mails après la réponse" --> P4
  P2 --> P4
  P3 --> P4
  P4 -- "L12 HTTPS, objet sans nom ni code" --> X1
```

| Menace (STRIDE) | Flux (L1 à L12 du schéma) | Parade | Tâche |
|---|---|---|---|
| **E** Un membre se nomme `owner` (`UPDATE` de sa propre ligne, droit de table, C7) | L2 | déclencheur `BEFORE UPDATE OF role` **en `security invoker`** (C15) qui refuse `authenticated` et `anon` (`42501`) et laisse passer les fonctions privées (propriétaire) ; test qui épingle `42501` (sans lui, seul l'index unique parlerait, en `23505`) ; mutation : retirer le déclencheur | F2 |
| **E** Un membre retire le responsable, ou une personne retire quelqu'un d'un autre foyer | L1, L2 | rôle lu **sous le verrou du foyer**, dans la fonction SQL (pas dans Python seulement) ; `403 reserve_au_createur` testé **avant** la preuve récente ; identifiant d'un autre foyer : `404` sans différence | F5 |
| **T** Foyer sans responsable (suppression directe d'un profil, `auth.users` effacé à la main) | L6 | déclencheur `AFTER DELETE` qui promeut le plus ancien membre restant ; requête de contrôle dans les tests (chaque foyer non vide a exactement un `owner`) | F2 |
| **T** Une session de la personne retirée survit à son retrait (leçon 1 de T15b) | L3, L6 | un seul appel SQL : verrou du foyer, verrou de personne (même clé que `cree_session`), fermeture de **toutes** les sessions, des codes en attente et des sessions GoTrue ; course déterministe (B = connexion par code ou par clé attend le verrou ; A valide ; la session que B ouvre ensuite n'a aucun accès au foyer) | F5 |
| **I** Une personne sans foyer lit ou écrit le foyer | L3 | trois couches : (1) RLS (pas de profil, `current_household()` nul) ; (2) dépendance `PersonneDuFoyer` (`403 aucun_foyer`) sur toute route de foyer ; (3) tests de base sur les 51 tables, lecture et écriture, avec une session ouverte **avant** le départ ; la matrice d'autorisation gagne l'acteur « sans foyer » | F2, F3, F11 |
| **I** La copie des données (revenus, objectifs) d'une personne partie fuit | L6 | table à RLS forcée sans droit ; lue seulement par la route d'export de la **même** personne ; sans limite de taille, **construite en moins de 5 s sur trois ans de données** (prouvé en F3) ; effacée à l'acceptation d'une invitation, à la suppression, à l'effacement ; jamais journalisée ; sauvegardes : 30 jours de plus, dit | F3, F10 |
| **S/I** Énumération des liens par R1 (existence, état, hôte) | L4 | `202` constant ; **un seul** appel SQL au même nombre d'écritures pour lien connu et inconnu ; limites calculées sur la valeur envoyée (HMAC du jeton), pas sur l'existence ; `429` pour tous ; test de médianes | F9 |
| **D** Inondation de l'hôte (ou du quota TEM) par R1 | L4, L12 | une mise en file par fenêtre de 24 h et par invitation (clé de dédoublonnage `invitation:fenêtre`, F9) ; 10 par IP et 3 par lien par 15 min ; coupe-circuit global de S5 à l'envoi réel ; un lien annulé, accepté ou inconnu n'envoie rien | F9 |
| **I** Jeton en clair (base, journal, idempotence, mail du retrait) | L4 | R1 n'a pas d'`Idempotency-Key` (route publique, exemptée par écrit) ; le jeton n'est jamais stocké (empreinte) ; balayage de `caplog` ; **le HTML du mail d'invitation porte le lien comme le texte** : même exposition (TEM garde le contenu 36 h au plus) | F1, F9 |
| **T** Course entre l'effacement quotidien et l'acceptation d'une invitation | L8 | la fonction d'effacement relit, **sous le verrou de personne**, « pas de profil, ligne présente, échéance passée » ; l'acceptation efface la ligne par un déclencheur sur `user_profile` (donc par tout chemin qui crée un profil) ; course déterministe | F3, F7, F8 |
| **D** Le compte à effacer ne l'est pas (la tâche ne passe pas : pause de la base, `pg_cron` absent) ou n'est vidé qu'à moitié (coupure entre la base et Auth) | L8 | workflow GitHub Actions **en doublon** qui échoue si le statut n'est pas `200` ou si `due` > 0 ou `abandoned` > 0 ; script manuel `ops/traite_les_departs.py` ; **la tâche vide aussi `compte_a_supprimer`** ; rejouable : la route est idempotente par construction | F8 |
| **T** Rejeu d'un appel signé de la tâche (300 s de fenêtre) | L8 | route sans effet de plus la seconde fois (état relu en base) ; `base.service()` ajouté à la liste fermée de `tests/unit/test_architecture.py` avec sa raison | F8 |
| **T/R** Pas de trace d'un retrait, d'un départ, d'un transfert | — | événements `foyer_quitte`, `membre_retire`, `role_transfere`, `depart_efface`, `renouvellement_demande` (identifiants et HMAC, jamais d'adresse ni de prénom) ; la liste `Evenement` Python égale le CHECK SQL | F3, F5, F8, F9 |
| **I** Prénom piégé dans un mail HTML ou dans un objet (script, attribut, entité, hameçonnage) | L12 | `html.escape` sur toute valeur insérée, **testé sur le rendu seul** avec des valeurs hostiles, en plus du filtre `prenom_affichable` (durci en S3b) ; le prénom de l'hôte est le **seul** prénom admis dans un objet (invitation, retrait), filtré, coupé à 30 caractères, objet de repli sinon ; liens construits côté serveur, schéma `https` vérifié | F1 |
| **I** Un mail dit quand il a été ouvert (pixel, image distante, lien redirigé) | L12 | **une seule image**, la marmite : même adresse pour tous (`<public_base_url>/mails/marmite.png`), sans paramètre, avec texte alternatif, le mail reste lisible sans images ; aucune autre balise `<img>`, aucune autre URL distante, aucun lien traqué : test sur le HTML rendu ; « ouverte » veut dire « lien ouvert » (risque 8 de 0.4bis) | F1 |
| **D** Interblocage entre le verrou du foyer et celui de personne | L6 | **A2 de 0.4bis** : l'activité de session s'écrit dans sa propre transaction courte avant la route, aucun verrou de personne n'est tenu quand une route prend celui du foyer ; `40P01` reste traduit en `503` + `Retry-After` comme filet ; courses testées | F3, F5 |
| **E** Appel direct d'une fonction de départ par PostgREST (jusqu'à J+2, C14) : preuve récente contournée, adresse de l'autre lue | L2, L3 | les fonctions d'effet **ne rendent aucune adresse** (elles écrivent dans la file d'envoi, qui ne stocke aucune adresse ; seule `prend_les_mails`, `popote_api` seul, en rend une) ; la preuve récente n'est opposable qu'à l'API jusqu'à la fermeture de la base (même limite que `delete_my_account`) : risque R-D | F1b, F3, F5, F6 |
| **T** Un lien créé par la personne qui part pendant son départ survit (`created_by` passe à `null`) | L2 | verrous dans l'ordre de S14 : foyer, **invitation du foyer** (`hashtext('invitation')`, celui de `cree_invitation`, 0142:88), personne ; révocation par la fonction commune `private.revoque_les_liens_de` ; course « création de lien pendant le départ » | F3, F5 |
| **T** Un compte en cours d'effacement est repris par une acceptation d'invitation (fenêtre entre la base et Auth), y compris par l'ancienne Edge Function `accept-invite` (C18) | L9, L10 | `compte_a_supprimer` est inscrite **dans la transaction d'effacement** ; le **déclencheur de `user_profile`** prend le verrou de la personne puis **refuse** un profil pour une personne de `compte_a_supprimer` (tout chemin, Edge comprise) ; `personne_peut_entrer` et `compte_pour_acceptation` la refusent ; l'effacement de F8 n'est armé qu'une fois les Edge Functions supprimées (drapeau) ; courses acceptation / effacement / Auth | F3, F7, F8 |
| **E** Le catalogue partagé de recettes (et ses sous-tables) modifié par une personne sans foyer (C13, C20) | L2 | les **quatre** politiques d'écriture (`recipe_update`, `recipe_ingredient_update`, `recipe_step_update`, `recipe_nutrition_update`) gagnent `current_household() is not null` ; le test d'isolation **parcourt toutes les politiques réelles** (`pg_policy`) et tente lecture et écriture de chaque table avec une personne sans profil ; exceptions de **lecture** écrites avec leur raison (catalogue) | F3 |
| **D** Un mail qui compte (rappel d'effacement, demande de lien, retrait, départ de l'autre) perdu quand le processus meurt ou le conteneur s'endort | L11 | **file d'envoi persistante** (`mail_outbox`, F1b) écrite **dans la transaction de l'effet**, vidée après la réponse et par la tâche quotidienne ; « au moins une fois » (doublon possible entre l'acceptation par TEM et l'écriture « envoyé » : écrit, risque R-E) ; identifiant TEM gardé | F1b, F8, F9 |
| Abus : le responsable retire l'autre par dépit | L1 | décision du propriétaire ; l'autre est prévenue par mail, garde 30 jours et ses données ; l'événement `membre_retire` en garde la trace | F5 |
| Abus : partir pour effacer les charges communes | L1 | seules les charges **perso** et les lignes ouvertes de la personne partent ; les communes restent, à 100 % pour l'autre (décision) | F3 |
| Abus : un lien révoqué, ou celui d'une personne partie, reste utilisable | L4 | les liens créés par la personne qui part sont révoqués **avant** la suppression du profil (`created_by` passe à `null` ensuite : leçon 3 de S14), e-mail et prénom de l'invité effacés | F3, F5 |

**Risques acceptés (à écrire dans `docs/securite.md` par F11) :**

- **R-A. Qui contrôle la boîte mail d'une personne partie, et dispose d'une session, peut télécharger la copie
  de ses données pendant 30 jours.** Même niveau que le risque 1 de 0.4bis : le code par mail est un secours partout.
- **R-B. Levé par A2 de 0.4bis** (activité de session écrite dans sa propre transaction courte). Il reste `40P01` entre deux fonctions de foyer, rendu `503 reessayer` : rien n'est validé à moitié.
- **R-C. L'export après le départ est une copie d'un instant** (celui du départ), pas l'état vivant.
- **R-D. Jusqu'à la fermeture de la base (J+2, 0.7), une session Supabase peut appeler directement les fonctions de départ** et contourner la
  preuve récente (appliquée par l'API) ; elle ne reçoit aucune adresse (C14). Même limite que `delete_my_account`.
- **R-E. Les mails de la file sont livrés « au moins une fois »** : un doublon est possible si le processus meurt entre l'acceptation par TEM et l'écriture « envoyé » (l'identifiant rendu par TEM est gardé pour le retrouver dans la console) ; aucun mail n'est perdu tant que la base est là.
- **R-F. Un lien d'invitation transféré par mail révèle à qui le tient si l'adresse de l'invité a déjà un compte** (`409 compte_existant`, rendu sans autre
  preuve que le jeton quand le lien vient du mail ; le risque 9 de 0.4bis ne couvrait que le lien de secours, qui exige un code). **Accepté** ; **l'erreur
  de code reste uniforme** (`401 code_incorrect` : faux, expiré, épuisé).

## Données personnelles de 0.4ter

Le foyer de deux personnes est un usage domestique (RGPD art. 2.2.c, voir `0008_rgpd.sql:1-4`) : le plan applique
les règles comme bonne pratique, sans AIPD (aucun des critères de la CNIL : pas de grande échelle, pas de
données sensibles au sens de l'art. 9, pas de profilage, pas d'évaluation de personnes).

| Donnée | Finalité | Où | Conservation |
|---|---|---|---|
| Rôle `owner` / `member` | droits dans le foyer | `user_profile.role` | vie du profil (pas une donnée personnelle en soi) |
| Prénom de la personne partie, date de départ, date d'effacement, identifiant de l'autre membre, date du rappel, qui a retiré | page « sans foyer », effacement à J+30, rappel à J−7 | `account_departure` | **30 jours** (décision du propriétaire), effacée plus tôt à l'acceptation d'une invitation ou à la suppression du compte |
| **Copie des données personnelles** (profil, objectifs, revenus, comptes et charges perso, ses parts, ses saisies, repas, rappels, signalements) | droit d'accès et portabilité après un départ (le profil emporte les originaux) | `account_departure.archive` (jsonb) | **comme la ligne : 30 jours au plus** ; les sauvegardes chiffrées de la base la gardent 30 jours de plus (spec du socle § 5.4) : dit dans `docs/securite.md` |
| Demande de nouveau lien (date de la dernière demande, date de la mise en file du mail à l'hôte) | prévenir l'hôte, limiter à une mise en file par 24 h | `invite_link` | avec la ligne (fin de vie + 30 jours) ; la demande est remise à nul par un renvoi ou une annulation |
| E-mail de l'invité, **gardé 7 jours après l'échéance** (grâce) au lieu de l'être jusqu'à l'échéance seulement | permettre à l'hôte de renvoyer un lien échu | `invite_link.invited_email` | échéance + 7 jours (A4) |
| Identifiant (UUID du compte) d'une personne partie dans `depense_part`, `cloture_choix`, `versement_epargne` | fait comptable du budget (C4) | tables du foyer | tant que le foyer existe ; **sans correspondance** (ni nom ni adresse) une fois le compte Auth effacé |
| Événements `foyer_quitte`, `membre_retire`, `role_transfere`, `depart_efface`, `renouvellement_demande` | preuve, détection | `security_event` | 1 an ; aucune adresse, aucun prénom |
| Clés de limite de R1 (HMAC de l'IP et du jeton) | limiter | `login_throttle` | 24 h après la dernière activité (purge de 0138) |
| Objet et destinataire des mails | livraison | Scaleway TEM | tant que le domaine d'envoi est actif ; **l'objet ne porte aucun code ; le prénom de l'hôte (tiers, filtré, 30 caractères au plus) n'y figure que dans deux objets (invitation, retrait du foyer)** : TEM le garde autant que le destinataire ; contenu effacé à la remise, au premier rebond dur ou après 36 h (sources de 0.4bis) |
| File d'envoi `mail_outbox` (genre, personne destinataire, prénoms nécessaires au texte, état, tentatives, identifiant TEM) | ne perdre aucun mail qui compte | table à RLS forcée, aucun droit | **7 jours après l'envoi, 30 jours au plus** ; **aucune adresse** (lue à l'envoi par `prend_les_mails`) ; `params` effacés dès la remise ; les comptes cités sont notés (`concerned_persons`) ; effacée avec le compte (`efface_le_compte`) |

## Règles d'exécution (valables pour chaque tâche)

Celles de 0.4bis s'appliquent telles quelles (TDD avec test négatif de chaque garde et épreuve de la mutation ; une
tâche = une branche = une demande de fusion en brouillon ≤ 400 lignes hors `uv.lock` et `openapi.json` ; gabarit à
quatre parties, `Closes #<issue>` ; commits Conventional en français, `Refs: #<issue>`, **aucune ligne de co-auteur** ;
worktree dédié, remote de l'équipe, jamais `gh` ; aucun accès à la prod ; secrets hors dépôt,
jamais affichés ; migrations appliquées **une à la fois, dans l'ordre**, jamais
modifiées une fois fusionnées ; « expand seulement » ; `verrouille_la_personne` ; courses déterministes ;
`Idempotency-Key` et ses exemptions écrites). Ajouts :

- **Skills à charger avant de coder :** ceux de 0.4bis, plus `protecting-personal-data` (F3, F5, F8, F10),
  `modeling-threats` (relire le tableau ci-dessus à chaque tâche qui y figure), `designing-http-apis` (F2, F4, F5,
  F9, F10).
- **Numéros de migration :** à partir de **0158** (0.4bis occupe 0147 à 0157, dont 0147 déjà fusionnée). Renuméroter au rebase si une autre
  demande en a pris ; jamais deux fois le même numéro.
- **Une règle de départ, un seul corps.** Aucune tâche de ce plan ne réécrit un effet de départ sur le budget : ils
  vivent dans `private.sort_du_foyer(p_person)` (A6 de 0.4bis). Une tâche qui a besoin d'un effet de plus l'ajoute **là**
  et fait passer le test de parité (F3).
- **Une personne sans foyer est un acteur de test de plein droit** : chaque test d'intégration et chaque ligne de la
  matrice d'autorisation qui concerne une route de foyer a son cas « sans foyer » (`403 aucun_foyer`), et chaque route
  de compte (`/me`, appareils, clés, preuve, export, `DELETE /me`) a son cas « sans foyer » qui **marche**.
- **Aucune fonction exécutable par `authenticated` ne rend une adresse** (C14) : les fonctions d'effet rendent des identifiants et
  **écrivent dans la file d'envoi** ; la seule fonction qui rend une adresse est `public.prend_les_mails` (F1b, `popote_api` seul,
  `base.connexion()`, ajoutée à la liste fermée de `tests/unit/test_architecture.py` avec sa raison).
- **Les fonctions de départ rendent un résultat, elles ne lèvent pas** pour les refus du métier (`aucun_foyer`,
  `seule_dans_le_foyer`, `reserve_au_createur`, `membre_introuvable`, `retrait_de_soi`) : la transaction se valide
  sans rien changer, la route traduit en Problem Details. Une **erreur** de base annule tout (`503`).
- **Un mail qui compte passe par la file d'envoi persistante** (F1b : rappel d'effacement, demande de nouveau lien, retrait du foyer, départ
  de l'autre) : la fonction d'effet **écrit la ligne de `mail_outbox` dans sa propre transaction** (aucune perte entre la validation et
  l'envoi) ; après la réponse, la route **vide la file** (`BackgroundTasks`, `envoie_sans_remonter`) pour les lignes qu'elle vient d'écrire ;
  la tâche quotidienne vide le reste (reprises, pannes TEM). Sémantique **« au moins une fois »**, écrite : un doublon reste possible si le
  processus meurt entre l'acceptation par TEM et l'écriture « envoyé » (R-E) ; l'identifiant rendu par TEM est gardé. **Aucune promesse
  « un seul mail »** : la file garantit « un seul mail **mis en file** » par événement (clé de dédoublonnage), pas un seul mail reçu. Les
  adresses lues pour un mail ne sont jamais dans la réponse HTTP. Les mails d'avis de S10b et le code de connexion gardent leur envoi
  après la réponse de S5 et de S7 (ils ne se rejouent pas : on redemande un code).
- **Fini** = comme 0.4bis, plus : le test de parité (F3) vert, la matrice d'autorisation avec l'acteur « sans foyer »,
  `tests/db` vert avant et après chaque migration.

## Surface HTTP de 0.4ter

| Route | Qui | Réponses |
|---|---|---|
| `GET /api/v1/household` (**R2**) | session, foyer | `200 {id, name, seats, members: [{id, first_name, role, is_me}]}` (`ETag`, `no-store`) ; `403 aucun_foyer` |
| `GET /api/v1/me` (**R5**, ajouts compatibles) | session | `200 {…, household, role, scheduled_deletion_at, left_household_at, left_reason, other_member_first_name}` : `role` (`owner`, `member` ou `null`), les trois autres `null` tant qu'on est dans un foyer |
| `POST /api/v1/me/household-departure` (**R3**) | session, foyer, preuve récente | `200 {left_at, scheduled_deletion_at}` ; `403 aucun_foyer`, `403 reauthentification_requise` ; `409 seule_dans_le_foyer` ; `503`. **Sans `Idempotency-Key`** (exemption écrite : C6) |
| `DELETE /api/v1/household/members/{member_id}` (**R4**) | session, `owner`, preuve récente | `204` ; `403 reserve_au_createur` (avant la preuve) ; `403 reauthentification_requise` ; `404 membre_introuvable` (inconnu **ou** d'un autre foyer) ; `409 retrait_de_soi` ; `403 aucun_foyer` ; `503` |
| `DELETE /api/v1/me` (**R6**, comportement) | session, preuve récente | `204` ; **inchangée côté contrat** ; transfert du rôle et mail « départ de l'autre » ; `503 suppression_incomplete` comme avant |
| `POST /api/v1/invitations/renewal-requests` `{token}` (**R1**) | **publique** | `202 {message}` **toujours** ; `422` (corps) ; `429 trop_de_requetes` + `Retry-After` ; **sans `Idempotency-Key`** (publique : exemption écrite) |
| `GET /api/v1/me/invitations` (**R8**) | session, foyer | champs ajoutés par S12 amendé : `renewal_requested_at`, statut `expired` (la spec écrit `/api/v1/invitations` : c'est la route de 0.4bis) |
| `GET /api/v1/me/export` | session | `200` JSON en pièce jointe (`Content-Disposition`, `no-store`) : **droit d'accès complet pour la personne** (données, sessions, événements, clés, mails, photos) ; `401` ; marche **sans foyer** |
| `POST /internal/departures/processing` (**R7**) | **signée HMAC**, hors du relais et hors du contrat | `200 {reminders_sent, accounts_erased, remaining}` ; refus : `404` (comme toute route interne) |
| **R9** `GET /api/v1/welcome` | — | **étape 0.5** |

Types d'erreur nouveaux (`https://notre-popote.fr/problemes/<code>`) : `aucun_foyer` (403), `seule_dans_le_foyer` (409),
`reserve_au_createur` (403 ; le nom du type est celui de la spec, le droit appartient au **responsable actuel**), `membre_introuvable` (404), `retrait_de_soi` (409), `foyer_complet` (409), `deja_dans_un_foyer` (409, personne dont la session a déjà un foyer, posés par S12 et S13 amendés),
`invitation_expiree` (410, avec `host_first_name`, A4). Réutilisés : `reauthentification_requise`, `trop_de_requetes`, `invitation_deja_en_attente`,
`quota_invitations`, `suppression_incomplete`. Un seul statut par `type` : `aucun_foyer` est `403` partout (c'est
aussi la valeur de S12) ; le plan front d'« Entrer » (E1) qui écrivait `404` sans foyer lit le `type`, pas le statut.

## Migrations de 0.4ter : compatibilité et retour arrière

| N° | Tâche | Objet | Compatible avec l'appli en prod parce que | Retour arrière |
|---|---|---|---|---|
| 0158 | F1b | `mail_outbox` (RLS forcée, aucun droit) ; `private.met_en_file`, `public.prend_les_mails`, `confirme_l_envoi`, `echec_d_envoi` ; purge `pg_cron` | table et fonctions neuves | `cron.unschedule`, `drop function`, `drop table` (vider la file d'abord) |
| 0159 | F2 | `user_profile.role` (défaut `member`, CHECK), remplissage par le plus ancien membre, index unique partiel (un `owner` par foyer), déclencheurs : rôle à l'insertion (`definer`), garde de la modification (**`invoker`**), transfert à la suppression (`definer`) | colonne avec défaut ; `create_household` et les Edge Functions insèrent sans `role` et obtiennent `owner` puis `member` ; `delete_my_account` (qui appelle `efface_mes_donnees`) transfère par le déclencheur ; prouvé par `tests/db` (`invitation`, `isolation`, `budget-depart`) | `drop trigger` ×3, `drop index`, `drop column role` |
| 0160 | F3 | `account_departure` (RLS forcée, aucun droit) et ses lectures `ma_sortie()`, `mon_export()` ; les quatre politiques de mise à jour du catalogue de recettes (`current_household() is not null`) ; déclencheur de retour ; `efface_le_compte` redéfinie ; `idempotency_key.person_id` : clé étrangère vers `auth.users` au lieu de `user_profile` ; `private.personne_peut_entrer` redéfinie ; `private.export_de_la_personne` ; `public.quitte_le_foyer()` ; déclencheur « un profil créé efface la ligne de départ » ; `private.efface_le_compte` redéfinie (efface aussi la ligne) ; types d'événement et colonnes d'événement | tables et fonctions neuves ; **seul objet existant touché : la clé étrangère de `idempotency_key`**, relâchée (`not valid`, validation, retrait de l'ancienne) : l'appli en ligne n'écrit pas dans cette table (0135 date de 0.3) | retour en deux temps : d'abord le code, puis `drop function` et déclencheur ; `account_departure` n'est supprimée qu'après export manuel de ses copies ; la clé étrangère d'idempotence **ne revient pas** vers `user_profile` tant qu'il existe des lignes pour des personnes sans profil (la nouvelle est inoffensive) ; politiques du catalogue et CHECK d'avant |
| 0161 | F5 | `public.retire_un_membre(p_membre)` ; `private.ferme_toutes_les_sessions_de(p_person)` ; type `membre_retire` | fonctions neuves | `drop function` ×2, CHECK d'avant |
| 0162 | F6 | `public.efface_mes_donnees_avec_bilan()` (nouveau nom : `efface_mes_donnees()` garde sa signature, qui est celle d'`delete_my_account`) | fonction neuve ; `efface_mes_donnees()` l'appelle et jette le bilan | `drop function`, `efface_mes_donnees` d'avant |
| 0163 | F8 | `public.departs_a_traiter`, `public.met_en_file_le_rappel_de_depart`, `public.efface_un_compte_expire`, `public.comptes_a_vider` (service seul) ; table `depart_passe` ; réglage `efface_les_departs` ; `public.appelle_les_departs()` et sa planification `pg_cron` (tolérante) ; types `depart_efface`, `rappel_depart_envoye` | fonctions neuves ; la planification est posée seulement si `pg_cron` existe, et ne fait rien tant que les secrets du coffre manquent | `cron.unschedule('departs-quotidiens')`, `drop function` |
| 0164 | F9 | `public.demande_un_renouvellement` (publique, `popote_api` seul) ; scopes `renouvellement_ip` et `renouvellement_lien` ajoutés au CHECK de `login_throttle` ; type `renouvellement_demande` | objets neufs ; un CHECK élargi | `drop function`, CHECK d'avant |
| 0165 | F10a | `public.mes_traces()` (sessions, événements, clés, mails de la personne ; cadrée sur `auth.uid()`, sans adresse ni empreinte) | fonction neuve | `drop function` |

(Les colonnes `renewal_requested_at` et `renewal_mail_queued_at`, l'e-mail gardé 7 jours de plus, la prolongation par
renvoi et le relâchement de `invite_link_check` sont dans la migration 0154 de S12, amendée : A4.)

## Ordre et voies

| Voie | Tâches, dans l'ordre | Dépend de |
|---|---|---|
| Dehors (sans base) | F1 mails au style « Jeu » (F1a gabarit et code, F1c les autres) | S3, S4 (champ `html`), S10b, S3b |
| Base (migrations, dans l'ordre des numéros) | **F1b** (file d'envoi, avant tout effet qui prévient) · F2 · F3 · F5 · F6 · F8 · F9 · F10a ; sans migration : F4 (après F3), F7 (après F3 et S13), F10b (après F10a) | **S14 amendé (A6)** et S15 pour F1b à F10 ; S11 pour F3 à F6 ; S12 amendé pour F9 ; S13 pour F7 |
| Clôture | F11 preuve de bout en bout et clôture | toutes ; les gestes du propriétaire (F11) pour le vrai mail et la planification |

Parallèle possible : F1 dès que S4 est fusionné ; F9 pendant F5 (aucun fichier commun hors `main.py`). R9 n'est pas
dans ce plan.

---

### F1 : Les mails au style « Jeu » (HTML et texte)

**Pourquoi :** spec d'« Entrer » § 4.6 et § 7 (capture `.design/entrer/captures/11-mail.png`) ; 0.4bis ne livre que du
texte clair (S3, S4) et dit « gabarits HTML hors périmètre ». **Dépend de :** S3 (interface), S4 (envoi réel,
champ `html`), S10b (avis), S3b (`prenom_affichable` durci). **Coupe prévue :** le gabarit, le mail de code et
l'invitation (F1a) ; les sept autres (F1c ; la file d'envoi est la tâche F1b).

**Fichiers :** `src/popote_api/infra/mails_gabarit.py` (palette, mise en page, échappement : fonctions pures),
`infra/mails_textes.py` (étendu : `rendu(message) -> Rendu(objet, texte, html)` devient l'**unique** endroit où naissent
l'objet, le texte et le HTML), `infra/mails.py` (quatre messages nouveaux, leurs méthodes dans `EnvoiMail`,
`BoiteDeTest` (garde le message **et** son rendu), `MailAbsent`, `envoie_sans_remonter` étendu), `infra/mail_scaleway.py`
(envoie `text` **et** `html`, **et rend l'identifiant que TEM donne**), `config.py` (`public_base_url` existe : les liens
et l'image en viennent), tests `tests/unit/test_mails_html.py`, `tests/unit/snapshots/mails/<genre>.html` et `.txt`,
`tests/unit/test_architecture.py`, `docs/exploitation.md` ; **côté `popote-web`** : le fichier `public/mails/marmite.png` (export de la
marmite du système « Jeu » par la session de design, 2 Ko à 20 Ko), servi par le relais sous `/mails/marmite.png`.

- [ ] **Les neuf mails**, avec leur objet (**aucun code ; aucun prénom, sauf celui de l'hôte dans deux objets**, décision 10 du
  13/11 : le prénom passe par `prenom_affichable` (S3b), est coupé à 30 caractères, et **si le filtre le refuse l'objet de repli
  s'applique** ; 10 caractères au moins, exigence de TEM ; Scaleway garde l'objet tant que le domaine est actif) :

  | Mail | Objet | Corps (texte de la spec § 4.6 et § 7, au mot près, sauf l'écart noté) | Bandeau |
  |---|---|---|---|
  | Code | « Ton code Popote » (*écart : la spec met le code dans l'objet ; 0.4bis l'interdit*) | « Voici ton code. Il marche 10 minutes. » code en très grand ; « Tu n'as rien demandé ? Ne fais rien, personne n'entre sans ce code. » | rose |
  | Invitation | « {Hôte} t'a gardé une place en cuisine » ; repli « Une place t'attend en cuisine » | titre « {Prénom}, {Hôte} t'a gardé une place ! » ; texte de la spec ; bouton « Rejoindre {Hôte} » vers `<public_base_url>/invitation#<jeton>` ; note « Ce lien marche 7 jours, et rien que pour toi. » | soleil |
  | Avis de connexion (S10b) | « Quelqu'un vient d'entrer avec ton e-mail » | « C'était bien toi ? Connexion par code, {date} à {heure}, depuis {navigateur} sur {système}. » + la marche à suivre ; **un seul bouton « Voir mes appareils » vers `/compte`** (*écart : la spec met « Oui, c'était moi » et « Non, déconnecte cet appareil » ; un lien qui agit depuis un mail serait suivi par un antivirus de messagerie, risque 8 de 0.4bis*) | ciel |
  | Empreinte ajoutée | « Une empreinte a été ajoutée à ton compte » | même forme que l'avis, un seul bouton « Voir mes appareils » | ciel |
  | Empreinte retirée | « Une empreinte a été retirée de ton compte » | même forme | ciel |
  | Demande de nouveau lien | « Une demande de nouveau lien » | « {Prénom} demande un nouveau lien. Son lien d'invitation ne marche plus. » bouton « Renvoyer l'invitation » vers `/foyer` | soleil |
  | Retrait du foyer | « Tu n'es plus dans le foyer de {Hôte} » ; repli « Tu n'es plus dans ton foyer Popote » | « Tu n'es plus dans le foyer de {Hôte}. Tu as 30 jours pour télécharger ce qui est à toi. » bouton « Télécharger mes données » vers `/sans-foyer` | ciel |
  | Départ de l'autre | « Un départ dans ton foyer » | « {Prénom} a quitté le foyer. Le foyer est à toi. **Les charges communes encore à régler passent à 100 % pour toi.** » (*écart : la spec dit « à partir de ce mois » ; une ligne déjà confirmée garde son partage, décision 1 du 13/11*) | ciel |
  | Rappel avant effacement | « Ton compte Popote s'efface dans 7 jours » | « Ton compte s'efface le {date}. Télécharge tes données, ou rejoins un foyer avec une nouvelle invitation. » bouton « Télécharger mes données » vers `/sans-foyer` | ciel |

- [ ] **Gabarit** : un tableau de 600 px au plus, tout le CSS **en ligne**, plus un seul bloc `<style>` dans l'en-tête
  qui ne sert qu'au mode sombre (`@media (prefers-color-scheme: dark)`) et à la largeur étroite : le mail reste
  lisible si le client l'ignore. `<!doctype html>`, `<html lang="fr">`, `<meta name="color-scheme" content="light dark">`
  et `<meta name="supported-color-schemes" content="light dark">`. Polices de repli seulement (`"Nunito", "Trebuchet MS",
  "Segoe UI", Arial, sans-serif` : pas de police servie). Palette **copiée** de `.design/systeme/jetons.css` (crème,
  encre, jaune, rose, ciel, tomate pâle ; le commit source est noté dans le fichier), **chaque cellule porte sa couleur de
  fond et sa couleur de texte** : un client qui inverse partiellement les couleurs (Gmail sur Android) ne laisse pas un
  texte sombre sur fond sombre. **Le bandeau est une cellule de couleur** avec « Popote » en texte **et la marmite en image
  statique** : `<img src="<public_base_url>/mails/marmite.png" alt="Popote, la marmite" width height>`, **la même adresse
  pour tous les mails et tous les destinataires, sans paramètre ni identifiant** ; **le mail est lisible sans images**
  (le texte alternatif et la couleur du bandeau suffisent). Un seul bouton (cellule à fond jaune, bord et ombre dure en
  encre, lien en texte), un lien en clair sous lui.
- [ ] **Version texte complète** de chaque mail, **sans aucune perte** (le code, la date, le lien en clair), lignes
  de 72 caractères au plus ; `text` et `html` envoyés **ensemble**.
- [ ] **Échappement** : toute valeur insérée dans le HTML (prénoms, appareil, date, lien) passe par `html.escape(…,
  quote=True)` dans **une seule fonction** du gabarit ; le lien d'un bouton est vérifié (`https://`, ou `http://localhost`
  en local) avant d'entrer dans un attribut. Le prénom vient d'un tiers (l'hôte tape celui de l'invité). **L'objet est une
  fonction du genre et du prénom filtré**, jamais une concaténation libre.
- [ ] **Aucun suivi** : **une seule balise `<img>` par mail, la marmite, à l'adresse constante ci-dessus** ; aucun `url(`,
  `@import`, `srcset`, `<link>`, aucune autre URL distante que le lien d'action (dont l'hôte est celui de `public_base_url`)
  et cette image, aucun lien qui passe par un redirecteur, aucun pixel d'un pixel. « Ouverte » reste « le lien a été
  ouvert » (risque 8 de 0.4bis) : l'image, chargée ou non, n'est jamais lue comme une ouverture.
- [ ] **Poids** : moins de 100 Ko octets (HTML seul ; la cible réelle est de quelques Ko), et bien en dessous des 2 Mio de l'API de
  TEM.
- [ ] `docs/exploitation.md` : vérifier dans la console TEM que **le suivi des ouvertures et des clics est
  désactivé** pour le domaine ; où voir un mail ; pas de `Reply-To` (la redirection des réponses est un réglage du
  domaine : F11).
- Cas de test : **un rendu par mail comparé à un instantané** (fichiers dans `tests/unit/snapshots/mails/`,
  régénérés par une variable d'environnement, jamais par défaut) ; HTML bien formé (analyse par `html.parser`) ;
  `lang="fr"` ; **objets** : exactement ceux du tableau ; aucun code dans aucun objet ; seuls les objets d'invitation et de
  retrait portent un prénom, celui de l'hôte, **filtré et coupé à 30 caractères, repli quand il est refusé** (prénom avec `<`,
  `@`, chiffre, 31 caractères, vide) ; objet ≥ 10 caractères ; le code n'apparaît que dans le mail de code (texte et HTML) ;
  **échappement prouvé sur le rendu seul** avec `<script>alert(1)</script>`, `"><img src=x onerror=1>`, `&amp;`, `'`, un
  retour à la ligne et un prénom de 200 caractères : aucune balise ni attribut injecté, texte conservé lisible ; lien d'action
  `javascript:` ou `data:` refusé ; **une seule `<img>`, dont l'`src` est exactement `<public_base_url>/mails/marmite.png` sans
  paramètre, avec `alt`** ; aucune autre URL distante, aucun suivi (recherche des motifs ci-dessus dans les neuf rendus) ;
  **lisible sans images** (le HTML privé de ses `<img>` garde un titre, un texte et un bouton) ; poids < 100 Ko ; **contraste** :
  chaque paire texte et fond de la palette, en clair **et** en sombre, atteint 4,5:1 (calcul WCAG dans le test) ; version texte
  contient le lien et le code ; `repr` des messages sans adresse, code ni lien ; `BoiteDeTest` rend le même objet, texte et HTML
  que l'envoi réel ; charge utile TEM exacte avec `text` et `html` (`httpx.MockTransport`) ; l'identifiant que TEM rend est
  retourné ; test d'architecture : seul `mail_scaleway.py` parle à TEM.
- Mutations : retirer `html.escape` (le test d'échappement casse) ; mettre le code, ou un prénom autre que celui de l'hôte, dans
  un objet ; ne pas filtrer le prénom de l'objet ; ajouter une seconde `<img>` ou un paramètre à l'adresse de la marmite ; ne pas
  envoyer le texte ; supprimer le contrôle du schéma du lien.
- **Retour arrière :** n'envoyer que `text` (le champ `html` omis) ; aucune migration.

### F1b : La file d'envoi persistante des mails (migration 0158)

**Pourquoi :** décision 2 du 13/11 ; revue de #42 : un mail « après la réponse » se perd si le processus meurt, et « un seul mail » est
impossible à garantir (TEM accepte, le processus meurt avant d'écrire « envoyé »). **Dépend de :** S3, S4, F1. **Quatre mails seulement**
passent par la file : le rappel J − 7, l'avis de départ (« départ de l'autre »), l'avis de retrait, la demande de nouveau lien. **Le
code de connexion, l'invitation et les avis de S10b restent « au mieux »** (envoyés après la réponse, sans file : un code se redemande, le
renvoi d'une invitation est visible à l'écran et son statut `failed` aussi).

**Fichiers :** `supabase/migrations/0158_file_d_envoi.sql`, `src/popote_api/infra/file_d_envoi.py`, `infra/mails.py`
(`EnvoiMail` rend `str | None` : l'identifiant de TEM), `infra/mail_scaleway.py`, `ops/remet_en_file.py`,
`tests/integration/test_file_d_envoi.py`, `tests/unit/test_file_d_envoi.py`, `tests/integration/test_surface.py`, `docs/schema.md`,
`docs/securite.md`, `docs/exploitation.md`.

- [ ] **`mail_outbox`** : `id uuid primary key`, `kind text` (CHECK : `rappel_effacement`, `demande_de_lien`, `retrait_du_foyer`,
  `depart_de_l_autre`), `person_id uuid not null references auth.users (id) on delete cascade` (le destinataire ; **aucune adresse
  n'est stockée** : elle est lue à l'envoi), **`concerned_persons uuid[] not null`** (les **autres** comptes dont les données figurent
  dans `params` ; index GIN : `efface_le_compte(p)` supprime les lignes où `p` est destinataire **ou** figure dans cette liste),
  `params jsonb not null` (les prénoms et dates que le texte exige, 2 Kio au plus, forme vérifiée par genre), `dedupe_key text` (index unique
  `(kind, dedupe_key)` : **un seul mail mis en file par événement**), `deadline_at timestamptz not null` (l'**échéance utile** du mail :
  rappel J − 7 → l'effacement du compte ; avis de départ ou de retrait → 7 jours après la mise en file ; demande de lien → 24 h), `state`
  (`queued`, `sending`, `sent`, `abandoned`), `attempts smallint`, `next_attempt_at`, `claimed_until`, `provider_id text`, `created_at`,
  `sent_at`. **RLS activée et forcée, aucun droit.**
- [ ] **`private.met_en_file(p_kind, p_person, p_concerned, p_params, p_dedupe_key, p_echeance)`** (appelée par les fonctions d'effet,
  **dans leur transaction** : si l'effet est annulé la ligne l'est aussi ; `on conflict (kind, dedupe_key) do nothing`) ; **`public.prend_les_mails(p_ids
  uuid[], p_limite int)`** (`popote_api` seul : prend les lignes à envoyer (`queued` échues, ou `sending` dont `claimed_until` est passé) par
  `for update skip locked`, pose `claimed_until = now() + 2 minutes`, `attempts + 1`, et rend adresse, prénom et paramètres : **seule
  fonction qui rend une adresse**) ; **`public.confirme_l_envoi(p_id, p_provider_id)`** (état `sent`, `sent_at`, identifiant TEM, **et
  `params` remis à `{}` : les paramètres sont effacés dès la remise**) ; **`public.echec_d_envoi(p_id)`** : la reprise se fait avec un
  **délai croissant** (1, 5, 30 minutes, puis toutes les 6 heures) **jusqu'à `deadline_at`** ; **passé `deadline_at`, la ligne devient
  `abandoned`**, un événement de journal (type `mail_abandonne`, par genre, sans adresse) s'écrit et **une erreur est journalisée** : c'est
  l'alerte (Sentry viendra plus tard) ; la réponse de la tâche quotidienne (F8) compte `abandoned` et le workflow de F8 échoue s'il est
  positif ; **`public.remet_en_file(p_id uuid)`** (service seul : repasse `abandoned` en `queued`, `attempts` à 0, **nouvelle
  échéance** de la même durée) appelée par **`ops/remet_en_file.py`** (une ligne, ou `--tous-les-abandonnes`, dit dans
  `docs/exploitation.md`) ; **`private.purge_mail_outbox`** (`pg_cron` nocturne : 7 jours après `sent_at`, 30 jours au plus après
  `created_at`, abandons compris : un abandon se remet en file dans les 30 jours ou se perd).
- [ ] **`infra/file_d_envoi.py`** : `vide_la_file(ids)` appelée **après la réponse** par chaque route qui vient d'écrire des lignes
  (`BackgroundTasks`, `envoie_sans_remonter`) et par la tâche quotidienne de F8 (reprises) ; elle rend le texte par `rendu` (F1), envoie,
  puis `confirme_l_envoi` avec l'identifiant de TEM ; un échec appelle `echec_d_envoi` ; l'annulation propage. **Sémantique « au moins
  une fois », écrite dans `docs/securite.md`** : un doublon est possible si le processus meurt entre l'acceptation par TEM et
  `confirme_l_envoi` ; **dans ce cas l'identifiant TEM du premier envoi est inconnu (il n'a jamais été écrit)** : le doublon se repère dans la
  console TEM (même destinataire, même objet, même heure), pas par identifiant ; **un mail n'est perdu que s'il est abandonné après son
  échéance utile, et cela se voit** (journal, réponse de F8, workflow).
- [ ] **Les mails de départ et de retrait citent la personne partie** : ils sont écrits **après** `efface_le_compte` de cette personne
  (suppression de compte) et ne la listent donc pas dans `concerned_persons` : son prénom y reste **jusqu'à la remise**, puis `params` est
  effacé (30 jours au plus dans tous les cas) : c'est la finalité du message (prévenir l'autre).
- Cas de test : la ligne est écrite **dans la transaction de l'effet** (annulation de l'effet : aucune ligne) ; deux travailleurs en
  parallèle prennent des lignes différentes (`skip locked`), jamais la même ; **processus tué après la prise** (`claimed_until` passé) →
  reprise ; **tué après l'acceptation par TEM et avant `confirme_l_envoi` → renvoi (doublon) : le test écrit que c'est le comportement
  voulu et que l'identifiant du premier envoi est absent** ; échecs successifs : délais 1, 5, 30 minutes puis 6 heures **jusqu'à
  l'échéance**, un rappel J − 7 est repris **jusqu'à l'effacement**, un avis 7 jours, une demande de lien 24 h ; **passé l'échéance :
  `abandoned`, erreur journalisée, événement, compté dans la réponse de F8** ; `remet_en_file` et `ops/remet_en_file.py` (une ligne,
  tous) remettent à `queued` avec une nouvelle échéance, **testés** ; clé de dédoublonnage : un second événement de même clé ne met rien en
  file ; **`params` vide après la remise** ; **`efface_le_compte(Sam)` supprime la ligne destinée à Léa qui cite Sam dans `concerned_persons`**
  et celles dont Sam est destinataire ; aucune adresse dans la table ni dans `caplog` ; `params` borné ; purge (7 jours après l'envoi,
  30 au plus) ; surface : `anon`, `authenticated` sans droit, `prend_les_mails` et `remet_en_file` hors de `authenticated` ; test
  d'architecture : `base.connexion()` pour `prend_les_mails` ajouté à la liste fermée avec sa raison.
- Mutations : marquer « envoyé » avant l'envoi ; prendre sans `skip locked` ; stocker l'adresse ; ignorer la clé de dédoublonnage ;
  abandonner avant l'échéance utile ; garder `params` après la remise ; oublier `concerned_persons` dans `efface_le_compte` ; oublier la purge.
- **Retour arrière :** `cron.unschedule`, `drop function`, `drop table mail_outbox` (les mails en attente sont perdus : à vider d'abord par
  `ops/traite_les_departs.py`).

### F2 (R2, R5) : Le rôle du foyer, lire le foyer et « moi » (migration 0159)

**Pourquoi :** spec d'« Entrer » § 4.5, § 4.10, § 9 R2 et R5 ; C1 (aucun rôle), C2, C7. **Dépend de :** S14 amendé
(le déclencheur de transfert sert `sort_du_foyer`), S15 (numéros).

**Fichiers :** `supabase/migrations/0159_role_du_foyer.sql`, `src/popote_api/api/foyer.py`, `schemas/foyer.py`,
`security/session.py` (`PersonneDuFoyer`), `errors.py` (`CODE_AUCUN_FOYER`), `api/moi.py` et `schemas/moi.py`
(`LIT_MOI` : `role`, `household`), `main.py`, `tests/integration/test_foyer.py`, `tests/db/role-du-foyer.test.ts`,
`tests/authz/test_matrice.py`, `docs/normes-api.md`, `docs/schema.md`, `docs/securite.md`.

- [ ] Migration, **en tête, le retour arrière** puis `set local lock_timeout` et `statement_timeout` : colonne
  `user_profile.role text not null default 'member' check (role in ('owner','member'))` ; remplissage : le profil le
  plus ancien (`created_at`, puis `id`) de chaque foyer devient `owner` ; index unique partiel
  `user_profile_un_owner_par_foyer (household_id) where role = 'owner'`. Le nombre de places (2) est `private.places_du_foyer()`, créée par S12 (0154, A4) : F2 la reprend, il n'y a qu'une source du chiffre.
- [ ] Trois déclencheurs : **avant insertion** (`security definer`, `search_path = ''`), le rôle est `owner` si le foyer
  n'a aucun profil, `member` sinon, **quoi qu'on ait écrit** ; **avant modification de `role`** : **`security invoker`**
  (`set search_path = public, pg_temp`), refus `42501` quand `current_user in ('authenticated', 'anon')` (C7 : `authenticated`
  garde `UPDATE` sur la table ; **C15 : en `definer`, `current_user` vaudrait le propriétaire et la garde ne refuserait
  jamais**, comme le dit le commentaire de `tg_verrou_instruction`, 0095:30-48) ; **après suppression** d'un profil `owner`
  (`security definer`), le plus ancien membre restant (`created_at`, `id`) devient `owner` : ce déclencheur passe **malgré**
  la garde, parce qu'il tourne sous le propriétaire. `revoke` et `grant` écrits ; aucune politique nouvelle.
- [ ] `PersonneDuFoyer` : dépendance FastAPI qui exige un profil (sinon `Probleme(403, aucun_foyer, "Tu n'es dans aucun
  foyer.")`) ; **toute route de foyer, de 0.4ter et de 0.5, la prend** (un test d'architecture énumère les routes et
  échoue si une route de foyer ne l'a pas : liste fermée des routes de compte qui ne l'ont pas, avec leur raison).
- [ ] `GET /api/v1/household` : sous la RLS de la personne (`user_profile` et `household` ne rendent que son foyer, comme
  `LIT_MOI`), `{id, name, seats: 2, members: [{id, first_name, role, is_me}]}` triés (`owner` d'abord) ; `first_name` vaut
  `null` si le prénom est vide ; `ETag` et `no-store`, comme `GET /me`.
- [ ] `GET /api/v1/me` : `role` (`owner`, `member`, `null`) ; `scheduled_deletion_at`, `left_household_at`,
  `left_reason` et `other_member_first_name` (`null` tant qu'on est dans un foyer ; remplis par F3). Ajouts compatibles.
- Cas de test : foyer d'une personne, de deux ; `is_me` vrai pour une seule ligne ; `first_name` vide → `null` ; une
  personne d'un autre foyer ne lit rien (`GET` ne prend aucun identifiant) ; sans profil → `403 aucun_foyer` ; sans
  session → `401` ; **`member` qui exécute `update user_profile set role = 'owner'` sous `authenticated` → refusé avec le code `42501` (pas `23505` : le test épingle le code, sinon seul l'index unique parlerait), rien changé ; l'`owner` ne peut pas se rétrograder, ni le membre se promouvoir ensuite ; le déclencheur de promotion passe malgré la garde** ; deux `owner` refusés par l'index ; l'insertion d'un premier profil donne `owner`, du second `member`,
  même avec `role = 'owner'` écrit à la main ; **la suppression de l'`owner` (par `delete from user_profile`, par `delete
  from auth.users`, par `delete_my_account()` de l'appli actuelle) promeut le membre restant** ; la suppression du dernier
  profil emporte le foyer sans erreur ; **après chacune de ces suppressions, tout foyer non vide a exactement un
  `owner`** (requête de contrôle) ; remplissage : à égalité de `created_at`, le plus petit `id` ; `tests/db` vert avant et
  après (l'appli actuelle : `create_household`, `accept-invite`, `delete_my_account`) ; `ops/aligne_droits.py` sans écart ;
  contrat régénéré, additions seulement (`oasdiff` sans rupture).
- Mutations : retirer le déclencheur de garde du rôle (le test d'élévation casse) ; retirer celui du transfert ; poser
  `role = 'member'` par défaut sans le déclencheur d'insertion ; oublier `PersonneDuFoyer` sur la route.
- **Retour arrière :** retirer les routes et les champs ; `drop trigger` ×3, `drop index`, `drop column role`.

### F3 (R3) : Quitter le foyer, la base (migration 0160)

**Pourquoi :** décisions du 13/11 (compte gardé 30 jours) ; C2 à C6 ; spec § 9 R3. Cette tâche pose tout ce que le
départ et l'état « sans foyer » exigent de la base ; F4 n'ajoute que la route. **Dépend de :** F1b (file d'envoi), F2, S6 (verrou de
personne), S11, S12 amendé (liens), S14 amendé (A6 : `private.sort_du_foyer`, `private.efface_le_compte`).

**Fichiers :** `supabase/migrations/0160_quitter_le_foyer.sql`, `src/popote_api/security/journal_securite.py`
(`foyer_quitte`, `role_transfere`), tests `tests/integration/test_quitter_le_foyer_sql.py`,
`tests/integration/test_parite_des_departs.py`, `tests/integration/test_course_depart.py`,
`tests/integration/test_export_de_la_personne.py`, `tests/db/sans-foyer.test.ts`, `tests/integration/test_surface.py`,
`docs/schema.md`, `docs/securite.md`.

- [ ] **`account_departure`** : `person_id uuid primary key references auth.users (id) on delete cascade`, `first_name
  text`, `left_at timestamptz not null`, `scheduled_deletion_at timestamptz not null` (CHECK : `= left_at + interval '720 hours'`,
  pas `'30 days'` : dépendant du fuseau de la session, un `UPDATE` quelconque réévaluerait la contrainte), `other_member_id uuid
  references public.user_profile (id) on delete set null` (**la personne restée dans le foyer**, ou `null` ; indexé ; son prénom se lit à la volée, jamais
  copié),
  `left_reason text not null check (left_reason in ('left', 'removed'))` (partie d'elle-même, ou retirée par le responsable),
  `removed_by uuid references public.user_profile (id) on delete set null` (nul quand `left_reason = 'left'`), `reminder_queued_at`
  (le rappel est mis en file une fois, F8), `archive jsonb not null` (**aucune limite de taille, aucune troncature** : voir la copie
  ci-dessous). **RLS activée et forcée, aucun droit** pour
  personne ; on n'y accède que par des fonctions.
- [ ] **Clé étrangère d'`idempotency_key`** (C6) : `person_id` référence `auth.users (id) on delete cascade` ;
  `add constraint … not valid`, `validate`, retrait de l'ancienne. **C'est la seule contraction du plan** : elle se justifie parce que l'appli en ligne n'écrit pas dans
  `idempotency_key` (0135 date de 0.3 ; aucune occurrence dans `tests/db/front-fige`), **à reconfirmer sur l'état de l'essai et de
  la prod avant la fusion**. Conséquence : `private.efface_le_compte` (A6) **supprime désormais explicitement** les lignes d'idempotence de la personne (elles ne partent plus en cascade avec
  le profil) ; cette fonction est redéfinie ici (`create or replace`, même signature) et supprime aussi la ligne
  `account_departure` (la copie de données ne survit pas à un `DELETE /me` dont l'appel à Auth échoue).
- [ ] **`private.personne_peut_entrer(p_person)`** redéfinie (A1) : un profil **ou** une ligne `account_departure`, ni bannie ni supprimée, **et absente de `compte_a_supprimer`** (S14 : un compte dont les données sont parties et dont Auth reste à
  vider n'entre plus). Les trois chemins d'entrée (code, clé, acceptation) s'en servent déjà : une personne partie
  peut donc demander un code, se connecter par clé, et recevoir le mail d'avis.
- [ ] **`private.export_de_la_personne(p_person) returns jsonb`** : **ses seules données** : profil (`display_name`,
  `entre_le`, `created_at`), `nutrition_target`, `revenu`, comptes `perso`, charges où elle est la seule participante,
  `depense_part` et `saisie` (`saisi_par`) qui sont à elle, `meal_slot`, `rappel_reglage`, `rappel_envoye`,
  `aide_signalement`, `versement_epargne` et `cloture_choix` à son identifiant, **les recettes dont elle est l'auteure (`recipe.created_by` : identifiant, titre, date : l'identifiant d'auteur est une donnée relative à la personne ; la recette reste au foyer, sa fiche n'est pas copiée)**. **Garde-fou** : un test d'introspection
  (comme `tables_de_foyer()` et `rgpd.test.ts` pour `export_my_data`) échoue quand une colonne qui désigne une personne
  (`user_profile_id`, `titulaire_id`, `saisi_par`, `for_user_id`, `user_id`, `assignee_id`, `paye_par`, `modifie_par`,
  `cloture_par`, `by_user_id`, `person_id`, `created_by`, `accepted_by`) n'est ni dans l'export ni dans une **liste
  d'exceptions écrite avec sa raison** (par exemple `portion.for_user_id` : la barquette est au foyer, sans lien avec une personne une fois le profil parti ; **`recipe.created_by` n'est plus une exception**). Pas d'adresse e-mail dans la copie (elle est dans Auth) ; l'export HTTP (F10) l'ajoute. **Taille et durée** : **aucune limite de taille, aucune troncature** (un droit d'accès ne se tronque pas) ;
  **la durée est bornée et prouvée** : `quitte_le_foyer` et `retire_un_membre` portent leur propre `set statement_timeout = '20s'` (sous les 25 s de la
  route, `limites.Delai`, et au-dessus des 8 s des transactions de personne, `infra/db.py:52`) ; **test : un foyer semé sur trois ans de données
  réalistes (charges, lignes de budget, repas, saisies) est copié en moins de 5 s, le départ entier en moins de 15 s** ; si la mesure dépasse, la
  copie se construit **hors de la transaction de la route** (route en deux temps : `POST …/household-departure-preparations` fige la copie dans une
  table tampon, puis le départ la reprend sous les verrous) : le choix se fait sur la mesure, écrite dans `docs/preuves-0.2.md`.
  Les lignes de `depense_part`, `cloture_choix` et `versement_epargne` qui portent son identifiant et **restent** au foyer (C4) sont dans la
  copie.
- [ ] **Deux lectures pour l'API** (`security definer`, `execute` à `authenticated` seul, cadrées sur `auth.uid()`, car
  la table n'a aucun droit) : `public.ma_sortie()` (date de départ, date d'effacement, prénom de l'autre lu à la volée dans
  son profil, `null` s'il a disparu) pour `GET /me` (F4), et `public.mon_export()` (son export : la copie du départ si elle est sans foyer, l'export vivant
  de `export_de_la_personne` sinon ; pour F10).
- [ ] **`public.quitte_le_foyer()`** (`security definer`, `search_path = ''`, `execute` à `authenticated` seul, rend une
  ligne **sans adresse** : `issue` (`ok`, `aucun_foyer`, `seule_dans_le_foyer`), `scheduled_deletion_at`, `left_at`, `restant_id`,
  `partant_first_name`, `etait_owner`). Dans cet ordre, **un seul appel** :
  (1) lit le profil sans verrou ; absent → `aucun_foyer` ; (2) `public.verrou_du_foyer(foyer)` (0095:18), puis le **verrou d'invitation du foyer** (`pg_advisory_xact_lock(hashtext('invitation'),
  hashtext(foyer))`, celui de `cree_invitation`, 0142:88 : comme S14), puis `private.verrouille_la_personne(auth.uid())` :
  **foyer, invitation, personne, puis lignes** ; (3) relit le profil sous le verrou
  (R4 a pu le retirer entre-temps) ; (4) personne d'autre dans le foyer → `seule_dans_le_foyer` (la personne doit supprimer
  son compte) ; (5) copie ses données (`export_de_la_personne`) ; (6) **`private.revoque_les_liens_de(auth.uid())`** (fonction commune de S14, A6 : révoque ses liens en attente et efface
  prénom et e-mail de l'invité **avant** de supprimer le profil, C11 : `created_by` passerait à `null`) ; (7)
  **`private.sort_du_foyer(auth.uid())`** (les effets sur le budget : C4, jamais réécrits ici) ; (8) supprime ses lignes
  d'idempotence ; (9) insère `account_departure` (`scheduled_deletion_at = left_at + interval '720 hours'`, `other_member_id` = le
  membre restant, le responsable s'il y en a plusieurs ; `left_reason = 'left'`) ; (10) **met en file le mail « départ de l'autre »** pour le membre restant (`private.met_en_file`, F1b : clé = l'identifiant de la
  personne partie et `left_at`, paramètre = son prénom) ; (11) écrit `foyer_quitte` (et `role_transfere` si elle était `owner`). **Elle ne touche ni aux sessions, ni aux codes, ni aux clés d'accès de la personne** : elle reste connectée.
- [ ] **Déclencheur sur `user_profile`** (**avant** insertion pour le refus, **après** pour l'effacement) : il **prend le verrou de la
  personne** (`private.verrouille_la_personne(new.id)`, comme l'effacement de F8) ; **refuse** (`raise`, erreur traduite en `503`
  par `erreurs_base`) la création d'un profil pour une personne de `compte_a_supprimer` (son compte Auth va disparaître et emporterait le
  profil) ; sinon `delete from public.account_departure where person_id = new.id`. Un profil créé par **n'importe quel chemin** (acceptation
  d'une invitation, **Edge Function `accept-invite` qui insère directement**, C18, `create_household`) annule l'effacement prévu, efface la
  copie, et **se sérialise avec l'effacement quotidien** (C'est ce qui garantit « une personne revenue dans un foyer n'est jamais
  effacée » sans que chaque chemin y pense ; l'ordre inverse est couvert par le refus.)
- [ ] Types d'événement `foyer_quitte`, `role_transfere` ajoutés au CHECK de `security_event` et à `Evenement`.
- [ ] **Règle du budget, un mois ouvert (décision 1)** : dans `sort_du_foyer` rien ne change (C19) ; ce qui change est **écrit et testé** : une
  ligne **confirmée** du mois ouvert garde son partage (sa part reste attachée à l'identifiant de la personne partie) ; les lignes non
  confirmées du mois ouvert et les mois suivants passent à 100 % pour la personne qui reste ; les mois clôturés gardent leur `reste_cents`.
- Cas de test : membre qui part ; `owner` qui part avec un membre (le rôle passe, `role_transfere`) ; personne seule →
  `seule_dans_le_foyer`, **rien n'est changé** ; sans profil → `aucun_foyer` ; la ligne : `scheduled_deletion_at` exactement
  à 720 heures de `left_at`, **y compris pour une session en `Europe/Paris` au changement d'heure** (un `UPDATE` de `reminder_queued_at` ne casse pas le CHECK), `other_member_id` et `left_reason` bons, copie non vide ; **ses sessions, codes et clés sont intacts** ; ses liens
  en attente sont révoqués, prénom et e-mail de l'invité effacés ; **parité des départs** (`test_parite_des_departs.py` :
  deux foyers semés à l'identique, le même scénario que `tests/db/budget-depart.test.ts` (charge perso avec et sans
  histoire, saisies dans un mois clôturé, versement, revenu du seul membre qui en avait un, comptes perso actifs et
  archivés) : sur le foyer A la personne **quitte**, sur le foyer B elle **supprime son compte**, **plus le scénario de la revue : loyer commun confirmé à 50/50 en novembre, départ le 13 : le loyer
  reste à 50/50, une charge commune non confirmée et décembre passent à 100 % pour la personne qui reste** : **les mêmes lignes dans
  chaque table de foyer** (`tables_de_foyer()` : comptes par table et somme de contrôle, **y compris `depense_part`,
  `cloture_choix` et `versement_epargne`, qui gardent l'identifiant de la personne dans les deux cas**, C4), à la ligne
  `account_departure`, aux sessions et au journal près) ; la copie contient ses revenus, et **ni ceux de l'autre, ni son
  prénom** ; `tests/db/sans-foyer.test.ts` : **le test lit les politiques réelles de la base (`pg_policy`) et, pour chaque table à RLS de
  `public` (pas une liste écrite à la main), une personne sans profil ne lit rien du foyer, ne peut ni insérer (`42501` ou clé étrangère), ni
  modifier, ni supprimer (0 ligne)** ; un test d'architecture échoue si une politique d'écriture nouvelle s'ouvre sans `current_household()` (généralise `isolation.test.ts:108-114`, qui n'en couvre que 4 en
  lecture) ; **exception écrite avec sa raison : le catalogue** (`recipe` à `owner_household_id` nul, C13) reste lisible, mais
  **n'est plus modifiable** : la migration ajoute `current_household() is not null` aux **quatre** politiques de mise à jour (`recipe_update`,
  `recipe_ingredient_update`, `recipe_step_update`, `recipe_nutrition_update`, C20) ; **y compris avec un client Supabase ouvert avant le départ** ; `create_household()` appelée par la personne
  partie : **refusée** (« création de foyer fermée », C10 ; le test ne rouvre le réglage que pour prouver, dans ce cas à part,
  que le déclencheur de la ligne de départ s'applique aussi à ce chemin) ; le plan note pour 0.7 de retirer son `execute` ; **course : la personne qui part est en train de créer un lien d'invitation** (`cree_invitation_par_mail` attend le verrou
  d'invitation, puis le profil a disparu : aucune création, ou un lien révoqué ; **jamais un lien valable sans hôte avec prénom et
  e-mail**) ; **deux départs en même
  temps** (course, S6) : un seul `ok`, l'autre `aucun_foyer` ou `seule_dans_le_foyer` ; **A part, B retiré par R4 au même
  moment** : serialisés par le verrou du foyer, un seul résultat ; une connexion par code de la personne qui part, en vol :
  elle attend le verrou, puis réussit (sa session existe, sans accès au foyer) ; erreur de base injectée au milieu
  (déclencheur qui lève sur `account_departure`) → **tout est annulé** : la personne est toujours dans le foyer, son
  profil et ses charges intacts ; `tests/db` (`rgpd`, `charges`, `budget-*`, `invitation`) vert avant et après ; surface :
  `anon` et `authenticated` sans droit sur `account_departure`, `execute` de `quitte_le_foyer` à `authenticated` seul.
- Mutations : oublier le transfert (déjà F2) ; ne pas poser la date ; ne pas copier les données ; copier aussi les
  données de l'autre ; supprimer les sessions de la personne ; sortir du foyer **sans** `sort_du_foyer` ; omettre le verrou d'invitation ; prendre le verrou de
  personne avant celui du foyer ; laisser l'une des quatre politiques du catalogue ouverte sans profil ; ne pas prendre le verrou de personne dans le déclencheur de retour ; ne pas refuser le profil d'une personne de `compte_a_supprimer` ; poser le CHECK en `'30 days'` ; supprimer la ligne de départ **hors** du déclencheur seulement.
- **Retour arrière, en deux temps** : (1) **d'abord le code** (les routes F4, F5, F6 et le déclencheur), pour qu'aucun appel ne dépende des
  objets ; (2) puis la migration : `drop function public.quitte_le_foyer`, `private.export_de_la_personne` ; `drop trigger` ; **la table
  `account_departure` n'est supprimée qu'après l'export à la main de ses copies** (`ops/exporte_les_copies.py`, `docs/exploitation.md` : la
  personne perd sinon son export) ; **la clé étrangère d'idempotence ne revient pas vers `user_profile` tant qu'il existe des lignes pour
  des personnes sans profil** (la nouvelle est inoffensive : on la garde) ; `private.efface_le_compte`, `personne_peut_entrer` et les
  politiques du catalogue d'avant.
- **Coupe prévue si > 400 lignes :** table, clé d'idempotence, export et garde-fou d'introspection (F3a) ; puis
  `quitte_le_foyer`, déclencheur, parité et courses (F3b).

### F4 (R3) : Quitter le foyer, la route et le mail

**Pourquoi :** spec § 4.10 « Quitter le foyer », § 9 R3. **Dépend de :** F1, F1b (mail et file d'envoi), F3.

**Fichiers :** `src/popote_api/api/foyer.py` (`POST /me/household-departure`), `schemas/foyer.py`, `api/moi.py`
(`GET /me` lit `public.ma_sortie()`, F3), `main.py`, tests `tests/integration/test_depart_http.py`, `tests/authz/test_matrice.py`,
`tests/unit/test_posts_idempotents.py` (exemption écrite), `docs/normes-api.md`.

- [ ] `POST /api/v1/me/household-departure` : dépendances, dans cet ordre, `PersonneDuFoyer` puis
  `EXIGE_UNE_REAUTHENTIFICATION` ; un seul appel `select * from public.quitte_le_foyer()` sous `base.personne()` ;
  traduction : `aucun_foyer` → `403`, `seule_dans_le_foyer` → `409` (texte à fournir par la session de conception ; la spec § 4.10 dit
  « Tu es seule dans le foyer : il disparaît avec toi. ») ; `200 {left_at,
  scheduled_deletion_at}`, `Cache-Control: no-store`. **Sans `Idempotency-Key`**, exemption écrite avec sa raison (C6 : la
  ligne d'idempotence référence le profil qui n'existe plus ; la route est sûre à rejouer : le second appel rend `403
  aucun_foyer`).
- [ ] **Le mail « départ de l'autre »** est **déjà dans la file d'envoi** (écrit par `quitte_le_foyer`, dans la même transaction, F3) :
  après la réponse la route appelle `vide_la_file` (F1b) ; échec d'envoi : type d'erreur seul au journal, réponse inchangée, la tâche
  quotidienne reprend ; livré **au moins une fois** ; **aucune adresse ni prénom dans la réponse HTTP**.
- [ ] `GET /api/v1/me` rend `scheduled_deletion_at`, `left_household_at`, `left_reason` (`left` ou `removed`) et `other_member_first_name` (le prénom de **la personne restée**, lu à la
  volée par une fonction `security definer`, `null` si l'autre a supprimé son compte entre-temps).
- Cas de test : succès (`member`, puis `owner`) ; **le cookie reste valable**, `GET /me` montre `household: null` et la date,
  `GET /household` → `403 aucun_foyer` ; la même session sur un deuxième appareil aussi ; personne seule → `409` ; sans preuve
  → `403 reauthentification_requise` (299 s passe, 301 s refuse) ; sans foyer → `403 aucun_foyer` (**avant** la preuve : un
  test fixe l'ordre) ; deux appels simultanés → un `200` ; le mail est **mis en file une fois**, **pas du tout** si
  la transaction est annulée, et reste en file (envoyé par la tâche quotidienne) si le processus meurt après la validation ; l'échec d'envoi ne change ni le statut ni le corps ; `caplog` sans prénom, adresse ;
  rejouer après le départ → `403` (le front, après une erreur réseau, relit `GET /me` avant de réessayer : écart 12) ; matrice d'autorisation : `moi`, `un autre foyer`, `sans foyer`, `sans session` ;
  contrat (additions).
- Mutations : écrire le mail hors de la transaction de l'effet ; inverser l'ordre des dépendances ; omettre la preuve récente.
- **Retour arrière :** retirer la route et les champs de `GET /me`.

### F5 (R4) : Retirer l'autre personne (migration 0161)

**Pourquoi :** décision du 13/11 (réservé au responsable actuel du foyer, `owner`) ; spec § 4.10 « Retirer », § 9 R4 ;
leçon 1 de T15b (une connexion en vol ne survit pas). **Dépend de :** F3 (`sort_du_foyer`, `account_departure`), F1 et F1b (mail et file d'envoi).

**Fichiers :** `supabase/migrations/0161_retirer_un_membre.sql`, `src/popote_api/api/foyer.py` (`DELETE
/household/members/{member_id}`), `security/journal_securite.py` (`membre_retire`), tests
`tests/integration/test_retirer_un_membre.py`, `tests/integration/test_course_retrait.py`,
`tests/integration/test_parite_des_departs.py` (étendu), `tests/authz/test_matrice.py`, `docs/securite.md`.

- [ ] **`private.ferme_toutes_les_sessions_de(p_person)`** (nouveau nom ; l'architecture de S6 y reconnaît l'écriture de
  `login_session.revoked_at` : **elle prend `verrouille_la_personne(p_person)` en premier**) : révoque **toutes** les
  sessions de la personne, ses codes de connexion en attente, et ferme les sessions de GoTrue
  (`private.ferme_les_sessions_auth`, 0141:37). Elle ne supprime ni clé d'accès ni compte.
- [ ] **`public.retire_un_membre(p_membre uuid)`** (`security definer`, `search_path = ''`, `execute` à `authenticated`
  seul ; rend `issue` : `ok`, `aucun_foyer`, `reserve_au_createur`, `membre_introuvable`, `retrait_de_soi`, et pour `ok` :
  `scheduled_deletion_at` ; **aucune adresse** : le mail « retrait du foyer » est mis en file par la fonction, F1b). Dans cet ordre : (1) foyer de
  l'appelant sans verrou, absent → `aucun_foyer` ; (2) **verrou du foyer**, **verrou d'invitation du foyer** (celui de `cree_invitation`, comme S14), puis **verrou de personne du retiré** ; (3) relit
  **sous le verrou** le rôle de l'appelant : pas `owner` → `reserve_au_createur` ; (4) `p_membre = auth.uid()` →
  `retrait_de_soi` ; (5) `p_membre` n'est pas dans **ce** foyer → `membre_introuvable` (même issue pour un identifiant
  inconnu et pour celui d'un autre foyer) ; (6) copie ses données ; (7) `private.revoque_les_liens_de(p_membre)` (fonction commune de S14) **et suppression de ses lignes d'`idempotency_key`** (A3 : une personne retirée qui se reconnecte ne rejoue rien) ; (8)
  `private.ferme_toutes_les_sessions_de(p_membre)` ; (9) `private.sort_du_foyer(p_membre)` ; (10) insère
  `account_departure` (`left_reason = 'removed'`, `removed_by` = l'appelant, `other_member_id` = l'appelant, `scheduled_deletion_at` = + 30 jours) ;
  (11) `membre_retire`. Tout dans **la même transaction** que la fermeture des sessions : c'est ce qui rend « une
  connexion en vol ne survit pas ».
- [ ] **Risque de réutilisation (C4, C5)** : `sort_du_foyer` a été écrit pour tourner sous l'identité de la personne qui
  part ; ici `auth.uid()` est le **responsable**. `retire_charge` lit `current_household()` (le même foyer : sans
  conséquence) mais **chaque garde de la base qui lit `auth.uid()` plutôt que `current_user` refuserait un effacement
  fait par un autre**. Le test de parité (F3) rejoue donc **les mêmes scénarios de `budget-depart.test.ts` par le chemin
  R4** (appelant = `owner`, retiré = `member`), sur trois chemins (supprimer, quitter, retirer) : mêmes lignes dans
  chaque table de foyer. S'il casse, la correction est dans la garde fautive (ou dans `sort_du_foyer`), **jamais** un
  `set_config('request.jwt.claims', …)` pour se faire passer pour la personne retirée.
- [ ] `DELETE /api/v1/household/members/{member_id}` : dépendances dans cet ordre : `PersonneDuFoyer`, **contrôle du
  rôle** (un `member` reçoit `403 reserve_au_createur` **sans** qu'on lui demande une preuve), puis
  `EXIGE_UNE_REAUTHENTIFICATION` ; `204` ; traduction des issues ; le mail « retrait du foyer » (objet « Tu n'es plus dans le foyer de {Hôte} », repli si le prénom est refusé) est
  déjà dans la file ; la route appelle `vide_la_file` après la réponse. **`PersonneDuFoyer` précède l'exigence d'idempotence sur les
  routes de foyer** (C21) : le rejeu ne contourne pas la garde.
- Cas de test : l'`owner` retire le membre (`204`, sessions fermées, `account_departure` posée, mail) ; **le membre essaie de
  retirer l'`owner` → `403 reserve_au_createur`, même sans preuve** ; l'`owner` se retire lui-même → `409 retrait_de_soi` ;
  identifiant d'un autre foyer et identifiant inconnu → `404 membre_introuvable`, **même corps** ; sans preuve
  → `403 reauthentification_requise` ; la personne retirée est déconnectée à sa requête suivante (`401`), **toutes** ses
  sessions, et ses codes en attente révoqués ; **elle peut ensuite demander un code, se reconnecter, et ne lit rien du
  foyer** ; **course (S6)** : A = retrait (tient le verrou, ne valide pas), B = connexion par code puis par clé de la
  personne retirée : B attend (`pg_stat_activity`), A valide, B ouvre une session **postérieure** au retrait et **sans accès
  au foyer** ; **A = l'`owner` quitte le foyer (F3) pendant que B = le membre tente de retirer l'`owner`** : un seul
  résultat, jamais deux `owner` ni zéro ; `owner` qui retire alors qu'une requête de la personne retirée rafraîchit sa
  session périmée → au pire `503 reessayer`, rien de validé à moitié (C12) ; liens de la personne retirée révoqués ; **ses réponses d'idempotence supprimées : elle se reconnecte, rejoue une ancienne clé de `POST /me/invitations` et ne reçoit aucune réponse gardée (`403 aucun_foyer`)** ; mail
  mis en file une fois, dans la transaction ; parité sur les trois chemins ; matrice (`moi`, `autre foyer`, `sans foyer`, `sans session`).
- Mutations : oublier le contrôle du rôle ; contrôler le rôle **hors** du verrou ; ne pas fermer les sessions ; fermer les
  sessions **hors** de la transaction ; accepter l'identifiant d'un autre foyer ; renvoyer un statut différent pour
  un identifiant inconnu ; ne pas révoquer les liens ; ne pas supprimer les réponses d'idempotence de la personne retirée.
- **Retour arrière :** retirer la route ; `drop function public.retire_un_membre`, `private.ferme_toutes_les_sessions_de`.

### F6 (R6) : Supprimer son compte : le transfert et le mail « départ de l'autre » (migration 0162)

**Pourquoi :** décision du 13/11 (le membre restant garde le foyer) ; § 9 R6. Le transfert **est déjà fait par la
base** (F2, déclencheur `AFTER DELETE`) : cette tâche ne le réécrit pas, elle livre le mail et prouve le parcours.
**Dépend de :** F1, F2, F3, S14 amendé.

**Fichiers :** `supabase/migrations/0162_bilan_de_la_suppression.sql`, `src/popote_api/api/moi.py` (`DELETE /me`),
tests `tests/integration/test_suppression_route.py` (étendu), `tests/integration/test_suppression_foyer.py`.

- [ ] `public.efface_mes_donnees_avec_bilan()` (**nom nouveau** ; `efface_mes_donnees()` garde sa signature : l'appli
  actuelle l'appelle par `delete_my_account`) : mêmes verrous et mêmes effets que S14 amendé, et rend, **sans adresse**, `restant_id`,
  `partant_first_name`, `seule` (le mail est mis en file par la fonction, F1b) ; `efface_mes_donnees()` l'appelle et jette le
  bilan.
- [ ] `DELETE /api/v1/me` appelle la fonction avec bilan, et, **après la réponse, vide la file** (le mail « départ de l'autre » y est déjà, mis par la fonction)
  s'il reste quelqu'un (quel que soit le rôle de la personne qui part : le texte « le foyer est à toi » vaut pour
  les deux). Seule dans le foyer : pas de mail, le foyer disparaît, les invitations en attente sont révoquées (S14).
  Une personne **sans foyer** (compte gardé 30 jours) qui supprime son compte : la ligne `account_departure` et la copie
  partent avec elle (F3).
- Cas de test : l'`owner` supprime avec un membre : le membre devient `owner`, foyer intact (recettes, frigo, mois clôturés
  gardent leurs chiffres), les charges communes **encore à régler** passent au membre (une ligne confirmée garde son partage), mail mis en file une fois ; le `member` supprime : l'`owner` reste,
  mail ; seule : foyer, factures, lignes disparaissent, liens révoqués, pas de mail ; **deux suppressions simultanées des
  deux membres** : aucune erreur `500`, foyer disparu, aucune ligne orpheline (comptes par table) ; une personne sans foyer
  supprime : plus aucune ligne `account_departure`, plus d'idempotence, plus de clé ; `503 suppression_incomplete` (Auth en
  panne) laisse la personne **sans copie de données** ; le mail n'est jamais mis en file si la transaction échoue ; contrat
  inchangé.
- Mutations : écrire le mail hors de la transaction ; oublier de supprimer `account_departure` dans le chemin
  « sans foyer ».
- **Retour arrière :** `delete from` rien ; `drop function public.efface_mes_donnees_avec_bilan` ; `DELETE /me` d'avant.

### F7 : Accepter une invitation quand on est sans foyer (recoupement S13)

**Pourquoi :** spec § 4.7 et § 4.10 (« J'ai une nouvelle invitation ») ; décision du 13/11 (rejoindre un foyer par une
nouvelle invitation). Aucun code neuf côté acceptation : une personne sans profil est **déjà** une « reprise » de S13 ;
la ligne de départ tombe par le déclencheur de F3 ; reste à **prouver** le parcours et à poser « foyer complet ».
**Dépend de :** F3, S13 amendé (A5), S12 amendé (A4).

**Fichiers :** tests `tests/integration/test_acceptation_sans_foyer.py`,
`tests/integration/test_course_acceptation_effacement.py`, `docs/securite.md`.

- [ ] Prouver, par l'API, le parcours de la personne partie qui accepte une invitation envoyée **à son adresse** (par
  l'ancien foyer ou par un autre) : reprise (S13, étape 7), profil créé **dans le foyer du lien**, rôle `member`, la ligne
  `account_departure` et sa copie **ont disparu**, `scheduled_deletion_at` n'existe plus, la tâche quotidienne ne la
  touche pas.
- [ ] Prouver que **l'acceptation prend `first_name`** (prénom corrigé par l'invitée, filtré par `prenom_valide`, `422` s'il est refusé, celui de
  l'invitation s'il est absent) et que **l'inspection publique ne rend jamais l'adresse** ; prouver **`409 deja_dans_un_foyer`** quand la session présentée a déjà un
  foyer, `409 compte_existant` quand le compte a un profil sans session correspondante.
- [ ] Prouver `409 foyer_complet` (deux membres déjà) **avant** la consommation du lien, avec le code d'invitation de
  secours aussi ; `409 compte_existant` pour une personne qui **a** un profil (le front choisit « Tu fais déjà partie
  d'un foyer » en lisant `GET /me`).
- Cas de test : acceptation par la personne partie, **cookie encore ouvert** (la session présentée est révoquée, B22) et
  **sans cookie** ; foyer d'accueil à un membre (elle devient la deuxième) ; foyer d'accueil complet → `409
  foyer_complet`, lien valable, ligne de départ intacte ; **course 1** : A = effacement quotidien (tient le verrou de
  personne), B = acceptation : A valide d'abord → B est refusée (`503 reessayer`, voir la course 2), jamais `500` ; B valide
  d'abord → A ne trouve plus de ligne et n'efface rien ; **course 2, la fenêtre entre la base et Auth** : A = effacement SQL
  validé (la personne est inscrite dans `compte_a_supprimer` **dans la même transaction**), l'appel à Auth pas encore fait ;
  B = acceptation du lien de cette adresse : **refusée** (`503` + `Retry-After`, `compte_pour_acceptation` et
  `personne_peut_entrer` refusent une personne de `compte_a_supprimer`), **jamais** « reprise puis effacée par Auth » ; une
  fois Auth vidé, la même acceptation crée un compte neuf ; processus tué entre le SQL et Auth : la ligne de
  `compte_a_supprimer` reste, la route de S14 termine ; la copie de données n'est lisible par personne après
  l'acceptation ; ses anciennes données ne lui sont pas rendues (décision 11 du 13/11) ; **elle rejoint le même foyer que celui qu'elle a
  quitté dans les 30 jours** : ses anciennes lignes de `depense_part`, `cloture_choix` et `versement_epargne` (sans clé
  étrangère, C4) portent le même identifiant : elles lui sont de nouveau rattachées (`reste_cents` reste nul) ; cas à
  observer, résultat écrit dans le test ; le prénom de l'invitation prime sur l'ancien (S13, question 5 de 0.4bis).
- Mutations : accepter un lien pour un foyer complet ; effacer la ligne de départ avant le profil ; ne pas inscrire `compte_a_supprimer` dans la transaction d'effacement.
- **Retour arrière :** aucun (tests seulement).

### F8 (R7) : La tâche quotidienne : rappel à J − 7, effacement à J + 30 (migration 0163)

**Pourquoi :** décision du 13/11 (compte gardé 30 jours, rappel à J − 7) ; § 9 R7 ; RGPD art. 17 (sans délai injustifié) ;
C8 (première vraie route interne). **Dépend de :** F3, S14 amendé (`compte_a_supprimer`, `ops/finit_les_suppressions.py`),
F1 et F1b (mail du rappel, file d'envoi).

**Fichiers :** `supabase/migrations/0163_departs_quotidiens.sql`, `src/popote_api/api/internes_departs.py`,
`security/departs.py`, `infra/auth_admin.py` (déjà : `supprime_compte`), `main.py`, `ops/traite_les_departs.py`,
`tests/unit/test_architecture.py` (`base.service()` : la liste fermée gagne ce module), tests
`tests/integration/test_departs_sql.py`, `tests/integration/test_departs_http.py`, `tests/integration/test_course_depart_effacement.py`,
`docs/exploitation.md` (§ internes : première route réelle, planification, requête de contrôle), `docs/securite.md`.

- [ ] **Fonctions de service** (`security definer`, `search_path = ''`, `execute` à `service_role` et `popote_internal` seuls,
  `revoke` du reste) : `public.departs_a_traiter(p_limite int)` (rend des identifiants, **jamais** d'adresse : « à rappeler » =
  `reminder_queued_at is null and scheduled_deletion_at - 7 jours <= now() and scheduled_deletion_at > now()`, « à effacer » =
  `scheduled_deletion_at <= now()`) ; `public.met_en_file_le_rappel_de_depart(p_person)` (sous le verrou de personne, **pose
  `reminder_queued_at` et écrit la ligne de `mail_outbox`** dans la même transaction, clé de dédoublonnage = la personne : **un seul rappel
  mis en file** ; l'envoi est celui de la file, « au moins une fois », F1b) ; `public.efface_un_compte_expire(p_person)` : **verrou de
  personne, puis relit** « aucune ligne de profil, ligne `account_departure` présente, échéance passée » ; sinon ne fait rien et le dit ;
  sinon `private.efface_le_compte(p_person, true)` (**sa vraie signature, A6** : sessions, codes, clés, idempotence, file d'envoi, ligne de
  départ, clés du journal) **et inscrit la personne dans `compte_a_supprimer` dans la même transaction** (il ne reste qu'Auth à vider, et une
  personne de cette table n'entre ni par code, ni par clé, ni par invitation : A1) ; événement `depart_efface` ;
  `public.comptes_a_vider(p_limite int)` (les personnes de `compte_a_supprimer`, **y compris celles d'une passe précédente coupée avant
  Auth**).
- [ ] **`POST /internal/departures/processing`** (signée HMAC, hors du relais, hors du contrat, **sans corps**) : une passe
  de **20 comptes au plus** (rappels d'abord, puis effacements) ; pour chaque effacement : la fonction SQL (qui inscrit aussi la personne dans `compte_a_supprimer`), **puis** — et à chaque passe, pour
  **toutes** les personnes de `compte_a_supprimer`, celles qu'une passe coupée a laissées comprises — `auth_admin.supprime_compte` (un `404` d'Auth
  vaut succès ; la ligne de `compte_a_supprimer` disparaît après Auth) ; si Auth échoue, la ligne reste et la passe continue (la route de S14 fait la
  même chose à la main). **Une coupure entre la base et Auth ne laisse donc jamais un compte oublié.** Réponse `200 {reminders_sent,
  accounts_erased, remaining, abandoned, armed, due}` (des nombres, **aucun** identifiant ni adresse). **Idempotente par construction** (état relu
  en base ; un second appel ne fait rien de plus), comme le demande `internes.py:1-30`. Limites : délai interne plus court
  que 25 s ; **la passe vide la file d'envoi avant de répondre** (rappels, reprises ; le conteneur peut s'endormir juste après la réponse ; le délai de
  `pg_net` est de 60 s) avec un budget de 15 s, le reste attendant la passe suivante ; la réponse porte aussi `armed` (le drapeau
  ci-dessous) et `due` (**nombre de comptes dont l'échéance est passée et qui existent encore après la passe, compté indépendamment du drapeau**) ; `abandoned`
  compte les mails abandonnés (F1b).
- [ ] **Drapeau d'effacement (décision 4)** : `instance_setting.efface_les_departs`, **faux** à la migration. Tant qu'il est faux, la
  passe **rappelle, vide la file et vide `compte_a_supprimer`, mais n'efface aucun compte** : l'ancien chemin d'acceptation, **l'Edge Function
  `accept-invite` qui insère directement le profil** (`index.ts:165`, C18), pourrait encore recréer un profil pendant l'effacement. **Où et quand
  on le ferme** : à J+2, quand la fiche de bascule supprime les Edge Functions (`accept-invite`, `invite` ; spec du socle § 11, « suppression des
  Edge Functions »), **dans la même fiche** : `update instance_setting set value = '{"enabled": true}' where key = 'efface_les_departs'`. Aucun
  départ n'arrive à échéance avant J+30 : le drapeau est armé bien avant le premier effacement ; le déclencheur de retour de F3 (verrou et refus)
  protège dans tous les cas. Le workflow ci-dessous rend visible un drapeau resté faux alors que des comptes sont échus (`armed: false` et lignes
  échues : échec du run).
- [ ] **Planification.** Fonction `public.appelle_les_departs()` calquée sur `appelle_les_rappels()` (0126:557-582) :
  `net.http_post` vers `/internal/departures/processing` avec le **corps fixe `{}`** (celui que `appelle_les_rappels` envoie, 0126:578 : `sha256('')` ne conviendrait pas, `docs/exploitation.md:365-375`)
  et l'en-tête `X-Popote-Signature` calculé en SQL sur ce corps (formule de `docs/exploitation.md:352-363`), la route lisant ce
  corps `{}` et l'ignorant, secret `popote_internal_secret` et adresse lus au coffre (`vault`), enregistrement
  d'un échec (extensions ou secret absents) sans lever ; **`pg_net` répond de façon asynchrone** (« appelée » ne veut pas dire « acceptée ») : la
  fonction note l'identifiant de la requête, et la passe suivante lit `net._http_response` (statut, durée) dans la table
  `depart_passe` (RLS forcée, aucun droit, 120 jours) ; `cron.schedule('departs-quotidiens', '11 4 * * *', …)` posée par
  la migration **seulement si `pg_cron` existe** (avertissement sinon, comme 0126:609-645) ; **le secret et l'adresse sont
  posés à la main, une fois** (geste du propriétaire, regroupé avec 0.7 : F11). **Preuve sur l'essai** (dépend du
  propriétaire, hors PR) : la signature calculée par la base est acceptée par l'API avec **le corps exact que `pg_net` envoie**
  (réserve de `docs/exploitation.md:365-375`). **En doublon, toujours** : un workflow GitHub Actions planifié dans `popote-api`
  (`departs.yml`, 05:07 UTC, `ops/signe_interne.py`, secret d'environnement `POPOTE_INTERNAL_SECRET`) appelle la même route
  (idempotente : un second appel ne fait rien de plus) et **fait échouer le run** si le statut n'est pas `200`, **si `due` > 0 (drapeau armé ou non : un drapeau resté désarmé alors que des
  comptes sont échus est l'alerte voulue)** ou si `abandoned` > 0 (GitHub prévient par mail) : un `404`, un conteneur endormi ou une base en pause ne restent plus silencieux, et
  si `pg_net` ne tient pas la preuve, ce workflow devient la planification. **Tant que ni l'un ni l'autre n'est posé**,
  `ops/traite_les_departs.py` lance la passe à la main et `docs/exploitation.md` dit à qui et quand (au plus tard à chaque
  répétition de la bascule).
- [ ] **Contrôle des lignes en retard** : quotidien (`due` et `abandoned` de la réponse, vus par le workflow ci-dessus) ; la requête
  (`scheduled_deletion_at < now() - interval '2 days'`) est aussi écrite dans `docs/exploitation.md` pour la restauration
  mensuelle.
- Cas de test : à J − 8 (rien), J − 7 (un rappel mis en file), J − 7 puis le lendemain (**pas de second rappel mis en file**), J
  (effacement), J + 1 (déjà fait : rien) ; **processus tué entre l'acceptation par TEM et l'écriture « envoyé »** → doublon possible, écrit
  comme voulu (F1b) ; échec d'envoi → la ligne de la file reste, reprise par la passe suivante ; **coupure entre le SQL et Auth** (processus tué) :
  la personne est dans `compte_a_supprimer`, **la passe suivante appelle Auth et la retire** ; **drapeau faux : aucun effacement, rappels et
  file vidés ; drapeau vrai : effacement** ; **course avec l'Edge Function `accept-invite`** (insertion directe du profil) pendant
  l'effacement : le déclencheur de F3 attend le verrou, puis refuse (compte en cours de suppression) ou efface la ligne de départ si elle est
  encore là ; **`efface_le_compte` est appelée avec ses deux arguments** (test d'appel réel, pas de simulacre) ;
  **signature calculée en SQL sur le corps `{}` acceptée** ; `due` juste **avec le drapeau armé et désarmé** (désarmé, des comptes échus font échouer le workflow) ; **compte revenu
  dans un foyer entre-temps** (la ligne est tombée par le déclencheur) → ni rappel ni effacement ; après l'effacement : plus
  aucune ligne de `account_departure`, `login_*`, `webauthn_*`, `idempotency_key` de la personne, compte Auth supprimé
  (espion) ; Auth en panne → ligne `compte_a_supprimer`, la route de S14 la termine ; plus de 20 comptes → `remaining`
  juste, deux passes les finissent ; **course (S6)** : voir F7 ; signature : sans signature, signature périmée, signature d'un
  autre chemin → `404` ; **rejeu dans les 300 s → même état, aucun deuxième mail** ; `caplog` sans adresse, prénom ; mail du
  rappel : texte exact, objet constant ; liste fermée de `base.service()` à jour ; surface : `execute` à `service_role` seul.
- Mutations : ne pas relire l'état sous le verrou ; mettre le rappel en file sans clé de dédoublonnage ; ne pas vider `compte_a_supprimer` ;
  effacer avec le drapeau faux ; appeler `efface_le_compte` avec un seul argument ; ne pas inscrire `compte_a_supprimer` dans la transaction ; signer le corps vide ; effacer avant l'échéance (un jour d'avance) ; appeler Auth avant la base.
- **Retour arrière :** `cron.unschedule('departs-quotidiens')`, `drop function` des fonctions et `drop table depart_passe`, retirer la route et le workflow ;
  `ops/traite_les_departs.py` reste.
- **Coupe prévue :** les fonctions SQL et leurs tests (F8a) ; la route, le script et la planification (F8b).

### F9 (R1, R8) : Redemander un lien d'invitation (migration 0164)

**Pourquoi :** spec § 4.7 (« Ce lien a expiré »), § 4.5 (« Demande de nouveau lien »), § 9 R1 et R8 ; point de sécurité 4.
**Dépend de :** S12 amendé (colonnes `renewal_*`, statut `expired`, liste, renvoi), S13 (inspection, limites
`invitation_*`), S5 (`prend_un_envoi`, coupe-circuit), F1 et F1b (mail et file d'envoi). **R8 est livré par S12 amendé** (A4) : cette tâche
l'éprouve de bout en bout.

**Fichiers :** `supabase/migrations/0164_demande_de_nouveau_lien.sql`, `src/popote_api/api/invitations_publiques.py`
(+ `POST /invitations/renewal-requests`), `schemas/invitations.py`, `security/invitations.py`,
`security/empreintes.py` (clé de limite du jeton), `routes_publiques.py`, `main.py`, `config.py` (limites),
`security/journal_securite.py` (`renouvellement_demande`), tests `tests/integration/test_renouvellement_de_lien.py`,
`tests/unit/test_posts_idempotents.py`, `tests/integration/test_surface.py`, `docs/normes-api.md`, `docs/securite.md`.

- [ ] **`public.demande_un_renouvellement(p_hash, p_ip_key, p_lien_key, …)`** (`popote_api` seul, **un seul appel**) : (1)
  prend les créneaux `renouvellement_ip` (10 par 15 min) puis `renouvellement_lien` (3 par 15 min) — **les clés viennent de
  la valeur envoyée** (HMAC de l'IP, HMAC du jeton), jamais de l'existence du lien ; un refus rend l'attente ; (2) cherche
  le lien par l'empreinte du jeton ; (3) **éligible** = connu, ni accepté, ni annulé, hôte toujours là (`created_by` non
  nul), **échéance + 7 jours > maintenant** (la grâce de A4 : au-delà, l'e-mail est effacé et l'hôte ne voit plus l'invitation) ; (4) si éligible : pose `renewal_requested_at = now()` ; **met le mail en file** (F1b : `private.met_en_file('demande_de_lien', hôte, …)` **dans la même transaction**) **avec la clé de dédoublonnage `<id de l'invitation>:<fenêtre de 24 h>`**
  (fenêtre = `floor(extract(epoch from now()) / 86400)`, stable pour toutes les demandes d'une même fenêtre : **l'index unique `(kind, dedupe_key)` fait
  l'unicité de façon atomique**, deux demandes concurrentes ne mettent qu'une ligne en file, la fenêtre suivante en autorise une autre ; `ON CONFLICT DO
  NOTHING` ; `renewal_mail_queued_at` est posée seulement quand une ligne a été écrite ; échéance utile : 24 h ; écrit `renouvellement_demande`) et rend l'hôte (adresse, prénom) et le
  prénom de l'invité ; (5) **pour un lien inconnu ou non éligible, une écriture factice de même forme** sur la ligne de
  limite (pas un `where false` : un vrai `update`), aucun événement (une IP ne remplit pas le journal : leçon de S5) ;
  rend toujours une ligne de même forme. Il n'y a **plus** de réservation ni de confirmation propres à R1 : l'envoi, ses reprises et son identifiant TEM sont ceux de la file ;
  **livré au moins une fois**, jamais « un seul mail ».
- [ ] `POST /api/v1/invitations/renewal-requests` `{token}` (publique, entrée fermée `extra="forbid"`, `token` de 256
  caractères au plus ; **aucune `Idempotency-Key`**, exemption écrite : publique, et rejouer une réponse garderait un
  jeton) : validation → clés → fonction → **`202 {message}` toujours** (« Si ce lien existe, la personne qui t'a invité
  le sait. ») ; `429 trop_de_requetes` + `Retry-After` ; `Origin` étranger → `403` sans créneau consommé ; erreur de base →
  `503`. Après la réponse, la route **vide la file** (`vide_la_file`) si la fonction a mis un mail en file ; un échec d'envoi ne change pas la
  réponse, la tâche quotidienne reprend.
- [ ] Ajouter `renewal-requests` à `ROUTES_PUBLIQUES` avec sa raison ; scopes `renouvellement_ip` et `renouvellement_lien` au
  CHECK de `login_throttle` et au test de dérive (S5) ; `renouvellement_demande` à `Evenement`.
- Cas de test : lien échu, valable non accepté → `202`, `renewal_requested_at` posé, **une** mise en file à l'hôte ; **la même
  demande deux fois en une heure → une seule mise en file** ; 24 h plus tard (horloge) → un deuxième ; lien accepté, annulé, inconnu, mal
  formé, 256 caractères → **même statut, même corps, mêmes en-têtes, aucun mail** ; **médiane de durée comparable** entre
  connu et inconnu (même méthode que S5) ; l'ordre : une IP bloquée n'use pas le créneau du lien ; **11 demandes d'une IP →
  la 11e `429` pour tous les jetons** (connus ou non) ; 4 demandes du même jeton → `429` pour tous ; un renvoi par l'hôte
  (`POST …/deliveries`), un lien de secours ou une annulation remettent `renewal_requested_at` à nul et **ne remettent pas à
  zéro** la fenêtre de 24 h des mails ; la liste de l'hôte (`GET /me/invitations`) rend `renewal_requested_at` et le statut
  `expired` pendant la grâce de 7 jours ; après la grâce, le lien et son e-mail ont disparu (S12) ; hôte supprimé → `202`,
  aucun mail ; **l'hôte reçoit le bon mail** (texte exact, prénom filtré, objet « Une demande de nouveau lien », lien vers `/foyer`) **au moins une fois** ; le jeton
  n'est dans aucune colonne, aucun `caplog`, aucune table d'idempotence ; `Origin` étranger → `403` sans créneau ; surface :
  `anon`, `authenticated` sans droit ; exemption d'idempotence écrite.
- Cas de test ajoutés : **10 demandes concurrentes (threads) du même lien → une seule ligne de file** ; fenêtre suivante (horloge) → une deuxième ; **lien échu depuis plus de 7 jours** (e-mail effacé) → `202`, aucun mail, aucun événement ;
  processus tué après la validation de la demande → le mail est **encore en file** et part à la passe quotidienne ; le `410` de l'inspection d'un lien
  **échu pendant la grâce** porte `host_first_name` (A4), l'inspection d'un lien inconnu reste `404` **sans** prénom.
- Mutations : mettre le mail en file hors de la transaction ; ignorer la grâce ; écrire un événement et envoyer pour un lien inconnu ; compter les créneaux seulement pour un lien connu ;
  envoyer sans réserver ; oublier la fenêtre de 24 h ; envoyer pour un lien annulé ; remettre à zéro la fenêtre de 24 h
  au renvoi.
- **Retour arrière :** `drop function` ×2, retirer la route, CHECK d'avant ; les colonnes de S12 restent (inoffensives).

### F10 : Télécharger ses données : `GET /api/v1/me/export` (droit d'accès complet)

**Pourquoi :** C9 : droit d'accès (spec du socle § 7.7 ; CNIL, droit d'accès), l'écran « sans foyer » et `/compte` en dépendent ;
décision 5 du 13/11 : **complet au sens du droit d'accès**, plus aucun « export partiel » présenté comme tel. **Dépend de :** F1b
(file d'envoi), F3 (copie des données). **Coupe prévue :** F10a (les données, sessions, événements, mails) puis F10b (les photos).

**Fichiers :** `src/popote_api/api/export.py`, `schemas/export.py`, `infra/stockage.py` (liens des photos, F10b), `main.py`
(`public.mon_export()` est dans la migration 0160, F3 ; F10a ajoute `public.mes_traces()` : sessions, événements, file d'envoi, par une
migration **0165**, F10a), tests `tests/integration/test_export_http.py`, `tests/integration/test_export_complet.py`,
`tests/authz/test_matrice.py`, `docs/normes-api.md`, `docs/securite.md`.

- [ ] **F10a : `GET /api/v1/me/export`** rend, **pour la personne seule**, un document JSON **assemblé par sections, chacune lue dans sa propre
  transaction courte et paginée par curseur** (500 lignes par page ; **chaque appel borné et mesuré : moins de 5 s sur trois ans de données d'un foyer
  réaliste**, sous le `statement_timeout` de 8 s ; rien n'est agrégé en mémoire : la réponse est **streamée** section par section) ; chaque section est
  aussi lisible seule par `GET /me/export?section=<nom>&cursor=…` (`{items, next_cursor}`) pour un client qui préfère paginer. Les sections :
  (1) **ses données** : avec foyer, `private.export_de_la_personne(auth.uid())` ; **sans foyer, la copie faite au départ**
  (`account_departure.archive`, F3) ; (2) **ce que la base garde d'elle dans `account_departure`** (dates, `left_reason`, `removed_by`, rappel
  mis en file, personne restée : identifiant seulement) ; (3) **ses sessions** (appareil, navigateur, système, dates de création et de dernière
  activité, comment elle est née : `opened_with`, **jamais** l'empreinte du jeton ni l'adresse IP) ; (4) **ses événements de sécurité**
  (`security_event` où `person_id` est elle : type, date ; **jamais** les clés HMAC) ; (5) **ses clés d'accès** (nom, dates, type d'appareil ;
  **jamais** la clé publique ni l'identifiant) ; (6) **les mails qu'on lui a envoyés** : les lignes de `mail_outbox` qui la concernent (genre, date,
  état, identifiant TEM ; `params` est déjà effacé après la remise) et les événements `code_demande` ; **le contenu d'un code n'est jamais gardé** ;
  (7) l'adresse de connexion, `exported_at`, la version du format. `Content-Type: application/json`, `Content-Disposition: attachment;
  filename="popote-mes-donnees.json"`, `Cache-Control: no-store`. **Aucune limite de taille, aucune troncature** ; événement **aucun** (une lecture
  ne s'écrit pas : spec § 3.6) ; limite de débit de lecture existante. **Le contrat ne dit plus « personnelles seulement »** : il dit « complet pour
  la personne ; les données du foyer (recettes, frigo, budget commun) n'y sont pas : elles ne sont pas les siennes ».
- [ ] **F10b : les photos, une par une, en flux** : `storage.objects` porte `owner_id` (relu en base : colonne présente, 80 objets, tous avec
  `owner_id`, seau `photos-des-plats`, public) ; l'export liste **les objets dont `owner_id` est la personne** (nom, seau, taille, date), chacun avec
  son **lien** (adresse publique du seau, ou **lien signé d'une heure** pour un seau privé, fabriqué par `infra/stockage.py`, le seul module qui lit
  la clé secrète). **`GET /api/v1/me/export/photos/{nom}`** lit l'objet par **une seule requête qui sélectionne ensemble `bucket_id`, `name` et
  `owner_id = la personne`** : le nom d'une photo d'une autre personne rend **`404`, sans rien lire du stockage** ; réponse **streamée** (morceaux de
  64 Kio, jamais le fichier en mémoire), `Cache-Control: no-store`, type de contenu relu de l'objet. **À vérifier avant F10b** : que `owner_id`
  identifie bien l'auteur pour tous les seaux (photos de saisie de 0.5 comprises) ; sinon le rattachement est écrit en migration.
- Cas de test : une personne avec foyer reçoit **ses** données, sessions, événements, clés, mails et photos, **ni celles de l'autre, ni son
  prénom, ni son adresse** ; sans foyer : la copie du départ **plus** les traces vivantes ; deux personnes d'un même foyer : chacune reçoit la
  sienne ; une personne **partie puis revenue** reçoit l'export vivant ; **complétude** (test d'introspection, comme `rgpd.test.ts`) : toute
  colonne qui désigne la personne (`person_id`, `user_profile_id`, `owner_id`, `saisi_par`…) d'une table du schéma est dans l'export ou dans une
  liste d'exceptions écrite avec sa raison ; **aucun secret** (empreinte de jeton, clé HMAC, clé publique, IP) dans le document ; une
  copie de plusieurs Mio n'est ni refusée ni tronquée, **chaque section rendue en moins de 5 s sur un foyer de trois ans** (mesure écrite) ; `account_departure` et `recipe.created_by` sont dans l'export ; en-têtes exacts ; sans session → `401` ; `caplog` sans contenu ; matrice
  (`moi`, `un autre foyer` ne reçoit rien de moi, `sans foyer`, `sans session`) ; F10b : les liens d'un autre foyer ne sont jamais rendus,
  lien signé périmé après 1 heure ; **`GET …/photos/{nom}` avec le nom de la photo d'une autre personne → `404`, aucune lecture du stockage (espion)** ; avec le nom d'une photo à soi → flux par morceaux, jamais plus de 64 Kio en mémoire ; photo d'un autre seau au même nom → `404`.
- Mutations : lire la photo par `name` seul (sans `owner_id`) ; agréger tout le JSON en mémoire ; oublier `account_departure` ou `recipe.created_by` ; renvoyer l'export du foyer entier ; lire la copie d'une autre personne ; omettre `no-store` ; mettre l'empreinte d'un
  jeton ou une IP dans l'export ; plafonner la taille.
- **Retour arrière :** retirer la route (et `mes_traces` si elle a sa migration).

### F11 : La preuve de bout en bout et la clôture de 0.4ter

**Pourquoi :** § 9.4 et § 10 du socle ; critères 1 à 7. **Dépend de :** F1 à F10, et les gestes du propriétaire.

**Fichiers :** `tests/integration/test_parcours_foyer.py` (en mémoire, `BoiteDeTest`), `ops/parcours_foyer.py` (essai,
`--a-blanc`, comptes fictifs, nettoyage garanti), `docs/preuves-0.2.md`, `docs/securite.md`, `docs/exploitation.md`,
`docs/ETAT.md` ; (popote-web) la PR qui reporte les lignes dans `2026-11-12-socle-design.md`.

- [ ] Parcours en mémoire, **deux personnes** (Sam, Léa) : invitation par mail → acceptation → `GET /household` → Léa
  quitte (preuve par code) → `/me` sans foyer, export de la copie → rappel (horloge avancée) → Sam réinvite Léa → elle
  accepte (effacement annulé) → Sam la retire (preuve) → sessions fermées → Léa se reconnecte par code, ne lit rien →
  Sam supprime son compte (foyer seul : disparaît) ; **un second parcours** : Sam supprime son compte avec Léa dans le foyer
  (elle devient responsable, mail) ; **un troisième** : le lien expire, l'invitée demande un nouveau lien, Sam renvoie,
  elle accepte.
- [ ] **Matrice d'autorisation** : l'acteur « sans foyer » ajouté à toutes les routes de `/api/v1` (rend `403
  aucun_foyer` sur les routes de foyer, **marche** sur les routes de compte) ; liste fermée des routes de compte écrite.
- [ ] Sur l'essai (`ops/parcours_foyer.py`) : un **vrai mail HTML** vers l'adresse du propriétaire pour l'invitation, le retrait et
  le rappel ; **tâche quotidienne** appelée par la planification choisie en F8 (preuve de la signature) ; mesures de p95
  contre les cibles ; `security_event` sans adresse ni prénom ; journaux du conteneur propres ; **aucun compte, foyer,
  copie de données ni lien de test après la course**, même après un échec provoqué.
- [ ] Mutations de F2 à F9 rejouées ; chacune casse un test.
- [ ] Revue adverse des deux dépôts sur tout 0.4ter (agent Sonnet, effort élevé, lecture seule ; Codex CLI en lecture
  seule en plus). Consigne : retrouver un moyen de lire ou d'écrire le foyer sans profil, de se faire `owner`, de retirer
  le responsable, de garder une session après un retrait, de faire écrire un mail à un tiers sans limite, de ne pas
  effacer un compte à J + 30, d'effacer un compte revenu dans un foyer, une donnée de l'autre dans une copie, un nom ou un
  code dans un objet de mail.
- [ ] Contrat : `openapi.json` régénéré, **additions seulement** ; Schemathesis vert sur les nouvelles routes ;
  exemptions d'`Idempotency-Key` (R1, R3) écrites dans `docs/normes-api.md`.
- [ ] Docs de `popote-api` : `docs/securite.md` (le départ, la copie de données et sa durée, les risques R-A à R-F, la
  tâche quotidienne), `docs/normes-api.md` (routes, erreurs), `docs/exploitation.md` (tâche quotidienne, requête de
  contrôle, redirection des réponses, console TEM sans suivi), `docs/schema.md`, `docs/inventaire-surface.md`,
  `docs/ETAT.md` (court).
- [ ] **Spec :** une PR de `popote-web` reporte dans `2026-11-12-socle-design.md` : les rôles (§ 4 ou § 5), la règle d'un
  départ (§ 5), la conservation de 30 jours et de la copie (§ 7.7), la tâche quotidienne (§ 5.2 ou § 10).
- [ ] **Gestes du propriétaire, regroupés (ne bloquent pas le code)** : poser le secret et l'adresse de la tâche quotidienne dans le
  coffre (ou autoriser le repli GitHub Actions) ; régler la redirection des réponses de `bonjour@notre-popote.fr` vers sa
  boîte (Cloudflare Email Routing ou ce qu'il préfère) ; lire, **en clair et en mode sombre, dans Gmail, Apple Mail et
  Outlook**, les neuf mails de l'essai et dire s'ils sont lisibles ; vérifier avec lui, sur la copie de la prod de la
  répétition, qui est `owner` de son foyer.
- [ ] Mémoire de l'agent mise à jour ; une phrase au propriétaire.

---

## Écarts à la spec d'« Entrer », à relayer à la session de conception

1. **R5** : la spec demande `household`, `role`, `scheduled_deletion_at` ; l'écran « sans foyer » a besoin aussi de
   « depuis le {date} » et du prénom de l'autre (« le foyer de {Hôte} ») : `GET /me` rend en plus `left_household_at`, `left_reason` (`left` ou
   `removed`) et `other_member_first_name` (la **personne restée**, ou `null` ; pas « l'hôte » : un responsable parti lui-même lirait sinon
   « Tu n'es plus dans le foyer de {lui-même} »).
2. **Objets des mails** (spec § 4.6 et § 7) : le code n'est jamais dans l'objet (« Ton code Popote » : Scaleway garde l'objet tant que le
   domaine est actif, S4 de 0.4bis) ; le prénom de l'hôte n'entre que dans l'objet de l'invitation et du retrait, filtré, avec un objet de
   repli ; les autres objets sont constants. La liste des neuf objets est dans F1.
3. **Avis de connexion et d'empreinte** : un seul bouton « Voir mes appareils » (ouvre `/compte`) à la place de « Oui, c'était moi » et
   « Non, déconnecte cet appareil » : un clic de mail qui agit serait suivi par les antivirus de messagerie.
4. **La marmite** est dans les mails, en image statique servie par `notre-popote.fr` (même adresse pour tous, sans paramètre, avec texte
   alternatif) ; le mail reste lisible sans images ; aucune autre image, aucun pixel de suivi. Le fichier `public/mails/marmite.png` est à
   livrer côté `popote-web`.
5. **Statut `expired`** dans la liste des invitations de l'hôte (pendant les 7 jours de grâce) en plus de `sent`, `opened`,
   `accepted`, et `renewal_requested_at` (R8).
6. **`409 foyer_complet`** (deux places) à la création d'une invitation et à l'acceptation : la spec ne le nomme pas.
7. **`403 aucun_foyer`** et non `404` quand la personne n'a pas de foyer (une seule valeur par `type`).
8. **Route de R8** : `GET /api/v1/me/invitations` (celle de 0.4bis), pas `/api/v1/invitations`.
9. **Un lien annulé par l'hôte n'écrit pas à l'hôte** quand l'invitée le rouvre (le plan front d'« Entrer » listait « expiré,
   révoqué » parmi les cas qui envoient un mail).
10. **L'export** (« Télécharger mes données ») est **complet pour la personne** (décision 5 du 13/11) : ses données, ses sessions (sans
    empreinte ni IP), ses événements de sécurité (sans clés), ses clés d'accès, ses photos et les mails qu'on lui a envoyés ; il ne contient pas
    les données du foyer (recettes, frigo, budget commun), qui ne sont pas les siennes.
11. **Le prénom de l'hôte sur l'écran « lien mort »** (spec § 4.7 : « {Hôte} reçoit ta demande ») : l'inspection d'un lien échu rend
    `410` avec `host_first_name` pendant la grâce de 7 jours (A4) ; pour un lien inconnu, `404` sans prénom (l'écran dit « Ce lien est
    incomplet »).
12. **Rejouer R3 ou R4 après une erreur réseau** : si la première requête a abouti, la seconde rend `403 aucun_foyer` ou `404
    membre_introuvable` ; le front relit `GET /me` avant de réessayer ou d'afficher une erreur.
13. **`seats`** vaut **toujours 2** (la capacité) ; `members` dit la vérité si une donnée ancienne (l'Edge Function `accept-invite`
    n'applique pas la règle de deux places) en a plus de deux ; l'API pose la règle pour les invitations qu'elle crée.
14. **Une personne connectée sans profil et sans ligne de départ** (session survivante, orpheline de S13) : `GET /me` rend
    `household: null`, `scheduled_deletion_at: null` ; l'écran « sans foyer » s'ouvre sans échéance (« compte sans foyer »), avec
    « j'ai une invitation » et « supprimer mon compte ».
15. **Texte du budget** (spec § 4.10 et § 7) : « les charges communes **encore à régler** passent à 100 % pour toi » (mail « départ de
    l'autre », écrans « supprimer » et « retirer » : « paie les charges communes en entier » et « les communes passent à 100 % pour toi »
    doivent suivre) : une ligne déjà confirmée garde son partage (décision 1 du 13/11).
16. **Photos** : un départ ne traite pas les photos en stockage au-delà de l'export (0.5, quand les photos de saisie passent par l'API) ; la
    ligne « tout ce qui est à toi disparaît » de la spec § 4.10 vaut pour le compte et ses données de base.
17. **L'acceptation d'une invitation prend `first_name`** (le prénom corrigé par l'invitée, filtré par `prenom_valide`, `422` sinon) ; l'inspection
    publique ne rend **jamais** l'adresse ; **`409 deja_dans_un_foyer`** (la session présentée a déjà un foyer) s'ajoute à `409 compte_existant`,
    `410 invitation_expiree` et `409 foyer_complet` (A5).
18. **Le droit de retirer appartient au responsable actuel** (`owner`, transmis au départ), pas à « celui qui a créé le foyer » ; le type d'erreur garde
    le nom `reserve_au_createur` de la spec R4.
19. **Codes de connexion et invitations restent « au mieux »** (après la réponse, renvoi visible à l'écran) : ils ne passent pas par la file d'envoi.

## Sources vérifiées

Dépôt `popote-api`, `origin/main` `253737d` : les fichiers et lignes de « Constats » ; la pile locale
(`127.0.0.1:54322`, migrations jusqu'à 0146) pour `is_nullable`, les 51 tables de `tables_de_foyer()`, les 171
politiques citant `current_household()`, les clés étrangères vers `user_profile`, les droits de table et de colonne de
`user_profile`, le nom de la contrainte (`invite_link_check`) ; la spec du budget du 01/10
(dépôt `batchcooking`, `docs/superpowers/specs/2026-10-01-ecran-budget-design.md`, § « Le départ du dernier membre », « Les
comptes perso de qui part », « Le détail part, le total reste »).

Plans et spec : `docs/superpowers/plans/2026-11-13-socle-0-4bis-connexion-sans-mot-de-passe.md` (S3, S4, S5, S6, S10b, S11,
S12, S13, S14, S15 et ses amendements), `docs/superpowers/plans/2026-11-12-socle-0-4.md` (lignes 27-28 et 131, export de
0.5), `docs/superpowers/specs/2026-11-12-socle-design.md` (§ 3.2, § 3.3, § 3.6, § 3.10, § 4, § 5.1 à 5.4, § 7.7, § 10,
§ 11), spec et plan front d'« Entrer » du 13/11.

1. **Scaleway Transactional Email, envoi par l'API** (champs `from`, `to`, `subject` de 10 caractères au moins, `text`, `html`,
   `attachments`, `additional_headers`) : https://github.com/scaleway/docs-content/blob/main/pages/transactional-email/api-cli/send-emails-with-api.mdx
   (relu le 13/11/2026). **Limites** (API : 2 Mio, non extensible ; 10 000 mails par mois par défaut ; pas de quota
   horaire) : https://github.com/scaleway/docs-content/blob/main/pages/transactional-email/reference-content/tem-capabilities-and-limits.mdx
   (relu le 13/11/2026 ; la page ne dit rien du suivi des ouvertures ni des images en ligne).
2. **RFC 9457** (Problem Details), **RFC 9110** (403, 404, 409), **RFC 6585** (429, `Retry-After`) : comme le socle
   (§ 13).
3. **WCAG 2.2, critère 1.4.3** (contraste 4,5:1) : https://www.w3.org/TR/WCAG22/#contrast-minimum (test de contraste de F1).
4. **RGPD** art. 2.2.c (usage domestique, cité par `0008_rgpd.sql`), art. 5(1)(c)(e), 15, 17, 20, 25, 32 :
   https://eur-lex.europa.eu/eli/reg/2016/679/oj ; CNIL, guide du développeur et durées de conservation (comme 0.4bis).
5. **OWASP ASVS 5.0.0** chapitres V6 (authentification) et V8 (autorisation), **OWASP API Security Top 10 2023**
   (API1, API5, API6) : comme 0.4bis.
