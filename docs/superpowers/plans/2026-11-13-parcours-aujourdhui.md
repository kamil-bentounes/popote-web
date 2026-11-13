# Parcours « Aujourd'hui » : le plan du front

**Spec :** `docs/superpowers/specs/2026-11-13-parcours-aujourdhui-design.md`. **Référence visuelle :**
`.design/aujourdhui/prototype.html` et `.design/aujourdhui/captures/`. **Style :** `.design/systeme/`.

Ce plan ne couvre que les écrans, dans `popote-web`. Il ne fait ni l'API ni l'assistant.

## Ce que ce plan attend, sans le faire

- **Le plan de fondation du front** (`docs/superpowers/plans/2026-11-13-fondation-du-front.md`, F1 à F25) : routeur
  et coque, client généré, garde de session, composants du système « Jeu », marmite, mouvement, feuille, confettis,
  états communs. Les tâches ci-dessous posent des écrans sur ce socle et le citent par numéro.
- **Le parcours « Entrer »** (E1 à E8) : la garde « sans foyer », `/compte`.
- **Les besoins P1 à P9 de la spec (§ 10)** : leur contrat et leur plan appartiennent au socle (assistant, voix et
  limite compris). Chaque tâche les cite ainsi : « P3, plan du socle ». Aucune tâche d'ici ne les code. Une tâche ne
  démarre que quand ses routes sont dans le contrat.
- **Les écrans des quatre mondes et « Mes objectifs »** : tant qu'ils n'ont pas leur parcours, leur tuile ou leur
  bouton mène à une page d'attente au style du système (« Bientôt »), jamais à une erreur.

**Ordre :** H1, H2, puis H3 et H4 en parallèle, H5, puis H6 et H6bis en parallèle, H7, H8, H9. Une tâche, une demande de
fusion, 400 lignes visées ; les coupes prévues sont écrites.

## Règles valables pour chaque tâche

- Charger avant de coder les skills qui s'appliquent (`building-frontends`, `securing-code`, `handling-errors`,
  `writing-tests`, `writing-commits`, `opening-pull-requests`).
- Les textes de l'écran sont ceux de la spec, au mot près. Un texte qui manque se demande, il ne s'invente pas. Les
  phrases des tuiles et de la bulle sont écrites par le front à partir de valeurs typées : aucun texte venu de l'API
  ou de l'assistant n'est rendu comme du HTML.
- Aucune couleur, taille, rayon ni durée en dur : tout vient des jetons. Aucun composant hors du système.
- Chaque écran est livré en 390 px et en 1440 px, avec ses états de la spec, et sa capture Playwright posée à côté de
  la capture de référence dans la demande de fusion.
- Le mouvement suit la spec § 11 et passe par Motion ; le prototype montre l'intention, son script n'est pas repris.
  Une durée qui n'a pas de jeton se demande à la session de design ; elle ne s'écrit pas en dur.
- Rien n'est affiché comme « noté » avant la réponse de l'API (spec § 5). Chaque écriture est rejouable sans doublon.
  **Politique de mutation de ce parcours** (spec § 5) : celle de la fondation, sans exception
  (`mutations.networkMode: 'online'` et `reessaieEcriture` de F5b : au plus deux reprises automatiques sur coupure,
  502, 503 ou 504, avec la même `Idempotency-Key` dans les variables). Hors ligne, l'écriture attend et repart seule
  (F21) : l'écran la montre avec la marque « Part dès que le réseau revient. ». Après l'échec des reprises d'une
  requête partie, le résultat est **incertain** : l'écran dit « Je vérifie… » puis « Pas sûr que ce soit noté. »
  (bouton « Vérifier »), relit P1 et s'y range. « Pas noté. » et « Réessayer » ne viennent que d'une erreur rendue
  par le serveur. Chaque écriture porte sa clé d'opération (même clé à « Réessayer » et à « Vérifier ») et sa cible
  explicite : le jour, le repas et la version affichés, jamais déduits de l'heure. Ni la clé ni la saisie ne vont
  dans le stockage du navigateur. Chaque tâche qui écrit teste ces points.
- Le texte de Popote arrive en segments typés (simple, gras) et se rend en JSX ; le récapitulatif se rend depuis le
  bloc typé, jamais depuis le texte (spec § 6).
- Un point de la spec § 14 se confirme avec le propriétaire avant la tâche qui en dépend : C1 avant H4, C2 et C6
  avant H2, C3 avant H5, C4 et C8 avant H7, C5 avant H3, C7 avant chaque tâche qui pose un de ses textes.
- Tout changement sans changement d'écran est annoncé dans une région `status`, et le focus va à l'endroit fixé par
  la spec § 12. Chaque tâche concernée le teste.
- Dépôt public : « Sam » et « Léa » dans les exemples et les tests, jamais de vraie donnée.

## Hypothèses à vérifier avant H6 et H7

- La politique de sécurité du contenu et la politique de permissions de la fondation (F23) laissent passer ce dont
  ces tâches ont besoin, et rien de plus : l'aperçu d'une photo choisie (H6), l'appareil photo (H6). Le micro est
  fermé aujourd'hui (`microphone=()`, `relais/src/index.ts:33`) : H6bis l'ouvre. À vérifier avec le socle avant de
  coder.
- Le mode vocal montre lui-même l'attente du réveil (spec § 7) : l'écran de réveil de F18 ne doit pas le recouvrir.
  H7 porte l'extension de F18 qui le permet.
- L'accès au micro dans l'appli installée sur iPhone : l'autorisation peut être redemandée à chaque lancement. Le
  socle le mesure sur un vrai appareil ; l'écran de refus de la spec § 7 couvre le pire cas.
- La voix de Popote (spec § 14, C4) : synthèse du navigateur ou du serveur, à trancher par le socle avant H7.

---

### H1 : La barre « Parle-moi » dans la coque

**Pourquoi :** spec § 3 et § 4.6. **Dépend de :** F3 (coque), F12, F17.

- [ ] La barre, présente sur chaque route d'une personne connectée qui a un foyer, sauf celles ci-dessous ; absente
  du mode vocal et des écrans d'état. Sur PC, elle laisse la place à la colonne de Popote (H8).
  **Avec la barre :** `/`, `/foyer`, `/compte`, `/compte/partir` et les pages d'attente « Bientôt » des mondes.
  **Sans la barre :** `/entrer`, `/entrer/code`, `/entrer/cle`, `/invitation`, `/bienvenue`, `/sans-foyer`, `/adieu`,
  **`/compte/supprimer`** et **`/foyer/retirer/:id`** (la barre pourrait recouvrir le bouton à maintenir sur un petit
  écran), le mode vocal, le réveil et les erreurs plein écran. La liste est un seul tableau dans le code, testé.
- [ ] Un appui sur la barre et un appui sur le micro sont deux actions distinctes, toutes deux au clavier. Tant que H5
  et H7 n'existent pas, elles ouvrent une feuille « Bientôt ».
- Tests : la barre est là sur chaque route « avec », absente de chaque route « sans » ; ordre de tabulation ; elle ne
  couvre jamais le dernier élément de l'écran (marge basse), à 320 px aussi. Les régressions d'« Entrer » sont
  rejouées : les scénarios d'E7 et d'E8 (`/compte/supprimer`, `/foyer/retirer/:id`, bouton à maintenir) passent
  inchangés avec la coque de H1.

### H2 : L'accueil en lecture

**Pourquoi :** spec § 4.1 à § 4.5, § 4.7, § 4.8, § 8 (chargement). **Dépend de :** H1, F12, F13 (jauge), F17 ; P1,
plan du socle. **Coupe prévue :** en-tête, bulle et repas (H2a) ; jauges et tuiles (H2b).

- [ ] **H2 possède la route `/`.** Elle remplace la route provisoire `_connecte.accueil.tsx` (`/accueil`) et la
  redirection `/` vers `/accueil` posées par la fondation (F5b) : `/` devient l'accueil, enfant de `_connecte`, et
  `/accueil` disparaît (ou renvoie vers `/`). La garde de F5b et le retour après connexion ne changent pas.

- [ ] L'en-tête (série ou date), la bulle et sa salutation selon l'heure, la ligne du repas dans ses états de lecture
  (prévu, mangé, autre chose noté, rien de prévu), les deux jauges (dépassement compris) ou la bande « Tes
  objectifs ? », les quatre tuiles avec chaque phrase du tableau § 4.5, la tuile mise en avant.
- [ ] Les formes vides pendant le chargement.
- [ ] Le jour, le repas du moment et le moment de la salutation viennent de P1 : aucun calcul avec l'heure de
  l'appareil. L'état est relu au retour sur l'écran, toutes les 60 s tant qu'il est visible, et après chaque action.
- Tests : chaque ligne des tableaux § 4.2 (salutations), § 4.3 et § 4.5 ; un changement de jour ou de repas rendu par
  P1 pendant que l'écran est ouvert ; un nom de plat très long ; un plat sans photo ; une personne sans objectifs ;
  « rien ce soir mais des repas ensuite » ; un nom de plat contenant du HTML s'affiche tel quel ; **l'URL finale
  après connexion est `/`** (pas `/accueil`) : avec `retour` absent, avec `retour=/`, et en suivant un ancien lien
  `/accueil`.

### H3 : La chose à faire dans la bulle

**Pourquoi :** spec § 4.2. **Dépend de :** H2 ; P2, plan du socle.

- [ ] La chose courante remplace la salutation après 1,5 s ; son bouton la règle ; confirmation, tuile mise à jour,
  chose suivante prise dans la réponse.
- Tests : deux choses à la suite ; la chose déjà réglée par l'autre membre ; l'échec (« Oups, ça n'a pas marché. »,
  le bouton reste, rien ne change) ; l'annonce et le focus après l'appui ; mouvement réduit (pas de délai).

### H4 : « Mangé », « Annuler », l'échec

**Pourquoi :** spec § 5.1, § 5.2, § 8. **Dépend de :** H2, F14 (tampon), F16 ; P3, plan du socle.

- [ ] L'enchaînement complet de « Mangé » (attente, tampon, confettis, jauges, tuile Frigo, série si c'est le premier
  repas du jour), les quatre bulles du § 5.1, « Annuler » (qui désigne la saisie montrée, noms accessibles « Annuler
  le dessert » et « Annuler le repas »), l'état en attente (« Part dès que le réseau revient. »), l'état incertain (« Je vérifie… », « Pas sûr que ce soit noté. »,
  « Vérifier »), l'état refusé (« Pas noté. », « Réessayer »), le conflit de dernière part, l'état périmé.
- Tests : double appui (une seule note) ; refus puis réussite ; hors ligne : l'écran montre l'attente, la saisie
  repart seule au retour du réseau, une seule fois ; requête partie puis deux reprises sans réponse : l'écran passe à
  l'état incertain ; rien n'est écrit dans le stockage du navigateur ; réponse perdue alors que le serveur a noté :
  « Vérifier » relit P1 et montre « Mangé », sans doublon ; « Réessayer » rejoue la même clé ; cible portée par
  l'écriture : à 15 h 00 min 10 s, « Mangé » sur le midi affiché envoie le midi, et un refus pour état périmé met
  l'écran à jour sans rien noter ; deux membres sur la dernière part (« Sam vient de prendre la dernière part. »,
  « Autre chose ? », « Fermer ») ; annulation de la saisie montrée, pas de la dernière ; chaque bulle (protéines manquantes, atteintes, énergie dépassée, sans objectifs) ; l'état tient après
  rechargement ; mouvement réduit.

### H5 : La feuille de Popote

**Pourquoi :** spec § 6, § 8 (limite, panne). **Dépend de :** H1, F15 ; P5 et P9, plan du socle. **Coupe prévue :**
la feuille, le fil et l'envoi (H5a) ; les blocs typés et la validation (H5b) ; la limite et la panne (H5c).

- [ ] La feuille et ses trois ouvertures (titre, ligne, raccourcis), le fil, la réponse au fil de l'eau, l'attente.
- [ ] Les blocs typés : récapitulatif à lignes (✓, ?, « estimé », réponses possibles), boutons de validation,
  destination à ouvrir (liste fermée de routes : une destination inconnue n'affiche pas de bouton).
- [ ] Les trois marques (✓, « estimé », à préciser) : le bouton de validation n'apparaît pas tant qu'une ligne est à
  préciser. Un récapitulatif validé ou abandonné a son bouton désactivé ; un récapitulatif en attente est retrouvé à
  la réouverture. La validation envoie l'identifiant et la version du bloc.
- [ ] La limite du jour : la marmite endormie reçoit sa propre annonce (pas la phrase du réveil de F17).
- Tests : chaque bloc ; valider deux fois (une seule action) ; fermer avant de valider (rien n'est écrit) ;
  **validation d'une ancienne version du bloc, d'un bloc d'une autre personne, d'un bloc expiré, d'une action hors
  liste** : le serveur refuse par un conflit, l'écran recharge le bloc à jour et n'écrit rien ; la limite ; la panne et « Réessayer » ; un texte de réponse contenant du HTML ou un lien s'affiche comme du texte ;
  dialogue, focus, Échap, annonces du fil.

### H6 : Dessert, encas, autre chose, produit à apprendre, une phrase

**Pourquoi :** spec § 5.3 à § 5.7, § 8 (étiquette). **Dépend de :** H4, H5 ; P4, P6 et P7, plan du socle. **Coupe
prévue :** le dosage d'une habitude (H6a) ; « Autre chose ? » et l'estimation (H6b) ; apprendre un produit et
l'étiquette (H6c) ; une phrase (H6d).

- [ ] « + Dessert » : la bulle « Un dessert ? », le bloc de dosage et ses pas, le total et la journée recalculés à
  chaque appui, le rouge au dépassement, « Ajouter au dîner ».
- [ ] « Autre chose ? » et « Noter » : plat du frigo, ou estimation avec « environ » et « estimé » ; l'état « Autre
  chose noté » de la ligne.
- [ ] Apprendre un produit : les lignes à préciser, la photo de l'étiquette (appareil photo ou image, valeurs lues
  modifiables), l'enregistrement.
- [ ] Une phrase : un récapitulatif, « Tout valider », « Modifier ».
- Tests : les chiffres de chaque exemple de la spec ; les trois bulles du § 5.3 ; une photo refusée ou illisible ;
  « Annuler » après un dessert (le dessert seul part), après « Tout valider » (tout part) ; un plat déjà noté n'est
  pas noté deux fois ; les textes de midi ; sans Popote (limite atteinte), un plat du stock et une habitude connue
  restent notables.

### H6bis : Ouvrir le micro dans le relais

**Pourquoi :** spec § 7 ; sans elle H7 est impossible. **Dépend de :** F23. **Fichiers :** `relais/src/index.ts`,
`relais/src/index.test.ts`, et le test de fumée du déploiement.

- [ ] Le relais pose aujourd'hui `microphone=()` (`relais/src/index.ts:33`). La tâche le change en `microphone=(self)`
  et **rien d'autre** : `camera=(self)`, `geolocation=()` et `payment=()` ne bougent pas.
- Tests : `index.test.ts` vérifie la valeur exacte de `Permissions-Policy` ; un test de fumée lit l'en-tête
  **réellement déployé** sur l'environnement d'essai (pas seulement celui du code) et échoue s'il diffère ; aucune
  autre directive de la politique n'a changé.

### H7 : Le mode vocal

**Pourquoi :** spec § 7. **Dépend de :** H5, H6bis ; P8, plan du socle ; les deux hypothèses ci-dessus.

- [ ] Les quatre états, l'écoute dès l'ouverture, le récapitulatif dit et affiché avec ses boutons « Valider » et
  « Corriger », la validation à la voix ou au toucher, la pause (silence, arrière-plan, verrouillage), le refus du
  micro, l'attente du réveil.
- [ ] **Extension explicite de F18** (`src/etats/reveil.ts`, `EcranReveil`, `__root.tsx`) : F18 rend toute la coque
  `inert` et déplace le focus à la moindre requête lente ; il doit laisser le mode vocal gérer son propre réveil
  (titre « Je me réveille… », écoute qui continue). Le moyen : le mode vocal déclare ses requêtes comme gérées par
  lui, F18 les ignore, et le reste de l'appli garde son comportement. Une région `status` seulement.
- [ ] La validation à la voix (spec § 7) : micro coupé pendant que Popote parle ; seule une réponse à sa question,
  dans les 10 secondes, valide ; un montant d'argent est affiché, jamais dit.
- Tests : avec un micro simulé ; **avec 7 s de latence** sur la requête (F18 ne recouvre pas le mode vocal, la coque
  n'est pas `inert`, le focus reste, « Je me réveille… » est dit une fois) et, hors mode vocal, avec la même latence,
  l'écran de réveil de F18 s'affiche toujours ; refus de l'autorisation ; rien n'est noté sans validation ; un « oui » pendant que
  Popote parle, ou hors du délai, ne valide rien ; un récapitulatif à préciser ne se valide pas ; tout ce qui est dit
  est écrit ; le son n'est gardé nulle part côté navigateur.

### H8 : Sur PC

**Pourquoi :** spec § 9. **Dépend de :** H2 à H7.

- [ ] Les deux colonnes à partir de 900 px ; Popote toujours ouverte à droite ; le mode vocal dans sa colonne.
- Tests : 899 px et 900 px ; 1440 px ; le focus ne se perd pas quand la largeur change.

### H9 : Les scénarios au clic et les captures

**Pourquoi :** spec § 13. **Dépend de :** toutes les tâches. **Coupe prévue :** scénarios 1 à 8, puis 9 à 15.

- [ ] Un scénario Playwright par critère d'acceptation, sur l'environnement d'essai, avec deux navigateurs pour le
  scénario à deux personnes (4) et un assistant aux réponses fixées pour les scénarios de Popote.
- [ ] Pour chaque écran et chaque état : une capture en 390 px et en 1440 px, rangée à côté de la capture de
  référence. L'écart est jugé par la session de design avant que le propriétaire ne voie quoi que ce soit.
- [ ] **Pour chaque écran et chaque état**, en plus des captures : à 320 px (rien ne déborde, la barre fixe et les
  feuilles ne masquent pas leur dernier bouton), en zoom 200 %, au clavier seul (tout se fait, focus visible et jamais
  perdu), avec un lecteur d'écran (annonces, noms accessibles, dont « Annuler le dessert » et « Annuler le repas »),
  avec `prefers-reduced-motion`, et un passage axe sans violation. Les états incertain, refusé, conflit de dernière
  part et état périmé en font partie.
- [ ] Revue adverse du parcours entier par un agent à l'œil frais ; mise à jour de `docs/ETAT.md`.
