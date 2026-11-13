# Parcours « Entrer dans Popote » : la spec

Premier parcours de la nouvelle appli. Il couvre tout ce qui touche au compte et au foyer : entrer, inviter,
rejoindre, gérer ses appareils, partir, retirer quelqu'un, supprimer son compte.

- **Style :** le système « Jeu » (`.design/systeme/`). Aucun composant hors de ce système.
- **Prototype de référence :** `.design/entrer/prototype.html` (film et moments rejouables) et ses captures dans
  `.design/entrer/captures/`. En cas de doute sur un écran, le prototype fait foi pour le dessin et le mouvement,
  cette spec fait foi pour les textes, les états et les données.
- **Côté API :** le socle 0.4bis (`docs/superpowers/plans/2026-11-13-socle-0-4bis-connexion-sans-mot-de-passe.md`).
  Cette spec n'en change aucune valeur de sécurité. Elle demande les ajouts du § 9, planifiés dans le plan du socle.
- **Prénoms :** « Sam » a créé le foyer et en est le responsable, « Léa » est la personne invitée. Ce sont des exemples.

## 1. Décisions du propriétaire (13/11/2026)

| Sujet | Décision |
|---|---|
| Entrer | Un code à 6 chiffres reçu par mail, puis l'empreinte ou le visage (clé d'accès) sur l'appareil. Aucun mot de passe. |
| Inviter | L'hôte tape un prénom et un e-mail, Popote envoie le mail. Suivi : lancée, ouverte, arrivée. Renvoyer, copier le lien, annuler. |
| Rejoindre | Par le lien du mail : un seul geste, rien à taper sauf corriger son prénom. |
| Retirer quelqu'un | Réservé au responsable du foyer : la personne qui l'a créé, tant qu'elle y est ; le rôle passe à l'autre si elle part. L'autre peut seulement partir d'elle-même. |
| Quitter le foyer | Le compte est gardé 30 jours (télécharger ses données, rejoindre un foyer par une nouvelle invitation), puis effacé. |
| Supprimer son compte | Immédiat. Si le responsable part et qu'il reste quelqu'un, cette personne garde le foyer et en devient responsable. |
| Mails | Expéditeur `bonjour@notre-popote.fr`. Les réponses sont renvoyées vers la boîte du propriétaire. |
| Réveil | Quand la réponse tarde après un temps sans visite, l'écran montre la marmite qui dort puis se réveille. C'est un comportement de l'écran, pas un délai promis par le serveur. |

## 2. Hors périmètre

L'accueil « Aujourd'hui » (parcours suivant ; ici seul son point d'arrivée existe), les objectifs de nutrition, les
réglages de rappels, le renommage du foyer, le changement d'e-mail (affiché, désactivé, avec « Bientôt »), le mode
vocal. Pas de mode hors ligne : sans réseau, l'écran d'erreur réseau du § 6 s'affiche.

## 3. Carte du parcours

```
/entrer ──(empreinte proposée)── empreinte ─────────────────────────┐
   │ e-mail                                                          ▼
   ▼                                                        réveil (si besoin) ──▶ /  (Aujourd'hui)
/entrer/code ──▶ /entrer/cle (proposée une fois) ───────────────────┘
/foyer ──▶ feuille « Qui cuisine avec toi ? » ──▶ suivi de l'invitation
mail d'invitation ──▶ /invitation#jeton ──▶ /entrer/cle ──▶ /bienvenue ──▶ /
/compte ──▶ /compte/partir ──▶ quitter (30 jours) ou /compte/supprimer ──▶ /adieu
/foyer ──▶ /foyer/retirer/:id                    personne sans foyer ──▶ /sans-foyer
```

Une personne sans session qui ouvre une adresse protégée arrive sur `/entrer`, puis revient à l'adresse demandée.

## 4. Les écrans

Chaque écran suit l'entrée d'écran du système (il monte, ses éléments rebondissent en place). « Marmite » donne
l'état de la mascotte à l'arrivée.

### 4.1 `/entrer` : la porte

- **Décor :** soleil jaune, sol, marmite au repos (190 px). Titre « Popote », sous-titre « On cuisine une fois. On se
  régale toute la semaine. »
- **Sans empreinte** (le navigateur ne sait pas proposer de clé d'accès, ou aucune n'a été créée sur cet appareil) :
  champ « Ton e-mail », bouton « Continuer », note « Pas de mot de passe. Je t'envoie un code. »
- **Empreinte proposée** (le navigateur sait proposer une clé d'accès et une clé a déjà été créée ici ; l'écran ne
  sait pas qui est la personne avant qu'elle entre, et ne le prétend pas) : bulle « Re-bonjour ! », titre « Content
  de te revoir », texte « Entre avec ton empreinte, ou reçois un code. », bouton « Entrer avec mon empreinte »
  (remplissage automatique de la clé d'accès), bouton blanc « Recevoir un code par mail » (mène au champ e-mail).
- **Actions :** « Continuer » → `POST /api/v1/login-codes {email}` puis `/entrer/code`. « Entrer avec mon
  empreinte » → `POST /api/v1/passkey-challenges` puis `POST /api/v1/sessions {method:"passkey"}`.
- **Erreurs :** e-mail mal formé → sous le champ : « Il manque quelque chose dans cette adresse. » ; `429` → « Trop de
  demandes. Réessaie dans N minutes. » ; empreinte annulée ou refusée → on reste sur l'écran, bulle « Pas grave.
  Réessaie, ou reçois un code. » ; `403 cle_origine_non_admise` → message réseau générique.
- **Bas de l'écran :** laissé vide, c'est la place du clavier.

### 4.2 `/entrer/code` : le code

- **Décor :** soleil rose, marmite au repos, enveloppe. Bouton retour vers `/entrer`.
- **Textes :** titre « Regarde tes mails », « Un code à 6 chiffres part vers **{e-mail}**. », six cases, note « Il
  marche 10 minutes. », lien « Recevoir un nouveau code », toujours visible (désactivé avec « Nouveau code dans N s »
  tant que `resend_after_s` court). L'écran ne dit jamais que le mail est arrivé : l'envoi part après la réponse.
- **Saisie :** un seul champ invisible porte la saisie (`inputmode="numeric"`, `autocomplete="one-time-code"`), les six
  cases l'affichent. À six chiffres, l'envoi part seul : `POST /api/v1/sessions {method:"email_code", …}`.
- **Juste :** cases menthe, note « C'est le bon ! », marmite en joie, puis `/entrer/cle` si la personne n'a aucune clé
  sur cet appareil et n'a pas dit « Plus tard » ici, sinon l'adresse demandée.
- **Refusé (`401`) :** l'API rend exprès la même réponse pour un code faux, expiré ou épuisé. Un seul état : les cases
  tremblent une fois, passent en tomate pâle et se vident ; note en erreur « Ce code ne marche pas (faux ou
  expiré). » ; le lien devient le bouton jaune « Recevoir un nouveau code » ; marmite inquiète. Aucun compteur d'essais.
  Après l'appui : note « Un nouveau code part vers ton adresse. Il marche 10 minutes. »
- **Trop de demandes (`429`) :** note « Trop de demandes. On fait une pause de N minutes. », pastille « Nouveau code
  possible dans MM:SS » (décompte), marmite en sommeil, et, si l'empreinte est proposée, bouton « Entrer avec mon
  empreinte ». La durée vient de `Retry-After`.

### 4.3 `/entrer/cle` : l'empreinte proposée

- **Décor :** soleil ciel, grande pastille ronde avec une empreinte et un anneau.
- **Textes :** « La prochaine fois, ton doigt suffit », « Sur ce téléphone, tu entres avec ton empreinte ou ton visage.
  Sans code. », bouton « Activer », lien « Plus tard ».
- **« Activer » :** `POST /api/v1/me/passkey-challenges {purpose:"registration"}` puis `POST /api/v1/me/passkeys`.
  Pendant l'attente : bouton « Pose ton doigt… », l'anneau se ferme. Réussite : « C'est activé ! », confettis.
- **« Plus tard » ou refus du navigateur :** on continue sans rien dire de plus ; la proposition reviendra à la
  prochaine connexion par code, pas avant. Navigateur sans clés d'accès : l'écran est sauté.
- Sur PC le texte dit « ton empreinte, ton visage ou le code de ton ordinateur ».

### 4.4 Le réveil

- Un comportement de l'écran, pas une promesse du serveur : l'animation apparaît quand la réponse tarde, selon la
  règle du plan de fondation (F18). Cette spec en fixe l'aspect : fond ciel, marmite en sommeil avec « z z z », texte
  « Popote se réveille… ».
- À la réponse : la marmite ouvre les yeux, saute, l'écran demandé monte. Au-delà du délai de la fondation : écran
  d'erreur réseau.
- Tant que le réveil dure, aucun bouton n'est montré : rien à toucher, rien à casser.

### 4.5 `/foyer` : notre foyer

- **Textes :** titre « Notre foyer », sous-titre « Deux places en cuisine. Une est libre. » Deux blocs côte à côte :
  la personne (« C'est toi ») et la place libre (avatar en pointillés, « Place libre », petit bouton jaune « Inviter »).
  Marmite avec la bulle « À deux, je pèse les barquettes pour chacun ! ».
- **« Inviter »** ouvre la feuille : « Qui cuisine avec toi ? », champs « Son prénom » et « Son e-mail », bouton jaune
  « Envoyer l'invitation », note « Je lui écris de ta part. Le lien marche 7 jours, pour elle seulement. »
  → `POST /api/v1/me/invitations {first_name, email}`.
- **Après l'envoi :** l'enveloppe s'envole, confettis, la place devient l'avatar de la personne invitée avec la
  pastille « Invitée », sous-titre « {Prénom} est invitée. Je te préviens quand elle arrive. », bulle « Je lui
  écris ! », et le bloc de suivi : « Le mail part vers **{e-mail}** », trois étapes « Lancée », « Ouverte »,
  « Arrivée », boutons « Renvoyer », « Copier le lien », lien « Annuler ». Aucun écran n'affirme que le mail est
  arrivé (l'envoi part après la réponse de l'API, sans retour d'échec) : « Renvoyer » reste toujours visible.
- **Suivi :** lu par `GET /api/v1/me/invitations` à l'ouverture de l'écran et toutes les 30 s tant qu'il est visible.
  `opened` (le lien a été ouvert : aucun mail n'est pisté) → bulle « Elle a ouvert le lien ! ». `accepted` → la pastille
  devient « Dans le foyer », confettis. `expired` → la troisième étape dit « Expirée », « Renvoyer » passe en jaune.
- **« Renvoyer » :** `POST …/deliveries`. Trop tôt (`429 renvoi_trop_proche`) : bouton désactivé « Renvoyer dans
  N min ». Épuisé (`renvois_epuises`) : « Plus de renvoi possible. Annule et réinvite. »
- **« Copier le lien » :** `POST …/links`, copie dans le presse-papiers, bulle « Lien copié. Elle devra taper un code
  reçu par mail. »
- **« Annuler » :** `DELETE …/{id}` après une confirmation en ligne (« Annuler l'invitation de {Prénom} ? Oui /
  Non »). La place redevient libre.
- **Erreurs de la feuille :** prénom vide ou refusé → « Juste un prénom, sans chiffre ni symbole. » ; e-mail mal
  formé → comme au § 4.1 ; `409 invitation_deja_en_attente` → « Cette personne est déjà invitée. » ;
  `429 quota_invitations` → « Trop d'invitations aujourd'hui. Réessaie demain. » ; `409 foyer_complet` → « Le foyer a
  déjà ses deux places prises. »
- **Foyer complet :** sous-titre « Le foyer est au complet. », les deux blocs montrent deux personnes, l'autre avec la
  pastille « Dans le foyer ». Le responsable voit, sous le bloc de l'autre, le lien de danger « Retirer du foyer »
  (§ 4.10). L'autre ne le voit pas.
- **Demande de nouveau lien** (§ 4.7) : le bloc de suivi montre « {Prénom} demande un nouveau lien » et met
  « Renvoyer » en avant.

### 4.6 Le mail d'invitation

- De « Popote » `bonjour@notre-popote.fr`. Objet : « {Hôte} t'a gardé une place en cuisine ».
- Corps : bandeau soleil avec la marmite, titre « {Prénom}, {Hôte} t'a gardé une place ! », texte « Vous cuisinez
  une fois, vous vous régalez toute la semaine. Je pèse tes barquettes rien que pour toi. », bouton jaune « Rejoindre
  {Hôte} », note « Ce lien marche 7 jours, et rien que pour toi. »
- Le bouton mène à `/invitation#<jeton>`. Version texte seul obligatoire, avec le lien en clair.
- La marmite est une image fixe (`.design/systeme/mails/marmite-mail.png`, 240 × 240 px, affichée à 120) servie par
  `notre-popote.fr` : la même adresse pour tous, sans paramètre, avec un texte
  alternatif. Le mail reste lisible sans images. Aucun pixel de suivi, dans aucun mail.

### 4.7 `/invitation` : rejoindre

- À l'ouverture : `POST /api/v1/invitations/inspections {token}` (le jeton vient du fragment d'adresse, il n'est jamais
  envoyé dans une adresse).
- **Lien valable, venu du mail :** soleil jaune, deux avatars (l'hôte plein, l'invitée en pointillés), titre « Salut
  {Prénom} ! », « {Hôte} t'attend en cuisine. », bloc « ✓ Ton adresse est vérifiée — par le lien que tu viens
  d'ouvrir » (l'adresse n'est jamais affichée : l'API ne la rend pas à qui tient le lien), champ « Ton prénom (tu peux
  le corriger) », bouton « Rejoindre le foyer », note « Rien d'autre à taper. Ton compte se crée maintenant. »
  → `POST /api/v1/invitations/acceptances {token, first_name}` (le prénom corrigé part avec l'acceptation).
- **Lien copié par l'hôte (`needs_mail_code`) :** même écran, mais le bloc dit « Un code part vers ton adresse — celle
  où tu as reçu l'invitation » et les six cases du § 4.2 remplacent la note ; le bouton s'active à six chiffres
  (`POST /api/v1/invitations/codes` à l'ouverture, puis l'acceptation avec le code).
- **Réussite :** les deux avatars se rejoignent, celui de l'invitée se remplit, confettis, bouton « Te voilà dans le
  foyer ! », puis `/entrer/cle`, puis `/bienvenue`.
- **Lien échu (`410`, avec `host_first_name`) :** soleil ciel, marmite inquiète, titre « Ce lien a expiré », texte
  « Il marchait 7 jours. Demande-en un neuf : {Hôte} reçoit ta demande et te le renvoie d'un geste. », bouton jaune
  « Demander un nouveau lien » (§ 9, R1), lien « J'ai déjà un compte » (vers `/entrer`). Après l'appui : « Demande
  envoyée à {Hôte} », marmite en joie.
- **Lien inconnu ou annulé (`404`, sans prénom) :** même écran, titre « Ce lien ne marche plus », texte « Rouvre-le
  depuis ton mail, ou demande à la personne qui t'a invitée de t'en renvoyer un. », et seul le lien « J'ai déjà un
  compte ». Aucune demande n'est envoyée.
- **Foyer complet (`409 foyer_complet`) :** « Ce foyer a déjà ses deux places prises. » avec le lien « J'ai déjà un
  compte ».
- **Déjà un compte (`409 compte_existant`) :** « Tu as déjà un compte avec cette adresse. Entre, puis rouvre ce lien. »
  avec le bouton « Entrer ».
- **Déjà dans un foyer (`409 deja_dans_un_foyer`) :** « Tu fais déjà partie d'un foyer. Quitte-le d'abord pour rejoindre celui de {Hôte}. »

### 4.8 `/bienvenue`

- Soleil rose, marmite en joie puis en parole, confettis une fois. Titre « Bienvenue, {Prénom} ! ».
- Trois blocs tirés des vraies données du foyer, dans cet ordre, chacun seulement s'il a quelque chose à dire :
  le congélateur (« **{N} {plat}** au congélateur, prêts à sortir. »), la semaine (« Rien de prévu cette semaine. **On
  lance une session ?** » ou « Ce soir, c'est **{plat}**. »), les objectifs s'ils manquent (« **Dis-moi tes
  objectifs** et je pèse tes barquettes pour toi. »).
- Bouton « Entrer dans la cuisine » → `/`.

### 4.9 `/compte` : mon compte

- Titre « Mon compte ». Bloc d'identité (avatar, prénom, e-mail, petit bouton « Modifier » : prénom seulement).
- **« Mes appareils »** : une ligne par session (`GET /api/v1/me/sessions`) : picto téléphone ou ordinateur, nom
  (« Ce téléphone », « Chrome sur Windows »), dessous la dernière activité et « empreinte activée » si la session a
  été ouverte par une clé ; pastille « ici » sur la session courante, petit bouton « Déconnecter » sur les autres
  (`DELETE /api/v1/me/sessions/{id}`) : la ligne se referme, note « {Nom} est déconnecté. » Lien « Déconnecter tous les
  autres ».
- **« Mes empreintes »** : une ligne par clé (`GET /api/v1/me/passkeys`), avec « Renommer » et « Retirer » (preuve
  récente demandée). Aucune clé : « Aucune empreinte sur tes appareils. » et le bouton « En ajouter une ».
- Boutons blancs « Télécharger mes données » et « Me déconnecter », lien de danger « Quitter Popote » → § 4.10.

### 4.10 Partir, supprimer, retirer

- **`/compte/partir`** : marmite inquiète, titre « Tu pars ? », « Dans les deux cas, {Autre} garde le foyer, le frigo
  et les recettes. » Deux blocs à toucher : « Quitter le foyer — Ton compte reste 30 jours, le temps de télécharger
  tes données ou de rejoindre un autre foyer. Puis il s'efface. » et « Supprimer mon compte — Tout ce qui est à toi
  disparaît tout de suite. Pas de retour possible. » Bouton « Finalement, je reste », lien « Télécharger mes données
  d'abord ». **Seule dans le foyer :** la phrase d'en-tête devient « Tu es seule dans le foyer : il disparaît avec
  toi. » et seul le bloc « Supprimer mon compte » reste.
- **`/compte/supprimer`** : titre « Supprimer ton compte », bloc de lignes d'effet :
  ✕ « Ton prénom, ton e-mail, tes objectifs et tes repas notés **disparaissent**. » ; ✕ « Tes charges perso
  **disparaissent**. Ce qui est déjà réglé reste partagé. » ; ✓ « {Autre} **garde** le frigo, les recettes et les mois déjà clôturés. » ;
  → « {Autre} **devient responsable** du foyer, et paie les charges communes encore à régler en entier. » ; → « Elle est **prévenue par
  mail**. » Puis le bouton blanc « Prouve que c'est toi » (empreinte, sinon code par mail : § 5), le bouton de danger
  à maintenir « Maintiens pour supprimer », la note « Garde le doigt dessus 2 secondes. », le lien « Finalement, je
  reste ». Le bouton à maintenir reste désactivé tant que la preuve n'est pas faite. Réussite → `/adieu`.
  Seule dans le foyer : les lignes ✓ et → sont remplacées par ✕ « Le foyer entier **disparaît** : frigo, recettes,
  budget. » et ✕ « L'invitation en attente **s'éteint**. »
- **Quitter le foyer** : même écran, titre « Quitter le foyer », lignes : ✕ « Tu **ne vois plus** le frigo, les
  recettes ni le budget. » ; → « Ton compte reste **30 jours**, puis s'efface. » ; ✓ « {Autre} **garde** tout le
  foyer et en devient responsable. » ; → « Elle paie en entier les charges communes **encore à régler**. » ; preuve,
  puis bouton à maintenir « Maintiens pour quitter ». Réussite → `/sans-foyer`. Une ligne du budget déjà confirmée
  garde son partage : seules les charges communes encore à régler changent.
- **`/foyer/retirer/:id`** (responsable du foyer seulement) : avatar de l'autre, titre « Retirer {Prénom} du
  foyer ? », « Elle est déconnectée tout de suite et prévenue par mail. », lignes : ✕ « Elle **ne voit plus** le
  frigo, les recettes ni le budget. » ; → « Elle garde **30 jours** pour télécharger ce qui est à elle. » ; ✓ « Tu
  **gardes** tout le foyer. Ses barquettes sont à tout le monde. » ; → « Ses charges perso sortent du budget, les
  communes encore à régler passent **à 100 % pour toi**. » Preuve, puis « Maintiens pour retirer {Prénom} », lien « Annuler ».
  Réussite : retour à `/foyer` avec une place libre et la bulle « {Prénom} n'est plus dans le foyer. »
- **`/adieu`** : soleil ciel, marmite inquiète, « C'est supprimé », « Merci d'avoir cuisiné avec moi. Si tu reviens
  un jour, il te faudra une nouvelle invitation. », bouton « Fermer » (vers `/entrer`).
- **`/sans-foyer`** (toute personne connectée sans foyer y est conduite) : soleil ciel, marmite inquiète, pastille
  « Encore N jours », puis un texte selon `left_reason` :
  - `removed` : titre « Tu n'es plus dans le foyer », « Depuis le {date}, à la demande de {Autre}. Ton compte s'efface
    tout seul le {date}. »
  - `left` : titre « Tu as quitté le foyer », « Depuis le {date}. {Autre} le garde. Ton compte s'efface tout seul le
    {date}. »
  - `other_member_first_name` nul : la phrase qui cite {Autre} est retirée.
  Bouton jaune « Télécharger mes données », bouton blanc « J'ai une nouvelle invitation » (explique : « Ouvre le lien
  reçu par mail, sur cet appareil. »), lien de danger « Supprimer mon compte maintenant ».

## 5. Prouver que c'est toi

Avant supprimer, quitter, retirer, ajouter ou retirer une empreinte : si la dernière preuve a plus de 5 minutes
(`403 reauthentification_requise`), le bouton « Prouve que c'est toi » lance l'empreinte
(`POST /api/v1/me/passkey-challenges {purpose:"reauthentication"}` puis `POST /api/v1/me/reauthentication`). Sans
clé, ou si elle échoue : une feuille « Un code part vers {e-mail} » avec les six cases
(`POST /api/v1/me/reauthentication-codes`). Réussite : le bouton devient menthe pâle, « C'est bien toi ».

## 6. États communs

Ces états et leurs textes appartiennent à la fondation du front (F18 à F21), source unique. Le tableau rappelle ce que
le parcours en attend ; en cas d'écart de texte, la fondation gagne.

| État | Ce qu'on voit |
|---|---|
| Chargement court (avant le seuil du réveil) | rien de plus ; le bouton touché passe en « occupé » |
| Réveil | l'écran du § 4.4 |
| Pas de réseau, ou délai dépassé | marmite inquiète, « Je n'arrive pas à joindre la cuisine. », « Vérifie ta connexion, puis réessaie. », bouton « Réessayer » |
| `429` | le message de l'écran concerné, toujours avec le temps restant tiré de `Retry-After` |
| `5xx` | « Quelque chose a cassé de mon côté. Réessaie dans un instant. », bouton « Réessayer » ; l'identifiant de trace est affiché en petit |
| Session expirée (`401`) | retour à `/entrer` avec la bulle « Ta session est finie. Entre à nouveau. », puis retour à l'adresse d'où l'on vient |
| Session fermée ailleurs | même chose, bulle « Cet appareil a été déconnecté. » |

Une route du foyer qui répond `403 aucun_foyer` conduit à `/sans-foyer`.
Les erreurs de l'API arrivent au format RFC 9457 ; l'écran choisit son texte d'après `type`, jamais d'après `detail`.

## 7. Les autres mails

Même gabarit que le § 4.6 (bandeau, marmite, un seul bouton), toujours avec une version texte. Le gabarit HTML et
texte et les objets sont la tâche F1 du plan 0.4ter (PR popote-web #42). Un objet ne porte ni
code ni prénom ; le prénom passe dans le corps. Seule exception : le prénom de l'hôte dans l'objet de l'invitation et
dans celui du retrait, passé par le même filtre que dans le corps et coupé à 30 caractères. Si le filtre le refuse,
ces objets deviennent « Une place t'attend en cuisine » et « Tu n'es plus dans ton foyer Popote ».

| Mail | Objet | Corps |
|---|---|---|
| Code | « Ton code Popote » | « Voici ton code. Il marche 10 minutes. » Le code en très grand. « Tu n'as rien demandé ? Ne fais rien, personne n'entre sans ce code. » Bandeau soleil rose. |
| Avis de connexion | « Quelqu'un vient d'entrer avec ton e-mail » | « C'était bien toi ? Connexion par code, {date} à {heure}, depuis {navigateur} sur {système}. Si ce n'était pas toi, déconnecte cet appareil. » Un seul bouton, « Voir mes appareils », qui ouvre `/compte` (connexion exigée) : aucun lien d'un mail n'agit tout seul. Bandeau ciel. |
| Empreinte ajoutée ou retirée | « Une empreinte a été ajoutée à ton compte » (ou « retirée ») | même forme que l'avis de connexion |
| Demande de nouveau lien | « Une demande de nouveau lien » | « {Prénom} n'arrive plus à ouvrir son lien d'invitation. » Bouton « Renvoyer l'invitation » (ouvre `/foyer`). |
| Retrait du foyer | « Tu n'es plus dans le foyer de {Hôte} » | « Tu as 30 jours pour télécharger ce qui est à toi. » Bouton « Télécharger mes données ». |
| Départ de l'autre | « Un départ dans ton foyer » | « {Prénom} a quitté le foyer. Le foyer est à toi. Les charges communes passent à 100 % pour toi à partir de ce mois. » |
| Rappel avant effacement | « Ton compte Popote s'efface dans 7 jours » | « Télécharge tes données, ou rejoins un foyer avec une nouvelle invitation. » |

## 8. Sur PC (à partir de 900 px)

- **Écrans d'avant la connexion** (`/entrer`, code, clé, invitation, bienvenue, adieu, sans foyer) : deux moitiés.
  À gauche le décor (soleil, marmite de 310 px, « Popote » en 92 px), à droite le contenu dans une colonne de
  340 px centrée en hauteur.
- **Écrans de l'appli** (`/foyer`, `/compte` et leurs suites) : un menu fixe de 230 px à gauche (« Aujourd'hui », « La
  semaine », « Le frigo », « Le budget », « Notre foyer », la marmite en bas avec la bulle « Parle-moi ! »), le contenu
  à droite sur 900 px au plus. Les blocs se rangent en grille ; la feuille d'invitation devient un bloc centré de
  420 px avec un voile.
- Entre 600 et 900 px : la mise en page du téléphone, centrée sur 520 px.

## 9. Ce que l'API doit ajouter pour ce parcours

Le socle 0.4bis fournit les codes, les clés, les sessions, la preuve récente, les invitations par mail et la
suppression du compte. Il manque les ajouts ci-dessous. Ils sont planifiés dans le plan du socle 0.4bis, réconciliés
avec ses tâches S12 (invitation) et S14 (suppression) ; le plan de ce parcours ne couvre que le front et les cite par
leur numéro.

| N° | Route | Rôle |
|---|---|---|
| R1 | `POST /api/v1/invitations/renewal-requests {token}` (publique) | Une personne dont le lien est mort redemande un lien. Réponse `202` constante. Si le lien est échu (statut `expired`) : marque l'invitation « redemandée » et envoie le mail « demande de nouveau lien » à l'hôte, une fois par 24 h et par invitation. Un lien annulé par l'hôte ne lui écrit pas. |
| R2 | `GET /api/v1/household` | Le foyer de la personne : membres (`id`, `first_name`, `role` : `owner` ou `member`, `is_me`), nombre de places (2). |
| R3 | `POST /api/v1/me/household-departure` (preuve récente) | Quitter le foyer : la personne sort du foyer, ses charges perso et ses lignes ouvertes partent (règle du socle pour un départ), son compte reste avec `scheduled_deletion_at` à + 30 jours. Si elle est `owner` et qu'il reste un membre, celui-ci devient `owner`. Refus `409 seule_dans_le_foyer` si elle est seule. |
| R4 | `DELETE /api/v1/household/members/{id}` (`owner`, preuve récente) | Retirer un membre : mêmes effets que R3 pour lui, ses sessions sont fermées, mail « retrait du foyer ». Refus `403` pour qui n'est pas responsable. |
| R5 | `GET /api/v1/me` gagne `household` (ou `null`), `role`, `scheduled_deletion_at`, `left_household_at`, `left_reason` (`left` ou `removed`), `other_member_first_name` (ou `null`) | Permet de conduire une personne sans foyer vers `/sans-foyer` et d'y écrire le bon texte selon qu'elle est partie ou a été retirée (§ 4.10). |
| R6 | `DELETE /api/v1/me` : transfert | Quand un `owner` supprime son compte et qu'il reste un membre, celui-ci devient `owner` ; mail « départ de l'autre ». |
| R7 | Tâche quotidienne | Efface les comptes dont `scheduled_deletion_at` est passé ; envoie le rappel à J − 7. |
| R8 | `GET /api/v1/me/invitations` : état « redemandée » | `renewal_requested_at` dans la liste de l'hôte. |
| R9 | `GET /api/v1/welcome` | Les trois faits de l'écran de bienvenue (congélateur, semaine, objectifs manquants). Peut attendre l'étape 0.5 : d'ici là l'écran ne montre que le bloc des objectifs. |

Le téléchargement des données (`GET /api/v1/me/export`) est la route du droit d'accès prévue par le socle.

## 10. Mouvement

| Moment | Mouvement | Durée, courbe |
|---|---|---|
| Changement d'écran | le nouvel écran monte du bas, l'ancien recule à 94 % | 500 ms, `sortie` |
| Éléments d'un écran | montent de 36 px en grandissant de 92 % à 100 %, l'un après l'autre | 550 ms, `rebond`, 70 ms d'écart |
| Marmite à l'arrivée | grandit de 40 % à 100 % | 700 ms, `rebond` |
| Bouton | s'enfonce de 6 px | 90 ms |
| Chiffre tapé dans une case | de 150 % à 100 % | 300 ms, `rebond` |
| Code juste | les cases sautent de 12 px l'une après l'autre | 160 ms, 50 ms d'écart |
| Code faux | les cases tremblent de ± 10 px, six allers | 420 ms |
| Anneau de l'empreinte | se ferme | 1 100 ms |
| Feuille | monte ; redescend | 550 ms, `rebond` léger ; 400 ms |
| Enveloppe de l'invitation | part du centre vers le haut à droite en tournant de 30° | 1 100 ms |
| Étape de suivi | la barre se remplit | 600 ms, `sortie` |
| Confettis | 22 à 40 morceaux, vers le haut puis chute de 260 px, en tournant | 1,5 à 2,2 s |
| Bouton à maintenir | le voile avance de 0 à 100 % | 2 000 ms, linéaire ; relâcher avant la fin le remet à zéro en 200 ms |
| Avatars qui se rejoignent | chacun glisse de 17 px vers l'autre | 400 ms, `rebond` |

Avec `prefers-reduced-motion` : plus de montée, de saut ni de rotation ; fondus de 150 ms, confettis absents,
bouton à maintenir inchangé (c'est une sécurité, pas une décoration).

## 11. Accessibilité

Chaque écran a un seul `h1`. Les cases du code sont un seul champ étiqueté « Code à 6 chiffres ». Les erreurs sont
annoncées (`role="alert"`) et liées à leur champ. Le bouton à maintenir accepte aussi le clavier : touche Espace
tenue 2 secondes, et son texte le dit aux lecteurs d'écran (« Maintenir 2 secondes pour supprimer »). Pour qui ne peut
pas maintenir (F10 du plan de fondation) : deux appuis brefs espacés d'au moins 0,6 s ; après le premier, le bouton
dit « Appuie encore pour confirmer » pendant 5 s, puis revient à son libellé. La marmite est
décorative (`aria-hidden`), sauf sa bulle, qui est du texte. Tout changement sans changement d'écran (appareil
déconnecté, « Lien copié », ouverture du lien détectée, confirmation en ligne, ligne qui se referme) est annoncé dans
une région `status`, et le focus revient à un endroit fixé d'avance : l'élément suivant de la liste, sinon le titre
du bloc. Contrastes et zones touchables : règles du système.

## 12. Critères d'acceptation (scénarios au clic)

1. *Étant donné* un appareil neuf, *quand* Sam tape son e-mail puis le code reçu, *alors* il arrive sur l'accueil,
   après la proposition d'empreinte.
2. *Étant donné* une empreinte activée, *quand* Sam rouvre Popote, *alors* « Entrer avec mon empreinte » le fait
   entrer sans code.
3. *Quand* le code est refusé (faux ou expiré, sans que l'écran sache lequel), *alors* les cases tremblent, le texte
   dit « Ce code ne marche pas (faux ou expiré). » et « Recevoir un nouveau code » en envoie un ; après trop de
   demandes, l'écran de pause affiche un décompte.
4. *Quand* Sam invite Léa, *alors* un mail part vers son adresse, le suivi montre « Lancée », puis « Ouverte » après
   l'ouverture du lien, puis « Dans le foyer ».
5. *Quand* Léa ouvre le lien du mail et touche « Rejoindre le foyer », *alors* son compte existe, elle est dans le
   foyer de Sam, et l'écran de bienvenue montre des faits du foyer.
6. *Quand* le lien est expiré, *alors* « Demander un nouveau lien » envoie un mail à Sam, et son suivi le signale.
7. *Quand* Sam déconnecte un autre appareil, *alors* la ligne disparaît et cet appareil revient à `/entrer` à sa
   prochaine action.
8. *Étant donné* Léa membre et Sam responsable, *alors* elle ne voit aucun moyen de retirer Sam ; Sam, lui, peut la retirer, après
   preuve et appui de 2 secondes ; Léa arrive alors sur `/sans-foyer`.
9. *Quand* Sam supprime son compte alors que Léa est dans le foyer, *alors* Léa devient responsable et le foyer est
   intact.
10. *Quand* le bouton à maintenir est relâché avant 2 secondes, *alors* rien n'est supprimé.
11. *Négatif :* une personne sans session n'atteint aucun écran de l'appli ; une personne sans foyer n'atteint que
    `/sans-foyer`, `/compte` et l'invitation.
12. *Sur PC (1440 px) et sur téléphone (390 px)*, chaque écran correspond à sa capture de référence.

## 13. Points à confirmer

- **Durée du lien d'invitation :** 7 jours (valeur du socle). Le prototype montré au propriétaire disait 30 jours ; le
  prototype de ce dossier est corrigé à 7. Redit au propriétaire le 13/11.
- **Photos des plats :** les photos des recettes d'origine sont trop faibles pour être montrées en grand. L'écran de
  bienvenue n'en montre donc pas. La source des images de Popote reste à décider avec le propriétaire.
