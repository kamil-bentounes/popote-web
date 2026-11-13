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

**Hors périmètre :** les textes et horaires des vraies notifications (le Budget : plan d'API B13 ; les autres sont provisoires : session design) et l'écran définitif de leurs réglages (monde « Foyer et réglages ») ; les
heures calmes **réglables par personne** (le défaut 22 h à 8 h est dans ce plan) ; les badges d'icône ; les notifications entre les deux personnes du foyer (aucun déclencheur n'est posé ici sauf
l'essai) ; la fermeture de la base (0.7) ; le déploiement de la prod (0.8, les clés de prod y sont posées).

---

## Constats vérifiés (13/11/2026)

| N° | Constat | Source ou preuve |
|---|---|---|
| C1 | **Le message déclaratif livré (iOS 18.4) est** `{"web_push": 8030, "notification": {"title" (obligatoire, non vide), "navigate" (obligatoire, URL), "body", "lang", "dir", "silent", "app_badge"}}`. Un service worker peut le remplacer ; s'il ne montre rien à temps, **le message déclaratif sert de repli**. WebKit exige qu'**on montre toujours une notification** (pas de push silencieux) et un abonnement `userVisibleOnly: true` ; sinon l'abonnement est révoqué. | webkit.org/blog/16535 (lu le 13/11) |
| C2 | **L'explainer WebKit sur GitHub décrit une autre forme** (`title`, `options`, `default_action_url`, type de contenu `application/notification+json`). C'est une proposition ; **ce plan suit la forme du blog, celle qui est livrée**. Le type de contenu de la requête n'y est pas imposé : on n'en pose pas de spécial (`application/octet-stream`). À prouver sur l'iPhone (N14). | github.com/WebKit/explainers (DeclarativeWebPush), lu le 13/11 |
| C3 | iPhone : le web push est pour les applis **ajoutées à l'écran d'accueil** (manifeste en `standalone`) ; la permission se demande « en réponse à une interaction directe » ; les serveurs doivent **autoriser `*.push.apple.com`**. | webkit.org/blog/13878 (lu le 13/11) |
| C4 | RFC 8030 : **`201` = message accepté** (`202` n'existe que pour le mode `Prefer: respond-async`, que nous n'employons pas) ; **`404` = abonnement expiré** ; `413` jamais en dessous de 4096 octets ; `429` possible ; **`TTL` obligatoire** ; `Urgency` ∈ `very-low`, `low`, `normal`, `high`. **`410` n'est pas dans la RFC pour une ressource de push** : c'est une extension que des services emploient (hypothèse, à confirmer par N0 E3 sur la documentation de chaque fournisseur) ; le plan la traite comme `404`. `Retry-After` : entier de secondes **ou date HTTP** (RFC 9110 § 10.2.3). | RFC 8030 §§ 5, 5.2, 5.3, 7.2, 7.3, 8.4 ; RFC 9110 (lus le 13/11) |
| C5 | **(Hypothèse à confirmer par N0 E3 sur les documentations des fournisseurs.)** Hôtes des services : `fcm.googleapis.com` (Chrome, Edge hors Windows), `updates.push.services.mozilla.com` (Firefox), `*.push.apple.com` (Safari), `*.notify.windows.com` (Edge sous Windows ; ses adresses portent une **chaîne de requête** `…/w/?token=…`). Liste de la communauté « known-push-services » ; Apple donne lui-même le joker. | résultats de recherche du 13/11 + C3 ; la liste communautaire n'est pas une norme : le plan la **teste** sur de vraies adresses (N0) |
| C6 | **(Essai ponctuel : sa preuve durable est le test du vecteur de la RFC 8291 en N4.)** `http-ece` 1.2.1 (08/08/2024) chiffre et déchiffre en `aes128gcm` avec une clé éphémère, la clé publique `p256dh` et le secret `auth` : **aller-retour rejoué avec `cryptography` 50.0.2** ; `py-vapid` 1.9.6 (14/10/2026) signe : l'en-tête rendu est `Authorization: vapid t=…`. | essai du 13/11 dans un environnement jetable |
| C7 | `pywebpush` 2.5.0 (30/08/2026) n'est qu'une fine couche sur ces deux bibliothèques, mais **son envoi suit les redirections, accepte un délai de 10 000 s par défaut, et ses exceptions portent la réponse** ; il tire `requests` et `aiohttp` en plus. **Écarté pour l'envoi** (exigence : aucune redirection, aucun proxy, rien dans les erreurs) ; `http-ece` et `py-vapid` directement, `httpx` (déjà une dépendance) pour la requête. | lecture de `pywebpush/__init__.py` 2.5.0 le 13/11 |
| C8 | Un conteneur Scaleway sans instance minimale **s'arrête après 15 minutes sans requête** ; un déclencheur CRON de conteneur : expression UNIX, **UTC par défaut** (fuseau réglable), méthode choisie (`POST` par défaut), chemin, **en-têtes et corps fixes** ; la doc dit qu'il sert à « waking up the Container at specific times ». Un déclencheur ne peut donc pas porter une signature horodatée. | `docs-content` de Scaleway (dépôt GitHub, `pages/serverless-containers/…`), lu le 13/11 ; les pages `scaleway.com/docs` répondent `403` à un robot |
| C9 | GitHub Actions : « The `schedule` event can be delayed during periods of high loads » ; « some queued jobs may be dropped » ; intervalle minimal 5 minutes ; branche par défaut seulement ; **« In a public repository, scheduled workflows are automatically disabled when no repository activity has occurred in 60 days »**. | docs.github.com, « Events that trigger workflows » (lu le 13/11) |
| C10 | Supabase : un job `pg_cron` peut tourner « from every second to once a year » ; 8 jobs en même temps au plus recommandés, 10 minutes au plus par job. `pg_net` répond de façon **asynchrone** (déjà établi par 0126 et F8). | supabase.com/docs/guides/cron (lu le 13/11) ; 0126 ; plan 0.4ter F8 |
| C11 | **Le chemin `pg_cron` → `pg_net` → route `/internal/*` signée est déjà celui de la spec (§ 2, § 5.2) et de F8.** Aucune route interne réelle n'existe encore ; la signature calculée en SQL sur le corps exact que `pg_net` envoie **n'est pas encore prouvée** (réserve de `docs/exploitation.md`). | `docs/exploitation.md` ; plan 0.4ter F8 |
| C12 | Une **session** est une ligne de `login_session` (cookie `__Host-popote_session`) ; elle se ferme en posant `revoked_at` (déconnexion, fermeture d'un appareil, fermeture des autres, départ, suppression) ; `efface_le_compte` supprime ses lignes ; 90 jours au plus. `PersonneDeLaSession.session` donne l'identifiant de la session courante. **La purge de `login_session` ne supprime une ligne que 30 jours après `expires_at`** (relu sur `origin/main`) : une session échue sans être révoquée garde donc ses lignes jusqu'à 30 jours de plus ; N3 ajoute une purge des abonnements dont la session est échue. | migration 0140 ; `api/appareils.py` ; plan 0.4bis A6 |
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
| D2 | **Un type de notification = une entrée du registre `popote_api/push/types.py`** (texte constant, `ttl_s`, urgence, page d'arrivée, actif par défaut, réglable ou non). La base ne connaît que la **forme** d'un type (`^[a-z][a-z0-9_]{2,40}$`) ; un type inconnu du registre au moment de l'envoi est abandonné. | Ajouter un type ne demande **aucune migration** et aucune retouche de la file. Les interrupteurs de la personne sont **par monde** et se listent depuis le registre. Le texte étant une **constante sans paramètre**, un prénom ou un montant ne peut pas atteindre l'écran verrouillé : il n'y a pas de colonne pour le porter. |
| D3 | **Réveil : `pg_cron` chaque minute, qui n'appelle le conteneur que s'il y a une ligne échue** ; le conteneur est appelé par `pg_net`, signé en SQL ; **un workflow GitHub quotidien appelle la même route et alerte** (même modèle que F8). Le déclencheur CRON de Scaleway est écarté ; GitHub Actions seul aussi. | **Précision** : `pg_cron` à la minute (C10) ; GitHub retarde et abandonne sous charge, 5 minutes au plus fin (C9). **Coût** : un appel par minute réveillerait le conteneur en permanence (il dort après 15 minutes, C8) et ruinerait la décision du 13/11 « pas d'instance allumée » ; ici la base décide, et ne réveille que pour une ligne échue. **Sécurité** : la route interne n'accepte qu'une signature HMAC horodatée (5 minutes) ; un déclencheur Scaleway n'envoie que des en-têtes fixes (C8), donc il faudrait ajouter à `/internal/*` un secret statique rejouable pour toujours : régression. `pg_cron` calcule la signature en SQL (`docs/exploitation.md`), GitHub la calcule avec `ops/signe_interne.py`. **Filet** : GitHub coupe les crons d'un dépôt public inactif depuis 60 jours (C9) et peut en abandonner : il ne sert qu'à **voir** une panne de `pg_cron` (réponse `cron_alive`), jamais d'unique planificateur. **Dépendance** : la preuve que la signature calculée par la base est acceptée avec le corps exact de `pg_net` (C11) est **la même que celle de F8** (N0, E1). Si elle échoue, le plan de repli est écrit en N6 (GitHub toutes les 10 minutes, précision dégradée, dite aux concepteurs). |
| D4 | **L'abonnement est rattaché à la session** (`session_id` → `login_session`, `on delete cascade`) et un déclencheur sur `login_session` le supprime dès que `revoked_at` est posé. | Un seul point couvre toutes les fermetures (déconnexion de l'appareil, fermeture d'un appareil, des autres, départ, suppression de compte) sans retoucher leurs fonctions, que d'autres tâches réécrivent. Une session échue sans être révoquée est filtrée à l'envoi (jointure sur une session active) puis supprimée par la purge. Un téléphone prêté : la personne B qui s'abonne avec la même adresse remplace la ligne de A. |
| D5 | **Chiffrement et signature par `http-ece` et `py-vapid` directement ; envoi par `httpx`** : `follow_redirects=False`, `trust_env=False` (aucun proxy lu dans l'environnement), requête en **`stream`** (le corps de la réponse n'est jamais lu), délais `httpx` de 3 s de connexion et 5 s par phase **et** un **délai mural par envoi de 8 s** (`asyncio.timeout`) ; `httpx` borne chaque phase, pas la durée totale ; **5 travailleurs** qui tirent les lignes une à une ; **budget mural de la passe : 15 s**, les lignes non commencées sont rendues ; rien n'est journalisé de la réponse. | C7. La compatibilité du chiffrement avec les navigateurs est prouvée par le **vecteur de l'annexe A de la RFC 8291** (N4) et par un déchiffrement de bout en bout contre un faux service. |
| D6 | **Le message est le message déclaratif de WebKit** (C1), et **le même JSON sert de charge au service worker** : `push` lit `web_push === 8030` puis `notification`. Le service worker remplace le message déclaratif par une notification identique plus ses données (page d'arrivée relative) ; si le service worker manque, le message déclaratif suffit sur iOS 18.4+. | Un seul format, pas de branche par navigateur côté serveur. Avant iOS 18.4, Chrome et Firefox : le service worker affiche (C1, repli demandé). |
| D7 | **Permission : seulement dans un geste**, premier `await` du gestionnaire de clic. Sur iPhone hors écran d'accueil, **l'écran explique comment installer** et ne demande rien. Un refus est définitif : l'écran dit où le lever (Réglages du téléphone). | Faits établis de la consigne et C3. |
| D8 | **Au plus 5 abonnements par personne** (`409 trop_d_abonnements_push`), **rattachés à une session active** ; une notification part à **tous** les abonnés de la personne au moment de la mise en file. | Un foyer de deux personnes, quelques appareils chacune. Une personne qui s'abonne après la mise en file ne reçoit pas l'ancienne (c'est voulu). |
| D9 | **Sémantique « au moins une fois », repris jusqu'à l'échéance utile, puis abandon visible** : reprise à 1, 5, 30 minutes puis 2 h, `deadline_at = send_at + ttl_s` du type ; un doublon est possible si le processus meurt entre le `201` du service et `classe_le_push`. | Comme F1b ; une notification périmée n'a aucun intérêt. |
| D10 | **Clés VAPID générées et posées par Kamil, avec un script** ; la privée est un **secret du conteneur** (`POPOTE_VAPID_PRIVATE_KEY`), la publique une variable (`POPOTE_VAPID_PUBLIC_KEY`) servie au front par `GET /api/v1/me/push-config`. Les posées ne se remplacent que par `--tourne` : **les tourner invalide tous les abonnements** (le service refuse une signature qui ne correspond plus à la clé de l'abonnement) ; le front compare la clé servie à celle de l'abonnement à chaque ouverture et se réabonne. Au démarrage, l'API **refuse une paire incohérente** (la publique dérivée de la privée doit égaler la publique posée). | Consigne ; `managing-configuration-and-secrets` (un secret : propriétaire, objet, échéance, rotation). Échéance de rotation : 12 mois, rotation = geste de Kamil ; l'ancienne clé n'est jamais gardée (aucun double jeu de clés : un abonnement est lié à **une** clé). |
| D11 | **Une session du front pose le service worker en `injectManifest`** (amendement N9 à F22). | Le service worker doit contenir nos écouteurs (`push`, `notificationclick`, `pushsubscriptionchange`), ce que `generateSW` ne permet pas. |

| D12 | **Le DNS des fournisseurs est une frontière de confiance acceptée, écrite.** On ne résout pas l'hôte avant l'envoi et on n'épingle pas la connexion à une adresse. | Les hôtes admis sont des domaines de Google, Mozilla, Apple et Microsoft qu'un attaquant ne contrôle pas ; l'attaque restante suppose le détournement du DNS d'un de ces fournisseurs ou de celui du conteneur. Épingler l'adresse avec `httpx` exigerait un transport sur mesure (SNI, `Host`, TLS) : un risque de bogue supérieur au risque couvert. **Compensations** : TLS avec validation de certificat (jamais désactivée), `https` seul, `follow_redirects=False`, corps jamais lu, délais, rien de secret dans la requête qui ne soit déjà chiffré pour le service. Les jokers (`*.push.apple.com`, `*.notify.windows.com`) viennent de la documentation d'Apple (C3) et de Microsoft ; **N0 E3 confirme les deux jokers et `fcm.googleapis.com` / `updates.push.services.mozilla.com` sur les pages des fournisseurs**, la liste communautaire n'étant qu'un indice. |
| D13 | **Une adresse déjà connue ne passe d'une personne à une autre que sur preuve de possession du triplet** (adresse, `p256dh`, `auth` identiques) ; sinon `409 abonnement_push_conflit`. Le quota de 5 se vérifie **avant** toute suppression, sous le verrou des deux personnes (ordre des UUID). | Sans cela, qui connaît une adresse (un secret) pourrait supprimer l'abonnement d'un autre, ou le déborder de son propre quota. Un téléphone prêté se réabonne en général avec une nouvelle adresse (l'ancien abonnement a été désinscrit) ; le cas du même triplet reste couvert. |

### Modèle de menaces (assets, acteurs, mesures)

| Menace | Mesure | Preuve |
|---|---|---|
| **SSRF** : un client poste une adresse d'abonnement visant une machine interne, un autre protocole, un redirecteur | liste blanche stricte (`adresse_push_valide`), **vérifiée à l'enregistrement et de nouveau juste avant l'envoi** ; `https` seul, hôtes exacts ou joker à frontière de point, pas d'identifiants, pas de port autre que 443, pas d'adresse IP, pas de fragment, ASCII imprimable, 2048 caractères au plus ; `follow_redirects=False`, `trust_env=False` ; un `3xx` est un refus définitif | N2, N4 : tests de contournement (`fcm.googleapis.com.evil.test`, `evil.fcm.googleapis.com`, `@`, `\`, port, IPv4/IPv6, majuscules, point final, `%2e`, Unicode) ; test d'envoi où le faux service répond `302` vers une machine locale : aucune seconde requête |
| Fuite de l'adresse ou des clés (journal, trace, erreur, réponse) | colonnes sans droit, RLS forcée, lecture par `prend_les_pushs` seule (`popote_api`) ; réponses sans adresse ni clé ; **aucune exception d'`httpx` ne sort** : l'envoi **rend un résultat typé** (une exception attrapée ne laisse pas de `__context__` si l'on ne relève rien dans son bloc) ; les journaux `httpx` et `httpcore` sont fixés à `WARNING` et leurs sorties filtrées ; `base.connexion()` borné par la liste fermée | N2, N4, N5 : `caplog` (tous les loggers, `httpx` et `httpcore` compris) + corps des réponses + résultats ne contiennent jamais l'adresse, `p256dh`, `auth` (mutation : journaliser l'adresse casse) ; **une ligne empoisonnée** (clé hors courbe, écrite par appel SQL direct) n'arrête pas la passe (N5) |
| Lire ou supprimer l'abonnement d'un autre | fonctions `security definer` cadrées sur `auth.uid()` ; `404` pour un autre | matrice d'autorisation (3 acteurs) ; test SQL « autre personne » |
| Spam : se servir de l'essai pour inonder | l'essai est refusé à plus de 5 par heure et par personne, **compté dans une table à part (`push_essai`) qui survit à la suppression de l'abonnement** ; limites d'écriture par personne (30/min) ; 5 abonnés au plus | N7 |
| Un écran verrouillé qui montre du privé | texte constant du registre, aucune colonne de contenu ; la page d'arrivée est un chemin fixe du registre ; le détail se lit dans l'appli | N4 : test « le texte d'un type ne contient ni chiffre, ni prénom, ni `{` » ; `push_outbox` n'a pas de colonne de contenu (test de schéma) |
| Redirection ouverte par `navigate` | `navigate` = origine de l'appli (réglage serveur) + chemin du registre ; le service worker **refuse** toute autre origine et retombe sur `/` | N4, N10 |
| Rejeu d'un appel signé | la route interne est idempotente par construction (état relu en base, lignes prises sous `skip locked`) | N5 |
| Marteau-pilon : `pg_cron` rappelle chaque minute une route qui échoue | pas d'appel s'il n'y a rien d'échu, **pas de chevauchement** (55 s), **attente de 5 minutes** après un statut ≠ 200 | N6 |
| Perte de la clé privée VAPID | rotation par `--tourne` ; les abonnements se refont tout seuls à la prochaine ouverture ; aucun abonnement n'est exposé (l'adresse seule ne suffit pas à envoyer : il faut la clé) | N8, N11 |
| Appareil prêté, session volée | D4 ; l'abonnement meurt avec la session ; D13 pour une adresse déjà connue | N1 |
| Panne silencieuse (cron coupé, projet en pause, secret absent) | `cron_alive`, `overdue`, `abandoned` dans la réponse de la route ; le workflow GitHub quotidien échoue, GitHub prévient par mail | N6 |

### Données personnelles (`protecting-personal-data`)

| Donnée | Classe | Finalité | Conservation | Sort au départ / à la suppression |
|---|---|---|---|---|
| adresse d'abonnement (`endpoint`) | **personnelle** (identifiant d'appareil), secrète | envoyer la notification demandée | tant que la session de l'appareil vit (90 jours au plus) **plus la purge quotidienne** de N3 (un jour au plus après l'échéance de la session) | supprimée avec la session (`login_session`, cascade), à sa fermeture (déclencheur) ou par la purge des sessions échues |
| `p256dh`, `auth` | **secrets** de la personne | chiffrer le message | idem | idem |
| ligne de `push_outbox` (type, instants, statut du service) | faible : comportement, **sans contenu** | file d'envoi, reprise | envoyées : 3 jours ; abandonnées : 30 jours | supprimées avec l'abonnement (cascade) |
| réglage (`push_setting` : type, actif) | faible | respecter le choix | tant que le compte existe | **supprimé par `private.efface_le_compte`** (amendement à A6 : une ligne, voir « Écarts à relayer ») **et**, en secours, avec le compte Auth (cascade) ; test d'une panne d'Auth en N7 |

**Cadre : Popote ne sert que le foyer de Kamil** (traitement domestique : l'exemption domestique du RGPD s'applique ; arbitrage du propriétaire du 13/11). Les services de push (Google, Mozilla, Apple, Microsoft) voient l'adresse d'abonnement, l'heure et la taille, jamais le contenu (chiffré de bout en bout) ni du texte intime (générique). **À revoir avant d'ouvrir Popote à d'autres foyers : qualification des services de push (rôle, transferts hors UE), registre des sous-traitants (spec § 7.7), AIPD.**

---

## Contrat de l'API (ajouts seulement : routes sous `/api/v1/me/…`, anglais, `snake_case`, UUID, RFC 9457)

| Route | Qui | Réponses |
|---|---|---|
| `GET /api/v1/me/push-config` | session | `200 {enabled: bool, vapid_public_key: str \| null}` (`ETag`, `no-store`) ; `enabled` faux si les clés ne sont pas posées |
| `POST /api/v1/me/push-subscriptions` | session, **`Idempotency-Key`** | corps = `PushSubscription.toJSON()` : `{endpoint, keys: {p256dh, auth}}` (`expirationTime` ignoré) ; `201` + `Location` + `{id, created_at}` (jamais l'adresse) ; `422` (adresse refusée, pointeur `/endpoint` ; clé mal formée, pointeur `/keys/p256dh` ou `/keys/auth`) ; `409 trop_d_abonnements_push` ; `409 abonnement_push_conflit` (adresse déjà connue sans le même triplet) ; `503 push_indisponible` (clés absentes) ; `429` ; `401` |
| `GET /api/v1/me/push-subscriptions` | session | page `{items: [{id, created_at, current: bool, browser, os}], next_cursor}` ; jamais d'adresse ni de clé |
| `DELETE /api/v1/me/push-subscriptions/{id}` | session | `204` ; `404 abonnement_push_introuvable` (inconnu **ou** d'un autre) ; `422` ; **sans `Idempotency-Key`** (exemption écrite : effet idempotent) |
| `POST /api/v1/me/push-subscriptions/{id}/test-notifications` | session, **`Idempotency-Key`** | `202 {state: "queued"}` ; `404` ; `429 quota_notifications_essai` + `Retry-After` **exact** (les secondes rendues par la fonction) (5 par heure et par personne) ; `503 push_indisponible` |
| `GET /api/v1/me/push-settings` | session | `200 {items: [{world, enabled}]}` : **un interrupteur par monde du registre** (`budget`, `fridge`, `week`, `household`) qui contient au moins un type réglable, la valeur par défaut du monde quand la personne n'a rien choisi ; les types sans interrupteur (`acces_banque`, `minuteur`) n'y figurent pas |
| `PUT /api/v1/me/push-settings/{world}` | session | corps `{enabled}` ; `200 {world, enabled}` ; `404` (monde inconnu ou sans type réglable) ; **sans `Idempotency-Key` ni `If-Match`** (exemption écrite : `PUT` idempotent, réglage « de soi » sans version, comme `PUT /me/password`) |
| `POST /internal/push/dispatch` | **signée HMAC**, hors du relais et du contrat | `200 {sent, retrying, expired, refused, dropped, deferred, abandoned, overdue, remaining}` puis `cron_alive` (N6) (des nombres et un booléen, **aucun** identifiant) ; refus : `404` |

Types d'erreur nouveaux : `trop_d_abonnements_push` (409), `abonnement_push_conflit` (409), `abonnement_push_introuvable` (404), `quota_notifications_essai` (429),
`push_indisponible` (503). Réutilisés : `donnees_invalides` (422), `trop_de_requetes`.

## Migrations (expansion seule ; numéros définitifs pris au moment du code : à partir de **0166**, 0.4bis occupe 0147 à 0157 et 0.4ter 0158 à 0165)

| Rôle | Tâche | Objet | Compatible avec l'appli en prod parce que | Retour arrière |
|---|---|---|---|---|
| **M1a** | N1a | `push_subscription` (RLS forcée, aucun droit) ; déclencheur `login_session_ferme` ; fonctions `enregistre_mon_abonnement_push`, `mes_abonnements_push`, `retire_mon_abonnement_push` | tables et fonctions neuves ; le déclencheur ne se déclenche que sur `revoked_at` posé et ne touche que `push_subscription` : l'appli en ligne n'écrit pas dans `login_session` | `drop trigger`, `drop function`, `drop table` (aucune donnée à garder) |
| **M1b** | N1b | `push_setting` (RLS forcée, aucun droit) ; `mes_reglages_push`, `regle_mon_push` ; **le crochet** `private.efface_les_donnees_push` (première version : `push_setting` seulement) | neuves | `drop function`, `drop table push_setting` |
| **M2** | N3 | `push_outbox` ; `private.met_en_file_push`, `prend_les_pushs`, `classe_le_push`, `efface_l_abonnement_push`, `met_en_file_mon_essai_push`, `push_en_retard` ; purge `pg_cron` | neuves | `cron.unschedule`, `drop function`, `drop table` (les lignes en attente sont perdues : sans importance) |
| **M3** | N6 | `private.push_passe` (RLS forcée), `private.signe_un_appel_interne`, `private.reveille_le_push`, `public.etat_du_reveil_push` ; planification `push-reveil` (tolérante : seulement si `pg_cron` existe) | neuves ; la planification ne fait rien tant que les secrets du coffre manquent | `cron.unschedule('push-reveil')` ; **restaurer d'abord le corps M2b de `private.purge_push_outbox`** (M3 le redéfinit pour purger `push_passe`), puis `drop function`, `drop table` |

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
- **Dépendances ajoutées, **toutes dans N2a** (`managing-dependencies-and-licenses`) : API `http-ece==1.2.1` (MIT) et `py-vapid==1.9.6` (MPL-2.0 : bibliothèque
  non modifiée, admise comme les outils de test de la fondation ; **admis par le propriétaire le 13/11**), versions
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
| Essais | **N0** (aucune PR : quatre essais, résultats écrits dans la PR de la tâche qui s'en sert) | F8 pour E1 |
| Base | **N1a** (M1a) → **N1b** (M1b) → **N3a** (M2a) → **N3b** (M2b) ; **N6a** après N5b (+ F8 pour les noms du coffre) → **N6b** (workflow, fiche) après N6a **et** N5b | 0.4bis S6 (`verrouille_la_personne`), A6 (crochet d'une ligne) |
| API sans base | **N2a** (aucune dépendance de ce plan ; seul endroit où `py-vapid` et `http-ece` sont ajoutés) → **N4a** (après N2a) → **N4b** (après N4a) ; **N2b** (routes) après N1a et N2a ; **N5a** (file Python, passe) après N3b et N4b ; **N5b** (route interne) après N5a ; **N7a** (réglages) après N1b et N2b ; **N7b** (essai) après N3a, N5b, N7a ; **N8** (script des clés) après N2a | aucune boucle |
| Front | **N9** (dans la PR de F22) → **N10** (service worker) → **N11** (couche push) → **N12** (écran) → **N13** (e2e) | N11 après le contrat de N2 et N7 (F4 le synchronise) ; N13 après N7 et N12 |
| Clôture | **N14** preuves réelles et clôture | toutes ; gestes de Kamil |

Parallèle possible : N2a dès maintenant ; N1 en même temps ; N9 pendant F22 ; N10 pendant N2 à N7.

**Coupes prévues (chaque PR ≤ 400 lignes mesurées, et chaque tranche commence par sa commande rouge)** : N1 = N1a (tables, déclencheur, enregistrer/retirer/lister) + N1b (réglages, crochet d'effacement) ; N2 = N2a (adresse, clés, configuration) + N2b (routes) ; N6 = N6a + N6b ; N7 = N7a (réglages) + N7b (essai, bout en bout de l'API) ; N11 = N11a (plateforme, état, gestes) + N11b (hooks, réconciliation) ; N3 = N3a (tables, mise en file, essai, quota) + N3b (prise, classement, purge, état) ; N4 = N4a (registre, charge, chiffrement) + N4b (transport, faux service) ; N5 = N5a (accès à la file, passe) + N5b (route interne) ; N8 = script puis fiche ; N9 = F22a + F22b ; N13 = aide de chiffrement puis scénario. Une tranche qui dépasse se coupe encore, jamais on ne ment sur la taille.

**Commandes de fin d'une PR front** : `npm run lint && npx tsc -b && npm test && npm run build`, puis le Playwright ciblé ; d'une PR API : `uv run ruff format --check && uv run ruff check && uv run mypy && uv run pytest -q -m "not integration"`, puis `-m integration`.

---

## Les tranches, une à une (chacune est une PR indépendante : fichiers, test rouge d'abord, vérification, migration, dépendance, commit)

| Tranche | Fichiers | Test rouge d'abord | Vérification | Migration | Dépend de | Commit |
|---|---|---|---|---|---|---|
| N1a | M1a, `tests/db/push-abonnements.test.ts` (cas 1 à 5, 7, 8, 10 à 12) | `npx vitest run tests/db/push-abonnements.test.ts` : « relation … n'existe pas » | même commande + `npm test` | M1a | S6, A6 | `feat(push): range les abonnements push par session` |
| N1b | M1b, `tests/db/push-reglages.test.ts` (cas 6, 9, surface des réglages) | idem, sur `push_setting` absent | même | M1b | N1a | `feat(push): ajoute les réglages push et le crochet d'effacement` |
| N2a | `push/adresse.py`, `push/cles.py`, `config.py`, tests unitaires, `.env.example`, `pyproject.toml`, `uv.lock` | `uv run pytest tests/unit/test_push_adresse.py` : `ModuleNotFoundError` | `uv run ruff … && uv run mypy && uv run pytest -q -m "not integration"` | aucune | rien | `feat(push): valide l'adresse d'un abonnement et la configuration VAPID` |
| N2b | `api/push_abonnements.py`, `schemas/push.py`, matrice, `openapi.json` | `uv run pytest tests/integration/test_push_abonnements.py -m integration` : `404` des routes | idem + `-m integration` | aucune | N1a, N2a | `feat(push): expose les abonnements push` |
| N3a | M2a, `tests/db/push-file.test.ts` (cas 1 à 4, 12, 13, 13b, 13c, 16) | `npx vitest run tests/db/push-file.test.ts` | idem | M2a | N1b | `feat(push): ajoute la file d'envoi et le quota de l'essai` |
| N3b | M2b, mêmes tests (cas 5 à 11, 13d à 15, 17) | idem | idem | M2b | N3a | `feat(push): prend, classe et purge la file d'envoi` |
| N4a | `push/types.py`, `push/charge.py`, tests, vecteur de la RFC 8291 | `uv run pytest tests/unit/test_push_types.py` | contrôles API | aucune | N2a | `feat(push): le registre des notifications et la charge utile` |
| N4b | `push/envoi.py`, `tests/_faux_service_push.py`, tests | `uv run pytest tests/unit/test_push_envoi.py` | idem | aucune | N4a | `feat(push): chiffre, signe et envoie une notification` |
| N5a | `infra/push_file.py`, `push/passe.py`, tests de la passe, liste fermée de `base.connexion()` | `uv run pytest tests/unit/test_push_passe.py` | idem + `-m integration` | aucune | N3b, N4b | `feat(push): la passe d'envoi de la file` |
| N5b | `api/internes_push.py`, `main.py`, tests de la route | `uv run pytest tests/integration/test_push_interne.py -m integration` : `404` | idem | aucune | N5a | `feat(push): la route interne d'envoi, signée` |
| N6a | M3, `tests/db/push-reveil.test.ts`, `cron_alive` dans la route et son test | `npx vitest run tests/db/push-reveil.test.ts` | idem + route | M3 | N5b, noms de F8 | `feat(push): réveille le conteneur par pg_cron quand une notification est échue` |
| N6b | `.github/workflows/push-veille.yml`, `docs/exploitation.md` | `actionlint` rouge sur un fichier absent | `actionlint`, `zizmor` | aucune | N6a (et N5b) | `ci(push): veille quotidienne des notifications` |
| N7a | `api/push_reglages.py`, tests, matrice | `uv run pytest tests/unit/test_push_reglages.py` | idem | aucune | N1b, N2b | `feat(push): règle les notifications par type` |
| N7b | route d'essai, `test_push_essai.py`, `test_push_de_bout_en_bout.py` | `uv run pytest tests/integration/test_push_essai.py -m integration` | idem + `-m integration` | aucune | N3a, N5b, N7a | `feat(push): envoie une notification d'essai` |
| N11a | `src/push/plateforme.ts`, `etat.ts`, `abonnement.ts`, tests | `npx vitest run src/push` | `npm run lint && npx tsc -b && npm test && npm run build` | — | N10 | `feat(front): l'état et les gestes des notifications push` |
| N11b | `src/api/ressources/push.ts`, `reconcilie.ts`, tests | `npx vitest run src/api/ressources/push.test.ts src/push/reconcilie.test.ts` | idem | — | N11a, contrat de N2b et N7 | `feat(front): les hooks push et la réconciliation à l'ouverture` |

## Les tâches

### N0 : Quatre essais avant le code (aucune PR)

**But :** lever quatre hypothèses qui décident de la forme des tâches suivantes. Chaque résultat est écrit dans la PR de la tâche qui s'en sert,
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
- [ ] **E4 : la sémantique du `PATCH` des secrets d'un conteneur Scaleway** (sert N8). Le modèle `gestes-13-11.py` envoie une seule clé secrète et constate
  ensuite que les autres tiennent ; **un constat après coup arrive trop tard si le `PATCH` remplace la collection** (les valeurs des secrets ne se relisent
  pas). N8 contient donc une **auto-épreuve obligatoire** (mode `--epreuve`, lancée **toute seule avant** toute écriture sur le conteneur de l'essai) : elle
  crée un conteneur jetable `popote-jetable-vapid` dans le projet de l'essai (image publique minimale), y pose **deux secrets factices**, en `PATCH` un
  troisième, relit : si l'un des deux factices a disparu, elle **efface le conteneur jetable et s'arrête sans toucher à l'essai** (le script passe alors
  à une opération par clé, selon la référence de l'API) ; sinon elle efface le conteneur jetable et continue. Résultat consigné dans la PR de N8.

---

### N1 : Les abonnements en base (migrations M1a et M1b) — coupée en N1a (≈ 250 lignes) et N1b (≈ 90 lignes)

**Pourquoi :** D4, D8 ; exigence « rattachés à la session, supprimés à la déconnexion de cet appareil et avec le compte ».
**Dépend de :** 0.4bis S6 (`private.verrouille_la_personne(uuid)`) et A6 (`private.efface_le_compte` supprime les lignes de `login_session`).
**Sources à relire :** `supabase/migrations/0140_appareils.sql` (forme des fonctions `authenticated` et de leurs `revoke`), 0.4bis S6.

**Tranches de cette tâche (une PR, un fichier de test et un commit chacune) :**
- **N1a** : `supabase/migrations/<M1a>_abonnements_push.sql`, `tests/db/push-abonnements.test.ts` (cas 1 à 5, 7, 8, 10, 11, 12), `docs/schema.md` ; commit `feat(push): range les abonnements push par session`.
- **N1b** : `supabase/migrations/<M1b>_reglages_push.sql`, `tests/db/push-reglages.test.ts` (cas 6 et 9 et la surface des réglages), `docs/securite.md` (§ « Notifications push » : résumé du modèle de menaces) ; commit `feat(push): ajoute les réglages push par monde et le crochet d'effacement`.

- [ ] **Étape 1 : les tests d'abord** (`tests/db/push-abonnements.test.ts`, personnes de banc Sam et Léa, deux foyers). Cas :
  1. enregistrer rend `cree` et un identifiant ; **la même adresse par la même personne** (même session ou nouvelle session) met la session et les clés à jour, **même identifiant** ;
  2. **la même adresse d'une autre personne avec le MÊME triplet** (adresse, `p256dh`, `auth`) : l'ancienne ligne et ses envois en attente disparaissent, nouvel identifiant ; **avec d'autres clés : `conflit`, rien n'est supprimé** (la victime garde son abonnement) ;
  3. **le 6e abonnement d'une personne** rend `limite` et n'écrit rien (le 5e passe) ; **un demandeur déjà à cinq qui revendique l'adresse d'un autre (même triplet) reçoit `limite` et ne supprime RIEN chez l'autre** ; deux enregistrements simultanés (deux connexions, verrou de personne) ne dépassent jamais 5 ; deux personnes qui se revendiquent la même adresse en croisé ne s'interbloquent pas (verrous dans l'ordre des UUID) ; **deux premières inscriptions simultanées de la même adresse : une seule ligne, aucune violation d'unicité** ; **A revendique l'adresse de B pendant que C la reprend : A voit l'état final de l'adresse et ne supprime jamais la ligne de C sans preuve** ; **une session n'a jamais deux abonnements** : s'inscrire avec une autre adresse libre remplace le précédent (le compte de la personne ne bouge pas) ; **cinq abonnements dont celui de la session courante, revendication d'une adresse d'un autre avec le même triplet : `limite`, RIEN supprimé (la suppression de l'abonnement de la session ne libère pas de place pour un transfert)** ;
  4. une session **fermée** ou **échue** ne peut pas enregistrer (`session_inconnue`) ; la session d'une autre personne non plus ;
  5. **poser `revoked_at`** sur la session supprime ses abonnements : testé par **chaque chemin de fermeture** (`ferme_un_appareil`, `ferme_les_autres_appareils`, `ferme_les_autres_sessions`, `efface_mes_donnees`) et par un `update` direct ;
  6. *(N1b pour le crochet ; la cascade, N1a)* `efface_mes_donnees()` ne laisse **aucune** ligne de `push_subscription` pour la personne (cascade depuis `login_session`) ; **`private.efface_les_donnees_push(personne)`** (le crochet : M1 le crée, M2a le redéfinit pour ajouter `push_essai`) supprime `push_setting` et `push_essai` ; **`private.efface_le_compte` l'appelle seulement s'il existe** (amendement d'une ligne à A6, gardé par `to_regprocedure`, voir « Écarts à relayer » : l'ordre des migrations n'importe donc pas) ; tant que l'amendement n'est pas fusionné, ce cas est écrit `it.fails` et devient vert à sa fusion ; en secours, tout part avec le compte Auth ;
  7. `mes_abonnements_push` ne liste que les miens, ordre `created_at desc, id desc`, page de `limit + 1`, **plusieurs lignes au même `created_at` ni sautées ni répétées** ; un curseur à moitié nul est refusé ;
  8. `retire_mon_abonnement_push(id)` : `true` pour le mien, `false` pour un autre et pour un inconnu (aucune ligne touchée) ;
  9. *(N1b)* `regle_mon_push('budget', …)` : insère, puis met à jour ; `world` mal formé refusé par la contrainte ; `mes_reglages_push` ne rend que les miens ; **surface de N1b** : `anon` et `authenticated` n'ont aucun droit de table sur `push_setting`, RLS activée et forcée, `mes_reglages_push` et `regle_mon_push` exécutables par `authenticated` seul, `private.efface_les_donnees_push` par aucun rôle d'API ;
  10. *(N1a)* **surface de N1a** : `anon`, `authenticated` n'ont **aucun droit de table** sur `push_subscription` ; les **trois** fonctions de M1a sont exécutables par `authenticated` seul (ni `anon`, ni `popote_api`, ni `service_role`, ni `public`) ; la RLS est activée **et forcée** ; **ce cas ne touche pas `push_setting`, qui n'existe qu'après M1b** ;
  11. **`unique (id, person_id)` et `unique (session_id)`** existent ;
  12. contraintes : adresse hors forme `https://…`, `endpoint_sha256` de mauvaise longueur, `p256dh` qui n'est pas du base64url de 87 caractères, `auth` qui n'en fait pas 22 : refusés.
- [ ] **Étape 2 : lancer, voir rouge** : `npx vitest run tests/db/push-abonnements.test.ts` → échec « relation public.push_subscription n'existe pas ».
- [ ] **Étape 3 : les deux migrations.** **Deux migrations distinctes, deux blocs complets, dans cet ordre (une migration fusionnée ne se modifie jamais). Chaque bloc a ses droits, et son `revoke`/`grant` ne cite que des objets que CE bloc crée ou qui existent déjà.**

**M1a (N1a)** :

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- <M1a> · LES ABONNEMENTS PUSH (plan des notifications push, N1a)
--
-- Un abonnement est la clé d'un appareil : adresse du service de push + deux clés de chiffrement. Ce sont des SECRETS de la
-- personne : aucun droit de table, RLS forcée, lus par les fonctions d'envoi seulement (M2b). Rattaché à une SESSION : il disparaît avec
-- elle (cascade) et dès qu'elle est fermée (déclencheur : tous les chemins de fermeture posent `revoked_at`).
--
-- COMPATIBLE avec l'appli en ligne : objets neufs ; le déclencheur ne touche que push_subscription et ne se déclenche que sur
-- `revoked_at` posé, que l'appli en ligne n'écrit pas.
--
-- Retour arrière (sans perte à garder) :
--   drop trigger login_session_ferme on public.login_session;
--   drop function private.retire_les_abonnements_de_la_session();
--   drop function public.enregistre_mon_abonnement_push(text, text, text, uuid), public.mes_abonnements_push(integer, timestamptz, uuid),
--     public.retire_mon_abonnement_push(uuid);
--   drop table public.push_subscription;
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
  created_at timestamptz not null default now(),
  unique (id, person_id),
  unique (session_id)  -- UN abonnement par session (un navigateur) : l'écran sait ce qu'est « cet appareil »
);
create index push_subscription_person_idx on public.push_subscription (person_id, created_at desc, id desc);
alter table public.push_subscription enable row level security;
alter table public.push_subscription force row level security;
revoke all on public.push_subscription from public, anon, authenticated, service_role, popote_api, popote_internal;

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
  v_autre public.push_subscription%rowtype;
  v_existe boolean;
  v_n integer;
  v_remplace boolean;
  v_id uuid;
begin
  if v_person is null then
    raise exception 'Aucune personne dans ce contexte.' using errcode = 'invalid_authorization_specification';
  end if;
  -- 1. Le verrou de l'ADRESSE d'abord : deux inscriptions de la même adresse (première inscription comprise) se suivent, et personne ne
  --    change le propriétaire de cette adresse entre la lecture et les verrous de personnes (toute écriture de cette ligne passe ici).
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('push_endpoint'), pg_catalog.hashtext(pg_catalog.encode(v_hash, 'hex')));
  select * into v_autre from public.push_subscription ps where ps.endpoint_sha256 = v_hash;
  v_existe := found;  -- copié tout de suite : un `perform` ajouté plus loin ne doit pas le changer
  -- 2. Puis les personnes, dans l'ordre des UUID (jamais une seule des deux, jamais d'interblocage).
  if v_existe and v_autre.person_id <> v_person then
    perform private.verrouille_la_personne(least(v_person, v_autre.person_id));
    perform private.verrouille_la_personne(greatest(v_person, v_autre.person_id));
  else
    perform private.verrouille_la_personne(v_person);
  end if;
  if not exists (select 1 from public.login_session s where s.id = p_session and s.person_id = v_person
                  and s.revoked_at is null and s.expires_at > pg_catalog.now() and s.absolute_expires_at > pg_catalog.now()) then
    return query select null::uuid, 'session_inconnue'::text;
    return;
  end if;
  -- 3. Preuve de possession : le MÊME triplet (adresse, p256dh, auth). Sans lui, personne ne reprend l'abonnement d'un autre.
  if v_existe and v_autre.person_id <> v_person and (v_autre.p256dh <> p_p256dh or v_autre.auth <> p_auth) then
    return query select null::uuid, 'conflit'::text;
    return;
  end if;
  -- 4. Le quota se contrôle SANS AUCUNE MUTATION, avant toute suppression. Un TRANSFERT entre personnes exige de la place (< 5) sans compter
  --    qu'on libère l'abonnement de la session ; une adresse LIBRE peut remplacer l'abonnement de CETTE session (même appareil, autre adresse).
  select count(*), bool_or(ps.session_id = p_session and ps.endpoint_sha256 <> v_hash) into v_n, v_remplace
    from public.push_subscription ps where ps.person_id = v_person;
  v_remplace := coalesce(v_remplace, false);
  if v_existe and v_autre.person_id <> v_person then
    if v_n >= 5 then return query select null::uuid, 'limite'::text; return; end if;
  elsif not v_existe then
    if v_n - (case when v_remplace then 1 else 0 end) >= 5 then return query select null::uuid, 'limite'::text; return; end if;
  end if;
  -- 5. Les mutations, dans cet ordre : le précédent de la session (autre adresse), puis l'ancien propriétaire de l'adresse.
  delete from public.push_subscription ps where ps.session_id = p_session and ps.endpoint_sha256 <> v_hash;
  if v_existe and v_autre.person_id <> v_person then
    delete from public.push_subscription ps where ps.id = v_autre.id;  -- l'appareil change de main : ses envois en attente partent avec la ligne
  end if;
  if v_existe and v_autre.person_id = v_person then
    update public.push_subscription ps set session_id = p_session, p256dh = p_p256dh, auth = p_auth
     where ps.id = v_autre.id returning ps.id into v_id;
  else
    insert into public.push_subscription as ps (person_id, session_id, endpoint, endpoint_sha256, p256dh, auth)
    values (v_person, p_session, p_endpoint, v_hash, p_p256dh, p_auth) returning ps.id into v_id;
  end if;
  return query select v_id, 'cree'::text;
end $$;

create function public.mes_abonnements_push(p_limit integer default 20, p_after_created timestamptz default null, p_after_id uuid default null)
returns table (id uuid, session_id uuid, created_at timestamptz, browser text, os text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Aucune personne dans ce contexte.' using errcode = 'invalid_authorization_specification';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 101 or (p_after_created is null) <> (p_after_id is null) then
    raise exception 'Page invalide : taille de 1 à 101, curseur complet ou absent.' using errcode = 'invalid_parameter_value';
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

-- Les trois fonctions de CE bloc, et elles seules.
revoke all on function public.enregistre_mon_abonnement_push(text, text, text, uuid),
  public.mes_abonnements_push(integer, timestamptz, uuid), public.retire_mon_abonnement_push(uuid)
  from public, anon, authenticated, service_role, popote_api, popote_internal;
grant execute on function public.enregistre_mon_abonnement_push(text, text, text, uuid),
  public.mes_abonnements_push(integer, timestamptz, uuid), public.retire_mon_abonnement_push(uuid) to authenticated;
```

**M1b (N1b)** : les réglages se font **par monde** (Budget, Frigo, Semaine, Foyer), pas par type ; les types sans interrupteur n'ont pas de ligne.

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- <M1b> · LES RÉGLAGES PUSH PAR MONDE ET LE CROCHET D'EFFACEMENT (plan des notifications push, N1b)
-- Un interrupteur par monde et par personne. Ce que le monde contient est dans le registre du code ; la base ne connaît que la FORME.
-- COMPATIBLE avec l'appli en ligne : objets neufs.
-- Retour arrière : drop function private.efface_les_donnees_push(uuid), public.mes_reglages_push(), public.regle_mon_push(text, boolean);
--                  drop table public.push_setting;
-- ═══════════════════════════════════════════════════════════════════════════
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.push_setting (
  person_id uuid not null references auth.users (id) on delete cascade,
  world text not null check (world ~ '^[a-z][a-z0-9_]{2,40}$'),
  enabled boolean not null,
  updated_at timestamptz not null default now(),
  primary key (person_id, world)
);
alter table public.push_setting enable row level security;
alter table public.push_setting force row level security;
revoke all on public.push_setting from public, anon, authenticated, service_role, popote_api, popote_internal;

-- Le crochet d'effacement : appelé par `private.efface_le_compte` (A6) SI elle le trouve (`to_regprocedure`). M2a le redéfinit pour `push_essai`.
create function private.efface_les_donnees_push(p_person uuid) returns void
language sql volatile security definer set search_path = '' as $$
  delete from public.push_setting where person_id = p_person;
$$;
revoke all on function private.efface_les_donnees_push(uuid) from public, anon, authenticated, service_role, popote_api, popote_internal;

create function public.mes_reglages_push() returns table (world text, enabled boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Aucune personne dans ce contexte.' using errcode = 'invalid_authorization_specification';
  end if;
  return query select s.world, s.enabled from public.push_setting s where s.person_id = auth.uid() order by s.world;
end $$;

create function public.regle_mon_push(p_world text, p_enabled boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Aucune personne dans ce contexte.' using errcode = 'invalid_authorization_specification';
  end if;
  insert into public.push_setting as s (person_id, world, enabled) values (auth.uid(), p_world, p_enabled)
  on conflict (person_id, world) do update set enabled = excluded.enabled, updated_at = pg_catalog.now();
end $$;

-- Les deux fonctions de CE bloc, et elles seules.
revoke all on function public.mes_reglages_push(), public.regle_mon_push(text, boolean)
  from public, anon, authenticated, service_role, popote_api, popote_internal;
grant execute on function public.mes_reglages_push(), public.regle_mon_push(text, boolean) to authenticated;
```

  (`extensions.digest` : `pgcrypto` est installé dans le schéma `extensions` sur Supabase, comme dans `docs/exploitation.md` ; si la pile locale le
  place ailleurs, utiliser la forme que 0147 emploie pour hacher.)
- [ ] **Étape 4 : appliquer et relancer, tranche par tranche** : après M1a, `npx supabase migration up` puis `npx vitest run tests/db/push-abonnements.test.ts` → tous verts (10 cas, aucun ignoré) ; après M1b, `npx vitest run tests/db/push-reglages.test.ts` → verts ; puis `npm test` complet : **aucune régression** de `tests/db`.
- [ ] **Étape 5 : mutations** (chacune doit casser un test, jouée à la main) : supprimer l'ancienne ligne avant le contrôle du quota ; transférer sans comparer le triplet ; un seul verrou de personne ; retirer le déclencheur ; `after update` sans `when` sur `revoked_at` ;
  retirer `perform private.verrouille_la_personne` ; compter à `> 5` au lieu de `>= 5` ; ne pas supprimer l'ancienne ligne d'une autre personne ;
  `grant select` à `authenticated` sur la table ; oublier `force row level security`.
- [ ] **Étape 6 : un commit par tranche** (messages ci-dessus, corps Why/What, `Refs: #<issue>`) ; une PR brouillon par tranche.

---

### N2 : Valider l'adresse, la configuration, les routes d'abonnement — coupée en N2a (adresse, clés, configuration, dépendances) et N2b (routes), ≈ 200 et ≈ 190 lignes

**Tranches de cette tâche (une PR, un fichier de test et un commit chacune) :**
- **N2a** : `push/adresse.py`, `push/cles.py`, `config.py`, `tests/unit/test_push_adresse.py` et `test_push_cles.py`, `.env.example`, `pyproject.toml`, `uv.lock` ; commit `feat(push): valide l'adresse d'un abonnement et la configuration VAPID`.
- **N2b** : `schemas/push.py`, `api/push_abonnements.py`, `api/v1.py`, `tests/integration/test_push_abonnements.py`, `tests/authz/test_matrice.py`, `tests/unit/test_posts_idempotents.py`, `openapi.json`, `docs/normes-api.md` ; commit `feat(push): expose les abonnements push`.

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
- [ ] **Étape 4 : dépendances et configuration (N2a)** : `uv add --exact http-ece==1.2.1 py-vapid==1.9.6` **ici et nulle part ailleurs** (la configuration dérive la clé publique de la privée avec `py_vapid` ; N4 ne les rajoute pas) ; `uv run pip-audit` ; licences : `http-ece` MIT, `py-vapid` MPL-2.0 (question 2). `config.py`, `Settings`, sur le modèle des mails : `vapid_private_key: SecretStr | None`, `vapid_public_key: str | None`,
  `vapid_subject: str | None` (`POPOTE_VAPID_PRIVATE_KEY`, `POPOTE_VAPID_PUBLIC_KEY`, `POPOTE_VAPID_SUBJECT`), `push_hotes_de_test: frozenset[str]`
  (`POPOTE_PUSH_HOTES_DE_TEST`), **`push_actif: bool = True` (`POPOTE_PUSH_ACTIF`) : l'interrupteur d'urgence**, non secret, qui coupe l'envoi **sans toucher aux clés** (`enabled` = `push_actif` ET clés posées). Règles de démarrage (test : un cas par règle, **sans jamais afficher la valeur**) : privée et publique vont ensemble ou
  pas du tout ; **la publique dérivée de la privée (`py_vapid`) doit égaler la publique posée**, sinon l'API ne démarre pas ; `vapid_subject` doit commencer par `mailto:` ou `https://`
  (valeur à poser : `mailto:bonjour@notre-popote.fr`) ; sans clés, le push est **désactivé** (`enabled` faux, démarrage avertit comme pour les mails) ;
  **`push_hotes_de_test` est refusé hors local** (comme `POPOTE_MAIL_PROVIDER=local`). `.env.example` : les quatre lignes avec `SECRET` sur la privée.
- [ ] **Étape 5 : tests d'intégration et de matrice** (`tests/integration/test_push_abonnements.py`) : `POST` valide → `201` + `Location`, **le corps ne contient ni l'adresse ni les clés**
  (assertion sur le texte entier de la réponse) ; rejeu avec la même `Idempotency-Key` → même réponse, une seule ligne ; sans clé → `400 cle_idempotence_manquante` ;
  adresse refusée → `422` pointeur `/endpoint` ; clé fausse → `422` pointeur `/keys/p256dh` ; 6e → `409 trop_d_abonnements_push` ; adresse d'un autre avec d'autres clés → `409 abonnement_push_conflit` ; clés VAPID absentes → `503 push_indisponible` ;
  `GET` ne rend jamais d'adresse ni de clé, `current` vrai pour la session courante ; `DELETE` d'un abonnement d'**un autre foyer** → `404` ; `push-config` avec et sans clés ;
  **`caplog` ne contient jamais l'adresse, `p256dh`, `auth`** pour aucune de ces requêtes, y compris sur le `422` ; `tests/authz/test_matrice.py` : une ligne par route, trois acteurs
  (moi, autre foyer, sans session) ; `test_posts_idempotents.py` : l'exemption du `DELETE`.
- [ ] **Étape 6 : routes** (`api/push_abonnements.py`) sur le modèle de `api/appareils.py` : `APIRouter(prefix="/me", route_class=RouteIdempotente)` pour les `POST`, un second routeur sans
  clé pour `GET`/`DELETE` ; `operation_id` : `get_push_config`, `create_my_push_subscription`, `list_my_push_subscriptions`, `delete_my_push_subscription` ; modèles `Entree`/`Sortie` fermés ;
  la route appelle `public.enregistre_mon_abonnement_push(%s, %s, %s, %s)` avec `personne.session` ; `etat == 'limite'` → `Probleme(409, "trop_d_abonnements_push", …)`, `conflit` → `Probleme(409, "abonnement_push_conflit", …)`,
  `session_inconnue` → `Probleme(401, "pas_de_session", …)`. Le texte français de chaque erreur est écrit pour la personne, sans détail technique
  (« Tu as déjà 5 appareils avec des notifications. »).
- [ ] **Étape 7 (N2b) :** `uv run python scripts/exporte_contrat.py`, puis les contrôles : `uv run ruff format --check && uv run ruff check && uv run mypy && uv run pytest -q -m "not integration"`
  puis `uv run pytest -q -m integration` → tous verts. **Mutations** : accepter `http` ; accepter le port ; journaliser l'adresse sur le `422` ; renvoyer l'adresse dans le `GET` ;
  démarrer sans vérifier la paire de clés ; accepter `push_hotes_de_test` en prod.
- [ ] **Étape 8 : un commit par tranche** (messages ci-dessus) ; une PR brouillon par tranche.

---

### N3 : La file d'envoi `push_outbox` (migration M2) — coupée en N3a (tables, mise en file, essai et quota) et N3b (prise, classement, purge, état), chacune dans une migration numérotée à la suite (M2a, M2b) ≈ 220 et ≈ 230 lignes

**Tranches de cette tâche (une PR, un fichier de test et un commit chacune) :**
- **N3a** (M2a) : `supabase/migrations/<M2a>_file_d_envoi_push.sql` (`push_outbox`, `push_essai`, `private.met_en_file_push`, `private.cle_du_jour`, `private.push_deja_du_jour`, `met_en_file_mon_essai_push`, `met_en_file_une_notification`, crochet redéfini), `tests/db/push-file.test.ts` (cas 1 à 4, 12, 13, 13b, 13c, 13g, 16) ; commit `feat(push): ajoute la file d'envoi et le quota de l'essai`.
- **N3b** (M2b) : `supabase/migrations/<M2b>_prise_des_pushs.sql` (`prend_les_pushs`, `classe_le_push`, `rend_le_push`, `differe_le_push`, `efface_l_abonnement_push`, `push_en_retard`, `purge_push_outbox` et sa planification), `tests/db/push-file-prise.test.ts` (cas 5 à 11b, 13d à 15, 17) ; commit `feat(push): prend, classe et purge la file d'envoi`.

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
  9. `classe_le_push(id, 'sent')` → `sent`, `sent_at` posé ; `'retry'` → `queued` avec `next_attempt_at` à +60 s, +300 s, +1800 s, +7200 s selon `attempts`, **ou `abandoned` si ce délai dépasse l'échéance** ; un `retry_after_s` du service **allonge** le délai (jamais moins que ce que le service demande ; au plus 86 400 s) et la ligne est **abandonnée** si ce délai dépasse l'échéance ; `'abandoned'`, `'dropped'` terminaux ; état inconnu → erreur ;
  10. `prend_les_pushs` **ne rend pas** une ligne dont la session de l'abonné est fermée ou échue : elle passe à `dropped` ;
  11. `prend_les_pushs` rend `reglages` = les réglages de la personne par monde (objet vide si aucun) ;
  11b. **`public.differe_le_push(p_id, p_jusqua)`** (heures calmes, N5) : remet la ligne `queued`, **rend l'essai pris** (`attempts - 1`), décale `send_at` et `next_attempt_at` à `p_jusqua` et `deadline_at` **du même décalage** (la durée de vie utile est conservée) ; refuse un instant passé ; `popote_api` seul ; la ligne n'est pas rendue par `prend_les_pushs` avant `p_jusqua` ;
  12. `efface_l_abonnement_push(id)` supprime l'abonnement **et ses lignes** (cascade) ; supprimer l'abonnement par `retire_mon_abonnement_push` aussi ;
  13. `met_en_file_mon_essai_push(abonnement)` : `ok` pour le mien ; `introuvable` pour un autre ; `quota` à la 6e en une heure (fenêtre glissante) **avec `retry_after_s` = le temps avant la sortie de la plus ancienne tentative** ; **supprimer l'abonnement puis en créer un autre ne remet pas le compteur à zéro** ; changement de session et transfert d'adresse non plus ;
  13g. `private.cle_du_jour()` vaut `jour:YYYY-MM-DD` **au sens de Paris** (23 h 30 UTC l'été = le lendemain à Paris ; changements d'heure du 25/10/2026 et du 28/03/2027) ; deux mises en file du même type et de la même clé dans la même journée de Paris : **une seule ligne par abonné** ; `push_deja_du_jour` rend vrai ensuite, faux le lendemain ;
  13b. `met_en_file_une_notification` : exécutable par `popote_api` seul ; met en file pour la personne donnée ; refuse un `ttl_s` hors bornes ;
  13c. **la clé étrangère composite** : insérer une ligne `(abonné de B, personne A)` est refusé ;
  13f. **toute fonction de M2a/M2b a son `revoke all` explicite et son test `has_function_privilege`** (`rend_le_push`, `purge_push_outbox`, `efface_les_donnees_push` comprises : `popote_api` pour les fonctions d'envoi, aucun rôle d'API pour les `private`) ;
  13d. `rend_le_push` remet `queued` et rend l'essai consommé ; `prend_les_pushs` rend `ttl_restant_s` décroissant à chaque reprise ;
  13e. **abonnement dont la session est échue (non révoquée)** : la purge le supprime, et rien de plus ; une session de 89 jours et 23 h garde le sien ;
  14. `push_en_retard()` : `due` (échues non prises), `overdue` (échues depuis plus de 5 minutes), `abandoned_24h`, `dropped_24h` ;
  15. **surface** : `prend_les_pushs`, `classe_le_push`, `rend_le_push`, `differe_le_push`, `efface_l_abonnement_push`, `push_en_retard` exécutables par `popote_api` **seul** ; `private.met_en_file_push` par **aucun** rôle d'API (appelée par des fonctions `security definer`) ; `met_en_file_mon_essai_push` par `authenticated` seul ; les tables (`push_outbox`, `push_essai`) sans droit, RLS forcée ;
  16. **schéma** : `push_outbox` n'a **aucune colonne de contenu** (la liste des colonnes est celle écrite ci-dessous : test de dérive qui échoue si une colonne `text`/`jsonb` libre apparaît) ;
  17. purge : `private.purge_push_outbox()` efface les `sent` de plus de 3 jours, les `abandoned`/`dropped` de plus de 30 jours, les essais de plus d'un jour, rien d'autre.
- [ ] **Étape 2 : la migration.** Code complet de la table et des fonctions de mise en file et d'état (le reste suit le même patron : définition, `comment`, `revoke all`, `grant`) :

```sql
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.push_outbox (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null,
  person_id uuid not null,
  -- L'abonné ET la personne vont ensemble : une faute d'une fonction `security definer` ne peut pas appliquer les réglages de A à l'adresse de B.
  foreign key (subscription_id, person_id) references public.push_subscription (id, person_id) on delete cascade,
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

-- « Une notification par jour au plus » (types à `une_par_jour`) : la CLÉ DE DÉDOUBLONNAGE d'un jour de Paris, et « déjà mise en file aujourd'hui ? »
-- pour qu'un appelant (« rappeler l'autre ») puisse répondre « c'est déjà fait ». Jamais `current_date` : le fuseau du serveur n'est pas celui de Paris.
create function private.cle_du_jour() returns text language sql stable set search_path = '' as $$
  select 'jour:' || to_char(pg_catalog.now() at time zone 'Europe/Paris', 'YYYY-MM-DD');
$$;
create function private.push_deja_du_jour(p_person uuid, p_kind text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.push_outbox o
                  where o.person_id = p_person and o.kind = p_kind and o.dedupe_key = private.cle_du_jour());
$$;
revoke all on function private.cle_du_jour(), private.push_deja_du_jour(uuid, text)
  from public, anon, authenticated, service_role, popote_api, popote_internal;

-- Le quota de l'essai vit ICI, pas dans `push_outbox` : supprimer l'abonnement efface ses lignes en cascade, et sans cette table on
-- pourrait faire cinq essais, se désabonner, se réabonner et recommencer. Pas de clé étrangère vers l'abonnement ; effacée avec le compte.
create table public.push_essai (
  person_id uuid not null references auth.users (id) on delete cascade,
  essaye_le timestamptz not null default now()
);
create index push_essai_person on public.push_essai (person_id, essaye_le desc);
alter table public.push_essai enable row level security;
alter table public.push_essai force row level security;
revoke all on public.push_essai from public, anon, authenticated, service_role, popote_api, popote_internal;

-- L'essai : cadré sur la personne du contexte, 5 par heure (fenêtre glissante). Rend aussi les secondes avant la prochaine place.
create function public.met_en_file_mon_essai_push(p_subscription uuid) returns table (etat text, retry_after_s integer)
language plpgsql volatile security definer set search_path = '' as $$
declare v_person uuid := auth.uid(); v_n integer; v_plus_ancien timestamptz;
begin
  if v_person is null then
    raise exception 'Aucune personne dans ce contexte.' using errcode = 'invalid_authorization_specification';
  end if;
  perform private.verrouille_la_personne(v_person);
  if not exists (select 1 from public.push_subscription where id = p_subscription and person_id = v_person) then
    return query select 'introuvable'::text, null::integer; return;
  end if;
  select count(*), min(essaye_le) into v_n, v_plus_ancien from public.push_essai
   where person_id = v_person and essaye_le > pg_catalog.now() - interval '1 hour';
  if v_n >= 5 then
    return query select 'quota'::text,
      greatest(1, ceil(extract(epoch from (v_plus_ancien + interval '1 hour' - pg_catalog.now())))::integer); return;
  end if;
  -- Le quota ne se consomme que si une ligne est VRAIMENT mise en file (session de l'abonnement échue : rien n'est écrit, rien n'est compté).
  if private.met_en_file_push('test', v_person, null, pg_catalog.now(), 300, p_subscription) = 0 then
    return query select 'introuvable'::text, null::integer; return;
  end if;
  insert into public.push_essai (person_id) values (v_person);
  return query select 'ok'::text, null::integer;
end $$;

-- Étroite et réservée à `popote_api` : pour un effet qui s'exécute LUI-MÊME sous `popote_api` (route interne, passe quotidienne), dans la même
-- transaction. Un effet de PERSONNE (`base.personne`, rôle `authenticated`) ne peut pas l'appeler : il s'écrit en SQL (une fonction `security definer`
-- qui appelle `private.met_en_file_push`, donc la même transaction par construction). `private.met_en_file_push` reste fermée aux rôles d'API.
create function public.met_en_file_une_notification(p_kind text, p_person uuid, p_dedupe_key text, p_send_at timestamptz, p_ttl_s integer)
returns integer language sql volatile security definer set search_path = '' as $$
  select private.met_en_file_push(p_kind, p_person, p_dedupe_key, p_send_at, p_ttl_s, null);
$$;
revoke all on function public.met_en_file_une_notification(text, uuid, text, timestamptz, integer)
  from public, anon, authenticated, service_role, popote_api, popote_internal;
grant execute on function public.met_en_file_une_notification(text, uuid, text, timestamptz, integer) to popote_api;
```

  *(Tout ce qui suit est la migration M2b, N3b.)* `prend_les_pushs(p_limite integer default 50)` : **quatre instructions séparées dans la même transaction (jamais des CTE de modification qui visent les mêmes lignes : leur ordre est indéterminé)** — (1) `update … set state = 'abandoned' where state in ('queued','sending') and due and deadline_at <= now()` ; (2) `update … set state = 'dropped'` pour les lignes échues dont la session de l'abonné n'est plus active ; (3) `select o.id … for update of o skip locked limit p_limite` avec **les prédicats `deadline_at > now()` et session active écrits en toutes lettres** ; (4) `update … set state='sending', attempts = attempts + 1, claimed_until = now() + interval '2 minutes' returning …` ; rend `id, kind, subscription_id, person_id, attempts, endpoint, p256dh, auth, reglages` (**`reglages` : un objet `jsonb` `{monde: bool}` de TOUS les réglages de la personne**, que le code croise avec le monde du type : la base ne connaît pas le registre) **et `ttl_restant_s` = `deadline_at - now()` (au moins 1)** : l'en-tête `TTL` d'une reprise est ce temps restant, jamais la durée du type, pour qu'une livraison tardive ne dépasse jamais l'échéance ; **seule fonction qui rend une adresse**.
  `classe_le_push(p_id uuid, p_etat text, p_status smallint default null, p_retry_after_s integer default null)` : `case p_etat when 'sent' …` ; le calcul du délai est `(array[60, 300, 1800, 7200])[least(attempts, 4)]`, au minimum `p_retry_after_s`, puis `abandoned` si `now() + délai > deadline_at`.
  **`differe_le_push(p_id uuid, p_jusqua timestamptz)`** (ci-dessus) ; **`rend_le_push(p_id uuid)`** : remet une ligne `sending` non commencée en `queued`, **retire l'essai qu'elle avait consommé** (`attempts - 1`) et `next_attempt_at = now()` (budget de la passe dépassé, N5).
  `private.efface_les_donnees_push(personne)` (redéfinie à partir de M1b : supprime `push_setting` ET `push_essai`, **tables qui existent toutes deux à ce moment** ; chaque version du crochet ne cite que des tables déjà créées). `private.purge_push_outbox()` : **efface les `sent` de plus de 3 jours, les `abandoned`/`dropped` de plus de 30 jours, les lignes de `push_essai` de plus d'un jour, et les abonnements dont la session est échue** (`expires_at` ou `absolute_expires_at` passé, sans attendre la purge des sessions qui garde 30 jours de plus : la conservation annoncée est tenue) ; planification `cron.schedule('push-outbox-purge', '41 3 * * *', …)` **tolérante** (comme 0126 : avertissement si `pg_cron` manque).
- [ ] **Étape 3 :** `npx supabase migration up`, `npx vitest run tests/db/push-file.test.ts` → 17 cas verts, puis `npm test` sans régression.
- [ ] **Étape 4 : mutations** : prendre sans `skip locked` ; envoyer une ligne échue ; ne pas tester la session ; `sent` sans `sent_at` ; délai de reprise constant ; purger les `queued` ; ajouter une colonne `params jsonb` (le test de schéma casse) ; `met_en_file_push` exécutable par `authenticated` ; oublier le quota.
- [ ] **Étape 5 : un commit par tranche** (messages ci-dessus) ; une PR brouillon par tranche.

---

### N4 : Le registre, la charge utile, le chiffrement et l'envoi — coupée en N4a (registre, charge, chiffrement et vecteur de la RFC) et N4b (transport, faux service), ≈ 200 et ≈ 190 lignes

**Tranches de cette tâche (une PR, un fichier de test et un commit chacune) :**
- **N4a** : `push/types.py`, `push/calme.py`, `push/charge.py`, `tests/unit/test_push_types.py`, `test_push_calme.py`, `test_push_charge.py`, `test_rfc8291.py` (le vecteur) ; commit `feat(push): le registre des notifications, les heures calmes et la charge utile`.
- **N4b** : `push/envoi.py`, `tests/_faux_service_push.py`, `tests/unit/test_push_envoi.py` ; commit `feat(push): chiffre, signe et envoie une notification`.

**Pourquoi :** D2, D5, D6 ; exigences 1 et 5 (chiffrement par la bibliothèque, charge, faux service). **Dépend de :** N2a (adresse, clés, configuration, dépendances). Aucune base. **Règle de lecture, valable pour N4 et N5 comme pour toutes : dans chaque étape, les tests listés sous le code sont écrits et lancés ROUGES d'abord ; le code montré est celui qu'on écrit ensuite pour les faire passer.**
**Sources à relire :** RFC 8291 (§ 5 et annexe A : le vecteur), RFC 8292 (VAPID), RFC 8030 §§ 5.2–5.3, pages PyPI de `http-ece` 1.2.1 et `py-vapid` 1.9.6, `webkit.org/blog/16535`.
**Fichiers :** `src/popote_api/push/types.py`, `push/charge.py`, `push/envoi.py`, `infra/push_service.py` (client `httpx`), `tests/unit/test_push_types.py`, `test_push_charge.py`,
`test_push_envoi.py`, `tests/_faux_service_push.py`, `tests/unit/test_architecture.py` (liste de `base.connexion()` : N5), `pyproject.toml`/`uv.lock`, `docs/securite.md`.

- [ ] **Étape 1 : `push/types.py`** (code complet ; **un seul type à livrer : l'essai**) :

```python
"""Le registre des notifications : tout ce qui est propre à un type. Ajouter un type = ajouter une entrée ici (voir « Recette »)."""

from dataclasses import dataclass
from enum import StrEnum
from typing import Final, Literal


class Monde(StrEnum):
    """Un interrupteur par monde et par personne (Mon compte). La valeur est la clé de `push_setting.world`."""
    BUDGET = "budget"
    FRIGO = "fridge"
    SEMAINE = "week"
    FOYER = "household"


# Valeur par défaut d'un monde quand la personne n'a rien choisi : allumé, sauf mention de la session design.
MONDE_ACTIF_PAR_DEFAUT: Final[dict[Monde, bool]] = {m: True for m in Monde}


class TypeDePush(StrEnum):
    ESSAI = "test"


Urgence = Literal["very-low", "low", "normal", "high"]


@dataclass(frozen=True, slots=True)
class DefinitionDePush:
    type: TypeDePush
    texte: str  # constant, SANS paramètre : rien d'intime sur l'écran verrouillé (variante sans prénom par défaut)
    chemin: str  # l'écran visé, relatif à l'origine de l'appli (si la session est fermée : après l'empreinte, voir N13)
    ttl_s: int  # durée de vie : au-delà, la notification est abandonnée (60 à 86 400)
    urgence: Urgence
    monde: Monde | None  # l'interrupteur qui la gouverne ; `None` = AUCUN interrupteur (acces_banque, minuteur, essai)
    heures_calmes: bool  # vrai : due entre 22 h et 8 h (Paris), elle part à 8 h ; faux : le minuteur, l'essai
    une_par_jour: bool  # vrai : au plus une par personne et par jour (clé de dédoublonnage `private.cle_du_jour()`)


DEFINITIONS: Final[dict[TypeDePush, DefinitionDePush]] = {
    TypeDePush.ESSAI: DefinitionDePush(
        type=TypeDePush.ESSAI,
        texte="Notification d'essai : Popote peut te prévenir sur cet appareil.",
        chemin="/reglages/notifications",
        ttl_s=300,
        urgence="normal",
        monde=None,  # l'essai part toujours : on le demande
        heures_calmes=False,  # la personne vient de toucher le bouton
        une_par_jour=False,
    ),
}
```

  Tests (`test_push_types.py`) : **chaque `Monde` a une valeur par défaut** ; **un type sans monde n'est jamais « réglable »** (il n'a pas de ligne dans `GET /me/push-settings`) ; **les types du Budget, du Frigo, de la Semaine et du Foyer ne sont PAS dans ce plan** (le Budget : plan d'API du Budget, B13 ; les autres sont provisoires, la session design n'a donné que des intentions) ; toute définition a `60 <= ttl_s <= 86400`, un `chemin` qui commence par `/` sans `//` ni `:` ni `\`, **un texte de 80 caractères au plus sans chiffre, sans `{`, sans `}`, sans `%`**,
  `urgence` valide ; la **clé de `DEFINITIONS` égale `definition.type`** ; chaque valeur de `TypeDePush` respecte la forme `^[a-z][a-z0-9_]{2,40}$` de la base.
- [ ] **Étape 1b : `push/calme.py`** (heures calmes ; tests d'abord, table de cas) :

```python
"""Heures calmes : de 22 h à 8 h, heure de Paris (jamais celle du serveur). Une notification due la nuit part à 8 h ; le minuteur et l'essai y échappent."""

from datetime import UTC, datetime, time, timedelta
from typing import Final
from zoneinfo import ZoneInfo

PARIS: Final = ZoneInfo("Europe/Paris")
DEBUT: Final = time(22, 0)
FIN: Final = time(8, 0)


def reprise_apres_les_heures_calmes(maintenant: datetime) -> datetime | None:
    """`None` : on est hors des heures calmes, on envoie. Sinon, le prochain 8 h de Paris (en UTC). `maintenant` est TOUJOURS passé : jamais d'horloge ici."""
    local = maintenant.astimezone(PARIS)
    if FIN <= local.time() < DEBUT:
        return None
    jour = local.date() + timedelta(days=1) if local.time() >= DEBUT else local.date()
    return datetime.combine(jour, FIN, tzinfo=PARIS).astimezone(UTC)
```

  Tests (`test_push_calme.py`, **instants UTC injectés**) : 07 h 59 Paris → le jour même à 8 h ; 08 h 00 → `None` ; 21 h 59 → `None` ; 22 h 00 → le lendemain 8 h ; minuit → 8 h du même jour ; **les jours de changement d'heure** (25/10/2026 : journée de 25 h ; 28/03/2027 : journée de 23 h) : le résultat est toujours 8 h de Paris ; un instant sans fuseau est refusé (`ValueError`) ; **mutation** : comparer en UTC casse les cas d'été.
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
- [ ] **Étape 3 : `push/envoi.py`** (N4b) : chiffrement + signature + requête. Le texte ci-dessous est la forme attendue, **à écrire après ses tests (étapes 4 et 5)** :

```python
"""Chiffre (RFC 8291), signe (VAPID, RFC 8292) et envoie. RIEN d'`httpx` ne sort d'ici : son exception cite l'adresse."""

import asyncio
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
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

DELAI: Final = httpx.Timeout(5.0, connect=3.0)  # par phase : `httpx` ne borne PAS la durée totale
DELAI_MURAL_S: Final = 8.0  # la durée totale d'un envoi : `asyncio.timeout`
VIE_DE_LA_SIGNATURE_S: Final = 12 * 3600  # RFC 8292 : 24 h au plus
RETRY_AFTER_MAX_S: Final = 86_400


class Issue(StrEnum):
    ENVOYE = "sent"  # 201 seulement (RFC 8030 § 5)
    EXPIRE = "expired"  # 404 (RFC 8030 § 7.3) ; 410 traité pareil (extension de certains services : à confirmer, N0 E3)
    A_REESSAYER = "retry"  # 429, 5xx, délai, réseau
    REFUSE = "refused"  # 3xx, autre 2xx, autre 4xx : définitif
    INVALIDE = "invalid"  # l'abonnement stocké est inexploitable (clé hors courbe…) : il sera supprimé
    PANNE_INTERNE = "internal"  # notre signature VAPID a échoué : on réessaie, on ne supprime RIEN


@dataclass(frozen=True, slots=True)
class Resultat:
    issue: Issue
    statut: int | None
    reessayer_apres_s: int | None = None


def nouveau_client() -> httpx.AsyncClient:
    # Aucune redirection suivie, aucun proxy lu dans l'environnement : l'adresse venue du client n'est jamais « corrigée ».
    return httpx.AsyncClient(follow_redirects=False, trust_env=False, timeout=DELAI, http2=False)


def delai_de_reprise(valeur: str | None, maintenant: datetime) -> int | None:
    """`Retry-After` : un entier de secondes ou une date HTTP (RFC 9110 § 10.2.3). Illisible : `None`."""
    if not valeur:
        return None
    if valeur.isascii() and valeur.isdigit():
        return min(int(valeur), RETRY_AFTER_MAX_S)
    try:
        date = parsedate_to_datetime(valeur)
    except (TypeError, ValueError):
        return None
    if date.tzinfo is None:
        date = date.replace(tzinfo=UTC)
    return max(0, min(int((date - maintenant).total_seconds()), RETRY_AFTER_MAX_S))


def classe(statut: int, retry_after: str | None, maintenant: datetime) -> Resultat:
    if statut == 201:
        return Resultat(Issue.ENVOYE, statut)
    if statut in (404, 410):
        return Resultat(Issue.EXPIRE, statut)
    if statut == 429 or 500 <= statut <= 599:
        return Resultat(Issue.A_REESSAYER, statut, delai_de_reprise(retry_after, maintenant))
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


def en_tetes(adresse: str, ttl_s: int, definition: DefinitionDePush, vapid: Vapid02, sujet: str) -> dict[str, str]:
    morceaux = urlsplit(adresse)
    port = f":{morceaux.port}" if morceaux.port not in (None, 443) else ""  # l'audience : origine normalisée (hôte en minuscules, sans :443)
    revendications = {"aud": f"{morceaux.scheme}://{(morceaux.hostname or '').lower()}{port}", "sub": sujet, "exp": int(time.time()) + VIE_DE_LA_SIGNATURE_S}
    return {
        **vapid.sign(revendications),
        "TTL": str(max(1, ttl_s)),  # le temps RESTANT avant l'échéance de la ligne, pas la durée du type
        "Urgency": definition.urgence,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
    }


async def envoie(
    client: httpx.AsyncClient, *, adresse: str, p256dh: str, auth: str, ttl_s: int, charge: bytes,
    definition: DefinitionDePush, vapid: Vapid02, sujet: str, hotes_de_test: frozenset[str],
) -> Resultat:
    """Ne lève jamais pour une cause propre à UNE ligne : un abonnement empoisonné n'arrête pas la passe."""
    if not adresse_push_valide(adresse, hotes_de_test=hotes_de_test):
        return Resultat(Issue.REFUSE, None)  # défense en profondeur : revérifiée à chaque envoi
    try:
        corps = chiffre(charge, p256dh, auth)
    except (ValueError, http_ece.ECEException):  # SEULEMENT les clés de l'abonné : hors courbe, base64 invalide, mauvaise taille
        return Resultat(Issue.INVALIDE, None)
    try:
        entetes = en_tetes(adresse, ttl_s, definition, vapid, sujet)
    except Exception:  # noqa: BLE001  # NOTRE signature a échoué : une panne de service, jamais la faute de l'abonné
        return Resultat(Issue.PANNE_INTERNE, None)
    statut: int | None = None
    retry_after: str | None = None
    try:
        async with asyncio.timeout(DELAI_MURAL_S):
            # `stream` : on lit l'état et les en-têtes, JAMAIS le corps de la réponse.
            async with client.stream("POST", adresse, content=corps, headers=entetes) as reponse:
                statut, retry_after = reponse.status_code, reponse.headers.get("retry-after")
    except (httpx.HTTPError, TimeoutError):
        pass  # on sort du bloc `except` AVANT de rendre : aucun `__context__` ne porte l'exception d'`httpx` (son texte cite l'adresse)
    if statut is None:
        return Resultat(Issue.A_REESSAYER, None)
    return classe(statut, retry_after, datetime.now(UTC))
```

- [ ] **Étape 4 : le faux service** (`tests/_faux_service_push.py`) : un `ThreadingHTTPServer` sur `127.0.0.1:0`, qui garde `(chemin, en-têtes, corps)` de chaque `POST`, répond avec un statut réglable
  (`201` par défaut ; `410`, `404`, `429` + `Retry-After`, `500`, `302` + `Location` vers un second écouteur, ou un `time.sleep` plus long que le délai), expose `déchiffre(abonné)` (par `http_ece.decrypt` avec la clé privée et le secret de l'abonné de test) et
  `hote()` (`127.0.0.1:<port>`). **N'existe que dans `tests/` ; l'API l'accepte seulement par `POPOTE_PUSH_HOTES_DE_TEST` (refusé hors local, N2).**
- [ ] **Étape 5 : tests** (`test_push_envoi.py`) :
  1. **vecteur de la RFC 8291, annexe A** : recopier de la RFC les valeurs de l'exemple (clé de l'agent d'application, clé de l'agent utilisateur, secret d'authentification, sel, texte « When I grow up, I want to be a watermelon », corps chiffré attendu), appeler `http_ece.encrypt` avec ces valeurs fixes (`salt=`, `key`/`private_key`) et comparer **octet pour octet** au corps de la RFC ; ces valeurs sont recopiées de la page de la RFC (`rfc-editor.org/rfc/rfc8291.html`), jamais de mémoire ;
  2. aller-retour : `chiffre` puis `http_ece.decrypt` avec la clé privée de l'abonné de test rend la charge d'origine ;
  3. contre le faux service (`201`) : `Issue.ENVOYE` ; **les en-têtes reçus** contiennent `TTL`, `Urgency`, `Content-Encoding: aes128gcm`, `Authorization: vapid t=…` ; **le jeton VAPID se vérifie** avec la clé publique (`aud` = origine du faux service, `sub` = le sujet, `exp` dans les 24 h) ; le corps déchiffré est le message déclaratif ;
  4. **`201` seul est `ENVOYE`** ; `200` et `202` → `REFUSE` (inattendus) ; `404` et `410` → `EXPIRE` ; `429` avec `Retry-After: 120` → `A_REESSAYER`, `reessayer_apres_s == 120` ; **`Retry-After` en date HTTP** → le nombre de secondes jusqu'à elle ; date passée → 0 ; valeur illisible ou au-dessus de 86 400 s → `None` ou borné ; `500` → `A_REESSAYER` ; `400`, `401`, `403`, `413` → `REFUSE` ; **l'en-tête `TTL` reçu égale `ttl_s` passé (le temps restant), pas la durée du type** ;
  5. **`302` vers un second écouteur : `REFUSE`, et le second écouteur ne reçoit AUCUNE requête** ;
  6. **proxy ignoré** : avec `HTTPS_PROXY`/`HTTP_PROXY`/`ALL_PROXY` posés vers un écouteur espion, l'envoi n'y passe pas ;
  7. délai : un faux service qui dort 10 s → `A_REESSAYER` en moins de 9 s (`asyncio.timeout`) ; **un faux service qui distille sa réponse goutte à goutte** (chaque phase sous 5 s, total plus long) est coupé à 8 s ; **le corps de la réponse n'est jamais lu** (le faux service y met 10 Mio : la mémoire ne bouge pas, et la connexion est refermée) ;
  8. **aucune fuite** : `envoie` ne lève **aucune** exception pour une panne réseau ou un délai (résultat `A_REESSAYER`) ; `str(resultat)`, `repr(resultat)` ne contiennent ni l'adresse ni les clés ; **`caplog` à tous les niveaux, loggers `httpx` et `httpcore` compris, vide d'adresse** (ils sont fixés à `WARNING` au démarrage de l'application : testé) ;
  8b. **`aud` normalisé** : `https://FCM.googleapis.com:443/x` donne `aud == https://fcm.googleapis.com` ; **`vapid.sign` qui lève → `PANNE_INTERNE` (jamais `INVALIDE`), aucune requête, l'abonnement n'est PAS supprimé** (testé dans la passe) ;
  9. adresse hors liste blanche → `REFUSE` **sans aucune requête** (espion) ; **`p256dh` hors courbe, mal formé, ou `auth` de mauvaise taille → `INVALIDE` sans requête et sans exception** (l'abonnement sera supprimé par la passe).
- [ ] **Étape 6 :** (les dépendances sont déjà là : N2a) ; contrôles de fin comme N2. **Mutations** : `follow_redirects=True` (le cas 5 casse) ; `trust_env=True` (le 6) ; lire le corps de la réponse ; retirer `asyncio.timeout` ; `TTL` = durée du type ; accepter `200` comme envoyé ; omettre `TTL` ; omettre `Content-Encoding` ; `aud` fixe au lieu de l'origine du service ; laisser fuir l'exception d'`httpx` ; ne pas revérifier l'adresse ; `ttl` du registre ignoré.
- [ ] **Étape 7 : un commit par tranche** (messages ci-dessus) ; une PR brouillon par tranche.

---

### N5 : La passe d'envoi et la route interne — coupée en N5a (accès à la file, passe) et N5b (route interne), ≈ 210 et ≈ 150 lignes

**Tranches de cette tâche (une PR, un fichier de test et un commit chacune) :**
- **N5a** : `infra/push_file.py`, `push/passe.py`, `tests/unit/test_architecture.py` (liste fermée), `tests/unit/test_push_passe.py` ; commit `feat(push): la passe d'envoi de la file`.
- **N5b** : `api/internes_push.py`, `main.py`, `tests/integration/test_push_interne.py`, `docs/exploitation.md` ; commit `feat(push): la route interne d'envoi, signée`.

**Pourquoi :** D3, D9. **Dépend de :** N3, N4.
**Fichiers :** `src/popote_api/infra/push_file.py` (accès à la file : `prend`, `classe`, `efface_l_abonnement`, `retard`), `push/passe.py` (`vide_la_file`), `api/internes_push.py`, `main.py` (montage, client `httpx` dans `app.state`, fermeture à l'arrêt), `tests/unit/test_architecture.py`
(liste fermée de `base.connexion()` : `infra/push_file.py`, raison écrite), `tests/unit/test_push_passe.py`, `tests/integration/test_push_passe.py`, `tests/integration/test_push_interne.py`, `docs/exploitation.md`, `docs/securite.md`.

- [ ] **Étape 1 : la passe** (`push/passe.py`, à écrire APRÈS les tests de l'étape 4, qu'on a vus rouges) :

```python
"""Une passe : cinq travailleurs prennent UNE ligne à la fois, envoient hors transaction, classent. Au moins une fois (D9)."""

import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Final

from popote_api.infra.push_file import FilePush, LigneDue
from popote_api.push.calme import reprise_apres_les_heures_calmes
from popote_api.push.charge import charge_utile
from popote_api.push.envoi import Issue, Resultat, envoie
from popote_api.push.types import DEFINITIONS, MONDE_ACTIF_PAR_DEFAUT, TypeDePush

BUDGET_S: Final = 15.0  # TOTAL, nettoyage compris : `pg_net` attend 60 s, la route 25 s (normes § 3.6)
NETTOYAGE_S: Final = 3.0  # réservé dans le budget total pour rendre UNE ligne
TRAVAILLEURS: Final = 5
LIGNES_MAX: Final = 50


@dataclass(slots=True)
class Bilan:
    sent: int = 0
    retrying: int = 0
    expired: int = 0
    refused: int = 0
    dropped: int = 0
    abandoned: int = 0
    prises: int = 0
    deferred: int = 0


def _definition(kind: str):  # type: ignore[no-untyped-def]
    try:
        return DEFINITIONS[TypeDePush(kind)]
    except (ValueError, KeyError):
        return None


async def vide_la_file(file: FilePush, client, vapid, config, *, maintenant=lambda: datetime.now(UTC)) -> Bilan:  # type: ignore[no-untyped-def]
    """Échéance ABSOLUE, nettoyage compris : le travail s'arrête à `BUDGET_S - NETTOYAGE_S`, le reste du budget sert à rendre les lignes.
    Chaque travailleur ABSORBE le dépassement d'échéance (aucune exception n'arrive à `gather`) : la fonction ne rend la main qu'une fois
    TOUS les nettoyages finis. La prise elle-même est sous l'échéance. Le quota de lignes se réserve de façon atomique (aucun `await`
    entre le test et l'incrément)."""
    bilan = Bilan()
    echeance = asyncio.get_running_loop().time() + BUDGET_S - NETTOYAGE_S

    async def travailleur() -> None:
        while True:
            if bilan.prises >= LIGNES_MAX or asyncio.get_running_loop().time() >= echeance:
                return
            bilan.prises += 1  # réservation atomique : 5 travailleurs ne peuvent pas dépasser 50
            ligne: LigneDue | None = None
            termine = False
            try:
                async with asyncio.timeout_at(echeance):
                    lignes = await file.prend(1)  # courte transaction, VALIDÉE avant l'appel réseau, sous l'échéance
                    if not lignes:
                        termine = True
                        return
                    ligne = lignes[0]
                    await _traite(file, client, vapid, config, ligne, bilan, maintenant())
                    termine = True
            except TimeoutError:
                return  # absorbé ici : la ligne en cours est rendue dans le `finally`
            finally:
                if ligne is not None and not termine:  # échéance, annulation extérieure ou erreur : la ligne n'est PAS perdue
                    await asyncio.shield(_rend(file, ligne))

    # `TaskGroup` : à une annulation extérieure, il ATTEND tous les travailleurs (donc tous leurs nettoyages protégés) avant de repropager l'annulation ;
    # aucun `_rend` ne reste détaché. Les travailleurs absorbent le dépassement d'échéance : aucune exception ne sort du groupe pour cette cause.
    async with asyncio.TaskGroup() as groupe:
        for _ in range(TRAVAILLEURS):
            groupe.create_task(travailleur())
    return bilan


async def _rend(file: FilePush, ligne: LigneDue) -> None:
    try:
        async with asyncio.timeout(NETTOYAGE_S):
            await file.rend(ligne.id)
    except TimeoutError:
        pass  # la ligne reste `sending` : `claimed_until` (2 minutes) la fera reprendre ; jamais perdue


async def _traite(file: FilePush, client, vapid, config, ligne: LigneDue, bilan: Bilan, maintenant: datetime) -> None:  # type: ignore[no-untyped-def]
    definition = _definition(ligne.kind)
    if definition is None:
        await file.classe(ligne.id, "abandoned", None, None)
        bilan.abandoned += 1
        return
    if definition.monde is not None and not ligne.reglages.get(
        definition.monde.value, MONDE_ACTIF_PAR_DEFAUT[definition.monde]
    ):
        await file.classe(ligne.id, "dropped", None, None)  # la personne a coupé ce monde (un type sans monde n'a pas d'interrupteur)
        bilan.dropped += 1
        return
    reprise = reprise_apres_les_heures_calmes(maintenant) if definition.heures_calmes else None
    if reprise is not None:
        await file.differe(ligne.id, reprise)  # due la nuit : elle part à 8 h (Paris), sa durée de vie utile est décalée d'autant
        bilan.deferred += 1
        return
    resultat: Resultat = await envoie(  # ne lève jamais pour une cause propre à la ligne (N4b) ; l'annulation, elle, se propage
        client, adresse=ligne.endpoint, p256dh=ligne.p256dh, auth=ligne.auth, ttl_s=ligne.ttl_restant_s,
        charge=charge_utile(definition, config.origine), definition=definition, vapid=vapid,
        sujet=config.sujet, hotes_de_test=config.hotes_de_test,
    )
    match resultat.issue:
        case Issue.ENVOYE:
            await file.classe(ligne.id, "sent", resultat.statut, None)
            bilan.sent += 1
        case Issue.EXPIRE | Issue.INVALIDE:
            await file.efface_l_abonnement(ligne.subscription_id)  # cascade : ses lignes partent avec lui, pas celles des autres abonnés
            bilan.expired += 1
        case Issue.A_REESSAYER | Issue.PANNE_INTERNE:  # une panne de NOTRE signature ne supprime jamais un abonnement
            await file.classe(ligne.id, "retry", resultat.statut, resultat.reessayer_apres_s)
            bilan.retrying += 1
        case Issue.REFUSE:
            await file.classe(ligne.id, "abandoned", resultat.statut, None)
            bilan.refused += 1
```

- [ ] **Étape 2 : la route** (`api/internes_push.py`, `nouveau_routeur()`, `include_in_schema=False`) : `POST /internal/push/dispatch`, **sans corps**, `async def`. Si les clés VAPID ou `public_base_url` manquent : `503 push_indisponible` (la signature a déjà été vérifiée ; le journal
  dit `push_non_configure`). Sinon : **`avant = await file.retard()` (`push_en_retard`) AVANT la passe** (une panne du réveil ne doit pas être masquée par la passe qui vide la file), puis `bilan = await vide_la_file(...)`, puis `remaining` (après). `cron_alive` **n'existe pas encore en N5** : N6 l'ajoute (état du réveil, lu AVANT la passe) avec son test. Réponse `200 {sent, retrying, expired, refused, dropped, deferred, abandoned (24 h), overdue (avant la passe), remaining}` en N5, **plus `cron_alive` (booléen) en N6** : **des nombres et un booléen, aucun identifiant**.
  **Idempotente par construction** (état relu en base, lignes prises sous `skip locked`) : le test l'écrit.
- [ ] **Étape 3 : `infra/push_file.py`** : six fonctions minces qui appellent `public.prend_les_pushs`, `classe_le_push`, `rend_le_push`, `differe_le_push`, `efface_l_abonnement_push`, `push_en_retard` par `base.connexion()` (une transaction courte par appel). `tests/unit/test_architecture.py` : le module est ajouté à la liste fermée, raison écrite.
- [ ] **Étape 4 : tests** : 
  - **heures calmes** : une ligne du Budget (type de test avec `heures_calmes=True`, monde `budget`) prise à 23 h de Paris est **différée à 8 h** sans aucune requête au faux service ; la même à 8 h pile part ; **une ligne du type `essai` ou d'un type `heures_calmes=False` (le minuteur) part à 3 h du matin** ; **un monde coupé** (`reglages = {"budget": false}`) : `dropped` ; **un type sans monde part même si tous les mondes sont coupés** ; monde sans réglage : la valeur par défaut du monde ;
  - unitaires de la passe avec une **fausse file en mémoire** et le faux service : **50 lignes à réponses lentes (3 s chacune) : la passe rend la main **avant `BUDGET_S + 1,5 s`** d'horloge murale (**la borne externe, avec une marge MESURÉE** : le travail s'arrête à 12 s, le nettoyage borné de 3 s fait 15 s ; la marge de 1,5 s absorbe l'ordonnancement, et le test écrit la durée mesurée dans sa sortie pour qu'on la voie dériver), au plus 5 lignes sont en cours à l'échéance et sont rendues (`rend_le_push`), aucune n'est perdue ni envoyée deux fois, jamais plus de 5 requêtes simultanées ; `TTL` d'une ligne envoyée = temps restant AU DÉPART (aucune ligne n'attend en mémoire) ; un `rend_le_push` lent (4 s) ne bloque pas la passe au-delà de `NETTOYAGE_S` ; une ANNULATION EXTÉRIEURE de la passe rend elle aussi la ligne en cours ; **une prise lente (`prend` qui dort 20 s) est coupée à l'échéance et ne dépasse pas le budget ; cinq nettoyages de durées différentes (0,1 s à 4 s) : la passe attend les cinq et reste sous `BUDGET_S + 1,5 s` ; **annulation extérieure avec cinq nettoyages en cours : la fonction ne rend la main (en propageant l'annulation) qu'après le dernier `_rend` terminé ou coupé à `NETTOYAGE_S` (aucun `_rend` détaché, vérifié par un compteur de nettoyages terminés)** ; jamais plus de 50 lignes prises (compteur vérifié avec 5 travailleurs et 200 lignes échues)** ; `vapid.sign` qui lève : l'abonnement n'est pas supprimé, la ligne repart en reprise** ; **une ligne empoisonnée (clé `p256dh` hors courbe écrite par appel SQL direct) à côté d'une ligne valide : l'abonnement empoisonné est supprimé, la ligne valide est envoyée, la passe va au bout** ; envoyée → `sent` ; `410` → l'abonnement est effacé, **aucun autre** ; `429` + `Retry-After` → `retry` avec ce délai ; `500` → `retry` ; `302` → `abandoned` (REFUSE), `refused` compté ; type inconnu du registre → `abandoned` sans envoi ; **réglage coupé** → `dropped` sans envoi ; **réglage absent et `actif_par_defaut` faux** → `dropped` ; plus de 5 envois simultanés jamais (compteur du faux service) ;
  - intégration (base locale + faux service, deux abonnés dont un expire) : **un abonné `201`, l'autre `410` : la ligne du premier est `sent`, l'abonnement du second a disparu, aucun doublon** ; processus tué après la prise (`claimed_until` passé) → repris, **doublon écrit comme voulu** ; échecs successifs : 60 s, 300 s, 1 800 s, 7 200 s puis `abandoned` à l'échéance ; **la transaction de prise est validée avant l'appel réseau** (le faux service lit `pg_stat_activity` : aucune transaction ouverte de l'API pendant la requête) ;
  - route : sans signature → `404` ; signature périmée → `404` ; signature d'un autre chemin → `404` ; **rejeu dans les 300 s : mêmes lignes, aucune seconde requête au faux service** ; sans clés VAPID → `503` ; **la réponse ne contient ni identifiant, ni adresse** ; `caplog` sans adresse ni clé ; `remaining` juste (plus de 50 lignes : deux passes les finissent) ;
  - `tests/unit/test_routes_fermees.py` et `test_internes.py` : la route est sous `/internal`, avec la dépendance de signature.
- [ ] **Étape 5 : mutations** : classer `sent` avant l'envoi ; garder la transaction ouverte pendant l'envoi ; ne pas effacer l'abonnement expiré ; effacer **tous** les abonnés de la personne sur un `410` ; retenter un `REFUSE` ; ignorer le réglage ; journaliser `ligne` ; prendre toutes les lignes d'un coup ; retirer `timeout_at` ; ne pas rendre la ligne en cours (échéance et annulation) ; rendre sans `shield` ni borne ; laisser une ligne empoisonnée lever dans la passe.
- [ ] **Étape 6 : un commit par tranche** (messages ci-dessus) ; une PR brouillon par tranche.

---

### N6 : Le réveil par `pg_cron` et la veille quotidienne (migration M3) — coupée en N6a (migration, états, route : `cron_alive`) et N6b (workflow, fiche), ≈ 250 et ≈ 100 lignes

**Tranches de cette tâche (une PR, un fichier de test et un commit chacune) :**
- **N6a** (M3) : `supabase/migrations/<M3>_reveil_push.sql`, `tests/db/push-reveil.test.ts`, `cron_alive` dans `api/internes_push.py` et son test ; commit `feat(push): réveille le conteneur par pg_cron quand une notification est échue`.
- **N6b** : `.github/workflows/push-veille.yml`, `docs/exploitation.md` ; commit `ci(push): veille quotidienne des notifications`.

**Pourquoi :** D3 ; consigne « le serveur envoie à l'heure prévue alors que le conteneur dort ». **Dépend de :** N5 ; **F8** (planification et coffre `vault` : adresse et secret ; si F8 n'est pas fusionnée, N6 attend, ou reprend ses noms sans les redéfinir).
**Sources à relire :** `docs/exploitation.md` (« Comment une tâche `pg_cron` signera », réserve du corps), `0126_rappels.sql:557-645` (le motif tolérant), plan 0.4ter F8, `.github/workflows/reveil-essai.yml`.
**Fichiers :** `supabase/migrations/<M3>_reveil_push.sql`, `tests/db/push-reveil.test.ts`, `.github/workflows/push-veille.yml`, `docs/exploitation.md`.

- [ ] **Étape 1 : tests de base** (`tests/db/push-reveil.test.ts`, la base locale, **sans `pg_net` réel** : un remplaçant `net.http_post` posé dans un schéma de test enregistre les appels) :
  1. rien d'échu → **aucun appel** ; une ligne échue → **un appel** ; une ligne future → aucun ;
  2. un second passage 30 s plus tard → **aucun appel** (anti-chevauchement 55 s) ;
  3. le dernier appel s'est soldé par un statut ≠ 200 (ligne de `net._http_response` simulée) → pas de nouvel appel avant 5 minutes ;
  4. secrets du coffre absents → `push_passe.statut = 'sans_secret'`, aucun appel, aucune erreur ; extensions absentes → `sans_extension` ;
  5. **la signature** (propriété de N6) : `private.signe_un_appel_interne('/internal/push/dispatch', '{}')` rend `t=<secondes>,v1=<hex>` ; **`ops/signe_interne.py` calcule la même valeur** pour le même instant, chemin et corps (vecteur figé, comme `tests/unit/test_signature.py`) ; **`has_function_privilege` est faux pour `public`, `anon`, `authenticated`, `service_role`, `popote_api`, `popote_internal`** ; **rotation** : écrite dans `docs/exploitation.md` (`popote_internal_secret` = le courant, l'API accepte aussi `POPOTE_INTERNAL_SECRET_PRECEDENT` pendant le changement : poser le nouveau dans le coffre **après** l'API) ;
  6. **`public.etat_du_reveil_push()` rend un état, pas un booléen**, fondé sur `private.push_passe` et la réponse `pg_net` : `inactif_sans_travail` (rien d'échu), `ok` (dernier appel `appelee` avec réponse 200), `secret_absent` (`sans_secret`, ou `sans_extension`, **avec du travail échu**), `appel_echoue` (`erreur`, ou réponse ≠ 200), `jamais_appele` (travail échu, aucune ligne) ; `cron_alive` de la route (ajouté ici, N6) = état dans (`inactif_sans_travail`, `ok`), **lu AVANT la passe** : la passe qui vide la file ne peut pas le rendre sain ; **cas testé : une ligne échue depuis 4 minutes, secret absent, passe directe qui vide la file → `cron_alive` reste faux** ; **cas testés : une ligne échue avec secret absent → `secret_absent` même si le job `pg_cron` a « réussi » ; une réponse 500 → `appel_echoue`** ; l'état de `cron.job_run_details` n'est lu qu'en plus, pour dire « job absent » ;
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
alter table private.push_passe enable row level security;
alter table private.push_passe force row level security;

-- Le signataire appartient à CETTE migration (F8 calcule la signature en ligne dans son plan actuel et peut reprendre cette fonction plus tard :
-- une seule formule, deux appelants, le même vecteur de test contre `ops/signe_interne.py`). « t=<secondes>,v1=<hex> » = HMAC-SHA256 de
-- « t.POST.chemin.sha256(corps) » (docs/exploitation.md). Aucun oracle générique : fermée à tous les rôles, appelée par `reveille_le_push`.
create function private.signe_un_appel_interne(p_chemin text, p_corps text) returns text
language sql stable security definer set search_path = '' as $$
  select 't=' || t || ',v1=' || encode(extensions.hmac(
           convert_to(t || '.POST.' || p_chemin || '.', 'utf8')
             || convert_to(encode(extensions.digest(convert_to(p_corps, 'utf8'), 'sha256'), 'hex'), 'utf8'),
           convert_to((select decrypted_secret from vault.decrypted_secrets where name = 'popote_internal_secret'), 'utf8'),
           'sha256'), 'hex')
    from (select extract(epoch from pg_catalog.now())::bigint as t) x;
$$;
revoke all on function private.signe_un_appel_interne(text, text) from public, anon, authenticated, service_role, popote_api, popote_internal;

-- Appelée chaque minute par pg_cron. Réveille le conteneur SEULEMENT s'il y a une ligne échue. Un secret absent n'est pas silencieux :
-- la ligne de `push_passe` le dit, et `etat_du_reveil_push()` en tire `secret_absent` (et non « cron vivant »).
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

  suivi de `public.etat_du_reveil_push()` (états ci-dessus, fondés sur `push_passe` et `net._http_response` ; `cron.job_run_details` seulement pour dire « job absent », gardé par `to_regclass`), des `revoke`/`grant`, de la planification tolérante
  `cron.schedule('push-reveil', '* * * * *', 'select private.reveille_le_push()')` posée seulement si `pg_cron` existe, d'un avertissement explicite sinon (comme 0126), et du nettoyage `delete from private.push_passe where appelee_le < now() - interval '30 days'` dans la fonction de purge de N3
  (étendre `private.purge_push_outbox` : migration M3, `create or replace` avec le corps de M2b recopié).
  `popote_internal_secret` est le nom que `docs/exploitation.md` donne ; `popote_internal_base_url` est **le nom que F8 pose pour l'adresse du conteneur** : **s'aligner sur F8 à la relecture** (écart à relayer). **N6 attend la fusion de F8 pour les NOMS du coffre et de l'adresse, pas pour du code.**
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
- [ ] **Étape 5 :** `npx supabase migration up` ; `npx vitest run tests/db/push-reveil.test.ts` verts ; `actionlint`. **Mutations** : appeler sans rien d'échu ; retirer l'anti-chevauchement ; retirer l'attente après un échec ; signer `''` au lieu de `{}` ; `cron_alive` fondé sur le seul job `pg_cron` (le cas « secret absent » casse) ; planifier chaque seconde ; `execute` du signataire à `popote_api`.
- [ ] **Étape 6 : un commit par tranche** (messages ci-dessus) ; une PR brouillon par tranche.

---

### N7 : Les réglages par monde et la notification d'essai — coupée en N7a (réglages, ≈ 150 lignes) et N7b (essai et bout en bout de l'API, ≈ 190 lignes)

**Tranches de cette tâche (une PR, un fichier de test et un commit chacune) :**
- **N7a** (après N1b et N2b) : `api/push_reglages.py`, `schemas/push.py`, `tests/unit/test_push_reglages.py`, `tests/authz/test_matrice.py`, `openapi.json` ; commit `feat(push): règle les notifications par monde`.
- **N7b** (après N3a, N5b, N7a) : la route d'essai dans `api/push_abonnements.py`, `infra/push_file.py` (`vide_apres_la_reponse`), `tests/integration/test_push_essai.py`, `tests/integration/test_push_de_bout_en_bout.py`, `tests/unit/test_posts_idempotents.py` ; commit `feat(push): envoie une notification d'essai`.

**Pourquoi :** périmètre (« Envoyer une notification d'essai ») ; D2, D8. **Dépend de :** N2, N3, N5.
**Fichiers :** `src/popote_api/api/push_reglages.py`, `api/push_abonnements.py` (la route d'essai), `schemas/push.py`, `infra/push_file.py` (`vide_apres_la_reponse`), `tests/unit/test_push_reglages.py`, `tests/integration/test_push_essai.py`, `tests/integration/test_push_de_bout_en_bout.py`, `tests/authz/test_matrice.py`, `tests/unit/test_posts_idempotents.py`, `openapi.json`, `docs/normes-api.md`.

- [ ] **Étape 1 : tests des réglages (N7a)** : `GET /me/push-settings` rend **un interrupteur par monde qui contient au moins un type réglable** (`world`, `enabled`), avec la valeur par défaut du monde quand rien n'est choisi, et le choix de la personne sinon ; **les types sans monde (`acces_banque`, `minuteur`, l'essai) n'y apparaissent pas** (test avec un registre injecté de trois types : deux dans `budget`, un sans monde) ; avec le seul type d'essai du registre livré, la liste est **vide** ; `PUT /me/push-settings/budget` : `200` ; `PUT` d'un monde inconnu ou sans type → `404` ; `PUT` deux fois la même valeur → même résultat ; **couper `budget` coupe tous ses types** (vérifié par la passe, N5) ; **la valeur d'une personne n'est jamais celle de l'autre** (matrice) ; `enabled` non booléen → `422`.
- [ ] **Étape 2 : tests de l'essai (N7b)** : `POST …/{id}/test-notifications` → `202 {state: "queued"}` ; **une ligne `test` pour cet abonné seulement** ; un autre abonné de la même personne n'en reçoit pas ; abonnement d'un autre → `404` ; **6e en une heure → `429 quota_notifications_essai` + `Retry-After` égal à `retry_after_s` ; supprimer l'abonnement puis en refaire un ne remet pas le compteur à zéro** ; `Idempotency-Key` rejouée → pas de seconde ligne ; clés VAPID absentes → `503 push_indisponible` ; sans clé d'idempotence → `400`.
- [ ] **Étape 3 : la route d'essai** : `BackgroundTasks.add_task(vide_la_file_apres_la_reponse)` (comme les mails de F1b : délai de 20 s, `envoie_sans_remonter`, **une erreur ne change jamais la réponse**) ; elle appelle `public.met_en_file_mon_essai_push(%s)` (rend `etat` et `retry_after_s`) ; `introuvable` → `404`, `quota` → `429` avec `Retry-After: <retry_after_s>`.
  **Le conteneur étant déjà éveillé par cette requête, l'envoi part tout de suite** ; `pg_cron` ne sert que si le processus meurt.
- [ ] **Étape 4 : le test de bout en bout de l'API** (`test_push_de_bout_en_bout.py`, base locale + faux service ; **c'est la preuve de l'essai côté serveur**) :
  Sam s'abonne (la clé publique `p256dh` et le secret `auth` viennent d'un navigateur simulé dont le test garde la clé privée) → `POST …/test-notifications` → le faux service reçoit **une** requête → `déchiffre` rend le message déclaratif : `web_push == 8030`, `title == "Popote"`, `body` égal au texte du registre, `navigate == <origine>/reglages/notifications` ; la ligne est `sent` ; **Léa**, d'un autre foyer, n'a rien reçu ; **la déconnexion de l'appareil de Sam (`DELETE /me/sessions/current`) supprime son abonnement** ; **`DELETE /me` supprime tout : abonnements, file, réglages, essais** (compte des quatre tables à zéro) ; **même si Auth est en panne** (`503 suppression_incomplete`) : abonnements, file, réglages et essais sont déjà vides ; l'adresse n'apparaît dans aucune réponse ni aucun `caplog` du scénario entier.
- [ ] **Étape 5 :** contrat régénéré, contrôles de fin, `tests/authz` (une ligne par route, trois acteurs). **Mutations** : le quota à 6 ; un `PUT` qui écrit pour une autre personne ; l'essai pour tous les abonnés ; rendre l'erreur d'envoi à la réponse ; ne pas supprimer les réglages avec le compte.
- [ ] **Étape 6 : un commit par tranche** (messages ci-dessus) ; une PR brouillon par tranche.

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
  0. **auto-épreuve d'abord** (N0 E4) : avant toute écriture sur le conteneur `api`, crée un conteneur jetable `popote-jetable-vapid`, y pose deux secrets factices, en `PATCH` un troisième, relit ; **un secret factice perdu → efface le jetable et s'arrête sans rien écrire sur l'essai** ; sinon efface le jetable et continue ; (`--epreuve` la joue seule) ;
  1. cible **`essai` seulement** (`SCW_DEFAULT_PROJECT_ID`, conteneur nommé `api`, région `fr-par`) ; la prod est un autre geste, au jour J (0.8), avec ses propres variables : le script **refuse** toute autre cible et **ne lit aucune variable de prod** ;
  2. lit le conteneur (`GET …/containers/v1beta1/regions/fr-par/containers/<id>`), garde `secret_environment_variables` (clés et `hashed_value`) et `environment_variables` avant ;
  3. **si `POPOTE_VAPID_PRIVATE_KEY` existe déjà** et que `--tourne` n'est pas donné : s'arrête avec « clés déjà posées ; `--tourne` invalide tous les abonnements » (aucune écriture) ;
  4. génère une paire (`Vapid02().generate_keys()`) : **privée** = 32 octets en base64url sans remplissage, **publique** = point non compressé de 65 octets en base64url sans remplissage ; **la privée ne touche ni le disque ni l'écran** ;
  5. `PATCH` (seulement après l'auto-épreuve du point 0) : `secret_environment_variables: [{key: "POPOTE_VAPID_PRIVATE_KEY", value: <privée>}]` et `environment_variables` = **les variables existantes + `POPOTE_VAPID_PUBLIC_KEY` + `POPOTE_VAPID_SUBJECT` (`mailto:bonjour@notre-popote.fr`)** (on envoie la carte complète : on ne suppose pas que `PATCH` fusionne) ;
  6. relit le conteneur : **aucun autre secret ni variable n'a bougé** (hachages comparés, comme `gestes-13-11.py`), sinon `stop` avec « préviens-moi tout de suite, l'essai en dépend » ;
  7. **redéploie** le conteneur (`POST …/containers/<id>/deploy`, la route de déploiement de l'API Scaleway Containers v1beta1 : **hypothèse H1, à vérifier dans la référence de l'API avant d'écrire cette ligne** ; si la route diffère, le script le dit et Kamil clique « Déployer » dans la console), attend `status == ready`, puis lit `GET https://<hôte de l'essai>/api/healthz` (public). Le script **ne teste pas le push** : l'API exige une session ; l'essai de bout en bout est N14 ;
  8. affiche **seulement** : les 8 premiers caractères de la clé publique, « clés posées, redéploiement terminé, les autres secrets sont intacts » ; **jamais** la privée ; `del privee` ;
  9. `--a-blanc` : ne fait que lire, dit les variables présentes, ce qui serait ajouté, et sort `0` sans écriture.
  Tests (`test_pose_les_cles_push.py`, sans réseau, `appel` simulé) : refus sans `--tourne` quand la clé existe ; carte d'`environment_variables` complète envoyée ; **la sortie standard et la sortie d'erreur d'une exécution simulée ne contiennent jamais la valeur de la privée** (la valeur générée est capturée par l'espion et cherchée dans toute la sortie) ; la paire écrite est cohérente (la publique dérivée de la privée égale la publique) ; `--a-blanc` n'écrit pas ; l'auto-épreuve avec un `PATCH` simulé qui **remplace** la collection arrête le script avant l'écriture (le conteneur `api` n'est jamais touché) ; **mutation** : afficher la privée casse le test ; envoyer seulement la nouvelle variable casse le test de la carte ; sauter l'auto-épreuve casse le test d'ordre.
- [ ] **Étape 3 : la fiche** (`docs/exploitation.md`) : poser (le script), contrôler (`GET /api/healthz` ; `GET /me/push-config` rend `enabled: true`), **tourner** (échéance : 12 mois ; `--tourne` ; tous les abonnements deviennent faux, le front se réabonne à l'ouverture, N11), si la clé est perdue ou exposée (tourner), lever un blocage (`update public.push_outbox set state = 'queued', attempts = 0, next_attempt_at = now(), deadline_at = now() + interval '5 minutes' where state = 'abandoned' and created_at > now() - interval '1 day'`), lire les retards (requête de contrôle : lignes échues depuis plus de 5 minutes), voir le job (`select * from cron.job where jobname = 'push-reveil'`), couper le push d'urgence : **`POPOTE_PUSH_ACTIF=false`** (variable non secrète du conteneur, puis redéploiement) : `enabled` faux, `push-config` le dit, la route interne rend `503 push_indisponible`, aucune notification ne part, **les clés et les abonnements restent intacts** ; les lignes vieillissent jusqu'à leur échéance ; rétablir avec `true`. (Retirer seulement une des deux clés empêcherait l'API de démarrer : ne pas le faire.)
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

**Nuance assumée (revue de ce plan) : le `skipWaiting` au démarrage contredit le mode `prompt` tant qu'il reste.** Ce n'est pas une décision de ce plan : c'est le « repli : `skipWaiting` une fois, retiré à F23+1 » que F22 a écrit (amendement 5 de la fondation) pour remplacer le service worker de F1. N9 le conserve tel quel, **le marque `// F23+1 : retirer`** et ne l'étend pas ; le risque (page ancienne, service worker nouveau, perte de saisie pendant cette fenêtre) est celui que F22 a déjà accepté. Le retirer plus tôt exige une preuve d'adoption de F1 : à décider par l'agent de F22.

---

### N10 : Le service worker reçoit, affiche, ouvre — ≈ 330 lignes

**Pourquoi :** exigence 4 ; D6, D7. **Dépend de :** N9. **Sources à relire :** MDN `ServiceWorkerGlobalScope` (`push`, `notificationclick`, `pushsubscriptionchange`), `PushEvent.data`, `Clients.openWindow`/`WindowClient.navigate` (compatibilité WebKit), `webkit.org/blog/16535`.
**Fichiers :** `src/sw/push.ts`, `src/sw/push.test.ts`, `src/sw/sw.ts` (une ligne : `installePush(self)`), `src/sw/api-push.ts` (le **seul** `fetch` du service worker, exception **écrite**), `src/architecture.test.ts` (liste blanche de `src/sw/api-push.ts` dans la garde « aucun `fetch` hors de `src/api/` », F5b), `docs/front.md`.

- [ ] **Étape 1 : tests** (`src/sw/push.test.ts`, Vitest, environnement `node`, **fausse portée de service worker** : un objet qui enregistre `addEventListener`, `registration.showNotification`, `clients.matchAll/openWindow`, `location.origin = 'https://exemple.test'` ; les événements sont des objets avec `waitUntil` qui collecte) :
  1. **`push` avec le message déclaratif valide** → `showNotification('Popote', { body, lang: 'fr', dir: 'ltr', silent: false, icon, data: { navigate: '/reglages/notifications' } })` ; `waitUntil` reçoit la promesse ;
  2. **`push` sans données, JSON invalide, `web_push` ≠ 8030, `title` vide ou de plus de 100 caractères, `body` de plus de 200 caractères, `lang` mal formé, `dir` hors `auto`/`ltr`/`rtl`, `navigate` d'une **autre origine**, `navigate` en `javascript:`, `//evil.test/x`, `navigate` absent** → **le repli COMPLET est affiché** (titre « Popote », texte « Popote a quelque chose à te montrer. », page `/`, jamais un mélange du message reçu et du repli) : **jamais de push silencieux** (WebKit révoque l'abonnement) ;
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

/** Chemin relatif de la même origine, ou `null` : `navigate` ne sort jamais de l'appli (redirection ouverte). */
export function cheminSur(navigate: unknown, origine: string): string | null {
  if (typeof navigate !== 'string' || navigate.length > 512 || navigate.startsWith('//') || navigate.includes('\\')) return null
  try {
    const url = new URL(navigate, origine)
    return url.origin === origine ? `${url.pathname}${url.search}` : null
  } catch {
    return null
  }
}

function fabrique(title: string, body: string, navigate: string, origine: string, lang: string, dir: string): Affichage {
  return {
    title,
    options: {
      body, lang, dir: dir as NotificationDirection, silent: false, // jamais silencieux : WebKit révoque l'abonnement
      icon: '/icone-192.png', data: { navigate: cheminSur(navigate, origine) ?? '/' },
    },
  }
}

export function lisLaNotification(donnees: unknown, origine: string): Affichage {
  const repli = fabrique(REPLI.title, REPLI.body, REPLI.navigate, origine, 'fr', 'ltr')
  if (typeof donnees !== 'object' || donnees === null) return repli
  const message = donnees as { web_push?: unknown; notification?: unknown }
  const n = message.notification
  if (message.web_push !== MAGIE_DECLARATIVE || typeof n !== 'object' || n === null) return repli
  const { title, body, navigate, lang, dir } = n as Record<string, unknown>
  // Parseur FERMÉ : tout champ invalide rend le repli COMPLET (jamais un mélange), comme le veut WebKit pour `title` et `navigate`.
  if (typeof title !== 'string' || title.length === 0 || title.length > 100) return repli
  if (typeof navigate !== 'string' || cheminSur(navigate, origine) === null) return repli
  if (body !== undefined && (typeof body !== 'string' || body.length > 200)) return repli
  if (lang !== undefined && (typeof lang !== 'string' || !/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(lang) || lang.length > 35)) return repli
  if (dir !== undefined && dir !== 'auto' && dir !== 'ltr' && dir !== 'rtl') return repli
  return fabrique(title, body ?? '', navigate, origine, lang ?? 'fr', dir ?? 'ltr')
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
    const chemin = cheminSur((evenement.notification.data as { navigate?: unknown } | null)?.navigate, portee.location.origin) ?? '/'
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
- [ ] **Étape 3 :** `sw.ts` appelle `installePush(self)` ; `npm run lint && npx tsc -b && npm test && npm run build` ; **`verifie-build` exige maintenant les trois écouteurs dans `sw.js`**. **Mutations** : `silent: true` laissé passer ; ne pas vérifier l'origine de `navigate` ; ne rien afficher quand le message est invalide (le cas 2 casse) ; ouvrir une fenêtre sans fermer la notification ; `pushsubscriptionchange` qui lève.
- [ ] **Étape 4 : commit** `feat(front): le service worker affiche les notifications et ouvre la bonne page` ; PR brouillon.

---

### N11 : La couche push du front (hooks, état, gestes) — ≈ 360 lignes

**Tranches de cette tâche (une PR, un fichier de test et un commit chacune) :**
- **N11a** : `src/push/plateforme.ts`, `etat.ts`, `abonnement.ts` et leurs tests ; commit `feat(front): l'état et les gestes des notifications push`.
- **N11b** : `src/api/ressources/push.ts`, `src/push/reconcilie.ts` et leurs tests ; commit `feat(front): les hooks push et la réconciliation à l'ouverture`.

**Pourquoi :** exigence 4 (état, demander après un geste, iPhone hors écran d'accueil) ; D7, D10. **Dépend de :** N10, et du contrat de N2 et N7 (synchronisé par F4).
**Fichiers :** `src/api/ressources/push.ts` (hooks par ressource : F5b), `src/push/etat.ts`, `src/push/abonnement.ts`, `src/push/plateforme.ts`, `src/push/reconcilie.ts`, tests voisins `*.test.ts(x)`, `src/textes/notifications.ts` (N12).

- [ ] **Étape 1 : `plateforme.ts` et `etat.ts`** : fonctions **pures**, testées par table :
  - `plateforme({ ua, platform, maxTouchPoints, standalone, displayModeStandalone, aServiceWorker, aPushManager, aNotification })` → `{ ios: boolean, installee: boolean, supporte: boolean }` (iPadOS 13+ se présente comme un Mac : `platform === 'MacIntel' && maxTouchPoints > 1` vaut iOS) ;
  - `etatDesNotifications({ plateforme, permission, config, abonnementDuNavigateur, abonnementsDuServeur, session })` → l'union : `non-supporte` · **`a-installer`** (iOS hors écran d'accueil : **on ne demande rien**) · `indisponible` (`config.enabled` faux) · `a-demander` (`permission === 'default'`) · `refuse` (`'denied'` : texte différent iOS et autres) · `actif-ici` (accord, abonnement du navigateur **et** ligne du serveur correspondante `current`) · `a-reparer` (accord mais abonnement du navigateur absent, ou aucun `current` côté serveur, ou clé publique du serveur ≠ celle de l'abonnement ; l'écart d'endpoint est corrigé en silence par la réconciliation, pas montré) ;
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
- [ ] **Étape 4 : `reconcilie.ts`** (« se réconcilier à chaque ouverture », appelé une fois par la coque connectée). **Une session n'a qu'un abonnement** (`unique (session_id)`, N1) : `current` dit donc sans ambiguïté si CET appareil est connu. Si la permission est accordée et que l'abonnement du navigateur existe : **à chaque ouverture de l'appli (une fois par chargement, drapeau en mémoire), le front réenregistre l'abonnement COURANT** (`POST` avec une `Idempotency-Key` neuve : l'enregistrement est idempotent côté serveur, même triplet = mêmes lignes, aucun effet) ; si `config.vapid_public_key` a changé, il se réabonne d'abord. Un navigateur qui a tourné son adresse sans le dire est donc corrigé **dès l'ouverture**, sans attendre un 404/410 ; l'auto-guérison à l'envoi (404/410 supprime la ligne) reste le second filet. Test : `current === true`, même clé VAPID, **endpoint différent** → le `POST` part avec le nouvel endpoint ; coût : une écriture par chargement, sous la limite de 30 par minute ; **jamais de demande de permission ici** (aucun geste) ; échec silencieux sauf `console.error` d'une référence. **Le `POST` part À CHAQUE chargement autorisé** (permission accordée et abonnement du navigateur présent), que le serveur connaisse l'appareil ou non : l'endpoint du serveur n'est pas observable, donc **aucun cas « tout concorde, pas d'appel » n'existe** ; le serveur est idempotent. Tests : serveur sans l'appareil → `POST` ; serveur avec `current` et même endpoint → **`POST` quand même** ; `current` avec un endpoint différent → `POST` avec le nouvel endpoint ; clé tournée → `unsubscribe` + `subscribe` + `POST` ; permission `default` ou `denied` → **aucun `POST`** et aucune demande ; un seul `POST` par chargement même si la coque se rend deux fois.
- [ ] **Étape 5 :** **la déconnexion** : exposer `desabonneCetAppareil()` ; **à relayer au plan d'« Entrer »** : la déconnexion d'un appareil l'appelle **avant** `DELETE /me/sessions/current` (le serveur supprime de toute façon la ligne, D4 ; ceci libère l'abonnement du navigateur). Hors de ce plan : je ne modifie pas le parcours.
- [ ] **Étape 6 :** `npm run lint && npx tsc -b && npm test && npm run build` verts. **Mutations** : demander la permission après un autre `await` (le test d'ordre casse) ; classer l'iPhone hors écran d'accueil en `a-demander` ; ne pas comparer la clé ; réconcilier en demandant la permission ; ne pas réenregistrer quand `current` est vrai (le cas « endpoint différent » et le cas « même endpoint, `POST` quand même » cassent). **Un commit par tranche** (messages ci-dessus) ; une PR brouillon par tranche.

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
  libellesDesMondes: { budget: 'Budget', fridge: 'Frigo', week: 'Semaine', household: 'Foyer' },
} as const
```

- [ ] **Étape 2 : tests de l'écran** (Testing Library, par rôle et nom, `userEvent.setup()`, `verifieAxe`, MSW pour l'API) : un test **par état** de N11, avec ce que la personne voit **et ne voit pas** :
  `a-installer` → le titre, les trois étapes en liste ordonnée, **aucun bouton « Activer »**, `Notification.requestPermission` **jamais appelé** ; `a-demander` → bouton « Activer sur cet appareil » : le clic appelle la permission **puis** enregistre (MSW reçoit un `POST` avec `Idempotency-Key` entre guillemets et `X-Popote-Client: web`) ; `refuse` (iOS et autre : deux phrases) → aucune demande, aucun bouton ; `actif-ici` → « Envoyer une notification d'essai » et « Désactiver » ; le clic sur l'essai envoie `POST …/test-notifications` et dit `essaiEnvoyee` dans une région `role="status"` **présente dès le premier rendu** ; `429` → `essaiLimite` (`role="alert"` : l'erreur) ; `409 trop_d_abonnements_push` à l'activation → `tropAppareils` ; `503` (`indisponible` côté config) → `indisponible` ; `a-reparer` → « Réactiver ».
  **Clavier** : `user.tab()` atteint chaque bouton dans l'ordre visuel ; focus visible ; **pas de focus perdu** après l'activation (le focus reste sur le bouton ou passe au suivant logique) ; cibles d'au moins 44 × 44 (le banc, Chromium).
- [ ] **Étape 3 : le composant** : `EcranNotifications` lit `usePushConfig`, `usePushAbonnements`, `Notification.permission` et `navigator.serviceWorker` (via `plateforme.ts`), calcule l'état (N11), et rend **un bloc** du système « Jeu » (Bloc, Bouton, ligne d'effet, marmite en état neutre ; le choix précis revient à la session design). Les gestes : `onClick={() => { void active(cle).then(enregistre).catch(…) }}` **sans aucun `await` avant** `active`. **Les interrupteurs par monde** (`usePushReglages` : Budget, Frigo, Semaine, Foyer ; un `role="switch"` par monde, libellé du catalogue `libellesDesMondes`, `Record<PushWorld, string>` : un monde sans libellé ne compile pas) s'affichent sous le bloc **si la liste n'est pas vide** ; sinon `rienARegler` (aujourd'hui aucun type réglable n'est livré : la liste est vide). **L'écran définitif de ces interrupteurs appartient au monde « Foyer et réglages », pas encore dessiné** : celui-ci n'en pose que la brique.
  **`document.title` : « Notifications — Popote »** ; frontière d'erreur de la route ; la section du banc a un cas par état (légendes sans donnée personnelle ; Sam et Léa).
- [ ] **Étape 4 :** `npm run lint`, `npx tsc -b`, `npm test`, `npm run build` ; le banc (axe, captures **regardées**) ; **liste de preuves manuelles à remplir dans la PR** (clavier seul, lecteur d'écran : « non prouvé » admis s'il est écrit). **Mutations** : afficher « Activer » sur l'iPhone non installé ; `requestPermission` après un `await` ; message de refus identique iOS et autres ; essai sans région `status`. **Commit** `feat(front): l'écran des notifications avec l'essai` ; PR brouillon.

---

### N13 : L'essai de bout en bout avec un faux service de push — ≈ 330 lignes

**Pourquoi :** exigence 5 (« un faux service push local pour l'e2e (autorisé seulement en test) »). **Dépend de :** N7, N12, et du harnais d'e2e contre l'API locale de la fondation (relais local `wrangler dev`, API réelle pour les parcours) : s'il n'existe pas encore, **cette tâche attend** (la preuve côté serveur est déjà dans N7).
**Fichiers :** `e2e/push.spec.ts`, `e2e/aides/faux-service-push.mjs`, `e2e/aides/chiffrement.mjs` + `e2e/aides/chiffrement.test.mjs`, `e2e/aides/abonne-factice.ts`, `package.json` (script).

- [ ] **Étape 1 : `chiffrement.mjs`** : déchiffrement RFC 8291 / RFC 8188 (`aes128gcm`) avec `node:crypto` (ECDH P-256, HKDF-SHA256, AES-128-GCM), une seule fonction `dechiffre(corps, clePriveeDeLAgent, secretAuth) → Buffer`. **Test du vecteur de l'annexe A de la RFC 8291** (valeurs recopiées de la RFC) : le déchiffrement du corps de la RFC rend « When I grow up, I want to be a watermelon » ; **et** un aller-retour avec un corps produit par `http_ece` (octets figés dans le test, produits une fois par la commande donnée dans le test) : les deux mondes (Python qui chiffre, Node qui déchiffre) s'entendent. **Mutation** : un octet changé dans le corps → échec d'authentification.
- [ ] **Étape 2 : `faux-service-push.mjs`** : serveur `node:http` sur `127.0.0.1:0` ; garde les requêtes reçues ; répond `201` (ou un statut réglable par l'appel de test) ; sert `GET /_recus` au test (en local seulement : jamais exposé ailleurs) ; **l'API est lancée avec `POPOTE_PUSH_HOTES_DE_TEST=127.0.0.1:<port>` et des clés VAPID jetables du test** (générées par le test, jamais écrites sur disque hors du dossier temporaire du test).
- [ ] **Étape 3 : `abonne-factice.ts` et le scénario** (`push.spec.ts`, Chromium, relais local, **un seul `addInitScript`**) : le test remplace `PushManager.prototype.subscribe` / `getSubscription` par un abonnement **factice** dont l'`endpoint` est `http://127.0.0.1:<port>/push/abc`, avec une vraie paire de clés P-256 et un secret `auth` produits par le test (la clé privée reste dans le test). Sam (session de banc) ouvre `/reglages/notifications` :
  1. l'écran montre « Activer sur cet appareil » ; le clic accorde la permission (`context.grantPermissions(['notifications'])` : **si E2 a montré que cela échoue sur ce Chromium, le même `addInitScript` unique simule aussi le getter `Notification.permission` ET `Notification.requestPermission` (qui rend `'granted'`), avec une assertion sur l'ORDRE des appels : `requestPermission` est le premier appel asynchrone de `active`**, et le test le dit en commentaire) ; l'API enregistre l'abonnement ;
  2. « Envoyer une notification d'essai » → `202` ; le faux service **reçoit une requête** ; `dechiffre` rend le message déclaratif ; ses `navigate`, `title`, `body` sont ceux du registre ;
  3. **livrer ce message au service worker** par CDP : `ServiceWorker.enable`, relever le `registrationId` (événement `workerRegistrationUpdated`), `ServiceWorker.deliverPushMessage({ origin, registrationId, data })` avec le texte déchiffré ; puis `registration.getNotifications()` rend **une** notification de titre « Popote » ;
  4. **le clic n'est PAS joué ici** : le protocole CDP n'a pas de commande pour déclencher `notificationclick` (`ServiceWorker.deliverPushMessage` existe, pas d'équivalent pour le clic) ; le gestionnaire de clic est prouvé par le harnais du service worker (N10, cas 3) et **le vrai clic natif par N14** ;
  5. **déconnexion** : « Désactiver sur cet appareil » puis `DELETE /me/sessions/current` : `GET /me/push-subscriptions` d'une autre session de Sam rend la liste **sans** cet appareil ;
  6. **la réponse de chaque appel de l'API de ce scénario ne contient ni l'adresse ni les clés** (le test lit chaque réponse) ;
  6b. **l'écran visé après la connexion** : sans session (cookie retiré), ouvrir l'adresse que porte `navigate` (ce que fait un toucher de notification) → la coque mène à `/entrer?retour=<chemin>` ; **après la connexion de banc, la personne arrive sur ce chemin** (le clic natif n'est pas joué ici, la navigation qu'il provoque l'est) ; un `navigate` hors de l'origine n'est jamais suivi ;
  7. **cas négatif** : le faux service répond `410` ; la notification suivante est abandonnée et **l'écran passe à `a-reparer` à la réouverture** (l'abonnement du serveur a disparu) ; un clic « Réactiver » recrée l'abonnement.
- [ ] **Étape 4 :** `npm run lint && npx tsc -b && npm test && npm run build`, puis `npx playwright test e2e/push.spec.ts` → vert avec le relais local et l'API locale (le test de `chiffrement.mjs` tourne dans le projet `scripts`). **Mutations** : le faux service n'est pas filtré par la liste blanche en test (l'API refuse sans `POPOTE_PUSH_HOTES_DE_TEST` : le test négatif « sans la variable, `422` » casse si on l'oublie) ; ne pas déclencher le service worker (le cas 3 échoue). **Commit** `test(front): essai de bout en bout des notifications avec un faux service de push` ; PR brouillon.

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
- [ ] **Étape 4 : clôture** : `docs/ETAT.md` (court) ; `docs/exploitation.md` à jour ; **les écarts à relayer** (ci-dessous) envoyés à leurs destinataires ; la ligne « à revoir avant d'ouvrir Popote à d'autres foyers » reportée dans `docs/securite.md` ; mutations rejouées ; revue adverse de l'ensemble. **Commit** `docs(push): clôt le chantier des notifications push` ; PR brouillon.

---

## Recette : ajouter une vraie notification (une tâche courte, sans toucher à l'infrastructure)

Quatre fichiers au plus, une PR de moins de 150 lignes. Exemple (inventé) : « Le frigo a quelque chose qui périme demain » (monde Frigo).

1. **Le type** : `src/popote_api/push/types.py` : une valeur de `TypeDePush` (`FRIGO_PEREMPTION = "fridge_expiry"`) et une `DefinitionDePush` : texte **général** sans chiffre ni nom, `chemin="/frigo"` (l'écran visé), `ttl_s`, `urgence`, **`monde=Monde.FRIGO`** (ou `None` : aucun interrupteur, comme `acces_banque` et le minuteur), **`heures_calmes=True`** (faux pour le minuteur seul), **`une_par_jour`** (vrai pour « rappeler l'autre »). `test_push_types.py` la vérifie **sans qu'on écrive un test de plus** (la table est paramétrée sur tout le registre).
2. **Le déclencheur** : ce qui décide d'envoyer, **dans la transaction de l'effet**. Trois voies, selon le rôle SQL sous lequel l'effet s'exécute : (a) un effet **de personne** (`base.personne`, rôle `authenticated`, par exemple « rappeler l'autre ») s'écrit **en SQL** : une fonction `security definer` qui appelle `private.met_en_file_push('fridge_expiry', <personne>, <clé>, <instant>, <ttl_s>)`, avec **`private.cle_du_jour()` pour un type `une_par_jour`** et `private.push_deja_du_jour(personne, type)` pour répondre « c'est déjà fait aujourd'hui » ; (b) un effet **sous `popote_api`** (route interne, passe quotidienne) appelle **`public.met_en_file_une_notification(...)`** dans la même transaction ; (c) une passe SQL planifiée appelle `private.met_en_file_push`. **Les littéraux SQL (`ttl_s`, clé du jour) doivent égaler ceux du registre : un test d'intégration de CE type le prouve** (la base ne lit pas le registre). Une migration seulement pour (a) et (c).
3. **Le réglage** : rien à écrire : si `monde` est posé, l'interrupteur du monde existe déjà (`GET /me/push-settings`) et la passe d'envoi coupe le type quand le monde l'est (test déjà écrit en N5). **Les heures calmes et la limite d'une par jour sont portées par les deux drapeaux du type** (la passe diffère à 8 h ; la clé du jour fait le reste).
4. **Le libellé côté front** : seulement si c'est un **nouveau monde** : `src/textes/notifications.ts` (`libellesDesMondes`, `Record<PushWorld, string>` : une entrée manquante est une erreur de compilation). **L'écran visé** (`chemin`) existe dans l'appli ; **si la session est fermée, le toucher passe par l'empreinte puis arrive sur ce chemin** (`?retour=`, prouvé en N13).

Rien d'autre : ni file, ni route, ni service worker, ni script. S'il faut un contenu précis à l'écran, c'est l'écran d'arrivée qui le lit dans l'appli (jamais la notification).

## Ce que demande la liste de la session design (13/11, 20 h 30), et où le plan le porte

Les **7 notifications du Budget** (`budget_a_confirmer`, `virement_a_faire`, `virement_en_retard`, `rappel_de_l_autre`, `operations_a_ranger`, `acces_banque`, `point_du_mois`) sont fermes mais **appartiennent au plan d'API du Budget (B13)** : ce plan ne les écrit pas, il livre l'interface qu'elles utiliseront. Les autres (Frigo : `a_sortir`, `a_jeter` ; Semaine : `semaine_vide` ; Cuisiner : `minuteur` ; Foyer : `membre_arrive`) sont **provisoires** : le mécanisme est prévu, pas leurs textes ; Kamil doit voir les prototypes avant.

| Exigence de la liste | Où elle est portée | Reste à faire par B13 ou le monde concerné |
|---|---|---|
| Un interrupteur **par monde et par personne** (Budget, Frigo, Semaine, Foyer), allumé par défaut | `Monde`, `MONDE_ACTIF_PAR_DEFAUT` (N4a) ; `push_setting(person_id, world)` (M1b) ; `GET`/`PUT /me/push-settings/{world}` (N7a) ; la passe coupe un monde éteint (N5a) ; interrupteurs de l'écran (N12) | poser `monde=` sur chaque type |
| Des types **sans interrupteur** (`acces_banque`, `minuteur`) | `monde=None` : toujours envoyés, jamais listés (N4a, N5a, N7a) | `monde=None` sur ces deux types |
| **Heures calmes de 22 h à 8 h** par défaut ; une notification due la nuit part à 8 h, **sauf le minuteur** | `push/calme.py` (N4a) ; `heures_calmes` du type ; `differe_le_push` (N3b) ; la passe diffère (N5a) ; heures de Paris, changements d'heure testés | `heures_calmes=False` sur le minuteur seul. **Les heures calmes réglables par personne ne sont pas dans ce plan** (la liste ne donne que le défaut) : une table `push_calme(person_id, debut, fin)` lue par `reprise_apres_les_heures_calmes` s'y ajoutera à la demande du monde « Foyer et réglages » |
| **L'écran visé s'ouvre après l'empreinte** si la session est fermée | `navigate` = origine + `chemin` du registre ; le service worker ouvre ce chemin (N10) ; la coque protégée mène à `/entrer?retour=<chemin>` (fondation F5b) et y revient après la connexion ; prouvé en N13 (6b) | des `chemin` qui existent ; vérifier que le parcours « Entrer » honore `?retour=` après le code et après l'empreinte (écart à relayer) |
| **Une notification par jour au plus** pour certains types (`rappel_de_l_autre`) | `une_par_jour` du type ; `private.cle_du_jour()` (jour de Paris) et `private.push_deja_du_jour` (N3a) | passer la clé du jour et répondre « déjà fait aujourd'hui » |
| Rien d'intime sur l'écran verrouillé ; **variante sans prénom** par défaut | texte constant sans paramètre (N4a) ; la variante avec prénom est la question 1 | — |
| « Pas de rappel “tu as mangé quoi ?” » | **aucun type** : rien à écrire | à redemander à Kamil avec les réglages |
| Les alertes de sécurité d'« Entrer » restent des **mails** | hors push (F1b) | — |

**Interface pour B13** (stable après N4a, N3a et N5a) : `DefinitionDePush(type, texte, chemin, ttl_s, urgence, monde, heures_calmes, une_par_jour)` ; mise en file en SQL `private.met_en_file_push(kind, person, dedupe_key, send_at, ttl_s, subscription)` (effet de personne) ou `public.met_en_file_une_notification(...)` (effet sous `popote_api`) ; `private.cle_du_jour()` ; planifier « le 1er à 9 h » ou « le 6 à 9 h » = **l'instant `send_at`** passé à la mise en file par la tâche planifiée du Budget (la file n'a pas d'horloge propre : `send_at` est la seule heure d'envoi).

## Gestes de Kamil (aucun avant que les PR concernées soient fusionnées)

1. **Poser les clés VAPID de l'essai** : `bash ~/PERSO/popote-api/ops/pose-les-cles-push.sh --a-blanc`, puis sans option. Une minute ; aucune clé secrète ne s'affiche (N8).
2. **Poser le secret et l'adresse du coffre `vault` de l'essai** pour que `pg_cron` appelle le conteneur : **les mêmes que ceux de F8** (`popote_internal_secret`, `popote_internal_base_url`) ; **s'ils sont déjà posés pour F8, rien à faire**. Sinon, le geste de F8 (regroupé avec 0.7).
3. **Créer le secret d'environnement `ESSAI_API_INTERNE_URL`** du dépôt `popote-api` (adresse directe du conteneur de l'essai), **déjà demandé par F8** : même remarque.
4. **Le geste iPhone** de N14, guidé écran par écran (la version d'iOS lui est demandée à ce moment-là).
5. **Au jour J (0.8)** : refaire 1 à 3 pour la prod avec ses propres variables ; **pas avant**.

## Écarts à relayer

| À qui | Quoi |
|---|---|
| **Session design** | (a) la liste des vraies notifications, leur texte général, leur heure, leur réglage ; (b) l'écran « Notifications » de N12 est **provisoire** (phrases proposées, route provisoire `/reglages/notifications`) ; (c) **heures calmes** : pas dans ce plan ; si voulues, une colonne de `push_setting` ; (d) la déconnexion d'un appareil appelle `desabonneCetAppareil()` (plan d'« Entrer ») ; (e) l'état `a-installer` sur iPhone et ses trois étapes doivent être dessinés ; (f) si le repli de N6 s'applique, « à 15 minutes près » |
| **Agent de F8** | les noms `popote_internal_base_url` et `ESSAI_API_INTERNE_URL` ; **N6 crée `private.signe_un_appel_interne`** (fermée à tous les rôles, test de droits, même vecteur que `ops/signe_interne.py`) : F8 peut la reprendre au lieu de calculer en ligne, rien ne l'y oblige ; la preuve E1 commune |
| **Agent de F22** | l'amendement N9 en entier (réécriture du garde `verifie-sw-remplacant.mjs`) ; la coupe F22a/F22b |
| **Agent de F5b** | la liste blanche de `src/sw/api-push.ts` dans la garde « aucun `fetch` hors de `src/api/` » |
| **Agent de 0.4bis (A6)** | **amendement d'une ligne, sans dépendance d'ordre** : `private.efface_le_compte(p_person, p_existait)` appelle `private.efface_les_donnees_push(p_person)` **seulement si la fonction existe** (`if to_regprocedure('private.efface_les_donnees_push(uuid)') is not null then perform …`) ; M1 puis M2a créent et étendent ce crochet (réglages, essais) : un effacement entre deux migrations ne casse jamais ; test d'une panne d'Auth |
| **Agent de 0.4ter (F1b)** | rien n'est modifié : `push_outbox` est une table sœur ; **la liste fermée de `base.connexion()`** gagne `infra/push_file.py` |
| **Propriétaire** | rien à faire : `py-vapid` (MPL-2.0, non modifié) est admis ; la ligne « à revoir avant d'ouvrir Popote à d'autres foyers » (voir « Données personnelles ») |

## Questions (deux au plus)

1. **Propriétaire (Kamil), à poser avec les prototypes** : sur l'écran verrouillé, veux-tu le **prénom de l'autre** (« Léa a posé le budget… ») ? **Par défaut non** : la variante sans prénom, qui est celle que ce plan livre (le texte d'un type est une constante sans paramètre). Si oui, il faut une colonne bornée pour le prénom dans `push_outbox`, effacée avec la ligne, et un test « le prénom ne sort jamais du texte du type » : une tâche courte, à ajouter à ce moment-là.
2. **Session design** : le minuteur, **quand l'appli est à l'écran** : WebKit exige qu'une notification soit toujours montrée (pas de push silencieux), donc sur iPhone la notification s'affichera même appli ouverte ; la session de cuisine peut la masquer visuellement (message au service worker) mais pas la supprimer. Acceptable ? (La version d'iOS de Kamil est demandée au geste de N14, pas avant.)

## Sources (vérifiées en ligne ou par essai le 13/11/2026)

1. **WebKit, « Meet Declarative Web Push »** https://webkit.org/blog/16535/meet-declarative-web-push/ (forme du message, `web_push: 8030`, repli, pas de push silencieux) ; **explainer** https://github.com/WebKit/explainers/tree/main/DeclarativeWebPush (autre forme, non livrée : C2) ; **« Web Push for Web Apps on iOS and iPadOS »** https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ (écran d'accueil, geste, `*.push.apple.com`).
2. **RFC 8030** (Generic Event Delivery Using HTTP Push) https://www.rfc-editor.org/rfc/rfc8030.html ; **RFC 8291** (chiffrement du message, annexe A : vecteur) https://www.rfc-editor.org/rfc/rfc8291.html ; **RFC 8292** (VAPID) https://www.rfc-editor.org/rfc/rfc8292.html ; **RFC 8188** (`aes128gcm`) https://www.rfc-editor.org/rfc/rfc8188.html. *(RFC 8291, 8292, 8188 : citées pour leur objet ; le vecteur de test est à **recopier de la page** au moment du code.)*
3. **PyPI** `http-ece` 1.2.1 (08/08/2024), `py-vapid` 1.9.6 (14/10/2026), `pywebpush` 2.5.0 (30/08/2026), `cryptography` 50.0.2, `httpx` 0.28.1 ; **essai** : aller-retour `http_ece` et signature `py_vapid` dans un environnement jetable ; lecture de `pywebpush/__init__.py`.
4. **npm** `vite-plugin-pwa` 2.0.0 (03/10/2026), `workbox-build`, `workbox-window`, `workbox-precaching`, `workbox-routing`, `workbox-core` 7.4.1 (04/05/2026) ; **vite-plugin-pwa, `injectManifest`** https://vite-pwa-org.netlify.app/guide/inject-manifest.html (config, `SKIP_WAITING`, `WebWorker` dans `lib`).
5. **Scaleway** : dépôt `scaleway/docs-content`, `pages/serverless-containers/how-to/add-trigger-to-a-container.mdx`, `concepts.mdx` (déclencheur CRON), `reference-content/containers-autoscaling.mdx` (arrêt après 15 minutes) ; les pages `scaleway.com/docs` répondent `403` à un robot : la source est le dépôt de la documentation.
6. **GitHub Actions** « Events that trigger workflows » https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows (`schedule`) ; **Supabase Cron** https://supabase.com/docs/guides/cron.
7. **Plans voisins** : `2026-11-13-socle-0-4ter-le-foyer.md` (F1b, F8), `2026-11-13-socle-0-4bis-connexion-sans-mot-de-passe.md` (sessions), `2026-11-13-fondation-du-front.md` (D5, F22) ; **popote-api** `AGENTS.md`, `docs/normes-api.md`, `docs/securite.md`, `docs/exploitation.md`, `.github/workflows/`, migrations 0126 et 0140 ; script modèle `gestes-13-11.sh` (et son `.py`).
8. **Essais locaux** : Chromium sans interface, permission des notifications (C15) ; hôtes des services (liste communautaire « known-push-services », C5 : à confirmer par N0 E3).
