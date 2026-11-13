# Les notifications push de Popote : de l'abonnement à l'envoi

> **For agentic workers:** REQUIRED SUB-SKILL: Use `sp-subagent-driven-development` (recommended) or `sp-executing-plans` (noms exacts de
> l'outil Skill de cette session, vérifiés le 13/11/2026 ; ce ne sont pas les `superpowers:*` des anciens plans) to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** qu'une personne du foyer active les notifications sur un appareil, que `popote-api` puisse lui en envoyer à une heure
prévue alors que son conteneur dort, et que tout cela soit prouvé de bout en bout par UNE notification : « Envoyer une notification
d'essai » dans les réglages. Les vraies notifications (frigo, dépenses du soir…) viendront d'une spec de la session design et
s'ajouteront chacune par une tâche courte, sans retoucher l'infrastructure.

**Architecture :** (1) le navigateur s'abonne (permission demandée après un geste) et l'API range l'abonnement **rattaché à la session**
de l'appareil (supprimé avec elle) ; (2) tout envoi passe par une **file persistante** `push_outbox`, écrite dans la transaction de
l'effet (sœur de `mail_outbox`, F1b du plan 0.4ter), **sans aucun contenu** : un type, une heure, un abonné ; (3) un **registre de types**
dans le code porte pour chaque notification son texte générique constant, sa durée de vie, son urgence, sa page d'arrivée ; (4)
`pg_cron` regarde chaque minute s'il y a quelque chose d'échu et **ne réveille le conteneur que dans ce cas** (appel signé par
`pg_net`) ; le conteneur chiffre (RFC 8291), signe (VAPID, RFC 8292), envoie, puis s'endort ; un workflow GitHub quotidien veille
sur le tout ; (5) côté front, un service worker à nous (`injectManifest`) reçoit le `push`, affiche, ouvre la bonne page.

**Tech Stack :** `popote-api` (Python 3.13, FastAPI, psycopg 3, `pg_cron`, `pg_net`) + **`http-ece==1.2.1`** (chiffrement RFC 8188/8291)
+ **`py-vapid==1.9.6`** (signature RFC 8292) + `httpx` (déjà là) ; `popote-web` (React 19, `vite-plugin-pwa` 2.0.0,
`workbox-precaching`/`workbox-routing`/`workbox-core` 7.4.1, Vitest, Playwright 1.65.0). Versions vérifiées sur PyPI et npm le 13/11/2026
(voir « Sources »).

**Hors périmètre :** la liste des vraies notifications, leurs textes, leurs horaires et les écrans qui les règlent (session design) ; les
heures calmes ; les badges d'icône ; les notifications entre les deux personnes du foyer (aucun déclencheur n'est posé ici sauf
l'essai) ; la fermeture de la base (0.7) ; le déploiement de la prod (0.8, les clés de prod y sont posées).

---

## Constats vérifiés (13/11/2026)

| N° | Constat | Source ou preuve |
|---|---|---|
| C1 | **Le message déclaratif livré (iOS 18.4) est** `{"web_push": 8030, "notification": {"title" (obligatoire, non vide), "navigate" (obligatoire, URL), "body", "lang", "dir", "silent", "app_badge"}}`. Un service worker peut le remplacer ; s'il ne montre rien à temps, **le message déclaratif sert de repli**. WebKit exige qu'**on montre toujours une notification** (pas de push silencieux) et un abonnement `userVisibleOnly: true` ; sinon l'abonnement est révoqué. | webkit.org/blog/16535 (lu le 13/11) |
| C2 | **L'explainer WebKit sur GitHub décrit une autre forme** (`title`, `options`, `default_action_url`, type de contenu `application/notification+json`). C'est une proposition ; **ce plan suit la forme du blog, celle qui est livrée**. Le type de contenu de la requête n'y est pas imposé : on n'en pose pas de spécial (`application/octet-stream`). À prouver sur l'iPhone (N14). | github.com/WebKit/explainers (DeclarativeWebPush), lu le 13/11 |
| C3 | iPhone : le web push est pour les applis **ajoutées à l'écran d'accueil** (manifeste en `standalone`) ; la permission se demande « en réponse à une interaction directe » ; les serveurs doivent **autoriser `*.push.apple.com`**. | webkit.org/blog/13878 (lu le 13/11) |
| C4 | Un service de push répond `201` quand il accepte, **`404` (ou `410`) quand l'abonnement est expiré**, `413` au-delà de 4096 octets (il ne le fait jamais en dessous), `429` s'il limite ; l'en-tête **`TTL` est obligatoire** ; `Urgency` vaut `very-low`, `low`, `normal` ou `high`. | RFC 8030 §§ 5, 5.2, 5.3, 7.2, 7.3, 8.4 (lu le 13/11) |
| C5 | Hôtes des services : `fcm.googleapis.com` (Chrome, Edge hors Windows), `updates.push.services.mozilla.com` (Firefox), `*.push.apple.com` (Safari), `*.notify.windows.com` (Edge sous Windows ; ses adresses portent une **chaîne de requête** `…/w/?token=…`). Liste de la communauté « known-push-services » ; Apple donne lui-même le joker. | résultats de recherche du 13/11 + C3 ; la liste communautaire n'est pas une norme : le plan la **teste** sur de vraies adresses (N0) |
| C6 | `http-ece` 1.2.1 (08/08/2024) chiffre et déchiffre en `aes128gcm` avec une clé éphémère, la clé publique `p256dh` et le secret `auth` : **aller-retour rejoué avec `cryptography` 50.0.2** ; `py-vapid` 1.9.6 (14/10/2026) signe : l'en-tête rendu est `Authorization: vapid t=…`. | essai du 13/11 dans un environnement jetable |
| C7 | `pywebpush` 2.5.0 (30/08/2026) n'est qu'une fine couche sur ces deux bibliothèques, mais **son envoi suit les redirections, accepte un délai de 10 000 s par défaut, et ses exceptions portent la réponse** ; il tire `requests` et `aiohttp` en plus. **Écarté pour l'envoi** (exigence : aucune redirection, aucun proxy, rien dans les erreurs) ; `http-ece` et `py-vapid` directement, `httpx` (déjà une dépendance) pour la requête. | lecture de `pywebpush/__init__.py` 2.5.0 le 13/11 |
| C8 | Un conteneur Scaleway sans instance minimale **s'arrête après 15 minutes sans requête** ; un déclencheur CRON de conteneur : expression UNIX, **UTC par défaut** (fuseau réglable), méthode choisie (`POST` par défaut), chemin, **en-têtes et corps fixes** ; la doc dit qu'il sert à « waking up the Container at specific times ». Un déclencheur ne peut donc pas porter une signature horodatée. | `docs-content` de Scaleway (dépôt GitHub, `pages/serverless-containers/…`), lu le 13/11 ; les pages `scaleway.com/docs` répondent `403` à un robot |
| C9 | GitHub Actions : « The `schedule` event can be delayed during periods of high loads » ; « some queued jobs may be dropped » ; intervalle minimal 5 minutes ; branche par défaut seulement ; **« In a public repository, scheduled workflows are automatically disabled when no repository activity has occurred in 60 days »**. | docs.github.com, « Events that trigger workflows » (lu le 13/11) |
| C10 | Supabase : un job `pg_cron` peut tourner « from every second to once a year » ; 8 jobs en même temps au plus recommandés, 10 minutes au plus par job. `pg_net` répond de façon **asynchrone** (déjà établi par 0126 et F8). | supabase.com/docs/guides/cron (lu le 13/11) ; 0126 ; plan 0.4ter F8 |
| C11 | **Le chemin `pg_cron` → `pg_net` → route `/internal/*` signée est déjà celui de la spec (§ 2, § 5.2) et de F8.** Aucune route interne réelle n'existe encore ; la signature calculée en SQL sur le corps exact que `pg_net` envoie **n'est pas encore prouvée** (réserve de `docs/exploitation.md`). | `docs/exploitation.md` ; plan 0.4ter F8 |
| C12 | Une **session** est une ligne de `login_session` (cookie `__Host-popote_session`) ; elle se ferme en posant `revoked_at` (déconnexion, fermeture d'un appareil, fermeture des autres, départ, suppression) ; `efface_le_compte` supprime ses lignes ; 90 jours au plus. `PersonneDeLaSession.session` donne l'identifiant de la session courante. | migration 0140 ; `api/appareils.py` ; plan 0.4bis A6 |
| C13 | `vite.config.ts` de `main` est en `generateSW` (`registerType: 'autoUpdate'`, `skipWaiting` + `clientsClaim`) ; `scripts/verifie-sw-remplacant.mjs` **exécute le `sw.js` dans un bac à sable qui simule workbox par `define`** : il ne comprendra pas un `sw.js` d'`injectManifest` (workbox y est embarqué, `clientsClaim()` pose un écouteur `activate`). **F22 n'est pas encore faite** : l'amendement (N9) la rédige directement en `injectManifest`. | `vite.config.ts`, `scripts/verifie-sw-remplacant.mjs` à `origin/main` (aff77e3) |
| C14 | Le relais envoie `Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=()` : **rien n'y bloque les notifications**. La CSP (`connect-src 'self'`) ne régit pas `pushManager.subscribe` ; le service worker appelle seulement `/api/` de la même origine. | `relais/src/index.ts:33` |
| C15 | **Essai de Chromium sans interface (13/11, Playwright 1.65.0)** : `permissions: ['notifications']` et `Browser.setPermission` (CDP) laissent `Notification.permission === 'denied'` sur le Chromium livré et sur `/snap/bin/chromium` : `subscribe()` échoue en « permission denied ». **Non résolu** : l'essai de N0 (E2) reprend le sujet avant toute promesse de preuve réelle en Chromium. | essai local du 13/11 |

---

## Cadre : risque, décisions

**Risque : élevé.** Une adresse venue du navigateur sert de destination d'une requête du serveur (SSRF) ; des secrets de la personne (adresse
d'abonnement, clés) sont stockés ; un envoi planifié réveille le conteneur ; une clé privée VAPID signe au nom de Popote. Conséquences,
selon `planning-a-change` : modèle de menaces ci-dessous, revue adverse de chaque tâche N1 à N8, retour arrière écrit pour chaque
migration, preuve réelle avant la clôture.

### Décisions de ce plan (justifiées)

| N° | Décision | Pourquoi |
|---|---|---|
| D1 | **Une table sœur `push_outbox`, pas une extension de `mail_outbox`.** | Les deux files partagent le motif (écrite dans la transaction de l'effet, `skip locked`, reprise bornée) mais pas le modèle : un mail a un destinataire dont on lit l'adresse à l'envoi ; un push a un **abonné** (une personne en a plusieurs, chacun peut mourir seul : 404 sur l'un, succès sur l'autre, donc une ligne **par abonné**). Un mail part tout de suite ; un push a une **heure d'envoi** (`send_at`) et une vie de quelques minutes à quelques heures. `mail_outbox` porte des `params` (prénoms) et `concerned_persons` ; `push_outbox` n'a **aucun contenu** (exigence « rien d'intime »). Son `CHECK` de `kind` est celui de `TypeDeMail` : l'étendre mêlerait deux listes fermées. F1b est un plan non fusionné, en revue : on n'y touche pas. Le motif est repris tel quel (mêmes noms de colonnes d'état) pour qu'un lecteur retrouve ses repères. |
| D2 | **Un type de notification = une entrée du registre `popote_api/push/types.py`** (texte constant, `ttl_s`, urgence, page d'arrivée, actif par défaut, réglable ou non). La base ne connaît que la **forme** d'un type (`^[a-z][a-z0-9_]{2,40}$`) ; un type inconnu du registre au moment de l'envoi est abandonné. | Ajouter un type ne demande **aucune migration** et aucune retouche de la file. Les réglages de la personne se listent depuis le registre. Le texte étant une **constante sans paramètre**, un prénom ou un montant ne peut pas atteindre l'écran verrouillé : il n'y a pas de colonne pour le porter. |
| D3 | **Réveil : `pg_cron` chaque minute, qui n'appelle le conteneur que s'il y a une ligne échue** ; le conteneur est appelé par `pg_net`, signé en SQL ; **un workflow GitHub quotidien appelle la même route et alerte** (même modèle que F8). Le déclencheur CRON de Scaleway est écarté ; GitHub Actions seul aussi. | **Précision** : `pg_cron` à la minute (C10) ; GitHub retarde et abandonne sous charge, 5 minutes au plus fin (C9). **Coût** : un appel par minute réveillerait le conteneur en permanence (il dort après 15 minutes, C8) et ruinerait la décision du 13/11 « pas d'instance allumée » ; ici la base décide, et ne réveille que pour une ligne échue. **Sécurité** : la route interne n'accepte qu'une signature HMAC horodatée (5 minutes) ; un déclencheur Scaleway n'envoie que des en-têtes fixes (C8), donc il faudrait ajouter à `/internal/*` un secret statique rejouable pour toujours : régression. `pg_cron` calcule la signature en SQL (`docs/exploitation.md`), GitHub la calcule avec `ops/signe_interne.py`. **Filet** : GitHub coupe les crons d'un dépôt public inactif depuis 60 jours (C9) et peut en abandonner : il ne sert qu'à **voir** une panne de `pg_cron` (réponse `cron_alive`), jamais d'unique planificateur. **Dépendance** : la preuve que la signature calculée par la base est acceptée avec le corps exact de `pg_net` (C11) est **la même que celle de F8** (N0, E1). Si elle échoue, le plan de repli est écrit en N6 (GitHub toutes les 10 minutes, précision dégradée, dite aux concepteurs). |
| D4 | **L'abonnement est rattaché à la session** (`session_id` → `login_session`, `on delete cascade`) et un déclencheur sur `login_session` le supprime dès que `revoked_at` est posé. | Un seul point couvre toutes les fermetures (déconnexion de l'appareil, fermeture d'un appareil, des autres, départ, suppression de compte) sans retoucher leurs fonctions, que d'autres tâches réécrivent. Une session échue sans être révoquée est filtrée à l'envoi (jointure sur une session active) puis supprimée par la purge. Un téléphone prêté : la personne B qui s'abonne avec la même adresse remplace la ligne de A. |
| D5 | **Chiffrement et signature par `http-ece` et `py-vapid` directement ; envoi par `httpx`** : `follow_redirects=False`, `trust_env=False` (aucun proxy lu dans l'environnement), délais 3 s de connexion et 8 s au total, 5 envois simultanés, réponses jamais lues ni journalisées. | C7. La compatibilité du chiffrement avec les navigateurs est prouvée par le **vecteur de l'annexe A de la RFC 8291** (N4) et par un déchiffrement de bout en bout contre un faux service. |
| D6 | **Le message est le message déclaratif de WebKit** (C1), et **le même JSON sert de charge au service worker** : `push` lit `web_push === 8030` puis `notification`. Le service worker remplace le message déclaratif par une notification identique plus ses données (page d'arrivée relative) ; si le service worker manque, le message déclaratif suffit sur iOS 18.4+. | Un seul format, pas de branche par navigateur côté serveur. Avant iOS 18.4, Chrome et Firefox : le service worker affiche (C1, repli demandé). |
| D7 | **Permission : seulement dans un geste**, premier `await` du gestionnaire de clic. Sur iPhone hors écran d'accueil, **l'écran explique comment installer** et ne demande rien. Un refus est définitif : l'écran dit où le lever (Réglages du téléphone). | Faits établis de la consigne et C3. |
| D8 | **Au plus 5 abonnements par personne** (`409 trop_d_abonnements_push`), **rattachés à une session active** ; une notification part à **tous** les abonnés de la personne au moment de la mise en file. | Un foyer de deux personnes, quelques appareils chacune. Une personne qui s'abonne après la mise en file ne reçoit pas l'ancienne (c'est voulu). |
| D9 | **Sémantique « au moins une fois », repris jusqu'à l'échéance utile, puis abandon visible** : reprise à 1, 5, 30 minutes puis 2 h, `deadline_at = send_at + ttl_s` du type ; un doublon est possible si le processus meurt entre le `201` du service et `classe_le_push`. | Comme F1b ; une notification périmée n'a aucun intérêt. |
| D10 | **Clés VAPID générées et posées par Kamil, avec un script** ; la privée est un **secret du conteneur** (`POPOTE_VAPID_PRIVATE_KEY`), la publique une variable (`POPOTE_VAPID_PUBLIC_KEY`) servie au front par `GET /api/v1/me/push-config`. Les posées ne se remplacent que par `--tourne` : **les tourner invalide tous les abonnements** (le service refuse une signature qui ne correspond plus à la clé de l'abonnement) ; le front compare la clé servie à celle de l'abonnement à chaque ouverture et se réabonne. Au démarrage, l'API **refuse une paire incohérente** (la publique dérivée de la privée doit égaler la publique posée). | Consigne ; `managing-configuration-and-secrets` (un secret : propriétaire, objet, échéance, rotation). Échéance de rotation : 12 mois, rotation = geste de Kamil ; l'ancienne clé n'est jamais gardée (aucun double jeu de clés : un abonnement est lié à **une** clé). |
| D11 | **Une session du front pose le service worker en `injectManifest`** (amendement N9 à F22). | Le service worker doit contenir nos écouteurs (`push`, `notificationclick`, `pushsubscriptionchange`), ce que `generateSW` ne permet pas. |

### Modèle de menaces (assets, acteurs, mesures)

| Menace | Mesure | Preuve |
|---|---|---|
| **SSRF** : un client poste une adresse d'abonnement visant une machine interne, un autre protocole, un redirecteur | liste blanche stricte (`adresse_push_valide`), **vérifiée à l'enregistrement et de nouveau juste avant l'envoi** ; `https` seul, hôtes exacts ou joker à frontière de point, pas d'identifiants, pas de port autre que 443, pas d'adresse IP, pas de fragment, ASCII imprimable, 2048 caractères au plus ; `follow_redirects=False`, `trust_env=False` ; un `3xx` est un refus définitif | N2, N4 : tests de contournement (`fcm.googleapis.com.evil.test`, `evil.fcm.googleapis.com`, `@`, `\`, port, IPv4/IPv6, majuscules, point final, `%2e`, Unicode) ; test d'envoi où le faux service répond `302` vers une machine locale : aucune seconde requête |
| Fuite de l'adresse ou des clés (journal, trace, erreur, réponse) | colonnes sans droit, RLS forcée, lecture par `prend_les_pushs` seule (`popote_api`) ; réponses sans adresse ni clé ; exceptions **à nous, sans message** (`ServicePushIndisponible`, `from None`) ; `httpx` n'est jamais journalisé ; `base.connexion()` borné par la liste fermée | N2, N4, N5 : `caplog` + corps des réponses + exceptions ne contiennent jamais l'adresse, `p256dh`, `auth` (mutation : journaliser l'adresse casse) |
| Lire ou supprimer l'abonnement d'un autre | fonctions `security definer` cadrées sur `auth.uid()` ; `404` pour un autre | matrice d'autorisation (3 acteurs) ; test SQL « autre personne » |
| Spam : se servir de l'essai pour inonder | l'essai est refusé à plus de 5 par heure et par personne ; limites d'écriture par personne (30/min) ; 5 abonnés au plus | N7 |
| Un écran verrouillé qui montre du privé | texte constant du registre, aucune colonne de contenu ; la page d'arrivée est un chemin fixe du registre ; le détail se lit dans l'appli | N4 : test « le texte d'un type ne contient ni chiffre, ni prénom, ni `{` » ; `push_outbox` n'a pas de colonne de contenu (test de schéma) |
| Redirection ouverte par `navigate` | `navigate` = origine de l'appli (réglage serveur) + chemin du registre ; le service worker **refuse** toute autre origine et retombe sur `/` | N4, N10 |
| Rejeu d'un appel signé | la route interne est idempotente par construction (état relu en base, lignes prises sous `skip locked`) | N5 |
| Marteau-pilon : `pg_cron` rappelle chaque minute une route qui échoue | pas d'appel s'il n'y a rien d'échu, **pas de chevauchement** (55 s), **attente de 5 minutes** après un statut ≠ 200 | N6 |
| Perte de la clé privée VAPID | rotation par `--tourne` ; les abonnements se refont tout seuls à la prochaine ouverture ; aucun abonnement n'est exposé (l'adresse seule ne suffit pas à envoyer : il faut la clé) | N8, N11 |
| Appareil prêté, session volée | D4 ; l'abonnement meurt avec la session | N1 |
| Panne silencieuse (cron coupé, projet en pause, secret absent) | `cron_alive`, `overdue`, `abandoned` dans la réponse de la route ; le workflow GitHub quotidien échoue, GitHub prévient par mail | N6 |

### Données personnelles (`protecting-personal-data`)

| Donnée | Classe | Finalité | Conservation | Sort au départ / à la suppression |
|---|---|---|---|---|
| adresse d'abonnement (`endpoint`) | **personnelle** (identifiant d'appareil), secrète | envoyer la notification demandée | tant que la session de l'appareil vit (90 jours au plus) | supprimée avec la session (`login_session`, cascade) |
| `p256dh`, `auth` | **secrets** de la personne | chiffrer le message | idem | idem |
| ligne de `push_outbox` (type, instants, statut du service) | faible : comportement, **sans contenu** | file d'envoi, reprise | envoyées : 3 jours ; abandonnées : 30 jours | supprimées avec l'abonnement (cascade) |
| réglage (`push_setting` : type, actif) | faible | respecter le choix | tant que le compte existe | supprimé avec le compte Auth (cascade), **donc après `efface_mes_donnees`, avec la suppression du compte** : le test de bout en bout de `DELETE /me` le vérifie |

Les **services de push** (Google, Mozilla, Apple, Microsoft) sont des sous-traitants **techniques et inévitables** : ils voient l'adresse
d'abonnement, l'heure et la taille, jamais le contenu (chiffré de bout en bout) ni du texte intime (générique). Google, Apple et
Microsoft sont hors UE : **la liste des sous-traitants (spec § 7.7) doit les nommer** ; c'est un point à relayer au propriétaire
(registre) et non une décision de ce plan. L'AIPD n'est pas requise (aucun critère de la CNIL n'est réuni : pas de données sensibles, pas de
suivi systématique) : constat à confirmer par le DPO, consigné dans la PR de N14.

---

## Contrat de l'API (ajouts seulement : routes sous `/api/v1/me/…`, anglais, `snake_case`, UUID, RFC 9457)

| Route | Qui | Réponses |
|---|---|---|
| `GET /api/v1/me/push-config` | session | `200 {enabled: bool, vapid_public_key: str \| null}` (`ETag`, `no-store`) ; `enabled` faux si les clés ne sont pas posées |
| `POST /api/v1/me/push-subscriptions` | session, **`Idempotency-Key`** | corps = `PushSubscription.toJSON()` : `{endpoint, keys: {p256dh, auth}}` (`expirationTime` ignoré) ; `201` + `Location` + `{id, created_at}` (jamais l'adresse) ; `422` (adresse refusée, pointeur `/endpoint` ; clé mal formée, pointeur `/keys/p256dh` ou `/keys/auth`) ; `409 trop_d_abonnements_push` ; `503 push_indisponible` (clés absentes) ; `429` ; `401` |
| `GET /api/v1/me/push-subscriptions` | session | page `{items: [{id, created_at, current: bool, browser, os}], next_cursor}` ; jamais d'adresse ni de clé |
| `DELETE /api/v1/me/push-subscriptions/{id}` | session | `204` ; `404 abonnement_push_introuvable` (inconnu **ou** d'un autre) ; `422` ; **sans `Idempotency-Key`** (exemption écrite : effet idempotent) |
| `POST /api/v1/me/push-subscriptions/{id}/test-notifications` | session, **`Idempotency-Key`** | `202 {state: "queued"}` ; `404` ; `429 quota_notifications_essai` + `Retry-After` (5 par heure et par personne) ; `503 push_indisponible` |
| `GET /api/v1/me/push-settings` | session | `200 {items: [{kind, enabled}]}` : **tous les types réglables du registre**, la valeur par défaut quand la personne n'a rien choisi |
| `PUT /api/v1/me/push-settings/{kind}` | session | corps `{enabled}` ; `200 {kind, enabled}` ; `404` (type inconnu ou non réglable) ; **sans `Idempotency-Key` ni `If-Match`** (exemption écrite : `PUT` idempotent, réglage « de soi » sans version, comme `PUT /me/password`) |
| `POST /internal/push/dispatch` | **signée HMAC**, hors du relais et du contrat | `200 {sent, retrying, expired, refused, dropped, abandoned, overdue, remaining, cron_alive}` (des nombres, **aucun** identifiant) ; refus : `404` |

Types d'erreur nouveaux : `trop_d_abonnements_push` (409), `abonnement_push_introuvable` (404), `quota_notifications_essai` (429),
`push_indisponible` (503). Réutilisés : `donnees_invalides` (422), `trop_de_requetes`.

## Migrations (expansion seule ; numéros définitifs pris au moment du code : à partir de **0166**, 0.4bis occupe 0147 à 0157 et 0.4ter 0158 à 0165)

| Rôle | Tâche | Objet | Compatible avec l'appli en prod parce que | Retour arrière |
|---|---|---|---|---|
| **M1** | N1 | `push_subscription`, `push_setting` (RLS forcée, aucun droit) ; déclencheur `login_session_ferme` ; fonctions `enregistre_mon_abonnement_push`, `mes_abonnements_push`, `retire_mon_abonnement_push`, `mes_reglages_push`, `regle_mon_push` | tables et fonctions neuves ; le déclencheur ne se déclenche que sur `revoked_at` posé et ne touche que `push_subscription` : l'appli en ligne n'écrit pas dans `login_session` | `drop trigger`, `drop function`, `drop table` (aucune donnée à garder) |
| **M2** | N3 | `push_outbox` ; `private.met_en_file_push`, `prend_les_pushs`, `classe_le_push`, `efface_l_abonnement_push`, `met_en_file_mon_essai_push`, `push_en_retard` ; purge `pg_cron` | neuves | `cron.unschedule`, `drop function`, `drop table` (les lignes en attente sont perdues : sans importance) |
| **M3** | N6 | `private.push_passe`, `private.signe_un_appel_interne`, `private.reveille_le_push`, `public.etat_du_reveil_push` ; planification `push-reveil` (tolérante : seulement si `pg_cron` existe) | neuves ; la planification ne fait rien tant que les secrets du coffre manquent | `cron.unschedule('push-reveil')`, `drop function`, `drop table` |

Chaque migration pose ses `grant` et `revoke` **explicitement** (règle du dépôt, `ops/aligne_droits.py`), dit comment revenir en arrière, et
part sur l'essai avant le code qui l'utilise.

## Règles d'exécution (valables pour chaque tâche)

Celles de 0.3, 0.4, 0.4bis, 0.4ter et de la fondation du front s'appliquent : TDD avec test négatif de chaque garde et **épreuve de la mutation** ;
une tâche = une branche = une demande de fusion **en brouillon ≤ 400 lignes** hors fichiers générés (`openapi.json`, `uv.lock`,
`src/api/schema.d.ts`, `package-lock.json`) ; gabarit à quatre parties, `Closes #<issue>` ; commits Conventional en français, `Refs: #<issue>`,
**aucune ligne de co-auteur** ; worktree dédié, remote `github-perso`, **jamais `gh`** (API REST) ; aucun accès à la prod ; secrets
seulement dans `~/.config/popote/secrets.env`, jamais affichés ; migrations appliquées **une à la fois**, jamais modifiées une fois
fusionnées ; `main` protégée ; revue adverse (agent Sonnet effort high en lecture seule, plus Codex CLI en lecture seule).

- **Skills à charger avant d'écrire du code**, par leur nom exact dans l'outil Skill : `sp-test-driven-development`,
  `sp-verification-before-completion`, `silae-engineering:writing-tests`, `writing-clean-code`, `handling-errors`, `writing-commits`,
  `opening-pull-requests` ; **API** : `securing-code`, `designing-http-apis`, `managing-data-and-migrations`, `protecting-personal-data`,
  `managing-configuration-and-secrets` ; **front** : `building-frontends`, `researching-official-docs`, `frontend-design:frontend-design` (N12).
  **Aucune version ni signature de bibliothèque de mémoire** : relire la page de la source citée.
- **Dépendances ajoutées** (`managing-dependencies-and-licenses`) : API `http-ece==1.2.1` (MIT) et `py-vapid==1.9.6` (MPL-2.0 : bibliothèque
  non modifiée, admise comme les outils de test de la fondation ; **à faire valider au propriétaire dans la PR de N4**, voir « Questions »), versions
  exactes ; `exclude-newer = "2026-10-29"` de `pyproject.toml` les laisse passer (14/10/2026 et 08/08/2024) ; front `workbox-precaching`,
  `workbox-routing`, `workbox-core` 7.4.1 exacts (MIT).
- **Réponses d'API** : jamais l'adresse ni les clés ; **journal** : jamais une exception par son message (règle existante), jamais d'adresse
  d'abonnement ; l'identifiant (UUID) d'un abonnement peut s'écrire.
- **Aucun texte en dur dans le JSX** ; textes dans `src/textes/notifications.ts`. Données d'exemple : Sam et Léa, adresses `@exemple.fr`.
- **`base.connexion()`** est réservé aux listes fermées de `tests/unit/test_architecture.py` : ce plan y ajoute `infra/push_file.py`, avec sa
  raison (« `prend_les_pushs` et `classe_le_push` : fonctions réservées à `popote_api`, sans contexte de personne »), comme F1b pour les mails.
- **Aucune attente hors SQL dans une transaction** (`docs/normes-api.md` § 3.6) : la prise commit, l'envoi réseau se fait **hors** transaction,
  chaque `classe_le_push` ouvre la sienne.
- **Fini** = lint, `mypy --strict`, `pytest` (unitaire + intégration), `npx vitest run`, `npm run build`, CI verte, contrat régénéré, revue,
  mutations jouées, `docs/exploitation.md` et `docs/securite.md` à jour.

## Ordre et voies

| Voie | Tâches, dans l'ordre | Dépend de |
|---|---|---|
| Essais | **N0** (aucune PR : trois essais, résultats écrits dans la PR de la tâche qui s'en sert) | F8 pour E1 |
| Base | **N1** (M1) → **N3** (M2) → **N6** (M3) | 0.4bis S6 (`verrouille_la_personne`), A6 (`efface_le_compte`) ; F8 (planification) pour N6 |
| API sans base | **N4** (envoi pur) ; puis N2 (adresse, config, routes) ; **N5** (passe, route interne) après N3 et N4 ; **N7** (essai, réglages) après N2, N3, N5 ; **N8** (script des clés) à tout moment | N2 après N1 |
| Front | **N9** (dans la PR de F22) → **N10** (service worker) → **N11** (couche push) → **N12** (écran) → **N13** (e2e) | N11 après le contrat de N2 et N7 (F4 le synchronise) ; N13 après N7 et N12 |
| Clôture | **N14** preuves réelles et clôture | toutes ; gestes de Kamil |

Parallèle possible : N4 dès maintenant ; N8 ; N9 pendant F22 ; N10 pendant N2 à N7.

---

## Les tâches

### N0 : Trois essais avant le code (aucune PR)

**But :** lever trois hypothèses qui décident de la forme des tâches suivantes. Chaque résultat est écrit dans la PR de la tâche qui s'en sert,
jamais dans un fichier de plus.

- [ ] **E1 : la signature calculée par la base est acceptée avec le corps exact de `pg_net`** (sert N6). C'est l'essai de F8
  (« preuve sur l'essai, dépend du propriétaire ») : **si F8 l'a faite, reprendre sa conclusion** ; sinon la jouer sur la pile locale avec
  un écouteur qui imprime les octets reçus : `net.http_post(url := 'http://host.docker.internal:<port>/x', body := '{}'::jsonb, …)`, relever le
  corps exact et comparer son `sha256` à celui que la fonction SQL signe. Attendu : mêmes octets (`{}`) ; sinon N6 signe le corps relevé.
- [ ] **E2 : un vrai Chromium peut s'abonner** (sert N13 et N14). Reprendre le script de C15 et essayer, dans l'ordre : (a) `launchPersistentContext` avec
  un dossier de profil dont `Default/Preferences` pose `profile.default_content_setting_values.notifications = 1` ; (b) Chromium avec interface sous
  `xvfb-run` ; (c) `channel: 'chrome'` si Chrome est installé. Critère : `pushManager.subscribe({userVisibleOnly: true, applicationServerKey})` rend
  une adresse dont l'hôte est `fcm.googleapis.com`. **Le réseau de Kamil intercepte le TLS** (mémoire du projet) : si `subscribe` échoue pour cette
  raison, jouer l'essai sur un runner GitHub (`workflow_dispatch`, `ubuntu-24.04`, Chromium sous `xvfb-run`) et le dire. Sortie : la recette qui marche,
  ou « impossible » : alors la preuve réelle en Chromium se limite à l'envoi chiffré vers FCM accepté (`201`) sans affichage, et N14 le dit.
- [ ] **E3 : les hôtes réels** (sert N2). Avec la recette de E2, relever l'adresse d'abonnement rendue par Chromium (FCM) et, si possible, celles de
  Firefox (`updates.push.services.mozilla.com`) et de WebKit (`web.push.apple.com`, `playwright install webkit` est déjà là : WebKit de Playwright ne
  s'abonne pas à Apple, noter l'écart). Les hôtes relevés doivent passer `adresse_push_valide` ; ceux qui ne passent pas sont **une question à
  trancher**, pas un trou à boucher en élargissant la liste.

---

### N1 : Les abonnements en base (migration M1) — ≈ 330 lignes

**Pourquoi :** D4, D8 ; exigence « rattachés à la session, supprimés à la déconnexion de cet appareil et avec le compte ».
**Dépend de :** 0.4bis S6 (`private.verrouille_la_personne(uuid)`) et A6 (`private.efface_le_compte` supprime les lignes de `login_session`).
**Sources à relire :** `supabase/migrations/0140_appareils.sql` (forme des fonctions `authenticated` et de leurs `revoke`), 0.4bis S6.

**Fichiers :** `supabase/migrations/<M1>_abonnements_push.sql`, `tests/db/push-abonnements.test.ts` (Vitest, base locale, comme `tests/db/*.test.ts`),
`docs/schema.md`, `docs/securite.md` (§ « Notifications push » : modèle de menaces ci-dessus, résumé).

- [ ] **Étape 1 : les tests d'abord** (`tests/db/push-abonnements.test.ts`, personnes de banc Sam et Léa, deux foyers). Cas :
  1. enregistrer rend `cree` et un identifiant ; **la même adresse par la même session** met les clés à jour, **même identifiant** ;
  2. **la même adresse par une autre session ou une autre personne** supprime l'ancienne ligne (nouvel identifiant) : un téléphone prêté ne garde pas l'abonnement de la première personne ;
  3. **le 6e abonnement d'une personne** rend `limite` et n'écrit rien (le 5e passe) ; deux enregistrements simultanés (deux connexions, verrou de personne) ne dépassent jamais 5 ;
  4. une session **fermée** ou **échue** ne peut pas enregistrer (`session_inconnue`) ; la session d'une autre personne non plus ;
  5. **poser `revoked_at`** sur la session supprime ses abonnements : testé par **chaque chemin de fermeture** (`ferme_un_appareil`, `ferme_les_autres_appareils`, `ferme_les_autres_sessions`, `efface_mes_donnees`) et par un `update` direct ;
  6. `efface_mes_donnees()` ne laisse **aucune** ligne de `push_subscription` pour la personne ; ses `push_setting` partent avec le compte Auth (test du `DELETE /me` complet : N7) ;
  7. `mes_abonnements_push` ne liste que les miens, ordre `created_at desc, id desc`, page de `limit + 1` ;
  8. `retire_mon_abonnement_push(id)` : `true` pour le mien, `false` pour un autre et pour un inconnu (aucune ligne touchée) ;
  9. `regle_mon_push` : insère, puis met à jour ; `kind` mal formé refusé par la contrainte ;
  10. **surface** : `anon`, `authenticated` n'ont **aucun droit de table** sur `push_subscription` et `push_setting` ; les cinq fonctions sont exécutables par `authenticated` seul (ni `anon`, ni `popote_api`, ni `service_role`, ni `public`) ; la RLS est activée **et forcée** ;
  11. contraintes : adresse hors forme `https://…`, `endpoint_sha256` de mauvaise longueur, `p256dh` qui n'est pas du base64url de 87 caractères, `auth` qui n'en fait pas 22 : refusés.
- [ ] **Étape 2 : lancer, voir rouge** : `npx vitest run tests/db/push-abonnements.test.ts` → échec « relation public.push_subscription n'existe pas ».
- [ ] **Étape 3 : la migration.** Code complet :

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- <M1> · LES ABONNEMENTS PUSH (plan des notifications push, N1)
--
-- Un abonnement est la clé d'un appareil : adresse du service de push + deux clés de chiffrement. Ce sont des SECRETS de la
-- personne : aucun droit de table, RLS forcée, lus par les fonctions d'envoi seulement (M2). Rattaché à une SESSION : il disparaît avec
-- elle (cascade) et dès qu'elle est fermée (déclencheur : tous les chemins de fermeture posent `revoked_at`).
--
-- COMPATIBLE avec l'appli en ligne : objets neufs ; le déclencheur ne touche que push_subscription et ne se déclenche que sur
-- `revoked_at` posé, que l'appli en ligne n'écrit pas.
--
-- Retour arrière (sans perte à garder) :
--   drop trigger login_session_ferme on public.login_session;
--   drop function private.retire_les_abonnements_de_la_session();
--   drop function public.enregistre_mon_abonnement_push(text, text, text, uuid), public.mes_abonnements_push(integer, timestamptz, uuid),
--     public.retire_mon_abonnement_push(uuid), public.mes_reglages_push(), public.regle_mon_push(text, boolean);
--   drop table public.push_setting, public.push_subscription;
-- ═══════════════════════════════════════════════════════════════════════════
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.push_subscription (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.login_session (id) on delete cascade,
  endpoint text not null check (length(endpoint) between 20 and 2048 and endpoint ~ '^https://[^/@[:space:]]+/'),
  endpoint_sha256 bytea not null unique check (length(endpoint_sha256) = 32),
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{87}$'),
  auth text not null check (auth ~ '^[A-Za-z0-9_-]{22}$'),
  created_at timestamptz not null default now()
);
create index push_subscription_person_idx on public.push_subscription (person_id, created_at desc, id desc);
create index push_subscription_session_idx on public.push_subscription (session_id);
alter table public.push_subscription enable row level security;
alter table public.push_subscription force row level security;
revoke all on public.push_subscription from public, anon, authenticated, service_role, popote_api, popote_internal;

create table public.push_setting (
  person_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind ~ '^[a-z][a-z0-9_]{2,40}$'),
  enabled boolean not null,
  updated_at timestamptz not null default now(),
  primary key (person_id, kind)
);
alter table public.push_setting enable row level security;
alter table public.push_setting force row level security;
revoke all on public.push_setting from public, anon, authenticated, service_role, popote_api, popote_internal;

-- Toute fermeture de session (déconnexion, appareil fermé, départ, suppression) pose `revoked_at` : un seul point les couvre.
create function private.retire_les_abonnements_de_la_session() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.push_subscription where session_id = new.id;
  return null;
end $$;
revoke all on function private.retire_les_abonnements_de_la_session() from public, anon, authenticated, service_role, popote_api, popote_internal;
create trigger login_session_ferme
  after update of revoked_at on public.login_session
  for each row when (old.revoked_at is null and new.revoked_at is not null)
  execute function private.retire_les_abonnements_de_la_session();

create function public.enregistre_mon_abonnement_push(p_endpoint text, p_p256dh text, p_auth text, p_session uuid)
returns table (id uuid, etat text)
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_person uuid := auth.uid();
  v_hash bytea := extensions.digest(convert_to(p_endpoint, 'utf8'), 'sha256');
  v_id uuid;
begin
  if v_person is null then
    raise exception 'Aucune personne dans ce contexte.' using errcode = 'invalid_authorization_specification';
  end if;
  perform private.verrouille_la_personne(v_person);
  if not exists (select 1 from public.login_session s where s.id = p_session and s.person_id = v_person
                  and s.revoked_at is null and s.expires_at > pg_catalog.now() and s.absolute_expires_at > pg_catalog.now()) then
    return query select null::uuid, 'session_inconnue'::text;
    return;
  end if;
  -- Le même appareil rattaché ailleurs (autre session, autre personne) : l'ancienne ligne s'en va avec ses envois en attente.
  delete from public.push_subscription ps
   where ps.endpoint_sha256 = v_hash and not (ps.person_id = v_person and ps.session_id = p_session);
  if not exists (select 1 from public.push_subscription ps where ps.endpoint_sha256 = v_hash)
     and (select count(*) from public.push_subscription ps where ps.person_id = v_person) >= 5 then
    return query select null::uuid, 'limite'::text;
    return;
  end if;
  insert into public.push_subscription as ps (person_id, session_id, endpoint, endpoint_sha256, p256dh, auth)
  values (v_person, p_session, p_endpoint, v_hash, p_p256dh, p_auth)
  on conflict (endpoint_sha256) do update set p256dh = excluded.p256dh, auth = excluded.auth
  returning ps.id into v_id;
  return query select v_id, 'cree'::text;
end $$;

create function public.mes_abonnements_push(p_limit integer default 20, p_after_created timestamptz default null, p_after_id uuid default null)
returns table (id uuid, session_id uuid, created_at timestamptz, browser text, os text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Aucune personne dans ce contexte.' using errcode = 'invalid_authorization_specification';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 101 then
    raise exception 'La taille de page doit valoir de 1 à 101.' using errcode = 'invalid_parameter_value';
  end if;
  return query
  select ps.id, ps.session_id, ps.created_at, s.browser, s.os
    from public.push_subscription ps join public.login_session s on s.id = ps.session_id
   where ps.person_id = auth.uid()
     and (p_after_created is null or (ps.created_at, ps.id) < (p_after_created, p_after_id))
   order by ps.created_at desc, ps.id desc
   limit p_limit;
end $$;

create function public.retire_mon_abonnement_push(p_id uuid) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare v_n integer;
begin
  if auth.uid() is null then
    raise exception 'Aucune personne dans ce contexte.' using errcode = 'invalid_authorization_specification';
  end if;
  delete from public.push_subscription where id = p_id and person_id = auth.uid();
  get diagnostics v_n = row_count;
  return v_n = 1;
end $$;

create function public.mes_reglages_push() returns table (kind text, enabled boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Aucune personne dans ce contexte.' using errcode = 'invalid_authorization_specification';
  end if;
  return query select s.kind, s.enabled from public.push_setting s where s.person_id = auth.uid() order by s.kind;
end $$;

create function public.regle_mon_push(p_kind text, p_enabled boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Aucune personne dans ce contexte.' using errcode = 'invalid_authorization_specification';
  end if;
  insert into public.push_setting as s (person_id, kind, enabled) values (auth.uid(), p_kind, p_enabled)
  on conflict (person_id, kind) do update set enabled = excluded.enabled, updated_at = pg_catalog.now();
end $$;

revoke all on function public.enregistre_mon_abonnement_push(text, text, text, uuid),
  public.mes_abonnements_push(integer, timestamptz, uuid), public.retire_mon_abonnement_push(uuid),
  public.mes_reglages_push(), public.regle_mon_push(text, boolean)
  from public, anon, authenticated, service_role, popote_api, popote_internal;
grant execute on function public.enregistre_mon_abonnement_push(text, text, text, uuid),
  public.mes_abonnements_push(integer, timestamptz, uuid), public.retire_mon_abonnement_push(uuid),
  public.mes_reglages_push(), public.regle_mon_push(text, boolean) to authenticated;
```

  (`extensions.digest` : `pgcrypto` est installé dans le schéma `extensions` sur Supabase, comme dans `docs/exploitation.md` ; si la pile locale le
  place ailleurs, utiliser la forme que 0147 emploie pour hacher.)
- [ ] **Étape 4 : appliquer et relancer** : `npx supabase migration up` puis `npx vitest run tests/db/push-abonnements.test.ts` → tous verts (11 cas, aucun
  ignoré) ; puis `npm test` complet : **aucune régression** de `tests/db`.
- [ ] **Étape 5 : mutations** (chacune doit casser un test, jouée à la main) : retirer le déclencheur ; `after update` sans `when` sur `revoked_at` ;
  retirer `perform private.verrouille_la_personne` ; compter à `> 5` au lieu de `>= 5` ; ne pas supprimer l'ancienne ligne d'une autre personne ;
  `grant select` à `authenticated` sur la table ; oublier `force row level security`.
- [ ] **Étape 6 : commit** (`feat(push): range les abonnements push par session`, corps Why/What, `Refs: #<issue>`) ; PR brouillon.

---

### N2 : Valider l'adresse, la configuration, les routes d'abonnement — ≈ 380 lignes

**Pourquoi :** exigence 1 (liste blanche, secrets, bornes). **Dépend de :** N1.
**Fichiers :** `src/popote_api/push/__init__.py`, `push/adresse.py`, `push/cles.py`, `config.py`, `schemas/push.py`, `api/push_abonnements.py`, `api/v1.py`
(montage), `routes_publiques.py` (rien : routes sous session), `tests/unit/test_push_adresse.py`, `tests/unit/test_push_cles.py`,
`tests/unit/test_posts_idempotents.py` (exemptions écrites), `tests/authz/test_matrice.py`, `tests/integration/test_push_abonnements.py`,
`.env.example`, `docs/normes-api.md` (§ 3.10 : les routes), `openapi.json` (régénéré), `pyproject.toml` + `uv.lock`.

- [ ] **Étape 1 : tests de `adresse_push_valide`** (`tests/unit/test_push_adresse.py`), table de cas **paramétrée** :
  - **acceptés** : `https://fcm.googleapis.com/fcm/send/AbC-_123`, `https://fcm.googleapis.com/wp/AbC-_123`, `https://updates.push.services.mozilla.com/wpush/v2/AbC`,
    `https://web.push.apple.com/AbCdEf`, `https://wns2-par02p.notify.windows.com/w/?token=AbCd` (requête admise), plus les adresses relevées en N0 E3 ;
  - **refusés** : `http://` ; `https://fcm.googleapis.com.evil.test/x` ; `https://evil.fcm.googleapis.com/x` ; `https://xfcm.googleapis.com/x` ;
    `https://fcm.googleapis.com@evil.test/x` ; `https://user:pw@fcm.googleapis.com/x` ; `https://fcm.googleapis.com:8443/x` ; `https://fcm.googleapis.com\@evil.test/` ;
    `https://FCM.googleapis.com/x` accepté **seulement** après mise en minuscule de l'hôte par l'analyse (on **compare** la forme analysée, on ne réécrit rien : l'adresse stockée reste celle reçue) ;
    `https://fcm.googleapis.com./x` (point final) ; `https://127.0.0.1/x`, `https://[::1]/x`, `https://2130706433/x`, `https://localhost/x` ; `https://push.apple.com/x` (le joker exige une étiquette avant) ;
    `https://fcm.googleapis.com/x#frag` ; `https://fcm.googleapis.com/x y`, tabulation, retour à la ligne, caractère de contrôle, espace insécable, lettre Unicode (`fсm.googleapis.com` en cyrillique) ;
    `https://fcm.googleapis.com` sans chemin ; plus de 2048 caractères ; vide ; non-chaîne ;
  - **hôte de test** : `http://127.0.0.1:<port>/x` accepté **seulement** si le port figure dans `hotes_de_test` ; sans, refusé.
- [ ] **Étape 2 : l'implémentation** (`push/adresse.py`, code complet) :

```python
"""Liste blanche des services de push : l'adresse d'un abonnement vient du navigateur, le serveur y POSTe (SSRF, OWASP API7)."""

import ipaddress
from collections.abc import Collection
from typing import Final
from urllib.parse import SplitResult, urlsplit

LONGUEUR_MAX: Final = 2048
HOTES_EXACTS: Final = frozenset({"fcm.googleapis.com", "updates.push.services.mozilla.com"})
# Le joker exige au moins une étiquette avant le suffixe (`push.apple.com` seul n'est pas un service).
SUFFIXES: Final = (".push.apple.com", ".notify.windows.com")
ETIQUETTE_SURE = frozenset("abcdefghijklmnopqrstuvwxyz0123456789-.")


def _hote_de_service(hote: str) -> bool:
    if not hote or hote != hote.lower() or not set(hote) <= ETIQUETTE_SURE or hote.endswith(".") or ".." in hote:
        return False
    try:
        ipaddress.ip_address(hote)
    except ValueError:
        pass
    else:
        return False  # une adresse IP n'est jamais un service
    return hote in HOTES_EXACTS or any(hote.endswith(s) and len(hote) > len(s) for s in SUFFIXES)


def _analyse(adresse: object) -> SplitResult | None:
    if not isinstance(adresse, str) or not 20 <= len(adresse) <= LONGUEUR_MAX:
        return None
    # ASCII imprimable seulement, sans espace ni barre oblique inverse : l'analyse de l'URL ne doit rien deviner.
    if not (adresse.isascii() and adresse.isprintable()) or any(c in adresse for c in " \\"):
        return None
    try:
        return urlsplit(adresse)
    except ValueError:
        return None


def adresse_push_valide(adresse: object, *, hotes_de_test: Collection[str] = ()) -> bool:
    """`True` seulement pour une adresse `https` d'un service de push connu. `hotes_de_test` (`127.0.0.1:port`) n'existe qu'en local."""
    morceaux = _analyse(adresse)
    if morceaux is None:
        return False
    if morceaux.username is not None or morceaux.password is not None or morceaux.fragment or not morceaux.path.startswith("/"):
        return False
    try:
        port = morceaux.port
    except ValueError:
        return False
    hote = morceaux.hostname or ""
    if morceaux.scheme == "http":
        return f"{hote}:{port}" in hotes_de_test
    return morceaux.scheme == "https" and port in (None, 443) and _hote_de_service(hote)
```

  La mutation « joker sans étiquette avant » (`push.apple.com` accepté) casse un cas ; « ne pas tester le `.` final » aussi.
- [ ] **Étape 3 : tests et code de `push/cles.py`** : `p256dh` = base64url sans remplissage, **65 octets, premier octet `0x04`, point valide de la courbe P-256**
  (`EllipticCurvePublicKey.from_encoded_point(SECP256R1(), octets)` lève sinon) ; `auth` = base64url, **16 octets** (RFC 8291 § 3.2). Un remplissage `=`, un alphabet
  standard (`+/`), une taille fausse, un point hors courbe : `422`. Fonctions pures `decode_p256dh(texte) -> bytes`, `decode_auth(texte) -> bytes`.
- [ ] **Étape 4 : configuration** (`config.py`, `Settings`, sur le modèle des mails) : `vapid_private_key: SecretStr | None`, `vapid_public_key: str | None`,
  `vapid_subject: str | None` (`POPOTE_VAPID_PRIVATE_KEY`, `POPOTE_VAPID_PUBLIC_KEY`, `POPOTE_VAPID_SUBJECT`), `push_hotes_de_test: frozenset[str]`
  (`POPOTE_PUSH_HOTES_DE_TEST`). Règles de démarrage (test : un cas par règle, **sans jamais afficher la valeur**) : privée et publique vont ensemble ou
  pas du tout ; **la publique dérivée de la privée (`py_vapid`) doit égaler la publique posée**, sinon l'API ne démarre pas ; `vapid_subject` doit commencer par `mailto:` ou `https://`
  (valeur à poser : `mailto:bonjour@notre-popote.fr`) ; sans clés, le push est **désactivé** (`enabled` faux, démarrage avertit comme pour les mails) ;
  **`push_hotes_de_test` est refusé hors local** (comme `POPOTE_MAIL_PROVIDER=local`). `.env.example` : les quatre lignes avec `SECRET` sur la privée.
- [ ] **Étape 5 : tests d'intégration et de matrice** (`tests/integration/test_push_abonnements.py`) : `POST` valide → `201` + `Location`, **le corps ne contient ni l'adresse ni les clés**
  (assertion sur le texte entier de la réponse) ; rejeu avec la même `Idempotency-Key` → même réponse, une seule ligne ; sans clé → `400 cle_idempotence_manquante` ;
  adresse refusée → `422` pointeur `/endpoint` ; clé fausse → `422` pointeur `/keys/p256dh` ; 6e → `409 trop_d_abonnements_push` ; clés VAPID absentes → `503 push_indisponible` ;
  `GET` ne rend jamais d'adresse ni de clé, `current` vrai pour la session courante ; `DELETE` d'un abonnement d'**un autre foyer** → `404` ; `push-config` avec et sans clés ;
  **`caplog` ne contient jamais l'adresse, `p256dh`, `auth`** pour aucune de ces requêtes, y compris sur le `422` ; `tests/authz/test_matrice.py` : une ligne par route, trois acteurs
  (moi, autre foyer, sans session) ; `test_posts_idempotents.py` : l'exemption du `DELETE`.
- [ ] **Étape 6 : routes** (`api/push_abonnements.py`) sur le modèle de `api/appareils.py` : `APIRouter(prefix="/me", route_class=RouteIdempotente)` pour les `POST`, un second routeur sans
  clé pour `GET`/`DELETE` ; `operation_id` : `get_push_config`, `create_my_push_subscription`, `list_my_push_subscriptions`, `delete_my_push_subscription` ; modèles `Entree`/`Sortie` fermés ;
  la route appelle `public.enregistre_mon_abonnement_push(%s, %s, %s, %s)` avec `personne.session` ; `etat == 'limite'` → `Probleme(409, "trop_d_abonnements_push", …)`,
  `session_inconnue` → `Probleme(401, "pas_de_session", …)`. Le texte français de chaque erreur est écrit pour la personne, sans détail technique
  (« Tu as déjà 5 appareils avec des notifications. »).
- [ ] **Étape 7 :** `uv run python scripts/exporte_contrat.py`, puis les contrôles : `uv run ruff format --check && uv run ruff check && uv run mypy && uv run pytest -q -m "not integration"`
  puis `uv run pytest -q -m integration` → tous verts. **Mutations** : accepter `http` ; accepter le port ; journaliser l'adresse sur le `422` ; renvoyer l'adresse dans le `GET` ;
  démarrer sans vérifier la paire de clés ; accepter `push_hotes_de_test` en prod.
- [ ] **Étape 8 : commit** `feat(push): valide l'adresse d'un abonnement et expose les abonnements` ; PR brouillon.

---

### N3 : La file d'envoi `push_outbox` (migration M2) — ≈ 340 lignes

**Pourquoi :** exigence « file persistante écrite dans la transaction de l'effet » ; D1, D9. **Dépend de :** N1.
**Fichiers :** `supabase/migrations/<M2>_file_d_envoi_push.sql`, `tests/db/push-file.test.ts`, `docs/schema.md`.

- [ ] **Étape 1 : les tests d'abord** (`tests/db/push-file.test.ts`). Cas :
  1. `private.met_en_file_push('test', personne, null, now(), 300, null)` écrit **une ligne par abonné actif** de la personne (deux abonnés : deux lignes ; aucun : zéro ligne, rend 0) ;
  2. **la ligne est écrite dans la transaction de l'effet** : annuler la transaction n'en laisse aucune ;
  3. clé de dédoublonnage : un second appel de même `(abonné, type, clé)` n'écrit rien ; sans clé, deux lignes ;
  4. `p_subscription` restreint à un seul abonné (utile à l'essai) ;
  5. `prend_les_pushs(50)` rend les lignes **échues** (`next_attempt_at <= now()`), jamais une ligne future (`send_at` dans une heure) ; passe à `sending`, `attempts + 1`, `claimed_until = now() + 2 min` ;
  6. **deux travailleurs en parallèle** prennent des lignes différentes (`skip locked`), jamais la même ;
  7. **une ligne dont l'échéance est passée est abandonnée avant d'être rendue** (état `abandoned`, jamais renvoyée) ;
  8. une ligne `sending` dont `claimed_until` est passé est reprise (processus tué) ;
  9. `classe_le_push(id, 'sent')` → `sent`, `sent_at` posé ; `'retry'` → `queued` avec `next_attempt_at` à +60 s, +300 s, +1800 s, +7200 s selon `attempts`, **ou `abandoned` si ce délai dépasse l'échéance** ; un `retry_after_s` du service **allonge** le délai (jamais plus de 3600 s) ; `'abandoned'`, `'dropped'` terminaux ; état inconnu → erreur ;
  10. `prend_les_pushs` **ne rend pas** une ligne dont la session de l'abonné est fermée ou échue : elle passe à `dropped` ;
  11. `prend_les_pushs` rend `enabled` du réglage de la personne pour le type (`null` si aucun réglage) ;
  12. `efface_l_abonnement_push(id)` supprime l'abonnement **et ses lignes** (cascade) ; supprimer l'abonnement par `retire_mon_abonnement_push` aussi ;
  13. `met_en_file_mon_essai_push(abonnement)` : `ok` pour le mien ; `introuvable` pour un autre ; `quota` à la 6e en une heure (fenêtre glissante, les lignes `sent` comptent) ;
  14. `push_en_retard()` : `due` (échues non prises), `overdue` (échues depuis plus de 5 minutes), `abandoned_24h`, `dropped_24h` ;
  15. **surface** : `prend_les_pushs`, `classe_le_push`, `efface_l_abonnement_push`, `push_en_retard` exécutables par `popote_api` **seul** ; `private.met_en_file_push` par **aucun** rôle d'API (appelée par des fonctions `security definer`) ; `met_en_file_mon_essai_push` par `authenticated` seul ; la table sans droit, RLS forcée ;
  16. **schéma** : `push_outbox` n'a **aucune colonne de contenu** (la liste des colonnes est celle écrite ci-dessous : test de dérive qui échoue si une colonne `text`/`jsonb` libre apparaît) ;
  17. purge : `private.purge_push_outbox()` efface les `sent` de plus de 3 jours, les `abandoned`/`dropped` de plus de 30 jours, rien d'autre.
- [ ] **Étape 2 : la migration.** Code complet de la table et des fonctions de mise en file et d'état (le reste suit le même patron : définition, `comment`, `revoke all`, `grant`) :

```sql
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.push_outbox (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.push_subscription (id) on delete cascade,
  person_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind ~ '^[a-z][a-z0-9_]{2,40}$'),
  dedupe_key text check (dedupe_key is null or length(dedupe_key) between 1 and 80),
  state text not null default 'queued' check (state in ('queued', 'sending', 'sent', 'abandoned', 'dropped')),
  send_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  attempts smallint not null default 0,
  next_attempt_at timestamptz not null default now(),
  claimed_until timestamptz,
  provider_status smallint,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  check (deadline_at > send_at)
);
create unique index push_outbox_dedupe on public.push_outbox (subscription_id, kind, dedupe_key) where dedupe_key is not null;
create index push_outbox_due on public.push_outbox (next_attempt_at) where state in ('queued', 'sending');
create index push_outbox_person_kind on public.push_outbox (person_id, kind, created_at desc);
alter table public.push_outbox enable row level security;
alter table public.push_outbox force row level security;
revoke all on public.push_outbox from public, anon, authenticated, service_role, popote_api, popote_internal;

-- Appelée DANS la transaction de l'effet, par une fonction `security definer` (jamais par une API). Une ligne par abonné actif.
create function private.met_en_file_push(
  p_kind text, p_person uuid, p_dedupe_key text, p_send_at timestamptz, p_ttl_s integer, p_subscription uuid default null)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare v_n integer;
begin
  if p_ttl_s is null or p_ttl_s not between 60 and 86400 then
    raise exception 'ttl_s hors bornes' using errcode = 'invalid_parameter_value';
  end if;
  insert into public.push_outbox (subscription_id, person_id, kind, dedupe_key, send_at, next_attempt_at, deadline_at)
  select ps.id, p_person, p_kind, p_dedupe_key, p_send_at, p_send_at, p_send_at + pg_catalog.make_interval(secs => p_ttl_s)
    from public.push_subscription ps
    join public.login_session s on s.id = ps.session_id
   where ps.person_id = p_person
     and (p_subscription is null or ps.id = p_subscription)
     and s.revoked_at is null and s.expires_at > pg_catalog.now() and s.absolute_expires_at > pg_catalog.now()
  on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- L'essai : cadré sur la personne du contexte, 5 par heure.
create function public.met_en_file_mon_essai_push(p_subscription uuid) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_person uuid := auth.uid();
begin
  if v_person is null then
    raise exception 'Aucune personne dans ce contexte.' using errcode = 'invalid_authorization_specification';
  end if;
  perform private.verrouille_la_personne(v_person);
  if not exists (select 1 from public.push_subscription where id = p_subscription and person_id = v_person) then
    return 'introuvable';
  end if;
  if (select count(*) from public.push_outbox o where o.person_id = v_person and o.kind = 'test'
        and o.created_at > pg_catalog.now() - interval '1 hour') >= 5 then
    return 'quota';
  end if;
  perform private.met_en_file_push('test', v_person, null, pg_catalog.now(), 300, p_subscription);
  return 'ok';
end $$;
```

  `prend_les_pushs(p_limite integer default 50)` : en une instruction `with a as (…update … set state='abandoned' where due and deadline_at <= now()), d as (… dropped where session fermée …), c as (select o.id … for update of o skip locked limit p_limite) update … returning` ; rend `id, kind, subscription_id, attempts, endpoint, p256dh, auth, enabled` (jointure sur `push_setting`) ; **seule fonction qui rend une adresse**.
  `classe_le_push(p_id uuid, p_etat text, p_status smallint default null, p_retry_after_s integer default null)` : `case p_etat when 'sent' …` ; le calcul du délai est `(array[60, 300, 1800, 7200])[least(attempts, 4)]`, au minimum `p_retry_after_s` (borné à 3600), puis `abandoned` si `now() + délai > deadline_at`.
  `private.purge_push_outbox()` et sa planification `cron.schedule('push-outbox-purge', '41 3 * * *', …)` **tolérante** (comme 0126 : avertissement si `pg_cron` manque).
- [ ] **Étape 3 :** `npx supabase migration up`, `npx vitest run tests/db/push-file.test.ts` → 17 cas verts, puis `npm test` sans régression.
- [ ] **Étape 4 : mutations** : prendre sans `skip locked` ; envoyer une ligne échue ; ne pas tester la session ; `sent` sans `sent_at` ; délai de reprise constant ; purger les `queued` ; ajouter une colonne `params jsonb` (le test de schéma casse) ; `met_en_file_push` exécutable par `authenticated` ; oublier le quota.
- [ ] **Étape 5 : commit** `feat(push): ajoute la file d'envoi des notifications` ; PR brouillon.

---

### N4 : Le registre, la charge utile, le chiffrement et l'envoi — ≈ 390 lignes

**Pourquoi :** D2, D5, D6 ; exigences 1 et 5 (chiffrement par la bibliothèque, charge, faux service). **Dépend de :** N2 (adresse, clés, configuration). Aucune base.
**Sources à relire :** RFC 8291 (§ 5 et annexe A : le vecteur), RFC 8292 (VAPID), RFC 8030 §§ 5.2–5.3, pages PyPI de `http-ece` 1.2.1 et `py-vapid` 1.9.6, `webkit.org/blog/16535`.
**Fichiers :** `src/popote_api/push/types.py`, `push/charge.py`, `push/envoi.py`, `infra/push_service.py` (client `httpx`), `tests/unit/test_push_types.py`, `test_push_charge.py`,
`test_push_envoi.py`, `tests/_faux_service_push.py`, `tests/unit/test_architecture.py` (liste de `base.connexion()` : N5), `pyproject.toml`/`uv.lock`, `docs/securite.md`.

- [ ] **Étape 1 : `push/types.py`** (code complet ; **un seul type à livrer : l'essai**) :

```python
"""Le registre des notifications : tout ce qui est propre à un type. Ajouter un type = ajouter une entrée ici (voir « Recette »)."""

from dataclasses import dataclass
from enum import StrEnum
from typing import Final, Literal


class TypeDePush(StrEnum):
    ESSAI = "test"


Urgence = Literal["very-low", "low", "normal", "high"]


@dataclass(frozen=True, slots=True)
class DefinitionDePush:
    type: TypeDePush
    texte: str  # constant, sans paramètre : rien d'intime sur l'écran verrouillé
    chemin: str  # la page d'arrivée, relative à l'origine de l'appli
    ttl_s: int  # durée de vie : au-delà, la notification est abandonnée (60 à 86 400)
    urgence: Urgence
    actif_par_defaut: bool
    reglable: bool  # apparaît dans « Réglages > Notifications »


DEFINITIONS: Final[dict[TypeDePush, DefinitionDePush]] = {
    TypeDePush.ESSAI: DefinitionDePush(
        type=TypeDePush.ESSAI,
        texte="Notification d'essai : Popote peut te prévenir sur cet appareil.",
        chemin="/reglages/notifications",
        ttl_s=300,
        urgence="normal",
        actif_par_defaut=True,
        reglable=False,  # l'essai part toujours : on le demande
    ),
}
```

  Tests (`test_push_types.py`) : toute définition a `60 <= ttl_s <= 86400`, un `chemin` qui commence par `/` sans `//` ni `:` ni `\`, **un texte de 80 caractères au plus sans chiffre, sans `{`, sans `}`, sans `%`**,
  `urgence` valide ; la **clé de `DEFINITIONS` égale `definition.type`** ; chaque valeur de `TypeDePush` respecte la forme `^[a-z][a-z0-9_]{2,40}$` de la base.
- [ ] **Étape 2 : `push/charge.py`** (code complet) :

```python
"""La charge utile : le message déclaratif de WebKit (iOS 18.4), lu aussi par le service worker des autres navigateurs."""

import json
from typing import Final

from popote_api.push.types import DefinitionDePush

MAGIE_DECLARATIVE: Final = 8030
TAILLE_MAX: Final = 1024  # le service accepte 4096 octets au moins (RFC 8030 § 7.2) : on reste très en dessous


def charge_utile(definition: DefinitionDePush, origine: str) -> bytes:
    """`origine` : `Settings.public_base_url` (`https://…`, sans chemin). `navigate` est toujours cette origine + un chemin du registre."""
    corps = {
        "web_push": MAGIE_DECLARATIVE,
        "notification": {
            "title": "Popote",
            "body": definition.texte,
            "navigate": f"{origine}{definition.chemin}",
            "lang": "fr",
            "dir": "ltr",
            "silent": False,
        },
    }
    octets = json.dumps(corps, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if len(octets) > TAILLE_MAX:
        raise ValueError("charge trop grosse")  # faute de programmation : le registre est constant
    return octets
```

  Tests : forme exacte (`web_push == 8030`, `notification.title` non vide, `navigate` absolu **de l'origine**), `silent` faux, taille, déterminisme (même entrée, mêmes octets) ; sans `public_base_url` (absente) la mise en route de N5 refuse d'envoyer (test en N5).
- [ ] **Étape 3 : `push/envoi.py`** : chiffrement + signature + requête. Code complet :

```python
"""Chiffre (RFC 8291), signe (VAPID, RFC 8292) et envoie. Aucun message d'erreur de bibliothèque ne sort d'ici : l'adresse en fait partie."""

import time
from dataclasses import dataclass
from enum import StrEnum
from typing import Final
from urllib.parse import urlsplit

import http_ece
import httpx
from cryptography.hazmat.primitives.asymmetric import ec
from py_vapid import Vapid02

from popote_api.push.adresse import adresse_push_valide
from popote_api.push.cles import decode_auth, decode_p256dh
from popote_api.push.types import DefinitionDePush

DELAI: Final = httpx.Timeout(8.0, connect=3.0)
VIE_DE_LA_SIGNATURE_S: Final = 12 * 3600  # RFC 8292 : 24 h au plus


class Issue(StrEnum):
    ENVOYE = "sent"
    EXPIRE = "expired"  # 404, 410 : l'abonnement n'existe plus
    A_REESSAYER = "retry"  # 429, 5xx, délai, réseau
    REFUSE = "refused"  # 3xx, autre 4xx : définitif


@dataclass(frozen=True, slots=True)
class Resultat:
    issue: Issue
    statut: int | None
    reessayer_apres_s: int | None = None


class ServicePushIndisponible(Exception):
    """Réseau ou délai. Jamais de message : l'exception d'`httpx` cite l'adresse."""


def nouveau_client() -> httpx.AsyncClient:
    # Aucune redirection suivie, aucun proxy lu dans l'environnement : l'adresse venue du client n'est jamais « corrigée ».
    return httpx.AsyncClient(follow_redirects=False, trust_env=False, timeout=DELAI, http2=False)


def classe(statut: int, retry_after: str | None) -> Resultat:
    apres = int(retry_after) if retry_after and retry_after.isdigit() else None
    if statut in (200, 201, 202):
        return Resultat(Issue.ENVOYE, statut)
    if statut in (404, 410):
        return Resultat(Issue.EXPIRE, statut)
    if statut == 429 or 500 <= statut <= 599:
        return Resultat(Issue.A_REESSAYER, statut, apres)
    return Resultat(Issue.REFUSE, statut)


def chiffre(charge: bytes, p256dh: str, auth: str) -> bytes:
    """`aes128gcm` (RFC 8188) avec la clé éphémère et le secret d'authentification de l'abonné (RFC 8291) : c'est `http_ece` qui chiffre."""
    return http_ece.encrypt(
        charge,
        private_key=ec.generate_private_key(ec.SECP256R1()),
        dh=decode_p256dh(p256dh),
        auth_secret=decode_auth(auth),
        version="aes128gcm",
    )


def en_tetes(adresse: str, definition: DefinitionDePush, vapid: Vapid02, sujet: str) -> dict[str, str]:
    morceaux = urlsplit(adresse)
    revendications = {"aud": f"{morceaux.scheme}://{morceaux.netloc}", "sub": sujet, "exp": int(time.time()) + VIE_DE_LA_SIGNATURE_S}
    return {
        **vapid.sign(revendications),
        "TTL": str(definition.ttl_s),
        "Urgency": definition.urgence,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
    }


async def envoie(
    client: httpx.AsyncClient, *, adresse: str, p256dh: str, auth: str, charge: bytes,
    definition: DefinitionDePush, vapid: Vapid02, sujet: str, hotes_de_test: frozenset[str],
) -> Resultat:
    if not adresse_push_valide(adresse, hotes_de_test=hotes_de_test):
        return Resultat(Issue.REFUSE, None)  # défense en profondeur : revérifiée à chaque envoi
    corps = chiffre(charge, p256dh, auth)
    try:
        reponse = await client.post(adresse, content=corps, headers=en_tetes(adresse, definition, vapid, sujet))
    except httpx.HTTPError:
        raise ServicePushIndisponible from None
    return classe(reponse.status_code, reponse.headers.get("retry-after"))
```

- [ ] **Étape 4 : le faux service** (`tests/_faux_service_push.py`) : un `ThreadingHTTPServer` sur `127.0.0.1:0`, qui garde `(chemin, en-têtes, corps)` de chaque `POST`, répond avec un statut réglable
  (`201` par défaut ; `410`, `404`, `429` + `Retry-After`, `500`, `302` + `Location` vers un second écouteur, ou un `time.sleep` plus long que le délai), expose `déchiffre(abonné)` (par `http_ece.decrypt` avec la clé privée et le secret de l'abonné de test) et
  `hote()` (`127.0.0.1:<port>`). **N'existe que dans `tests/` ; l'API l'accepte seulement par `POPOTE_PUSH_HOTES_DE_TEST` (refusé hors local, N2).**
- [ ] **Étape 5 : tests** (`test_push_envoi.py`) :
  1. **vecteur de la RFC 8291, annexe A** : recopier de la RFC les valeurs de l'exemple (clé de l'agent d'application, clé de l'agent utilisateur, secret d'authentification, sel, texte « When I grow up, I want to be a watermelon », corps chiffré attendu), appeler `http_ece.encrypt` avec ces valeurs fixes (`salt=`, `key`/`private_key`) et comparer **octet pour octet** au corps de la RFC ; ces valeurs sont recopiées de la page de la RFC (`rfc-editor.org/rfc/rfc8291.html`), jamais de mémoire ;
  2. aller-retour : `chiffre` puis `http_ece.decrypt` avec la clé privée de l'abonné de test rend la charge d'origine ;
  3. contre le faux service (`201`) : `Issue.ENVOYE` ; **les en-têtes reçus** contiennent `TTL`, `Urgency`, `Content-Encoding: aes128gcm`, `Authorization: vapid t=…` ; **le jeton VAPID se vérifie** avec la clé publique (`aud` = origine du faux service, `sub` = le sujet, `exp` dans les 24 h) ; le corps déchiffré est le message déclaratif ;
  4. `404` et `410` → `EXPIRE` ; `429` avec `Retry-After: 120` → `A_REESSAYER`, `reessayer_apres_s == 120` ; `500` → `A_REESSAYER` ; `400`, `401`, `403`, `413` → `REFUSE` ;
  5. **`302` vers un second écouteur : `REFUSE`, et le second écouteur ne reçoit AUCUNE requête** ;
  6. **proxy ignoré** : avec `HTTPS_PROXY`/`HTTP_PROXY`/`ALL_PROXY` posés vers un écouteur espion, l'envoi n'y passe pas ;
  7. délai : un faux service qui dort 10 s → `ServicePushIndisponible` en moins de 9 s ;
  8. **aucune fuite** : l'exception `ServicePushIndisponible`, `str()`, `repr()`, `__cause__` et `__context__` ne contiennent ni l'adresse ni les clés (`from None` : `__suppress_context__`) ; `caplog` vide d'adresse ;
  9. adresse hors liste blanche → `REFUSE` **sans aucune requête** (espion) ; `p256dh` ou `auth` mal formé → `ValueError` à nous (jamais envoyé).
- [ ] **Étape 6 :** `uv add --exact http-ece==1.2.1 py-vapid==1.9.6` (vérifier `uv.lock` : aucun autre paquet nouveau hors leurs dépendances déjà présentes) ; `uv run pip-audit` et le contrôle de licence (MPL-2.0 de `py-vapid` : voir « Questions ») ;
  contrôles de fin comme N2. **Mutations** : `follow_redirects=True` (le cas 5 casse) ; `trust_env=True` (le 6) ; omettre `TTL` ; omettre `Content-Encoding` ; `aud` fixe au lieu de l'origine du service ; message d'erreur `httpx` propagé ; ne pas revérifier l'adresse ; `ttl` du registre ignoré.
- [ ] **Étape 7 : commit** `feat(push): chiffre, signe et envoie une notification` ; PR brouillon.

---

### N5 : La passe d'envoi et la route interne — ≈ 360 lignes

**Pourquoi :** D3, D9. **Dépend de :** N3, N4.
**Fichiers :** `src/popote_api/infra/push_file.py` (accès à la file : `prend`, `classe`, `efface_l_abonnement`, `retard`), `push/passe.py` (`vide_la_file`), `api/internes_push.py`, `main.py` (montage, client `httpx` dans `app.state`, fermeture à l'arrêt), `tests/unit/test_architecture.py`
(liste fermée de `base.connexion()` : `infra/push_file.py`, raison écrite), `tests/unit/test_push_passe.py`, `tests/integration/test_push_passe.py`, `tests/integration/test_push_interne.py`, `docs/exploitation.md`, `docs/securite.md`.

- [ ] **Étape 1 : la passe** (`push/passe.py`, code complet) :

```python
"""Une passe : prend les lignes échues, envoie hors transaction, classe chaque résultat. Au moins une fois (D9)."""

import asyncio
import time
from dataclasses import dataclass, field
from typing import Final

from popote_api.infra.push_file import FilePush, LigneDue
from popote_api.push.charge import charge_utile
from popote_api.push.envoi import Issue, Resultat, ServicePushIndisponible, envoie
from popote_api.push.types import DEFINITIONS, TypeDePush

BUDGET_S: Final = 15.0  # `pg_net` attend 60 s, la route 25 s (normes § 3.6) : on s'arrête bien avant
SIMULTANES: Final = 5
LIMITE: Final = 50


@dataclass(slots=True)
class Bilan:
    sent: int = 0
    retrying: int = 0
    expired: int = 0
    refused: int = 0
    dropped: int = 0
    abandoned: int = 0
    notes: list[str] = field(default_factory=list)  # jamais d'identifiant : pour les tests seulement


def _definition(ligne: LigneDue):  # type: ignore[no-untyped-def]
    try:
        return DEFINITIONS[TypeDePush(ligne.kind)]
    except (ValueError, KeyError):
        return None


async def vide_la_file(file: FilePush, client, vapid, config, *, horloge=time.monotonic) -> Bilan:  # type: ignore[no-untyped-def]
    """`config` : `origine`, `sujet`, `hotes_de_test`. Sans clés, rien ne part (l'appelant l'a refusé avant)."""
    debut = horloge()
    bilan = Bilan()
    lignes = await file.prend(LIMITE)  # courte transaction : elle valide AVANT tout appel réseau
    barriere = asyncio.Semaphore(SIMULTANES)

    async def une(ligne: LigneDue) -> None:
        definition = _definition(ligne)
        if definition is None:
            await file.classe(ligne.id, "abandoned", None, None)
            bilan.abandoned += 1
            return
        if (ligne.enabled is False) or (ligne.enabled is None and not definition.actif_par_defaut):
            await file.classe(ligne.id, "dropped", None, None)  # la personne a coupé ce type
            bilan.dropped += 1
            return
        if horloge() - debut > BUDGET_S:
            await file.classe(ligne.id, "retry", None, 1)  # on rend la ligne : la passe suivante la reprendra
            return
        async with barriere:
            try:
                resultat: Resultat = await envoie(
                    client, adresse=ligne.endpoint, p256dh=ligne.p256dh, auth=ligne.auth,
                    charge=charge_utile(definition, config.origine), definition=definition, vapid=vapid,
                    sujet=config.sujet, hotes_de_test=config.hotes_de_test,
                )
            except ServicePushIndisponible:
                resultat = Resultat(Issue.A_REESSAYER, None)
        await _classe(file, ligne, resultat, bilan)

    await asyncio.gather(*(une(ligne) for ligne in lignes))
    return bilan


async def _classe(file: FilePush, ligne: LigneDue, resultat: Resultat, bilan: Bilan) -> None:
    match resultat.issue:
        case Issue.ENVOYE:
            await file.classe(ligne.id, "sent", resultat.statut, None)
            bilan.sent += 1
        case Issue.EXPIRE:
            await file.efface_l_abonnement(ligne.subscription_id)  # cascade : ses lignes partent avec lui
            bilan.expired += 1
        case Issue.A_REESSAYER:
            await file.classe(ligne.id, "retry", resultat.statut, resultat.reessayer_apres_s)
            bilan.retrying += 1
        case Issue.REFUSE:
            await file.classe(ligne.id, "abandoned", resultat.statut, None)
            bilan.refused += 1
```

  (La ligne rendue au budget : `classe(…, 'retry', None, 1)` ne consomme pas de tentative utile ; si l'on préfère, une fonction SQL `rend_le_push(id)` remet `queued` et retire un `attempts` : à trancher à l'écriture, avec test.)
- [ ] **Étape 2 : la route** (`api/internes_push.py`, `nouveau_routeur()`, `include_in_schema=False`) : `POST /internal/push/dispatch`, **sans corps**, `async def`. Si les clés VAPID ou `public_base_url` manquent : `503 push_indisponible` (la signature a déjà été vérifiée ; le journal
  dit `push_non_configure`). Sinon : `bilan = await vide_la_file(...)`, puis `retard = await file.retard()` (`push_en_retard`) et `cron_alive = await file.reveil_vivant()` (`public.etat_du_reveil_push()`, N6 ; `true` par défaut tant que N6 n'est pas fusionné :
  le champ existe dès N5). Réponse `200 {sent, retrying, expired, refused, dropped, abandoned (24 h), overdue, remaining, cron_alive}` : **des nombres seulement**.
  **Idempotente par construction** (état relu en base, lignes prises sous `skip locked`) : le test l'écrit.
- [ ] **Étape 3 : `infra/push_file.py`** : quatre fonctions minces qui appellent `public.prend_les_pushs`, `classe_le_push`, `efface_l_abonnement_push`, `push_en_retard` par `base.connexion()` (une transaction courte par appel). `tests/unit/test_architecture.py` : le module est ajouté à la liste fermée, raison écrite.
- [ ] **Étape 4 : tests** : 
  - unitaires de la passe avec une **fausse file en mémoire** et le faux service : envoyée → `sent` ; `410` → l'abonnement est effacé, **aucun autre** ; `429` + `Retry-After` → `retry` avec ce délai ; `500` → `retry` ; `302` → `abandoned` (REFUSE), `refused` compté ; type inconnu du registre → `abandoned` sans envoi ; **réglage coupé** → `dropped` sans envoi ; **réglage absent et `actif_par_defaut` faux** → `dropped` ; **budget dépassé** (horloge injectée) → les lignes restantes sont rendues, pas perdues ; plus de 5 envois simultanés jamais (compteur du faux service) ;
  - intégration (base locale + faux service, deux abonnés dont un expire) : **un abonné `201`, l'autre `410` : la ligne du premier est `sent`, l'abonnement du second a disparu, aucun doublon** ; processus tué après la prise (`claimed_until` passé) → repris, **doublon écrit comme voulu** ; échecs successifs : 60 s, 300 s, 1 800 s, 7 200 s puis `abandoned` à l'échéance ; **la transaction de prise est validée avant l'appel réseau** (le faux service lit `pg_stat_activity` : aucune transaction ouverte de l'API pendant la requête) ;
  - route : sans signature → `404` ; signature périmée → `404` ; signature d'un autre chemin → `404` ; **rejeu dans les 300 s : mêmes lignes, aucune seconde requête au faux service** ; sans clés VAPID → `503` ; **la réponse ne contient ni identifiant, ni adresse** ; `caplog` sans adresse ni clé ; `remaining` juste (plus de 50 lignes : deux passes les finissent) ;
  - `tests/unit/test_routes_fermees.py` et `test_internes.py` : la route est sous `/internal`, avec la dépendance de signature.
- [ ] **Étape 5 : mutations** : classer `sent` avant l'envoi ; garder la transaction ouverte pendant l'envoi ; ne pas effacer l'abonnement expiré ; effacer **tous** les abonnés de la personne sur un `410` ; retenter un `REFUSE` ; ignorer le réglage ; journaliser `ligne` ; `asyncio.gather` sans sémaphore.
- [ ] **Étape 6 : commit** `feat(push): envoie la file des notifications par une route interne signée` ; PR brouillon.

---

### N6 : Le réveil par `pg_cron` et la veille quotidienne (migration M3) — ≈ 300 lignes

**Pourquoi :** D3 ; consigne « le serveur envoie à l'heure prévue alors que le conteneur dort ». **Dépend de :** N5 ; **F8** (planification et coffre `vault` : adresse et secret ; si F8 n'est pas fusionnée, N6 attend, ou reprend ses noms sans les redéfinir).
**Sources à relire :** `docs/exploitation.md` (« Comment une tâche `pg_cron` signera », réserve du corps), `0126_rappels.sql:557-645` (le motif tolérant), plan 0.4ter F8, `.github/workflows/reveil-essai.yml`.
**Fichiers :** `supabase/migrations/<M3>_reveil_push.sql`, `tests/db/push-reveil.test.ts`, `.github/workflows/push-veille.yml`, `docs/exploitation.md`.

- [ ] **Étape 1 : tests de base** (`tests/db/push-reveil.test.ts`, la base locale, **sans `pg_net` réel** : un remplaçant `net.http_post` posé dans un schéma de test enregistre les appels) :
  1. rien d'échu → **aucun appel** ; une ligne échue → **un appel** ; une ligne future → aucun ;
  2. un second passage 30 s plus tard → **aucun appel** (anti-chevauchement 55 s) ;
  3. le dernier appel s'est soldé par un statut ≠ 200 (ligne de `net._http_response` simulée) → pas de nouvel appel avant 5 minutes ;
  4. secrets du coffre absents → `push_passe.statut = 'sans_secret'`, aucun appel, aucune erreur ; extensions absentes → `sans_extension` ;
  5. **la signature** : `private.signe_un_appel_interne('/internal/push/dispatch', '{}')` rend `t=<secondes>,v1=<hex>` ; **`ops/signe_interne.py` calcule la même valeur** pour le même instant, chemin et corps (vecteur figé, comme `tests/unit/test_signature.py`) ;
  6. `public.etat_du_reveil_push()` rend vrai si le job `push-reveil` a tourné avec succès dans les 5 dernières minutes, faux sinon, vrai si `pg_cron` est absent **seulement en local** (jamais en prod : N14 le contrôle) — ici : un paramètre ou un réglage `instance_setting` le dit ; 
  7. surface : `private.reveille_le_push` et la table `push_passe` sans droit pour `authenticated`/`anon` ; `public.etat_du_reveil_push` pour `popote_api` seul.
- [ ] **Étape 2 : la migration** (code complet de la fonction de réveil ; le reste suit 0126) :

```sql
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table private.push_passe (
  id bigint generated always as identity primary key,
  appelee_le timestamptz not null default now(),
  statut text not null check (statut in ('appelee', 'sans_secret', 'sans_extension', 'erreur')),
  requete_id bigint
);
revoke all on private.push_passe from public, anon, authenticated, service_role, popote_api, popote_internal;

-- « t=<secondes>,v1=<hex> » : la formule de docs/exploitation.md (HMAC-SHA256 de « t.POST.chemin.sha256(corps) »).
create function private.signe_un_appel_interne(p_chemin text, p_corps text) returns text
language sql stable security definer set search_path = '' as $$
  select 't=' || t || ',v1=' || encode(extensions.hmac(
           convert_to(t || '.POST.' || p_chemin || '.', 'utf8')
             || convert_to(encode(extensions.digest(convert_to(p_corps, 'utf8'), 'sha256'), 'hex'), 'utf8'),
           convert_to((select decrypted_secret from vault.decrypted_secrets where name = 'popote_internal_secret'), 'utf8'),
           'sha256'), 'hex')
    from (select extract(epoch from pg_catalog.now())::bigint as t) x;
$$;

-- Appelée chaque minute par pg_cron. Réveille le conteneur SEULEMENT s'il y a une ligne échue.
create function private.reveille_le_push() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_url text; v_dernier record; v_statut integer; v_id bigint;
begin
  if not exists (select 1 from public.push_outbox where state in ('queued', 'sending')
                  and (state = 'queued' and next_attempt_at <= pg_catalog.now() or state = 'sending' and claimed_until < pg_catalog.now())) then
    return;  -- rien d'échu : le conteneur dort
  end if;
  select * into v_dernier from private.push_passe order by id desc limit 1;
  if found and v_dernier.appelee_le > pg_catalog.now() - interval '55 seconds' then return; end if;
  if found and v_dernier.requete_id is not null and to_regclass('net._http_response') is not null then
    execute 'select status_code from net._http_response where id = $1' into v_statut using v_dernier.requete_id;
    if v_statut is distinct from 200 and v_dernier.appelee_le > pg_catalog.now() - interval '5 minutes' then return; end if;
  end if;
  if to_regclass('vault.decrypted_secrets') is null or to_regnamespace('net') is null then
    insert into private.push_passe (statut) values ('sans_extension'); return;
  end if;
  execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'popote_internal_base_url' limit 1$q$ into v_url;
  if coalesce(btrim(v_url), '') = '' or not exists (select 1 from vault.decrypted_secrets where name = 'popote_internal_secret') then
    insert into private.push_passe (statut) values ('sans_secret'); return;
  end if;
  begin
    select net.http_post(
      url := v_url || '/internal/push/dispatch',
      headers := pg_catalog.jsonb_build_object('Content-Type', 'application/json',
                  'X-Popote-Signature', private.signe_un_appel_interne('/internal/push/dispatch', '{}')),
      body := '{}'::jsonb, timeout_milliseconds := 60000) into v_id;
    insert into private.push_passe (statut, requete_id) values ('appelee', v_id);
  exception when others then
    insert into private.push_passe (statut) values ('erreur');
  end;
end $$;
```

  suivi de `public.etat_du_reveil_push()` (lecture de `cron.job_run_details` pour le job `push-reveil`, gardée par `to_regclass`), des `revoke`/`grant`, de la planification tolérante
  `cron.schedule('push-reveil', '* * * * *', 'select private.reveille_le_push()')` posée seulement si `pg_cron` existe, d'un avertissement explicite sinon (comme 0126), et du nettoyage `delete from private.push_passe where appelee_le < now() - interval '30 days'` dans la fonction de purge de N3
  (étendre `private.purge_push_outbox` : migration M3, `create or replace` avec le corps de M2 recopié).
  `popote_internal_secret` est le nom que `docs/exploitation.md` donne ; `popote_internal_base_url` est **le nom que F8 pose pour l'adresse du conteneur** : **s'aligner sur F8 à la relecture** (écart à relayer).
- [ ] **Étape 3 : la veille** (`.github/workflows/push-veille.yml`, sur le modèle de `reveil-essai.yml` et du `departs.yml` de F8) :

```yaml
name: Veille des notifications push
on:
  schedule:
    - cron: "23 5 * * *" # chaque jour à 05:23 UTC, hors des heures rondes
  workflow_dispatch:
permissions: {}
concurrency:
  group: push-veille
  cancel-in-progress: false
jobs:
  veille:
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    environment: essai
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - name: Appeler la passe et lire le bilan
        env:
          POPOTE_INTERNAL_SECRET: ${{ secrets.POPOTE_INTERNAL_SECRET }}
          API_INTERNE: ${{ secrets.ESSAI_API_INTERNE_URL }} # secret : une variable s'imprimerait dans le journal d'un dépôt public
        run: |
          set -euo pipefail
          echo '{}' > "$RUNNER_TEMP/corps.json"
          entete="$(python3 ops/signe_interne.py POST /internal/push/dispatch --corps "$RUNNER_TEMP/corps.json")"
          curl --silent --show-error --max-time 60 --retry 3 --retry-delay 10 --retry-all-errors \
            --header "Content-Type: application/json" --header "X-Popote-Signature: $entete" \
            --data-binary "@$RUNNER_TEMP/corps.json" --output "$RUNNER_TEMP/bilan.json" --write-out '%{http_code}' \
            "$API_INTERNE/internal/push/dispatch" | tee "$RUNNER_TEMP/statut"
          test "$(cat "$RUNNER_TEMP/statut")" = "200"
          jq -e '.cron_alive == true and .overdue == 0 and .abandoned == 0 and .remaining == 0' "$RUNNER_TEMP/bilan.json" > /dev/null
```

  Le journal ne montre que le code HTTP ; le bilan n'est lu que par `jq -e` (des nombres sans identifiant, mais rien n'est imprimé). **Dit dans `docs/exploitation.md`** : ce workflow est un **filet** (il appelle aussi la passe, donc il rattrape une ligne échue ce matin-là) ; il peut être retardé, abandonné ou coupé après 60 jours sans activité (C9) : la sonde extérieure du dépôt (dead man's switch de la sauvegarde) reste le contrôle de ce workflow ; il ne remplace pas `pg_cron`.
  `actionlint` et `zizmor` (`workflows.yml`) passent. **Dépend de** `ESSAI_API_INTERNE_URL` (secret d'environnement posé pour F8 : sinon geste de Kamil, regroupé avec ceux de F8).
- [ ] **Étape 4 : repli écrit** : si N0 E1 échoue (signature refusée avec le corps de `pg_net`), M3 est écrite **sans** `reveille_le_push` ; `push-veille.yml` passe à `*/10 * * * *` (précision dégradée à 10 minutes plus le retard de GitHub, **dite aux concepteurs** : « à 15 minutes près ») et appelle la passe seule ; N6 le consigne dans sa PR.
- [ ] **Étape 5 :** `npx supabase migration up` ; `npx vitest run tests/db/push-reveil.test.ts` verts ; `actionlint`. **Mutations** : appeler sans rien d'échu ; retirer l'anti-chevauchement ; retirer l'attente après un échec ; signer `''` au lieu de `{}` ; `cron_alive` toujours vrai ; planifier chaque seconde.
- [ ] **Étape 6 : commit** `feat(push): réveille le conteneur par pg_cron quand une notification est échue` ; PR brouillon.

---

### N7 : Les réglages et la notification d'essai — ≈ 340 lignes

**Pourquoi :** périmètre (« Envoyer une notification d'essai ») ; D2, D8. **Dépend de :** N2, N3, N5.
**Fichiers :** `src/popote_api/api/push_reglages.py`, `api/push_abonnements.py` (la route d'essai), `schemas/push.py`, `infra/push_file.py` (`vide_apres_la_reponse`), `tests/unit/test_push_reglages.py`, `tests/integration/test_push_essai.py`, `tests/integration/test_push_de_bout_en_bout.py`, `tests/authz/test_matrice.py`, `tests/unit/test_posts_idempotents.py`, `openapi.json`, `docs/normes-api.md`.

- [ ] **Étape 1 : tests des réglages** : `GET /me/push-settings` rend **exactement les types réglables du registre** avec leur valeur par défaut quand rien n'est choisi, et le choix de la personne sinon (test avec un registre à deux types réglables injecté, la définition de l'essai n'étant pas réglable) ; `PUT` d'un type inconnu ou non réglable → `404` ; `PUT` deux fois la même valeur → même résultat ; **la valeur d'une personne n'est jamais celle de l'autre** (matrice) ; `enabled` non booléen → `422`.
- [ ] **Étape 2 : tests de l'essai** : `POST …/{id}/test-notifications` → `202 {state: "queued"}` ; **une ligne `test` pour cet abonné seulement** ; un autre abonné de la même personne n'en reçoit pas ; abonnement d'un autre → `404` ; **6e en une heure → `429 quota_notifications_essai` + `Retry-After`** ; `Idempotency-Key` rejouée → pas de seconde ligne ; clés VAPID absentes → `503 push_indisponible` ; sans clé d'idempotence → `400`.
- [ ] **Étape 3 : la route d'essai** : `BackgroundTasks.add_task(vide_la_file_apres_la_reponse)` (comme les mails de F1b : délai de 20 s, `envoie_sans_remonter`, **une erreur ne change jamais la réponse**) ; elle appelle `public.met_en_file_mon_essai_push(%s)` ; `introuvable` → `404`, `quota` → `429` avec `Retry-After: 3600` (borne haute ; la valeur exacte vient de la plus ancienne ligne de la fenêtre si la fonction la rend).
  **Le conteneur étant déjà éveillé par cette requête, l'envoi part tout de suite** ; `pg_cron` ne sert que si le processus meurt.
- [ ] **Étape 4 : le test de bout en bout de l'API** (`test_push_de_bout_en_bout.py`, base locale + faux service ; **c'est la preuve de l'essai côté serveur**) :
  Sam s'abonne (la clé publique `p256dh` et le secret `auth` viennent d'un navigateur simulé dont le test garde la clé privée) → `POST …/test-notifications` → le faux service reçoit **une** requête → `déchiffre` rend le message déclaratif : `web_push == 8030`, `title == "Popote"`, `body` égal au texte du registre, `navigate == <origine>/reglages/notifications` ; la ligne est `sent` ; **Léa**, d'un autre foyer, n'a rien reçu ; **la déconnexion de l'appareil de Sam (`DELETE /me/sessions/current`) supprime son abonnement** ; **`DELETE /me` supprime tout : abonnements, file, réglages** (compte des trois tables à zéro, après Auth) ; l'adresse n'apparaît dans aucune réponse ni aucun `caplog` du scénario entier.
- [ ] **Étape 5 :** contrat régénéré, contrôles de fin, `tests/authz` (une ligne par route, trois acteurs). **Mutations** : le quota à 6 ; un `PUT` qui écrit pour une autre personne ; l'essai pour tous les abonnés ; rendre l'erreur d'envoi à la réponse ; ne pas supprimer les réglages avec le compte.
- [ ] **Étape 6 : commit** `feat(push): règle les notifications et envoie une notification d'essai` ; PR brouillon.

---

### N8 : Le script des clés VAPID et la fiche d'exploitation — ≈ 330 lignes

**Pourquoi :** consigne « générées et posées par Kamil lui-même avec un script fourni ». **Dépend de :** N2 (noms des variables). **Aucun secret n'est écrit nulle part dans le dépôt.**
**Modèle :** `~/PERSO/sauvegardes-popote/outils-orchestration/gestes-13-11.sh` et son `.py` (lus le 13/11) : `--a-blanc`, lecture du presse-papiers sans terminal, rien d'affiché, vérification que les autres secrets du conteneur n'ont pas bougé.
**Fichiers :** `ops/pose-les-cles-push.sh`, `ops/pose_les_cles_push.py`, `tests/unit/test_pose_les_cles_push.py`, `docs/exploitation.md` (§ « Notifications push : poser, tourner, contrôler »), `.env.example`.

- [ ] **Étape 1 : `ops/pose-les-cles-push.sh`** (à lancer par Kamil) :

```bash
#!/bin/bash
# Pose les clés VAPID du conteneur de l'essai. À lancer dans ton terminal :
#   bash ops/pose-les-cles-push.sh --a-blanc   (lecture seule : dit ce qui serait fait)
#   bash ops/pose-les-cles-push.sh             (pour de vrai : génère, pose, redéploie)
#   bash ops/pose-les-cles-push.sh --tourne    (remplace des clés déjà posées : TOUS les abonnements sont à refaire)
set -euo pipefail
set -a; . ~/.config/popote/secrets.env; set +a
cd "$(dirname "$0")/.."
exec uv run --frozen python -I ops/pose_les_cles_push.py "$@"
```

- [ ] **Étape 2 : `ops/pose_les_cles_push.py`** (stdlib + `py_vapid`, déjà installés par `uv sync`) : le fichier suit `gestes-13-11.py` (mêmes fonctions `appel`, `scw`, `stop`, `ok`). Comportement, **test par test** :
  1. cible **`essai` seulement** (`SCW_DEFAULT_PROJECT_ID`, conteneur nommé `api`, région `fr-par`) ; la prod est un autre geste, au jour J (0.8), avec ses propres variables : le script **refuse** toute autre cible et **ne lit aucune variable de prod** ;
  2. lit le conteneur (`GET …/containers/v1beta1/regions/fr-par/containers/<id>`), garde `secret_environment_variables` (clés et `hashed_value`) et `environment_variables` avant ;
  3. **si `POPOTE_VAPID_PRIVATE_KEY` existe déjà** et que `--tourne` n'est pas donné : s'arrête avec « clés déjà posées ; `--tourne` invalide tous les abonnements » (aucune écriture) ;
  4. génère une paire (`Vapid02().generate_keys()`) : **privée** = 32 octets en base64url sans remplissage, **publique** = point non compressé de 65 octets en base64url sans remplissage ; **la privée ne touche ni le disque ni l'écran** ;
  5. `PATCH` : `secret_environment_variables: [{key: "POPOTE_VAPID_PRIVATE_KEY", value: <privée>}]` et `environment_variables` = **les variables existantes + `POPOTE_VAPID_PUBLIC_KEY` + `POPOTE_VAPID_SUBJECT` (`mailto:bonjour@notre-popote.fr`)** (on envoie la carte complète : on ne suppose pas que `PATCH` fusionne) ;
  6. relit le conteneur : **aucun autre secret ni variable n'a bougé** (hachages comparés, comme `gestes-13-11.py`), sinon `stop` avec « préviens-moi tout de suite, l'essai en dépend » ;
  7. **redéploie** le conteneur (`POST …/containers/<id>/deploy`, la route de déploiement de l'API Scaleway Containers v1beta1 : **hypothèse H1, à vérifier dans la référence de l'API avant d'écrire cette ligne** ; si la route diffère, le script le dit et Kamil clique « Déployer » dans la console), attend `status == ready`, puis lit `GET https://<hôte de l'essai>/api/healthz` (public). Le script **ne teste pas le push** : l'API exige une session ; l'essai de bout en bout est N14 ;
  8. affiche **seulement** : les 8 premiers caractères de la clé publique, « clés posées, redéploiement terminé, les autres secrets sont intacts » ; **jamais** la privée ; `del privee` ;
  9. `--a-blanc` : ne fait que lire, dit les variables présentes, ce qui serait ajouté, et sort `0` sans écriture.
  Tests (`test_pose_les_cles_push.py`, sans réseau, `appel` simulé) : refus sans `--tourne` quand la clé existe ; carte d'`environment_variables` complète envoyée ; **la sortie standard et la sortie d'erreur d'une exécution simulée ne contiennent jamais la valeur de la privée** (la valeur générée est capturée par l'espion et cherchée dans toute la sortie) ; la paire écrite est cohérente (la publique dérivée de la privée égale la publique) ; `--a-blanc` n'écrit pas ; **mutation** : afficher la privée casse le test ; envoyer seulement la nouvelle variable casse le test de la carte.
- [ ] **Étape 3 : la fiche** (`docs/exploitation.md`) : poser (le script), contrôler (`GET /api/healthz` ; `GET /me/push-config` rend `enabled: true`), **tourner** (échéance : 12 mois ; `--tourne` ; tous les abonnements deviennent faux, le front se réabonne à l'ouverture, N11), si la clé est perdue ou exposée (tourner), lever un blocage (`update public.push_outbox set state = 'queued', attempts = 0, next_attempt_at = now(), deadline_at = now() + interval '5 minutes' where state = 'abandoned' and created_at > now() - interval '1 day'`), lire les retards (requête de contrôle : lignes échues depuis plus de 5 minutes), voir le job (`select * from cron.job where jobname = 'push-reveil'`), couper le push d'urgence (retirer `POPOTE_VAPID_PRIVATE_KEY` : l'API refuse de démarrer sa moitié : `enabled` faux, aucune notification ne part ; les lignes vieillissent jusqu'à leur échéance).
  **Inventaire du secret** (`managing-configuration-and-secrets`) : propriétaire Kamil, objet « signer les envois de push de l'essai », échéance 12 mois, méthode `--tourne`.
- [ ] **Étape 4 :** `uv run ruff format --check && uv run ruff check && uv run mypy && uv run pytest -q -m "not integration"` verts ; `shellcheck ops/pose-les-cles-push.sh`. **Commit** `feat(push): ajoute le script qui pose les clés VAPID` ; PR brouillon.

---

### N9 : L'amendement à F22 (service worker en `injectManifest`) — à appliquer **dans la PR de F22**, ≈ +90 lignes

**Pourquoi :** D11 ; C13. **Cette section est un amendement à la tâche F22 de `docs/superpowers/plans/2026-11-13-fondation-du-front.md` ; il PRIME sur le texte de F22 pour tout ce qui suit.** L'agent du front l'applique en écrivant F22 ; il ne lance pas de PR à part.

**Ce qui change dans F22 :**

| Dans F22 | Avant | Après |
|---|---|---|
| Fichiers | `vite.config.ts` (`generateSW`) | + `src/sw/sw.ts` (le service worker, nôtre), `src/sw/tsconfig.json` (lib `WebWorker`), `src/sw/types.d.ts` ; `package.json` : `workbox-precaching@7.4.1`, `workbox-routing@7.4.1`, `workbox-core@7.4.1` (exacts, avec `workbox-build@7.4.1`, `workbox-window@7.4.1`) |
| Plugin | `registerType: 'prompt', injectRegister: false, workbox: {…}` | `VitePWA({ strategies: 'injectManifest', srcDir: 'src/sw', filename: 'sw.ts', registerType: 'prompt', injectRegister: false, injectManifest: { globIgnores: ['mail/**', '**/*.map'], injectionPoint: 'self.__WB_MANIFEST' }, manifest: {…inchangé…} })` |
| Refus de `/api/` et `/mail/` (D5) | `workbox.navigateFallbackDenylist: [/^\/api\//, /^\/mail\//]`, `runtimeCaching: []`, `cleanupOutdatedCaches: true` | **dans `sw.ts`** : `NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/api\//, /^\/mail\//] })`, **aucun `registerRoute` à `runtimeCaching`**, `cleanupOutdatedCaches()` ; mêmes garanties (précache = fichiers du build seulement ; `/api/` et `/mail/` hors repli de navigation) |
| Mise à jour | `useRegisterSW` + bandeau `prompt` | **inchangé**, avec l'écouteur `SKIP_WAITING` **dans `sw.ts`** (l'inscription par `virtual:pwa-register/react` ne change pas) |
| Transition F1 → F22 | `skipWaiting` « une fois » | `sw.ts` appelle `self.skipWaiting()` et `clientsClaim()` au démarrage **tant que « retiré à F23+1 » n'a pas eu lieu** (la ligne est marquée `// F23+1 : retirer`) |
| `scripts/verifie-sw-remplacant.mjs` (F1) | exécute `sw.js` avec workbox **simulé par `define`** et exige `skipWaiting` et `clientsClaim` **au démarrage** | **réécrit** : exécute le `sw.js` construit (workbox embarqué, plus de `define`) dans un bac à sable dont `self` **enregistre ses écouteurs**, puis **déclenche `install` puis `activate`** avec de faux événements (`waitUntil` collecte les promesses) et exige : `skipWaiting` appelé au plus tard à `install`, `clients.claim()` appelé à `activate` ; un commentaire ou une chaîne ne passent pas ; **mutations** : retirer `skipWaiting` (rouge), retirer `clientsClaim()` (rouge), laisser seulement le `SKIP_WAITING` du message (rouge, comme le constat de F1) |
| `verifie-build.mjs` (F22) | « aucune route d'exécution dont l'expression reconnaît `/api/` » | idem sur le `sw.js` construit, exécuté dans le même bac à sable : **toute route enregistrée est interrogée avec `/api/v1/me` et `/mail/x.png`** (mode navigation compris) et **aucune ne doit y répondre** ; le précache ne contient aucune URL `/api` ; la liste de refus `/^\/api\//` est présente |
| `e2e/pwa.spec.ts` | inchangé | inchangé (les garanties sont les mêmes) ; **ajouter** : le `sw.js` livré contient les écouteurs `push`, `notificationclick` et `pushsubscriptionchange` (N10 les écrit ; cette ligne n'est vérifiée qu'à N10) |
| `tsconfig` | — | `src/sw/` est compilé avec `lib: ["ESNext", "WebWorker"]` **sans** `DOM` (un fichier de service worker n'importe jamais le DOM) ; `npx tsc -b` reste vert |

**Code de `src/sw/sw.ts` livré par F22 (sans les écouteurs de push, que N10 ajoute) :**

```ts
/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST) // les fichiers du build, rien d'autre (D5 : aucun /api, aucun /mail)
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/api\//, /^\/mail\//] }),
)

// Mise à jour sur demande (registerType: 'prompt') : la bannière envoie ce message.
self.addEventListener('message', (evenement) => {
  if (evenement.data && evenement.data.type === 'SKIP_WAITING') void self.skipWaiting()
})

// F23+1 : retirer. Transition F1 → F22 : le service worker de F1 est en `autoUpdate`, celui-ci doit le remplacer seul.
void self.skipWaiting()
clientsClaim()
```

**Cas de test ajoutés à F22 :** les cas de `verifie-build` et de `verifie-sw-remplacant` ci-dessus, chacun avec sa mutation ; le `sw.js` construit **n'a aucun `fetch` d'une route `/api/`** ; `e2e/pwa.spec.ts` inchangé et vert.
**Taille :** F22 passe de ≈ 330 à ≈ 420 lignes : **coupe prévue** : (F22a) le service worker `injectManifest`, le garde réécrit et leurs tests ; (F22b) le bandeau de mise à jour, le manifeste, les e2e.
**Retour arrière :** inchangé (`selfDestroying: true` puis redéploiement, ou `git revert`).

---

### N10 : Le service worker reçoit, affiche, ouvre — ≈ 330 lignes

**Pourquoi :** exigence 4 ; D6, D7. **Dépend de :** N9. **Sources à relire :** MDN `ServiceWorkerGlobalScope` (`push`, `notificationclick`, `pushsubscriptionchange`), `PushEvent.data`, `Clients.openWindow`/`WindowClient.navigate` (compatibilité WebKit), `webkit.org/blog/16535`.
**Fichiers :** `src/sw/push.ts`, `src/sw/push.test.ts`, `src/sw/sw.ts` (une ligne : `installePush(self)`), `src/sw/api-push.ts` (le **seul** `fetch` du service worker, exception **écrite**), `src/architecture.test.ts` (liste blanche de `src/sw/api-push.ts` dans la garde « aucun `fetch` hors de `src/api/` », F5b), `docs/front.md`.

- [ ] **Étape 1 : tests** (`src/sw/push.test.ts`, Vitest, environnement `node`, **fausse portée de service worker** : un objet qui enregistre `addEventListener`, `registration.showNotification`, `clients.matchAll/openWindow`, `location.origin = 'https://exemple.test'` ; les événements sont des objets avec `waitUntil` qui collecte) :
  1. **`push` avec le message déclaratif valide** → `showNotification('Popote', { body, lang: 'fr', dir: 'ltr', silent: false, icon, data: { navigate: '/reglages/notifications' } })` ; `waitUntil` reçoit la promesse ;
  2. **`push` sans données, JSON invalide, `web_push` ≠ 8030, `title` vide, `body` de plus de 200 caractères, `navigate` d'une **autre origine**, `navigate` en `javascript:`, `//evil.test/x`, `navigate` absent** → **une notification générique est quand même affichée** (« Popote a quelque chose à te montrer. », page `/`) : **jamais de push silencieux** (WebKit révoque l'abonnement) ;
  3. **`notificationclick`** : ferme la notification ; si une fenêtre de la même origine existe, `focus()` puis `navigate(url)` ; sinon `openWindow(url)` ; une donnée `navigate` hors origine ou absente → `/` ; **jamais** d'ouverture d'une autre origine ;
  4. **`pushsubscriptionchange`** : se réabonne avec la **même** `applicationServerKey` (celle de `oldSubscription`), puis appelle `api-push` pour l'enregistrer ; **si `oldSubscription` manque** ou si l'appel échoue : ne lève pas, ne montre rien (le front se réconcilie à l'ouverture, N11) ;
  5. `lisLaNotification` est pure et testée seule (table de cas ci-dessus) ;
  6. **le texte affiché vient du message, jamais d'une valeur codée en dur sauf le repli** ; `silent` est **toujours faux** (même si le message dit vrai) : test + mutation.
- [ ] **Étape 2 : `src/sw/push.ts`** (code complet) :

```ts
/// <reference lib="webworker" />
import { enregistreAbonnement } from './api-push'

declare const self: ServiceWorkerGlobalScope

const MAGIE_DECLARATIVE = 8030
const REPLI = { title: 'Popote', body: 'Popote a quelque chose à te montrer.', navigate: '/' } as const

export interface Affichage { title: string; options: NotificationOptions & { data: { navigate: string } } }

/** Chemin relatif de la même origine, ou `/` : `navigate` ne sort jamais de l'appli (redirection ouverte). */
export function cheminSur(navigate: unknown, origine: string): string {
  if (typeof navigate !== 'string' || navigate.length > 512 || navigate.startsWith('//') || navigate.includes('\\')) return '/'
  try {
    const url = new URL(navigate, origine)
    return url.origin === origine ? `${url.pathname}${url.search}` : '/'
  } catch {
    return '/'
  }
}

export function lisLaNotification(donnees: unknown, origine: string): Affichage {
  const fabrique = (title: string, body: string, navigate: string, lang?: string, dir?: string): Affichage => ({
    title,
    options: {
      body, lang, dir: dir as NotificationDirection | undefined, silent: false, // jamais silencieux : WebKit révoque l'abonnement
      icon: '/icone-192.png', data: { navigate: cheminSur(navigate, origine) },
    },
  })
  if (typeof donnees === 'object' && donnees !== null) {
    const message = donnees as { web_push?: unknown; notification?: Record<string, unknown> }
    const n = message.notification
    if (message.web_push === MAGIE_DECLARATIVE && n && typeof n.title === 'string' && n.title.length > 0 && n.title.length <= 100) {
      const body = typeof n.body === 'string' && n.body.length <= 200 ? n.body : ''
      return fabrique(n.title, body, typeof n.navigate === 'string' ? n.navigate : '/',
        typeof n.lang === 'string' ? n.lang : 'fr', typeof n.dir === 'string' ? n.dir : 'ltr')
    }
  }
  return fabrique(REPLI.title, REPLI.body, REPLI.navigate, 'fr', 'ltr')
}

async function lisLesDonnees(evenement: PushEvent): Promise<unknown> {
  try { return evenement.data ? evenement.data.json() : null } catch { return null }
}

export function installePush(portee: ServiceWorkerGlobalScope = self): void {
  portee.addEventListener('push', (evenement) => {
    evenement.waitUntil((async () => {
      const { title, options } = lisLaNotification(await lisLesDonnees(evenement), portee.location.origin)
      await portee.registration.showNotification(title, options)
    })())
  })
  portee.addEventListener('notificationclick', (evenement) => {
    evenement.notification.close()
    const chemin = cheminSur((evenement.notification.data as { navigate?: unknown } | null)?.navigate, portee.location.origin)
    const url = new URL(chemin, portee.location.origin).href
    evenement.waitUntil((async () => {
      const fenetres = await portee.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const ici = fenetres.find((f) => new URL(f.url).origin === portee.location.origin)
      if (ici) { await ici.focus(); await ici.navigate(url) } else { await portee.clients.openWindow(url) }
    })())
  })
  portee.addEventListener('pushsubscriptionchange', ((evenement: PushSubscriptionChangeEvent) => {
    evenement.waitUntil((async () => {
      try {
        const cle = evenement.oldSubscription?.options.applicationServerKey
        if (!cle) return
        const abonnement = await portee.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cle })
        await enregistreAbonnement(abonnement.toJSON())
      } catch { /* le front se réconcilie à l'ouverture (N11) : rien à dire ici */ }
    })())
  }) as EventListener)
}
```

  `src/sw/api-push.ts` : **une seule fonction**, `enregistreAbonnement(json)` : `fetch('/api/v1/me/push-subscriptions', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Popote-Client': 'web', 'Idempotency-Key': '"' + crypto.randomUUID() + '"' }, body })` ; **un seul fichier**, exception écrite à la garde d'architecture (F5b : « aucun `fetch` hors de `src/api/` » gagne cette ligne blanche, avec sa raison : le service worker n'a pas accès au client généré) ; test : l'appel pose les trois en-têtes, jamais d'adresse dans une exception.
- [ ] **Étape 3 :** `sw.ts` appelle `installePush(self)` ; `npx tsc -b`, `npm test`, `npm run build` ; **`verifie-build` exige maintenant les trois écouteurs dans `sw.js`**. **Mutations** : `silent: true` laissé passer ; ne pas vérifier l'origine de `navigate` ; ne rien afficher quand le message est invalide (le cas 2 casse) ; ouvrir une fenêtre sans fermer la notification ; `pushsubscriptionchange` qui lève.
- [ ] **Étape 4 : commit** `feat(front): le service worker affiche les notifications et ouvre la bonne page` ; PR brouillon.

---

### N11 : La couche push du front (hooks, état, gestes) — ≈ 360 lignes

**Pourquoi :** exigence 4 (état, demander après un geste, iPhone hors écran d'accueil) ; D7, D10. **Dépend de :** N10, et du contrat de N2 et N7 (synchronisé par F4).
**Fichiers :** `src/api/ressources/push.ts` (hooks par ressource : F5b), `src/push/etat.ts`, `src/push/abonnement.ts`, `src/push/plateforme.ts`, `src/push/reconcilie.ts`, tests voisins `*.test.ts(x)`, `src/textes/notifications.ts` (N12).

- [ ] **Étape 1 : `plateforme.ts` et `etat.ts`** : fonctions **pures**, testées par table :
  - `plateforme({ ua, platform, maxTouchPoints, standalone, displayModeStandalone, aServiceWorker, aPushManager, aNotification })` → `{ ios: boolean, installee: boolean, supporte: boolean }` (iPadOS 13+ se présente comme un Mac : `platform === 'MacIntel' && maxTouchPoints > 1` vaut iOS) ;
  - `etatDesNotifications({ plateforme, permission, config, abonnementDuNavigateur, abonnementsDuServeur, session })` → l'union : `non-supporte` · **`a-installer`** (iOS hors écran d'accueil : **on ne demande rien**) · `indisponible` (`config.enabled` faux) · `a-demander` (`permission === 'default'`) · `refuse` (`'denied'` : texte différent iOS et autres) · `actif-ici` (accord, abonnement du navigateur **et** ligne du serveur correspondante `current`) · `a-reparer` (accord mais abonnement du navigateur absent, ou absent du serveur, ou clé publique du serveur ≠ celle de l'abonnement) ;
  - table de cas : un cas par état et par plateforme (iPhone Safari onglet → `a-installer` **même si** `PushManager` est absent ; iPhone installée → `a-demander` ; Chrome Android ; Firefox ; Safari macOS ; navigateur sans `PushManager` hors iOS → `non-supporte`).
- [ ] **Étape 2 : `abonnement.ts`** (code complet des deux gestes ; **le premier `await` du clic est la permission**) :

```ts
export class PermissionRefusee extends Error {}

export function cleEnOctets(cle: string): Uint8Array {
  const base64 = cle.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(cle.length / 4) * 4, '=')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

/** À appeler DIRECTEMENT dans un gestionnaire de clic : sur iPhone, la demande doit suivre le geste (aucun `await` avant). */
export async function active(cleVapid: string): Promise<PushSubscriptionJSON> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new PermissionRefusee()
  const enregistrement = await navigator.serviceWorker.ready
  const existant = await enregistrement.pushManager.getSubscription()
  if (existant && memeCle(existant, cleVapid)) return existant.toJSON()
  await existant?.unsubscribe() // la clé du serveur a changé : l'ancien abonnement ne servirait plus
  const abonnement = await enregistrement.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleEnOctets(cleVapid) })
  return abonnement.toJSON()
}

export async function desabonneCetAppareil(): Promise<void> {
  const enregistrement = await navigator.serviceWorker.getRegistration()
  await (await enregistrement?.pushManager.getSubscription())?.unsubscribe()
}
```

  `memeCle` compare l'`applicationServerKey` de l'abonnement (octets) à la clé du serveur. Tests (faux `navigator`, `Notification`, `serviceWorker`) : refus → `PermissionRefusee`, **`subscribe` jamais appelé** ; accord → `subscribe` appelé avec `userVisibleOnly: true` et la bonne clé ; abonnement existant de même clé → réutilisé, aucun `subscribe` ; clé changée → `unsubscribe` puis `subscribe` ; **`Notification.requestPermission` est le premier appel asynchrone** (ordre des appels espionnés) ; `desabonneCetAppareil` sans enregistrement ne lève pas.
- [ ] **Étape 3 : hooks** (`src/api/ressources/push.ts`, un par opération du contrat : `usePushConfig`, `usePushAbonnements`, `useEnregistreAbonnement` (porte l'`Idempotency-Key` fournie par le client, F9 de la fondation), `useRetireAbonnement`, `usePushReglages`, `useRegleNotification`, `useEnvoieEssai`) ; clés de requête précises (`['push', 'config']`, `['push', 'abonnements']`, `['push', 'reglages']`) ; **aucune invalidation globale** ; `409 trop_d_abonnements_push`, `429`, `503` se lisent par `type` (A2 de la fondation), jamais par `detail`.
- [ ] **Étape 4 : `reconcilie.ts`** (« se réconcilier à chaque ouverture », appelé une fois par la coque connectée) : si la permission est accordée, que l'abonnement du navigateur existe et que le serveur ne le connaît pas **ou** que `config.vapid_public_key` a changé → se réabonne et réenregistre ; **jamais de demande de permission ici** (aucun geste) ; échec silencieux sauf `console.error` d'une référence. Tests : serveur sans l'appareil → réenregistre ; clé tournée → `unsubscribe` + `subscribe` + réenregistre ; permission `default` → ne fait rien ; aucun appel quand tout concorde.
- [ ] **Étape 5 :** **la déconnexion** : exposer `desabonneCetAppareil()` ; **à relayer au plan d'« Entrer »** : la déconnexion d'un appareil l'appelle **avant** `DELETE /me/sessions/current` (le serveur supprime de toute façon la ligne, D4 ; ceci libère l'abonnement du navigateur). Hors de ce plan : je ne modifie pas le parcours.
- [ ] **Étape 6 :** `npx tsc -b`, `npm test`, `npm run build` verts. **Mutations** : demander la permission après un autre `await` (le test d'ordre casse) ; classer l'iPhone hors écran d'accueil en `a-demander` ; ne pas comparer la clé ; réconcilier en demandant la permission. **Commit** `feat(front): la couche des notifications push (état, geste, réconciliation)` ; PR brouillon.

---

### N12 : L'écran « Notifications » des réglages — ≈ 330 lignes

**Pourquoi :** périmètre (« Envoyer une notification d'essai » depuis les réglages) ; exigence 4 (iPhone : expliquer au lieu de demander). **Dépend de :** N11. **Skill :** `frontend-design:frontend-design` (système « Jeu » : composants de F9 à F17, jamais de CSS neuf pour un état déjà couvert).
**Fichiers :** `src/routes/_connecte.reglages.notifications.tsx` (route **provisoire** : la navigation des réglages est dessinée par la session design ; la route peut déménager, le composant non), `src/notifications/EcranNotifications.tsx` (+ test), `src/textes/notifications.ts`, `src/banc/sections/notifications.tsx` (**un cas par état**), `src/routes/routes.test.tsx` (titre de page, frontière d'erreur).

- [ ] **Étape 1 : `src/textes/notifications.ts`** (fonctions typées ; **ces phrases sont une proposition à valider** par le propriétaire en conversation, et la session design a la main sur le ton) :

```ts
export const notifications = {
  titre: 'Notifications',
  nonSupporte: 'Ce navigateur ne sait pas envoyer de notifications. Essaie avec Popote installée sur ton téléphone.',
  aInstaller: 'Pour recevoir des notifications sur iPhone, ajoute d’abord Popote à ton écran d’accueil.',
  etapesInstallation: [
    'Touche le bouton Partager de Safari.',
    'Choisis « Sur l’écran d’accueil ».',
    'Ouvre Popote avec sa nouvelle icône, puis reviens ici.',
  ],
  indisponible: 'Les notifications ne sont pas encore disponibles.',
  aDemander: 'Popote peut te prévenir sur cet appareil. Le texte reste général : le détail s’affiche dans l’appli.',
  activer: 'Activer sur cet appareil',
  refuseIos: 'Les notifications sont bloquées pour Popote. Ouvre Réglages > Notifications > Popote et autorise-les.',
  refuse: 'Les notifications sont bloquées pour Popote. Autorise-les dans les réglages de ton navigateur pour ce site.',
  actifIci: 'Les notifications sont actives sur cet appareil.',
  aReparer: 'Les notifications doivent être réactivées sur cet appareil.',
  reactiver: 'Réactiver',
  essai: 'Envoyer une notification d’essai',
  essaiEnvoyee: 'Notification envoyée. Elle arrive dans quelques secondes.',
  essaiRien: 'Rien reçu ? Vérifie que Popote est autorisée à t’envoyer des notifications.',
  essaiLimite: 'Tu as déjà fait cinq essais cette heure-ci. Réessaie plus tard.',
  desactiver: 'Désactiver sur cet appareil',
  tropAppareils: 'Tu as déjà cinq appareils avec des notifications. Retires-en un depuis tes appareils.',
  rienARegler: 'Rien à régler pour l’instant.',
} as const
```

- [ ] **Étape 2 : tests de l'écran** (Testing Library, par rôle et nom, `userEvent.setup()`, `verifieAxe`, MSW pour l'API) : un test **par état** de N11, avec ce que la personne voit **et ne voit pas** :
  `a-installer` → le titre, les trois étapes en liste ordonnée, **aucun bouton « Activer »**, `Notification.requestPermission` **jamais appelé** ; `a-demander` → bouton « Activer sur cet appareil » : le clic appelle la permission **puis** enregistre (MSW reçoit un `POST` avec `Idempotency-Key` entre guillemets et `X-Popote-Client: web`) ; `refuse` (iOS et autre : deux phrases) → aucune demande, aucun bouton ; `actif-ici` → « Envoyer une notification d'essai » et « Désactiver » ; le clic sur l'essai envoie `POST …/test-notifications` et dit `essaiEnvoyee` dans une région `role="status"` **présente dès le premier rendu** ; `429` → `essaiLimite` (`role="alert"` : l'erreur) ; `409 trop_d_abonnements_push` à l'activation → `tropAppareils` ; `503` (`indisponible` côté config) → `indisponible` ; `a-reparer` → « Réactiver ».
  **Clavier** : `user.tab()` atteint chaque bouton dans l'ordre visuel ; focus visible ; **pas de focus perdu** après l'activation (le focus reste sur le bouton ou passe au suivant logique) ; cibles d'au moins 44 × 44 (le banc, Chromium).
- [ ] **Étape 3 : le composant** : `EcranNotifications` lit `usePushConfig`, `usePushAbonnements`, `Notification.permission` et `navigator.serviceWorker` (via `plateforme.ts`), calcule l'état (N11), et rend **un bloc** du système « Jeu » (Bloc, Bouton, ligne d'effet, marmite en état neutre ; le choix précis revient à la session design). Les gestes : `onClick={() => { void active(cle).then(enregistre).catch(…) }}` **sans aucun `await` avant** `active`. La liste des types réglables (`usePushReglages`) s'affiche sous le bloc **si elle n'est pas vide** ; sinon `rienARegler` (aujourd'hui l'essai n'est pas réglable : la liste est vide).
  **`document.title` : « Notifications — Popote »** ; frontière d'erreur de la route ; la section du banc a un cas par état (légendes sans donnée personnelle ; Sam et Léa).
- [ ] **Étape 4 :** `npm run lint`, `npx tsc -b`, `npm test`, `npm run build` ; le banc (axe, captures **regardées**) ; **liste de preuves manuelles à remplir dans la PR** (clavier seul, lecteur d'écran : « non prouvé » admis s'il est écrit). **Mutations** : afficher « Activer » sur l'iPhone non installé ; `requestPermission` après un `await` ; message de refus identique iOS et autres ; essai sans région `status`. **Commit** `feat(front): l'écran des notifications avec l'essai` ; PR brouillon.

---

### N13 : L'essai de bout en bout avec un faux service de push — ≈ 330 lignes

**Pourquoi :** exigence 5 (« un faux service push local pour l'e2e (autorisé seulement en test) »). **Dépend de :** N7, N12, et du harnais d'e2e contre l'API locale de la fondation (relais local `wrangler dev`, API réelle pour les parcours) : s'il n'existe pas encore, **cette tâche attend** (la preuve côté serveur est déjà dans N7).
**Fichiers :** `e2e/push.spec.ts`, `e2e/aides/faux-service-push.mjs`, `e2e/aides/chiffrement.mjs` + `e2e/aides/chiffrement.test.mjs`, `e2e/aides/abonne-factice.ts`, `package.json` (script).

- [ ] **Étape 1 : `chiffrement.mjs`** : déchiffrement RFC 8291 / RFC 8188 (`aes128gcm`) avec `node:crypto` (ECDH P-256, HKDF-SHA256, AES-128-GCM), une seule fonction `dechiffre(corps, clePriveeDeLAgent, secretAuth) → Buffer`. **Test du vecteur de l'annexe A de la RFC 8291** (valeurs recopiées de la RFC) : le déchiffrement du corps de la RFC rend « When I grow up, I want to be a watermelon » ; **et** un aller-retour avec un corps produit par `http_ece` (octets figés dans le test, produits une fois par la commande donnée dans le test) : les deux mondes (Python qui chiffre, Node qui déchiffre) s'entendent. **Mutation** : un octet changé dans le corps → échec d'authentification.
- [ ] **Étape 2 : `faux-service-push.mjs`** : serveur `node:http` sur `127.0.0.1:0` ; garde les requêtes reçues ; répond `201` (ou un statut réglable par l'appel de test) ; sert `GET /_recus` au test (en local seulement : jamais exposé ailleurs) ; **l'API est lancée avec `POPOTE_PUSH_HOTES_DE_TEST=127.0.0.1:<port>` et des clés VAPID jetables du test** (générées par le test, jamais écrites sur disque hors du dossier temporaire du test).
- [ ] **Étape 3 : `abonne-factice.ts` et le scénario** (`push.spec.ts`, Chromium, relais local, **un seul `addInitScript`**) : le test remplace `PushManager.prototype.subscribe` / `getSubscription` par un abonnement **factice** dont l'`endpoint` est `http://127.0.0.1:<port>/push/abc`, avec une vraie paire de clés P-256 et un secret `auth` produits par le test (la clé privée reste dans le test). Sam (session de banc) ouvre `/reglages/notifications` :
  1. l'écran montre « Activer sur cet appareil » ; le clic accorde la permission (`context.grantPermissions(['notifications'])` : **si E2 a montré que cela échoue sur ce Chromium, le test pose `Notification.permission` par un `addInitScript` aussi** et le dit en commentaire) ; l'API enregistre l'abonnement ;
  2. « Envoyer une notification d'essai » → `202` ; le faux service **reçoit une requête** ; `dechiffre` rend le message déclaratif ; ses `navigate`, `title`, `body` sont ceux du registre ;
  3. **livrer ce message au service worker** par CDP : `ServiceWorker.enable`, relever le `registrationId` (événement `workerRegistrationUpdated`), `ServiceWorker.deliverPushMessage({ origin, registrationId, data })` avec le texte déchiffré ; puis `registration.getNotifications()` rend **une** notification de titre « Popote » ;
  4. `ServiceWorker.dispatchNotificationClickEvent` (ou, à défaut, `notification.onclick` simulé) ouvre `/reglages/notifications` ;
  5. **déconnexion** : « Désactiver sur cet appareil » puis `DELETE /me/sessions/current` : `GET /me/push-subscriptions` d'une autre session de Sam rend la liste **sans** cet appareil ;
  6. **la réponse de chaque appel de l'API de ce scénario ne contient ni l'adresse ni les clés** (le test lit chaque réponse) ;
  7. **cas négatif** : le faux service répond `410` ; la notification suivante est abandonnée et **l'écran passe à `a-reparer` à la réouverture** (l'abonnement du serveur a disparu) ; un clic « Réactiver » recrée l'abonnement.
- [ ] **Étape 4 :** `npx playwright test e2e/push.spec.ts` → vert avec le relais local et l'API locale ; `npm test` (le test de `chiffrement.mjs` tourne dans le projet `scripts`). **Mutations** : le faux service n'est pas filtré par la liste blanche en test (l'API refuse sans `POPOTE_PUSH_HOTES_DE_TEST` : le test négatif « sans la variable, `422` » casse si on l'oublie) ; ne pas déclencher le service worker (le cas 3 échoue). **Commit** `test(front): essai de bout en bout des notifications avec un faux service de push` ; PR brouillon.

---

### N14 : Les preuves réelles et la clôture

**Pourquoi :** exigence 5 (preuve réelle avec un vrai navigateur, puis le geste iPhone guidé). **Dépend de :** toutes ; **gestes de Kamil** ci-dessous.

- [ ] **Étape 1 : Chromium réel, vrai service FCM, API locale** (`e2e/push.reel.spec.ts`, **hors CI**, lancé seulement par `PUSH_REEL=1 npx playwright test e2e/push.reel.spec.ts`) : avec la recette de N0 E2 ; une paire VAPID jetable du test ; l'API locale lancée **sans** `POPOTE_PUSH_HOTES_DE_TEST` (la **vraie** liste blanche) ; `pushManager.subscribe` réel (adresse `fcm.googleapis.com`, `adresse_push_valide` vrai), l'essai, **la notification arrive** (`registration.getNotifications()` non vide dans les 30 s). Si N0 E2 est « impossible » : l'essai se limite à vérifier que l'envoi chiffré vers FCM est accepté (`201`) avec une **vraie** adresse fournie par un Chromium que Kamil ouvre lui-même ; **dit tel quel dans le rapport**.
- [ ] **Étape 2 : l'essai** (après les gestes 1 et 2 ci-dessous) : `GET /api/v1/me/push-config` rend `enabled: true` (par la session de banc de l'essai) ; `POST /internal/push/dispatch` signé (`ops/signe_interne.py`) rend `cron_alive: true` ; **le job `push-reveil` a tourné** (`select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'push-reveil') order by start_time desc limit 3`, lu par Kamil avec le rôle d'administration, aucune clé affichée) ; **réveil à froid** : laisser le conteneur dormir (≥ 15 min sans requête), mettre une ligne en file avec `send_at = now() + 2 min` (via une fonction de banc de l'essai, **jamais en prod**), et vérifier que la notification d'essai part dans la minute qui suit l'échéance, conteneur compris (journal de l'API : `pg_cron` → appel signé → `200`).
- [ ] **Étape 3 : le geste iPhone (dernier)**, guidé **écran par écran** (le script de N8 donne l'ordre, la PR de clôture le texte à envoyer à Kamil, une phrase par écran) :
  1. sur l'iPhone, ouvrir `https://essai.notre-popote.fr` dans Safari et se connecter (code reçu par mail) ;
  2. Partager > « Sur l'écran d'accueil » > Ajouter ; **fermer Safari** ; ouvrir Popote par sa nouvelle icône ;
  3. Réglages > Notifications ; l'écran montre « Activer sur cet appareil » ; **toucher** le bouton ; autoriser ; l'écran dit « Les notifications sont actives sur cet appareil » ;
  4. toucher « Envoyer une notification d'essai » ; **verrouiller le téléphone** ; **la notification arrive en quelques secondes** avec le texte général, **sans rien d'intime** ; la toucher : Popote s'ouvre sur l'écran des notifications ;
  5. relever la **version d'iOS** (Réglages > Général > Informations) : à partir de 18.4, c'est le message déclaratif qui est affiché (si le service worker est supprimé par ITP, il suffit) ; avant, le service worker affiche ; **on note laquelle** ;
  6. (facultatif, 30 secondes) supprimer l'icône puis recommencer : l'abonnement a disparu, l'écran redit comment installer.
  Résultat à consigner : version d'iOS, chemin utilisé, heure d'arrivée, un « oui/non » par ligne ci-dessus.
- [ ] **Étape 4 : clôture** : `docs/ETAT.md` (court) ; `docs/exploitation.md` à jour ; **les écarts à relayer** (ci-dessous) envoyés à leurs destinataires ; **le registre des sous-traitants (§ 7.7) nomme Google, Mozilla, Apple, Microsoft** (à relayer au propriétaire) ; constat « pas d'AIPD requise » confirmé par le DPO, consigné ; mutations rejouées ; revue adverse de l'ensemble. **Commit** `docs(push): clôt le chantier des notifications push` ; PR brouillon.

---

## Recette : ajouter une vraie notification (une tâche courte, sans toucher à l'infrastructure)

Quatre fichiers au plus, une PR de moins de 150 lignes. Exemple (inventé) : « Le frigo a quelque chose qui périme demain ».

1. **Le type** : `src/popote_api/push/types.py` : une valeur de `TypeDePush` (`FRIGO_PEREMPTION = "fridge_expiry"`) et une `DefinitionDePush` (texte **général** sans chiffre ni nom : « Quelque chose se périme bientôt dans ton frigo. », `chemin="/frigo"`, `ttl_s=6 * 3600`, `urgence="normal"`, `actif_par_defaut=True`, `reglable=True`). `test_push_types.py` la vérifie **sans qu'on écrive un test de plus** (la table est paramétrée sur tout le registre).
2. **Le déclencheur** : ce qui décide d'envoyer, **dans la transaction de l'effet**. Deux voies : une fonction SQL (une passe quotidienne, un déclencheur de table) qui appelle `private.met_en_file_push('fridge_expiry', <personne>, <clé de dédoublonnage : p. ex. le jour>, <instant>, 6 * 3600)` ; ou, depuis l'API, `file_push.met_en_file(...)` qui appelle la même fonction. **Une migration seulement si le déclencheur est en SQL.** La **clé de dédoublonnage** garantit « une seule mise en file par jour ».
3. **Le réglage** : rien à écrire : `GET /me/push-settings` liste `fridge_expiry` parce que `reglable=True` ; `PUT` l'accepte ; la passe d'envoi coupe le type si la personne l'a coupé (test déjà écrit en N5).
4. **Le libellé du réglage côté front** : `src/textes/notifications.ts` : une entrée de plus dans la table `libellesDesTypes` ; le type TypeScript du client généré (`PushKind`) est une union issue du contrat : **une entrée manquante est une erreur de compilation** (`Record<PushKind, string>`).

Rien d'autre : ni file, ni route, ni service worker, ni script. Si une notification a besoin d'un **autre** chemin d'arrivée, c'est `chemin` du registre ; s'il faut un contenu précis à l'écran, c'est l'écran d'arrivée qui le lit dans l'appli (jamais la notification).

## Gestes de Kamil (aucun avant que les PR concernées soient fusionnées)

1. **Poser les clés VAPID de l'essai** : `bash ~/PERSO/popote-api/ops/pose-les-cles-push.sh --a-blanc`, puis sans option. Une minute ; rien ne s'affiche (N8).
2. **Poser le secret et l'adresse du coffre `vault` de l'essai** pour que `pg_cron` appelle le conteneur : **les mêmes que ceux de F8** (`popote_internal_secret`, `popote_internal_base_url`) ; **s'ils sont déjà posés pour F8, rien à faire**. Sinon, le geste de F8 (regroupé avec 0.7).
3. **Créer le secret d'environnement `ESSAI_API_INTERNE_URL`** du dépôt `popote-api` (adresse directe du conteneur de l'essai), **déjà demandé par F8** : même remarque.
4. **Le geste iPhone** de N14, guidé écran par écran.
5. **Au jour J (0.8)** : refaire 1 à 3 pour la prod avec ses propres variables ; **pas avant**.

## Écarts à relayer

| À qui | Quoi |
|---|---|
| **Session design** | (a) la liste des vraies notifications, leur texte général, leur heure, leur réglage ; (b) l'écran « Notifications » de N12 est **provisoire** (phrases proposées, route provisoire `/reglages/notifications`) ; (c) **heures calmes** : pas dans ce plan ; si voulues, une colonne de `push_setting` ; (d) la déconnexion d'un appareil appelle `desabonneCetAppareil()` (plan d'« Entrer ») ; (e) l'état `a-installer` sur iPhone et ses trois étapes doivent être dessinés ; (f) si le repli de N6 s'applique, « à 15 minutes près » |
| **Agent de F8** | les noms `popote_internal_base_url` et `ESSAI_API_INTERNE_URL` ; la fonction `private.signe_un_appel_interne` (créée par M3 : si F8 la crée avant sous un autre nom, N6 la reprend) ; la preuve E1 commune |
| **Agent de F22** | l'amendement N9 en entier (réécriture du garde `verifie-sw-remplacant.mjs`) ; la coupe F22a/F22b |
| **Agent de F5b** | la liste blanche de `src/sw/api-push.ts` dans la garde « aucun `fetch` hors de `src/api/` » |
| **Agent de 0.4ter (F1b)** | rien n'est modifié : `push_outbox` est une table sœur ; **la liste fermée de `base.connexion()`** gagne `infra/push_file.py` |
| **Propriétaire** | le registre des sous-traitants (Google, Mozilla, Apple, Microsoft) ; la validation de la licence MPL-2.0 de `py-vapid` |

## Questions (trois au plus)

1. **Session design** : quelles sont les premières vraies notifications, avec leur texte général, leur heure et leur réglage ? (ce plan est prêt à les recevoir une à une.)
2. **Propriétaire** : `py-vapid` (signature des envois) est sous licence MPL-2.0, comme `axe-core` que tu as admis pour les tests : l'admets-tu aussi dans le build livré de l'API, non modifié ? (sinon, on écrit la signature ES256 nous-mêmes avec `cryptography`, ≈ 40 lignes de plus et un risque à relire.)
3. **Propriétaire** : quelle version d'iOS sur ton iPhone (Réglages > Général > Informations) ? À partir de 18.4, on essaie le chemin déclaratif ; avant, le service worker affiche seul.

## Sources (vérifiées en ligne ou par essai le 13/11/2026)

1. **WebKit, « Meet Declarative Web Push »** https://webkit.org/blog/16535/meet-declarative-web-push/ (forme du message, `web_push: 8030`, repli, pas de push silencieux) ; **explainer** https://github.com/WebKit/explainers/tree/main/DeclarativeWebPush (autre forme, non livrée : C2) ; **« Web Push for Web Apps on iOS and iPadOS »** https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ (écran d'accueil, geste, `*.push.apple.com`).
2. **RFC 8030** (Generic Event Delivery Using HTTP Push) https://www.rfc-editor.org/rfc/rfc8030.html ; **RFC 8291** (chiffrement du message, annexe A : vecteur) https://www.rfc-editor.org/rfc/rfc8291.html ; **RFC 8292** (VAPID) https://www.rfc-editor.org/rfc/rfc8292.html ; **RFC 8188** (`aes128gcm`) https://www.rfc-editor.org/rfc/rfc8188.html. *(RFC 8291, 8292, 8188 : citées pour leur objet ; le vecteur de test est à **recopier de la page** au moment du code.)*
3. **PyPI** `http-ece` 1.2.1 (08/08/2024), `py-vapid` 1.9.6 (14/10/2026), `pywebpush` 2.5.0 (30/08/2026), `cryptography` 50.0.2, `httpx` 0.28.1 ; **essai** : aller-retour `http_ece` et signature `py_vapid` dans un environnement jetable ; lecture de `pywebpush/__init__.py`.
4. **npm** `vite-plugin-pwa` 2.0.0 (03/10/2026), `workbox-build`, `workbox-window`, `workbox-precaching`, `workbox-routing`, `workbox-core` 7.4.1 (04/05/2026) ; **vite-plugin-pwa, `injectManifest`** https://vite-pwa-org.netlify.app/guide/inject-manifest.html (config, `SKIP_WAITING`, `WebWorker` dans `lib`).
5. **Scaleway** : dépôt `scaleway/docs-content`, `pages/serverless-containers/how-to/add-trigger-to-a-container.mdx`, `concepts.mdx` (déclencheur CRON), `reference-content/containers-autoscaling.mdx` (arrêt après 15 minutes) ; les pages `scaleway.com/docs` répondent `403` à un robot : la source est le dépôt de la documentation.
6. **GitHub Actions** « Events that trigger workflows » https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows (`schedule`) ; **Supabase Cron** https://supabase.com/docs/guides/cron.
7. **Plans voisins** : `2026-11-13-socle-0-4ter-le-foyer.md` (F1b, F8), `2026-11-13-socle-0-4bis-connexion-sans-mot-de-passe.md` (sessions), `2026-11-13-fondation-du-front.md` (D5, F22) ; **popote-api** `AGENTS.md`, `docs/normes-api.md`, `docs/securite.md`, `docs/exploitation.md`, `.github/workflows/`, migrations 0126 et 0140 ; script modèle `gestes-13-11.sh` (et son `.py`).
8. **Essais locaux** : Chromium sans interface, permission des notifications (C15) ; hôtes des services (liste communautaire « known-push-services », C5 : à confirmer par N0 E3).
