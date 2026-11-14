# Le monde « Foyer et réglages » : la spec

Sixième parcours de la nouvelle appli. Il réunit en un seul endroit tout ce qui se règle : ses objectifs, les
notifications, la cuisine, le foyer, ce que Popote sait et ce qu'on lui a demandé, l'aide et le signalement d'un
bug, ses données. **Version 2 du 14/11/2026** : la revue adverse du 14/11, les arbitrages du socle et les décisions
du propriétaire du 14/11 y sont appliqués.

- **Style :** le système « Jeu » (`.design/systeme/`), étendu d'abord des composants qui lui manquent (plan, Q0).
- **Prototype de référence :** `.design/foyer-reglages/prototype.html` (film et moments rejouables) et ses captures
  dans `.design/foyer-reglages/captures/`. Le prototype fait foi pour le dessin et le mouvement, cette spec
  fait foi pour les textes, les états, les règles et les données. (Ces fichiers sont dans la branche du prototype,
  pas encore sur `main`.)
- **Côté API :** le § 13 liste ce que l'écran attend (R1 à R10, R3 supprimé) ; le contrat et le plan technique
  appartiennent au socle, comme l'envoi des notifications (`docs/superpowers/plans/2026-11-13-notifications-push.md`),
  qui fait foi pour toute la mécanique des notifications : cette spec ne fait que la reprendre, et nomme ce qu'elle
  lui demande d'amender (§ 6, § 12).
- **Ce qui existe déjà et n'est pas refait** : « Notre foyer » (`/foyer` : les membres, inviter), « Mon compte »
  (`/compte` : le prénom, les appareils, les empreintes, télécharger ses données, se déconnecter) et « Partir,
  supprimer, retirer », tous dans le parcours « Entrer » (`2026-11-13-parcours-entrer-design.md`, § 4.5, § 4.9,
  § 4.10). Ce monde y mène, et leur ajoute ce que ce parcours avait laissé de côté : le nom du foyer, la couleur
  de chacun, les objectifs, les rappels.
- **Ce qui est repris d'« Aujourd'hui »** : la barre « Parle-moi, ou écris », la feuille de Popote et ses blocs
  typés (§ 6), le mode vocal (§ 7), la politique de mutation (§ 5), « quelqu'un sans objectifs » (§ 4.7).
- **Les mondes « Cuisiner » et « Semaine et Frigo »** sont cités par leurs paragraphes (K-C10, § 13, § 16…) :
  leurs specs sont dans leurs propres branches, pas encore sur `main`.
- **Exemple suivi dans toute la spec :** « Sam » et « Léa » forment le foyer ; Sam tient le téléphone. Sam vise
  2 400 kcal et 160 g de protéines par jour, Léa 1 900 kcal et 110 g. Les personnes, les plats et les chiffres sont
  inventés.

## 1. Décisions du propriétaire (13 et 14/11/2026)

| Sujet | Décision |
|---|---|
| Repenser de zéro | L'ancienne appli n'est qu'un inventaire : ses réglages, éclatés en six endroits, ne sont pas repris. |
| Deux objectifs | L'énergie (kcal) et les protéines (g). Rien d'autre. |
| Objectifs de chacun | Chacun règle les siens ; **l'autre les voit, en lecture seule, ainsi que leurs jauges** (14/11 : « c'est un frigo partagé entre le foyer »). Un changement vaut à partir du lendemain ; les jours passés gardent l'ancien objectif. Les objectifs et les jauges d'un membre n'entrent jamais dans une notification ni dans ce que le modèle reçoit pour l'autre membre : Popote ne « sait » pas les objectifs de l'autre. |
| Signaler un bug | Depuis Popote, depuis un écran d'erreur ou depuis les réglages ; en privé, lu seulement par son auteur et par le compte que la configuration du serveur désigne, avec un outil à part ; jamais envoyé par l'appli à un modèle. |
| Notifications | Sur le téléphone ; **les prénoms et les noms de plats sont permis, sans interrupteur** ; le ton est drôle et chaleureux ; **une seule règle : jamais de montant d'argent ni de libellé de banque.** Pas de rappel par mail en v1. |
| Relances | Popote relance pour remplir les journées non renseignées, pendant les 7 jours où l'on peut encore les noter : une par jour au plus, jamais entre 22 h et 8 h, coupée par l'interrupteur « Semaine » (§ 6, R-C11). |
| Le virement | Le rappel part dès le 29 du mois pour préparer le mois suivant, puis le 1er (§ 12, R-C12). Les opérations de la banque sont gardées 1 an. |
| Popote parle | D'accord sur le principe ; la synthèse vocale dépend d'un modèle à confirmer par le socle, à défaut la voix de l'appareil (§ 9.2, **hypothèse R-A1**). |
| Usage de l'IA | Pas de plafond écrit dans la spec : les limites sont fixées à partir des quotas réels fournis par le socle, et l'écran montre le vrai compteur (§ 9.1, R-A2). |
| Aide-moi à choisir | Le poids donné dans l'aide n'est ni gardé, ni journalisé, ni envoyé : le calcul se fait dans le navigateur (§ 5.1). |
| Valider à chaque étape | Popote récapitule ce qu'elle change, et la personne valide. Partout. |
| Au plus simple | Chacun voit ce que l'autre règle ou dépense. Reste personnel : le poids (jamais gardé), ce que Popote a retenu de soi (faits, fil), les signalements, l'adresse mail (§ 11). |
| Les foyers amis | Plus tard : hors de ce monde. |
| Le prototype | Construit le 14/11/2026 avec la spec, à la demande du propriétaire ; il le relit ensuite, et ce qu'il change rouvre la spec. |
| Revue du 14/11/2026 | Décisions prises : § 9.3 (deux listes, service extérieur), § 11 (liste fermée, preuve récente, sauvegardes), § 10 (outil local, texte non fiable, plafonds), § 6 (plage fixe, rien par mail), § 5 (objectifs datés à Paris, calcul dans le navigateur), § 7 (faits de Popote visibles et effaçables). |

## 2. Hors périmètre

- Entrer, inviter, rejoindre, les appareils, les empreintes, quitter, supprimer, retirer : le parcours « Entrer ».
- Les réglages du budget (revenus, partage, charges, banque) : le monde « Budget » (§ 12), ouvert par sa roue.
- Changer d'e-mail : pas encore ; la ligne est affichée, désactivée, avec « Bientôt ».
- **Les rappels par mail : plus tard.** En v1, les rappels partent par notification seulement ; le mail ne sert
  qu'aux codes et aux invitations.
- Les foyers amis, le partage de recettes.
- Les fibres, les glucides, les lipides comme objectifs.
- L'heure de chaque rappel et la plage « Ne pas déranger » : fixes, non réglables.
- L'outil du propriétaire pour lire et répondre aux signalements : hors de ce front (§ 10.3).
- Un thème sombre, une langue autre que le français.

## 3. Carte du monde

| Adresse | Écran |
|---|---|
| `/reglages` | Les réglages (§ 4) |
| `/reglages/objectifs` | Mes objectifs (§ 5) |
| `/reglages/notifications` | Les notifications (§ 6) |
| `/reglages/cuisine` | La cuisine (§ 7) |
| `/reglages/foyer` | Notre foyer : le nom, les couleurs (§ 8) ; les membres restent à `/foyer` |
| `/reglages/popote` | Popote et moi (§ 9) |
| `/reglages/aide` | Aide et bugs (§ 10) |
| `/reglages/donnees` | Mes données (§ 11) |
| `/reglages/a-propos` | À propos (§ 11) |

- L'avatar de l'en-tête de l'accueil ouvre `/reglages`. « Régler » et « M'y emmener » d'« Aujourd'hui » (§ 4.7)
  mènent à `/reglages/objectifs` : la page d'attente « Bientôt » disparaît.
- La barre « Parle-moi, ou écris » est sur chaque écran : tout réglage de la liste du § 9.4 se dit aussi.
- **Sans foyer** (`/sans-foyer`, les 30 jours après un départ) : seuls restent atteignables « Mon compte »,
  « Notifications », « Mes données », « Aide et bugs » et « À propos » ; les autres cartes sont absentes, et
  `/reglages/donnees` ne répond jamais « aucun foyer » : la personne peut toujours télécharger ce qui est à elle.
  **Les routes que ces écrans appellent sont listées et testées une à une** (R4, R9, R10) : elles ne passent pas
  par la garde « personne du foyer » (sinon la garde d'« Entrer », § 6, renverrait vers `/sans-foyer`).

## 4. Les réglages (`/reglages`)

En haut : l'avatar de la personne, son prénom, et « Foyer Sam et Léa » (le nom du foyer) avec les deux avatars.
Popote : « **Tout se règle ici.** Ou dis-le-moi, je le fais. »

Six cartes, deux par ligne ; chacune dit son état en une ligne, rendue par l'API (R1) :

| Carte | Couleur | Sa ligne d'état | Sinon |
|---|---|---|---|
| Mes objectifs | rose | 2 400 kcal · 160 g | À régler ; **2 200 kcal · 160 g dès demain** quand un changement attend |
| Notifications | jaune | Sur cet appareil | À réactiver ; Coupées |
| La cuisine | menthe | Four, plaques · skyr | À régler |
| Notre foyer | bleu ciel | Vous êtes deux | Une place libre |
| Popote et moi | lilas | ce que rend l'API (§ 9.1 ; illustration : « Il te reste 7 inventions ce mois-ci ») | la limite la plus proche de sa fin |
| Aide et bugs | blanc | Tout va bien | 1 signalement en cours ; 1 bug réparé |

Sous les cartes, trois lignes : « Mon compte » (`/compte`), « Mes données », « À propos ».

Une carte « À régler » porte un point jaune. La ligne d'« Aide et bugs » dit les deux choses quand elles coexistent
(« 1 signalement en cours ; 1 bug réparé ») ; la carte porte un point vert tant qu'un bug réparé n'a pas été vu :
il s'éteint quand on ouvre « Mes signalements ». La carte « Mes objectifs » ne dit jamais « 2 400 kcal » seule quand
un changement attend : une valeur enregistrée aujourd'hui et qui vaut demain ne doit pas passer pour un échec.

## 5. Mes objectifs (`/reglages/objectifs`)

Deux jauges à poignée : « Énergie 2 400 kcal par jour », « Protéines 160 g par jour ». Popote : « **Tes
objectifs.**
Rien d'autre à suivre : l'énergie et les protéines. » Trois pastilles : « Aide-moi à choisir », « Comme avant »
(remet les jauges aux dernières valeurs enregistrées, celle en attente comprise : elle défait ce qui n'est pas
encore enregistré), « Voir ceux de Léa » (absente quand la personne est seule dans le foyer).

**Les bornes, les pas et la ligne « un repas » viennent de l'API (R2)** : l'écran n'en écrit aucun. Aujourd'hui :

| Objectif | De | À | Pas |
|---|---|---|---|
| Énergie | 1 200 kcal | 4 000 kcal | 50 |
| Protéines | 40 g | 250 g | 5 |

- Faire glisser une poignée change le chiffre ; une ligne dit ce que cela fait par repas : « Un repas : environ
  770 kcal et 56 g. » (exemple pour 2 200 kcal et 160 g ; 35 % du jour, « Cuisiner », K-C4 ; arrondi à 10 kcal et
  au gramme ; pour 2 400 kcal : 840 kcal). Au clavier : les flèches, d'un pas ; un champ permet de taper la valeur.
- **Valeur hors bornes** (champ tapé, ou refus du serveur) : « **Entre 1 200 et 4 000 kcal.** » ou « **Entre 40 et
  250 g.** » ; les bornes écrites sont celles de l'API, la poignée ne sort jamais des bornes.
- « Enregistrer » : la bulle récapitule : « **2 200 kcal et 160 g, à partir de demain ?** Les jours passés gardent
  l'ancien objectif. » avec « Oui » et « Non ». « Oui » : tampon « Réglé », confettis. La toute première fois, la
  bulle dit « **2 200 kcal et 160 g, dès aujourd'hui ?** » ; le bloc « réglage » du § 9.4 suit la même règle.
- **Un objectif est daté, en jours de Paris, par le serveur** (jamais par le fuseau du téléphone) :
  - le premier objectif vaut dès aujourd'hui ;
  - un changement vaut à partir du lendemain de son enregistrement ; aujourd'hui et les jours passés restent jugés
    contre celui qui était en vigueur (« Semaine et Frigo », § 4.5) ;
  - **un second changement fait le même jour remplace le premier** : il n'y a jamais qu'un changement en attente ;
  - un jour d'avant le premier objectif n'est jugé contre rien : ni « sur… », ni écart, ni tampon.
  Exemple : 2 200 enregistré à 23 h 58 vaut le lendemain ; 2 000 enregistré à 0 h 02, le jour suivant, vaut le
  surlendemain, et le lendemain garde 2 200. Tout ce qui juge une journée (l'accueil, « Ta journée », l'archive de
  départ, les tampons) lit l'objectif qui valait ce jour-là.
- **Chacun règle les siens ; l'autre les voit.** « Voir ceux de Léa » ouvre un écran **en lecture seule**, sans
  poignée : « **Les objectifs de Léa.** 1 900 kcal · 110 g », la date d'effet d'un changement en attente (« 1 800
  kcal · 110 g dès demain »), et ses deux jauges du jour (« Aujourd'hui : 1 450 / 1 900 kcal »). Ni Sam ni Popote ne
  peuvent les modifier. **Deux limites écrites noir sur blanc :** les objectifs et les jauges d'un membre
  n'apparaissent **jamais dans une notification**, ni dans **ce que le modèle reçoit pour l'autre membre** : Popote
  ne les connaît pas et ne répond pas dessus (« Aujourd'hui », § 6). Si Léa n'a rien réglé : « **Léa n'a pas encore
  réglé les siens.** ».
- **Sans objectifs** : les jauges partent de 2 000 kcal et 100 g, grisées, avec « Pas encore réglés » ; rien n'est
  enregistré avant « Enregistrer ».

### 5.1 « Aide-moi à choisir »

C'est un **formulaire à l'écran, pas une conversation**, et **le calcul se fait dans le navigateur** : le poids et les
réponses ne quittent pas l'appareil. Ni la feuille de Popote, ni un modèle, ni un journal, ni l'outil de suivi
des erreurs, ni le Worker, ni les journaux du serveur n'en reçoivent rien, puisqu'**aucune requête ne les porte**. Le
poids et les deux réponses ne vivent que dans la mémoire de l'écran et sont oubliés quand on le quitte (rien dans
le stockage du navigateur). L'API ne reçoit que l'objectif choisi, à « Enregistrer », comme n'importe quel
objectif : elle le borne et le date.

**Si la personne dit son poids à Popote** (voix ou feuille : « je fais 82 kg, perdre un peu »), c'est **une phrase
comme une autre** : elle suit les règles de la feuille et est gardée deux jours dans le fil (§ 11). Popote peut
mener à « Aide-moi à choisir », où le poids ne part pas ; aucun filtre sur « kg » (« 2 kg de farine » reste une
phrase normale).

Popote : « **Trois questions, et je propose.** Je ne garde pas tes réponses. Ce calcul est fait pour les
adultes. »

| Question | Réponses |
|---|---|
| Tu veux… | Tenir mon poids ; Perdre un peu ; Prendre du muscle |
| Tu bouges… | Peu ; Un peu ; Beaucoup |
| Ton poids, à peu près ? | un compteur, de 35 à 200 kg |

Popote : « **Je propose 2 200 kcal et 150 g.** C'est un repère pour un adulte, pas un avis médical. » avec « Je
prends » (les jauges se règlent ; il reste à enregistrer) et « Je règle moi-même ».

**Le calcul**, fait dans le navigateur par un seul module du front (ses coefficients et ses planchers y sont écrits
et testés contre les exemples ci-dessous) :

| | Peu | Un peu | Beaucoup |
|---|---|---|---|
| Énergie pour tenir son poids, par kilo | 28 kcal | 31 kcal | 35 kcal |

« Perdre un peu » : 15 % de moins, sans jamais descendre sous 1 500 kcal, **et sans jamais dépasser ce que
donne « Tenir mon poids »** (pour 40 kg, « Peu » : « Perdre » donne 1 200 kcal, comme « Tenir ») ; « Prendre du
muscle » : 10 % de plus. Protéines par kilo : 1,6 g pour tenir, 1,8 g pour perdre, 2 g pour le muscle. **Arrondi à
la valeur la plus proche, la moitié vers le haut** : l'énergie à la centaine, les protéines à 5 g (2 150 donne
2 200). Les deux sont ensuite ramenées dans **les bornes de l'objectif lues de l'API (R2)**, les mêmes que celles
des jauges ; le serveur les vérifie encore à « Enregistrer ». Exemple : 82 kg, « un peu », « perdre un peu » : 82 × 31
= 2 542, moins 15 % : 2 161, soit 2 200 kcal ; 82 × 1,8 = 148, soit 150 g.

**Quand le calcul bute sur une borne, Popote le dit**, sous la proposition : « **C'est le minimum que je
propose.** » (énergie ou protéines au plancher, dont le plancher de 1 500 kcal de « Perdre un peu ») ou
« **C'est le maximum que je propose.** ». Exemples : 40 kg, « Peu », « Tenir mon poids » : 1 120, arrondi à 1 100,
relevé à 1 200 kcal, avec le minimum dit. 150 kg, « Beaucoup », « Prendre du muscle » : 5 250 × 1,1 = 5 775, arrondi
à 5 800, ramené à 4 000 kcal, avec le maximum dit ; protéines : 300, ramenées à 250 g.

## 6. Les notifications (`/reglages/notifications`)

Toute la mécanique (essai, durées, plage de silence, sujets) est celle du plan des notifications ; cette spec n'y
ajoute que les textes, l'écran, et les amendements nommés au § 12. **Les rappels partent par notification
seulement** : pas de repli par mail en v1.

**En haut, cet appareil** : une carte dit l'un de ces états. L'état d'un appareil **combine la permission du
navigateur, lue sur place à l'ouverture de l'écran, et l'abonnement, rendu par l'API** :

| État | Ce que la carte dit | Bouton |
|---|---|---|
| Activées ici | Sur cet appareil : activées | l'interrupteur, et « Envoyer un essai » |
| Jamais demandées | **Je te préviens ici ?** Le minuteur, les repas à sortir, ton virement. | Activer |
| Refusées dans le téléphone | Tu as dit non à ton téléphone. Ça se change dans ses réglages. | Comment faire |
| À installer (iPhone, appli pas installée) | Sur iPhone, installe d'abord Popote sur ton écran d'accueil. | Comment faire |
| Indisponibles ici (navigateur sans notifications) | Ce navigateur ne sait pas envoyer de notifications. Essaie Chrome, Firefox, ou Popote installée sur ton téléphone. | aucun |
| À réactiver (accord donné, abonnement perdu, y compris un appareil que le service de notifications ne reconnaît plus) | Les notifications doivent être réactivées sur cet appareil. | Réactiver |

« À installer » et « Indisponibles ici » sont deux textes d'un même état `indisponible` de l'API. **Un PC avec
Chrome ou Firefox n'est pas « impossible »** : il active ses notifications comme un téléphone.

**« Comment faire »** : une feuille, trois cas.

| Cas | Ce que la feuille dit |
|---|---|
| Notifications refusées dans le téléphone | iPhone : « Ouvre Réglages, puis Notifications, puis Popote, et autorise-les. » Autre : « Autorise-les dans les réglages de ton navigateur pour ce site. » Puis : « Reviens ici : je regarde de nouveau. » |
| iPhone sans l'appli installée | « 1. Touche le bouton Partager de Safari. 2. Choisis « Sur l'écran d'accueil ». 3. Ouvre Popote avec sa nouvelle icône, puis reviens ici. » Et : « Pas dans Safari ? Ouvre d'abord Popote dans Safari. » |
| Mode Concentration (rien reçu après un essai) | « Un mode Concentration ou Ne pas déranger peut cacher les notifications. Coupe-le un instant, ou autorise Popote dans ce mode, puis refais un essai. » |

**Les appareils** : un abonnement meurt avec la session de l'appareil (90 jours au plus), ou quand le service de
notifications le refuse (404, 410) : l'appareil passe alors à « À réactiver ». Quand le dernier appareil activé
s'éteint, la carte dit : « **Plus d'appareil activé.** Tu ne reçois plus de rappel. » ; la ligne d'état de la carte
dit « Coupées ». Rien ne part par mail à la place. À l'ouverture de l'écran, l'état est relu du navigateur, qui
est la source de l'abonnement.

**Les sujets** : une ligne à interrupteur par sujet, avec un exemple de ce qu'on reçoit. Ce sont les quatre
sujets du plan des notifications (le quatrième s'appelle désormais « Popote et le foyer », § 12) :

| Sujet | Exemple affiché | Ce qu'il couvre |
|---|---|---|
| Frigo | Les lasagnes aux épinards et ricotta de demain dorment encore au congélo. Réveille-les, Sam ! | « Semaine et Frigo », § 13 : « À sortir », « Dernier jour » |
| Semaine | Ta semaine est toute blanche, Sam. Un coup de baguette ? | « Semaine et Frigo », § 13 : « Semaine vide » ; **la relance des journées non renseignées** (§ 12) |
| Budget | Le mois prochain frappe à la porte : prépare ton virement, Sam. | « Budget », § 16 : les rappels de l'autre, du virement, de l'opération à ranger et du point du mois, sauf « Accès à la banque » |
| Popote et le foyer | Léa a rejoint le foyer : bienvenue à la table ! | « Entrer » : l'invitation acceptée ; « Bug réparé », « Réponse à ton signalement » et l'aide (§ 12) |

**« Cuisine » n'a pas d'interrupteur** : c'est une ligne d'information, sous les sujets : « **Cuisine : toujours,
pendant une session.** Le minuteur, l'arrivée en cuisine, ce qui reste à ranger. » (« Cuisiner », § 16). Ses rappels
n'existent que pendant une session lancée par la personne : un minuteur qu'on peut couper sans le savoir n'a pas de
sens. Ils ont leurs libellés dans « Les derniers envois ».

- Couper « Budget » dit : « L'accès à ta banque te préviendra quand même : sans lui je ne lis plus rien. »
- Tout est allumé au départ. Les réglages sont personnels : chacun les siens.
- **Le ton : drôle et chaleureux.** Popote écrit comme une amie qui a la tête dans le frigo. **Les prénoms et les
  noms de plats sont permis, sans aucun interrupteur.** Les textes ci-dessous sont ceux de la spec ; les rappels des
  autres mondes gardent les leurs, que leurs specs peuvent raconter à ce ton :

  | Famille | Rappel | Texte |
  |---|---|---|
  | Frigo | À sortir (19 h la veille) | Les lasagnes aux épinards et ricotta de demain dorment encore au congélo. Réveille-les, Sam ! |
  | Frigo | Dernier jour (9 h) | Dernier jour pour le curry de poulet au lait de coco : ce soir, c'est lui ou la poubelle. |
  | Semaine | Semaine vide (dimanche 18 h) | Ta semaine est toute blanche, Sam. Un coup de baguette, et le chili revient au menu ? |
  | Semaine | Relance des journées | Hier est tout vide dans ton carnet, Léa ! Dis-moi ce que tu as mangé, même si c'était un chili. |
  | Budget | Virement à préparer (le 29) | Le mois prochain frappe à la porte : prépare ton virement, Sam. |
  | Budget | Rappel de l'autre | Léa te fait un petit coucou : le virement du mois t'attend. |
  | Cuisine | Minuteur | Ding ! Le curry de poulet au lait de coco est prêt. Éteins le feu avant qu'il ne s'impatiente. |
  | Cuisine | Arrivée en cuisine | Léa est en cuisine : les lasagnes aux épinards et ricotta comptent sur toi. |

- **Une seule règle ne se plie jamais : aucun rappel ne porte un montant d'argent ni un libellé de banque.**
  Popote : « **Jamais d'argent** sur ton écran verrouillé : ni montant, ni libellé de banque. » Cette règle ne se
  règle pas. Deux autres limites, qui ne sont pas des réglages : les objectifs et les jauges d'un membre n'entrent
  jamais dans une notification (§ 5) ; le nom du foyer non plus (§ 8).
- **Ne pas déranger** : de 22 h à 8 h, heure de Paris. **La plage est fixe et ne se règle pas.** Seule exception :
  la cuisine en session, dont le minuteur. Un rappel dû pendant la plage est, selon son type, **différé à 8 h** ou
  **abandonné** (tableau ci-dessous). **Avant chaque envoi, le serveur revérifie que la condition est encore
  vraie** ; sinon rien ne part, jamais un autre texte à la place. À 8 h pile, un rappel différé part.
- **Rappel par rappel** (les textes sont ceux de leurs specs) :

  | Rappel | Spec | À 22 h-8 h |
  |---|---|---|
  | Budget à confirmer, Virement à préparer (29, 9 h), Virement à faire (1er, 9 h), Virement en retard (6, 9 h), Point du mois | « Budget », § 16 ; § 12 | différé à 8 h, si encore vrai |
  | Rappel de l'autre | « Budget », § 16 | différé à 8 h ; au plus un par jour |
  | Opérations à ranger (« ce soir ») | « Budget », § 16 | **abandonné** : « ce soir » serait faux le lendemain |
  | Accès à la banque | « Budget », § 16 | différé à 8 h ; aucun interrupteur |
  | Minuteur, Minuteur oublié, Arrivée en cuisine, À ranger | « Cuisiner », § 16 | **passe toujours** |
  | À sortir (19 h la veille) | « Semaine et Frigo », § 13 | **abandonné** : « demain » serait faux |
  | Dernier jour (9 h), Semaine vide (dimanche 18 h) | « Semaine et Frigo », § 13 | **abandonné** |
  | Relance des journées (10 h) | § 12 | **abandonnée** : jamais entre 22 h et 8 h |
  | Essai | § 6 | passe toujours |
  | Foyer (invitation acceptée), Bug réparé, Réponse à ton signalement | § 12 | différé à 8 h |

**« Envoyer un essai »** envoie « Notification d'essai : Popote peut te prévenir sur cet appareil. » à cet
appareil.
Popote : « **Reçu ?** » avec « Oui » et « Non, rien » ; « Non, rien » ouvre « Comment faire » (le cas
Concentration,
et les deux autres selon l'état). **Cinq essais par heure et par personne** ; au sixième : « **Tu as déjà fait cinq
essais cette heure-ci.** Réessaie plus tard. » (`429`, avec l'attente exacte). L'essai est ouvert à une personne
sans foyer.

**« Les derniers envois »** : les rappels partis **ces trois derniers jours** sur cet appareil, un par ligne,
avec le
jour, l'heure et le sujet (« Frigo », « Semaine », « Budget », « Cuisine », « Popote et le foyer »…), jamais le
texte. C'est la durée de garde des envois réussis du plan des notifications (§ 11). Vide : « **Rien ces trois
derniers jours.** »

## 7. La cuisine (`/reglages/cuisine`)

Les réglages du foyer : les deux les voient et les changent.

- **Mes appareils** : une pastille par appareil du catalogue (four, plaques, micro-ondes, autocuiseur, robot
  cuiseur, blender, batteur, friteuse à air), allumée si le foyer l'a, avec ce qu'il prend à la fois (« Four · 2
  plats », « Plaques · 4 feux ») ; « … » règle ce nombre, de 1 à 8. C'est la liste que le plan d'une session
  propose (« Cuisiner », § 10.1) et celle qui écarte du menu les recettes dont l'appareil manque (§ 6.2). **Ces
  réglages du foyer sont la source de départ de chaque session ; ce qu'on éteint pendant une session ne vaut que
  pour elle et ne les réécrit jamais.** Les appareils se règlent à l'écran, jamais à la voix (§ 9.4).
- **Le complément** : « Skyr · 10 g de protéines pour 100 g » avec « Changer » : un produit de « Nos produits »
  dont les protéines sont connues, ou « Aucun » (« Cuisiner », § 12.1).
- **Les repas à remplir** : « Les soirs », « Les midis » (« Semaine et Frigo », § 5.1).
- **Nos produits** : la liste des produits que le foyer a appris à Popote (« Aujourd'hui », § 5.6) : le nom, les
  valeurs, l'unité ; toucher une ligne la corrige ou la retire. Retirer un produit ne change rien à ce qui est
  déjà noté. **Le produit choisi comme complément ne se retire pas** : « **C'est ton complément.** Choisis-en un
  autre d'abord. » Sans produit : « **Rien d'appris pour l'instant.** Ça viendra en cuisinant. »
- **Ce que j'ai retenu** : « 6 choses » (le nombre est celui de l'API) avec « Voir ». La page a **deux parties,
  celle du foyer et celle de la personne** : elle est l'écran « Ce que Popote sait de nous » du plan de l'IA, et
  Popote n'a aucune mémoire cachée.

  **De vous (le foyer)**, chaque ligne avec une croix :

  | Ce qui s'apprend | Exemple | D'où |
  |---|---|---|
  | Le poids d'une pièce | Un oignon, c'est 110 g | « Cuisiner », § 4.4 |
  | L'aliment d'un mot | La crème, c'est la crème liquide 30 % | « Cuisiner », § 4.4 |
  | Le poids d'un contenant | Un pot, c'est 125 g | « Cuisiner », § 4.4 |
  | Une cuisson rallongée | Les lasagnes au four : 40 min | « Cuisiner », § 4.5 |
  | Une étiquette de banque | Burger Express, c'est fast-food | « Budget », § 8 |
  | L'ordre des rayons | Le rayon Frais avant l'Épicerie | « Cuisiner », § 9.2 ; « Tout oublier » remet l'ordre de départ |

  Popote : « **Voilà ce que j'ai appris de vous.** Retire ce qui est faux. » Une croix : la ligne s'en va,
  « **Oublié.** Je te le redemanderai. », avec « Annuler » pendant 10 secondes (comme « Cuisiner », § 11.5).
  **Oublier n'agit que sur les recettes à venir** : les recettes déjà lues, les barquettes déjà dosées et ce
  qui est
  déjà noté ne changent pas. Les durées des gestes apprises de vos sessions n'y sont pas ligne à ligne : une seule
  ligne « Vos durées en cuisine », avec « Tout oublier ».

  **De toi (la personne seule ; l'autre ne les voit pas)** : les faits que Popote a retenus en te parlant (ce que
  tu aimes, ce que tu n'aimes pas, une habitude, ton matériel, ton rythme : « N'aime pas : les champignons ») et tes
  habitudes d'« Aujourd'hui » (§ 5.6). Chaque ligne se **lit, se corrige et se supprime** ; une ligne « Tout
  oublier de moi » les efface tous. Popote : « **Voilà ce que je sais de toi.** Corrige ou retire ce qui est
  faux. » Oublier un fait n'agit que sur les réponses à venir. Le fil de ta conversation avec Popote n'est pas
  une liste : il se garde 30 jours et s'efface avec le compte (§ 11).

  Rien d'appris : « **Je n'ai encore rien retenu.** »

## 8. Notre foyer (`/reglages/foyer`)

- **Le nom** : un crayon à côté du nom ; un champ « Le nom du foyer », de 1 à 40 caractères, une seule ligne, du
  texte brut (jamais de mise en forme, ni lien, ni caractère de contrôle ou de sens d'écriture) ; « Enregistrer ».
  **Le nom du foyer ne part dans aucun mail** (ni objet ni corps : l'invitation ne porte que le prénom, filtré, de
  qui invite), **ni dans aucune notification, ni dans ce que le modèle reçoit**. Le nom porte une version : deux
  renommages en même temps, le second reçoit « **Le nom vient de changer.** Regarde, puis recommence. ». Un bouton
  « Effacer le nom » : sans nom, le foyer s'appelle « Sam et Léa », d'après les prénoms.
- **La couleur de chacun** : toucher un avatar montre six pastilles (les six couleurs de membre du système) ; en
  choisir une change son avatar partout. **Deux membres n'ont jamais la même** : une couleur prise est grisée. Une
  nouvelle personne qui arrive reçoit la première couleur libre. Chacun peut changer la couleur de l'autre (au plus
  simple, pas de cloisonnement dans le foyer). Deux appuis en même temps sur la même couleur : le second reçoit `409
  couleur_prise` et le texte « **Léa vient de prendre cette couleur.** Choisis-en une autre. », et la grille se met
  à jour. Pour échanger deux couleurs, il faut passer par une troisième.
- **Les membres** : « Inviter quelqu'un » mène à `/foyer` ; à deux, le bouton est grisé : « Vous êtes deux, le
  foyer est complet. » « Quitter le foyer » mène à `/compte/partir`.
- Le prénom se change dans « Mon compte ».

### 8.1 Seul(e) dans le foyer

Quand l'autre est partie : la carte dit « Une place libre » ; « Voir ceux de Léa » et la grille de couleurs de
l'autre disparaissent ; la ligne « Vous êtes deux » devient « Tu es seul(e) dans le foyer. » ; l'écran « Popote et
moi » dit que les limites sont à toi seul ; « Inviter quelqu'un » est actif ; et « Quitter le foyer »
devient « Supprimer mon compte » (`/compte/partir` ne propose alors que cela, « Entrer », § 4.10). La couleur de
l'autre est libérée, et ses objectifs ne sont plus visibles.

## 9. Popote et moi (`/reglages/popote`)

### 9.1 Ce qu'on lui a demandé

Popote réfléchit grâce à un service extérieur dont l'usage est compté **pour le foyer** : les deux le partagent, et
l'écran le dit. **Cette spec n'écrit aucun plafond.** Les limites sont fixées à partir des quotas réels fournis par
le socle (R-A2), et l'écran « Popote et moi » montre **le vrai compteur**, tel que l'API le rend (R7) :

- **Aujourd'hui** : ce qu'il reste, avec l'heure du retour (le jour va de 6 h à 6 h, heure de Paris) ;
- **Ce mois-ci** : ce qu'il reste, avec la date du retour (le 1er du mois suivant, en jours de Paris) ;
- **Quelle limite bloque**, quand l'une est atteinte.

Popote : « **Voilà ce que tu m'as demandé.** » Les valeurs, leur unité, le seuil jaune et les heures de retour
viennent de l'API ; l'écran ne calcule rien, n'écrit aucun chiffre de limite et n'affirme pas que « le reste est
illimité » : il montre ce que l'API compte, et rien d'autre. Exemple d'affichage, **purement illustratif** : « Il te
reste 7 inventions ce mois-ci. » Une jauge passe au jaune au seuil de l'API ; pleine, au rose, avec son retour
(« Je reviens à 6 h. » ou « Ça repart le 1er. »).

**Quand une limite est atteinte**, la barre « Parle-moi, ou écris » ne répond plus aux questions ni ne règle plus
rien à la voix ; tout se règle à l'écran, et Popote dit une fois : « **J'ai atteint ma limite pour aujourd'hui.**
Les réglages restent à l'écran. Je reviens à 6 h. » ou, pour le mois : « **J'ai atteint ma limite du mois.** Les
réglages restent à l'écran. Ça repart le 1er. » La limite du jour peut tomber alors que la jauge du mois n'est pas
pleine : l'écran dit laquelle bloque.

### 9.2 Sa voix

- « Popote parle » : un interrupteur, **réglage de la personne** ; allumé, Popote lit ses réponses à voix haute
  quand on lui parle, dans le mode vocal (« Aujourd'hui », § 7). « Écouter » fait dire : « Bonjour Sam ! ».
- **Hypothèse à lever (R-A1), pas un acquis :** la synthèse vocale demande un modèle que le socle doit confirmer
  (un modèle de synthèse vocale, ou un modèle multimodal). À défaut, Popote lit avec **la voix du système de
  l'appareil**. Si ni l'un ni l'autre n'est disponible sur l'appareil, la ligne est grisée : « **Pas disponible sur
  cet appareil.** ». Si la voix passe par un service, § 9.3 le dit.
- « Mains libres en cuisine » : un interrupteur, **réglage de cet appareil**, éteint au départ, avec la phrase de
  « Cuisiner », § 11.5, à l'identique : « **Ton appareil écoute tant que cet écran est ouvert**, et son service de
  dictée peut recevoir ce qu'il entend. Popote, elle, n'en garde rien. » Il n'apparaît que si l'appareil le permet.

### 9.3 Ce qu'elle sait

« Ce que je sais de toi », « Voir » : une page courte, en deux listes qui ne se recoupent pas.

- **Ce que Popote lit dans l'appli pour te répondre** : ton prénom, tes objectifs (**pas ceux de l'autre**), ce que
  tu notes avoir mangé, tes faits et tes habitudes (§ 7), le frigo et la semaine du foyer, vos recettes et vos
  sessions, et le budget du foyer.
- **Ce qui part vers le service extérieur qui la fait réfléchir** (le modèle) : ta question, **toute phrase que tu
  écris ou dis à Popote, telle quelle** (le texte libre part au fournisseur du modèle), et les données utiles à la
  réponse : des repas notés, tes objectifs en chiffres, le frigo, des recettes. Du budget, seulement ce que la spec
  du Budget autorise à envoyer, pas plus. **Jamais** : ton prénom, ton adresse mail, le nom du foyer, les objectifs
  ni les jauges de l'autre, ni ton poids tel que « Aide-moi à choisir » le manie (il ne quitte pas ton téléphone ;
  si tu l'écris toi-même à Popote, c'est une phrase comme une autre, § 5.1).

Sous les deux listes : « **Ce service est extérieur à Popote.** Il s'appelle {nom, rendu par l'API}.
Aujourd'hui, il
est aux États-Unis. » La phrase sur les États-Unis reste tant que le propriétaire n'a pas tranché autrement ;
le nom
vient de l'API, jamais de l'écran (R7). Si la voix de Popote passe par un service de synthèse (R-A1), la page le
nomme aussi.

Dessous : un lien vers « Ce que j'ai retenu » (§ 7) et vers « Mes données » (§ 11).

### 9.4 Régler en parlant

« Mets-moi 2 200 kcal », « coupe les notifications du budget » : Popote récapitule dans un bloc « réglage »
(« **Énergie : 2 200 kcal** au lieu de 2 400, à partir de demain. »), avec « Valider » et « Modifier ». Rien ne
change avant « Valider ».

- **Le bloc se valide au toucher seulement** : jamais à la voix (« oui » dit par la télévision ou par l'autre).
- **Le récapitulatif est écrit par le serveur** d'après l'action typée, jamais par la prose du modèle : un texte de
  recette, un produit ou un libellé de banque ne peut pas habiller un autre réglage.
- Phrases ambiguës : « ne me dérange pas ce soir » : « La nuit est déjà tranquille : pas de rappel de 22 h à 8 h,
  sauf le minuteur. » ; « coupe les notifications » : « Lesquelles ? Frigo, Semaine, Budget, ou Popote et le
  foyer. » ; « mets-moi en vert » (couleur prise) : « Léa a déjà cette couleur. Choisis-en une autre. » ; « on a un
  autocuiseur » : pas de bloc, Popote mène à « Mes appareils » (un appareil est un réglage du foyer, qui se fait à
  l'écran).
- Limite de Popote atteinte (§ 9.1) : plus de réglage à la voix.

Ce qui se règle en parlant, et rien d'autre : ses objectifs ; allumer ou couper un sujet de notification ; les repas
à remplir ; sa couleur. Jamais : quitter, supprimer, retirer quelqu'un, inviter, la banque, **le nom du foyer, les
appareils**, les objectifs de l'autre, le poids d'« Aide-moi à choisir ». Pour ceux-là, Popote mène à l'écran.
(Cette liste est la liste fermée des actions de l'assistant ; l'ajout de la couleur et des sujets de notification
est un amendement au plan de l'IA, dont Q7 dépend.)

## 10. Aide et bugs (`/reglages/aide`)

Deux tuiles : « Une question » et « Signaler un bug ».

- **« Une question »** ouvre la feuille de Popote, qui répond sur l'appli et mène au bon écran.

### 10.1 Signaler un bug

Trois entrées, le même parcours : cette tuile ; dire « j'ai un bug » à Popote ; le lien « Signaler » d'un écran
d'erreur (fondation, F18 à F21, amendées pour ce lien, la mémoire des trois derniers numéros d'erreur et l'envoi
multipart), qui remplit seul l'écran et l'erreur. Le parcours est ouvert à une personne sans foyer.

1. Popote : « **Mince ! Raconte-moi.** Qu'est-ce qui s'est passé ? » La personne le dit ou l'écrit (de 5 à 1 000
   caractères).
2. Un récapitulatif en ticket. Popote : « **Voilà ce que j'envoie**, à celui qui répare Popote seulement : »

   | Ligne | Exemple |
   |---|---|
   | Ce que tu as dit | Le minuteur des lasagnes n'a pas sonné |
   | L'écran | En cuisine |
   | Ton appareil | iPhone, Safari |
   | La version | 1.4.2 |
   | Les dernières erreurs | aucune (sinon leur numéro, jamais leur contenu) |
   | Une image | « Joindre une image de ton écran », un choix sur ton appareil, pas fait d'avance |

   Et en petit : « **Ne part que ce que tu écris ou joins.** L'appli n'y ajoute ni budget, ni repas. » Puis :
   « **Celui qui répare Popote le lit avec ses propres outils.** » « Envoyer » et « Modifier ».
3. « Envoyer » : une enveloppe s'envole, tampon « Envoyé ». Popote : « **Merci !** Je te dis quand c'est réparé. »

**Ce qui part, et ce qui ne part pas.**

- Le texte de la personne, tel quel (sauf les caractères de contrôle, les séquences de terminal et les marques
  de sens d'écriture, retirés à l'entrée). L'écran d'où elle vient (son nom, jamais son contenu). Le type d'appareil
  et de navigateur. **La version de l'appli**, lue dans un fichier `version.json` écrit à la construction (jamais
  d'une variable de build exposée). Les numéros des trois dernières erreurs de l'écran, s'il y en a, **au format
  validé par le serveur** (un numéro qui ne respecte pas le format est refusé, pas gardé).
- **Une image** seulement si la personne en choisit une sur son appareil (photothèque ou fichiers) : **l'appli ne
  prend aucune capture d'elle-même**. L'écran prévient : « Une capture peut montrer tes repas ou ton budget. » Elle
  est montrée avant l'envoi, et se retire. Une seule image, JPEG ou PNG (le type est vérifié sur le contenu,
  pas sur le nom), 2 Mo au plus. Le serveur vérifie **les dimensions avant de la décoder** (au-delà d'un plafond
  de pixels : refusée), la **réencode** (métadonnées retirées ; pour un PNG animé, la première image seule) et
  l'**efface quand le signalement passe à « Réparé » ou « Fermé »**, ou avec le compte. **Elle a sa propre route, réservée à son auteur
  et au propriétaire** : elle ne passe jamais par le relais d'images du foyer.
- Jamais ajoutés par l'appli : un montant, un repas, une recette, un libellé de banque, un prénom autre que
  celui de la personne. Ce que la personne écrit ou joint part tel quel : c'est elle qui choisit.
- Le signalement est rangé dans une table privée, lisible par la personne qui l'a écrit et par le compte désigné
  au § 10.3 ; l'autre membre du foyer ne le voit pas.
- **Le texte et l'image d'un signalement sont des données non fiables** : affichés comme du texte, jamais
  interprétés (ni HTML, ni lien actif), **jamais envoyés par l'appli à un modèle**, jamais traités comme une consigne
  par un agent ou un outil de tri. **Le propriétaire, lui, peut le lire avec ses propres outils, assistants
  compris** : l'écran le dit (la phrase du ticket ci-dessus), et le texte lu par l'outil est délimité et tronqué
  (§ 10.3).
- **Dix signalements par jour et par personne au plus, et cinq ouverts à la fois** ; au-delà du dixième : « **C'est
  noté pour aujourd'hui.** Reviens demain, ou ajoute un mot à un signalement en cours. » ; au sixième ouvert :
  « **Tu as déjà cinq signalements en cours.** Ajoute un mot à l'un d'eux, ou attends qu'il soit traité. »

### 10.2 Mes signalements

Sous les deux tuiles, la liste des signalements de la personne, le plus récent en haut : son début, son état et
sa date.

| État | Ce que la ligne dit |
|---|---|
| Reçu | reçu, aujourd'hui |
| Vu | vu le 14 novembre |
| Réparé | réparé le 9 novembre, avec une coche verte |
| Fermé | fermé le 9 novembre, et un mot du propriétaire (« Ce n'est pas un bug : … ») |

**Les passages permis** : Reçu, puis Vu, puis Réparé ou Fermé ; un signalement peut passer de Reçu à Réparé ou à
Fermé sans passer par Vu. **Réparé et Fermé sont définitifs** : si le bug revient, on fait un nouveau signalement.
**Le texte d'un signalement fermé est effacé au bout de 90 jours** : la ligne dit alors « fermé le 9 novembre, texte
effacé ».

- Toucher une ligne montre ce qui a été envoyé, et permet d'« Ajouter un mot » tant qu'il n'est ni réparé ni
  fermé : de 1 à 1 000 caractères par mot, 20 mots au plus par signalement.
- Quand un signalement passe à « Réparé », la carte « Aide et bugs » porte un point vert, et un rappel part
  (§ 12) : « Un bug que tu as signalé est réparé. » Quand il passe à « Fermé », un rappel part aussi : « Ton
  signalement a une réponse. » Ces deux rappels dépendent du sujet « Popote et le foyer » (§ 6), et le point vert
  de la carte ne dépend de rien.
- Sans signalement : « **Aucun bug signalé.** Tant mieux ! »

### 10.3 Le propriétaire de l'appli

« Le propriétaire de l'appli » n'est **pas un rôle dans l'appli** : c'est un compte désigné **par son identifiant
(UUID), jamais par son adresse mail** (une adresse peut être reprise), dans la configuration du serveur. Il lit
les signalements et y répond avec **un outil à part, hors de ce front** : un script local, qui lit avec la clé
de service du fichier de secrets, **sans aucune route dans l'appli**. Ce monde ne dessine aucun écran pour lui.
Le script lit en lecture seule (chaque lecture est journalisée), délimite le texte et le tronque ; ses seules
écritures sont deux gestes bornés : changer l'état dans les passages du § 10.2, et répondre par un mot. Le compte
ne gagne aucun autre droit dans l'appli.

## 11. Mes données, À propos

**Mes données** (`/reglages/donnees`). Popote : « **Tes données sont à toi.** Les voilà. »

- **Ce que Popote garde** : un tableau, la chose, sa durée, et ce qui arrive si tu supprimes ton compte, rendu par
  l'API pour qu'il dise toujours vrai. Il reprend les durées des autres specs, du plan des notifications et du plan
  de l'IA, et n'en écrit aucune que ces documents ne confirment pas. **« Effacé tout de suite » veut dire : effacé
  de l'appli tout de suite, puis des sauvegardes chiffrées sous 30 jours.**

  | La chose | Combien de temps | Si tu supprimes ton compte |
  |---|---|---|
  | Tes repas notés, tes réglages | jusqu'à la suppression de ton compte | effacés tout de suite, puis des sauvegardes sous 30 jours (« Entrer », § 4.10) |
  | Tes objectifs et leur historique daté | jusqu'à la suppression de ton compte | effacés tout de suite, puis des sauvegardes sous 30 jours |
  | Tes faits et tes habitudes (§ 7) | jusqu'à ce que tu les retires, ou la suppression du compte | effacés tout de suite, puis des sauvegardes sous 30 jours |
  | Le fil de ta conversation avec Popote | 30 jours | effacé tout de suite, puis des sauvegardes sous 30 jours |
  | Ce que tu as écrit ou dit à Popote, mot à mot | 2 jours | effacé tout de suite, puis des sauvegardes sous 30 jours |
  | Le compteur de ce que tu as demandé à Popote | 13 mois | effacé ou rendu anonyme tout de suite |
  | Tes signalements ouverts, réparés ; leurs images | jusqu'à « Réparé » ou « Fermé » pour l'image | effacés tout de suite, images comprises, puis des sauvegardes sous 30 jours |
  | Le texte de tes signalements fermés | 90 jours après la clôture | effacé tout de suite, puis des sauvegardes sous 30 jours |
  | Les recettes, le frigo, le budget du foyer | tant que le foyer existe | restent à l'autre (« Entrer », § 4.10) |
  | Les opérations de la banque | **1 an**, puis effacées ; les totaux par mois restent (« Budget », B-C3) | restent au foyer |
  | Les photos lues pour une recette ou un ticket | effacées à la fin de la lecture (« Cuisiner », § 8.6) | sans objet |
  | Les photos de saisie (frigo, étiquette) | 30 jours, sauf si elles illustrent une barquette ou une recette | celles du foyer restent |
  | Ton appareil connecté (session) | 90 jours au plus | fermée tout de suite |
  | Les notifications envoyées | 3 jours (envoyées), 30 jours (abandonnées), sans contenu | effacées avec l'abonnement |
  | Le journal des appels au modèle | 90 jours (socle) ; ton nom en est retiré dès ton départ | la ligne reste 90 jours, sans toi |
  | Ton compte, après un départ du foyer | 30 jours (« Entrer », § 4.10) | sans objet |

  Le poids d'« Aide-moi à choisir » n'est pas dans ce tableau : il n'est **jamais gardé** (§ 5.1). Les durées
  ci-dessus sont celles à confirmer par le socle ; le tableau réel vient de l'API.
- **Télécharger mes données** : le bouton d'« Entrer » (§ 4.9), ici aussi. **Il demande une preuve récente**
  (« Entrer », § 5 : « Prouve que c'est toi »), puis une barre, puis « Prêt : mes-donnees.zip ».
  **Le fichier a une liste fermée de contenus**, fixée table par table dans le plan d'API, avec un test par table,
  que la page écrit :
  - *à toi* : ton profil (prénom, adresse mail, couleur), tes objectifs et leur historique, tes repas notés, tes
    réglages, tes faits, habitudes et le fil de ta conversation avec Popote, tes signalements (texte, état, réponse) ;
  - *ce que tu lis dans l'appli, du foyer et de l'autre* : les recettes, le frigo, les sessions de cuisine, le
    budget commun avec tout ce qui y est lisible (revenus, charges, avances, parts, saisies : il n'y a pas de
    cloisonnement entre vous), la semaine et les repas de Léa, **ses objectifs** (§ 5, en lecture seule) ;
  - **jamais ce qui n'est lisible que par l'autre** : ses signalements, son adresse, ses faits, ses habitudes et le
    fil de sa conversation avec Popote. Son poids n'existe nulle part.
  - Une personne **sans foyer** reçoit l'archive de départ de « Entrer » (§ 4.10), ses données seules.
- **Tout effacer** : le lien « Supprimer mon compte » mène à `/compte/partir`.

**À propos** (`/reglages/a-propos`) : la version (celle de `version.json`), « Quoi de neuf » (les trois dernières
nouveautés, en une phrase chacune), les licences des polices et des images.

## 12. Ce que ce monde demande aux rappels

Ces rappels suivent la mécanique du § 6 (plage de silence, abandon ou report, condition revérifiée). **Amendements
demandés au plan des notifications** (à écrire dans le plan d'API de ce monde) : par type, « aux heures calmes :
différer ou abandonner » et « revérifier la condition à l'envoi » ; les types Cuisine, Foyer, Bug réparé, Réponse,
Aide et Relance, avec leurs libellés pour « Les derniers envois » ; le sujet « Popote et le foyer » ; l'état
`indisponible` d'un appareil ; le prénom et le nom de plat dans le texte, sans variante ni interrupteur.

| Rappel | Quand | Texte | Interrupteur |
|---|---|---|---|
| Essai | « Envoyer un essai » | Notification d'essai : Popote peut te prévenir sur cet appareil. | aucun ; passe toujours |
| Bug réparé | un signalement passe à « Réparé » | Un bug que tu as signalé est réparé. | « Popote et le foyer » ; différé à 8 h |
| Réponse à ton signalement | un signalement passe à « Fermé » | Ton signalement a une réponse. | « Popote et le foyer » ; différé à 8 h |
| Relance des journées | chaque jour à 10 h, s'il reste au moins une journée non renseignée dans les 7 derniers jours | Hier est tout vide dans ton carnet, Léa ! Dis-moi ce que tu as mangé, même si c'était un chili. (plusieurs jours : « Trois journées sont vides dans ton carnet, Léa : on les remplit ensemble ? ») | « Semaine » ; abandonnée à 22 h-8 h |
| Virement à préparer | le 29, 9 h (le dernier jour du mois s'il n'a pas de 29), tant que le virement du mois suivant n'est pas fait | Le mois prochain frappe à la porte : prépare ton virement, Sam. | « Budget » ; différé à 8 h |

**La relance des journées** (R-C11) est demandée ici et à reporter dans « Semaine et Frigo » : elle ne concerne que
les journées de la personne où **rien n'est noté**, dans les **7 jours précédant aujourd'hui** (la fenêtre où l'on
peut encore noter un jour passé), aujourd'hui exclu, et pas un jour d'avant l'arrivée de la personne dans le foyer.
**Une relance par jour au plus**, tous jours confondus ; elle s'arrête dès que les journées sont remplies ou sortent
de la fenêtre ; elle ne part jamais entre 22 h et 8 h (abandonnée, jamais décalée) ; l'interrupteur « Semaine » la
coupe. Elle peut nommer la personne, jamais un montant. Sans foyer : aucune relance.

**Le virement** (R-C12) est demandé ici et à reporter dans « Budget », § 16 : « Virement à préparer » le 29 (pour
préparer le mois suivant), puis « Virement à faire » le 1er, 9 h, puis « Virement en retard » le 6, 9 h. Chaque
rappel est revérifié à l'envoi : un virement déjà fait n'en reçoit aucun. Aucun ne porte un montant.

## 13. Ce que l'API doit fournir

Le contrat appartient au socle. Chaque écriture suit la politique d'« Aujourd'hui » (§ 5) : clé d'opération, cible
et version explicites, rejouable sans doublon. **La clé d'opération d'une personne sans foyer est rangée sous son
compte d'accès, pas sous son profil** (le profil est supprimé au départ ; amendement de 0.4ter C6).

| N° | Besoin |
|---|---|
| R1 | **L'état des réglages**, en un appel : la ligne d'état de chacune des six cartes et ses points (dont « dès demain »). |
| R2 | **Les objectifs** : lire les siens et ceux de l'autre (lecture pour les membres du même foyer, écriture par la personne seule), avec leur date d'effet et l'historique daté ; lire les deux jauges du jour de l'autre ; enregistrer (bornes et pas fournis et vérifiés par le serveur, jours de Paris, effet au lendemain, dès aujourd'hui la première fois, un seul changement en attente remplacé par le suivant) ; « un repas : environ… ». L'objectif valable ce jour-là est lu par « Aujourd'hui » (P1), le contexte de Popote, l'archive de départ et les tampons. Les objectifs et jauges de l'autre ne sont jamais rendus au modèle ni à une notification. |
| R3 | **Supprimé.** « Aide-moi à choisir » se calcule dans le navigateur ; l'API ne reçoit que l'objectif choisi, par R2, et ne reçoit jamais un poids. |
| R4 | **Les notifications**, au contrat du plan des notifications : l'état de cet appareil (dont `indisponible`), l'activer, le couper ; les quatre sujets ; l'essai (cinq par heure) ; les envois des trois derniers jours ; un appareil perdu devient « à réactiver ». La plage 22 h à 8 h est fixe : aucune route ne la règle. Aucun mail de repli. **Ouvertes à une personne sans foyer :** l'état de l'appareil, l'activer, le couper, l'essai, les derniers envois ; un test chacune. |
| R5 | **La cuisine** : le catalogue des appareils, ceux du foyer et leurs places ; le complément ; les repas à remplir ; « Nos produits » (lire, corriger, retirer, sauf le complément) ; « ce que j'ai retenu » (lire par genre, oublier une ligne, tout oublier d'un genre) ; **les faits et les habitudes de la personne** (lire, corriger, supprimer, tout oublier de soi). |
| R6 | **Le foyer** : renommer (avec version, texte brut filtré, effacer le nom) ; la couleur de chaque membre, unique dans le foyer (`409 couleur_prise`). |
| R7 | **Popote et moi** : ce que l'API compte pour le foyer (le reste d'aujourd'hui et son heure de retour, le reste du mois et sa date de retour, la limite qui bloque, le seuil jaune) ; « Popote parle » (réglage de la personne, avec ce que l'appareil ou le service permet), « Mains libres » (de l'appareil) ; la page « ce que je sais », avec le nom du service extérieur. Aucun compteur par genre n'est exigé. |
| R8 | **Régler en parlant** : le bloc « réglage » pour la liste fermée du § 9.4 (objectifs, sujets de notification, repas à remplir, couleur), récapitulatif écrit par le serveur, validé au toucher ; rien d'écrit avant « Valider ». Ni le nom du foyer ni les appareils. |
| R9 | **Les signalements** : en créer un (texte, écran, appareil, version, numéros d'erreur au format validé, une image facultative de 2 Mo au plus, vérifiée, plafonnée en pixels, réencodée, servie par sa propre route), dix par jour, cinq ouverts ; lire les siens et leur état ; ajouter un mot (20 au plus). Pour le compte désigné par UUID : l'outil local les lit tous (lecture journalisée), change leur état, répond. Jamais envoyés par l'appli à un modèle ; l'autre membre ne les lit pas ; images effacées à la clôture, texte des fermés à 90 jours, objets du seau avec le compte. **Ouvert à une personne sans foyer ;** un test par route. |
| R10 | **Mes données** : le tableau de ce qui est gardé ; le téléchargement à liste fermée table par table, sur preuve récente ; la version (`version.json`) et les nouveautés. **Atteignable sans foyer** (archive de départ) ; un test par route. |

Rien de ce monde n'est gardé dans le navigateur au-delà de l'écran, **sauf** le cookie de session, le précache de
l'application, et l'abonnement aux notifications que le navigateur tient lui-même. Le test qui le vérifie nomme ces
trois exceptions.

## 14. Points retenus par défaut

Le 13/11/2026, le propriétaire a demandé de retenir les choix proposés, qu'il relira. Un point qu'il change rouvre
la partie concernée. Le 14/11/2026, la revue et les décisions du propriétaire ont changé R-C1, R-C3, R-C4, R-C5 et
R-C8, et ajouté R-C11 à R-C13.

| N° | Point | Ce que la spec retient |
|---|---|---|
| R-C1 | Le prénom et le plat dans une notification | permis, sans interrupteur ; le ton est drôle ; jamais un montant ni un libellé de banque |
| R-C2 | « Ne pas déranger » | de 22 h à 8 h, fixe, non réglable ; seule la cuisine en session (le minuteur) passe ; selon le rappel : différé à 8 h ou abandonné |
| R-C3 | Sans appareil activé | rien ne part (pas de rappel par mail en v1) ; un appareil perdu apparaît « à réactiver » |
| R-C4 | Les objectifs de l'autre | on les voit, avec ses jauges, en lecture seule ; on ne les règle pas ; jamais dans une notification ni dans ce que le modèle reçoit |
| R-C5 | Le calcul de « Aide-moi à choisir » | celui du § 5.1, dans le navigateur, arrondi à la moitié vers le haut ; « Perdre » jamais au-dessus de « Tenir » ; un repère pour adulte, pas un avis médical ; aucun poids n'est envoyé ni gardé |
| R-C6 | Qui lit un signalement | la personne qui l'a écrit et le compte désigné par UUID, par un outil local ; l'appli ne l'envoie jamais à un modèle |
| R-C7 | La capture d'un signalement | une image choisie par la personne, jamais prise par l'appli, jamais d'office |
| R-C8 | L'usage de Popote | par foyer, partagé, visible, le compteur réel de l'API (aujourd'hui et ce mois-ci) ; aucun plafond écrit dans la spec |
| R-C9 | La couleur d'un membre | par ancienneté au départ (défaut du socle), puis au choix ; jamais la même pour deux ; la première libre pour un nouvel arrivant |
| R-C10 | Les textes et états que le prototype ne joue pas | tous ceux de cette spec que le film ne montre pas : proposés par la spec |
| R-C11 | La relance des journées | 10 h, une par jour, jours vides des 7 derniers jours, jamais entre 22 h et 8 h, coupée par « Semaine » ; l'heure est proposée par la spec |
| R-C12 | Le virement | « à préparer » le 29 (ou le dernier jour du mois), « à faire » le 1er, « en retard » le 6 |
| R-C13 | La voix de Popote | « Popote parle » existe ; sa source (modèle vocal, sinon voix de l'appareil) est une hypothèse à lever |

**Hypothèses à lever par la session socle** (pas des acquis) :

| N° | Hypothèse | Ce qu'il faut |
|---|---|---|
| R-A1 | La synthèse vocale | un modèle de synthèse vocale ou multimodal accessible ; sinon la voix du système de l'appareil, et la page « ce que je sais » le dit |
| R-A2 | Les limites d'usage de Popote | les quotas réels des fournisseurs du modèle, et ce que l'API rend (reste du jour, reste du mois, retour, limite bloquante) |

## 15. Sur PC, états communs, mouvement, accessibilité

- **Sur PC (à partir de 900 px)** : à gauche la liste des six sujets et des trois lignes ; au centre le sujet
  ouvert ; Popote à droite.
- Les états communs sont ceux de la fondation du front (F18 à F21) ; les écritures suivent les trois cas
  d'« Aujourd'hui » § 5. **Un interrupteur ne change d'état qu'à la réponse de l'API ; en attente, il est
  désactivé, dit « En attente. » et propose « Annuler »** : un second appui ne fait pas une seconde écriture. Hors
  ligne, il reste en attente jusqu'à « Annuler » ou au retour du réseau.
- Mouvement : celui du prototype, par Motion ; les cartes qui arrivent, les jauges, les tampons et l'enveloppe
  respectent « mouvement réduit ».
- Une jauge à poignée est un curseur : son nom, sa valeur lue (« Énergie, 2 200 kilocalories par jour »), ses
  bornes ; elle se règle aux flèches. Un interrupteur dit son nom et son état. La couleur d'une jauge d'usage n'est
  jamais le seul signe : le chiffre est écrit.
- Chaque changement sans changement d'écran est annoncé dans une région `status`. Cibles tactiles de 44 px au
  moins ; tout se fait au clavier.
- Le focus après une action : « Oui » (objectifs) : le titre de l'écran ; un interrupteur : lui-même ; une croix
  de « ce que j'ai retenu » : la ligne suivante, ou le titre ; « Envoyer » (signalement) : sa ligne dans « Mes
  signalements » ; fermer une feuille : le bouton qui l'avait ouverte.

## 16. Critères d'acceptation (scénarios au clic)

Cinquante critères. Ceux qui touchent le poids se prouvent par construction (aucune requête du banc ne le porte).

1. *Quand* Sam touche son avatar sur l'accueil, *alors* les réglages s'ouvrent, et chaque carte dit son état.
2. *Quand* Sam passe l'énergie de 2 400 à 2 200 et valide, *alors* l'objectif vaut à partir de demain ; aujourd'hui
   et hier restent jugés contre 2 400 ; la carte dit « 2 200 kcal · 160 g dès demain ».
3. *Négatif :* 1 150 kcal ou 255 g sont refusés par le serveur avec « Entre 1 200 et 4 000 kcal. » ou « Entre 40 et
   250 g. » ; la poignée ne sort pas des bornes.
4. *Quand* Sam répond « Perdre un peu », « Un peu », 82 kg, *alors* Popote propose 2 200 kcal et 150 g, **calculés
   dans le navigateur**, rien n'est enregistré avant « Enregistrer », et aucune requête du banc ne porte le
   poids (critère 27).
5. *Étant donné* quelqu'un sans objectifs, *alors* « Régler » sur l'accueil mène ici, et les jauges de l'accueil
   prennent leur « sur… » dès l'enregistrement.
6. *Quand* Sam active les notifications puis touche « Envoyer un essai », *alors* « Notification d'essai : Popote
   peut te prévenir sur cet appareil. » arrive sur cet appareil ; un sixième essai dans l'heure est refusé, et le
   dit.
7. *Quand* Sam coupe « Budget », *alors* plus aucun rappel du Budget ne part pour lui, sauf l'accès à la banque ;
   Léa garde les siens.
8. *Étant donné* « Ne pas déranger » de 22 h à 8 h, *alors* un rappel différé dû à 23 h part à 8 h, un rappel
   abandonné (« À sortir ») ne part pas, un minuteur sonne quand même, et un rappel dont la condition est fausse à
   8 h n'est pas envoyé (limites : 21 h 59 part, 22 h 00 attend ou est abandonné, 7 h 59 attend, 8 h 00 part).
9. *Négatif :* aucun rappel ne porte un montant d'argent ni un libellé de banque ; ni les objectifs ni les jauges
   d'un membre, ni le nom du foyer, n'apparaissent dans un rappel.
10. *Sur un iPhone où l'appli n'est pas installée*, la carte dit comment faire ; aucun rappel ne part sur cet
    appareil, et aucun mail à la place.
11. *Quand* Sam éteint le four dans « Mes appareils », *alors* le plan d'une nouvelle session ne le propose plus,
    et les recettes au four ne sont plus proposées au menu ; éteindre le four pendant une session ne change pas
    ce réglage.
12. *Quand* Sam retire « Un pot, c'est 125 g », *alors* Popote redemande le poids d'un pot à la prochaine recette ;
    les recettes déjà lues et les barquettes déjà dosées ne changent pas.
13. *Quand* Sam renomme le foyer et change sa couleur, *alors* l'accueil et la semaine le montrent ; la couleur de
    Léa ne peut pas être choisie.
14. *Étant donné* que l'API rend un reste d'aujourd'hui, un reste du mois et leurs retours, *alors* « Popote et
    moi » les montre tels quels, avec la limite qui bloque quand il y en a une, aucun plafond n'est écrit dans
    l'écran, et Léa voit les mêmes chiffres, ceux du foyer.
15. *Quand* Sam dit « mets-moi 2 200 kcal », *alors* un bloc « réglage » récapitule, et rien ne change avant
    « Valider » au toucher (un « oui » dit ne valide pas) ; « supprime mon compte » ne supprime rien et mène à
    l'écran ; « on a un autocuiseur » ne crée aucun bloc et mène à « Mes appareils ».
16. *Quand* Sam signale un bug, *alors* il voit tout ce qui part avant d'envoyer, l'image n'est pas choisie
    d'avance, et le signalement apparaît dans sa liste à l'état « reçu ».
17. *Négatif :* Léa ne voit pas les signalements de Sam ; l'appli n'ajoute à un signalement ni montant, ni repas,
    ni libellé de banque ; le onzième du jour est refusé.
18. *Quand* le compte désigné passe un signalement à « Réparé », *alors* Sam reçoit « Un bug que tu as signalé est
    réparé. » (sauf si « Popote et le foyer » est coupé) et la carte porte un point vert ; à « Fermé », il reçoit
    « Ton signalement a une réponse. ».
19. *Quand* Sam ouvre « Mes données », *alors* le tableau vient de l'API, avec les durées du § 11 (dont 1 an pour
    les opérations de la banque), et le téléchargement rend son fichier après une preuve récente.
20. *Sur téléphone (390 px)*, chaque écran correspond à sa capture de référence, avec un écart de pixels de 1 % au
    plus ; *sur PC*, les réglages suivent la règle du § 15.
21. *Quand* Sam enregistre ses tout premiers objectifs, *alors* la bulle dit « dès aujourd'hui » et ils valent
    aujourd'hui ; les jours d'avant ne sont jugés contre rien.
22. *Quand* Sam enregistre 2 200 puis, le même jour, 2 000, *alors* un seul changement est en attente : 2 000, qui
    vaut demain ; « Comme avant » rend 2 000.
23. *Étant donné* 2 200 enregistré à 23 h 58 (Paris), *quand* Sam enregistre 2 000 à 0 h 02, *alors* 2 200 vaut le
    jour de 0 h 02, et 2 000 le jour suivant, quel que soit le fuseau du téléphone.
24. *Quand* Sam répond « Tenir mon poids », « Peu », 40 kg, *alors* Popote propose 1 200 kcal et dit « C'est le
    minimum que je propose. ».
25. *Quand* Sam répond « Prendre du muscle », « Beaucoup », 150 kg, *alors* Popote propose 4 000 kcal et 250 g, et
    dit « C'est le maximum que je propose. » (5 775 arrondi à 5 800, ramené à 4 000) ; 2 150 arrondi donne 2 200.
26. *Quand* Sam écrit à la feuille « je fais 82 kg, perdre un peu », *alors* Popote le traite comme n'importe quelle
    phrase (gardée deux jours, § 11) et peut mener à « Aide-moi à choisir » ; « 2 kg de farine » n'est pas filtré.
27. *Négatif (preuve par construction) :* pendant tout le parcours « Aide-moi à choisir », avec la valeur sentinelle
    137 kg, aucune requête observée par le banc (corps, adresse, en-têtes) ne contient le poids ni les réponses ; le
    stockage du navigateur n'en garde rien.
28. *Quand* l'abonnement du dernier appareil de Sam est refusé par le service de notifications (404 ou 410), *alors*
    la carte dit « À réactiver » puis, l'appareil coupé, « Plus d'appareil activé. Tu ne reçois plus de rappel. » ;
    aucun mail ne part.
29. *Négatif :* le zip de Sam ne contient ni les signalements de Léa, ni son adresse, ni ses faits, ses habitudes ou
    le fil de sa conversation avec Popote ; il contient les recettes, le frigo, les sessions, le budget commun, et ce
    que Sam lit de Léa (ses repas, ses objectifs) ; sans preuve récente, il est refusé ; une personne sans foyer
    reçoit l'archive de départ.
30. *Quand* Sam joint une image à un signalement, *alors* elle vient de son appareil, elle est montrée avant
    l'envoi ; un fichier qui n'est ni JPEG ni PNG, ou de plus de 2 Mo, est refusé ; l'image enregistrée est
    réencodée ; une seconde image est refusée.
31. *Négatif :* un signalement contenant du HTML ou une consigne (« ignore tes règles ») s'affiche comme du texte,
    n'est envoyé par l'appli à aucun modèle ; aucun écran du front ne montre les signalements de tous.
32. *Quand* Sam et Léa touchent en même temps la même couleur, *alors* l'un l'obtient, l'autre reçoit « Léa vient
    de prendre cette couleur. » et la grille se met à jour.
33. *Quand* Sam appuie deux fois vite sur un interrupteur, *alors* il n'y a qu'un seul changement.
34. *Étant donné* Léa partie, *alors* « Voir ceux de Léa » et sa grille de couleurs disparaissent, « Quitter le
    foyer » devient « Supprimer mon compte », et Léa, sans foyer, atteint « Mes données », envoie un essai, active
    ses notifications et envoie un signalement sans être renvoyée vers `/sans-foyer`.
35. *Étant donné* la limite du jour atteinte, *alors* la barre ne répond plus aux questions ni ne règle à la voix,
    dit « J'ai atteint ma limite pour aujourd'hui. » avec son retour, la jauge du mois peut ne pas être pleine, et
    tout se règle à l'écran.
36. *Quand* Sam ouvre « Comment faire », *alors* il voit les textes du cas réel (refus, iPhone non installé,
    Concentration) du § 6.
37. *Étant donné* la ligne « Cuisine », *alors* elle n'a aucun interrupteur et dit « toujours, pendant une
    session ».
38. *Quand* un signalement est « Réparé » ou « Fermé », *alors* « Ajouter un mot » disparaît et un retour du bug
    demande un nouveau signalement ; le vingt et unième mot d'un signalement est refusé.
39. *Quand* Sam retire le produit choisi comme complément, *alors* il est refusé avec « C'est ton complément. ».
40. *Quand* Sam ouvre « Popote et moi », *alors* la page « ce que je sais » liste séparément ce qui est lu dans
    l'appli et ce qui part au service extérieur, dit qu'il est aux États-Unis, et n'y met ni prénom, ni adresse,
    ni nom du foyer, ni objectifs de Léa, ni poids.
41. *Quand* Sam touche « Voir ceux de Léa », *alors* il voit ses objectifs, un changement en attente et sa jauge du
    jour, sans poignée ni moyen de les changer ; un changement de Léa lui est dit « dès demain » ; Popote, interrogée
    sur les objectifs de Léa, ne répond pas dessus.
42. *Étant donné* deux journées vides dans les 7 derniers jours de Léa, *alors* elle reçoit une relance à 10 h, une
    seule ce jour-là ; aucune à 22 h 30 ; aucune si elle coupe « Semaine » ; aucune quand les journées sont
    remplies ; aucune pour une journée plus vieille que 7 jours.
43. *Négatif :* aucun interrupteur « Montrer le prénom » n'existe ; un rappel peut nommer Léa ou un plat
    (« les lasagnes aux épinards et ricotta ») ; les huit textes d'exemple du § 6 sont ceux qui partent.
44. *Étant donné* le 29 du mois, 9 h, un virement du mois suivant pas fait, *alors* Sam reçoit « Virement à
    préparer » ; le 1er, 9 h, « Virement à faire » ; un virement fait n'en reçoit aucun ; aucun ne porte un montant.
45. *Quand* Sam allume « Popote parle », *alors* Popote lit sa réponse avec la voix disponible (le modèle vocal si
    le socle le confirme, sinon la voix de l'appareil) ; sans aucune voix, la ligne est grisée « Pas disponible sur
    cet appareil. ».
46. *Étant donné* cinq signalements ouverts de Sam, *alors* le sixième est refusé avec sa phrase ; une image de
    dimensions démesurées est refusée avant d'être décodée ; la première image seule d'un PNG animé est gardée ;
    l'image n'est lisible que par Sam et le propriétaire.
47. *Quand* Sam ouvre « Ce que j'ai retenu », *alors* il voit ses faits (« N'aime pas : les champignons ») et ses
    habitudes, peut les corriger ou les supprimer, et Léa ne les voit pas.
48. *Quand* Sam répond « Perdre un peu », « Peu », 40 kg, *alors* Popote ne propose pas plus que « Tenir mon poids »
    (1 200 kcal).
49. *Étant donné* un PC avec Chrome ou Firefox, *alors* la carte propose « Activer » comme sur un téléphone ; un
    navigateur sans notifications dit « Ce navigateur ne sait pas envoyer de notifications. ».
50. *Quand* Sam invite quelqu'un après avoir nommé le foyer, *alors* le mail d'invitation ne contient pas le nom du
    foyer, seulement le prénom de Sam ; un nom de foyer avec un lien, un caractère de contrôle ou un sens
    d'écriture est refusé.
