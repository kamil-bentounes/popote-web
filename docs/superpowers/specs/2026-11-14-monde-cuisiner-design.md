# Le monde « Cuisiner » : la spec

Quatrième parcours de la nouvelle appli. Il couvre la cuisine en lot : composer un menu, ajouter ou inventer une
recette, faire les courses, calculer le meilleur ordre des gestes, cuisiner pas à pas à une ou plusieurs
personnes, puis dresser et ranger les parts.

- **Style :** le système « Jeu » (`.design/systeme/`). Aucun composant hors de ce système.
- **Prototype de référence :** `.design/cuisiner/prototype.html` (film et moments rejouables) et ses captures dans
  `.design/cuisiner/captures/`. Le prototype fait foi pour le dessin et le mouvement, cette spec fait foi pour les
  textes, les états, les règles de calcul et les données.
- **Côté API :** rien n'existe encore pour ce monde. Le § 17 liste ce que l'écran attend (K1 à K17) ; le contrat et
  le plan technique appartiennent au socle, comme le choix des modèles d'IA.
- **Ce qui est repris d'« Aujourd'hui »** (`2026-11-13-parcours-aujourdhui-design.md`), sans être redit : la barre
  « Parle-moi, ou écris », la feuille de Popote et ses blocs typés (§ 6), le mode vocal (§ 7), la politique de
  mutation (§ 5 : en attente, incertain, refusé), la règle « le modèle ne reçoit jamais ce que la personne ne peut
  pas voir » (§ 6).
- **Exemple suivi dans toute la spec :** « Sam » et « Léa » forment le foyer ; Sam tient le téléphone. Ils
  cuisinent 10 parts : des lasagnes aux épinards et ricotta (4 parts), un curry de poulet au lait de coco
  (4 parts) et un gratin de chou-fleur (2 parts). Les personnes, les recettes et les montants sont inventés.

## 1. Décisions du propriétaire (13 et 14/11/2026)

| Sujet | Décision |
|---|---|
| Une session à tout moment | Lancer une session est toujours possible, quel que soit l'état de la semaine ou du frigo. |
| Repenser de zéro | L'ancienne appli n'est qu'un inventaire de ce qu'il faut couvrir : aucun écran n'est repris. |
| Popote au cœur | Popote propose le menu, lit et invente les recettes, mène la cuisine, répond à tout. |
| Valider à chaque étape | Popote récapitule ce qu'elle a compris, dit ce qui lui manque, et la personne valide ou corrige. Partout. |
| L'exigence | L'optimisation des étapes, la création de recettes et l'organisation de la session sont le cœur du monde : elles se spécifient au niveau de détail le plus haut. |
| Les recettes | Une fiche par recette, avec sa photo ; les listes avancent par dix. |
| Les foyers amis | Plus tard : hors de ce monde. |
| Le prototype | Construit le 14/11/2026 avec la spec, à la demande du propriétaire ; il le relit ensuite, et ce qu'il change rouvre la spec. |

## 2. Hors périmètre

- Les repas de la semaine et le frigo (parcours « Semaine et Frigo ») : ce monde **crée** les barquettes et propose
  de les placer ; il ne gère ni la semaine ni le stock : il ne les lit que pour proposer et compter, et n'écrit
  au placard que ce que les courses y entrent (§ 9.2) et ce que la session en retire (§ 12.4).
- Cuisiner avec un autre foyer, partager une recette avec des amis, les recettes « publiques ».
- L'ingestion du catalogue commun (les recettes relevées sur des sites) : une tâche d'opérateur, côté socle.
- Commander les courses en ligne, comparer les magasins, tenir plusieurs magasins : le foyer a **un** ordre de
  rayons, celui de son magasin habituel ; ce qu'il achète ailleurs se coche dans la même liste.
- Un minuteur hors session, un mode « recette seule » sans session : une recette se cuisine toujours dans une
  session, même d'une seule recette pour une seule part.
- Les rappels et leur réglage : la spec des notifications. Le § 16 dit seulement ce que ce monde lui demande.

## 3. Carte du monde

| Adresse | Écran | Quand |
|---|---|---|
| `/cuisiner` | L'entrée du monde (§ 5) | toujours |
| `/cuisiner/session/:id` | La session, à son étape en cours (§ 4) | une session ouverte |
| `/cuisiner/session/:id/menu` | Le menu (§ 6) | jusqu'à « C'est parti ! » |
| `/courses` | La liste de courses du foyer (§ 9) | toujours |
| `/cuisiner/session/:id/plan` | Le plan (§ 10) | session prête |
| `/cuisiner/session/:id/cuisine` | En cuisine (§ 11) | session en cuisine ou en pause |
| `/cuisiner/session/:id/ranger` | Dresser et ranger (§ 12) | session à ranger |
| `/recettes` | Les recettes (§ 7) | toujours |
| `/recettes/:id` | La fiche d'une recette (§ 7.2) | toujours |
| `/recettes/ajouter` | Ajouter une recette (§ 8) | toujours |

- La tuile Cuisiner de l'accueil ouvre `/cuisiner`. Une adresse de session ouverte à une étape qui n'est pas la
  sienne redirige vers l'étape en cours : aucun écran n'agit sur une session dans un état qui n'est pas le sien.
- En haut d'une session, quatre étapes : **Menu**, **Courses**, **Cuisine**, **Rangement**. L'étape en cours est
  jaune, une étape faite est verte. Toucher une étape faite y revient tant que la cuisine n'a pas commencé.
- La barre « Parle-moi, ou écris » est sur chaque écran. En cuisine, elle devient la barre « mains libres »
  (§ 11.5).
- Le jour et l'heure viennent de l'API, jamais de l'appareil, sauf le décompte d'un minuteur (§ 11.3).

## 4. Les mots et les règles

Toutes les quantités, les durées, les valeurs et le plan sont calculés par l'API ; ces règles disent ce qu'elle
rend.

### 4.1 Les mots

| Mot | Sens | Jamais |
|---|---|---|
| **Session** | une séance de cuisine en lot, du menu au rangement | cycle, semaine |
| **Part** | de quoi faire un repas pour une personne. Une recette est écrite « pour 4 parts » ; une session vise « 10 parts » ; le frigo compte des parts (« Aujourd'hui », § 4.5) | portion, « repas » pour compter (un repas est le moment où l'on mange) |
| **Barquette** | une part cuisinée et rangée : ce que la session produit | plat (qui désigne le plat entier, avant le dressage) |
| **Recette** | un plat qu'on sait cuisiner : ses ingrédients, ses étapes | |
| **Étape** | un geste de la session, avec sa durée | action, tâche |
| **Minuteur** | le décompte d'une étape qui se passe sans personne | |
| **Cuisinier** | une personne qui cuisine aujourd'hui | hôte, convive |


### 4.2 La session et ses états

| État | Ce que c'est | On en sort par |
|---|---|---|
| Menu | on compose : nombre de parts, recettes | « Ça me va », ou « On passe aux courses » ; si rien n'est à acheter, elle est tout de suite prête |
| Courses | il reste des articles à prendre pour elle | son dernier besoin couvert (§ 9.5), ou « J'ai fini » |
| Prête | tout est là | « C'est parti ! » |
| En cuisine | les étapes se font | la dernière étape, ou « Terminer quand même » |
| En pause | la cuisine est suspendue ; les minuteurs continuent | « Reprendre », ou « Arrêter la session » |
| À ranger | au moins une recette est cuite : on dresse et on range | « Tout ranger » |
| Rangée | les barquettes existent | fin |
| Arrêtée | arrêtée en cuisine sans aucune recette cuite | fin |
| Annulée | abandonnée avant la cuisine | fin |

- **Avant « C'est parti ! »**, tout se reprend : changer le menu depuis l'étape Courses met la liste à jour toute
  seule (§ 9.1) ; une session Prête dont on change le menu redevient « Courses » s'il manque un article.
- **Après**, on peut encore retirer une recette dont aucune étape n'est commencée ; on ne peut plus en ajouter.
- **Plusieurs sessions** peuvent être ouvertes en même temps (une pour dimanche, une petite ce soir). Une seule à
  la fois est « en cuisine », « en pause » ou « à ranger » par foyer : en lancer une seconde propose d'abord de
  finir la première.
- **Annuler** une session (avant la cuisine) : ses articles pas encore pris quittent la liste ; ceux déjà pris
  restent au placard. Une session rangée ne s'annule pas ; ses barquettes se gèrent dans le Frigo.
- Une session appartient au foyer : chaque membre la voit et y agit. Elle garde qui a fait quoi.
- **Pour quand.** Une session peut porter un jour (« c'est pour dimanche », dit à Popote, ou choisi dans « … ») :
  elle s'appelle alors « Session de dimanche » ; sans jour, « Session du 15 nov. », le jour où elle est née. Le
  jour ne bloque rien : on cuisine quand on veut.
- **Une session oubliée.** En cuisine sans aucun geste depuis 12 heures, et sans minuteur en cours, elle passe en
  pause toute seule (une étape « sans toi » de plusieurs heures ne la met donc pas en pause). Au menu,
  aux courses ou prête sans aucun geste depuis 14 jours, la bulle propose : « **Toujours d'actualité ?** » avec
  « Oui » et « Annuler la session ».
- **Les bornes.** Une session : 8 recettes au plus. Une recette : 60 ingrédients et 40 étapes au plus ; un titre de
  120 caractères, une ligne d'ingrédient de 200, une étape de 600.

### 4.3 Les parts et la mise à l'échelle

- La **cible** d'une session : un nombre de parts, de 1 à 40. Chaque recette retenue porte un nombre de parts, de
  1 à 20. Le compteur du menu dit « 8 / 10 parts ».
- Le **facteur** d'une recette = parts retenues ÷ parts de la recette. Il s'applique **partout** : aux quantités des
  ingrédients, à la liste de courses, à ce que la session prend au placard, aux quantités que chaque étape utilise
  (montrées au dos de sa carte, § 11.1 ; le texte d'une étape n'est jamais réécrit), aux durées (§ 4.5), aux
  places prises dans les appareils (§ 10.3), au poids du plat et aux valeurs des barquettes (§ 12).
- Une recette dont le nombre de parts n'est pas connu ne se retient pas : Popote le demande d'abord (« **Pour
  combien de parts est-elle écrite ?** »).
- Au-delà de 3 fois la recette, Popote prévient : « **C'est plus de 3 fois la recette.** Il faudra plusieurs
  plats. » Popote ne propose jamais elle-même plus de 3 fois une recette (§ 6.2).
- Les trois temps d'une fiche sont ceux de la recette telle qu'elle est écrite ; dans un menu et dans le plan, ils
  sont à l'échelle des parts retenues.

### 4.4 Une recette

| Élément | Ce qu'il porte |
|---|---|
| La recette | un titre, une photo, sa provenance (le catalogue commun et son site d'origine, « ajoutée par Sam », « inventée »), le nombre de parts, « se congèle » (oui, non, on ne sait pas), les appareils |
| Un ingrédient | la ligne telle qu'écrite, la quantité et son unité, l'aliment reconnu (toujours montré), son poids en grammes ; son état : **reconnu**, **à confirmer** (Popote hésite, ou n'est pas assez sûre), **combien ?** (un contenant ou une pièce dont elle ne connaît pas le poids), **assaisonnement** (sel, poivre, épices, herbes : sans quantité, il ne pèse rien dans les valeurs), **sans quantité** (un vrai ingrédient dont la quantité manque), **pas reconnu** |
| Une étape | son texte, un geste court à l'impératif (« Émince les oignons »), sa durée et d'où elle vient (**écrite** dans la recette, **estimée** par Popote, **dite** par une personne, **apprise** de vos sessions), sa nature, comment sa durée suit la quantité (§ 4.5), l'appareil, la température, ce dont elle dépend, et si elle est **enchaînée** à la précédente (« égoutte », après « fais cuire les pâtes » : pas plus de 2 minutes entre les deux) |
| Les valeurs par part | l'énergie, les protéines, les fibres, les glucides, les lipides, avec leur fourchette ; ou la raison de leur absence |

**La nature d'une étape**, dite avec les mêmes trois mots partout :

| Nature | Sens | Elle occupe |
|---|---|---|
| **Tes gestes** | on a les mains prises | un cuisinier (et l'appareil, s'il y en a un) |
| **À surveiller** | il faut rester à côté | un cuisinier et l'appareil |
| **Sans toi** | ça cuit, ça repose, ça refroidit seul | l'appareil seulement ; elle porte un minuteur |

**Trois temps** résument une recette : « N min pour toi » (la somme des étapes « tes gestes » et « à surveiller »),
« N min en tout » (du premier geste à la fin de la dernière étape, cuisinée seule), « pour N parts ».

**Les valeurs** viennent des aliments reconnus et de leurs poids, jamais d'un modèle. Une seule règle, partout :
elles s'affichent quand **chaque** ingrédient est soit reconnu avec un poids, soit un assaisonnement. Un seul
ingrédient « à confirmer », « combien ? », « sans quantité » ou « pas reconnu », et la fiche dit « **Valeurs
inconnues :** » suivi de la raison (« 2 ingrédients sans quantité »). Un poids qui vient d'une pièce (« 3
oignons ») donne une fourchette (« 480 à 540 kcal ») tant que le foyer n'a pas dit ce que pèse la pièce.

**Ce que le foyer apprend à Popote** vaut pour toutes ses recettes : l'aliment choisi pour un mot (« la crème,
c'est la crème liquide 30 % »), le poids d'un contenant **pour cet aliment** (« un pot de crème, c'est 125 g » ;
un pot de yaourt n'en est pas changé) et d'une pièce (« un oignon, c'est 110 g »). Popote ne le redemande pas ;
cela se corrige sur la fiche. Une cuillère, un verre ou une tasse se convertissent par la densité de l'aliment,
prise dans la table du serveur ; une pincée est un assaisonnement. Sans densité connue : « combien ? ».

**Planifiable.** Une recette entre dans un plan quand chacune de ses étapes a une durée. Sinon elle se garde et se
retient quand même : Popote demande les durées manquantes au moment du plan (§ 10.1).

### 4.5 Les durées

**Comment une durée suit la quantité.** Chaque étape porte l'une de ces trois règles ; Popote la propose d'après
la nature et le geste, et elle se corrige sur la fiche. Pour le facteur *f* d'une recette :

| Règle | La durée devient | Par défaut pour |
|---|---|---|
| Suit la quantité | durée × *f*, entre la moitié et le triple | « tes gestes » : éplucher, émincer, monter |
| Suit un peu | durée × √*f*, entre les trois quarts et le double | « à surveiller » : saisir, faire revenir, réduire |
| Ne bouge pas | la même | « sans toi » : cuire au four, mijoter, reposer |

Une durée s'arrondit à la minute la plus proche (6 min 30 s donne 7 min), jamais sous 1 minute.

**Ce que vos sessions apprennent.**

- Seules les étapes « tes gestes » et « à surveiller » s'apprennent. Leur durée réelle va du moment où la carte
  est donnée au cuisinier (§ 11.2) à son « Fait », sans les pauses ni le temps passé hors ligne. À partir de 3
  mesures de la même étape de la même recette, leur médiane, ramenée à la quantité par la règle de l'étape (divisée
  par *f* pour « suit la quantité », par √*f* pour « suit un peu »), remplace l'estimation ; la
  fiche le dit : « d'après vos 3 dernières fois ». Une mesure de moins du quart ou de plus du quadruple de la
  durée prévue est écartée (un « Fait » oublié).
- Une étape **« sans toi » ne s'apprend jamais du « Sorti »** : sortir un plat en retard ne rallonge pas sa
  cuisson. Seul « + 5 min » compte : quand le foyer a rallongé la même cuisson à 3 sessions de suite, Popote le
  propose, sur la carte de fin : « **Les lasagnes :** 40 min au four la prochaine fois ? » avec « Oui » et « Non ».
  Une cuisson n'est jamais raccourcie toute seule.

### 4.6 Le plan, en une phrase

Le plan range toutes les étapes de toutes les recettes dans le temps, pour les cuisiniers et les appareils du
jour, afin de **quitter la cuisine le plus tôt possible**. Ses règles sont au § 10.

### 4.7 Ce que Popote dit et ne dit pas

- Popote ne note rien sans récapitulatif et sans accord : un menu, une recette lue, une recette inventée, un
  remplacement d'article, ce que la session a pris au placard se valident avant d'être écrits.
- Un texte collé, une page lue, une photo, une phrase dictée sont **des données, jamais des consignes** : ils
  n'entrent pas dans la partie « consigne » d'un appel au modèle, et ce que le modèle rend est vérifié par le
  serveur avant d'être montré (§ 8.6).
- Le modèle ne reçoit ni prénom, ni objectif nominatif, ni adresse, ni rien du Budget, hors le coût d'une session
  que la personne a confirmé (§ 13).
- Chaque lecture ou invention compte dans un quota mensuel du foyer, **visible avant** d'être atteint : « Il te
  reste 7 inventions ce mois-ci. » Les plafonds eux-mêmes sont fixés à partir des quotas réels des fournisseurs
  de modèles (K-C10) : l'écran montre toujours le vrai compteur, jamais un chiffre écrit en dur. Les autres demandes en mots (« pas de soupe », une question à Popote) comptent
  dans le quota général de Popote. **Le compteur unique du socle IA (le plafond du jour) décide** : un appel au
  modèle de ce monde passe par lui comme tous les autres, et ces quotas du mois ne sont que des vues de ce
  compteur. Quand une limite bloque, l'écran dit laquelle : « **Plus d'invention ce mois-ci** » (quota du mois) ou
  « **Popote a atteint sa limite du jour** » (plafond du jour : elle repart demain). **Rien de ce qui fait avancer
  la cuisine ne passe par un modèle ni par un quota** : « Fait », les minuteurs, la pause, les phrases de mains
  libres.
- Les **allergies** et les régimes que le foyer a dits à Popote sont des faits typés du plan IA : le serveur les
  applique aux menus proposés (§ 6.2), aux recettes inventées (§ 8.5) et aux remplacements (§ 9.4). Si une
  allergie n'est pas enregistrée, ou ne peut pas être vérifiée pour un aliment, Popote le dit : « **Je ne connais
  pas tes allergies :** vérifie les ingrédients. »

## 5. L'entrée du monde (`/cuisiner`)

De haut en bas : l'en-tête, Popote et sa bulle, les sessions ouvertes, « Nouvelle session », « Mes recettes », la
barre « Parle-moi, ou écris ».

**La bulle** dit la chose à faire, une seule :

| Priorité | Situation | Texte | Bouton |
|---|---|---|---|
| 1 | Un minuteur sonne | **Dring !** Sors les lasagnes du four. | Voir |
| 2 | Une session est en cuisine | **On est en cuisine.** 7 étapes sur 31. | Reprendre |
| 3 | Une session est à ranger | **C'est cuit !** 10 barquettes à ranger. | Ranger |
| 4 | Une session est en pause | **En pause** depuis 11 h 40. On reprend ? | Reprendre |
| 5 | Une session est prête | **Tout est là.** On cuisine quand tu veux. | C'est parti |
| 6 | Une session attend ses courses | **12 articles** à prendre. | Voir la liste |
| 7 | Un menu n'est pas fini | **Il manque 6 parts** au menu. | Finir le menu |
| 8 | Rien | **On cuisine quoi ?** | Nouvelle session |

**Les sessions ouvertes.** Une carte par session : son nom (« Session de dimanche », d'après le jour prévu, ou
« Session du 15 nov. »), son étape, ses recettes en vignettes, « 10 parts ». Un appui l'ouvre. Son bouton
« … » offre « C'est pour quand ? » et « Annuler la session » (avant la cuisine), avec une confirmation : « **Annuler la session ?** Ce que
tu as déjà acheté reste au placard. »

**« Nouvelle session »** est toujours là, toujours active. S'il existe déjà une session au menu, Popote demande :
« **Tu as déjà un menu en cours.** Je le reprends, ou j'en ouvre un autre ? »

**« Mes recettes »** : les dernières recettes ajoutées ou cuisinées, en vignettes, et « Toutes les recettes »
(§ 7), « Ajouter une recette » (§ 8).

## 6. Le menu (`/cuisiner/session/:id/menu`)

### 6.1 Combien de parts

Popote : « **On cuisine quoi ?** Combien de parts ? » Des pastilles : 6, 8, 10, 12, 14, « Autre » (un champ, 1
à 40). Sous les pastilles, une phrase rendue par l'API dit ce que le nombre couvre : « 10 parts : 5 dîners pour
vous deux. » La pastille proposée d'avance est celle que l'API calcule d'après les repas sans barquette des sept
prochains jours (parcours « Semaine et Frigo ») ; sans rien à calculer, c'est 10.

Popote : « **10 parts.** Je te propose un menu, ou tu choisis ? » Deux boutons : « Propose-moi » et « Je choisis ».
Les deux chemins se mélangent : on peut retoucher une proposition à la main, ou demander une proposition pour
compléter ce qu'on a choisi.

### 6.2 Popote propose

Popote : « Je regarde ton frigo, vos objectifs, ce que vous avez aimé… » puis le menu : une carte par recette
(photo, titre, « 4 parts » avec − et +, et **une raison**), un résumé à trois chiffres, et : « **Voilà un menu.**
Tout se congèle. Ça te va ? » avec « Ça me va » et « Autre menu ».

| Recette | Repas | Raison |
|---|---|---|
| Lasagnes aux épinards et ricotta | 4 | Avec tes 800 g d'épinards |
| Curry de poulet au lait de coco | 4 | 40 g de protéines par part |
| Soupe de lentilles corail | 2 | Jamais essayée, 10 min pour toi |

Le résumé : « 10 parts », « 1 h 50 à deux », « ≈ 62 € ».

**Comment le menu est choisi** (par le serveur, pas par un modèle) :

1. Les recettes écartées d'office : « Plus jamais » (§ 7.2), sans nombre de parts, pas planifiables (§ 4.4), dont
   un appareil manque au foyer, celles qui contiennent un aliment auquel un membre est allergique (§ 4.7), et
   celles qu'une demande de la personne exclut.
2. La somme des parts fait la cible, avec 2 à 5 recettes (une seule sous 4 parts, jusqu'à 8 au-delà de 30), et
   jamais plus de 3 fois une recette. Si la cible ne se fait pas ainsi, Popote propose moins et le dit : « **Je
   m'arrête à 30 parts :** au-delà, il faut deux sessions. »
3. Le menu est noté sur : ce qu'il utilise du placard, en commençant par ce qui périme ; les objectifs de chacun
   (les protéines et l'énergie d'un repas) ; le temps de cuisine, estimé vite pour classer (la somme des gestes, partagée entre les cuisiniers) ; la variété (pas deux fois le même
   ingrédient principal, pas une recette cuisinée dans les trois dernières semaines sauf « On aime ») ; ce que le
   foyer a aimé ; et, au-delà de ce qui se mange en quatre jours, des recettes qui se congèlent.
4. À cibles et placard égaux, le même menu sort : le choix est déterministe. « Autre menu » passe au menu suivant
   du classement.

**La raison** de chaque recette est un fait calculé, pris dans une liste fermée : « Avec tes … », « N g de
protéines par part », « Jamais essayée, N min pour toi », « Vous avez aimé », « Prête en N min », « Se congèle
bien ». La phrase de la bulle suit la même règle : « Tout se congèle. » n'est dite que si chaque recette porte
« se congèle : oui » ; « on ne sait pas » ne vaut jamais oui.

**Le résumé.** « 1 h 50 à deux » est le temps du vrai plan (§ 10), calculé pour le menu affiché et les cuisiniers
de la dernière session ; « ≈ 62 € » est l'estimation de ce qu'il faut acheter (§ 13), affichée seulement quand
elle est connue.

**Changer une carte.** « − » et « + » changent ses parts (le résumé suit) ; à 0 la carte s'en va. Un appui sur la
carte ouvre sa fiche. « Changer » remplace la recette par la suivante du classement.

**Le dire.** « Pas de soupe, plutôt un plat au four » : le modèle ne fait que traduire la phrase en filtres typés
(exclure un type de plat ou un ingrédient, vouloir un appareil, borner le temps) ; Popote récapitule : « **Sans
soupe : compris.** », la carte se retourne (« Gratin de chou-fleur, 2 parts : Au four, pendant que le curry
mijote »), le résumé change (« 1 h 55 à deux », « ≈ 66 € »). Une phrase qui ne se traduit en aucun filtre :
« Je n'ai pas compris ce que tu veux changer. Dis-le autrement ? », et rien ne change.

« Ça me va » pose le tampon « Menu validé », des confettis, et Popote dit : « **Menu validé !** Je prépare la liste
de courses. »

### 6.3 Je choisis

Le compteur en haut : « 4 / 10 parts ». Popote : « **Choisis ce qui te fait envie.** Il manque 6 parts. » Dessous,
les recettes (§ 7.1) ; chaque vignette porte « + » ; une recette retenue porte « Retenue » et son nombre de parts.

- À la cible : « **10 sur 10 !** On passe aux courses ? » avec « On passe aux courses ».
- Sous la cible, « On passe aux courses » reste possible ; Popote le dit d'abord : « **Il manque 2 parts.** J'en
  propose, ou on y va comme ça ? »
- Au-dessus : le compteur dit « 12 / 10 parts », sans alerte.

## 7. Les recettes

### 7.1 La liste (`/recettes`, et dans le menu)

- Un champ « Cherche une recette, un ingrédient » : chaque mot doit se trouver dans le titre ou dans un
  ingrédient, accents ignorés.
- Des filtres en pastilles, qui se cumulent : « Rapide » (20 min pour toi au plus), « Protéiné » (au moins 30 g
  par part, borne basse de la fourchette), « Se congèle », « Avec mon frigo », « Jamais essayée », « On aime »,
  « Mes recettes ». « Tout effacer » quand un filtre est posé.
- Des vignettes : la photo, le titre, « 15 min pour toi », « 480 kcal ». Sans photo : un carré de couleur avec
  l'initiale du plat (« Aujourd'hui », C6).
- **Dix par page**, et en bas « Les 10 suivantes » ; la page suivante se lit par curseur (la dernière recette vue),
  donc une recette ajoutée entre deux lectures n'en fait ni sauter ni doubler une ; le filtre ou la recherche
  ramènent à la première page.
- L'ordre : sans recherche, « pour vous » (aimées, puis jamais essayées qui vont avec le placard, puis le reste par
  temps « pour toi » croissant) ; avec une recherche, la pertinence. À égalité, le titre : l'ordre est total, une
  recette ne change pas de page.
- « Avec mon frigo » garde les recettes dont il manque au plus 2 ingrédients comptés, et l'écrit sur la vignette :
  « il manque 2 ingrédients », « tout est là ».
- **Jamais essayée** veut dire : aucune session rangée du foyer ne l'a cuisinée.
- Rien ne correspond : « **Rien ne correspond.** Enlève un filtre, ou demande-moi d'inventer. »

### 7.2 La fiche (`/recettes/:id`, ou en feuille depuis le menu)

De haut en bas : la photo ; le titre et la provenance ; trois tuiles (« 15 min pour toi », « 1 h 10 en tout »,
« pour 4 parts ») ; les valeurs par part (« 480 kcal, 36 g de protéines », la fourchette s'il y en a une, un
appui déplie fibres, glucides, lipides) ; les appareils ; les ingrédients avec leur quantité, **à l'échelle des
parts choisies** ; les étapes avec leur pilule (« tes gestes », « à surveiller », « sans toi ») et leur durée.

| Geste | Effet |
|---|---|
| « Ajouter : 4 parts », − et + | retient la recette dans la session ouverte au menu (ou propose d'en ouvrir une) |
| « On aime » (cœur) | Popote la reproposera |
| « Plus jamais » | elle n'est plus proposée ni listée, sauf par « Mes recettes » ; se défait depuis la fiche |
| « Corriger » | ouvre la recette en correction (§ 8.4) ; corriger une recette du catalogue en crée la version du foyer, qui remplace l'autre pour ce foyer |
| « Voir l'original » | ouvre le site d'origine, pour une recette du catalogue |
| « Supprimer » | seulement une recette du foyer, jamais cuisinée ; sinon « Plus jamais » |

Une recette inventée et jamais cuisinée porte le bandeau « Inventée, jamais testée ».

## 8. Ajouter une recette (`/recettes/ajouter`)

Quatre tuiles : « Coller un texte », « Prendre en photo », « Un lien », « La dicter » ; et dessous « Invente-moi une
recette ». Les quatre premières mènent au même récapitulatif (§ 8.2).

### 8.1 Donner la recette

| Chemin | Ce que la personne fait | Limites |
|---|---|---|
| Coller un texte | colle, puis « Lire » | de 40 à 24 000 caractères |
| Prendre en photo | une à trois photos (une page, une capture d'écran) | réduites avant l'envoi ; supprimées à la fin de la lecture (§ 8.6), sauf celle gardée comme photo du plat |
| Un lien | colle l'adresse d'une page | une seule page, en `https` ; l'API la lit en respectant les règles du site, et seulement sur l'internet public (§ 8.6) |
| La dicter | la dit dans la barre, puis touche « C'est tout » | comme le mode vocal d'« Aujourd'hui », sauf la coupure : une recette se dicte avec des pauses, l'écoute ne s'arrête pas au silence mais à « C'est tout », ou après 3 minutes |

Sous les tuiles, le lien « L'écrire moi-même » ouvre le récapitulatif vide (§ 8.4) : aucun modèle, aucun quota.
**Avant l'envoi de chaque photo**, deux lignes préviennent : « **Masque ta carte bancaire et ta carte de fidélité**
avant de photographier. » et « Ta photo part chez un service installé aux États-Unis, qui la lit ; elle est
supprimée dès que la lecture est finie. » (la seconde ligne devient « …chez un service installé en Europe » si le
propriétaire tranche pour un service européen). Le filtre des numéros de carte du serveur est une seconde
barrière, après l'envoi : il ne remplace pas la première.

Pendant la lecture : « Je lis… ». Illisible : « **Je n'arrive pas à lire.** Reprends la photo, bien à plat. » avec
« Reprendre ».

### 8.2 Le récapitulatif

Popote : « **J'ai lu ta recette.** Regarde si j'ai bon. » Une carte « ticket » :

| Ligne | Ce qu'elle montre | Quand il y a un doute |
|---|---|---|
| Le titre | Gratin de courgettes au chèvre | |
| Les parts | « Pour 4 parts » | l'étiquette « supposé » quand ce n'était pas écrit |
| Chaque ingrédient | « 800 g de courgettes », une coche, et en petit l'aliment reconnu (« courgette, crue ») | « laquelle ? » (à confirmer), « combien ? » (un contenant ou une pièce sans poids : « 2 pots »), « pas compté » (un assaisonnement : sel, poivre), « quelle quantité ? » (un vrai ingrédient sans quantité), « pas reconnu » |
| Chaque étape | le geste, sa nature, sa durée | « estimé » quand la durée n'était pas écrite, « combien de temps ? » quand Popote ne peut pas l'estimer |
| Les valeurs par part | « à calculer », puis « 345 kcal, 19 g de protéines » | « inconnues : 2 ingrédients sans quantité » (§ 4.4) |

En bas : « Il me manque 2 choses », et le bouton « Garder la recette », en pause tant qu'il manque le titre, le
nombre de parts, ou qu'il n'y a ni ingrédient ni étape.

### 8.3 Ce qui manque, une question à la fois

Popote pose les manques un par un, dans cet ordre : les parts, les ingrédients à confirmer, les contenants sans
poids, les quantités absentes, les durées qu'elle ne peut pas estimer, les étapes « à vérifier » (§ 8.6). Elle ne
redemande pas ce que le foyer lui a déjà appris (§ 4.4).

- « **Pour combien de parts ?** Ce n'était pas écrit. » Pastilles 2, 4, 6, 8, « Autre ».
- « **La crème : laquelle ?** » Pastilles : les trois aliments les plus proches, et « Autre » (une recherche).
- « **Un pot, c'est combien ?** » Pastilles 125 g, 150 g, 200 g, « Autre ».
- « **L'huile : quelle quantité ?** » Pastilles « 1 cuillère », « 2 cuillères », « Un filet (pas compté) », « Autre ».
- « **“Laisser reposer” : combien de temps ?** » Pastilles 10 min, 30 min, 1 h, « Autre ».

Chaque réponse remplace l'étiquette par une coche. Quand plus rien ne manque, les valeurs se calculent, et Popote
dit : « **Tout y est.** 345 kcal par part. Tu la gardes ? » On peut garder avant (« Garder quand même ») : les
manques restent marqués sur la fiche, les valeurs restent « inconnues », et les durées seront demandées au plan.

### 8.4 Tout se corrige

Toucher une ligne l'ouvre : changer le texte, la quantité, l'unité, l'aliment reconnu (une recherche), la durée,
la nature, l'appareil ; « Retirer ». « Ajouter un ingrédient », « Ajouter une étape » en bas de chaque liste.
Glisser une étape change son ordre. Chaque correction recalcule les valeurs.

- **Plusieurs recettes dans un texte** : « **J'en vois deux :** une tarte, et sa pâte. Je les garde ensemble, ou
  séparées ? » avec « Ensemble » et « Séparées ».
- **Dire ce qui ne va pas** : « Tu as coupé l'étape 3 en deux » : Popote corrige et récapitule ce qu'elle a changé.
- « Garder la recette » : tampon « Gardée », confettis ; « **C'est rangé dans tes recettes.** Je l'ajoute à la
  session ? » avec « Oui, 4 parts » et « Pas cette fois » (seulement si une session est au menu).
- La recette appartient au foyer : les deux la voient et la corrigent.

### 8.5 Inventer

Popote : « **Une envie ?** Dis-moi, je t'invente une recette. » Trois pastilles, une seule choisie : « Avec mon
frigo » (que ce qu'il y a), « + 3 courses » (trois achats au plus), « Libre ». Le quota du mois est écrit dessous.

La personne dit son envie (« Un truc réconfortant avec mes épinards et le jambon »). Popote rend une fiche
complète, avec le bandeau « Inventée, jamais testée » : le titre, les trois temps, « pour 4 parts », les valeurs
**calculées** (« 460 kcal, 31 g de protéines par part (calculé) »), les ingrédients, dont ceux « à acheter », les
étapes. Popote : « **Gratin d'épinards au jambon.** Il te manque la crème et le gruyère. »

- **Ajuster en parlant** : « Sans crème » : « **Sans crème :** je mets du skyr. » ; les lignes changées s'éclairent,
  les valeurs sont recalculées (« 410 kcal, 34 g »). Chaque ajustement compte comme une invention.
- **Le quota à zéro** : « **Plus d'invention ce mois-ci :** ça repart le 1er. » ; pour une lecture : « **Plus de
  lecture ce mois-ci :** ça repart le 1er. Tu peux l'écrire toi-même. »
- **Ce que le serveur vérifie** avant de montrer : chaque étape a un geste, une nature et une durée ; les valeurs
  sont celles des aliments reconnus, pas celles du modèle ; avec « Avec mon frigo », chaque ingrédient est au
  placard, avec « + 3 courses », trois au plus n'y sont pas ; aucun ingrédient ne contient une allergie enregistrée
  (§ 4.7) ; la masse et l'énergie d'une part restent dans les bornes plausibles de la table du serveur (§ 8.6).
  Ce qui n'est pas tenu est dit : « **Je n'y arrive pas
  avec ton frigo seul :** il faut du gruyère. »
- « Garder » : comme au § 8.4 ; « Autre idée » : une autre recette pour la même envie.
- Le nombre de parts se choisit sur la fiche (4 proposés).

### 8.6 Ce que le serveur garantit pour toute recette lue ou inventée

- Le modèle rend une structure ; le serveur reconnaît les aliments, convertit en grammes, calcule les valeurs et
  estime les durées par ses propres règles. Aucun nombre montré ne vient du modèle sans être marqué (« estimé »,
  « supposé »).
- Une quantité ou un ingrédient qui ne sont pas dans la source ne sont jamais inventés pour une recette lue : ils
  sont demandés (§ 8.3). Une durée absente est **estimée** par les règles du serveur, toujours marquée « estimé »
  (§ 8.2), et corrigeable ; quand le serveur ne peut pas l'estimer, elle est demandée.
- **Un aliment reconnu avec trop peu de sûreté** est « à confirmer », même s'il n'y a qu'un candidat : une
  reconnaissance fausse et sûre d'elle (« yaourt » pris pour un petit pot pour bébé) est le défaut à éviter.
  L'aliment reconnu est toujours écrit sous la ligne.
- **Ce qui n'est pas plausible est « à vérifier »** : un four hors de 50 à 300 °C, une étape de plus de 12 heures,
  plus de 5 g de sel par part, une viande, une volaille, un poisson ou des œufs cuits moins longtemps que le
  minimum de la table du serveur pour ce geste, une masse ou une énergie par part hors des bornes de la table du
  serveur (une part de 40 g, ou de 3 000 kcal). Une étape « à vérifier » se confirme ou se corrige avant que la
  recette n'entre dans un plan ; une recette **inventée** ne se garde pas tant qu'il en reste une.
- Tout texte venu d'une source ou d'un modèle est affiché comme du texte, sans lien ni mise en forme, et coupé aux
  bornes du § 4.2.
- **Lire un lien** : l'API ne lit que des adresses publiques en `https`, sur le port 443. Elle résout le nom elle-même
  et se connecte à l'adresse qu'elle a vérifiée (jamais une seconde résolution) ; elle refuse les adresses privées,
  locales, internes ou réservées sous toutes leurs écritures : décimale, octale, hexadécimale, IPv6 qui enveloppe
  une IPv4, `169.254.0.0/16` (dont `169.254.169.254`), `100.64.0.0/10`. Elle refait cette vérification à chaque
  redirection (3 au plus), respecte le `robots.txt` du site, n'envoie ni cookie ni identifiant, s'arrête à 10
  secondes et à 2 Mo **après décompression**, et ne lit que du HTML. La photo de la page suit les mêmes règles.
  Refusé : « **Je ne peux pas lire cette adresse.** Colle plutôt le texte. »
- **Les photos** : réduites et débarrassées de leurs métadonnées (lieu, appareil) avant l'envoi, trois au plus.
  **Supprimées du seau à la fin de la lecture**, celles d'un ticket comprises, même si la lecture échoue : un test
  vérifie que le seau est vide ensuite (socle, § 6.1). Si le socle ne tient pas ce test, l'écran dit « gardée 30
  jours au plus » à la place de « supprimée ». Tant que le propriétaire n'a pas tranché, le service qui lit est aux
  États-Unis, et l'écran le dit (§ 8.1). La photo d'un plat n'est gardée que si la personne le demande (« Garder
  cette photo pour le plat »). D'un ticket, seuls restent les libellés, les quantités et les prix : aucun numéro de
  carte ou de fidélité, retiré par le serveur avant toute écriture.
- Un échec du modèle se dit en français, sans texte technique : « **Je n'ai pas réussi à lire.** Réessaie dans un
  instant. » ; il ne consomme pas le quota.

## 9. Les courses (`/courses`)

### 9.1 Une seule liste, celle du foyer

La liste de courses est **celle du foyer**, pas celle d'une session : elle réunit ce que demandent les sessions
ouvertes et ce qu'on y ajoute à la main. Elle se met à jour **toute seule** quand un menu change : il n'y a pas de
bouton « faire la liste ».

Pour chaque aliment, l'API additionne ce que demandent toutes les recettes de toutes les sessions **pas encore
rangées** (quantité × facteur) : une session en cuisine garde ses besoins jusqu'à ce que le placard en soit
débité (§ 12.4), pour qu'une autre session ne compte pas deux fois le même riz. Le placard sert d'abord la session
en cuisine, en pause ou à ranger, puis les autres par ordre de création : deux sessions oubliées qui se
recouvrent ne couvrent jamais le même riz deux fois. Puis elle regarde le placard :

| Le placard | La ligne |
|---|---|
| en a assez | dans « Déjà chez toi », pas à acheter : « Oignons : il t'en faut 3, tu en as 5 » |
| en a une partie | à acheter, pour ce qui manque : « Riz 300 g », et en petit « tu en as 200 g » |
| n'en a pas, ou sa quantité n'est pas comparable (un pot contre des grammes) | à acheter, en entier ; et en petit, s'il y en a : « tu en as, quantité inconnue » |

- Ce qui manque est arrondi **vers le haut** à une quantité qui s'achète (au pas de 50 g, de 10 cl, à l'unité).
  L'arrondi se fait **sur la somme par aliment**, pas recette par recette ; le débit du placard (§ 12.4) se fait
  aussi sur la somme par aliment, au plus près des grammes, pour que le placard ne gonfle pas d'une session à
  l'autre.
- **Une ligne a une identité** : l'aliment et le foyer. La liste est dérivée, mais la ligne cochée est un état
  gardé, qui porte la quantité prise (§ 9.2).
- **Comparer des pièces et des grammes** : seulement quand le poids d'une pièce est connu (appris du foyer, sinon
  celui de la table du serveur) ; sinon la quantité « n'est pas comparable ».
- Chaque ligne garde, pour chaque session, ce que cette session en demande : c'est ce qui dit quand une session
  est prête (§ 9.5).
- Deux recettes qui demandent le même aliment font une seule ligne ; ce qui ne s'additionne pas (300 g et « 2
  pièces ») s'écrit sur la même ligne : « Courgettes 300 g + 2 ».
- Chaque ligne dit en petit pour quoi elle est là : la recette (« lasagnes »), « curry + gratin », « ajouté par
  Léa ».
- Un article déjà pris ne bouge plus quand le menu change : seul ce qui reste à prendre est recalculé. Retirer
  une recette retire ses articles pas encore pris ; ceux déjà pris restent au placard.

### 9.2 L'écran

Popote : « **23 articles, environ 66 €.** Rangés dans l'ordre de ton magasin. » En haut, le compteur « 2 / 23 » ;
puis une carte repliée « 6 ingrédients déjà chez toi » avec « Voir » ; puis la liste par rayon.

- **Les rayons**, dans l'ordre où le foyer les parcourt (appris des cochages, § 17 K8) : Fruits et légumes ;
  Boucherie, poissonnerie ; Frais ; Surgelés ; Épicerie salée ; Épicerie sucrée ; Boissons ; Entretien ; Hygiène ;
  Autre.
- **Une ligne** : une grande case, le nom, la quantité à droite, la recette en petit.
- **Cocher** : la ligne se barre et glisse en bas de son rayon ; elle entre au placard (sauf Entretien et
  Hygiène), au frigo, au congélateur ou au placard selon son rayon.
  Décocher le défait, dans les limites du cycle de vie ci-dessous. Cocher demande un état (« prise »), pas une bascule : deux téléphones qui cochent la même ligne la laissent cochée,
  une seule fois au placard.
- **Cocher vise (aliment, foyer)**, pas une ligne d'un instant : il écrit une **quantité prise**, celle de la ligne
  que la personne avait sous les yeux (« Riz : 300 g pris »). Le cycle de vie d'une ligne :
  1. **ligne dérivée** : calculée à chaque lecture depuis les besoins des sessions et le placard (§ 9.1) ;
  2. **cochée** : la quantité prise est écrite, et entre au placard. Si le besoin retombe (une recette est retirée
     par Sam pendant que Léa coche), la ligne cochée reste valable pour ce qu'elle a pris, et ne demande plus rien ;
     si le besoin monte après l'achat (« Riz 300 g » devient 500 g), la ligne redevient à acheter pour la différence
     seulement (« Riz 200 g », en petit « tu en as 300 g ») ;
  3. **ligne détachée** : une ligne que « Je repasserai » (§ 9.5) a gardée, ou que la personne a ajoutée à la main,
     ne dépend plus d'aucune session : elle reste sur la liste, « à reprendre », jusqu'à ce qu'on la prenne ou la
     retire ;
  4. **décochage** : il défait ce que la cochée a écrit, mais jamais sous ce que le placard contient encore : si
     une session a débité le placard depuis (§ 12.4), décocher ne retire que ce qu'il en reste, et l'écran le dit
     (« Le riz est déjà utilisé : je ne retire que 0 g. »). Un placard ne descend jamais sous zéro par un décochage.
  Une ligne qu'une autre personne vient de changer (cochée, retirée, périmée par un menu) n'est pas écrasée :
  « Léa vient de la changer. » et l'écran se met à jour.
- **À deux** : la liste est la même sur les deux téléphones. Une ligne cochée par l'autre porte son initiale, et
  un bandeau dit où il est : « Léa est à la boucherie » (le rayon de son dernier cochage).
- **« Déjà chez toi »** dépliée : chaque ligne porte « Je n'en ai plus ». Popote : « **Plus d'oignons ?** Je les
  retire de ton placard et je les mets sur la liste. » avec « D'accord ».

### 9.3 Ajouter, retirer

- **Le dire ou l'écrire** : « Ajoute du sopalin » : la ligne « Essuie-tout » apparaît dans son rayon, « ajouté par
  toi ». Sans quantité dite, la ligne n'en porte pas.
- **« Ajouter un article »** : un nom (80 caractères), une quantité facultative ; le rayon est deviné, et se
  change en touchant la ligne.
- **Toujours sur la liste** : en touchant un article ajouté à la main, « Le remettre à chaque fois » ; il revient
  sur la liste dès qu'il est coché depuis plus de 7 jours.
- **Retirer** : glisser vers la droite, « Retirer ». Un article d'une recette qu'on retire ainsi demande :
  « **Sans épinards, pas de lasagnes.** Je les enlève du menu ? » avec « Oui » et « Non, j'en ai ».

### 9.4 Pas trouvé

Glisser une ligne vers la gauche : « Pas trouvé ». Popote : « **Pas d'épinards frais ?** » et trois choix :

| Choix | Ce qui se passe |
|---|---|
| Remplacer | Popote propose un aliment voisin qui tient dans la recette, avec sa quantité, et qui respecte les allergies enregistrées (§ 4.7) : « **Des épinards surgelés**, 800 g : ça marche pareil. » et « D'accord » ; la ligne change de nom et de rayon, la recette de la session note le remplacement. Sans voisin sûr : « Je n'ai pas de remplaçant sûr. » et les deux autres choix. |
| Je repasserai | la ligne reste à prendre, marquée « à reprendre » ; la session ne devient pas prête |
| On fait sans | pour un ingrédient qui compte : « **Sans épinards, pas de lasagnes.** Je les enlève du menu ? » ; pour un ingrédient mineur (sans quantité, ou sous 5 % du poids du plat) : la ligne s'en va et la recette le note |

### 9.5 Finir

- Une session devient **prête** quand chacun de ses besoins est couvert : pris, déjà chez soi, remplacé, ou
  réglé par « On fait sans ». Confettis, « **Tout est là !** On cuisine quand tu veux. »
- « **J'ai fini** » (bouton du bas, **toujours actif**) : on peut quitter le magasin sans avoir tout pris. S'il
  reste des articles : « **Il en reste 3.** On en fait quoi ? » (un seul : « Il en reste 1 : la muscade. ») avec
  trois choix, qui valent pour tous les articles restants ; une ligne se règle aussi une par une (§ 9.3, § 9.4) :
  - « **Je les ai déjà** » : ils passent dans « Déjà chez toi », sans rien ajouter au placard ;
  - « **Je repasserai** » : ils deviennent des lignes détachées (§ 9.2), marquées « à reprendre » ; ils restent sur
    la liste même quand la session est rangée ou annulée ;
  - « **Enlève-les** » : ils quittent la liste, comme « Retirer » (§ 9.3).
  Dans les trois cas, la session devient prête si aucun article restant n'est un ingrédient qui compte ; sinon,
  pour chacun de ceux-là, la question du § 9.4 (« **Sans épinards, pas de lasagnes.** Je les enlève du menu ? »).
  Popote le dit : « **On peut cuisiner !** La muscade reste sur ta liste. »
- La liste ne se vide jamais d'elle-même : un article pas pris reste jusqu'à ce qu'on le prenne ou le retire.

## 10. Le plan (`/cuisiner/session/:id/plan`)

### 10.1 Qui cuisine, avec quoi

Popote : « **Qui cuisine ?** » Une pastille par membre du foyer, allumée ou non, et « + Quelqu'un d'autre » (un
prénom ; quatre cuisiniers au plus). Dessous, « Avec quoi ? » : une pastille par appareil, avec ce qu'il prend à
la fois (« Four · 2 plats », « Plaques · 4 feux », « Autocuiseur »), allumée ou non ; son bouton « … » change le
nombre (1 à 8). L'écran s'ouvre sur les choix de la dernière session.

- Un appareil **éteint n'est pas utilisé**. Si une recette en a besoin : « **Sans four, pas de lasagnes.** Je
  rallume le four, ou je les enlève ? »
- **Des durées manquent** : avant de calculer, « **2 étapes sans durée.** » et, une à la fois, la question du
  § 8.3 avec l'estimation de Popote proposée en premier.
- « Préparer le plan » lance le calcul. Un changement de cuisinier ou d'appareil le relance.

### 10.2 Ce que le plan montre

Les étapes des recettes, d'abord rangées par recette, s'envolent vers une **frise** : une ligne par cuisinier, une
ligne par appareil occupé. Un grand chiffre descend du temps « l'une après l'autre » au temps du plan.

Popote : « **1 h 50 à deux**, au lieu de 3 h 05 l'une après l'autre. » Puis, une à une, trois phrases au plus, qui
disent ce que le plan a gagné, prises dans une liste fermée et remplies par l'API :

| Ce que le plan a fait | La phrase |
|---|---|
| a fusionné des gestes (dit seulement si la fusion a été retenue) | J'émince les oignons des 3 recettes en une fois. |
| a enchaîné un appareil | Le four enchaîne : lasagnes, puis gratin. |
| a mis un geste pendant une cuisson | Pendant que le curry mijote, vous montez les lasagnes. |
| a partagé le travail | 52 min de gestes pour toi, 49 pour Léa. |
| a lancé le plus long d'abord | On commence par le curry : c'est lui le plus long. |

Une carte : « Si on commence maintenant : fini à **12 h 20**. » Un cuisinier éteint : la frise se refait, « **Seul :
2 h 35.** ». Le bouton : « C'est parti ! ».

- « Au lieu de 3 h 05 » est la somme des temps « en tout » des recettes, cuisinées l'une après l'autre par une
  personne. La comparaison n'est dite que si le plan gagne au moins 10 minutes.
- **Le goulot** : si un appareil retient la fin (il est occupé sans pause sur le chemin le plus long) et qu'une
  place de plus ferait gagner au moins 5 minutes, une carte le dit : « **Le four te ralentit.** Avec 3 plats à la
  fois : 12 min de moins. » ; elle ouvre le réglage de l'appareil.
- Toucher une brique de la frise montre l'étape, sa recette, sa durée. La frise ne se réordonne pas à la main.

### 10.3 Comment le plan est calculé

**Ce qui entre** : pour chaque recette retenue, ses étapes à l'échelle (durée, nature, appareil, température, ce
dont elles dépendent, « enchaînée » ou non ; sans dépendance écrite, chaque étape suit la précédente de sa
recette) ; les cuisiniers du jour ; les appareils allumés et leurs places.

**Les places.** Jusqu'à une fois et demie la recette, un plat prend une place dans son appareil ; au-delà, une
place de plus par fois-et-demie entamée (2 fois la recette : 2 places ; 3,5 fois : 3 places).

**Sortir.** Toute étape « sans toi » qui occupe un appareil se termine par un geste d'une minute, « Sors… »,
« Égoutte… », « Coupe le feu… », que le plan donne à un cuisinier et qui doit commencer dans les 2 minutes après le
minuteur : une cuisson ne finit jamais sans personne pour la sortir.

**Les contraintes** :

- une étape ne commence que quand celles dont elle dépend sont finies ;
- un cuisinier ne fait qu'une étape « tes gestes » ou « à surveiller » à la fois ;
- un appareil ne prend pas plus de plats qu'il n'a de places ;
- **le four** : deux plats le partagent seulement si l'écart entre le plus chaud et le plus froid est de 10 °C au
  plus (aucune durée ne change) ; un préchauffage par température ; changer de température de plus de 20 °C, vers
  le haut (chauffer) comme vers le bas (refroidir), ajoute 5 minutes « sans toi » avant le plat suivant ;
- **un appareil trop petit** : une recette qui prend plus de places que l'appareil n'en a (jusqu'à 20 fois la
  recette contre 8 places) n'entre dans aucun plan : le plan le dit avant de calculer, « **Le four n'a que 8 places,
  il en faut 10.** Réduis les parts, ou ajoute un appareil. », et ne la coupe jamais en fournées de lui-même ;
- une étape « sans toi » ne demande personne pendant qu'elle dure, mais son appareil ;
- une étape « enchaînée » commence au plus 2 minutes après la fin de celle qu'elle suit.

**La fusion.** Deux étapes « tes gestes » **sans appareil**, de recettes différentes, peuvent n'en faire qu'une
quand elles font le même geste sur le même aliment, coupé de la même façon (« émincer » des oignons ; pas des
rondelles et des dés). Sa durée est la somme des deux, moins la mise en place payée une seule fois : la moitié de
la plus courte, 2 minutes et demie au plus (8 min et 4 min : 10 min). Elle porte les étiquettes de ses recettes.
Une fusion est **un choix du plan**, jamais une obligation : elle n'est retenue que si le plan n'en sort pas plus
long (critères 1 et 2 ci-dessous), et jamais si elle crée une dépendance en boucle. Une cuisson ne se fusionne
jamais.

**Ce que le plan cherche**, dans cet ordre :

1. quitter la cuisine le plus tôt : le dernier moment où un geste ou une surveillance retient quelqu'un ;
2. finir le plus tôt : la fin de la dernière cuisson ;
3. le moins d'attente les mains vides ;
4. des gestes partagés : l'écart entre les minutes de gestes des cuisiniers le plus petit.

**Ce que le plan garantit** :

- **Le même plan sort** pour les mêmes recettes, cuisiniers et appareils, sur tous les téléphones : il est calculé
  par l'API, par une recherche au nombre d'essais fixé (jamais bornée par l'horloge), semée par la session. Ce
  nombre d'essais est **proportionnel à la taille** (étapes × cuisiniers), et le socle mesure son pire cas sur la
  taille maximale du § 4.2 : le temps de calcul est connu avant d'être promis. Le calcul est **asynchrone** :
  l'écran montre « Je prépare le plan… » et relit jusqu'au résultat. Au-delà de la taille que ce pire cas permet,
  l'API refuse d'avance : « **Il y a trop de recettes pour un seul plan.** Retires-en une. » À égalité, l'ordre
  des recettes dans le menu puis l'ordre des étapes départagent.
- **La version d'un plan** est l'empreinte de ses entrées (recettes à l'échelle, cuisiniers, appareils, étapes
  faites ou en cours) : les mêmes entrées donnent la même version. Un recalcul est **stable** : à fin égale, il
  garde le plan qui change le moins de cartes à venir, pour que les cartes ne sautent pas sous les doigts.
- **Jamais pire que l'une après l'autre** : le plan « chaque recette à la suite, par un seul cuisinier » est un
  candidat chaque fois qu'il est possible ; le plan rendu ne dure alors jamais plus. Le repli est toujours **un plan
  valide ou « aucun plan »** : jamais un plan qui viole une contrainte.
- **Près du meilleur** : le socle tient un jeu de petits cas de référence, dont le meilleur plan est connu par un
  calcul exact (sans limite de temps) ; sur chacun, le plan rendu ne quitte pas la cuisine plus de 5 % plus tard.
  À taille réelle, on ne peut pas le prouver : le socle y vérifie une borne basse (jamais moins que le chemin le
  plus long, ni que les minutes de gestes partagées entre les cuisiniers) et des tests par propriétés (toutes les
  contraintes tenues, même plan à entrées égales).
- **Aucun plan possible** (un seul cuisinier, et deux gestes « enchaînés » qui tombent ensemble) : le plan le dit
  et propose : « **Je n'y arrive pas seul :** la sauce et les pâtes tombent en même temps. » avec « Ajouter
  quelqu'un » et « Laisser 5 minutes d'écart ». C'est aussi le cas où « l'une après l'autre » n'est pas possible.
- Une dépendance en boucle dans une recette est une erreur dite en clair : « **L'étape 4 du curry attend l'étape
  6, qui attend la 4.** Corrige la recette. », avec le lien vers la correction.

### 10.4 « C'est parti ! »

Un décompte 3, 2, 1 ; la session passe « en cuisine », à l'heure du serveur ; chacun reçoit sa première étape.
Lancer deux fois (deux téléphones) ne lance qu'une fois.

## 11. En cuisine (`/cuisiner/session/:id/cuisine`)

L'écran de cuisine est à part : un fond sombre et chaud, de très gros caractères, lisibles à deux mètres, et un
seul très gros bouton. L'écran ne se met pas en veille tant qu'il est affiché.

### 11.1 L'écran

- **En haut** : un anneau « 7 / 31 », « Fin vers 12 h 20 » (recalculée), et ce que fait l'autre, en une ligne :
  « Léa : rince le riz ».
- **Au centre, la carte de l'étape** : « À toi », le geste en très gros (« Émince 3 oignons »), les étiquettes des
  recettes (« lasagnes », « curry », « gratin »), l'appareil et la température s'il y en a (« Plaques », « Four ·
  180 °C »), la durée (« ≈ 4 min »). Toucher la carte la retourne : le texte de la recette pour cette étape, et
  les ingrédients qu'elle demande avec leur quantité.
- **Le bouton « Fait »**, et dessous, en petit : « Passer », « Un souci ».
- **En bas, « Pendant ce temps »** : les minuteurs en cours (« Four · lasagnes 24:10 »), puis la barre de Popote.

**Un seul écran pour deux.** Par défaut chacun a son téléphone. « On partage cet écran » (dans « … ») montre une
carte par cuisinier, l'une sous l'autre, chacune avec son « Fait » : c'est le mode d'une tablette posée sur le
plan de travail, et celui d'un cuisinier sans compte (§ 10.1), dont la carte est toujours sur l'écran de celui
qui l'a ajouté.

### 11.2 Fait, passer, un souci

- **Une étape est** à venir, **en cours** (sa carte est donnée à un cuisinier : elle est à lui), ou faite.
- **« Fait »** : un seul appui. L'étape est finie à cette heure-là ; la carte suivante arrive ; l'anneau avance.
  « Annuler » reste proposé 10 secondes sous la nouvelle carte, puis dans « … » (« Annuler le dernier Fait »), sans
  limite de temps, tant qu'il reste possible ; il disparaît dès qu'une étape qui en dépendait est **donnée à un
  cuisinier** (pas seulement faite), et il arrête le minuteur que ce « Fait » avait lancé.
- **Quelle est la suivante** : la première étape du plan pour ce cuisinier dont les dépendances sont finies. S'il
  n'y en a pas encore : « **Rien pour toi pour l'instant.** Le curry mijote encore 6 min. » ; elle arrive toute
  seule.
- **Prendre une étape de l'autre** : sous la carte, « Aider Léa » liste ses étapes **à venir** qui sont déjà
  faisables, jamais celle qu'elle a en cours ; en prendre une la retire de sa file.
- **« Passer »** : l'étape est remise à plus tard, si rien ne l'attend ; sinon : « **On ne peut pas la passer :** la
  sauce en a besoin. »
- **« Un souci »** : trois choix.

| Choix | Ce qui se passe |
|---|---|
| Il me manque un ingrédient | Popote propose un remplaçant (§ 9.4), de continuer sans (s'il est mineur), ou de retirer la recette si aucune de ses étapes n'est commencée ; sinon elle le note et on continue |
| C'est raté | « **Raté ?** Je la refais, ou on laisse tomber cette recette ? » : refaire remet l'étape (et celles qui en dépendent, dites une à une) dans le plan ; laisser tomber retire les étapes restantes de la recette, qui ne sera pas dressée |
| Pause | § 11.6 |

- Une étape n'est jamais à deux : si l'autre vient de la prendre, « **Léa l'a déjà prise.** » et la carte suivante
  arrive.

### 11.3 Les minuteurs

- Un minuteur **démarre tout seul** quand le geste qui le lance est fait (« Enfourne les lasagnes » fait : « Four ·
  lasagnes 35:00 »). Sa fin est une heure posée par le serveur : le décompte affiché se cale dessus, et tous les
  téléphones montrent le même.
- **À zéro, il sonne** : plein écran jaune, la marmite secoue une cloche, « **Dring !** Sors les lasagnes du
  four. », avec « Sorti » et « + 5 min » ; un son, et une vibration là où l'appareil le permet. « Sorti » finit
  l'étape et son geste de sortie ; « + 5 min » relance le minuteur (§ 4.5).
- Il sonne sur **tous** les téléphones de la session ; un seul « Sorti » l'arrête partout. Si l'appli n'est pas à
  l'écran, une notification part (§ 16) à **chaque cuisinier qui a un compte**, avec un retard possible d'une
  minute (le serveur la prépare à la minute suivante) : l'écran d'alarme, lui, sonne à l'heure. Une notification
  en file est annulée par « + 5 min », « Annuler » et « Sorti ».
  Sur iPhone, la notification peut s'afficher même quand l'appli est à
  l'écran : le texte est le même, l'écran d'alarme reste la référence.
- Sans réponse, et tant que l'écran de cuisine est affiché, il resonne chaque minute pendant 10 minutes, puis
  reste affiché, en rouge clair : « Les lasagnes attendent depuis 12 min. » L'appli à l'arrière-plan : une
  notification, puis un seul rappel (§ 16).
- Deux minuteurs à zéro en même temps s'affichent l'un sous l'autre, le plus ancien en haut.
- **Un minuteur à la demande** : « Popote, un minuteur de 8 minutes pour les œufs » ; il s'ajoute à « Pendant ce
  temps », sans étape.

### 11.4 Le plan se refait tout seul

Le plan est recalculé par l'API, sans rien demander, quand :

| Ce qui arrive | Ce que Popote dit |
|---|---|
| une étape finit avec plus de 5 minutes d'écart sur le plan | rien, sauf si l'heure de fin bouge de plus de 5 minutes : « **Fin vers 12 h 30** maintenant. » |
| un cuisinier s'en va (« Je m'en vais », dans « … », ou l'autre le dit pour lui) | « **Léa s'en va ?** Je refais le plan pour toi seul. » ; la fin est redite. Le dernier cuisinier qui s'en va met la session en pause : « **Plus personne en cuisine :** je mets en pause. » |
| un cuisinier arrive | « **Léa est là !** Je lui donne la sauce. » |
| une étape est passée, ratée, une recette retirée | la phrase du § 11.2, puis la nouvelle heure de fin |
| un appareil n'est plus là (« Le four est pris », dans « … ») | « **Sans le four**, les lasagnes attendent. », et les choix du § 10.1 |

Un recalcul ne touche jamais une étape en cours ni un minuteur ; il ne change que la suite, et porte une nouvelle
version (§ 10.3). Un geste vise **une étape**, pas une version : « Fait » sur une étape qui est toujours en
cours pour ce cuisinier est accepté, quel que soit le numéro du plan qu'il avait sous les yeux. Sinon rien n'est
écrit, l'écran reçoit le plan à jour, et la bulle dit : « **Le plan a changé.** Regarde ta nouvelle carte. »

**« Fait » n'attend jamais un recalcul.** La carte suivante vient du plan courant, tout de suite ; ensuite le
recalcul part, avec la version qu'il attend : si un autre « Fait » l'a déjà fait changer, ce recalcul est refusé et
refait sur la version à jour. Deux « Fait » qui arrivent ensemble sont écrits l'un après l'autre, par session ; la
suite de chacun vient du plan courant au moment où il est écrit.

### 11.5 Parler à Popote en cuisine

Deux façons, la seconde seulement là où elle marche vraiment :

- **Maintenir pour parler** (toujours livré) : on garde le doigt sur le gros micro de la barre, on dit sa phrase,
  on lâche. Une demande par appui ; le micro n'écoute que pendant l'appui. Ici « Popote » n'a pas besoin d'être
  dit.
- **Mains libres** (livré seulement après essai sur de vrais appareils, § 18, K-C6) : le micro reste ouvert tant
  que l'écran de cuisine est affiché, et Popote n'agit que sur une phrase qui commence par « Popote ».

| On dit | Ce qui se passe |
|---|---|
| « Popote, c'est fait » | comme « Fait » ; Popote lit le geste suivant |
| « Popote, répète » | elle relit le geste en cours |
| « Popote, combien de lait de coco ? » | la quantité à l'échelle : « **40 cl**, pour 4 parts. », affichée et dite |
| « Popote, un minuteur de 8 minutes » | § 11.3 |
| « Popote, il reste combien au four ? » | le temps du minuteur |
| « Popote, pause » | § 11.6 |

- Mains libres est éteint par défaut, et s'allume par un appui, avec ce qu'il implique écrit une fois, sans
  rien promettre de faux : « **Ton appareil écoute tant que cet écran est ouvert**, et son service de dictée peut
  recevoir ce qu'il entend. Popote, elle, n'en garde rien. » Un point rouge sur la barre dit que le micro écoute ;
  il porte un nom pour le lecteur d'écran (« Micro ouvert »). **Un seul appareil à la fois** écoute en mains
  libres par session : deux téléphones dans la même pièce se répondraient l'un l'autre. Le second lit « **Léa
  écoute déjà sur son téléphone.** » et garde « maintenir pour parler ».
  Les phrases qui ne commencent pas par « Popote » ne sont ni envoyées à Popote, ni écrites nulle part.
- **Les seules phrases qui agissent** sont celles du tableau, reconnues par une liste fixe côté écran, jamais par
  un modèle. À la voix on peut finir une étape, lancer un minuteur, mettre en pause ; on ne peut ni arrêter une
  session, ni retirer une recette, ni rien supprimer. « Popote, c'est fait » s'annule comme un « Fait » (10
  secondes, ou « Popote, annule »).
- L'écoute continue ne suit pas la coupure après 8 secondes de silence du mode vocal d'« Aujourd'hui » : elle
  reste ouverte tant que l'écran de cuisine est au premier plan, et se coupe dès qu'on le quitte.
- Ce que le socle a vérifié (14/11/2026) : sur un téléphone Android, l'écoute s'arrête après chaque phrase et
  doit être relancée, avec des trous ; sur un iPhone, elle devient muette après un son de l'appli (l'alarme, la
  voix de Popote). Mains libres n'est donc montré que sur les appareils où l'essai a réussi ; ailleurs, il n'y
  a que « maintenir pour parler », et tout se fait aussi au doigt (§ 18, K-C6).
- Popote lit à voix haute le geste suivant seulement en mains libres. Une quantité de recette peut être dite ; un
  montant d'argent ne l'est jamais (« Aujourd'hui », § 7).

### 11.6 La pause, l'arrêt, la fin

- **Pause** : « **En pause.** Les minuteurs continuent. On reprend quand tu veux. » avec « Reprendre ». La session
  est « en pause » pour tout le monde ; un minuteur qui sonne sonne quand même. À la reprise, le plan est
  recalculé depuis l'heure qu'il est.
- **Une pause de plus de 24 heures** : la bulle demande « **On reprend, ou on arrête ?** ».
- **« Arrêter la session »** (depuis la pause, ou « … ») : Popote liste les recettes et demande, pour chacune qui
  n'est pas finie : « **Le gratin : il est cuit ?** » avec « Oui » et « Non ». Les recettes cuites vont au
  rangement ; les autres ne sont pas dressées. Pour une recette commencée et pas cuite, la carte du placard
  (§ 12.4) demande ce qui a été utilisé ; une recette pas commencée laisse ses ingrédients au placard. Si aucune
  recette n'est cuite, la session est « arrêtée », après cette seule carte du placard.
- **« Terminer quand même »** apparaît quand il reste des étapes non faites (des étapes « passées » comprises) et
  que plus aucune n'est en cours : Popote les nomme, puis pose la même question, recette par recette.
- **La dernière étape faite** : plein écran « **C'est cuit !** 1 h 52, presque pile. » (la durée réelle, et l'écart
  au plan : « 8 min de moins que prévu », « 12 min de plus »), confettis, puis le rangement.

## 12. Dresser et ranger (`/cuisiner/session/:id/ranger`)

### 12.1 Dresser

Popote : « **On dresse !** 10 barquettes. » Une carte par recette cuite :

> **Lasagnes · 4 barquettes**
> Sam : 2 × 310 g · Léa : 2 × 255 g · selon vos objectifs · estimé
> [Peser le plat]

- **Exception assumée :** cet écran montre les parts de chacun (« Sam : 2 × 310 g, Léa : 2 × 255 g »), parce que
  c'est ce qu'il faut mettre dans chaque barquette. Il ne montre jamais les objectifs eux-mêmes (« Aujourd'hui »,
  § 6) : ni le repas visé, ni le pourcentage, ni les calories d'une personne ; « selon vos objectifs » reste la
  seule mention. Cet écran n'est jamais lu à voix haute.
- **Combien pour chacun** : les barquettes d'une recette se partagent à égalité entre les membres ; s'il en reste
  une, elle va à l'un puis à l'autre, d'une recette à la suivante. Se change sur la carte (« 3 pour moi, 1 pour
  Léa »). Un foyer d'une personne : tout est pour elle.
- **Quel poids pour chacun** : le plat est partagé au prorata du **repas visé** de chacun (35 % de son énergie du
  jour, § 18, K-C4) ; sans objectifs chez l'un, il prend la moyenne des autres ; sans objectifs chez personne, les
  poids sont égaux.
- **Le poids du plat** : *estimé* tant qu'on ne l'a pas pesé : la somme des poids des ingrédients, à l'échelle,
  corrigée de ce que la cuisson change quand la table du serveur le sait (le riz et les pâtes prennent de l'eau,
  la viande en perd). « Peser le plat » ouvre un champ : « Le plat cuit, sans son récipient », en grammes. Pesé :
  « **Pesé !** Les poids sont justes maintenant. », les poids changent (324 g et 266 g pour 1 180 g) et
  l'étiquette dit « pesé ». Un poids de moins de la moitié ou de plus du double de l'estimation demande :
  « **1 180 g, sans le récipient ?** » avec « Oui » et « Je corrige ».
- **Les valeurs d'une barquette** : la part des valeurs **totales** de la recette qui correspond à son poids. La
  cuisson change le poids, pas l'énergie : peser corrige les grammes, pas les valeurs totales.
- **Trop léger, trop copieux** : si l'énergie d'une barquette est sous 80 % du repas visé de la personne : « **C'est
  léger.** J'en fais 3 au lieu de 4 ? » ; au-dessus de 120 % : « **C'est copieux.** J'en fais 5 ? ». « Oui »
  change le nombre de barquettes et refait le partage.
- **Le complément** : si les protéines d'une barquette sont sous 90 % de celles du repas visé, une ligne le dit :
  « Pour toi : + 100 g de skyr, il manque des protéines. » (arrondi à 25 g ; l'aliment se règle dans les réglages
  du foyer). C'est une information : rien n'est créé.
- Une recette sans valeurs connues se dresse quand même, à poids égaux, et le dit : « Valeurs inconnues : parts
  égales. »

### 12.2 Où ranger

Une carte « Où je les range ? » : deux colonnes, « Frigo (4 jours) » et « Congélateur (3 mois) », avec un jeton par
barquette (la couleur de la recette, l'initiale de la personne). Popote propose, et dit : « **5 au frigo, 5 au
congélateur.** À manger avant jeudi pour le frigo. » Un jeton se glisse d'une colonne à l'autre, ou se touche.

**Ce que Popote propose** : au frigo, pour chaque personne, ses barquettes des quatre prochains jours d'après la
semaine (parcours « Semaine et Frigo ») ; sans rien de prévu dans la semaine, 2 par personne, en alternant les
recettes ; le reste au congélateur. Une recette qui **ne se congèle pas**, ou dont on ne sait pas si elle se
congèle, reste au frigo, et Popote prévient s'il y en a pour
plus de quatre jours : « **Le gratin ne se congèle pas :** 2 à manger d'ici mercredi. »

- Au frigo : « à manger avant » le jour de la cuisson + 4 jours (cuit dimanche : avant jeudi, le dernier repas est
  celui de mercredi soir). Au congélateur : + 90 jours. Ces règles sont celles du parcours « Semaine et Frigo ».
- « Cuit le » : aujourd'hui par défaut ; se change (pas dans le futur, pas plus de 3 jours en arrière) pour une
  session rangée le lendemain. Une date qui rend le « à manger avant » du frigo déjà passé n'offre pas le frigo :
  tout va au congélateur, ou la barquette est dite périmée.

### 12.3 Tout ranger

Popote rappelle une fois, avant : « Laisse tiédir avant de fermer les barquettes. »

« Tout ranger » : chaque jeton s'envole, tampon « Rangé », confettis ; « **10 parts rangées !** Je les place dans
votre semaine ? » avec « Oui, place-les » (parcours « Semaine et Frigo ») et « Plus tard ».

- Les barquettes sont créées **en une seule écriture** : toutes, ou aucune. Rejouer (double appui, second
  téléphone, réponse perdue) ne crée rien de plus : l'écran montre ce qui est rangé.
- Le dressage (le partage, le nombre, la pesée, où ranger) est un état de la session, avec sa version : si
  l'autre vient de le changer, « Tout ranger » ne range rien, l'écran se met à jour et la bulle dit : « **Léa
  vient de changer le dressage.** Regarde, et range. »
- Chaque barquette porte : sa recette, pour qui elle a été dressée, son poids, ses valeurs (figées : corriger la
  recette plus tard ne les change pas), le jour de la cuisson, où elle est, à manger avant.
- La session passe « rangée ». Elle ne se défait pas ; une barquette se corrige ou se retire dans le Frigo.

### 12.4 Ce que la session a pris au placard

Avant « Tout ranger », une carte repliée : « Je retire du placard ce que la session a pris. » avec « Voir ».
Dépliée : chaque ingrédient, ce qu'il y avait, ce qui reste (« Oignons : 5, il en reste 2 »). Toucher une ligne
corrige ce qui reste. « Ne touche pas au placard » laisse tout tel quel.

- Seul ce qui se calcule est retiré : un ingrédient sans quantité, ou dont le placard n'a pas de quantité
  comparable, est laissé, et la carte le dit (« 2 ingrédients que je ne sais pas compter »).
- Ce qui se compte à la pièce est retiré en pièces entières, arrondi vers le bas **sur la somme par aliment de la
  session** (§ 9.1) : deux recettes qui demandent un oignon et demi chacune en retirent trois, pas deux.
- Le retrait est écrit avec les barquettes, une seule fois.

### 12.5 La session, à la fin

Une carte « La session » : « 1 h 52 en cuisine », « 6,60 € de courses par part » (§ 13, si le coût est connu), et pour
chaque recette deux pouces : « On refait ? ». Un pouce levé vaut « On aime » ; un pouce baissé demande : « **Plus
jamais, ou juste pas tout de suite ?** ». Rien n'est obligatoire : la carte se ferme.

## 13. Ce que la session coûte

- **L'estimation** (« ≈ 66 € ») : pour chaque article à acheter, le dernier prix vu par le foyer pour cet aliment,
  ramené à la quantité, s'il a moins de 12 mois. Elle n'est affichée que si **chaque** article alimentaire à
  acheter a un prix connu, et toujours avec « ≈ ». Sinon rien n'est affiché. Au début, presque aucune estimation
  ne s'affiche, faute de prix : c'est normal, et rien ne bloque ; chaque ticket enregistré en apprend.
- **Le coût réel, par la banque** : quand le compte joint est branché (monde « Budget ») et que des opérations
  rangées « Courses » sont passées depuis le premier cochage, Popote demande, sur la liste, pour chacune (trois au
  plus) : « **61,80 € au Supermarché du Port hier :** c'était ces courses ? » avec « Oui » et « Non ». « Oui » :
  « **6,18 € de courses par part.** Courses : 324 € sur 500 ce mois-ci. » Le montant n'est jamais dit à la voix ni
  mis dans une notification. Une opération n'est rattachée qu'à **une** session : si deux sessions ont couru
  ensemble, « Oui » demande laquelle (« C'était pour dimanche, ou pour ce soir ? »), et l'opération sort de la
  question de l'autre.
- **Le coût réel, par le ticket** : « Scanner le ticket pour apprendre les prix » : une photo ; Popote récapitule
  les lignes lues, leur prix, l'article de la liste qu'elle rapproche, et marque « à vérifier » ce dont elle doute ;
  la personne corrige et « Enregistrer ». Les prix lus nourrissent l'estimation des prochaines listes.
- **Les courses par part** = ce qui a été payé ÷ les parts de la session. C'est le prix des courses, pas celui du
  plat : ce que le placard a fourni n'y est pas ; si la liste portait autre chose que la session, Popote dit
  « environ ». Sans coût réel, la carte de fin ne montre pas de prix.
- Le poste « Courses » du Budget reste celui du Budget : ce monde ne l'écrit pas, il le cite.

## 14. La tuile Cuisiner de l'accueil

L'accueil (« Aujourd'hui », § 4.5) rend la tuile depuis un état typé (K1). L'ordre est celui de la bulle (§ 5). La
règle de « mise en avant » reste celle d'« Aujourd'hui ».

| Priorité | État | Phrase |
|---|---|---|
| 1 | Un minuteur sonne | Dring ! |
| 2 | En cuisine | En cuisine : 7 / 31 |
| 3 | À ranger | 10 barquettes à ranger |
| 4 | En pause | En pause |
| 5 | Prête | Tout est là |
| 6 | Courses | 12 articles à prendre |
| 7 | Menu | Menu : 4 / 10 parts |
| 8 | Sinon | Nouvelle session |

Deux « choses à faire » de l'accueil viennent de ce monde : une session « à ranger » depuis plus d'une heure (comme
le rappel du § 16)
(« **À ranger :** les 10 barquettes de la session. »), et une session en pause depuis plus de 24 heures.

## 15. Sur PC (à partir de 900 px)

Deux colonnes et Popote ouverte à droite, comme sur l'accueil.

- **Le menu et les recettes** : à gauche le menu de la session et son résumé ; au centre les recettes en grille de
  cinq colonnes, la fiche en panneau.
- **Le plan** : à gauche le menu ; au centre la frise en grand, chaque étape lisible.
- **En cuisine** : l'écran sombre prend toute la largeur ; une colonne par cuisinier (comme « On partage cet
  écran »), les minuteurs à droite. C'est l'écran d'une tablette ou d'un ordinateur posé dans la cuisine.
- **Les courses, ranger, ajouter une recette** gardent leur colonne unique, centrée.

## 16. Ce que ce monde demande aux rappels

| Rappel | Quand | Texte |
|---|---|---|
| Minuteur | un minuteur arrive à zéro et l'appli n'est pas à l'écran ; à chaque cuisinier avec un compte, jusqu'à une minute après (§ 11.3) ; annulé par « + 5 min », « Annuler », « Sorti » | Un minuteur a sonné. |
| Minuteur oublié | 10 minutes après, sans réponse | Un minuteur attend toujours. |
| Arrivée en cuisine | « C'est parti ! » lancé par l'autre, à celui qui est coché cuisinier | La session commence. |
| À ranger | une heure après « C'est cuit ! », si rien n'est rangé | La session attend d'être rangée. |

Aucun réglage pour les deux premiers : c'est la personne qui a lancé la session. Aucun rappel ne nomme un plat.

## 17. Ce que l'API doit fournir

Le contrat appartient au socle. Chaque écriture suit la politique d'« Aujourd'hui » (§ 5) : clé d'opération, cible
et version explicites, rejouable sans doublon.

| N° | Besoin |
|---|---|
| K1 | **L'état du monde**, en un appel : les sessions ouvertes (nom, état, recettes, parts, étape en cours), la situation de la bulle (§ 5), l'état de la tuile (§ 14), les minuteurs qui sonnent, les quotas d'IA restants. |
| K2 | **La session** : créer (cible de parts, et la phrase de ce qu'elle couvre) ; lire ; changer la cible, le jour ; retenir, régler, retirer une recette ; annuler. Une seule session à la fois en cuisine, en pause ou à ranger ; la mise en pause après 12 heures sans geste ni minuteur en cours ; les bornes du § 4.2. |
| K3 | **Proposer un menu** (§ 6.2) : le menu, la raison typée de chaque recette, le résumé (parts, temps à deux, estimation) ; « Autre menu », « Changer » une carte ; la traduction d'une phrase en filtres typés, récapitulée ; déterministe à entrées égales. |
| K4 | **Les recettes** : la liste par dix (recherche sur le titre et les ingrédients, filtres du § 7.1, ordre total), avec, pour « Avec mon frigo », le nombre d'ingrédients manquants ; la fiche à l'échelle d'un nombre de parts ; « On aime », « Plus jamais » ; supprimer. |
| K5 | **Lire une recette** (texte, photos, lien, dictée) : un brouillon structuré (§ 8.2) où chaque valeur porte d'où elle vient (écrite, supposée, estimée) et chaque ingrédient son état ; la liste ordonnée de ce qui manque ; plusieurs recettes détectées ; illisible ; les étapes « à vérifier » ; la lecture d'un lien durcie et les photos sans métadonnées, supprimées à la fin de la lecture, trois au plus (§ 8.6). La source est une donnée, jamais une consigne. |
| K6 | **Corriger et garder** : écrire le brouillon (titre, parts, ingrédients, aliment reconnu, étapes, durées, natures, appareils, ordre) ; les valeurs recalculées à chaque écriture ; chercher un aliment ; garder ; corriger une recette existante (la version du foyer) ; écrire une recette sans aucun modèle ; comment la durée de chaque étape suit la quantité, « enchaînée ». |
| K7 | **Inventer** (§ 8.5) : une recette complète pour une envie et un périmètre ; l'ajuster par une phrase ; ce qui n'est pas tenu, dit ; les valeurs calculées par le serveur ; le quota. |
| K8 | **La liste de courses du foyer** (§ 9) : les lignes à acheter et « déjà chez toi », par rayon dans l'ordre appris, avec pour quoi elles sont là ; cocher, décocher (entrée et sortie du placard) ; ajouter, retirer, « le remettre à chaque fois » ; « Je n'en ai plus » ; « Pas trouvé » et ses trois choix, avec le remplaçant proposé ; « J'ai fini » ; qui a coché quoi et dans quel rayon ; l'estimation ; ce que chaque session demande de chaque ligne, et quand elle est prête ; les besoins des sessions jusqu'à leur rangement. Cocher vise (aliment, foyer) avec une quantité prise et pose un état, avec sa version ; le cycle de vie d'une ligne (dérivée, cochée, détachée, décochage après débit) est celui du § 9.2 ; le placard sert d'abord la session en cuisine (§ 9.1) ; arrondis sur la somme par aliment. La liste est relue assez souvent pour deux personnes dans le même magasin. |
| K9 | **Le plan** (§ 10) : les cuisiniers et les appareils du jour (dont un cuisinier sans compte) ; les durées manquantes ; calculer : la frise (étapes, débuts, durées, cuisinier, appareil, fusions), le temps du plan, le temps « l'une après l'autre », l'heure de fin, les phrases typées de ce qui est gagné, le goulot ; les places, les gestes de sortie, les règles du four, la fusion retenue ou non ; « aucun plan possible » et ses deux issues ; un numéro de version ; déterministe, calculé en tâche asynchrone avec un nombre d'essais proportionnel à la taille et un pire cas mesuré (refus au-delà), version = empreinte des entrées, recalcul stable, repli « un plan valide ou aucun plan », jamais pire que l'une après l'autre quand elle est possible, et tenu à 5 % du meilleur sur les petits cas de référence avec borne basse et tests par propriétés à taille réelle (§ 10.3). |
| K10 | **Lancer la session** : une fois, à l'heure du serveur. |
| K11 | **En cuisine** (§ 11) : l'état de la session pour un cuisinier (sa carte, la suivante, l'avancement, la fin prévue, ce que font les autres, les minuteurs avec leur heure de fin) ; « Fait » et son annulation ; « Passer » ; prendre une étape d'un autre ; les trois soucis ; partir, arriver ; un appareil en moins ; le recalcul et sa version ; « + 5 min », « Sorti » ; un minuteur à la demande. Une étape n'a qu'un cuisinier : le serveur refuse le second. Un geste vise une étape, pas une version du plan. Les cartes suivantes d'un cuisinier, d'avance, en une liste ordonnée (avec, pour chacune, si elle peut être passée) : l'écran n'en calcule aucune. L'heure du serveur, pour mesurer le décalage de l'appareil à chaque synchro. Les cinq gestes (« Fait », « Sorti », « + 5 min », « Passer », « Pause ») acceptés avec leur clé, en file, rejoués dans l'ordre, et leur heure, que le serveur borne (§ 19). « Fait » n'attend jamais un recalcul ; le recalcul porte la version attendue (§ 11.4). Relu assez souvent pour que deux téléphones se suivent. |
| K12 | **La pause, l'arrêt, la fin** : mettre en pause, reprendre, arrêter (recette par recette : cuite ou non), terminer quand même ; la durée réelle et l'écart au plan. |
| K13 | **Dresser** (§ 12.1) : par recette cuite, le nombre de barquettes par personne, leur poids, leurs valeurs, le complément, le diagnostic (léger, copieux) ; changer le partage, le nombre ; peser le plat et ses bornes. Le dressage a une version. |
| K14 | **Ranger** (§ 12.2 à 12.4) : la proposition frigo ou congélateur ; ce que la session prend au placard et ce qui ne se compte pas ; « Tout ranger » en une écriture, avec les corrections du placard ; rejouable sans doublon. |
| K15 | **Le coût** (§ 13) : les opérations de courses candidates (jour, commerçant, montant) et leur réponse ; lire un ticket (les lignes, le prix, le rapprochement, le doute) et l'enregistrer ; le coût par part. |
| K16 | **Apprendre** : les durées réelles des étapes « tes gestes » et « à surveiller », et la proposition d'allonger une cuisson (§ 4.5) ; l'aliment choisi pour un mot, le poids d'un contenant et d'une pièce (§ 4.4) ; l'ordre des rayons ; les derniers prix et leur âge ; « On refait ? ». |
| K17 | **Popote dans ce monde** : répondre sur une recette, une quantité, un minuteur, une session ; proposer les blocs « recette », « article », « menu » ; mener aux écrans. Le modèle ne reçoit que ce que la personne peut voir, sans prénom ni objectif nominatif ; les textes de recettes et de pages sont encadrés comme des données. |

Aucune réponse de ce monde n'est gardée dans le navigateur au-delà de l'écran, sauf la liste blanche de la cuisine
sans réseau (§ 19, K-C14 : étapes de la session, minuteurs, gestes en attente).

## 18. Points retenus par défaut

Le 13/11/2026, le propriétaire a demandé de retenir les choix proposés, qu'il relira. Un point qu'il change rouvre
la partie concernée.

| N° | Point | Ce que la spec retient |
|---|---|---|
| K-C1 | Le ticket de caisse | dans ce monde, en dernière tâche du plan : il n'est nécessaire à rien d'autre |
| K-C2 | La photo d'une recette du catalogue | copiée une fois dans le seau privé de l'appli (socle, § 6.2), pour l'usage privé du foyer : jamais montrée hors du foyer, et retirée si le site d'origine le demande ; sans photo, le carré de couleur |
| K-C3 | La garde au frigo et au congélateur | 4 jours ; 90 jours |
| K-C4 | Le repas visé | 35 % de l'énergie du jour, pour toute barquette ; le réglage, s'il vient, appartient aux objectifs |
| K-C5 | Le complément | du skyr, 10 g de protéines pour 100 g ; un autre aliment se choisit dans les réglages du foyer |
| K-C6 | Parler en cuisine | « maintenir pour parler » est livré d'abord ; mains libres en continu seulement après un essai réussi sur de vrais appareils, masqué sinon (vérifié par le socle le 14/11/2026 : fragile sur Android comme sur iPhone, et le son peut partir vers le service de dictée de l'appareil). Rien d'autre n'en dépend |
| K-C7 | Plusieurs sessions ouvertes | oui ; une seule en cuisine à la fois |
| K-C8 | Un cuisinier sans compte | un prénom, sur l'écran de celui qui l'ajoute ; les foyers amis viendront plus tard |
| K-C9 | Les durées apprises | à partir de 3 mesures, la médiane |
| K-C10 | Les quotas du mois, par foyer | **Aucun chiffre n'est fixé ici** : les plafonds (recettes lues, inventions avec leurs ajustements, tickets) sont une configuration du serveur, et l'écran affiche ce que rend l'API : le reste du jour, le reste du mois, et quelle limite bloque ; les autres demandes en mots dans le quota général de Popote. Le compteur unique du socle IA (plafond du jour) décide ; ces quotas en sont des vues, et l'écran dit lequel bloque (§ 4.7) |
| K-C13 | Un seul magasin | un seul ordre de rayons, appris des cochages ; pas de liste par magasin |
| K-C14 | Ce que la cuisine garde sur l'appareil | accepté par le socle le 14/11/2026, à ces conditions : en IndexedDB, sous la clé (foyer, personne, session), jamais dans le cache du service worker ni dans le stockage local ; **autorisés** : les étapes de la session (texte, durées), les minuteurs et les gestes en attente avec leur clé d'opération ; **interdits** : tout prénom (seulement des identifiants de cuisinier), tout objectif, toute valeur de nutrition, tout montant ; **purge** à la fin ou à l'arrêt de la session, à la déconnexion, à la réponse 401, au changement de compte, et au démarrage de l'appli si les données ont plus de 24 heures ; un geste en attente ne se rejoue que sous le compte qui l'a posé, avec sa clé, sans doublon ; le test « rien dans le stockage » est un test de **liste blanche** (tout ce qui s'y trouve est dans la liste ci-dessus, rien d'autre). C'est la seule exception à « rien dans le navigateur » |
| K-C11 | Le stock dans la liste | ce que le placard couvre n'est pas à acheter, mais reste visible et se corrige (« Déjà chez toi ») |
| K-C12 | Les textes et états que le prototype ne joue pas | tous ceux de cette spec que le film ne montre pas : proposés par la spec |

## 19. États communs, mouvement, accessibilité

- Les états communs (chargement, réveil, erreur, hors ligne, session expirée) sont ceux de la fondation du front
  (F18 à F21). Les écritures suivent les trois cas d'« Aujourd'hui » § 5, avec les mêmes textes.
- **La cuisine sans réseau.** Pour qu'un onglet rechargé ou un téléphone verrouillé ne perde rien, l'écran de
  cuisine garde **sur l'appareil**, dans IndexedDB sous la clé (foyer, personne, session), le temps de la session
  seulement : les étapes de la session (texte, durées), les minuteurs et les gestes pas encore envoyés. Jamais un
  prénom, un objectif, une valeur de nutrition ni un montant. Tout est purgé quand la session quitte la cuisine, à
  la déconnexion, à la réponse 401, au changement de compte, et au démarrage de l'appli si les données ont plus de
  24 heures ; un geste en attente ne se rejoue que sous le compte qui l'a posé (§ 18, K-C14). Après un
  rechargement hors ligne, la ligne de l'autre dit « L'autre cuisinier : … », faute de prénom gardé.
- **Sans réseau, rien n'est calculé sur l'écran.** L'API a donné d'avance les cartes suivantes de ce cuisinier, en
  une liste ordonnée ; « Fait » montre la suivante de la liste, et sans carte d'avance l'écran dit : « **Pas
  d'autre carte sans réseau.** Garde l'écran allumé. » La carte en cours, les minuteurs et leur alarme continuent.
  Le décalage entre l'heure du serveur et celle de l'appareil est mesuré à la dernière synchro ; les décomptes
  suivent une horloge monotone, qui ne saute pas si l'on change l'heure du téléphone ; l'heure d'un geste est
  l'heure du serveur à la dernière synchro plus le temps écoulé depuis. Les cinq gestes (« Fait », « Sorti »,
  « + 5 min », « Passer », « Pause ») vont en file avec leur clé (« En attente. ») et partent au retour du réseau,
  dans l'ordre. Le serveur garde l'heure si elle est plausible (pas dans le futur, pas avant l'étape précédente,
  pas plus vieille que la coupure) ; un minuteur lancé hors ligne finit donc à l'heure que l'écran montrait. Un
  bandeau le dit : « **Pas de réseau.** Je continue ici ; garde l'écran allumé. **Écran verrouillé, aucune alarme
  ne sonne sans réseau.** » Rien d'autre de ce monde n'est gardé dans le navigateur : ni stockage local ou de
  session, ni cache du service worker pour les réponses de l'API, ni IndexedDB hors de la liste ci-dessus.
- **Ce qui dépend de l'appareil**, à valider sur de vrais téléphones, avec son repli écrit :

  | Ce que l'écran veut | Si l'appareil ne le permet pas |
  |---|---|
  | ne pas se mettre en veille (possible sur iPhone en appli installée à partir d'iOS 18.4 ; à redemander chaque fois que l'appli revient à l'écran) | une ligne, une fois : « Garde ton écran allumé pendant la cuisine. » |
  | sonner à zéro | le son est débloqué par l'appui sur « C'est parti ! » (ou « Reprendre »), et réglé pour sonner même en mode silencieux ; appli à l'arrière-plan ou écran verrouillé, aucune page ne sonne de façon sûre : seule la notification le fait, selon les réglages du téléphone. L'alarme visuelle, plein écran, reste la référence |
  | vibrer | seulement sur Android ; la vibration est un plus, jamais le seul signal |
  | prévenir quand l'appli n'est pas à l'écran | la notification (§ 16) n'existe que pour l'appli installée et autorisée ; sinon l'écran le dit au lancement : « Garde Popote ouverte : je ne pourrai pas te prévenir autrement. » |
- **Les courses sans réseau** : un cochage attend (« En attente. ») avec sa clé et sa quantité prise, en mémoire
  de la page seulement, et part au retour du réseau. Il n'est pas gardé sur l'appareil (§ 18, K-C14) : fermer
  l'onglet le perd, et le bandeau le dit (« Reste sur cette page jusqu'au retour du réseau. »). La liste affichée
  reste celle de la dernière lecture, et le dit. Au retour, un cochage dont la ligne a changé entre-temps est
  refusé avec le texte du § 9.2 (« Léa vient de la changer. »).
- Mouvement : celui du prototype, par Motion, avec les durées et les courbes des jetons. L'envol des étapes vers
  la frise, les compteurs, les tampons et les confettis respectent « mouvement réduit » : l'état final s'affiche
  d'un coup. L'alarme d'un minuteur ne clignote pas plus de trois fois par seconde.
- Les quantités sont du texte : « 800 g », « 40 cl », espace insécable avant l'unité, virgule décimale.
- La frise du plan a un équivalent en liste, lu par un lecteur d'écran : par cuisinier, ses étapes dans l'ordre,
  avec l'heure de début. La couleur d'une recette n'est jamais le seul signe : son nom est écrit ou lu.
- En cuisine, chaque nouvelle carte est annoncée dans une région `status` (« À toi : émince 3 oignons, environ 4
  minutes ») ; l'alarme est une région `alert`, annoncée **une fois** quand elle apparaît ; ses rappels chaque
  minute sonnent et clignotent sans être ré-annoncés (une annonce de plus au bout de 10 minutes : « Les lasagnes
  attendent depuis 12 min »). À l'apparition de l'alarme, le focus va sur « Sorti ». « Le plan a changé. » et « En
  attente. » sont annoncés dans la région `status`. Le bouton « Fait » fait au moins 64 px de haut.
- « En attente », « Le plan a changé », l'alarme, un article coché ou « à reprendre » ne se distinguent jamais par
  la couleur seule : une icône et un mot l'accompagnent. « Annuler » (10 secondes) a son équivalent sans limite de
  temps dans « … » (§ 11.2), ce qui tient le critère WCAG 2.2.1.
- Cibles tactiles de 44 px au moins ; tout se fait au clavier ; glisser a toujours un équivalent au toucher (un
  menu « … » sur la ligne : « Pas trouvé », « Retirer » ; toucher un jeton pour le changer de colonne).
- Le focus après une action :

  | Action | Le focus va sur |
  |---|---|
  | « Ça me va », « On passe aux courses », « C'est parti ! » | le titre de l'étape suivante |
  | « + », « Ajouter : N parts » | le compteur des parts |
  | Répondre à une question de Popote (§ 8.3) | la question suivante, ou « Garder la recette » |
  | Cocher un article | la case de l'article suivant du rayon |
  | Un choix de « Pas trouvé » | la ligne changée, ou la suivante si elle est partie |
  | « Fait » | la nouvelle carte |
  | « Sorti », « + 5 min » | la carte en cours |
  | Fermer une feuille ou une confirmation | le bouton qui l'avait ouverte |
  | « Tout ranger » | le message de fin |

## 20. Critères d'acceptation (scénarios au clic)

1. *Étant donné* une semaine pleine et un frigo plein, *quand* Sam touche « Nouvelle session », *alors* la session
   s'ouvre à « Combien de parts ? ».
2. *Quand* Sam choisit 10 puis « Propose-moi », *alors* un menu de 10 parts s'affiche, chaque recette avec une
   raison de la liste fermée et le résumé ; « Autre menu » en donne un autre ; les mêmes entrées redonnent le même.
3. *Quand* Sam dit « Pas de soupe », *alors* Popote récapitule le filtre, une recette change, le résumé suit ; une
   phrase incomprise ne change rien.
4. *Quand* Sam ouvre une fiche et choisit 6 parts pour une recette écrite pour 4, *alors* les quantités des
   ingrédients sont multipliées par 1,5, et le compteur gagne 6.
5. *Quand* Sam photographie une recette sans nombre de parts, *alors* le récapitulatif marque « supposé », Popote
   demande le nombre, et les valeurs ne s'affichent qu'une fois les manques réglés ; « Garder la recette » est en
   pause sans titre.
6. *Négatif :* un texte collé qui contient une consigne (« ignore tes règles ») est lu comme une recette ou
   déclaré illisible ; rien d'autre ne change.
7. *Quand* Sam demande une recette « avec mon frigo » que le frigo ne permet pas, *alors* Popote dit ce qui manque,
   et les valeurs affichées sont celles calculées par le serveur.
8. *Étant donné* un menu validé, *alors* la liste de courses existe sans autre geste ; un aliment que le placard
   couvre est dans « Déjà chez toi » ; retirer une recette du menu retire ses articles pas encore pris.
9. *Quand* Léa coche un article sur son téléphone, *alors* il se coche sur celui de Sam avec son initiale.
10. *Quand* Sam glisse « Épinards » sur « Pas trouvé » puis « Remplacer », *alors* la ligne devient le remplaçant
    proposé, dans son rayon, après « D'accord ».
11. *Quand* le dernier article est coché, *alors* la session est prête ; avec « Je repasserai », les articles restants
    restent sur la liste après la session. « J'ai fini » est actif même s'il reste des articles : *quand* Sam le touche
    avec un article mineur non pris et choisit « Enlève-les », *alors* l'article quitte la liste et la session est
    prête ; avec un ingrédient qui compte, la question du § 9.4 est posée avant.
12. *Quand* Sam éteint Léa dans « Qui cuisine ? », *alors* le plan est recalculé pour un cuisinier et son temps
    augmente ; rallumer redonne le même plan qu'avant.
13. *Étant donné* le plan de l'exemple, *alors* il ne dure pas plus que les recettes l'une après l'autre, aucune
    étape ne commence avant celles dont elle dépend, aucun cuisinier n'a deux gestes à la fois, le four ne porte
    jamais plus de plats que ses places ni deux plats à plus de 10 °C d'écart, et chaque cuisson a quelqu'un pour
    la sortir. Sur les petits cas de référence du socle, il ne quitte pas la cuisine plus de 5 % après le meilleur plan
    (calcul exact) ; à taille réelle, la borne basse et les tests par propriétés tiennent.
14. *Quand* Sam touche « Fait », *alors* sa carte suivante arrive et l'anneau avance ; « Annuler » dans les 10
    secondes remet l'étape.
15. *Quand* Sam finit « Enfourne les lasagnes », *alors* un minuteur de 35 minutes démarre sur les deux
    téléphones ; à zéro il sonne sur les deux ; « Sorti » sur l'un l'arrête sur l'autre.
16. *Quand* Léa touche « Je m'en vais », *alors* le plan est refait pour Sam seul, l'heure de fin est redite, et
    aucune étape commencée ne bouge.
17. *Quand* les deux touchent la même étape, *alors* un seul l'obtient ; l'autre lit « Léa l'a déjà prise. ».
18. *Sans réseau en cuisine, l'écran allumé*, la carte et les minuteurs restent, l'alarme s'affiche, et « Fait »
    part au retour du réseau avec l'heure de l'appui ; un minuteur lancé hors ligne finit à l'heure affichée ;
    recharger la page ne perd ni la carte ni les « Fait » en attente. Les cartes suivantes viennent de la liste
    donnée d'avance, jamais d'un calcul de l'écran ; un « Sorti » et un « + 5 min » faits hors ligne partent aussi
    au retour du réseau ; le bandeau dit qu'aucune alarme ne sonne écran verrouillé.
19. *Quand* Sam pèse le plat à 1 180 g, *alors* les poids des barquettes changent et leur somme fait 1 180 g ; les
    valeurs totales de la recette ne changent pas.
20. *Quand* Sam touche « Tout ranger » deux fois, *alors* 10 barquettes existent, pas 20 ; le placard a baissé une
    seule fois.
21. *Quand* une session est en cuisine, *alors* « C'est parti ! » d'une autre propose d'abord de finir la première.
22. *Quand* Sam arrête une session dont le gratin n'est pas cuit, *alors* le gratin n'est pas dressé et ses
    ingrédients restent au placard.
23. *Négatif :* aucune notification de ce monde ne nomme un plat ni ne porte un montant ; à la voix, aucun montant
    n'est dit.
24. *Au lecteur d'écran*, la frise du plan se lit en liste, chaque nouvelle carte de cuisine est annoncée, et
    l'alarme d'un minuteur l'est aussitôt.
25. *Sur téléphone (390 px)*, chaque écran correspond à sa capture de référence ; *sur PC*, le plan correspond à la
    capture PC, et les autres écrans suivent la règle du § 15 ; l'écart avec la capture de référence reste sous
    0,5 % des pixels, zones animées masquées.
26. *Étant donné* deux sessions, dont l'une en cuisine a besoin de 300 g de riz et le placard en a 300 g, *alors*
    la liste de l'autre demande 300 g de riz, pas « déjà chez toi ».
27. *Étant donné* un menu que le placard couvre en entier, *quand* Sam le valide, *alors* la session est prête
    sans passer par les courses.
28. *Étant donné* deux étapes « émincer des oignons » de 8 et 4 minutes, *alors* leur fusion dure 10 minutes ; elle
    n'est pas retenue si le plan en sort plus long ; deux cuissons ne fusionnent jamais.
29. *Étant donné* une recette retenue 2 fois, *alors* ses étapes « tes gestes » durent 2 fois plus, ses étapes
    « à surveiller » environ 1,4 fois plus (√2), sa cuisson au four ne change pas, et elle prend 2 places dans
    le four.
30. *Étant donné* une cuisson sortie en retard à trois sessions, *alors* sa durée ne change pas ; rallongée de 5
    minutes à trois sessions de suite, Popote propose de l'allonger, et rien ne change sans « Oui ».
31. *Quand* Sam annule un « Fait » alors que l'étape qui en dépendait vient d'être donnée à Léa (même pas
    commencée), *alors* « Annuler » n'est plus offert, ni dans « … » ; annulé à temps, le minuteur qu'il avait lancé s'arrête.
32. *Étant donné* un plan refait pendant que Sam regardait l'ancien, *quand* il touche « Fait » sur une étape qui
    n'est plus la sienne, *alors* rien n'est écrit et sa nouvelle carte s'affiche.
33. *Quand* Sam arrête une session dont aucune recette n'est cuite, *alors* elle est « arrêtée », Popote demande
    ce qui a été utilisé, et « Nouvelle session » est de nouveau libre.
34. *Négatif :* un lien vers une adresse privée ou interne, directement ou par redirection, n'est pas lu ; la
    personne lit « Je ne peux pas lire cette adresse. ».
35. *Négatif :* une recette inventée avec « poulet, 2 minutes » ou un four à 400 °C porte « à vérifier » et ne se
    garde pas avant confirmation.
36. *Étant donné* un ingrédient « sans quantité » qui n'est pas un assaisonnement, *alors* les valeurs sont
    « inconnues », partout où la recette apparaît.
37. *Quand* Sam pèse un plat à plus du double de l'estimation, *alors* Popote demande confirmation avant de
    changer les poids.
38. *Quand* Léa change le dressage pendant que Sam touche « Tout ranger », *alors* rien n'est rangé et l'écran de
    Sam se met à jour.
39. *En maintenant le micro*, « c'est fait » finit l'étape, et le micro n'écoute plus une fois le doigt levé.
    *En mains libres*, une phrase sans « Popote » ne fait rien ; « Popote, c'est fait » finit l'étape et s'annule
    comme un appui ; aucune phrase n'arrête la session ni ne supprime quoi que ce soit.
40. *Le quota de lecture à zéro*, « L'écrire moi-même » marche toujours, et « Fait », les minuteurs et la pause ne
    dépendent d'aucun quota.
41. *Les rappels :* un minuteur à zéro, appli à l'arrière-plan, envoie « Un minuteur a sonné. » ; une heure après
    « C'est cuit ! » sans rangement, « La session attend d'être rangée. ».

42. *Négatif :* après une session, ce qui reste dans IndexedDB est dans la liste blanche (étapes, minuteurs, gestes
    en attente, sous la clé foyer, personne, session) et ne contient aucun prénom, objectif, valeur de nutrition ni
    montant ; fin de session, déconnexion, réponse 401, changement de compte, et démarrage après plus de 24 heures
    le vident ; un geste en attente de Sam ne se rejoue pas sous le compte de Léa.
43. *Sans réseau*, l'heure de l'appareil décalée de 10 minutes ne décale ni un décompte ni l'heure d'un geste ;
    « Fait » montre la carte suivante de la liste donnée d'avance (aucun calcul de l'écran) ; « Sorti », « + 5 min »,
    « Passer » et « Pause » partent au retour du réseau avec leur clé, dans l'ordre, sans doublon.
44. *Étant donné* le plus gros plan permis par le § 4.2, *alors* le plan est calculé en tâche asynchrone dans le pire
    cas mesuré par le socle ; au-delà de la taille permise, l'API refuse avec « Il y a trop de recettes pour un seul
    plan. » ; le repli est toujours un plan valide ou « aucun plan ».
45. *Quand* Sam touche « Fait » pendant qu'un recalcul tourne, *alors* sa carte suivante vient du plan courant sans
    attendre ; le recalcul part avec la version attendue ; deux « Fait » simultanés s'écrivent l'un après l'autre.
46. *Étant donné* « Riz 300 g » cochée par Léa puis une recette retirée par Sam, *alors* la ligne cochée reste
    valable ; si le besoin monte à 500 g, la ligne redemande 200 g ; décocher après le débit du placard ne le fait
    pas passer sous zéro ; une ligne « Je repasserai » survit à la session.
47. *Négatif :* à la fin de la lecture d'une photo, même en échec, le seau ne la contient plus ; une quatrième photo
    est refusée ; les deux lignes (masquer carte et fidélité, service aux États-Unis) sont lues avant l'envoi.
48. *Étant donné* des objectifs différents chez Sam et Léa, *alors* l'écran du dressage montre leurs parts en
    grammes, mais aucun objectif, repas visé ni pourcentage ; rien n'en est dit à la voix.
49. *Quand* une limite d'IA bloque, *alors* l'écran dit si c'est le quota du mois de ce monde ou le plafond du jour de
    Popote ; « Fait », les minuteurs et la pause marchent toujours.
50. *Étant donné* une allergie enregistrée aux arachides, *alors* ni un menu proposé, ni une recette inventée, ni un
    remplacement ne contient d'arachide ; sans allergie enregistrée, Popote dit « Je ne connais pas tes allergies. »
51. *Négatif :* des liens vers `http://2130706433/`, une IPv6 qui enveloppe `169.254.169.254`, `100.64.0.1`, un nom
    qui se résout vers une adresse privée, ou une page qui dépasse 2 Mo une fois décompressée ne sont pas lus ; un
    site dont le `robots.txt` l'interdit non plus.
52. *Quand* deux téléphones sont dans la même pièce, *alors* un seul écoute en mains libres ; le second lit « Léa
    écoute déjà sur son téléphone. » et garde « maintenir pour parler ».
53. *Quand* un minuteur arrive à zéro, appli à l'arrière-plan, *alors* une notification part à chaque cuisinier avec un
    compte, au plus une minute après ; « Sorti », « + 5 min » ou « Annuler » avant l'envoi la retire de la file.
54. *Étant donné* un four de 8 places et une recette retenue 14 fois, *alors* le plan ne se calcule pas et dit « Le four
    n'a que 8 places, il en faut 10. Réduis les parts, ou ajoute un appareil. » ; passer de 220 °C à 150 °C ajoute
    5 minutes « sans toi », comme passer de 150 °C à 220 °C.
55. *Quand* Sam dicte une recette avec dix secondes de silence au milieu, *alors* l'écoute reste ouverte jusqu'à
    « C'est tout » ou 3 minutes.
