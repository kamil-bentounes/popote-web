# Le monde « Foyer et réglages » : le plan du front

**Spec (v2) :** `docs/superpowers/specs/2026-11-14-monde-foyer-reglages-design.md`. **Référence visuelle :**
`.design/foyer-reglages/prototype.html` et `.design/foyer-reglages/captures/` (dans la branche du prototype, pas
encore sur `main`). **Style :** `.design/systeme/`.

Ce plan ne couvre que les écrans, dans `popote-web`. Il ne fait ni l'API, ni l'envoi des notifications, ni
l'assistant, ni l'outil local du propriétaire (compte désigné par UUID, script hors de ce front : aucun écran pour
lui ici, spec § 10.3). **Le calcul d'« Aide-moi à choisir » est dans ce plan** : il se fait dans le navigateur (Q2b).

## Ce que ce plan attend, sans le faire

- **Le plan de fondation du front** (`docs/superpowers/plans/2026-11-13-fondation-du-front.md`, F1 à F25) : routeur
  et coque, client généré, garde de session, composants du système « Jeu », mouvement, feuille, confettis, états
  communs (chargement, erreur, « Trop de demandes », perte de réseau, F18 à F21), PWA (F22). **Amendements demandés
  à la fondation** : le lien « Signaler » des écrans d'erreur (F18 à F21), la mémoire des trois derniers numéros
  d'erreur, l'envoi multipart (pour l'image d'un signalement), et la version du front lue dans un `version.json`
  écrit à la construction (aucune variable `VITE_*`).
- **Le parcours « Aujourd'hui »** (H1 à H9) : la barre « Parle-moi, ou écris » (H1), la feuille de Popote et ses
  blocs typés (H5), le mode vocal (H7), la politique de mutation et ses trois cas. Ce monde les réutilise ;
  « Régler » et « M'y emmener » de l'accueil (H2) passent de « Bientôt » à `/reglages/objectifs`.
- **Le parcours « Entrer »** (E1 à E8) : « Notre foyer » (`/foyer`), « Mon compte » (`/compte`, E6) et « Partir,
  supprimer, retirer » (`/compte/partir`, E7). Ce monde y mène ; il ne les refait pas.
- **Les notifications** (`docs/superpowers/plans/2026-11-13-notifications-push.md`) : la couche push du front
  (N11) et l'écran « Notifications » (N12). Ce monde l'intègre à ses réglages (Q3). Il attend les amendements du
  spec § 12 (différer ou abandonner, condition revérifiée, nouveaux types, sujet « Popote et le foyer », état
  `indisponible`), écrits dans le plan d'API de ce monde.
- **Le plan de l'IA** : Q7 dépend de son amendement (liste fermée des actions : couleur, sujets de notification),
  et du compteur de R7 pour Q6.
- **Les besoins R1 à R10 de la spec (§ 13, R3 supprimé)** : leur contrat et leur plan appartiennent au socle.
  Chaque tâche les cite ainsi : « R2, plan du socle ». Aucune tâche d'ici ne les code. Une tâche ne démarre que
  quand ses routes sont dans le contrat.
- **Les mondes « Semaine et Frigo », « Cuisiner » et « Budget »** : ce monde règle ce qu'ils lisent (objectifs,
  appareils, repas à remplir, produits, sujets de rappel) ; il ne touche à aucun de leurs écrans. La roue du
  budget ouvre le monde « Budget ». Leurs specs sont dans leurs branches, pas encore sur `main`.

**Ordre :** Q0, puis Q1, puis Q2 à Q6 (deux ou trois en parallèle), Q7, Q8, Q9, Q10. Une tâche, une demande de
fusion, 400 lignes visées ; les coupes prévues sont écrites (Q2, Q3, Q4, Q8, Q10).

## Règles valables pour chaque tâche

- Charger avant de coder les skills qui s'appliquent (`building-frontends`, `securing-code`, `handling-errors`,
  `protecting-personal-data`, `writing-tests`, `writing-commits`, `opening-pull-requests`).
- Les textes de l'écran sont ceux de la spec, au mot près. Un texte qui manque se demande, il ne s'invente pas.
- **L'écran ne calcule rien, sauf « Aide-moi à choisir » (Q2b)** : les lignes d'état des cartes, « Un repas :
  environ… », la date d'effet d'un objectif, l'état de l'abonnement aux notifications, ce que Popote a compté, les
  durées de conservation, les objectifs et jauges de l'autre viennent de l'API. L'écran ne compare aucune date à
  l'heure de l'appareil. L'état d'un appareil pour les notifications **combine la permission du navigateur, lue
  sur place, et l'abonnement, rendu par l'API**.
- Les noms de produits, les lignes de « ce que j'ai retenu », les faits de Popote, le nom du foyer, les prénoms et le
  texte d'un signalement (et son image) sont des données non fiables : rendus comme du texte, jamais comme du HTML,
  jamais envoyés par l'écran à un modèle ; les phrases de Popote arrivent en segments typés (spec « Aujourd'hui »
  § 6).
- **Rien de ce monde ne reste dans le navigateur au-delà de l'écran** : ni stockage local ou de session, ni
  IndexedDB, ni cache du service worker pour les réponses de l'API. **Trois exceptions, nommées dans le test :** le
  cookie de session, le précache de l'application, l'abonnement aux notifications que le navigateur tient lui-même.
  Un test le vérifie après chaque scénario. Le poids et les deux réponses d'« Aide-moi à choisir » ne vivent que dans
  la mémoire de l'écran et ne partent dans aucune requête ; le texte d'un signalement en cours ne va pas plus loin
  que l'écran.
- **Les bornes et les pas des jauges, les limites d'usage de Popote et leurs retours, les durées de garde et le nom
  du service extérieur ne s'écrivent jamais dans l'écran** : ils viennent de l'API (R2, R7, R10). L'écran n'écrit
  aucun plafond d'usage, même en exemple. Le seul module qui écrit des nombres de calcul est celui d'« Aide-moi à
  choisir » (coefficients, planchers, bornes du compteur de poids), testé contre les exemples de la spec ; il lit les
  bornes de l'objectif dans R2.
- Une lecture en échec n'est jamais montrée comme « Pas encore réglé », « Aucun bug signalé » ou une liste vide.
- Aucune couleur, taille, rayon ni durée en dur : tout vient des jetons. Les six couleurs de membre et les couleurs
  des six cartes sont celles du système. Aucun composant hors de `.design/systeme/` : ceux qui manquent sont ajoutés
  d'abord, par Q0.
- Chaque écran est livré en 390 px et en 1440 px, avec ses états de la spec. En 390 px, sa capture Playwright est
  posée à côté de la capture de référence. En 1440 px, les réglages suivent la règle du § 15 de la spec et sont
  relus à l'œil.
- Chaque écriture suit la politique de mutation d'« Aujourd'hui » (spec § 5) : clé d'opération, cible et version
  explicites, les trois cas en attente, incertain, refusé, avec leurs tests. Un interrupteur ne change d'état qu'à
  la réponse de l'API ; en attente, il le dit. Deux appuis de suite ne font qu'une écriture.
- Tout changement sans changement d'écran est annoncé dans une région `status` ; le focus suit la spec § 15 : le
  titre de l'écran après « Oui » (objectifs), l'interrupteur lui-même, la ligne suivante (ou le titre) après une
  croix de « ce que j'ai retenu », sa ligne dans « Mes signalements » après « Envoyer », le bouton d'origine
  après la fermeture d'une feuille. Une poignée a son équivalent aux flèches ; cibles de 44 px au moins.
- Les points de la spec § 14 (R-C1 à R-C13) sont retenus tels quels (décision du propriétaire, 13/11/2026, et ses
  décisions du 14/11). Il les relira : un point qu'il change rouvre la tâche concernée. Les hypothèses R-A1 (voix)
  et R-A2 (limites d'usage) sont à lever par le socle avant Q6.
- Les doubles de test (faux service de push, assistant aux réponses fixées) n'existent qu'en local et en CI ; une
  horloge figée n'existe que dans les tests. Aucun n'est atteignable dans l'environnement réel.

---

### Q0 : Étendre le système de design

**Pourquoi :** le système « Jeu » (`.design/systeme/composants.css`) n'a ni interrupteur, ni curseur à poignée,
ni sélecteur de six couleurs, ni champ fichier, ni tableau ; sa « jauge » est une jauge d'affichage. **Dépend de :**
F5b, F12. **Précède :** Q2, Q3, Q5, Q6, Q8, Q9.

- [ ] L'interrupteur (états : éteint, allumé, en attente avec « Annuler », désactivé), le curseur à poignée (nom,
  valeur lue, bornes, flèches, champ pour taper), le sélecteur de six couleurs (une couleur prise grisée), le champ
  fichier (image choisie, montrée, retirable), le tableau (en-têtes, lignes, version étroite).
- Tests : chaque composant au clavier, au lecteur d'écran, en mouvement réduit, avec ses jetons ; une capture par
  état.

### Q1 : Les réglages et leurs cartes

**Pourquoi :** spec § 3, § 4. **Dépend de :** H2, F5b, F12, F14, Q0 ; R1, plan du socle.

- [ ] Les routes de la carte du § 3 (coquilles des neuf écrans, une frontière d'erreur par route) ; l'avatar de
  l'en-tête de l'accueil ouvre `/reglages` ; « Régler » et « M'y emmener » d'« Aujourd'hui » mènent à
  `/reglages/objectifs`, la page « Bientôt » disparaît.
- [ ] L'en-tête (avatar, prénom, « Foyer Sam et Léa », les deux avatars), la bulle « Tout se règle ici. Ou
  dis-le-moi, je le fais. », les six cartes de deux par ligne avec leur couleur et la ligne d'état rendue par
  l'API, le point jaune « À régler », le point vert de « Aide et bugs » jusqu'à ce qu'on l'ouvre, les trois lignes
  « Mon compte », « Mes données », « À propos ».
- Tests : chaque ligne d'état du tableau du § 4 (dont « Sur cet appareil », « À réactiver », « Coupées », « 2 200 kcal
  · 160 g dès demain », « Une place libre », « 1 signalement en cours ; 1 bug réparé » : les deux quand elles
  coexistent) ; une carte « À régler » porte son point ; le point vert disparaît à l'ouverture de la carte et ne
  revient pas au rechargement ; un foyer d'une personne et une personne sans foyer (cartes absentes,
  `/reglages/donnees`, notifications et aide atteignables sans renvoi vers `/sans-foyer`) ; une lecture en échec
  n'affiche aucune ligne inventée ; le nom du foyer absent donne « Sam et Léa » ; la page « Bientôt » n'est plus
  atteignable ; tout au clavier.

### Q2 : Mes objectifs et « Aide-moi à choisir »

**Pourquoi :** spec § 5, § 5.1. **Dépend de :** Q0, Q1, F13, F15, H5 ; R2, plan du socle. **Coupe prévue :** les
deux jauges et l'enregistrement (Q2a) ; « Voir ceux de Léa » (Q2b) ; « Aide-moi à choisir » (Q2c).

- [ ] **Q2a.** Les deux jauges à poignée (bornes et pas lus de l'API : aujourd'hui énergie de 1 200 à 4 000 kcal
  par pas de 50, protéines de 40 à 250 g par pas de 5), le champ pour taper la valeur, les flèches, la ligne « Un
  repas : environ 770 kcal et 56 g. » rendue par l'API ; la bulle « Tes objectifs. Rien d'autre à suivre :
  l'énergie et les protéines. » ; les trois pastilles « Aide-moi à choisir », « Comme avant » (remet les jauges aux
  valeurs enregistrées, celle en attente comprise), « Voir ceux de Léa ».
- [ ] **Q2a.** « Enregistrer » : la bulle « 2 200 kcal et 160 g, à partir de demain ? Les jours passés gardent
  l'ancien objectif. » (« dès aujourd'hui ? » la toute première fois), « Oui » (tampon « Réglé », confettis) et
  « Non ». Sans objectifs : jauges à 2 000 kcal et 100 g, grisées, « Pas encore réglés », rien d'écrit avant
  « Enregistrer ».
- [ ] **Q2b.** « Voir ceux de Léa » : l'écran en lecture seule (« Les objectifs de Léa. 1 900 kcal · 110 g », son
  changement en attente « dès demain », ses deux jauges du jour), sans poignée ; « Léa n'a pas encore réglé les
  siens. » ; la pastille absente quand la personne est seule.
- [ ] **Q2c.** « Aide-moi à choisir », **calculé dans le navigateur par un module unique** : les trois questions (tu
  veux, tu bouges, ton poids de 35 à 200 kg), « Trois questions, et je propose. Je ne garde pas tes réponses. Ce
  calcul est fait pour les adultes. », la proposition « Je propose 2 200 kcal et 150 g. C'est un repère pour un
  adulte, pas un avis médical. », avec « C'est le minimum que je propose. » ou « C'est le maximum que je propose. »
  quand une borne a joué, « Je prends » (règle les jauges, reste à enregistrer), « Je règle moi-même ». Aucune
  requête n'est envoyée pendant ce parcours.
- Tests Q2a : 1 150 kcal et 255 g refusés par le serveur, avec « Entre 1 200 et 4 000 kcal. » (bornes lues de
  l'API) et la poignée ne sort pas des bornes (critère 3) ; les pas et le clavier (« Énergie, 2 200 kilocalories
  par jour ») ; « Comme avant » rend les valeurs enregistrées ; « Non » n'écrit rien ; double appui sur « Oui » ;
  l'effet au lendemain est dit par l'API, jamais calculé (critère 2) ; la première fois, dès aujourd'hui (21) ; un
  second changement le même jour remplace le premier, « Comme avant » rend le dernier (22) ; 23 h 58 puis 0 h 02,
  quel que soit le fuseau du téléphone (23) ; la carte dit « dès demain » (2) ; mouvement réduit (tampon sans
  confettis).
- Tests Q2b : Sam voit les objectifs de Léa sans poignée, ne peut rien écrire (critère 41) ; Popote ne répond pas sur
  les objectifs de Léa ; la pastille disparaît quand Léa est partie (34).
- Tests Q2c : 82 kg, « un peu », « perdre un peu » donne 2 200 kcal et 150 g, rien n'est écrit avant « Enregistrer »
  (4) ; 40 kg « Peu » « Tenir » donne 1 200 kcal avec le minimum dit (24) ; 40 kg « Peu » « Perdre » ne dépasse pas
  1 200 (48) ; 150 kg « Beaucoup » « Muscle » donne 4 000 kcal et 250 g avec le maximum dit (5 775, arrondi à
  5 800) (25) ; 2 150 donne 2 200 ; le compteur refuse 34 et 201 ; « je fais 82 kg » écrit à la feuille est une
  phrase comme une autre (26) ; **le banc enregistre toutes les requêtes du parcours, avec la valeur sentinelle 137 kg
  : aucune ne la porte, ni les réponses (27)**, et le stockage du navigateur n'en garde rien.

### Q3 : Les notifications

**Pourquoi :** spec § 6, § 12. **Dépend de :** Q0, Q1 ; R4, plan du socle ; N11 et N12 du plan des notifications.
**Coupe prévue :** la carte de l'appareil et « Comment faire » (Q3a) ; les sujets, le ton et la plage (Q3b) ;
l'essai et « Les derniers envois » (Q3c).

- [ ] **Q3a.** La carte de cet appareil et ses six états (« Activées ici », « Je te préviens ici ? », « Tu as dit non à
  ton téléphone. », « Sur iPhone, installe d'abord Popote… », « Ce navigateur ne sait pas envoyer de
  notifications. », « À réactiver ») avec leur bouton, l'état combinant la permission du navigateur et
  l'abonnement de l'API ; « Comment faire » (trois cas : refus dans le téléphone, iPhone sans appli installée, mode
  Concentration, textes du § 6) ; la phrase « Plus d'appareil activé. Tu ne reçois plus de rappel. » quand le
  dernier s'éteint. **Pas d'interrupteur « Par mail » : il n'existe pas en v1.**
- [ ] **Q3b.** Les quatre sujets à interrupteur avec leur exemple (Frigo, Semaine, Budget, Popote et le foyer) et,
  dessous, la ligne d'information « Cuisine : toujours, pendant une session. » sans interrupteur ; la phrase
  « L'accès à ta banque te préviendra quand même : sans lui je ne lis plus rien. » à la coupure de « Budget » ; « Ne
  pas déranger » de 22 h à 8 h, fixe, dite en une ligne, sans réglage ; les huit textes d'exemple du § 6, un ou
  deux par famille ; la phrase « Jamais d'argent sur ton écran verrouillé : ni montant, ni libellé de banque. »,
  sans interrupteur. **Aucun interrupteur « Montrer le prénom ».**
- [ ] **Q3c.** « Envoyer un essai », la bulle « Reçu ? » avec « Oui » et « Non, rien » (qui ouvre « Comment faire »),
  « Les derniers envois » (les trois derniers jours : jour, heure, sujet, jamais le texte ; « Rien ces trois derniers
  jours. » quand c'est vide).
- Tests : chaque état de l'appareil, dont iPhone sans installation (critère 10), un PC avec Chrome ou Firefox qui
  active (49), un navigateur sans notifications ; l'abonnement refusé (404, 410) donne « À réactiver » puis
  « Plus d'appareil activé. », sans mail (28) ; l'interrupteur ne bascule qu'à la réponse de l'API et dit
  « en attente » ; couper « Budget » ne touche pas les réglages de Léa (deux navigateurs, critère 7) ; la ligne
  « Cuisine » n'a aucun interrupteur (37) ; le sixième essai de l'heure est refusé avec « Tu as déjà fait cinq
  essais cette heure-ci. » ; le texte de l'essai est « Notification d'essai : Popote peut te prévenir sur cet
  appareil. » ; le tableau « rappel par rappel » du § 6 est rendu tel quel (différé, abandonné, passe) ; les
  limites 7 h 59, 8 h 00, 21 h 59, 22 h 00 (8) ; deux appuis rapides sur un interrupteur ne font qu'un changement
  (33) ; « Non, rien » mène à « Comment faire » ; aucun montant, aucun libellé de banque, aucun objectif ni jauge,
  aucun nom de foyer dans un rappel, et aucun interrupteur de prénom (9, 43) ; la liste vide ; deux téléphones
  pour le même membre ; la coupure du réseau pendant un essai ; une personne sans foyer active, envoie un essai et
  lit ses envois (34) ; clavier et lecteur d'écran (« Budget, interrupteur, activé »).

### Q4 : La cuisine et « ce que j'ai retenu »

**Pourquoi :** spec § 7. **Dépend de :** Q0, Q1, H6 ; R5, plan du socle. **Coupe prévue :** les appareils, le
complément, les repas et « Nos produits » (Q4a) ; « Ce que j'ai retenu », foyer et personne (Q4b).

- [ ] **Q4a.** « Mes appareils » : une pastille par appareil du catalogue, allumée si le foyer l'a, avec ce qu'il
  prend à la fois (« Four · 2 plats », « Plaques · 4 feux ») ; « … » règle ce nombre de 1 à 8. « Le complément »
  (« Skyr · 10 g de protéines pour 100 g », « Changer », « Aucun »). « Les repas à remplir » : « Les soirs », « Les
  midis ». « Nos produits » : le nom, les valeurs, l'unité ; toucher une ligne la corrige ou la retire (sauf le
  complément : « C'est ton complément. Choisis-en un autre d'abord. »).
- [ ] **Q4b.** « Ce que j'ai retenu » : « 6 choses » (nombre de l'API) et « Voir » ; deux parties. *De vous* : la
  bulle « Voilà ce que j'ai appris de vous. Retire ce qui est faux. » ; les lignes par genre (pièce, aliment d'un
  mot, contenant, cuisson rallongée, étiquette de banque, ordre des rayons), chacune avec sa croix ; « Oublié. Je te
  le redemanderai. » avec « Annuler » pendant 10 secondes ; la seule ligne « Vos durées en cuisine » avec « Tout
  oublier » ; « Tout oublier » de l'ordre des rayons. *De toi* : « Voilà ce que je sais de toi. Corrige ou retire ce
  qui est faux. », les faits (« N'aime pas : les champignons ») et les habitudes, chacun lisible, corrigeable,
  supprimable, et « Tout oublier de moi » ; « Rien d'appris pour l'instant. » et « Je n'ai encore rien retenu. »
  quand c'est vide.
- Tests : éteindre le four n'écrit que le foyer et l'autre membre le voit (deux navigateurs, critère 11) ; éteindre
  le four pendant une session ne réécrit pas ce réglage ; le nombre refuse 0 et 9 ; « Aucun » comme complément ; un
  produit sans protéines connues n'est pas proposé comme complément ; retirer le produit-complément est refusé
  (39) ; retirer un produit ne change rien à ce qui est déjà noté ; un nom de produit ou un fait contenant du HTML
  est affiché tel quel ; la croix d'une ligne puis « Annuler » dans les 10 secondes, puis après (la ligne reste
  oubliée) ; oublier n'agit que sur les recettes à venir ; double appui sur la croix ; le focus passe à la ligne
  suivante, ou au titre ; « Un pot, c'est 125 g » retiré (12) ; les faits de Sam sont lisibles, corrigeables,
  supprimables, et Léa ne les voit pas (47) ; liste vide ; une lecture en échec n'affiche pas « 0 chose ».

### Q5 : Notre foyer

**Pourquoi :** spec § 8. **Dépend de :** Q0, Q1, F12, E4 ; R6, plan du socle.

- [ ] Le nom : le crayon, le champ « Le nom du foyer » (de 1 à 40 caractères, une ligne, texte brut, sans lien ni
  caractère de contrôle), « Enregistrer », « Effacer le nom » ; sans nom, « Sam et Léa » ; deux renommages en même
  temps : « Le nom vient de changer. ».
- [ ] La couleur de chacun : toucher un avatar ouvre les six pastilles de membre ; la couleur prise est grisée ;
  deux appuis en même temps : « Léa vient de prendre cette couleur. » et la grille se met à jour (critère 32) ; le
  changement vaut partout ; chacun peut changer la couleur de l'autre ; un nouvel arrivant reçoit la première
  couleur libre.
- [ ] Les membres : « Inviter quelqu'un » mène à `/foyer`, grisé à deux avec « Vous êtes deux, le foyer est
  complet. » ; « Quitter le foyer » mène à `/compte/partir` ; le prénom se change dans « Mon compte ».
- Tests : un nom vide, de 41 caractères, de 1 caractère, avec du HTML (affiché tel quel), avec un lien ou un sens
  d'écriture (refusé) (50) ; une couleur prise est refusée même si l'autre la prend entre-temps (`409
  couleur_prise`, rien d'écrit) ; l'accueil et la semaine montrent le nouveau nom et la nouvelle couleur (13) ; la
  couleur de Léa ne peut pas être choisie par Sam quand elle est la sienne ; le foyer d'une personne (« Une place
  libre », bouton actif, « Voir ceux de Léa » et la grille de l'autre absents, « Supprimer mon compte » à la place
  de « Quitter le foyer », critère 34) ; le mail d'invitation ne porte pas le nom du foyer (50) ; double appui sur
  « Enregistrer » ; focus et lecteur d'écran sur les six pastilles.

### Q6 : Popote et moi

**Pourquoi :** spec § 9.1 à § 9.3. **Dépend de :** Q0, Q1, F13, H7 ; R7, plan du socle ; R-A1 et R-A2 levées.

- [ ] « Voilà ce que tu m'as demandé. » : **le compteur que rend l'API** (le reste d'aujourd'hui et son retour à 6 h,
  le reste du mois et son retour le 1er, la limite qui bloque), sans aucun plafond écrit dans l'écran ; la phrase
  qui dit que l'usage est celui du foyer, partagé par les deux ; jaune au seuil de l'API, rose plein avec son retour
  (« Je reviens à 6 h. », « Ça repart le 1er. ») ; l'exemple « Il te reste 7 inventions ce mois-ci » n'est qu'une
  illustration de la forme du texte.
- [ ] Sa voix : « Popote parle » et « Écouter » (« Bonjour Sam ! »), avec la voix que le socle confirme (modèle
  vocal, sinon voix de l'appareil, sinon la ligne grisée « Pas disponible sur cet appareil. ») ; « Mains libres en
  cuisine », éteint au départ, avec la phrase de « Cuisiner » § 11.5 à l'identique (« Ton appareil écoute tant que
  cet écran est ouvert, et son service de dictée peut recevoir ce qu'il entend. Popote, elle, n'en garde rien. »),
  réglage de cet appareil, absent si l'appareil ne le permet pas.
- [ ] « Ce que je sais de toi » : la page en deux listes (ce que Popote lit dans l'appli ; ce qui part au service
  extérieur, jamais le prénom, l'adresse, le nom du foyer, les objectifs de l'autre ni le poids), la phrase « Ce
  service est extérieur à Popote. Il s'appelle {nom de l'API}. Aujourd'hui, il est aux États-Unis. » (et le service
  de voix s'il y en a un) et les liens vers « Ce que j'ai retenu » et « Mes données ».
- Tests : l'écran montre exactement ce que rend l'API, aucun chiffre de limite n'est écrit dans le code du front
  (14) ; le seuil est appliqué en un seul endroit ; la couleur n'est jamais le seul signe, le chiffre est écrit ; un
  reste à zéro ; « Mains libres » absent sans micro ; « Popote parle » ne bascule qu'à la réponse de l'API ; « Écouter »
  sans voix disponible (45) ; la page « ce que je sais » a deux listes sans élément commun et dit que ni le prénom,
  ni l'adresse, ni le nom du foyer, ni les objectifs de Léa, ni le poids ne partent, que le texte libre part, et que
  le service est extérieur (nom de l'API, États-Unis) (40) ; limite du jour atteinte : « J'ai atteint ma limite pour
  aujourd'hui. », plus de réglage à la voix, jauge du mois non pleine (35) ; les jours et les mois comptent à Paris ;
  une lecture en échec.

### Q7 : Régler en parlant

**Pourquoi :** spec § 9.4. **Dépend de :** Q2, Q3, Q4, Q5, H5 ; R8, plan du socle ; **amendement du plan de l'IA
(liste fermée des actions)**.

- [ ] Le bloc « réglage » dans la feuille de Popote : « Énergie : 2 200 kcal au lieu de 2 400, à partir de
  demain. » avec « Valider » et « Modifier », validé au toucher seulement et écrit par le serveur d'après l'action
  typée ; un bloc par réglage de la liste fermée (ses objectifs, un sujet de notification, les repas à remplir, sa
  couleur) ; les phrases ambiguës du § 9.4 (« ne me dérange pas ce soir », « coupe les notifications », « mets-moi en
  vert »).
- [ ] Pour quitter, supprimer, retirer, inviter, la banque, **le nom du foyer, les appareils** et les objectifs de
  l'autre : aucun bloc, Popote mène à l'écran concerné (« on a un autocuiseur » mène à « Mes appareils »).
- Tests : rien ne change avant « Valider », ni après « Modifier » seul, ni après un « oui » dit (critère 15) ;
  un texte de recette contenant une consigne ne change pas le récapitulatif ; « mets-moi 2 200 kcal » (15) ;
  « supprime mon compte » ne supprime rien et mène à `/compte/partir` ; « règle les objectifs de Léa » ne règle rien ;
  « renomme le foyer » et « on a un autocuiseur » ne créent aucun bloc ; un bloc d'un type hors de la liste n'est pas
  affiché ; double appui sur « Valider » ; le bloc « Valider » après un changement fait entre-temps sur l'écran
  (conflit, rien d'écrit) ; les trois cas de la politique de mutation ; le même réglage dit et fait à l'écran
  donne le même état.

### Q8 : Aide et bugs, signaler un bug

**Pourquoi :** spec § 10, § 10.1, § 10.2, § 12. **Dépend de :** Q0, Q1, F18 à F21 (amendées), H5 ; R9, plan du
socle. **Coupe prévue :** les deux tuiles et le texte d'un signalement (Q8a) ; l'image et le récapitulatif (Q8b) ;
« Mes signalements » (Q8c).

- [ ] **Q8a.** Les deux tuiles : « Une question » (ouvre la feuille de Popote) et « Signaler un bug ». Les trois entrées
  du même parcours : la tuile, « j'ai un bug » dit à Popote, le lien « Signaler » d'un écran d'erreur (il remplit
  seul l'écran et l'erreur). « Mince ! Raconte-moi. Qu'est-ce qui s'est passé ? » (de 5 à 1 000 caractères).
- [ ] **Q8b.** Le récapitulatif en ticket (ce que tu as dit, l'écran, ton appareil, la version lue dans
  `version.json`, les dernières erreurs par leur numéro, « Joindre une image de ton écran », un choix sur
  l'appareil, jamais fait d'avance), « Voilà ce que j'envoie, à celui qui répare Popote seulement : », « Ne part que
  ce que tu écris ou joins. », « Celui qui répare Popote le lit avec ses propres outils. », « Envoyer » et
  « Modifier » ; l'enveloppe, le tampon « Envoyé », « Merci ! Je te dis quand c'est réparé. » ; l'avertissement
  « Une capture peut montrer tes repas ou ton budget. », l'image choisie montrée avant l'envoi et retirable ;
  l'écran ne prend aucune capture lui-même ; une seule image, JPEG ou PNG, 2 Mo au plus (refus dit avant l'envoi) ;
  envoi multipart.
- [ ] **Q8c.** « Mes signalements » : la liste, le plus récent en haut, avec son début, son état (« reçu,
  aujourd'hui », « vu le 14 novembre », « réparé le 9 novembre » avec une coche verte, « fermé le 9 novembre » et le
  mot du propriétaire, « fermé le 9 novembre, texte effacé » après 90 jours) et sa date ; toucher une ligne montre ce
  qui a été envoyé et permet « Ajouter un mot » (de 1 à 1 000 caractères, 20 mots au plus) tant qu'il n'est ni
  réparé ni fermé ; Réparé et Fermé sont définitifs ; « Aucun bug signalé. Tant mieux ! » ; le onzième du jour :
  « C'est noté pour aujourd'hui. Reviens demain, ou ajoute un mot à un signalement en cours. » ; le sixième ouvert :
  « Tu as déjà cinq signalements en cours. Ajoute un mot à l'un d'eux, ou attends qu'il soit traité. »
- Tests : 4 caractères refusés, 5 acceptés, 1 000 acceptés, 1 001 refusés ; l'image n'est jamais choisie d'avance
  (critère 16) ; un fichier ni JPEG ni PNG, un fichier de plus de 2 Mo, une seconde image sont refusés avant
  l'envoi (30) ; ce qui est montré avant l'envoi est exactement ce qui part (une seule source, comparée dans le
  test) ; l'écran n'ajoute à la requête d'envoi ni montant, ni repas, ni libellé de banque, ni prénom autre que
  celui de la personne ; le signalement apparaît « reçu » dans la liste avec le focus sur sa ligne ; double appui sur
  « Envoyer » (un seul signalement) ; envoi incertain après coupure du réseau, puis rejeu sans doublon ; Léa ne voit
  pas les signalements de Sam (deux navigateurs, critère 17) ; le onzième du jour et le sixième ouvert sont refusés
  avec leur phrase (46) ; « Ajouter un mot » absent sur « Réparé » et « Fermé » ; un texte contenant du HTML ou
  une consigne est affiché tel quel et n'est envoyé par l'écran à aucun modèle (31) ; aucun écran ne montre les
  signalements de tous ; le passage à « Réparé » allume le point vert de la carte et le rappel « Un bug que tu as
  signalé est réparé. » est celui de la spec, et « Fermé » envoie « Ton signalement a une réponse. » (critère 18) ;
  une personne sans foyer envoie un signalement (34) ; liste vide ; lecture en échec.

### Q9 : Mes données et À propos

**Pourquoi :** spec § 11. **Dépend de :** Q0, Q1, E6 ; R10, plan du socle.

- [ ] « Mes données » : « Tes données sont à toi. Les voilà. » ; le tableau « la chose, combien de temps, si tu
  supprimes ton compte » rendu par l'API (aux durées du § 11, dont 1 an pour les opérations de la banque et la
  mention « puis des sauvegardes sous 30 jours ») ; « Télécharger mes données » (la barre, puis « Prêt :
  mes-donnees.zip »), avec la phrase qui dit la liste fermée de ce que le fichier contient (à la personne ; ce
  qu'elle lit du foyer et de l'autre ; jamais ce qui n'est lisible que par l'autre) ; « Supprimer mon compte » mène
  à `/compte/partir`.
- [ ] « À propos » : la version (de `version.json`), « Quoi de neuf » (les trois dernières nouveautés, une phrase
  chacune), les licences des polices et des images.
- Tests : le tableau vient de l'API, aucune durée n'est écrite dans l'écran (critère 19) ; le téléchargement rend
  le fichier ; une preuve récente est exigée avant le téléchargement (« Entrer » § 5, E6), refus sans elle ; le
  zip de Sam ne contient rien de ce qui n'est lisible que par Léa (critère 29) ; `/reglages/donnees` s'ouvre sans foyer
  et rend l'archive de départ ; un téléchargement en échec puis relancé ; deux appuis ne lancent qu'une préparation ;
  moins de trois nouveautés ; une lecture en échec n'affiche pas un tableau vide.

### Q10 : Sur PC, les scénarios au clic et les captures

**Pourquoi :** spec § 15, § 16. **Dépend de :** toutes les tâches. **Coupe prévue :** le PC (Q10a) ; les
scénarios 1 à 17 (Q10b) ; les scénarios 18 à 34 (Q10c) ; les scénarios 35 à 50, les captures et la clôture (Q10d).

- [ ] Sur PC (à partir de 900 px) : à gauche la liste des six sujets et des trois lignes,
  au centre le sujet ouvert, Popote à droite ; le sujet ouvert reste le même au passage de 899 à 900 px.
- [ ] Un scénario Playwright par critère d'acceptation (1 à 50), sur l'environnement d'essai (horloge de serveur
  figée, assistant aux réponses fixées et faux service de push : **en local et en CI seulement**, jamais atteignables
  en production), et deux navigateurs pour les scénarios à deux (7, 13, 14, 17, 18, 29, 32, 34, 41, 47).
- [ ] Pour chaque écran et chaque état : une capture en 390 px posée à côté de sa référence (critère 20, écart
  de pixels de 1 % au plus) ; en plus, à 320 px, en zoom 200 %, au clavier seul, avec `prefers-reduced-motion`, et
  un passage axe sans violation. Un test vérifie après chaque scénario qu'il ne reste rien dans le navigateur hors
  les trois exceptions nommées (cookie de session, précache, abonnement aux notifications).
- [ ] Au lecteur d'écran, à la main, avec VoiceOver et Safari sur iPhone, puis NVDA et Firefox sur PC, trois
  parcours et leurs annonces attendues :
  1. Régler ses objectifs : « Énergie, 2 200 kilocalories par jour, curseur » ; la bulle « 2 200 kcal et 160 g, à
     partir de demain ? Les jours passés gardent l'ancien objectif. », « Oui, bouton » ; après l'appui, le focus
     sur le titre de l'écran et l'annonce « Réglé ».
  2. Couper un sujet : « Budget, interrupteur, activé » ; après l'appui, le focus sur l'interrupteur et
     l'annonce « L'accès à ta banque te préviendra quand même : sans lui je ne lis plus rien. ».
  3. Signaler un bug : « Mince ! Raconte-moi. Qu'est-ce qui s'est passé ? » ; « Voilà ce que j'envoie, à celui qui
     répare Popote seulement : », « Envoyer, bouton » ; après l'appui, le focus sur sa ligne dans « Mes
     signalements » et l'annonce « Merci ! Je te dis quand c'est réparé. ».
- [ ] Revue adverse du monde entier par un agent à l'œil frais ; mise à jour de `docs/ETAT.md`.
