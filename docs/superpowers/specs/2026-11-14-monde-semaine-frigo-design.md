# Le monde « Semaine et Frigo » : la spec

Cinquième parcours de la nouvelle appli. Il couvre ce qu'on mange et ce qu'on a : placer les parts dans la
semaine, changer un repas, rattraper un jour passé, lire sa semaine en chiffres ; ouvrir le frigo, le congélateur
et le placard, suivre les dates, sortir, congeler, jeter, ajouter ce qu'on achète.

- **Style :** le système « Jeu » (`.design/systeme/`). Aucun composant hors de ce système.
- **Prototype de référence :** `.design/semaine-frigo/prototype.html` (film et moments rejouables) et ses captures
  dans `.design/semaine-frigo/captures/`. Le prototype fait foi pour le dessin et le mouvement, cette spec fait foi
  pour les textes, les états, les règles de calcul et les données.
- **Côté API :** rien n'existe encore pour ce monde, hors ce que « Aujourd'hui » a demandé (P1 à P9). Le § 14
  liste ce que l'écran attend en plus (S1 à S14) ; le contrat et le plan technique appartiennent au socle.
- **Ce qui est repris d'« Aujourd'hui »** (`2026-11-13-parcours-aujourdhui-design.md`), sans être redit : noter un
  repas (« Mangé », « Annuler », « + Dessert », « Autre chose ? », tout dire en une phrase, § 5), apprendre un
  produit (§ 5.6), les deux jauges (§ 4.4), la feuille de Popote (§ 6), le mode vocal (§ 7), la politique de
  mutation (§ 5), les choses à faire de la bulle (§ 4.2). Ce monde **ajoute** des écrans ; il ne redéfinit aucun
  de ces gestes.
- **Ce qui vient de « Cuisiner »** (`2026-11-14-monde-cuisiner-design.md`) : les parts que crée une session (§ 12),
  la liste de courses qui lit le placard (§ 9), ce qu'une session y prend (§ 12.4).
- **Exemple suivi dans toute la spec :** « Sam » et « Léa » forment le foyer ; Sam tient le téléphone. On est le
  dimanche 15 novembre, à 17 h 30, après une session : 4 parts de lasagnes et 2 parts de gratin au frigo (cuites ce
  jour-là, à manger avant jeudi 19) ; 4 parts de curry et 12 parts de chili au congélateur (congelées dans cet
  ordre, du plus ancien au plus récent ; ni l'une ni l'autre n'est « neuve »). Les personnes, les plats et les
  valeurs sont inventés.

## 1. Décisions du propriétaire (13 et 14/11/2026)

| Sujet | Décision |
|---|---|
| Repenser de zéro | L'ancienne appli n'est qu'un inventaire de ce qu'il faut couvrir : aucun écran n'est repris. |
| Popote place | Après une session, Popote propose de placer les parts dans la semaine ; la personne valide ou déplace. |
| Valider à chaque étape | Popote récapitule ce qu'elle a compris, dit ce qu'elle estime, et la personne valide ou corrige. Partout. |
| Deux objectifs | L'énergie (kcal) et les protéines (g). Rien d'autre. |
| Une session à tout moment | La semaine n'est pas un cycle : rien ne s'ouvre, rien ne se clôt, rien ne bloque une session. |
| Au plus simple | Chacun voit tout dans le foyer, **repas, parts et objectifs de l'autre compris** ; chacun peut noter ou ranger pour l'autre. Les objectifs et les jauges de l'autre se lisent, ne se changent pas, et n'apparaissent jamais dans une notification ni dans ce que Popote reçoit pour l'autre membre. |
| Un frigo partagé | Le frigo, le congélateur et le placard sont ceux du foyer. N'importe quel membre peut manger n'importe quelle part du foyer, plusieurs parts au même repas, y compris une part prévue pour l'autre ou non prévue ; la semaine de l'autre se met à jour et Popote le lui dit (§ 4.2, § 9). |
| Un repas prévu qu'on ne mange pas | Quand un repas prévu est remplacé par « autre chose » (« j'ai mangé dehors, un kebab ») ou par « rien », Popote ne décide jamais seule : elle demande « Et ta part de … ? » et la personne choisit « Au frigo » (date limite inchangée), « Au congélateur » (absent, avec sa raison, si la part a déjà été décongelée) ou « À la poubelle » ; sans réponse, la part reste où elle est et la question reste dans les choses à faire (§ 4.4, § 5.3). |
| Manger en plus | Sur n'importe quel repas d'aujourd'hui ou des 7 derniers jours, « + Manger autre chose en plus » : plusieurs parts du même plat, un autre plat (frigo ou congélateur, « à décongeler »), une part prévue pour l'autre ou pour un autre jour, ou « Autre chose » ; récapitulatif, puis validation (§ 6.1). |
| Un jour à renseigner | Le bilan ne compte que les jours complets. Popote relance par notification, doucement, les jours non renseignés des 7 derniers jours ; un jour peut être marqué « je ne note pas ce jour » (§ 4.5, § 13). |
| Le skyr et le placard | Le skyr est un produit du frigo ; le placard, c'est le café, le riz, les pâtes, l'huile. La quantité d'un produit baisse toute seule quand on le note, au frigo comme au placard (§ 4.7). |
| Les notifications | Les prénoms et les noms de plats sont permis, le ton peut être drôle ; une seule règle : jamais de montant d'argent (§ 13). |
| Parler au stock | À la voix ou par écrit, on ajoute, retire ou change la quantité de n'importe quel produit du placard, du frigo ou du congélateur ; Popote récapitule l'avant et l'après, la personne valide (§ 11.1). |
| Le prototype | Construit le 14/11/2026 avec la spec, à la demande du propriétaire ; il le relit ensuite, et ce qu'il change rouvre la spec. |

## 2. Hors périmètre

- Noter le repas du moment, le dessert, « autre chose », apprendre un produit : « Aujourd'hui ». Ce monde y mène.
- Régler ses objectifs : le parcours « Foyer et réglages ». Sans objectifs, les jauges disent les valeurs sans
  « sur… » (« Aujourd'hui », § 4.7).
- La liste de courses, les recettes, les sessions : « Cuisiner ».
- Le petit-déjeuner et les encas comme repas à prévoir : seuls le midi et le soir se prévoient ; le reste se note
  (§ 6).
- Les fibres, les glucides, les lipides : ni suivis ni affichés ici.
- Un inventaire exact du placard, du frigo ou du congélateur : un produit peut ne pas avoir de quantité ; rien
  n'oblige à tenir un compte.
- Les rappels et leur réglage : la spec des notifications. Le § 13 dit seulement ce que ce monde lui demande.
- Le Budget : ce monde n'y écrit rien. Un « Resto » prévu ou noté n'a pas de prix, un produit ajouté n'a pas de
  prix, une part jetée n'a pas de coût.

## 3. Carte du monde

| Adresse | Écran | Quand |
|---|---|---|
| `/semaine` | La semaine (§ 5) | toujours |
| `/semaine/jour/:date` | Le détail d'un jour (§ 6) | tout jour passé (lecture seule au-delà de 7 jours), aujourd'hui, et les 6 jours à venir |
| `/semaine/bilan` | La semaine en chiffres (§ 7) | toujours |
| `/frigo` | Le frigo, le congélateur, le placard (§ 8) | toujours |
| `/frigo/plat/:id` | La fiche d'un plat (§ 9) | le plat a des parts |
| `/frigo/ajouter` | Ajouter (§ 11) | toujours |

- Les tuiles Semaine et Frigo de l'accueil ouvrent `/semaine` et `/frigo`. Un lien croise les deux : de la semaine,
  « Voir le frigo » ; du frigo, « Voir la semaine ».
- La barre « Parle-moi, ou écris » est sur chaque écran.
- Le jour vient de l'API, à l'heure de Paris, jamais de l'appareil. L'écran relit l'état à son retour au premier
  plan, quand le jour change et quand l'instant `valid_until` rendu par l'API est passé (bascule des repas).

## 4. Les mots et les règles

Tout ce qui suit est calculé par l'API ; ces règles disent ce qu'elle rend.

### 4.1 Les mots

| Mot | Sens | Jamais |
|---|---|---|
| **Part** | de quoi faire un repas pour une personne : « 4 parts de lasagnes » | portion, barquette (sauf pour l'objet) |
| **Plat** | les parts d'une même recette cuisinées ensemble, ou d'un même plat acheté | |
| **Repas** | le midi ou le soir d'un jour, pour une personne | créneau, case |
| **Produit** | ce qu'on achète et qu'on garde : du skyr, des œufs, une pizza surgelée | ingrédient, article, stock |
| **Sortir** | passer une part du congélateur au frigo | décongeler |
| **Jeter** | retirer une part qu'on ne mangera pas | |

### 4.2 Une part

Une part porte : son plat (et sa recette, si elle vient d'une session), **pour qui** elle a été dressée (une
personne, ou personne), son poids, ses valeurs (énergie, protéines : figées à sa création), le jour où elle a été
cuisinée ou achetée, où elle est, sa date, d'où elle vient (**une session**, **achetée**).

| État | Sens |
|---|---|
| Au frigo | jamais congelée, ou jamais sortie |
| Au congélateur | |
| Sortie | passée du congélateur au frigo ; elle ne se recongèle pas |
| Mangée | notée sur un repas |
| Jetée | |

**Pour qui.** Une part dressée pour quelqu'un a son poids. L'autre peut la manger : il compte alors **les valeurs
de cette part**, et l'écran le dit (« une part dressée pour Léa, 255 g »), sur la carte du repas (« part de
Léa ») comme dans le récapitulatif du placement.

**Un frigo partagé.** Le frigo, le congélateur et le placard sont ceux du foyer. N'importe quel membre peut manger
n'importe quelle part encore bonne : une part dressée ou prévue pour l'autre, une part prévue nulle part, ou
**plusieurs parts au même repas** (« deux parts de lasagnes »). Chaque part compte ses valeurs pour celui qui la
mange, et l'écran le dit. Quand la part était prévue sur un repas, le sien ou celui de l'autre, ce repas
**redevient « rien de prévu »** et Popote le dit à celui qui le perd, dans la bulle de sa semaine (§ 5 : « Sam a
mangé ta part de gratin »). Rien ne refuse qu'on mange : une part prévue n'appartient pas à celui qui l'a prévue.
Quand « Autre chose ? » d'« Aujourd'hui » mange un plat du frigo, le serveur prend une part bonne **libre** d'abord,
sinon celle prévue sur le repas le plus lointain, dont la case se vide ; le récapitulatif le dit avant.

**Sécurité alimentaire.** Quatre règles, sans exception ; quand un doute existe, la plus prudente gagne.

- Une part sortie du congélateur ne se recongèle jamais, quoi qu'il arrive ensuite (mangée puis annulée, déplacée,
  corrigée). Un produit congelé qu'on passe au frigo suit la même règle (§ 4.7). Seule exception, qui n'en est
  pas une : « Annuler » juste après « Sortir » défait le geste (§ 10).
- Une part périmée (« à jeter ») n'est jamais proposée, jamais placée, jamais comptée. **Aucun geste ne la prend,
  sauf « Jeter » et « Je l'ai mangée »** : « En manger une », « Congeler », « Sortir », « Corriger » et le
  placement ne prennent que des parts encore bonnes. Si elle est liée à un repas passé pas noté, « Jeter »
  demande d'abord « Tu l'as mangée mercredi soir ? » (§ 4.4, règle 3).
- Une part qui revient (annulation) retrouve **son état et sa date d'avant**, jamais un état neuf : au frigo avec
  sa date, ou sortie avec sa date de sortie. Si cette date est passée entre-temps, elle revient « à jeter ».
- **La date ne s'allonge jamais.** « Corriger » le jour de cuisson ne peut que **rapprocher** la date (§ 9), jamais
  l'éloigner. **« Congeler » n'est offert que jusqu'au jour de cuisson + 2 jours** (pour un plat acheté : 2 jours
  après l'achat). Si la recette dit « ne se congèle pas » (le gratin), « Congeler » n'est jamais offert, et jamais
  proposé non plus par Popote ; si elle dit « on ne sait pas », ou s'il n'y a pas de recette, il est offert avec
  la mention « à vérifier ».

### 4.3 Les dates

« À manger **avant** un jour » veut dire : le dernier repas possible est celui du soir de la veille de ce jour ;
le jour nommé est exclu. « Jusqu'à » inclut le jour nommé. Cette règle vaut partout, sans exception.

| Où | La date : « avant… » | Exemple |
|---|---|---|
| Au frigo | le jour de la cuisson + 4 jours | cuit dimanche 15 : avant jeudi 19, dernier repas mercredi soir |
| Au congélateur | le jour de la congélation + 90 jours | congelé le 15 novembre : avant le 13 février, dernier repas le 12 au soir |
| Sortie | le surlendemain de la sortie : à manger le lendemain au plus tard | sortie lundi soir : avant mercredi, dernier repas mardi soir |
| Achetée, avec une date sur l'emballage | le lendemain de cette date : une date d'emballage s'entend « jusqu'au » (incluse) | « jusqu'au 20/11 » : dernier repas le 20 au soir, « à jeter » le 21 à 0 h |
| Achetée, sans date | comme une part cuisinée le jour de l'achat | 4 jours au frigo, 90 au congélateur |

Les jours sont des jours du calendrier, à l'heure de Paris, **jamais un nombre d'heures** : « + 4 jours »,
« + 90 jours » et « le surlendemain » se comptent sur le calendrier, y compris les jours de 25 h et de 23 h du
changement d'heure (25/10/2026 et 28/03/2027). Une date ne dépend pas de l'heure de la cuisson ni de celle de
l'écriture : le serveur juge à l'heure où il écrit, jamais à celle que l'appareil dit. Congeler une part du frigo
repart de ce jour-là pour 90 jours. Corriger le jour de cuisson recalcule la date, vers plus tôt seulement (§ 4.2).
Une session crée ses parts avec un jour de cuisson **au plus 3 jours en arrière** (« Cuisiner », § 12.2) : une part
n'est donc jamais « à jeter » à sa création (cuite il y a 3 jours : « à manger aujourd'hui »).

**Les mots de l'urgence**, les mêmes partout. **N** est le nombre de jours qui restent, aujourd'hui compris : la
date moins aujourd'hui. Une part passe « à jeter » à 0 h (Paris) le jour de sa date.

| Situation | Mot |
|---|---|
| Au frigo, N de 3 ou plus | encore N jours |
| N = 2 | demain dernier délai |
| N = 1 | à manger aujourd'hui |
| N = 0 ou moins | à jeter |
| Au congélateur, N de plus de 7 | avant le 13 février |
| Au congélateur, N de 2 à 7 | à finir sous N jours |
| Au congélateur, N = 1 | à finir sous 1 jour : dernier jour, la part ne peut plus être sortie à temps (§ 4.6) |
| Sortie, le jour de la sortie (N = 2) | sortie aujourd'hui, à manger demain |
| Sortie, le lendemain (N = 1) | sortie hier, à manger aujourd'hui |

Jour par jour, pour une part cuite dimanche 15 et une part sortie lundi 16 au soir :

| Jour | Part cuite dimanche 15 | Part sortie lundi 16 |
|---|---|---|
| dim. 15 | encore 4 jours | |
| lun. 16 | encore 3 jours | sortie aujourd'hui, à manger demain |
| mar. 17 | demain dernier délai | sortie hier, à manger aujourd'hui |
| mer. 18 | à manger aujourd'hui | à jeter |
| jeu. 19 | à jeter | |

« À sortir » n'est jamais un mot de garde : il ne dit que ce que dit le § 4.6. Le mot porte l'information ; la
couleur ne fait que la confirmer (rose pour « à jeter », jaune pour le dernier jour).

**Une part à jeter** n'est jamais retirée toute seule : Popote le dit et la personne répond « Jeté » (§ 10.2), ou
« Je l'ai mangée ». Elle n'est plus comptée, plus proposée, plus placée (§ 4.2, § 4.4).

### 4.4 Un repas

Chaque personne a, chaque jour, deux repas : **midi** et **soir**. Un repas est **passé** à la bascule de
l'accueil, la même partout : le midi à 15 h, le soir à minuit, heure de Paris, jamais à midi pile. Le repas « du
moment » est celui de l'accueil : « Ce midi » jusqu'à 15 h, « Ce soir » ensuite. Un repas est dans un seul de ces
états :

| État | Ce que la semaine montre |
|---|---|
| Rien de prévu | une case en pointillés |
| Prévu : une part | la photo du plat, son nom |
| Prévu : autre chose | « Resto », « Sandwich », ce que la personne a dit |
| Pas là | « Je ne mange pas là » : une prévision, rien à cuisiner ; ce n'est **pas** une note |
| Pas noté | un repas passé qui n'est pas noté : « pas noté : lasagnes » (le plat prévu, pendant les 7 jours) ; « je ne sais plus » le laisse ainsi, sans que la carte revienne |
| Mangé | la part, ou « rien », ou ce qui a été noté, avec une coche |

- Deux personnes qui mangent le même plat au même repas font **une seule carte**, avec leurs deux initiales.
- Un repas « Prévu : autre chose » (« Resto ») se note par une saisie « Autre chose » pré-remplie avec son mot ;
  ses valeurs sont estimées et dites, jamais comptées avant qu'il soit noté.
- Un repas se note jusqu'à **7 jours** en arrière. Au-delà il se lit seulement : « Trop ancien pour être changé. »
- Chacun peut prévoir ou noter pour l'autre ; l'écran garde qui l'a fait. Le serveur reçoit alors le membre visé
  de façon explicite et refuse un membre d'un autre foyer.
- « Resto » et « pas là » comptent comme **prévus** pour tout ce qui demande « y a-t-il quelque chose de prévu »
  (la bulle 5 de la semaine, le rappel « Semaine vide », l'accueil, Cuisiner) : un jour de vacances n'est pas
  une semaine vide.
- « Pas là » se défait (« Vider »). « Rien mangé » est une note : elle se retire dans le détail du jour (§ 6).
- Un repas qui n'est pas encore passé se prévoit à la main ; le placement (§ 5.1) ne remplit jamais un repas
  passé.

**Le cycle de vie d'une part prévue** (une seule règle) :

1. Une part prévue sur un repas est **réservée** jusqu'à ce que ce repas soit noté ; elle n'est proposée nulle
   part ailleurs.
2. Un repas passé et pas noté **libère** sa part à la fin du lendemain du repas, **sauf** si la part est « à
   jeter » (règle 3). Le repas reste « pas noté », le jour reste incomplet (§ 4.5).
3. Le jour de sa date, à 0 h (Paris), une part devient « à jeter ». Si son repas est **à venir**, elle le quitte et
   le repas redevient « rien de prévu ». Si son repas est **passé et pas noté**, elle y reste liée : le rattrapage
   (§ 5.3) demande encore « tu avais prévu des lasagnes : mangées ? », et « Oui, mangé » la compte mangée **ce
   jour-là**, jamais jetée. **La chose à faire** (la bulle du frigo, celle de l'accueil, la fiche) ne dit alors pas
   « Jeté » : elle demande « **Tu l'as mangée mercredi soir ?** » avec « Oui » (le rattrapage de ce repas, avec
   cette part) et « Non » (« Jeté »). Tant que la personne n'a pas répondu, **rien ne détache la part du repas**.
   Le lien tombe à la fin de la fenêtre de rattrapage (7 jours après le repas, § 4.4) : la part est alors une
   part « à jeter » simple, et « Jeté » seul lui est offert.
4. Au rattrapage, « Oui, mangé » prend la part d'origine si elle est encore là, sinon une part libre et bonne du
   même plat, sinon dit « Il n'y a plus de lasagnes. » et propose « Autre chose ». Il ne reprend jamais une part
   réservée ailleurs, mangée ou jetée.

| Quand | Ce qui se passe (lasagnes cuites dim. 15, avant jeu. 19) |
|---|---|
| mer. 18, 23 h 59 | prévue mer. soir, le repas n'est pas encore passé (il l'est à minuit) : elle est réservée, « à manger aujourd'hui » |
| jeu. 19, 0 h 01 | le repas est passé et pas noté, la part est « à jeter » et reste liée ; la chose à faire demande « Tu l'as mangée mercredi soir ? » ; « Oui » la compte mangée mer. 18, « Non » la jette |
| ven. 20, 0 h 01 | toujours liée : la règle 2 ne libère pas une part « à jeter » |
| jeu. 26, 0 h 00 | la fenêtre de 7 jours est finie : le lien tombe, « à jeter » simple, « Jeté » seulement |
| prévue lun. soir, pas notée : mar. 17, 23 h 59 | encore réservée |
| même part : mer. 18, 0 h 01 | libre, proposée de nouveau ; lun. soir reste « pas noté : lasagnes » |
| prévue mar. soir (à venir), cuisson corrigée au 10 | elle est « à jeter » et quitte mar. soir, qui est « rien de prévu » |

**Quand un repas prévu n'est pas mangé** (« j'ai mangé dehors, un kebab »). Dès qu'on note « autre chose »
ou « rien » sur un repas où la personne avait une part prévue (depuis le rattrapage, le détail d'un jour ou
« Aujourd'hui »), **Popote ne décide jamais seule du sort de cette part**. Elle demande, dans le récapitulatif de
la note : « **Et ta part de lasagnes ?** », avec trois choix :

| Choix | Ce qui se passe | Quand il est offert |
|---|---|---|
| Au frigo | la part redevient libre, **sa date limite ne change pas** ; Popote propose de la replacer sur le prochain repas libre : « Je te la mets ce soir ? » avec « Oui » et « Non » | une part du frigo ou sortie |
| Au congélateur | congelée ce jour-là, date à 90 jours | la part est bonne, **n'a jamais été sortie du congélateur**, et passe les règles de § 4.2 (cuisson + 2 jours, recette). **Sinon le choix reste affiché, éteint, avec sa raison écrite** : « Elle a déjà été décongelée : elle ne se recongèle pas. » |
| À la poubelle | jetée, comptée dans « ce qu'on a jeté » (§ 7) | toujours |

- **Tant que la personne n'a pas répondu, la part reste où elle est** : liée à ce repas, jamais libérée par la
  règle 2, et **la question reste dans les choses à faire** (la bulle du frigo, § 8, et celle de l'accueil), sans
  jamais être décidée par défaut. La note du repas, elle, est écrite dès « Noter ».
- Une part encore congelée (prévue, pas encore sortie) n'a pas de question : elle reste au congélateur. Une part
  déjà « à jeter » suit la règle 3 (« Tu l'as mangée ? »), pas cette question.
- Pour un repas **à venir**, rien à demander : la part redevient libre (§ 5.2).
- Le récapitulatif dit les deux choses : « **Kebab-frites, ≈ 950 kcal, 35 g de protéines, estimé.** Ta part de
  lasagnes : au frigo, à manger avant jeudi. » avec « Noter » et « Modifier ».

**Manger en plus.** On peut manger **plus que ce qui était prévu**, sur n'importe quel repas d'aujourd'hui ou des
7 derniers jours (prévu, déjà noté ou vide) : deux parts au lieu d'une, un autre plat, une part sortie du
congélateur. Le geste est « + Manger autre chose en plus » (§ 6.1). Il ne change jamais le repas prévu : ce qui
était prévu reste ce qui était prévu.

### 4.5 Un jour complet, la série

- Un jour est **complet** pour une personne quand son midi et son soir sont **chacun noté** : mangé (une part ou
  plus), autre chose mangé, ou rien mangé. « Pas là » n'est **pas** une note : c'est une prévision. « Je ne sais
  plus » n'en est pas une non plus : le repas reste inconnu. Pour compléter le jour, la personne dit ce qu'elle a
  mangé, ou « rien », et le rattrapage le lui demande (§ 5.3). Ce qui est noté hors des repas (§ 6) s'y ajoute
  mais ne suffit pas.
- Les moyennes et « dans tes objectifs » ne comptent que les jours complets (§ 7) : un jour où l'on n'a noté qu'un
  yaourt, ou « pas là » deux fois et un yaourt, ne compte pas pour une journée à 60 kcal. **Un jour complet
  compte tel quel, même petit** (« rien » deux fois et un yaourt : 60 kcal) : Popote ne juge pas ce qu'on a mangé.
- **« Je ne note pas ce jour »** : la personne peut marquer ainsi un de ses jours passés (7 jours au plus), depuis
  le détail du jour ou la carte de rattrapage. Le jour reste incomplet et hors des moyennes, ses cartes de
  rattrapage disparaissent, la bulle 4 ne le compte plus, et les relances s'arrêtent (§ 13). Le marquage se
  défait (« Je le note finalement »). Chacun marque ses jours, pas ceux de l'autre.
- Un jour se juge contre **l'objectif en vigueur ce jour-là**, pas celui d'aujourd'hui. Un objectif changé vaut
  à partir du lendemain (« Foyer et réglages », § 5) : changé mercredi, il vaut de jeudi ; mercredi et les jours
  d'avant gardent l'ancien. Le tout premier objectif vaut dès le jour où il est réglé ; un jour d'avant n'est
  jugé contre rien : il sort du « sur N jours » du bilan (§ 7).
- **La série** (la flamme) compte les jours de suite, jusqu'à hier, où au moins un repas est noté (mangé, autre
  chose, ou rien ; pas « pas là »), comme dans « Aujourd'hui » ; aujourd'hui s'y ajoute dès qu'un repas est noté.
  Elle ne se perd pas à cause d'aujourd'hui tant que le jour n'est pas fini.

### 4.6 Sortir du congélateur

« À sortir » n'a qu'un sens : **une part congelée prévue sur un repas, à passer au frigo la veille au soir.**

- Elle devient une chose à faire **la veille dès 17 h** (« Sors 2 parts de curry pour demain midi. »), jusqu'à
  minuit. Si ce n'est pas fait, le rappel part **à 19 h** (§ 13). La tuile Frigo compte **toutes les parts dues** :
  2 parts de curry pour demain midi et 2 parts de chili pour demain soir font « 4 à sortir ».
- Sortie, elle va au frigo, se mange le lendemain au plus tard (§ 4.3), et ne se recongèle pas.
- Pas sortie à l'heure du repas : le repas dit « encore congelée », et Popote propose une part du frigo, ou
  « autre chose ».
- Sortir une part sans repas prévu est permis : Popote propose de la placer (« **Sortie !** Je la mets à demain
  midi ? »).
- Une part du congélateur qui approche de ses 90 jours n'est pas « à sortir » : elle est « à finir sous N jours ».
  À N = 1, aujourd'hui est son dernier jour : sortir demande la veille, elle n'est donc ni « à sortir » ni placée,
  et « Sortir » lui est refusé (« Trop tard pour la sortir. »).

### 4.7 Un produit

Un produit porte : un nom, où il est (frigo, congélateur, placard : le skyr et les œufs sont au frigo, le café, le
riz, les pâtes et l'huile au placard), une quantité et son unité si on les connaît
(g, kg, cl, l, pièce, pot, paquet, ou un mot), une date si on la connaît, et, s'il est connu de « Nos produits »
(« Aujourd'hui », § 5.6), ses valeurs.

- Un produit sans quantité est permis : « Huile d'olive ».
- Le placard se remplit par les courses cochées (« Cuisiner », § 9.2), par ce qu'on ajoute (§ 11), et se vide par
  ce que les sessions prennent (« Cuisiner », § 12.4), par « Fini », par ce qu'on dit à Popote (§ 11.1), et quand
  on note avoir mangé un produit dont **le frigo, le congélateur ou le placard** a le compte dans la même unité
  (« un pot de skyr » : 4 pots au frigo, il en reste 3). Ce compte ne descend jamais sous zéro et ne bloque
  jamais une saisie.
- Les produits **suivent la saisie** : changer la quantité mangée (30 g puis 50 g) ajuste de la différence ;
  retirer ou annuler la ligne rend ce qui avait été pris. Les unités se convertissent quand le produit connaît son
  poids ; sinon la saisie passe et Popote le dit : « Je n'ai pas touché au stock. » S'il y a deux lignes du même
  produit (frigo, congélateur, placard), celle dont la date est la plus proche baisse d'abord.
- Un produit qui tombe à zéro peut être proposé pour la liste de courses (§ 11.1, § 11.4).
- Un produit au congélateur prend une date à 90 jours. Un produit congelé passé au frigo ne se recongèle pas : la
  pastille « Congélateur » ne lui est plus offerte (§ 4.2). Un produit dont la date est passée porte « à
  vérifier » : Popote ne dit jamais de jeter un produit.

## 5. La semaine (`/semaine`)

De haut en bas : l'en-tête (« Semaine », le lien « Le bilan »), Popote et sa bulle, le bandeau des jours, la liste
des jours, la barre « Parle-moi, ou écris ».

**Le bandeau** : sept pastilles, d'aujourd'hui à dans six jours (« D 15 », « L 16 »…), aujourd'hui en jaune ; sous
chacune deux points, midi et soir : plein quand un repas est prévu ou noté, creux sinon. Glisser vers la droite
montre les sept jours d'avant ; toucher une pastille amène la liste à ce jour.

**La liste** : un bloc par jour : son nom (« Aujourd'hui », « Demain », « mar. 17 »), puis le midi et le soir.
Une carte de repas : la photo, le nom court du plat, les initiales de ceux qui le mangent, et s'il le faut une
étiquette (« à sortir lundi soir », « encore congelée », « à manger aujourd'hui », une coche pour « mangé »).
Par défaut l'écran montre les repas des deux ; « Moi seulement » les filtre. Un jour marqué « je ne note pas ce
jour » (§ 4.5) porte cette étiquette dans son bloc.

**La bulle** dit la chose à faire, une seule :

| Priorité | Situation | Texte | Bouton |
|---|---|---|---|
| 1 | L'autre a mangé une part prévue pour toi (§ 4.2) | **Sam a mangé ta part de gratin.** Ton repas de ce soir est à remplir. | Je regarde |
| 2 | Des parts neuves ne sont pas placées | **6 parts toutes fraîches !** Je les place dans votre semaine ? | Oui, place-les ; Je le fais |
| 3 | Une part du frigo ne sera pas mangée à temps | **2 parts de lasagnes** ne sont prévues nulle part avant jeudi. | Place-les ; Congèle-les (seulement si « Congeler » est permis, § 4.2) |
| 4 | Des repas passés ne sont pas notés (« pas là » compris) | **Hier, 2 repas pas notés.** On les rattrape ? | Oui |
| 5 | Un repas à remplir, d'ici demain soir, n'a rien de prévu | **Ce soir : lasagnes.** Et demain midi, tu manges où ? | |
| 6 | Rien | **Ce soir : lasagnes.** C'est prévu jusqu'à jeudi soir. | |

- La bulle 1 reste jusqu'à ce que la personne touche « Je regarde » ou remplisse le repas ; s'il y en a plusieurs,
  elle les dit ensemble (« **Sam a mangé 2 parts prévues pour toi.** »).
- **Neuves** : créées depuis la dernière réponse au placement (« Ça me va », « Je change » ou « Je le fais ») ;
  les 12 parts de chili laissées libres, comme les curry, ne reviennent donc pas.
- La bulle 5 ne regarde que les repas à remplir (§ 5.1) : qui ne remplit que ses soirs n'est jamais interrogé sur
  ses midis. La bulle 4 ne compte que les cartes encore affichables (« Je ne sais plus » et « je ne note pas ce
  jour » n'en comptent plus).

### 5.1 Popote place les parts

« Oui, place-les ». La première fois, Popote demande : « **Je remplis quels repas ?** » avec deux cases à cocher,
« Les soirs » (cochée) et « Les midis », la ligne « Je m'en souviendrai. » et « C'est ça ». Les fois suivantes elle
ne le redemande pas ; le choix se change dans « … », « Les repas à remplir ». **Le choix est par personne** :
Popote remplit, pour chaque membre, les repas que ce membre a cochés. Tant qu'un membre n'a pas répondu, ce sont
« les soirs », et Popote le dit : « Pour Léa, je remplis ses soirs. »

Les parts s'envolent du frigo vers les cases, et Popote récapitule : « **Vos dîners jusqu'à jeudi.** Le frigo
d'abord, le congélateur ensuite. Ça te va ? » avec « Ça me va » et « Je change ». Rien n'est écrit avant « Ça me
va » : le tampon « Semaine prête », des confettis, « **C'est posé !** Je te dirai quand sortir le curry. »

| Jour | Soir | |
|---|---|---|
| dim. 15 | Lasagnes | Sam et Léa |
| lun. 16 | Lasagnes | Sam et Léa |
| mar. 17 | Gratin | Sam et Léa |
| mer. 18 | Curry | à sortir mardi soir |
| jeu. 19 | Curry | à sortir mercredi soir |

**Comment les parts sont placées** (par le serveur) :

1. Seuls les repas cochés (« Les soirs », « Les midis »), du prochain repas **pas encore passé** (§ 4.4) jusqu'à
   dans 6 jours, et **vides** : un repas déjà prévu, noté, ou « pas là » n'est jamais touché. Aucune part
   congelée sur un repas d'aujourd'hui.
2. L'ordre des parts : d'abord **les parts sorties** (à manger le lendemain au plus tard, elles ne se recongèlent
   pas) ; puis celles **du frigo, par date**, la plus pressée d'abord (à date égale, le plat qui a le plus de
   parts, puis son nom) ; puis **le congélateur**, de la plus ancienne à la plus récente. Chaque part va **avant
   sa date**. Une part à jeter n'entre jamais, ni une part du congélateur à son dernier jour (§ 4.6).
3. À chacun une part dressée pour lui ; à défaut une part pour personne ; à défaut celle de l'autre (la carte
   dit alors « part de Léa », et le récapitulatif aussi).
4. Quand c'est possible, les deux mangent le même plat au même repas. Un plat entamé se finit avant d'en entamer
   un autre, sauf si une date l'interdit.
5. Ce qui ne rentre pas reste libre, et Popote le dit : « Il reste 12 parts de chili au congélateur. »
6. À parts, repas et réglages égaux, le même placement sort.

Le tableau ci-dessus suit ces règles : les lasagnes et le gratin du frigo ont la même date, les lasagnes (4 parts)
passent d'abord et se finissent lundi ; le gratin (2 parts) vient ensuite, mardi ; le congélateur suit, du plus
ancien : le curry, mercredi et jeudi ; les 12 parts de chili ne trouvent pas de soir.

**Ce que « Ça me va » porte, et ce que le serveur juge à l'écriture.** La proposition porte **l'identifiant et la
version de chaque repas visé ET de chaque part posée**. Le serveur juge **à l'heure où il écrit**, en jours de
Paris, jamais à une heure que l'appareil lui donne. Il **refuse tout** (rien n'est écrit, la proposition est
recalculée) si l'un de ces cas est vrai : un repas visé est devenu passé (§ 4.4) ; un repas visé a changé ; une
part n'est plus libre (mangée, prévue ailleurs, congelée, jetée), est devenue « à jeter », ou a changé. L'écran
dit : « **La semaine a changé.** Je refais ma proposition. » Exemples : proposition lun. 16 à 18 h, « Ça me va »
hors ligne, envoi à 23 h 59 : tout passe si rien n'a changé ; envoi mar. 17 à 0 h 05 : refusé, lundi soir est
passé. Un curry sorti lundi (à manger avant mer. 18), posé sur mardi soir, écrit mer. 18 à 0 h 05 : refusé, la part
est « à jeter ». Léa mange la part de gratin entre la proposition et l'écriture : refusé.

**Une part du frigo qui ne tient pas** avant sa date : « **2 parts de lasagnes ne tiendront pas.** Je les
congèle ? » avec « Congèle-les » et « Non ». Si « Congeler » n'est pas permis (§ 4.2 : la recette ne se congèle pas,
ou la part a plus de 2 jours de cuisson), Popote le dit sans proposer « Congèle-les » : « **2 parts de gratin ne
tiendront pas.** Le gratin ne se congèle pas. »

« Je change », « Je le fais » : la semaine reste ouverte, on place à la main (§ 5.2). « Replace le reste », dans
« … », relance le placement sur les repas encore vides.

### 5.2 Changer un repas

Toucher un repas ouvre sa feuille : « **Mardi soir** », la carte du plat s'il y en a un, et :

| Choix | Ce qui se passe |
|---|---|
| Un autre plat | la liste des plats qui ont une part libre et bonne, le frigo d'abord, avec leur mot d'urgence ; une part du congélateur dit quand la sortir ; choisir remplace, et l'ancienne part redevient libre |
| Autre chose | « Resto », « Sandwich », « Chez des amis », ou un mot : rien à cuisiner, rien de compté avant que ce soit noté. Une part déjà prévue sur ce repas redevient libre, sa date inchangée ; pour dire qu'on a **déjà** mangé autre chose, c'est « Noter ce repas » |
| Noter ce repas | pour un repas d'aujourd'hui ou passé, pas noté : la carte du rattrapage (§ 5.3), avec « Oui, mangé », « Autre chose », « Rien », « Je ne sais plus » |
| + Manger autre chose en plus | pour un repas d'aujourd'hui ou des 7 derniers jours, prévu, noté ou vide : la liste du § 6.1 |
| Je ne mange pas là | le repas est « pas là » |
| Pour qui ? | « Vous deux », « Sam », « Léa » : retirer quelqu'un libère sa part ; l'ajouter lui donne une part libre du même plat, ou le dit : « Il n'y a plus de gratin pour Léa. » |
| Vider | le repas redevient « rien de prévu » (seulement s'il est prévu ou « pas là ») |

- Popote dit ce que le changement entraîne : « **Léa ne mange pas là mardi ?** Sa part de gratin reste au
  frigo. », « **Curry mardi midi.** À sortir lundi soir, du coup. »
- **Déplacer** : glisser une carte sur un autre repas, ou « Déplacer » dans la feuille puis toucher le repas visé.
  Sur un repas occupé, les deux s'échangent. Une carte à deux se déplace pour les deux ; si l'un des deux repas
  visés est noté, « pas là » ou passé, rien ne bouge : « **Pas possible pour Léa.** ». Une part ne se pose pas
  après sa date : « **Trop tard pour les lasagnes :** elles sont à manger avant jeudi. »
- Une part congelée posée sur un repas trop proche pour être sortie la veille est permise, avec l'étiquette
  « encore congelée ».
- Un repas déjà mangé ne se change pas ici : il s'annule (« Aujourd'hui », § 5.2) depuis le détail du jour.
- Deux personnes qui changent le même repas en même temps : le second reçoit l'état à jour et la bulle dit « **Léa
  vient de changer ce repas.** Regarde, et réessaie. »

### 5.3 Rattraper hier

« Oui » : une carte par repas pas noté des jours passés (7 jours au plus), du plus ancien au plus récent :
« **Lundi soir :** tu avais prévu des lasagnes : mangées ? » avec « Oui, mangé », « Autre chose », « Rien », « Je ne
sais plus ». Sous la carte, le lien « Je ne note pas ce jour » (§ 4.5).

- « Oui, mangé » note une part (celle d'origine si elle est là, sinon une part libre du même plat : § 4.4, règle
  4) ; « Rien » note qu'on n'a rien mangé ; « Autre chose » ouvre la saisie d'« Aujourd'hui » (§ 5.5) visée sur ce
  repas : la phrase, le récapitulatif (« Kebab-frites, ≈ 950 kcal, 35 g de protéines, estimé »), « Noter ».
- **La part prévue qu'on ne mange pas.** Avec « Autre chose » ou « Rien », le récapitulatif demande aussi ce que
  devient la part prévue (§ 4.4) : « **Et ta part de lasagnes ?** » avec « Au frigo », « Au congélateur » (éteint,
  avec sa raison écrite, si la part a déjà été décongelée) et « À la poubelle ». Popote ne choisit jamais à la
  place de la personne : sans réponse, la part reste où elle est et la question reste dans les choses à faire.
  Après « Au frigo », si la part est encore bonne et qu'un repas à remplir existe, Popote propose : « **Je te la
  mets ce soir ?** » avec « Oui » et « Non ».
- Un repas « pas là » demande : « **Mardi midi, tu n'étais pas là :** tu as mangé quoi ? » avec « Je le dis »,
  « Rien », « Je ne sais plus ». Un repas sans rien de prévu demande : « **Mardi soir : tu as mangé quoi ?** »
  avec les mêmes trois réponses. **« Je ne sais plus » existe sur toutes les cartes** : il laisse le repas pas
  noté (le jour reste incomplet, hors des moyennes), et la carte ne revient pas ; la bulle ne le compte plus.
- Une part prévue sur un repas qui reste « je ne sais plus » est libérée par la règle 2 du § 4.4.
- À la fin : « **Mardi est complet.** » (le midi et le soir sont notés, § 4.5).
- Rattraper pour l'autre est possible depuis « … » : « Rattraper pour Léa ». Le serveur reçoit alors le membre
  visé, dans le même foyer ; la part prévue sur son repas est la sienne.

## 6. Le détail d'un jour (`/semaine/jour/:date`)

On y arrive en touchant le nom d'un jour. En haut, les deux jauges du jour, comme sur l'accueil : « Énergie 2 310 /
2 400 », « Protéines 148 / 160 g », et l'interrupteur « Moi » / « Léa ». **Les jauges et l'objectif de l'autre se
lisent, ne se changent pas** (son réglage est le sien, dans « Foyer et réglages »). Puis trois blocs :

| Bloc | Ce qu'il liste |
|---|---|
| Midi | le repas : la part, ou ce qui a été noté, puis ce qui a été ajouté (dessert) |
| Soir | de même |
| Le reste de la journée | ce qui est noté hors des repas : petit-déjeuner, encas |

Chaque ligne : le nom, la quantité s'il y en a une, ses valeurs, et « estimé » quand elles le sont. Un bouton
« + Ajouter » sous chaque bloc ouvre la saisie d'« Aujourd'hui », visée sur ce jour et ce bloc ; sous le midi et
le soir, un second bouton, « + Manger autre chose en plus », ouvre la liste du § 6.1.

- **Toucher une ligne** ouvre sa feuille : changer la quantité (un compteur, ou des grammes), les valeurs
  suivent ; « Enregistrer » ; « Retirer ». Retirer une part mangée (comme « Annuler » dans « Aujourd'hui »)
  **rend la part à son état et à sa date d'avant** (§ 4.2) : au frigo, ou sortie. Si sa date est passée
  entre-temps, elle revient « à jeter » et l'écran demande « **Tu l'as jetée ?** » avec « Oui » et « Non, je
  l'ai encore ».
- **Toucher « estimé »** : « **C'est une estimation.** Tu as les vraies valeurs ? » avec « Non, ça ira » et « Je
  les donne » (« Aujourd'hui », § 5.4).
- Un repas « rien de prévu » d'un jour passé ou d'aujourd'hui montre « Noter ce repas » ; un repas **prévu et pas
  noté** montre aussi « Noter ce repas » (la carte du § 5.3, avec la question sur la part prévue) ; un repas « pas
  là », « Dire ce que tu as mangé » ; d'un jour à venir, « Prévoir ce repas » (la feuille du § 5.2).
- Un jour passé incomplet, dans les 7 jours, offre « **Je ne note pas ce jour** » (et « Je le note finalement »
  quand il est marqué) ; § 4.5.
- Sur le jour de l'autre, « + Ajouter » devient « Ajouter pour Léa » : on note pour elle, dans les 7 jours.
- Au-delà de 7 jours en arrière : tout se lit, rien ne se change.
- Un jour à venir n'a pas de jauges : seulement ses repas prévus.

### 6.1 « + Manger autre chose en plus »

Pour un repas d'aujourd'hui ou des 7 derniers jours, **prévu, déjà noté ou vide** (au-delà, tout se lit). La feuille
« **Tu as mangé quoi en plus ?** » montre ce qu'il y a au frigo et au congélateur :

| Étagère | Ce qu'elle liste |
|---|---|
| Au frigo | les plats qui ont des parts bonnes, avec leur mot d'urgence et le nombre de parts |
| Au congélateur | les plats qui ont des parts bonnes, avec « à décongeler » |
| Autre chose | un produit du stock (frigo, congélateur, placard) ou une saisie libre : la saisie d'« Aujourd'hui », visée sur ce repas |

- On prend **plusieurs parts du même plat** (un compteur) ou **un autre plat**, et on peut cumuler. Toute part
  bonne du foyer se prend (§ 4.2), **y compris une part prévue pour l'autre membre ou pour un autre jour**. Une
  part « à jeter » ne se prend jamais.
- **Récapitulatif, puis validation**, comme partout : « **Si j'ai bien compris :** 2 parts de gratin et 1 part de
  curry (à décongeler), ≈ 1 450 kcal, 70 g de protéines. » avec « Noter » et « Modifier ». Rien n'est écrit avant
  « Noter ».
- **Ce que ça change.** Les parts sont notées sur ce repas (en plus de ce qui y est déjà), le stock baisse, les
  jauges du jour montent. Le repas prévu n'est pas touché.
- **Une part prise était prévue pour un repas à venir** (le sien ou celui de l'autre). Popote le dit dans le
  récapitulatif : « **Il t'en manquera une lundi soir.** » (pour l'autre : « Il en manquera une à Léa lundi
  soir. »), et propose un remplacement parmi ce qui reste : « **Je te mets du gratin ?** » avec « Oui » et « Je
  verrai ». Le repas perd sa part dès « Noter » et redevient « rien de prévu » (« à remplir ») ; sans réponse, il le
  reste. Pour l'autre membre, c'est sa bulle qui porte la proposition (§ 5, priorité 1).
- **Une part du congélateur** prise pour être mangée tout de suite est comptée **sortie puis mangée** dans la même
  écriture (§ 4.6). Si cette ligne est retirée ensuite, la part revient **sortie** avec sa date de sortie, jamais
  au congélateur (§ 4.2) ; elle est « à jeter » si cette date est passée.

## 7. La semaine en chiffres (`/semaine/bilan`)

Titre « Ta semaine ». Un interrupteur « Moi » / « Léa » (les jauges et l'objectif de l'autre se lisent, ne se
changent pas), et un autre « 7 derniers jours » / « 4 semaines ». La période s'arrête **à hier** : aujourd'hui n'est
jamais jugé avant d'être fini.

- **Sept colonnes**, les 7 derniers jours jusqu'à hier : pour chaque jour deux mini-jauges (énergie, protéines).
  Un jour complet est plein de couleur ; un jour incomplet est hachuré, avec « ? » (et « je ne note pas » s'il est
  marqué, § 4.5). Toucher une colonne ouvre le jour (tout jour passé se lit, § 3).
- **Deux chiffres** : « Énergie : 2 280 par jour, objectif 2 400 » et « Protéines : 152 g par jour, objectif
  160 g » : la moyenne des jours complets, arrondie à 10 kcal et au gramme. Si l'objectif a changé
  dans la période : « objectif variable » à la place du chiffre.
- **Une ligne** : « 5 jours dans tes objectifs sur 6 jours complets. » **Un seul seuil, celui d'« Aujourd'hui »**
  (§ 5.1) : un jour est dans les objectifs quand son énergie ne dépasse pas l'objectif de ce jour et que ses
  protéines l'atteignent (153 sur 160 g : « encore 7 g » sur la jauge, et pas dans les objectifs). Chaque jour est
  jugé avec **l'objectif valable ce jour-là** (§ 4.5) ; un jour complet sans objectif ce jour-là sort du « sur
  N » : N compte les jours complets qui ont un objectif.
- **La série** : une flamme et « 12 jours de suite » (§ 4.5).
- **Ce qu'on a jeté** : « 1 part jetée cette semaine. », seulement s'il y en a ; jamais un reproche. Compte les
  parts jetées par « Jeter », par « À la poubelle » (§ 4.4) et par « Non » (§ 4.4, règle 3) ; jamais une part mangée, ni
  une part retirée par « Il y en a moins ».
- **La phrase de Popote**, la première qui convient dans cet ordre (sur la période affichée) :

  | Si | Phrase |
  |---|---|
  | aucun jour complet | **Rien à mesurer encore.** Note tes repas, et je te montre ta semaine. |
  | moins de 3 jours complets sur 7 (7 derniers jours), moins de la moitié (4 semaines) | **Peu de jours complets :** note tes midis, je verrai mieux. |
  | énergie moyenne au-dessus de l'objectif | **Un peu au-dessus en énergie,** rien de grave. |
  | protéines moyennes sous l'objectif | **Les protéines,** il manque un petit quelque chose. |
  | sinon | **Belle semaine !** |

  Popote ne gronde jamais. Sans objectifs, seules les trois lignes « aucun », « peu » et « sinon » s'appliquent.
  « Au-dessus » et « sous » se jugent **jour par jour contre l'objectif de ce jour** : l'énergie est « au-dessus »
  quand la moyenne des écarts (énergie du jour moins objectif du jour, sur les jours complets qui ont un objectif)
  est positive, les protéines « sous » quand elle est négative ; avec un objectif constant, c'est la moyenne
  contre l'objectif.
- Sans objectifs : les colonnes et les moyennes s'affichent sans « objectif », et un lien mène au réglage.
- « 4 semaines » montre quatre lignes de sept points (complet et dans les objectifs, complet hors objectifs,
  incomplet) et les deux moyennes sur les 28 jours jusqu'à hier.

## 8. Le frigo (`/frigo`)

Le frigo est un objet dessiné : une porte vert menthe, fermée, avec un aimant en forme de marmite et un mot : « 22
parts, 4 plats ». Trois onglets en haut : **Frigo**, **Congélateur**, **Placard**. La porte s'ouvre toute seule à
l'arrivée (elle reste ouverte ensuite ; avec « mouvement réduit », elle est ouverte d'emblée).

**La bulle** dit la chose à faire, une seule. **Une chose à faire = un plat** : les parts de ce plat ensemble, le
plat suivant ensuite. Les textes sont ceux de l'accueil (« Aujourd'hui », § 4.2), repris au mot près.

| Priorité | Situation | Texte | Bouton |
|---|---|---|---|
| 1 | Des parts d'un plat sont à jeter | **Une part de lasagnes** périmée depuis le 19 novembre : à jeter. (au pluriel : « 2 parts de lasagnes… » ; sortie du congélateur : « Une part de chili décongelée depuis le 5 novembre : à jeter. ») Si la part est liée à un repas passé pas noté (§ 4.4, règle 3) : **Tu l'as mangée mercredi soir ?** | Jeté ; ou Oui, Non |
| 2 | Des parts sont à sortir (§ 4.6) | Sors 2 parts de curry pour demain midi. | Je les sors |
| 3 | Une part prévue attend de savoir ce qu'elle devient (§ 4.4) | **Et ta part de lasagnes ?** Tu as mangé dehors. | Au frigo ; Au congélateur (éteint avec sa raison s'il n'est pas permis) ; À la poubelle |
| 4 | Une part du frigo est à manger aujourd'hui et n'est prévue nulle part | **1 part de gratin** à manger aujourd'hui. | Je la mange ce soir |
| 5 | Rien | **22 parts au frais.** Rien à jeter ! | |

- Les priorités 1 et 2 sont les choses à faire de l'accueil : régler l'une ici la règle là-bas. La priorité 1
  couvre ici toute part à jeter, au frigo comme au congélateur (l'accueil reprendra cette extension).
- Pour une part liée à un repas passé, « Oui » ouvre le rattrapage de ce repas avec cette part (« Aujourd'hui »
  ne la jette jamais d'avance) ; « Non » la jette. Tant que la personne n'a pas répondu, la part reste liée.
- Après l'appui : « **Merci !** Frigo propre. » et « **2 parts sorties !** Prêtes pour demain midi. » ; « Annuler »
  reste offert 6 secondes après « Jeté » comme après « Je les sors » (§ 10).
- **« Rien à sortir. »** : quand on arrive par le rappel « À sortir » (§ 13) et qu'il n'y a plus rien à sortir (la
  part est déjà sortie, ou mangée), la bulle le dit à la place de « Rien à jeter ! », si rien d'autre n'est plus
  urgent.
- La priorité 2 compte et propose **toutes les parts dues** pour la prochaine journée, plat après plat (le curry
  d'abord, puis le chili) ; la tuile en fait un seul nombre (« 4 à sortir »).
- « Je la mange ce soir » prévoit la part sur le repas du moment, **montré à l'écran** (« Ce midi » jusqu'à 15 h,
  « Ce soir » ensuite, jusqu'à minuit) ; le texte du bouton suit (« Je la mange ce midi »).

**Dans chaque onglet**, deux étagères :

- **Les plats** : une carte par plat : la photo, le nom court, « 4 parts », le mot d'urgence de sa part la plus
  pressée, et s'il le faut une étiquette « 2 à sortir mardi soir », « 1 à jeter ». Les plus pressés d'abord.
- **Les produits** : une étiquette par produit : « Épinards 800 g », « Skyr 3 pots », « Huile d'olive » ; ceux qui
  ont une date proche d'abord. Le placard n'a que des produits (café, riz, pâtes, huile) ; le skyr et les œufs
sont au frigo.

Le congélateur est un tiroir givré ; le placard une planche de bois clair. Un onglet vide le dit : « **Rien au
congélateur.** »

**Le mot de la porte, et la tuile Frigo de l'accueil**, suivent la même règle (elle remplace la règle provisoire
d'« Aujourd'hui », § 4.5) : le nombre compte les parts encore à manger, au frigo, sorties et au congélateur ; une
part à jeter n'est pas comptée ; « à jeter » passe avant « à sortir ».

| État | Phrase |
|---|---|
| Un seul plat | 12 parts de chili |
| Plusieurs plats | 22 parts, 4 plats |
| Des parts à sortir | 22 parts, 2 à sortir |
| Des parts à jeter | 21 parts, 1 à jeter |
| Aucune part | Vide |

**Le bouton « + »**, en bas à droite, ouvre « Ajouter » (§ 11).

## 9. La fiche d'un plat (`/frigo/plat/:id`)

Une feuille : la photo, le nom, « Cuisinées dimanche 15 » (ou « Achetées le… »), « À manger avant jeudi », et **un
jeton par part** : l'initiale de la personne pour qui elle est dressée et son poids (« S 324 g »), ses valeurs en
petit (« 480 kcal, 28 g »), son état s'il n'est pas « au frigo » (un flocon, « sortie », « à jeter », « prévue
mardi soir »).

| Bouton | Ce qui se passe |
|---|---|
| En manger une | note une part sur le **jour et le repas montrés à l'écran** (la cible d'« Aujourd'hui », § 5 : « Ce midi » ou « Ce soir » avec sa version, jamais déduite de l'heure par le serveur) ; **n'importe quel membre, n'importe quelle part du foyer** (§ 4.2) ; on peut en manger **plusieurs au même repas** (« En manger une » deux fois, ou « Combien ? » : 2) ; si un autre plat y était prévu, il redevient libre ; une part prévue sur un autre repas (le sien ou celui de l'autre) vide ce repas, et la fiche le dit avant |
| Congeler | « Combien ? » puis « Congeler 2 parts » : seulement des parts bonnes, jamais congelées, **et seulement jusqu'au jour de cuisson + 2 jours** (§ 4.2) ; jamais pour une recette qui ne se congèle pas ; « à vérifier » si on ne sait pas ; elles prennent leur date à 90 jours. Si elles étaient prévues : « **2 parts au congélateur.** Bonnes avant le 13 février. Je les retire de lundi soir ? » avec « Oui » et « Non, je les ressortirai ». « Annuler » reste offert 6 secondes (§ 10) |
| Sortir | « Combien ? » puis « Sortir 2 parts » (§ 4.6) : seulement des parts bonnes du congélateur, pas à leur dernier jour. « Annuler » reste offert 6 secondes (§ 10) |
| Jeter | « Combien ? » puis « Jeter 1 part » : elle est comptée comme jetée (§ 7) ; seul geste, avec « Je l'ai mangée », qui prend une part à jeter. **Les parts à jeter passent d'abord**, puis les plus pressées. Une part à jeter liée à un repas passé pas noté demande d'abord « Tu l'as mangée mercredi soir ? » (§ 4.4, règle 3). « Annuler » reste offert 6 secondes (§ 10) |
| Je l'ai mangée | pour une part à jeter : elle se note sur un repas passé (§ 5.3), et n'est pas comptée comme jetée. Si ce repas est à plus de 7 jours (aucun repas notable), la part est retirée sans repas ni nutrition, et n'est pas comptée comme jetée |
| Corriger | le jour de cuisson (pas dans le futur ; **seulement vers plus tôt : la date ne peut que se rapprocher**, § 4.2 ; jamais pour sortir une part de « à jeter » : elle n'est alors pas corrigeable), pour qui est une part, et « Il y en a moins » : retirer une part qui n'existe pas, sans la compter comme jetée. Parts bonnes seulement |

- **Les parts choisies sont montrées avant de confirmer.** Après « Combien ? », l'écran montre les jetons pris :
  pour « Jeter », les parts à jeter d'abord, puis les plus pressées ; pour les autres gestes, les plus pressées
  **encore bonnes**, les miennes d'abord ; pour « En manger une », les parts **libres** d'abord, puis celles
  prévues sur un repas, le plus lointain d'abord. On peut toucher un jeton pour en changer. Le geste envoie **les
  identifiants et les versions** de ces parts ; si l'une a changé entre-temps (l'autre vient de la manger, de la
  jeter), le serveur refuse tout, rien n'est écrit, et l'écran se met à jour.
- Toucher un jeton montre cette part seule, avec les mêmes gestes pour elle.
- Une part prévue sur un repas qu'on jette, congèle ou retire quitte ce repas, et la fiche le dit avant.
- Le lien « Voir la recette » mène à la fiche de la recette (« Cuisiner », § 7.2), pour un plat d'une session.

## 10. Sortir, jeter, annuler

**« Annuler » après « Jeté », « Je les sors » et « Congeler ».** Il reste offert **6 secondes** à l'écran. Côté
serveur, la fenêtre est de **10 secondes**, mesurées à l'horloge du serveur depuis l'écriture, jamais à celle de
l'appareil. L'annulation se demande **par l'identifiant de l'écriture** et se rejoue sans effet de plus. Elle rend
à chaque part **son état et ses liens d'avant** (§ 4.2) : sa date, et le repas où elle était prévue **si ce repas
est encore libre** ; sinon la part revient libre, et l'écran le dit. Au-delà de la fenêtre, le geste est définitif.
Défaire « Je les sors » remet la part au congélateur : c'est défaire un geste, pas recongeler.

### 10.1 « Je les sors »

Le tiroir du congélateur s'ouvre, les jetons perdent leur givre et montent sur l'étagère du frigo, avec
l'étiquette « sorties ce soir, à manger avant mercredi ». Popote : « **2 parts sorties !** Prêtes pour demain
midi. » (le même texte que sur l'accueil). « Annuler » reste offert 6 secondes.

### 10.2 « Jeté »

Le jeton tombe dans une petite poubelle, l'étiquette s'en va. Popote : « **Merci !** Frigo propre. » Pas de
confettis, pas de reproche. **« Annuler » reste offert 6 secondes** (comme « Fini », § 11.4) : la part retrouve
son état d'avant, « à jeter » comprise, et ses liens d'avant si leur repas est encore libre (voir ci-dessus) ;
ensuite « Jeté » est définitif.

- Une part devient « à jeter » à 0 h le jour de sa date (§ 4.3).
- « Je l'ai mangée » est toujours offert à côté de « Jeté », dans la fiche : la part se note alors sur un repas
  passé (§ 5.3), et n'est pas comptée comme jetée. Pour une part liée à un repas passé pas noté, c'est la question
  « Tu l'as mangée mercredi soir ? » (§ 4.4, règle 3).

## 11. Ajouter (`/frigo/ajouter`)

Une feuille, cinq tuiles : « Le dire », « Photo du frigo », « Une étiquette », « Un plat tout prêt », « À la main ».
Chacune finit par un récapitulatif à valider ; rien n'est rangé avant. **Tout ce que Popote a lu ou compris se
corrige avant de valider** (le nom, la quantité, le lieu de chaque ligne), et **on peut supprimer une ligne ou en ajouter une à la
main** si elle s'est trompée ou a oublié quelque chose. **« À la main » n'a besoin d'aucun modèle** : nom, quantité, lieu, date,
« Ranger ». Les quatre autres lisent avec Popote ; quand elle ne peut pas :

| Cas | Texte | Sortie |
|---|---|---|
| Quota de photos ou d'étiquettes atteint | **Plus de photos pour le moment.** Ajoute à la main, ou reviens plus tard. | « À la main » |
| Popote ne répond pas | **Popote ne répond pas.** Ajoute à la main, ou réessaie dans un moment. | « À la main », « Réessayer » |
| Photo trop lourde, même réduite sur l'appareil | **Cette photo est trop lourde.** Reprends-en une plus petite. | « Reprendre » |

Les quotas restants se disent sur la tuile quand ils sont bas.

### 11.1 Le dire

« J'ai acheté 2 pizzas surgelées et 4 pots de skyr ». Popote : « **Si j'ai bien compris :** » et un ticket, une
ligne par chose :

| Ce qui est dit | Où | Ce que c'est | Ses valeurs |
|---|---|---|---|
| 2 pizzas surgelées | Congélateur | 2 parts (un plat tout prêt) | « ≈ 850 kcal, 34 g par part », « estimé » |
| 4 pots de skyr | Frigo | un produit, 4 pots de 150 g | « 165 kcal, 27 g par pot », « connu » |

- **Plat ou produit** : ce qui se mange tel quel en un repas devient des **parts** ; le reste est un **produit**.
  Toucher une ligne change ce choix, le lieu, la quantité, le nom.
- **Les valeurs** : « connu » quand le produit est dans « Nos produits » ; « estimé » sinon, et Popote propose
  après coup de devenir exacte : « **C'est rangé !** Les pizzas : photographie l'étiquette si tu veux les vraies
  valeurs. » Un produit qu'on ne mange pas tel quel (des épinards) n'a pas besoin de valeurs.
- **Le lieu** est deviné (un mot « surgelé », le rayon habituel du produit : le skyr au frigo, le café au
  placard), et se change.
- « Ranger » écrit tout d'un coup ; « Modifier » rouvre les lignes ; « + Ajouter ce que j'ai oublié » en ajoute une à la main. Une
  phrase où Popote ne reconnaît rien : « Je n'ai pas compris ce que tu ranges. Dis-le autrement ? »
- **Changer le stock, à la voix ou par écrit.** « Ajoute 500 g de café », « Il me reste 200 g de café »,
  « J'ai fini le riz », « Enlève 2 œufs » : n'importe quel produit du placard, du frigo ou du congélateur. Le
  ticket montre **l'avant et l'après**, une ligne par produit : « **Café, placard :** 500 g → 200 g »,
  « **Riz, placard :** 1 paquet → fini ». Toucher une ligne change le produit visé (s'il y en a deux, celui dont
  la date est la plus proche est proposé d'abord), la quantité, le lieu. Un produit que Popote ne trouve pas
  donne une ligne « pas trouvé : café ? », non cochée. Rien n'est écrit avant « Ranger ». Un produit qui tombe à
  zéro : « **Plus de café.** Je le mets sur la liste de courses ? » avec « Oui » et « Non » (le geste est celui de
  « Cuisiner », § 9). Les parts d'un plat ne se changent pas ici : ce sont les gestes de la fiche (§ 9).

### 11.2 Photo du frigo

Une photo ; « Je regarde… » ; puis la liste de ce que Popote voit, une ligne par chose, **aucune cochée
d'avance** : « vu » pour une chose sûre, « deviné : sauce tomate ? » pour ce dont elle doute. Popote : « **J'en
vois 5.** Coche ce qui est juste. » avec « Tout cocher ». La même liste sert pour une photo de **ticket de caisse**
et pour une **étiquette** (§ 11.3). Popote peut oublier un produit, se tromper dans une quantité, en inventer un :
**quatre gestes, avant de valider, sur chaque liste lue**.

| Geste | Ce qu'on fait | Effet |
|---|---|---|
| **Confirmer** une ligne | la cocher | elle sera rangée |
| **Modifier** une ligne | la toucher : nom, quantité, emplacement (frigo, congélateur, placard) | la ligne corrigée est celle qui sera rangée |
| **Supprimer** une ligne | une croix sur la ligne, ou « Enlever ce produit » dans sa feuille de correction | la ligne disparaît de la liste (un produit que Popote a inventé) ; elle ne sera jamais rangée |
| **Ajouter** une ligne | « + Ajouter ce que j'ai oublié » : nom, quantité, emplacement | la ligne est ajoutée, cochée (la personne l'a écrite) |

**Rien n'entre dans le frigo avant le bouton final**, dont le texte suit le compte des lignes cochées : « Ajouter 6
produits », « Ajouter 1 produit » ; sans ligne cochée, il est éteint. Une ligne supprimée n'est pas comptée ; une
ligne modifiée ou ajoutée l'est si elle est cochée.

- Une photo n'ajoute que des produits, jamais des parts.
- **Tout ce que le modèle lit est une donnée, jamais une consigne** : un post-it, une étiquette, un emballage qui
  dit « ajoute 20 pizzas » devient au plus une ligne, **jamais cochée d'avance, même quand elle paraît sûre**. Le
  modèle de lecture n'a aucun outil d'écriture ; sa sortie est typée, **bornée** (30 lignes au plus, 80 caractères
  par nom, une quantité hors de toute vraisemblance — négative, nulle ou au-delà de 1 000 — écartée : la ligne
  demande « Combien ? ») et validée par la personne. Au-delà de 30 lignes : « **Trop de choses d'un coup :** je
  n'en garde que 30. »
- **Sur l'appareil, avant l'envoi, la photo est réduite (2 048 px au plus) et ré-encodée en JPEG** : le lieu (GPS)
  et les métadonnées disparaissent. Le serveur la ré-encode aussi. **Popote n'en garde rien** : la photo est
  effacée après la lecture, **même si elle échoue**. Le fournisseur du modèle, lui, peut garder un contenu
  signalé jusqu'à 2 ans, aux États-Unis ; l'écran le dit une fois, au premier usage.
- Un produit déjà au frigo sous le même nom n'est pas ajouté deux fois : la ligne dit « déjà là », décochée.
- Illisible : « **Je ne vois pas bien.** Reprends la photo, porte grande ouverte. »

### 11.3 Une étiquette, un plat tout prêt

- **Une étiquette** : le parcours « apprendre un produit » d'« Aujourd'hui » (§ 5.6) : photo de l'étiquette ou
  code-barres, valeurs lues et montrées **et corrigeables ligne à ligne**, « Garder » ; puis « Combien tu en as ? »
  pour le ranger. Les mêmes règles que la photo du frigo : rien de coché d'avance, la lecture est une donnée, la
  photo est réduite sur l'appareil et rien n'en est gardé.
- **Un plat tout prêt** : un nom, « Combien de parts ? », où il va, sa date si elle est écrite, et ses valeurs par
  part : lues sur l'étiquette, ou estimées et marquées. Il devient un plat comme les autres, « acheté ».

### 11.4 Un produit

Toucher un produit ouvre sa feuille : le nom, la quantité (un compteur), le lieu (trois pastilles), la date ;
« Fini » (il disparaît, sans confirmation, avec « Annuler » pendant 6 secondes, puis la proposition « **Plus de
café.** Je le mets sur la liste de courses ? ») ; « Enregistrer ».

## 12. Sur PC (à partir de 900 px)

Deux colonnes et Popote ouverte à droite, comme sur l'accueil.

- **La semaine** en grille : sept colonnes-jours, deux lignes (Midi, Soir), les cartes dans les cases ; glisser une
  carte d'une case à l'autre. Le détail d'un jour s'ouvre en panneau.
- **Le frigo** ouvert en trois colonnes : Frigo, Congélateur, Placard, sans onglets.
- Le bilan, « Ajouter » et les feuilles gardent leur colonne unique, centrée.

## 13. Ce que ce monde demande aux rappels

Les rappels sont des **notifications push** ; ce monde n'envoie aucun mail en v1.

| Rappel | Quand | Texte (exemples ; `{plat}` et `{prénom}` sont permis) |
|---|---|---|
| À sortir | la veille à 19 h, **si la condition est encore vraie à l'envoi** : une part congelée est prévue le lendemain et n'est pas sortie | {Prénom}, le {plat} dort au congélateur. Réveille-le ce soir pour demain ! |
| Dernier jour | à 9 h, le dernier jour d'une part du frigo qui n'est prévue sur aucun repas du jour | {Plat} fête son dernier jour au frigo. Un dernier repas, {prénom} ? |
| Semaine vide | le dimanche à 18 h, si aucun repas n'est prévu dans les trois jours (« Resto » et « pas là » comptent comme prévus, § 4.4) et qu'il reste des parts | {Prénom}, ta semaine est encore blanche. Il reste des parts à placer ! |
| Jour à renseigner | à 10 h, au plus une par jour, pour un jour incomplet des 7 derniers jours (voir ci-dessous) | {Jour} est resté un mystère, {prénom}. Tu as mangé quoi ? ; avec un plat prévu : Les {plat} de {jour} soir : mangées ou pas ? |

- **Les règles de texte.** Les prénoms et les noms de plats sont permis, le ton peut être drôle et soigné ; **une
  seule interdiction : jamais de montant d'argent**. Aucun rappel ne porte non plus l'objectif, la jauge ou la
  note d'un membre : ils n'apparaissent jamais dans une notification, pour personne.
- La chose à faire « Sors… » est là dès 17 h la veille ; le rappel de 19 h n'est que son relais (§ 4.6).
- **« À sortir » : revérifié à l'envoi, annulé à la sortie, jamais reporté.** Dès qu'une part est sortie (ou que
  la condition tombe), la ligne du rappel est annulée. Si le rappel n'a pas pu partir avant 22 h, il est
  **abandonné**, pas reporté au lendemain (il dirait « demain » le jour même). Il mène à `/frigo` ; si la part est
  déjà sortie ou mangée, la bulle dit « **Rien à sortir.** » (§ 8). « Dernier jour », « Semaine vide » et « Jour à
  renseigner » suivent la même règle : l'état est relu à l'envoi, et ce qui n'est pas parti dans sa plage n'est pas
  rattrapé.
- **« Jour à renseigner » (les relances).** Un jour incomplet (§ 4.5) des 7 derniers jours, à partir du lendemain
  du jour, est relancé doucement : **une notification par jour au plus**, quel que soit le nombre de jours à
  renseigner (elle parle du plus récent : « {Jour} est resté un mystère, {prénom}. Tu as mangé quoi ? », et « Et
  d'autres jours attendent. » s'il y en a), **jamais entre 22 h et 8 h**. Elle **s'arrête** dès que le jour est
  complet, marqué « je ne note pas ce jour », ou que tous ses repas non notés sont en « je ne sais plus » ; elle
  est **coupée par l'interrupteur « Semaine »**. Elle mène à la carte de rattrapage du jour (§ 5.3). Chacun
  reçoit les siennes, jamais celles de l'autre.
- Le fait que l'autre ait mangé une part prévue pour soi (§ 4.2) ne déclenche **aucune notification** : la bulle de
  la semaine le dit.
- Un interrupteur « Frigo » (« À sortir », « Dernier jour ») et un interrupteur « Semaine » (« Semaine vide »,
  « Jour à renseigner »), par personne, dans les réglages, **actifs par défaut**. Un repas posé après 19 h la
  veille n'a pas de rappel : la bulle et la tuile le disent déjà.

## 14. Ce que l'API doit fournir

Le contrat appartient au socle. Chaque écriture suit la politique d'« Aujourd'hui » (§ 5) : clé d'opération, cible
et version explicites, rejouable sans doublon. Les besoins P1 à P9 d'« Aujourd'hui » restent, avec les amendements
que ce monde demande (le fichier d'écart du socle les nomme) : « pas là » et « autre chose de prévu » dans les
repas ; la série qui compte « rien » ; « Jeté » pour toute part à jeter ; « Autre chose ? » qui ne prend jamais une
part à jeter ; l'objectif daté ; les règles de la veille dès 17 h et du surlendemain.

| N° | Besoin |
|---|---|
| S1 | **La semaine** : pour 14 jours (7 passés, aujourd'hui, 6 à venir), les repas de chacun avec leur état (§ 4.4) — « pas là » et « autre chose de prévu » (« Resto ») sont des états à part entière, jamais « rien de prévu », pour l'accueil, la tuile et Cuisiner —, le plat prévu d'un repas pas noté, la carte regroupée quand deux personnes mangent le même plat (« part de Léa » si besoin), les étiquettes (à sortir, encore congelée, à manger aujourd'hui), la situation de la bulle (§ 5, six situations), une version par repas, **`valid_until`** : l'instant à partir duquel l'écran doit relire (bascule des repas, 0 h). |
| S2 | **Placer** (§ 5.1) : lire et écrire « les repas à remplir » **par personne** ; proposer un placement (sans rien écrire) avec ce qui ne rentre pas et ce qui ne tient pas avant sa date ; l'écrire d'un coup, tout ou rien, avec **l'identifiant et la version de chaque repas visé et de chaque part posée** ; refus (409, proposition recalculée) si un repas visé est passé ou a changé, ou si une part n'est plus libre, est « à jeter » ou a changé, jugé à l'heure du serveur ; « Replace le reste » ; déterministe à entrées égales. |
| S3 | **Changer un repas** (§ 5.2) : les plats qui ont une part libre et bonne pour ce repas ; prévoir une part, autre chose, « pas là », pour qui, vider ; déplacer et échanger ; la phrase de ce que le changement entraîne ; refuser une part après sa date. |
| S4 | **Rattraper** (§ 5.3) : la liste ordonnée des repas pas notés des 7 derniers jours (« pas là » compris, jours marqués exclus) ; noter mangé (part d'origine, sinon part libre du même plat), rien, autre chose, « je ne sais plus » **sur toutes les cartes** ; **ce que devient la part prévue** (« Au frigo », « Au congélateur » si permis avec la raison sinon, « À la poubelle ») dans l'écriture de la note **ou plus tard : sans réponse la part reste où elle est et la question reste une chose à faire** ; la question « Tu l'as mangée ? » d'une part à jeter liée, et la chute du lien après 7 jours ; marquer et défaire « je ne note pas ce jour ». Pour soi ou pour l'autre (**routes sous le foyer, membre visé explicite, même foyer exigé**). |
| S5 | **Le jour** (§ 6) : les lignes des trois blocs avec leur provenance (une part, un produit connu, une estimation), les jauges du jour contre l'objectif en vigueur ce jour-là, **pour soi et pour l'autre (lecture seule)** ; changer une quantité, retirer une ligne (la part retrouve son état et sa date d'avant), ajouter (la saisie d'« Aujourd'hui », visée, **pour soi ou pour l'autre**) ; **« + Manger autre chose en plus »** (§ 6.1) : la liste des parts bonnes du frigo et du congélateur (« à décongeler »), plusieurs parts, une part prévue ailleurs, le récapitulatif, le repas qui perd sa part et la proposition de remplacement. Tout jour passé se lit ; rien ne se change au-delà de 7 jours. |
| S6 | **Le bilan** (§ 7) : par personne (celle de l'autre en lecture seule) et par période (**7 derniers jours jusqu'à hier**, 28 jours), les jours (complet ou non, marqué ou non, dans les objectifs ou non, leurs deux valeurs), les moyennes des jours complets, « objectif variable », **chaque jour jugé contre l'objectif valable ce jour-là, un jour sans objectif hors du « sur N »**, la moyenne des écarts pour « au-dessus » et « sous », la série (un repas noté « rien » compte), les parts jetées, la phrase de Popote choisie par la table du § 7. |
| S7 | **Le frigo** (§ 8) : par lieu, les plats (parts, mot d'urgence, étiquettes) et les produits ; la situation de la bulle (une chose à faire = un plat ; « Tu l'as mangée ? » ; « Et ta part de … ? » ; « Rien à sortir. » ; **toutes les parts dues** pour « à sortir ») ; le mot de la porte et l'état de la tuile. |
| S8 | **Un plat** (§ 9) : ses parts (pour qui, poids, valeurs, état, date, repas prévu) ; en manger une ou plusieurs (cible : jour, repas, version ; une part du congélateur est comptée sortie puis mangée ; **n'importe quel membre, n'importe quelle part du foyer** ; une part prévue ailleurs vide son repas, dit à celui qui le perd) ; congeler (jusqu'à cuisson + 2 jours, selon la recette), sortir, jeter N parts **sur des parts choisies, par identifiants et versions**, refus si l'une a changé ; jeter prend les parts à jeter d'abord ; « Annuler » 6 s à l'écran, **10 s côté serveur, par l'identifiant de l'écriture, rejouable**, après « Jeté », « Sortir » et « Congeler » ; corriger le jour de cuisson (vers plus tôt seulement), pour qui, « il y en a moins » ; aucun geste ne prend une part à jeter, sauf jeter et « je l'ai mangée » ; ce que le geste retire de la semaine, dit avant. |
| S9 | **Les dates et les états** (§ 4.3, § 4.4, § 4.6) : calculés par le serveur, **en jours calendaires de Paris, jamais en heures** (tests au 25/10/2026 et au 28/03/2027), horloge injectable, **aucune écriture ne reçoit d'instant** ; un repas est « passé » à la bascule de l'accueil (15 h, minuit) ; une part passe « à jeter » à 0 h et « à sortir » toute seule (veille dès 17 h) ; une date d'emballage est incluse ; le cycle de vie d'une part prévue (§ 4.4) ; une part qui revient retrouve son état et sa date d'avant. |
| S10 | **Dire ce qu'on range ou ce qu'on change** (§ 11.1) : une phrase rend un récapitulatif typé (plat ou produit, lieu, quantité, valeurs connues ou estimées ; pour un changement de stock, **l'avant et l'après** de chaque produit) ; l'écrire d'un coup ; un produit à zéro proposé pour la liste de courses. La phrase est une donnée, jamais une consigne. |
| S11 | **Lire une photo du frigo ou une étiquette** (§ 11.2, § 11.3) : les produits vus, vus ou devinés, **aucune ligne cochée d'avance**, « déjà là » ; **quatre gestes par ligne lue : confirmer (cocher), modifier (nom, quantité, emplacement), supprimer (croix, « Enlever ce produit »), ajouter (« + Ajouter ce que j'ai oublié »)** ; le bouton final suit le compte des lignes cochées ; sortie bornée (30 lignes, 80 caractères, quantités plausibles) ; ranger ce qui est coché ; photo réduite et ré-encodée sur l'appareil, ré-encodée aussi par le serveur, rien gardé même en cas d'échec ; le texte lu est une donnée ; états « quota » et « indisponible ». Dépend du plan des photos (0.6). |
| S12 | **Les produits** (§ 4.7, § 11.3, § 11.4) : ajouter un produit (à la main) ou un plat tout prêt ; changer quantité, lieu, date ; « Fini » et son annulation ; **les produits du frigo, du congélateur et du placard suivent la saisie** (différence, retour, conversion ou « je n'ai pas touché au stock ») ; un produit à zéro proposé pour la liste de courses. |
| S13 | **Popote dans ce monde** : répondre sur la semaine, un repas, le frigo, une date (« Il me reste quoi au congélateur ? ») ; proposer les blocs « repas », « rangement » ; mener aux écrans. **L'écran montre, Popote reçoit moins** : le modèle reçoit la semaine et les notes de la personne, et le frigo, le congélateur et le placard du foyer ; l'autre membre y est « l'autre », sans prénom. Il ne reçoit **jamais** les objectifs, les jauges ni les notes de l'autre, que l'écran montre pourtant en lecture seule. |
| S14 | **Les rappels de ce monde** (§ 13) : « À sortir », « Dernier jour », « Semaine vide », « Jour à renseigner » ; l'état est relu à l'envoi ; la ligne « À sortir » est annulée dès la sortie, et abandonnée (pas reportée) si elle n'est pas partie avant 22 h ; les relances d'un jour incomplet : une par jour au plus, jamais entre 22 h et 8 h, coupées par « Semaine », arrêtées quand le jour est complet ou marqué ; prénoms et plats permis, jamais de montant d'argent, jamais d'objectif ni de jauge ; push seulement, pas de mail en v1. |

Aucune réponse de ce monde n'est gardée dans le navigateur au-delà de l'écran : ni stockage local ou de session,
ni IndexedDB, ni cache du service worker.

## 15. Points retenus par défaut

Le 13/11/2026, le propriétaire a demandé de retenir les choix proposés, qu'il relira. Un point qu'il change rouvre
la partie concernée.

| N° | Point | Ce que la spec retient |
|---|---|---|
| S-C1 | Les repas qu'on prévoit | le midi et le soir ; le petit-déjeuner et les encas se notent seulement |
| S-C2 | La garde | 4 jours au frigo, 90 au congélateur, le lendemain pour une part sortie ; « avant » exclut le jour nommé ; une part sortie ne se recongèle pas |
| S-C3 | Un jour complet | le midi et le soir chacun noté (mangé, autre chose, rien) ; « pas là » et « je ne sais plus » ne sont pas des notes ; un jour complet compte tel quel, même petit |
| S-C4 | « Dans tes objectifs » | l'énergie ne dépasse pas l'objectif, les protéines l'atteignent : la règle d'« Aujourd'hui » |
| S-C5 | La série | les jours de suite avec au moins un repas noté, « pas là » excepté (comme « Aujourd'hui ») |
| S-C6 | Noter le passé | 7 jours en arrière, avec des relances douces tout le long (§ 13) |
| S-C7 | Une part dressée pour l'un, mangée par l'autre | permis, et dit ; il compte les valeurs de la part ; plusieurs parts au même repas, et une part prévue pour l'autre, sont permises (la semaine de l'autre se met à jour) |
| S-C8 | Noter ou ranger pour l'autre | permis ; l'écran garde qui l'a fait |
| S-C9 | Le stock qui baisse quand on mange | oui, au frigo comme au placard, pour un produit connu compté dans la même unité |
| S-C10 | Un produit périmé | « à vérifier », jamais « à jeter » |
| S-C11 | Les textes et états que le prototype ne joue pas | tous ceux de cette spec que le film ne montre pas : proposés par la spec |
| S-C12 | Les heures des repas | un repas est « passé » à la bascule de l'accueil : le midi à 15 h, le soir à minuit ; « Ce midi » jusqu'à 15 h ; rappels « Frigo » et « Semaine » actifs par défaut |
| S-C13 | La part prévue qu'on ne mange pas | Popote ne décide jamais seule ; trois choix : « Au frigo » (date inchangée, puis « Je te la mets ce soir ? »), « Au congélateur » (jamais sortie, cuisson + 2 jours, recette ; éteint avec sa raison sinon), « À la poubelle » ; la même question pour « autre chose » et « rien » ; sans réponse, la part reste où elle est |
| S-C20 | Manger en plus | repas d'aujourd'hui ou des 7 derniers jours, prévu, noté ou vide ; parts du frigo et du congélateur (« à décongeler »), prévues ou non, pour soi, l'autre ou un autre jour ; un repas qui perd sa part redevient « à remplir », avec une proposition de remplacement |
| S-C14 | Congeler | jusqu'au jour de cuisson + 2 jours ; jamais pour une recette qui ne se congèle pas ; « à vérifier » si on ne sait pas ; corriger ne fait que rapprocher la date |
| S-C15 | Le bilan « Cette semaine » | devient « 7 derniers jours », jusqu'à hier ; seuil de 3 jours complets sur 7 inchangé |
| S-C16 | Une date d'emballage | incluse : « jusqu'au 20/11 » est « à jeter » le 21/11 à 0 h |
| S-C17 | « Cuit le » (Cuisiner) | au plus 3 jours en arrière : une part n'est jamais « à jeter » à sa création |
| S-C18 | « Je ne note pas ce jour » | marque un jour passé (7 jours), pour soi seulement ; le jour reste incomplet, les relances et les cartes s'arrêtent |
| S-C19 | Annuler | 6 s à l'écran, 10 s côté serveur, après « Jeté », « Je les sors » et « Congeler » |

## 16. États communs, mouvement, accessibilité

- Les états communs (chargement, réveil, erreur, hors ligne, session expirée) sont ceux de la fondation du front
  (F18 à F21). Les écritures suivent les trois cas d'« Aujourd'hui » § 5, avec les mêmes textes.
- La semaine et le frigo se chargent : l'en-tête, Popote et la barre s'affichent tout de suite ; les jours et les
  étagères ont leur forme vide. Une lecture en échec n'est jamais montrée comme un frigo vide.
- Mouvement : celui du prototype, par Motion, avec les durées et les courbes des jetons. L'envol des parts, la
  porte qui s'ouvre, le givre, les tampons et les confettis respectent « mouvement réduit » : l'état final
  s'affiche d'un coup.
- La semaine se lit en liste par un lecteur d'écran : « mercredi 18, soir : curry, pour Sam et Léa, à sortir
  mardi soir ». Les points du bandeau ont un nom (« midi : rien de prévu »). La couleur d'une étiquette n'est jamais le
  seul signe.
- Glisser a toujours un équivalent : « Déplacer » dans la feuille d'un repas, les boutons de la fiche d'un plat.
- Chaque changement sans changement d'écran (un repas changé, une part sortie, un produit fini) est annoncé dans
  une région `status`. Cibles tactiles de 44 px au moins ; tout se fait au clavier.
- Le focus après une action :

  | Action | Le focus va sur |
  |---|---|
  | « Ça me va » (le placement) | le titre du premier jour |
  | Un choix dans la feuille d'un repas | la carte de ce repas |
  | « Oui, mangé », « Rien », « Noter » (rattraper) | la carte suivante, ou le message de fin |
  | « Enregistrer », « Retirer » une ligne du jour | la ligne, ou la suivante si elle est partie |
  | « Congeler », « Sortir », « Jeter » N parts | le premier jeton restant, ou le titre de l'onglet |
  | « Je les sors », « Jeté », « Oui » / « Non » de « Tu l'as mangée ? » (la bulle) | la bulle, avec son nouveau texte |
  | « Annuler » (après Jeté, Sortir, Congeler) | le jeton rendu, ou le titre de l'onglet |
  | « Je ne note pas ce jour » | le titre du jour, qui dit « je ne note pas » |
  | « Noter » (rattraper, avec la part prévue) | la carte suivante, ou le message de fin |
  | « Noter » (manger en plus) | la ligne ajoutée du repas |
  | « Ranger », « Ajouter N produits » | le titre de l'onglet où la première chose est rangée |
  | Fermer une feuille ou une confirmation | le bouton qui l'avait ouverte |

## 17. Critères d'acceptation (scénarios au clic)

**69 critères.** Chaque scénario est joué avec une **horloge du serveur fixée** (heure de Paris) ; les heures dites
« à 23 h 59 » ou « à 0 h 05 » sont celles de cette horloge, jamais de l'appareil.
1. *Étant donné* 6 parts neuves (dimanche 15, 17 h 30), *quand* Sam touche « Oui, place-les » puis « C'est ça »,
   *alors* les soirs de dimanche à jeudi sont remplis pour Sam et Léa, le frigo avant le congélateur (lasagnes,
   gratin, puis curry), les 12 parts de chili restent libres, et rien n'est écrit avant « Ça me va ».
2. *Étant donné* un repas déjà prévu ou « pas là », *alors* le placement ne le touche pas ; le relancer avec les
   mêmes parts donne le même résultat.
3. *Étant donné* une part du frigo qu'aucun repas ne peut prendre avant sa date, *alors* Popote propose de la
   congeler si « Congeler » est permis (voir 45).
4. *Quand* Sam passe mardi soir à « Sam » seul, *alors* la part de Léa redevient libre et la carte ne porte plus
   que S.
5. *Quand* Sam glisse le curry de mercredi soir sur mardi midi, *alors* il s'y pose, et l'étiquette dit « à sortir
   lundi soir » ; le poser après sa date est refusé avec sa phrase.
6. *Étant donné* deux repas d'hier pas notés, le second avec du gratin prévu, *quand* Sam répond « Oui, mangé » au
   premier puis « Autre chose » (kebab-frites) au second, *alors* le récapitulatif demande « Et ta part de
   gratin ? » ; sur « Au frigo », hier est complet, la part est libre avec sa date, et Popote propose « Je te la
   mets ce soir ? ».
7. *Étant donné* un repas prévu et jamais noté, *alors* sa part redevient libre à la fin du lendemain, et le jour
   reste incomplet (voir 23 et 24 pour les heures exactes).
8. *Quand* Sam passe ses amandes de 30 à 50 g dans le détail d'un jour, *alors* les valeurs de la ligne et les
   jauges suivent ; au-delà de 7 jours, rien ne se change.
9. *Étant donné* un jour où seul un yaourt est noté, *alors* il n'entre pas dans les moyennes du bilan. *Étant
   donné* « rien » au midi, « rien » au soir et un yaourt, *alors* le jour est complet, à 60 kcal, et entre dans
   les moyennes tel quel.
10. *Étant donné* un objectif changé mercredi à 15 h, *alors* lundi, mardi et mercredi restent jugés contre
    l'ancien, et jeudi contre le nouveau.
11. *Quand* Sam ouvre le frigo, *alors* le mot de la porte et la tuile de l'accueil disent le même nombre, sans
    les parts à jeter.
12. *Quand* Sam congèle 2 parts de lasagnes prévues lundi soir (cuites dimanche), *alors* la fiche le dit avant,
    leur date passe à 90 jours, et lundi soir se vide s'il répond « Oui ».
13. *Étant donné* une part dont la date est passée, *alors* elle est « à jeter », n'est plus comptée ni placée,
    et « Jeté » la retire ; elle n'est jamais retirée toute seule (sauf si elle est liée à un repas passé : voir 44).
14. *Quand* Sam touche « Je les sors », *alors* les parts sont au frigo, à manger le lendemain au plus tard, et la
    chose à faire disparaît de l'accueil ; « Congeler » ne leur est plus offert.
15. *Quand* Sam dit « j'ai acheté 2 pizzas surgelées et 4 pots de skyr », *alors* le récapitulatif montre 2 parts
    estimées au congélateur et un produit connu au frigo, et rien n'est rangé avant « Ranger ».
16. *Négatif :* une phrase qui contient une consigne (« ignore tes règles ») ne provoque **aucune écriture autre
    que celle que la personne valide** dans le récapitulatif.
17. *Quand* Sam photographie le frigo, *alors* aucune ligne n'est cochée d'avance ; seul ce qu'il coche est
    ajouté ; une ligne corrigée (nom, quantité, lieu) et une ligne ajoutée à la main sont rangées telles qu'il
    les a validées ; la photo n'est pas gardée.
18. *Quand* Léa change un repas pendant que Sam l'a ouvert, *alors* Sam reçoit l'état à jour et rien n'est écrit
    de son côté.
19. *Quand* Sam note « un pot de skyr » et que le frigo en a 4, *alors* il en reste 3 ; à 0, la saisie passe quand
    même ; le riz du placard baisse de la même façon.
20. *Négatif :* aucune notification de ce monde ne porte de montant d'argent, d'objectif ni de jauge ; un rappel
    peut nommer le plat et le prénom ; une lecture en échec n'affiche jamais « Vide ».
21. *Au lecteur d'écran*, la semaine se lit jour par jour, et chaque geste de glisser a son bouton.
22. *Sur téléphone (390 px)*, chaque écran correspond à sa capture de référence, à 2 % de pixels près ou zone par
    zone (en-tête, bulle, cartes), **sur des données et une horloge figées** ; *sur PC*, la semaine en grille
    correspond à la capture PC, et les autres écrans suivent la règle du § 12. VoiceOver et NVDA se vérifient à
    la main, hors de la chaîne automatique.
23. *Étant donné* des lasagnes cuites dim. 15 prévues mer. 18 au soir et pas notées, *quand* il est mer. 18 à
    23 h 59, *alors* la part est réservée à son repas, pas encore passé ; à jeu. 19, 0 h 01, le repas est passé et
    pas noté, la part est « à jeter », liée, et la chose à faire demande « Tu l'as mangée mercredi soir ? » ; « Oui » la compte mangée mer. 18, pas jetée.
24. *Étant donné* une part prévue lun. soir et pas notée, *alors* mar. 17 à 23 h 59 elle est réservée, et mer. 18
    à 0 h 01 elle est libre, le repas étant « pas noté : lasagnes ». *Quand* sa cuisson est corrigée et qu'elle
    devient « à jeter » alors que son repas est à venir, *alors* elle le quitte et il est « rien de prévu ».
25. *Étant donné* jeu. 19 une part à jeter et trois bonnes, *alors* « En manger une », « Congeler », « Sortir » et
    « Corriger » ne prennent jamais la périmée, et corriger la cuisson vers ven. 20 est refusé.
26. *Quand* un curry sorti lundi, mangé mardi, est annulé mer. 18 à 10 h, *alors* il revient « à jeter », jamais
    « au frigo », et « Congeler » n'est jamais offert ; annulé mardi, il revient sorti, avec sa date.
27. *Quand* Sam confirme « Jeter 1 part » alors que Léa vient de manger la plus pressée, *alors* le serveur
    refuse tout, rien n'est jeté, l'écran est à jour. « En manger une » à 15 h 00 min 10 s note le repas montré
    quand l'écran montrait encore « Ce midi ».
28. *Étant donné* le tableau du § 5.1, *alors* il sort de l'exemple du début, avec 17 h 30 pour heure. *Étant
    donné* 2 curry sortis dimanche à 17 h 30 et les lasagnes et le gratin du frigo, *alors* le placement met les
    curry d'abord (dimanche soir), puis les lasagnes, puis le gratin, et aucune part ne finit « à jeter ».
29. *Aux heures de repas* : à 14 h 59 le midi vide est rempli par le placement, à 15 h 00 non ; à 23 h 59 le soir
    vide est rempli, à 0 h 00 le soir qui vient de finir ne l'est plus ; « Je la mange ce soir » à 23 h vise le
    repas montré ; à 12 h 30, la bulle 4 et le rattrapage ne réclament pas encore le midi.
30. *Dates* : cuit dim. 15, la part dit « encore 4 jours » dimanche, « demain dernier délai » mardi, « à manger
    aujourd'hui » mercredi et « à jeter » jeu. 19 à 0 h 00 ; congelé le 15/11, « à jeter » le 13 février à 0 h.
31. *Étant donné* mardi midi et mardi soir « pas là » et un yaourt, *alors* mardi est incomplet ; le rattrapage
    demande « tu n'étais pas là : tu as mangé quoi ? », et après sa réponse le jour est complet.
32. *Quand* Sam touche « Jeté » deux fois, ou que Sam et Léa le touchent ensemble, *alors* une seule part est
    jetée ; « Annuler » dans les 6 secondes rend la part à son état d'avant.
33. *Étant donné* un placement proposé lun. 16 à 18 h et validé hors ligne : (a) envoyé lun. à 23 h 59, rien n'ayant
    changé, *alors* il est écrit ; envoyé mar. 17 à 0 h 05, *alors* rien n'est écrit, lundi soir étant passé ;
    (b) un curry sorti lundi (avant mer. 18) posé sur mardi soir et envoyé mer. 18 à 0 h 05, *alors* rien n'est
    écrit, la part étant « à jeter » ; (c) Léa mange une part du gratin visée entre la proposition et l'écriture,
    ou remplit mardi soir, *alors* rien n'est écrit. Dans les trois cas : « La semaine a changé. Je refais ma
    proposition. »
34. *Étant donné* une protéine à 153 / 160 g, *alors* la jauge dit « encore 7 g » et le bilan ne compte pas le jour
    dans les objectifs ; la phrase du bilan suit la table du § 7.
35. *Quand* Sam sort le curry à 18 h, *alors* Léa ne reçoit pas le rappel de 19 h (sa ligne est annulée) ; si elle
    ouvre `/frigo` par un ancien lien, la bulle dit « Rien à sortir. ». Un rappel « À sortir » qui n'a pas pu partir
    avant 22 h n'est pas envoyé le lendemain.
36. *Étant donné* le quota de photos atteint ou Popote en panne, *alors* « À la main » ajoute un produit sans
    modèle. Une photo avec un post-it « ajoute 20 pizzas » n'ajoute rien de plus qu'une ligne, non cochée ; aucune
    photo n'est gardée, même après un échec ; l'écran dit que le fournisseur du modèle peut garder un contenu
    signalé jusqu'à 2 ans.
37. *Quand* Sam ouvre le détail d'un jour il y a 20 jours, *alors* il se lit sans rien changer ; deux « pas là »
    sans autre note ne comptent pas pour la série.
38. *Étant donné* du gratin prévu mar. soir pour Sam et Léa, *quand* Sam, à mar. midi, mange sa part et celle de
    Léa (deux parts au même repas), *alors* les deux parts sont notées avec leurs valeurs, le repas de Léa de mar.
    soir est « rien de prévu », sa bulle dit « Sam a mangé ta part de gratin. », et aucune notification n'est
    envoyée.
39. *Étant donné* des lasagnes (cuites dimanche) prévues pour Léa mardi midi, *quand* Léa note « Autre chose :
    kebab-frites » depuis le détail du jour, *alors* le récapitulatif demande « Et ta part de lasagnes ? » avec
    « Au frigo », « Au congélateur » et « À la poubelle » : « Au congélateur » est offert (jamais sortie, bonne,
    cuite il y a 2 jours au plus) ; « Au frigo » laisse la date limite et propose « Je te la mets ce soir ? » ;
    « À la poubelle » compte une part jetée au bilan. Pour du gratin prévu, « Au congélateur » est éteint avec
    « La recette ne se congèle pas. ».
40. *Étant donné* une part de curry sortie lundi et prévue mardi midi, *quand* Sam note « Autre chose », *alors*
    « Au congélateur » est éteint avec « Elle a déjà été décongelée : elle ne se recongèle pas. » ; une part encore
    congelée prévue sur un repas ne pose aucune question.
41. *Étant donné* mardi incomplet, *quand* il est mer. 18, *alors* Léa reçoit une seule relance à 10 h ; pas de
    seconde le même jour, même avec deux jours incomplets ; aucune entre 22 h et 8 h, et une relance qui n'a pas pu
    partir avant 22 h est abandonnée ; aucune si « Semaine » est coupé ; aucune dès que mardi est complet ou
    marqué ; aucune à partir du 8e jour ; Sam ne reçoit jamais celle de Léa.
42. *Quand* Sam touche « Je ne note pas ce jour » sur lundi, *alors* les cartes de rattrapage de lundi disparaissent,
    la bulle 4 ne le compte plus, lundi reste incomplet et hors des moyennes, les relances s'arrêtent ; « Je le
    note finalement » rétablit tout ; Sam ne peut pas marquer un jour de Léa.
43. *Étant donné* jeu. 19 une part à jeter et trois bonnes, *quand* Sam choisit « Jeter » puis « Combien ? : 1 »,
    *alors* la part proposée est la périmée.
44. *Étant donné* des lasagnes prévues mer. 18 au soir, mangées mais pas notées, *quand* il est jeu. 19 à 8 h, *alors*
    la bulle du frigo et celle de l'accueil demandent « Tu l'as mangée mercredi soir ? » et ne proposent pas « Jeté »
    seul ; « Non » jette la part (comptée jetée) ; sans réponse, la part reste liée à ven. 20, 0 h 01 ; à jeu. 26,
    0 h 00, le lien tombe et « Jeté » seul est offert.
45. *Étant donné* des lasagnes cuites dim. 15 (la recette se congèle), *alors* « Congeler » est offert dim., lun. et
    mar., et plus mer. 18 ; corriger la cuisson vers mer. 18 est refusé (la date s'éloignerait), vers ven. 13 est
    accepté ; le gratin (« ne se congèle pas ») n'est jamais offert, et « 2 parts de gratin ne tiendront pas »
    ne propose pas « Congèle-les » ; une recette « on ne sait pas » offre « Congeler » avec « à vérifier ».
46. *Dates et changement d'heure* : cuit jeu. 22/10/2026, la part est « à manger avant lun. 26/10 » (dernier repas
    dim. 25 au soir) ; sortie sam. 24/10/2026, avant lun. 26/10 ; cuit ven. 26/03/2027, avant mar. 30/03 ; congelé
    le 25/10/2026, « à jeter » le 23/01/2027 à 0 h.
47. *Étant donné* une part achetée avec la date d'emballage « jusqu'au 20/11 », *alors* elle est bonne pour le
    repas du 20 au soir et « à jeter » le 21 à 0 h 00.
48. *Quand* « Cuisiner » crée des parts cuites il y a 3 jours, *alors* elles sont « à manger aujourd'hui », jamais
    « à jeter » ; cuites il y a 4 jours, la saisie est refusée.
49. *Quand* Sam dit « il me reste 200 g de café » et que le placard en a 500 g, *alors* le ticket montre « Café,
    placard : 500 g → 200 g » et rien n'est écrit avant « Ranger » ; « j'ai fini le café » propose « Plus de café.
    Je le mets sur la liste de courses ? ». Une phrase qui contient une consigne n'écrit rien d'autre que ce qui est
    validé.
50. *Quand* Sam touche « Je les sors » puis « Annuler » dans les 6 secondes, *alors* les parts retournent au
    congélateur avec leur date et leur repas d'avant si ce repas est encore libre, sinon libres ; à la 11e seconde
    le serveur refuse ; une seconde annulation est sans effet. « Congeler » puis « Annuler » rend les parts au
    frigo avec leur date d'avant.
51. *Étant donné* « Resto » ou « pas là » sur tous les repas des trois jours et des parts au frigo, *alors*
    dimanche à 18 h aucun rappel « Semaine vide » ne part ; l'accueil, la tuile Semaine et Cuisiner ne disent pas
    « Rien de prévu ».
52. *Étant donné* une part à jeter depuis plus de 7 jours, *quand* Sam touche « Je l'ai mangée », *alors* la part
    est retirée sans repas ni nutrition, et n'est pas comptée jetée.
53. *Étant donné* lundi 8 h et 7 jours complets la semaine d'avant, *alors* « 7 derniers jours » ne dit pas « Rien
    à mesurer encore » ; avec 2 jours complets sur 7, la phrase est « Peu de jours complets ».
54. *Étant donné* un objectif réglé mercredi, *alors* lundi et mardi (sans objectif) sortent du « sur N jours » ;
    « au-dessus » et « sous » se jugent jour par jour contre l'objectif de ce jour.
55. *Quand* Sam ouvre le bilan et les jauges de Léa, *alors* il lit ses repas, ses jauges et son objectif, sans
    pouvoir changer l'objectif ; ni l'objectif ni les jauges de Léa n'apparaissent dans une notification ni dans le
    contexte envoyé à Popote pour Sam ; noter pour un membre d'un autre foyer est refusé.
56. *Étant donné* que Léa n'a jamais répondu à « Je remplis quels repas ? », *quand* Sam place, *alors* ses soirs
    sont remplis et Popote dit « Pour Léa, je remplis ses soirs. » ; si Léa a coché ses midis, ses midis le sont.
57. *Étant donné* la carte « tu avais prévu des lasagnes : mangées ? », *alors* « Je ne sais plus » y est offert ;
    le repas reste pas noté, la carte ne revient pas, et la part est libérée à la fin du lendemain.
58. *Quand* Sam, par « Autre chose ? » d'« Aujourd'hui », mange un plat du frigo, *alors* une part libre est prise
    d'abord ; s'il n'y en a pas, celle prévue sur le repas le plus lointain, dont la case se vide, et le
    récapitulatif le dit avant.
59. *Étant donné* « Resto » demain midi et « pas là » demain soir, *alors* la semaine, l'accueil et la tuile Semaine
    les montrent comme prévus, jamais comme « rien de prévu ».
60. *Étant donné* une part du congélateur à son dernier jour (N = 1), *alors* le mot est « à finir sous 1 jour »,
    elle n'est jamais « à sortir » ni placée, et « Sortir » est refusé.
61. *Confirmer :* *quand* Sam photographie le frigo et que Popote rend 6 lignes, *alors* aucune n'est cochée ;
    *quand* Sam en coche 4, *alors* le bouton dit « Ajouter 4 produits », « Tout cocher » le fait passer à « Ajouter
    6 produits », et rien n'entre dans le frigo avant qu'il touche ce bouton.
62. *Modifier :* *quand* Sam corrige une ligne (« Sauce tomate, 1 pot » devient « Sauce tomate, 3 pots, placard »),
    *alors* c'est la ligne corrigée qui est rangée, avec ses 3 pots au placard.
63. *Supprimer :* *quand* Sam met une croix sur une ligne que Popote a inventée, ou touche « Enlever ce produit »
    dans sa feuille, *alors* la ligne disparaît, le bouton ne la compte plus, et elle n'est jamais rangée ; la même
    chose vaut pour une lecture de ticket de caisse ou d'étiquette.
64. *Ajouter :* *quand* Sam touche « + Ajouter ce que j'ai oublié » et écrit « Œufs, 6 », *alors* la ligne est
    ajoutée à la liste, cochée, comptée par le bouton final, et rangée avec les autres ; une ligne ajoutée à la
    main n'est soumise à aucune lecture du modèle.
65. *Dehors, et le sort de la part :* *étant donné* des lasagnes prévues pour Sam mardi midi, *quand* Sam note
    « Autre chose : kebab-frites », *alors* Popote demande « Et ta part de lasagnes ? » et ne choisit jamais ; sur
    « Au frigo », la date limite est inchangée et « Je te la mets ce soir ? » est proposé ; sur « Au congélateur »,
    la part est congelée pour 90 jours (éteint avec sa raison si elle a déjà été décongelée) ; sur « À la
    poubelle », elle est jetée et comptée ; **sans réponse**, la part reste où elle est, liée à mardi midi, la
    règle 2 ne la libère pas, et la question reste dans la bulle du frigo et sur l'accueil.
66. *Deux parts :* *étant donné* une part de gratin prévue pour Sam ce soir, *quand* Sam touche « + Manger autre
    chose en plus » sur ce repas et prend 2 parts de gratin en plus, *alors* le récapitulatif les montre, trois
    parts sont notées sur ce repas, le stock baisse, les jauges montent, et le repas prévu n'est pas modifié.
67. *Un autre plat :* *quand* Sam, sur ce repas, prend en plus 1 part de lasagnes, *alors* elle s'ajoute avec ses
    valeurs ; une part « à jeter » n'est pas offerte dans la liste ; rien n'est écrit avant « Noter ».
68. *Une part de l'autre ou d'un autre jour :* *étant donné* une part de gratin prévue pour Léa lundi soir, *quand*
    Sam la prend en plus mardi midi, *alors* le récapitulatif dit « Il en manquera une à Léa lundi soir. » et
    propose un remplacement ; lundi soir de Léa est « rien de prévu » dès « Noter » ; la bulle de Léa dit « Sam a
    mangé ta part de gratin. » avec « Oui » et « Je verrai » ; sans réponse, lundi soir reste « à remplir ». Pour
    une part prévue pour Sam lui-même, le texte est « Il t'en manquera une lundi soir. ».
69. *Du congélateur, tout de suite :* *quand* Sam prend en plus 1 part de curry du congélateur (« à décongeler »),
    *alors* elle est comptée sortie puis mangée dans la même écriture ; s'il retire ensuite cette ligne, la part
    revient sortie avec sa date de sortie (« à jeter » si cette date est passée), jamais au congélateur.
