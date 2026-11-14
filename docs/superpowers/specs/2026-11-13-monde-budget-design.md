# Le monde « Budget » : la spec

Troisième parcours de la nouvelle appli. Il couvre l'argent du foyer : poser le budget, savoir combien chacun verse
sur le compte joint, lire ce compte matin et soir, ranger les opérations, et faire le point à la fin du mois.

- **Style :** le système « Jeu » (`.design/systeme/`). Aucun composant hors de ce système.
- **Prototype de référence :** `.design/budget/prototype.html` (film et moments rejouables) et ses captures dans
  `.design/budget/captures/`. Le prototype fait foi pour le dessin et le mouvement, cette spec fait foi pour les
  textes, les états, les règles de calcul et les données.
- **Côté API :** rien n'existe encore pour ce monde. Le § 15 liste ce que l'écran attend (B1 à B14) ; le contrat et le
  plan technique appartiennent au socle, comme le choix du prestataire de lecture bancaire.
- **Ce qui est repris d'« Aujourd'hui »** (`2026-11-13-parcours-aujourdhui-design.md`), sans être redit : la barre
  « Parle-moi, ou écris », la feuille de Popote et ses blocs typés (§ 6), le mode vocal (§ 7), la politique de
  mutation (§ 5 : en attente, incertain, refusé), la règle « le modèle ne reçoit jamais ce que la personne ne peut
  pas voir » (§ 6).
- **Exemple suivi dans toute la spec :** « Sam » et « Léa » forment le foyer. Sam gagne 2 600 € nets par mois, Léa
  1 400 €. Ils ont un compte joint à la Caisse d'Épargne et huit charges à deux, 1 062,40 € par mois : courses 500,
  restaurants 200, sorties et culture 100, fast-food à emporter 80, copropriété 240 par trimestre (80 par mois),
  électricité 60, internet 30, assurance habitation 12,40. Les personnes et les montants sont inventés ; la banque
  n'est qu'un exemple.

## 1. Décisions du propriétaire (13/11/2026)

| Sujet | Décision |
|---|---|
| Le cœur du Budget | Le foyer paie ses dépenses communes depuis un compte joint, alimenté par les deux. Popote gère tout : elle dit à chacun combien verser sur ce compte, chaque mois. |
| Poser le budget | En discussion avec Popote, **un thème à la fois** : les revenus, puis le logement, les crédits, la voiture, manger, les abonnements, la santé et les loisirs, les enfants et les animaux. Pour chaque thème, les charges habituelles sont proposées ; on les touche ou on les dit. |
| À deux, à moi, à l'autre | Chaque charge est dite « à deux », « à moi » ou « à Léa » (l'autre membre) au moment où elle est posée. Il n'y a pas d'écran à part pour les charges personnelles. |
| Qui voit quoi | Chacun voit tout, les charges de l'autre comprises : « au plus simple ». Aucune confidentialité entre les deux membres du foyer. |
| Les oublis | À la fin, Popote rappelle les charges qu'on oublie souvent, puis récapitule ; la personne valide ou modifie. |
| La banque | À brancher en priorité. Popote lit le compte joint chaque soir, classe les opérations, et la personne valide. |
| Les avances | On dit à Popote « j'ai payé telle charge de mon compte » : elle récapitule, et le prochain virement de cette personne baisse d'autant. |
| Valider à chaque étape | Popote ne note rien sans récapitulatif et sans accord. Partout. |
| Le prototype | Validé le 13/11/2026, déclaration par thème comprise. |

## 2. Hors périmètre

- **Payer, virer, prélever.** Popote lit, elle n'agit jamais sur un compte. Les virements sont faits par les
  personnes, dans l'appli de leur banque.
- L'épargne et les projets : le choix « Un projet » du point de fin de mois mène à la page d'attente « Bientôt ».
- Brancher les comptes personnels : l'écran du choix du compte le montre, décoché ; rien d'autre n'en dépend (§ 17, B-C1).
- L'historique au-delà du mois en cours : seule la liste « Les dernières opérations » existe (PC, § 14).
- Les foyers d'une seule personne : pas de virement à calculer ; le Budget n'a pas de variante propre pour eux.
- Plusieurs comptes joints, plusieurs devises, les revenus variables d'un mois à l'autre.
- La liste des rappels et leur réglage : la spec des notifications. Le § 16 dit seulement ce que le Budget lui demande.

## 3. Carte du monde

| Adresse | Écran | Quand |
|---|---|---|
| `/budget` | L'écran Budget (§ 6) | budget posé |
| `/budget/poser` | La mise en place (§ 5) : revenus, charges, partage, banque | budget pas posé, ou reprise d'une mise en place interrompue |
| `/budget/operations` | Les opérations à ranger (§ 8) | depuis la bulle « Voir » |
| `/budget/point` | Le point du mois (§ 10) | à partir du dernier jour du mois |
| `/budget/reglages` | Les réglages du budget (§ 12) | depuis la roue de l'écran Budget |
| `/budget/banque/retour` | Le retour de la banque (§ 11) | après l'accord donné chez la banque |

- La tuile Budget de l'accueil ouvre `/budget`, qui redirige vers `/budget/poser` tant que le budget n'est pas posé.
- La barre « Parle-moi, ou écris » est sur chaque écran, sauf pendant le passage chez la banque.
- Le jour, le mois et « Lu à » viennent de l'API (B1), jamais de l'heure de l'appareil.

## 4. Les mots et les règles de calcul

Tous les montants sont calculés par l'API ; ces règles disent ce qu'elle rend.

**Charge.** Un libellé, un montant, une périodicité (par mois, par trimestre, par an), un thème, et à qui elle est :
« à deux », ou à l'un des deux membres (« à moi », « à Léa »). Une charge qui ne tombe pas chaque mois porte aussi
le **mois de sa prochaine échéance**.
Son montant par mois est le montant divisé par 1, 3 ou 12, arrondi au centime supérieur.

**Les arrondis.** Tout se calcule en centimes. Un arrondi se fait toujours au profit du compte joint : vers le
haut pour ce qu'on verse, vers le bas pour ce qu'on rend. L'écart ne disparaît pas : il va au coussin.

**Le coussin.** L'argent du compte joint qui n'a pas de destination : les écarts d'arrondi (0,60 € par mois dans
l'exemple : 1 063 € versés pour 1 062,40 €), le reste d'un mois qu'on y laisse (§ 10), un virement versé en trop.
Il est tenu au centime, il est réservé comme le « gardé », et le point du mois le montre (« Dans le coussin :
0,60 € »). Les écarts d'un mois y entrent à la clôture de ce mois.

**Deux natures de charge à deux.**
- *Fixe* : un montant connu qui tombe une fois (électricité, internet, assurance, copropriété).
- *Poste* : une enveloppe qui se dépense au fil du mois (courses, restaurants, sorties, fast-food).
  Popote propose la nature d'après le thème ; elle se change dans les réglages.

**Le total à deux** est la somme des montants par mois des charges à deux : 1 062,40 €.

**Le partage.** Trois règles, au choix du foyer :

| Règle | Calcul | Exemple |
|---|---|---|
| Selon les revenus (proposée) | chacun verse la même part de ce qu'il gagne | Sam 65 %, Léa 35 % : 691 € et 372 € |
| Moitié-moitié | la moitié chacun | 532 € et 532 € |
| Autre | deux pourcentages entiers, qui font 100 | |

Chaque part est arrondie à l'euro supérieur : le compte joint n'est jamais à court (691 + 372 = 1 063 € pour
1 062,40 € ; en moitié-moitié, 1 064 €) ; l'écart va au coussin. Si les deux revenus valent 0, « Selon les
revenus » n'est pas proposée, aucune règle n'est choisie d'avance et « C'est bon » est en pause ; Popote :
« **Moitié-moitié, ou autre ?** Sans revenus, je ne peux rien proposer. »

**Gardé pour plus tard.** Une charge qui ne tombe pas chaque mois est comptée par mois, et la somme s'accumule sur
le compte joint jusqu'à l'échéance : la mensualité, multipliée par le nombre de mois écoulés depuis la dernière
échéance, mois en cours compris, sans jamais dépasser le montant de la charge. Copropriété, 240 € par trimestre,
prochaine échéance en janvier : 80 € gardés en novembre, 160 € en décembre, 240 € en janvier ; quand elle passe, le
gardé retombe à 0. Une charge posée en cours de cycle n'a pas tout son gardé à la première échéance : Popote dit ce
qui manquera et l'ajoute aux virements de ce mois-là, selon le partage.

**Ce qui est réservé.** Chaque charge fixe a une seule réserve, jamais deux :

| Charge fixe | Sa réserve |
|---|---|
| Elle tombe chaque mois, Popote ne l'a pas encore vue sur le compte ce mois-ci | son montant |
| Elle tombe chaque mois, son opération est encore en attente chez la banque | 0 : elle est déjà retranchée comme opération en attente |
| Elle tombe chaque mois, Popote l'a vue (opération validée ou encore « estimée »), ou elle a été avancée | 0 |
| Elle ne tombe pas chaque mois, son échéance n'est pas passée | son gardé (le mois de l'échéance : son montant entier, que le gardé couvre) |
| Elle ne tombe pas chaque mois, Popote l'a vue passer ce mois-ci | 0 |

**Le solde** est le solde comptable rendu par la banque : les opérations passées. Une opération encore en attente
chez la banque (un paiement par carte pas encore débité) en est retranchée une fois, tant qu'elle attend.

**Pour finir le mois.** Le solde, moins les opérations en attente, moins ce qui est réservé, moins le coussin.
Arrondi à l'euro inférieur. « Soit N € par jour » divise ce montant par le nombre de jours qui restent, aujourd'hui
compris, arrondi à l'euro inférieur. Exemple, vendredi 13 novembre : 379,30 € sur le compte, rien en attente ;
l'internet et l'assurance sont validées, l'électricité est vue ce soir-là, encore « estimée » : leur réserve vaut
0 ; restent 80 € gardés pour la copropriété ; le coussin est vide (premier mois). Soit 299 € pour finir novembre,
sur 18 jours : 16 € par jour.

**Le virement du mois.** Ce que la personne doit verser sur le compte joint ce mois-ci : sa part, moins les avances
qui lui sont rattachées (au centime, § 9), plus ou moins la décision du point précédent (§ 10). Il peut porter des
centimes (588,60 €) et ne descend jamais sous 0 € : le reste est reporté au mois suivant.

Les virements d'un mois sont **figés le 1er à 0 h**, heure de Paris, d'après le budget accepté par les deux à cet
instant (§ 12.1), les avances rattachées et la décision du point. Avant, tout montant du mois suivant est une
prévision : l'écran dit « prévu », et il est recalculé si le budget change.
Figé, un virement ne bouge plus que par une avance qui lui est rattachée ou par la décision du point acceptée par
les deux (§ 10), et seulement tant qu'il n'est ni annoncé ni reçu.

**Le prochain virement** d'une personne, celui dont une avance est retirée, est son premier virement qui n'est ni
annoncé ni reçu : celui du mois en cours s'il est encore « à verser » ou « en retard », sinon celui du mois
suivant. Dans l'exemple, le 13 novembre, le virement de novembre est reçu : c'est celui de décembre.

| État | Quand |
|---|---|
| À verser | par défaut |
| Annoncé | la personne a touché « C'est fait » |
| Reçu | Popote a reconnu sur le compte des crédits dont la somme atteint le montant attendu ; un virement de 0 € est reçu d'office |
| En retard | ni annoncé ni reçu après le 5 du mois |

**Une avance.** Une dépense à deux payée par l'un, de son compte ou en liquide. Le compte joint lui doit cette somme.

**Le mois** est le mois civil, à l'heure de Paris ; il se clôt le dernier jour à minuit, à l'heure du serveur, avec
ou sans banque. Une opération compte dans le mois de sa date à la banque, sauf si le point de ce mois est déjà
validé : elle compte alors dans le mois ouvert, et sa ligne garde sa date (« du 30 nov. »).

**Le premier mois.** Le budget commence le 1er du mois qui suit l'accord de l'autre (§ 12.1 ; § 17, B-C9), ou sa
mise en place si l'autre n'a pas encore rejoint le foyer. D'ici là, Popote lit et range le mois en cours et montre
les postes, mais ne demande aucun virement et ne fait pas de point.

**Sans banque branchée**, tout marche : les dépenses se disent à Popote ; « reçu » n'existe pas, un virement
annoncé en tient lieu. Le solde est alors estimé : les virements annoncés du mois, plus le gardé et le coussin
reportés des mois d'avant, moins les dépenses notées. « Pour finir le mois » en retranche, comme avec la banque,
ce qui est réservé (une charge fixe « vue » est une charge notée) et le coussin.

**Tant que l'autre n'a pas rejoint le foyer**, le budget se pose quand même ; sa ligne de virement dit « En attente
de Léa », et aucun rappel ne part pour elle.

## 5. Poser le budget (`/budget/poser`)

Une seule fois, par l'un des deux ; l'autre peut ouvrir l'écran et y dire des charges lui aussi. En haut, quatre
étapes : **Revenus**, **Charges**, **Partage**, **Banque**. L'étape en cours est jaune, une étape faite est verte.
Quitter garde ce qui est dit : on reprend où on en était (B2).

**À deux en même temps.** Le brouillon est celui du foyer et porte une version. Une charge a une identité commune
(son thème, sa pastille, à qui elle est, et son nom quand le foyer en a deux de la même pastille : deux assurances
auto ne se confondent pas) : la dire deux fois, par l'un ou par l'autre, n'en fait qu'une. Si l'autre
a changé le brouillon entre-temps, l'écriture est refusée, l'écran recharge le brouillon et Popote dit : « **Léa
vient de changer le budget.** Je te montre. » « C'est tout bon » ne valide que le récapitulatif affiché : s'il
n'est plus à jour, il est réaffiché avant.

On peut toujours **tout dire en vrac** dans la barre : Popote range chaque charge dans son thème, et le parcours par
thème sert alors de vérification.

### 5.1 Revenus

Popote : « **On pose le budget ?** Dis-moi vos revenus nets, à tous les deux. » Deux lignes, « Sam gagne ? » et
« Léa gagne ? », se remplissent quand la personne le dit ou le tape (« 2 600 pour moi, 1 400 pour Léa »).
Popote : « **Noté !** Les charges, maintenant : un thème à la fois. » Le revenu dit pour l'autre est provisoire : il le
confirme ou le corrige à sa première ouverture du Budget (§ 12.1).

Un revenu se dit en euros nets par mois, entier, entre 0 et 99 999. Les revenus des deux sont visibles des deux :
le partage en dépend.

### 5.2 Charges, un thème à la fois

Une rangée de sept icônes montre où on en est (thème en cours en jaune, thèmes passés en vert). Dessous, la carte
du thème : son nom, un bouton à droite, et les charges habituelles du thème en pastilles. Sous la carte, deux
compteurs : « À deux, par mois » et « À toi, par mois ».

| N° | Thème | Popote dit | Pastilles (liste rendue par l'API, B2) |
|---|---|---|---|
| 1 | Logement | **Le logement.** Touche ce que vous payez, ou dis-le-moi. | Loyer ou crédit, Électricité, Gaz, Eau, Internet, Assurance habitation, Copropriété, Taxe foncière |
| 2 | Crédits | **Les crédits.** | Crédit du logement, Crédit auto, Prêt étudiant, Prêt personnel, Crédit conso, Assurance des crédits |
| 3 | Voiture et transports | **La voiture.** | Crédit auto, Assurance auto, Essence, Entretien, Péages, parking, Transports en commun |
| 4 | Manger | **Manger.** Courses, restos, à emporter… | Courses, Restaurants, Fast-food à emporter, Déjeuners au travail, Cantine, Boulangerie, café |
| 5 | Abonnements | **Les abonnements.** Téléphone, sport, écrans… | Forfait mobile, Salle de sport, Vidéo à la demande, Musique, Stockage en ligne, Presse |
| 6 | Santé et loisirs | **Santé et loisirs.** Mutuelle, sorties, vacances… | Mutuelle, Médecin, pharmacie, Coiffeur, beauté, Shopping, Sorties et culture, Vacances |
| 7 | Enfants et animaux | **Enfants, animaux ?** Rien chez vous : passe. (si le foyer n'a rien dit de tel) | Garde, École, cantine, Activités, Pension, Vétérinaire, Croquettes |

**Poser une charge, deux façons.**

- *Toucher une pastille* : une ligne s'ouvre sous les pastilles, avec le nom, le montant à taper, et le choix
  « À deux », « À moi » ou « À Léa » (le prénom de l'autre membre). Le choix ferme la ligne. Rien n'est coché
  d'avance : il faut choisir.
- *Le dire* : « Internet 30, assurance 12,40, copro 240 par trimestre : à deux. Le crédit, 450 : à moi. Le prêt
  personnel, 300 : à Léa. »
  Popote coche les pastilles une à une. Une charge qui n'a pas de pastille en gagne une. Si « à qui » manque,
  Popote le demande avant de cocher : « **Internet, 30 €.** C'est à deux, à toi, ou à Léa ? »

Une pastille cochée devient verte : « ✓ Électricité 60 € » et les initiales de qui la paie (les deux, ou une seule).
La toucher la rouvre pour la corriger ou la retirer. Le compteur concerné monte.

**Ce que Popote dit après un thème**, quand c'est utile : le nombre de charges notées et ce qu'elle a converti.
« **5 de notées.** La copro : je compte 80 € par mois. »

**Le bouton de la carte** dit « Rien ici » tant que rien n'est coché, « C'est tout » dès qu'une charge l'est, et
« Rien d'autre » si le thème montre une charge déjà dite ailleurs. Il passe au thème suivant. On revient à un thème
en touchant son icône.

**Une charge à cheval sur deux thèmes** se dit une fois. Elle réapparaît dans l'autre thème, déjà cochée, en
pointillés, et n'est comptée qu'une fois. Deux cas, dans les deux sens : le crédit du logement (la pastille « Loyer
ou crédit » de Logement demande « loyer, ou crédit ? » ; seul un crédit se retrouve dans Crédits, où Popote dit :
« Celui du logement, je l'ai déjà. ») et le crédit auto (Crédits et Voiture : « Le crédit auto, je l'ai déjà. »).
L'assurance des crédits n'est proposée que dans Crédits.

**Le montant.** En euros, jusqu'au centime, entre 0,01 et 99 999. La périodicité se dit (« par trimestre », « par
an ») ou se choisit dans la ligne ouverte ; sans rien dire, c'est par mois. Pour une charge qui ne tombe pas chaque
mois, Popote demande l'échéance : « **Elle tombe quand, la prochaine fois ?** », avec les mois en pastilles.

**Les charges de l'autre.** Celui qui pose le budget peut tout dire d'un coup, les charges de l'autre comprises
(« à Léa »). L'autre les voit, les corrige ou en ajoute quand il veut (§ 12.1). Une charge « à Léa » porte son
initiale, ne compte pas dans « À toi, par mois », et se retrouve dans le récapitulatif. Les pastilles cochées, la
liste des oublis et le rapprochement « déjà dite ailleurs » tiennent compte de toutes les charges du foyer.

### 5.3 Les oublis, puis le récapitulatif

Après le dernier thème, Popote dit : « **7 thèmes passés.** Un dernier tour : les oublis. » La carte « **On oublie
souvent** » propose les charges fréquentes que le foyer n'a pas
dites, celles qui tombent une fois par an d'abord. Popote : « **Les oublis fréquents.** Surtout ce qui tombe une fois
par an. » La liste vient de l'API (B2) : elle ne contient jamais une charge déjà posée. Exemple : Taxe foncière,
Entretien de la voiture, Impôts, Eau, Vacances, Cadeaux. Le bouton dit « Rien de tout ça », puis « C'est tout ».

« La taxe foncière, 900 par an : à moi » coche la pastille à 75 € ; Popote : « **75 € par mois** à prévoir pour
elle. Autre chose ? » (« mis de côté » ne se dit que d'une charge à deux, gardée sur le compte joint.)

Puis le **récapitulatif** remplace la carte : un ticket « À deux », son total par mois et ses lignes (la périodicité
d'origine en petit : « 240 € par trimestre »), puis une ligne par personne qui a des charges à elle, « À toi » et «
À Léa », avec le total et le nombre de charges.
Popote : « **Voilà votre budget.** Tout est juste ? » Deux boutons : « C'est tout
bon » et « Modifier » (qui rouvre les thèmes). « C'est tout bon » pose le tampon « Validé », des confettis, et
Popote dit : « **1 062,40 € par mois.** Reste à voir qui verse quoi. »

Rien n'est enregistré comme budget avant « C'est tout bon ». Zéro charge à deux : le bouton est en pause, et Popote
dit : « **Aucune charge à deux.** Sans elle, pas de virement à calculer. »

### 5.4 Partage

Popote : « **Qui verse combien ?** Je propose selon vos revenus. » Trois choix en ligne : « Selon les revenus »
(choisi), « Moitié-moitié », « Autre ». Dessous, une barre partagée en deux couleurs, et pour chacun : « Sam
verse », le montant, et la part de son salaire que cela représente. Puis : « = 1 063 € par mois sur le compte
joint, pour vos 8 charges. » Ce total est la somme des deux parts rendues par l'API pour la règle affichée (1 064 €
en moitié-moitié).

| Choix | Popote dit |
|---|---|
| Selon les revenus | **Le même effort.** Chacun verse 27 % de ce qu'il gagne. |
| Moitié-moitié | **532 € chacun.** Léa y laisserait 38 % de son salaire, toi 20 %. |
| Autre | deux curseurs liés, par pas de 1 % ; les montants sont recalculés par l'API à chaque arrêt (B4) ; **À vous de voir.** Dis-moi les deux parts. Pendant le calcul, les montants s'effacent (« Je calcule… ») et « C'est bon » est en pause : on ne valide que des montants rendus pour les pourcentages affichés. |

« C'est bon » valide : « **C'est réglé !** Chaque mois : toi 691 €, Léa 372 €. » Si un revenu vaut 0, « Selon les
revenus » met tout sur l'autre, et Popote le dit avant de valider. La part de l'autre reste « à confirmer » tant
qu'il ne l'a pas acceptée (§ 12.1).

### 5.5 Banque

Voir § 11. L'étape se passe : « Plus tard » laisse le budget marcher à la main.

## 6. L'écran Budget (`/budget`)

De haut en bas : l'en-tête, Popote et sa bulle, le bloc du haut, les deux virements, les avances s'il y en a, les
postes et les charges fixes, la barre « Parle-moi, ou écris ».

**L'en-tête.** Le jour (« Vendredi 13 nov. »), l'initiale de la personne, la roue des réglages.

**La bulle** dit la chose à faire, une seule. La tuile de l'accueil suit le même ordre (§ 13).

| Priorité | Situation | Texte | Bouton |
|---|---|---|---|
| 1 | L'accès à la banque s'arrête dans 7 jours ou moins, ou est arrêté | Mon accès à ta banque **s'arrête dans 7 jours**. (ou : **s'est arrêté**.) | Renouveler |
| 2 | Ma part n'est pas confirmée (§ 12.1) | **Sam a posé le budget.** Ta part : 372 € par mois. D'accord ? | D'accord, et le lien « Voir le détail » |
| 3 | Le mois précédent est fini, le point n'est pas fait | **Novembre est bouclé !** On fait le point ? | Faire le point |
| 4 | Mon virement est à verser, ou en retard | **Nouveau mois :** verse 691 € sur le compte joint. Si l'autre a déjà versé : **Bonjour Léa !** À toi : 372 € à verser. | C'est fait |
| 5 | Mon virement est annoncé, pas encore reçu | **Merci !** Je regarde ce soir s'il est arrivé. | le lien « Pas encore fait » |
| 6 | Mon virement est reçu, pas celui de l'autre | **691 € bien reçus.** Léa n'a pas encore versé. | Lui rappeler |
| 7 | Des opérations sont à ranger | **4 opérations** à ranger ce soir. | Voir |
| 8 | La banque ne répond pas | **Ta banque ne répond pas.** Tes chiffres datent d'hier soir. Je réessaie cette nuit. | |
| 9 | Rien | **Tout est rangé.** 299 € pour finir novembre. | |

Deux situations passent avant toutes les autres : le budget en pause (§ 11.5) : « **Le budget est en pause.** Il
reprend quand vous serez deux. », sans bouton ; et une proposition de l'autre à accepter (§ 12.1), au rang de la
priorité 2.

L'API choisit la situation (B1) ; l'écran ne trie rien.

**Le bloc du haut : « Pour finir novembre ».** Le montant en grand, puis : « Soit 16 € par jour. Sur le compte :
379,30 €, dont 80 € gardés pour la copropriété. » À droite, « Lu à 21 h » et le bouton « Actualiser » (§ 11.3). Si
le montant est négatif : le bloc passe en rouge clair, « **Il manque 42 €** pour finir novembre. », sans « par
jour ».

**Avant le premier mois.** Budget posé et accepté, premier mois pas commencé : le bloc dit « Le budget commence le
1er décembre », sans montant, et dessous : « D'ici là, je range vos opérations. » Les postes s'affichent, sans
virement ni point (§ 4).

**Sa variante de début de mois.** Seulement si une banque est branchée, du 1er au 5, et tant que les deux virements
ne sont pas reçus, le bloc dit « Sur le compte joint », le montant reçu, et une ligne :

| Situation | Ligne |
|---|---|
| Aucun virement reçu | Il attend vos deux virements de novembre. |
| Le mien est reçu | Il manque le virement de Léa. |
| Celui de l'autre est reçu | Sam a versé sa part. Il manque la tienne. |
| Les deux sont reçus, ce jour-là | le titre devient « Pour tout novembre », le montant est la somme reçue, et : « Vos 8 charges sont couvertes. » |

Dès le lendemain du second virement, ou à partir du 6, ou sans banque, le bloc redevient « Pour finir novembre » ;
s'il manque encore un virement, sa dernière phrase le dit (« Il manque le virement de Léa. »).

**Les virements.** Deux lignes, la personne d'abord : son initiale, « Ton virement » (ou le prénom de l'autre), le
montant, et son état.

| État | Ce qu'on voit |
|---|---|
| À verser | l'étiquette « À verser » |
| Annoncé | « Annoncé » : Popote regarde le soir s'il est arrivé |
| Reçu | une coche verte et « Reçu le 2 » |
| Reçu en partie | « Reçu 650 € sur 691 € » |
| En retard | l'étiquette « En retard », en rouge clair |
| À confirmer | « À confirmer » : l'autre n'a pas encore accepté sa part |
| L'autre n'a pas rejoint le foyer | « En attente de Léa » |

**Les avances.** Une carte par personne qui a avancé ce mois-ci : « **Tu as avancé 102,40 €.** Décembre : 588,60 €
à verser. »

**Les postes.** Pour chaque poste, une barre : « Courses 262 / 500 € ». Elle passe en rouge quand le poste est
dépassé, avec « dépassé de 24 € ». Dessous, une ligne pour les charges fixes : « Électricité, internet,
assurance : 2 passées sur 3 ». Seules les opérations **validées** comptent dans un poste et dans « passées » ; une
opération estimée n'y entre pas avant l'accord (elle compte déjà, en revanche, dans « Pour finir le mois », § 4).

## 7. Le virement du mois

- Le 1er du mois, la bulle de chacun annonce son virement, après le point du mois précédent s'il n'est pas fait
  (priorités 3 et 4). Un rappel part (§ 16).
- « C'est fait » : « **Merci !** Je regarde ce soir s'il est arrivé. », la ligne passe à « Annoncé ». « Pas encore
  fait » revient en arrière tant que le virement n'est pas reçu.
- **Reconnaître un virement.** À chaque lecture, un crédit du compte joint du montant attendu, dont le libellé
  contient le nom de la personne quand il faut départager, fait passer son virement à « Reçu le 2 » ; la bulle :
  « **691 € bien reçus.** » Si rien ne départage deux virements du même montant, Popote
  l'attribue à celui qui a annoncé le sien (« C'est fait ») si l'autre ne l'a pas fait et si le libellé ne dit
  pas le contraire (le nom de l'autre) ; sinon elle demande à
  chacun : « **Un virement de 532 € est arrivé.** C'est le tien ? » Il n'est attribué que si les réponses
  s'accordent (un « oui », un « non ») ; d'ici là les deux lignes disent « 1 virement reçu, à départager ». Une
  attribution se corrige ensuite depuis l'opération (§ 8), et chaque correction garde son auteur et sa date.
- **Un autre montant** n'est jamais deviné : le crédit arrive dans les opérations à ranger, « À toi de dire », avec
  les choix « Le virement de Sam » et « Le virement de Léa ». Le virement est reçu quand la somme de ses crédits
  atteint le montant attendu. En dessous : « **650 € reçus sur 691 €.** Il manque 41 €. » Au-dessus : le surplus
  reste sur le compte, et Popote le dit au point du mois.
- **En retard.** Après le 5, la ligne dit « En retard » et un seul rappel part, le 6 (§ 16).
- « Lui rappeler » envoie à l'autre un rappel **sans aucun montant** ; Popote : « **Rappel parti.** Sur son
  téléphone, sans aucun montant. » Un seul rappel par jour.
- Quand les deux sont reçus : « **Le mois est payé !** 1 063 € sur le compte, à vous deux. » Le montant est la
  somme reçue.

## 8. Chaque soir : les opérations à ranger (`/budget/operations`)

Après la lecture du soir, Popote classe les nouvelles opérations du compte joint. L'écran les liste, la plus récente
en haut : le libellé de la banque tel quel, le montant avec son signe (« −41,00 € » pour un débit, « +691,00 € » pour un
crédit, dit « reçu » au lecteur d'écran), le jour, et une étiquette.

| Étiquette | Sens | Ce que la personne fait |
|---|---|---|
| un poste, marqué « estimé » | Popote propose | rien si c'est juste ; touche l'étiquette pour la corriger |
| une charge fixe, marquée « charge du mois » | le montant et le libellé correspondent à une charge posée | rien, ou corriger |
| « À toi de dire » | Popote ne devine pas | choisir une étiquette |

- Popote : « Regarde si j'ai bon. Touche une étiquette pour la corriger. »
- Toucher une étiquette ouvre les choix : les postes, les charges fixes, « Le virement de Sam », « Le virement de
  Léa », « Remboursement d'avance », « Pas une dépense à deux » (un remboursement, une erreur), « Autre ». Le serveur
  ne propose et n'accepte « Le virement de… » que pour un crédit, un poste, une charge fixe ou « Remboursement
  d'avance » que pour un débit : un virement sortant ne peut pas compter comme le virement de quelqu'un.
- Après une correction, Popote dit ce qu'elle retient : « **Compris.** Burger Express, c'est fast-food : je m'en
  souviens. » La règle vaut pour les prochaines opérations au même libellé, une fois retirés ce qui change d'une
  fois à l'autre (numéro de terminal, date, référence) ; elle se retire dans les réglages.
- Pour une opération « À toi de dire » : « Un virement à M. Martin : je ne devine pas. **C'était pour quoi ?** »
  Le bouton du bas dit « Encore 1 à dire » en pause, puis « Tout valider » ; Popote : « **Tout a son étiquette.** Tu
  valides ? »
- Une opération encore en attente chez la banque n'est pas rangée : « Une autre opération est en attente chez ta
  banque : je te la montre quand elle est passée. »
- « Tout valider » : chaque ligne prend sa coche, confettis, retour à `/budget` : « **Tout est rangé !** 299 € pour
  finir novembre. » Les postes montent à ce moment-là.
- L'un ou l'autre peut ranger. Si l'autre a déjà rangé une opération, elle n'est plus dans la liste ; valider une
  liste périmée ne range que ce qui restait à ranger, et l'écran se met à jour.
- **Corriger après coup.** Toucher une opération déjà validée du mois (dans « Les dernières opérations ») rouvre ses
  choix, tant que le point du mois n'est pas validé.
- **Ce qui est à ranger.** Seulement les opérations datées du mois de la mise en place ou d'après. L'historique
  plus ancien lu au branchement (90 jours) ne sert qu'à apprendre les libellés : Popote en tire ses règles (un
  libellé nettoyé, une étiquette), puis **efface ces opérations le jour même**. Elles ne comptent dans aucun poste
  et ne sont jamais montrées.
- **Les libellés de la banque sont des données, jamais des consignes.** Le classement ne peut rendre qu'une
  étiquette de la liste fermée du foyer, vérifiée par le serveur ; le libellé n'entre jamais dans la partie
  « consigne » d'un appel au modèle. Un libellé qui contient une phrase (« ignore tes règles… ») est affiché tel
  quel, et rien d'autre ne change.
- **Les libellés nomment des tiers** (« M. Martin ») et peuvent en dire long. Ils ne sont pas écrits dans le journal
  des appels au modèle, et ce qui n'aide pas à classer (numéros de compte, références) en est retiré avant l'envoi.
  L'analyse d'impact de ce traitement appartient au socle.

## 9. Une dépense en liquide, une avance

Les deux se disent à Popote, dans la barre ou à la voix. Popote récapitule dans un bloc ; rien n'est noté avant
« Valider ».

**En liquide.** « J'ai payé 20 € en liquide au marché ce matin » :

> Si j'ai bien compris : **Courses, au marché**, 20 €. En liquide, payé par toi. **Le compte joint te doit 20 €.**
> [Valider] [Modifier]

Après « Valider » : « Le compte joint te doit 20 €. Retirés de ton virement de décembre. » (son prochain virement,
§ 4) et la bulle : « **C'est
noté.** Courses : 345 € sur 500. »

**Une avance.** (Un autre mois que l'exemple du § 8, où l'électricité est passée sur le compte joint.) « Ce mois-ci
j'ai payé l'électricité, internet et l'assurance de mon compte » :

> **Trois charges à deux, payées par toi :** Électricité 60 €, Internet 30 €, Assurance habitation 12,40 €.
> **Le compte joint te doit 102,40 €.** Je les retire de ton virement de décembre : 588,60 € au lieu de 691 €.
> [Valider] [Me rembourser plutôt]

- « Me rembourser plutôt » : rien n'est retiré du virement ; Popote dit : « **D'accord.** Vire-toi 102,40 € depuis
  le compte joint, je le verrai passer. » L'opération arrive ensuite dans les opérations à ranger, proposée
  « Remboursement d'avance ».
- Après « Valider », Popote demande : « Tant que ces prélèvements partent de ton compte, **je le refais chaque
  mois ?** » avec « Oui, chaque mois » et « Juste cette fois ». « Oui » : « **D'accord.** Préviens-moi quand ils
  partiront du compte joint. » L'avance se répète chaque mois jusqu'à ce que la personne dise le contraire, ou
  l'arrête dans les réglages.
- Une avance plus grande que le virement suivant met ce virement à 0 € ; le reste est reporté au mois d'après, et
  Popote le dit.
- Une charge avancée est comptée « passée » dans les charges fixes du mois : 3 payées par toi. La bulle :
  « **C'est compté.** En décembre, tu verses 588,60 €. »
- **Pas deux fois.** Si la charge est déjà passée sur le compte joint ce mois-ci, Popote ne note rien et le dit :
  « **L'électricité est déjà passée** sur le compte joint, le 10. » Si elle y passe après l'avance, les deux
  paiements sont vrais et Popote garde les deux : l'opération arrive « À toi de dire », avec « **Payée deux
  fois ?** L'électricité est passée sur le compte joint, et tu m'avais dit l'avoir payée de ton compte. » et deux
  réponses : « Oui, deux fois » (l'avance reste, l'opération est rangée « Électricité », et Popote dit : « Je
  garde les deux. Si on te rembourse, dis-le-moi : j'annulerai ton avance. ») et « Je m'étais trompé » (l'avance
  est annulée, comme ci-dessous).
- **Annuler.** Une dépense à la main ou une avance s'annule tant que le point du mois n'est pas validé : en le
  disant à Popote, ou depuis sa ligne dans « Les dernières opérations ». Le virement suivant est recalculé.
- On peut dire l'avance de l'autre (« Léa a payé le restaurant, 45 € ») : le récapitulatif nomme Léa. Rien ne change
  pour elle tant qu'elle ne l'a pas confirmée, dans sa bulle : « **Sam dit que tu as payé le restaurant, 45 €.**
  C'est ça ? »
- À la voix, un montant n'est jamais dit : Popote l'affiche et dit « Je te l'affiche. » (« Aujourd'hui », § 7).

## 10. La fin du mois : le point (`/budget/point`)

À partir du dernier jour du mois à 21 h, heure du serveur, Popote propose le point, avec ou sans banque. Si la
dernière lecture du compte est plus ancienne, le point le dit (« Chiffres lus le 29 à 21 h ») et propose
« Actualiser ». « **Novembre est bouclé !** 60 € n'ont pas été
dépensés. » Pour chaque poste : dépensé sur prévu, et l'écart en pastille (« −30 » en vert, « +24 » en rouge) ; une
ligne « Charges fixes : 182,40 €, pile ». Une charge qui ne tombe pas chaque mois y compte pour sa mensualité
(80 € de copropriété), jamais pour son débit : en janvier, les 240 € qui passent sont couverts par le gardé et
ne font pas un mois « plus cher ».

**Il reste de l'argent.** « Les 60 € qui restent ? » avec trois choix, puis les virements du mois suivant :

| Choix | Popote dit | Effet |
|---|---|---|
| Coussin | **Un coussin.** Ils restent sur le compte, pour un mois plus cher. | rien ne change ; le coussin s'affiche dans « gardé » |
| Verser moins | **Verser moins.** 39 € de moins pour toi, 21 € de moins pour elle. | le reste est rendu selon la règle de partage, chaque baisse arrondie à l'euro inférieur : 652 € et 351 € en décembre ; ce que l'arrondi ne rend pas reste au coussin |
| Un projet | « Bientôt » | hors périmètre |

Le bouton du bas dit « Choisis pour les 60 € » en pause, puis « Valider décembre » : « **Décembre est prêt !** Je
vous fais signe le 1er. »

**Il a manqué de l'argent.** « **Novembre a coûté 48 € de plus.** » Deux choix : « Verser plus » (réparti selon la
règle de partage, chaque hausse arrondie à l'euro supérieur, ajoutée au virement suivant) ou « Prendre sur le
coussin » (proposé seulement si le coussin le couvre).

- Les opérations encore à ranger se rangent d'abord : le point renvoie vers elles.
- Une opération du mois qui arrive après la validation du point compte dans le mois ouvert ; sa ligne garde sa
  date (§ 4).
- Sous les postes, une ligne dit le coussin au centime : « Dans le coussin : 0,60 € ».
- « Décembre est prêt ! » annonce une prévision : les virements de décembre sont figés le 1er (§ 4). Si le budget
  change d'ici là, ils sont recalculés, et la bulle du 1er donne le bon montant.
- « Coussin » et « Prendre sur le coussin » se valident seul : aucun virement ne change. « Verser moins » et
  « Verser plus » changent les virements des deux : c'est une **proposition** que l'autre accepte (§ 12.1), tant
  qu'aucun des deux virements du mois suivant n'est annoncé ni reçu. Sans son accord rien ne change : un reste va
  au coussin, un manque est pris sur le coussin s'il le couvre, et sinon le bloc du haut garde « Il manque
  48 € ».
- Tant que le point n'est pas validé, les virements du mois suivant sont calculés avec le défaut (§ 17, B-C2), et la
  bulle du virement le dit : « Le point de novembre n'est pas fait : je garde les 60 € en coussin. »

## 11. La banque

### 11.1 Brancher le compte joint

Une suite d'étapes dans le même écran, Popote à chaque fois :

1. « **Le compte joint.** Il est dans quelle banque ? » Un champ « Cherche ta banque » et les banques les plus
   courantes ; « Toutes les banques » ouvre la liste complète (B5).
2. Si la banque a des caisses régionales : « **Et ta caisse ?** Celle de ta région. » avec « La Caisse d'Épargne a
   15 caisses. Je retiens la tienne : tu ne la choisis qu'une fois. » (le nom et le nombre viennent de l'API) et un
   champ « Ta région, ta ville ».
3. Avant de partir, quatre promesses, puis « Aller chez ma banque » :
   - **Je lis, c'est tout.** Je ne peux rien payer, rien virer.
   - **Matin et soir.** Et quand tu touches « Actualiser ». Jamais plus de 4 fois par jour sans toi.
   - **Date, montant, libellé,** et le solde du compte. Rien d'autre.
   - **Tous les 180 jours**, ta banque te redemande ton accord. (La date exacte, rendue par l'API, est toujours
     affichée dans les réglages.)

   Popote : « Je t'envoie chez ta banque : **c'est elle qui te demande ton accord.** »
4. La personne donne son accord chez sa banque, hors de Popote, puis revient sur `/budget/banque/retour`.
5. « **Deux comptes !** Lequel je regarde ? » La liste des comptes rendus par la banque, par leurs quatre derniers
   chiffres (un numéro masqué ; l'écran ne reçoit ni IBAN ni identifiant de la banque, seulement une référence
   opaque pour dire son choix). **Aucun compte n'est coché d'avance** : le compte joint est à cocher, et le bouton
   « Brancher le compte joint » est en pause tant que rien n'est choisi. Un compte personnel dit : « Si tu le
   branches : vu par toi seul. » Puis une confirmation : « **Léa verra toutes les opérations de ce
   compte.** C'est bien votre compte joint ? » avec « Oui, c'est lui » et « Non ». Rien n'est lu ni gardé des
   comptes qui ne sont pas choisis.
6. « Je lis vos 90 derniers jours… » avec une barre, puis : « **C'est branché !** Je lis ce que ta banque me
   donne. », « 212 opérations lues », le bouton « Voir mon budget », et : « **212 opérations.** Je les range ce
   soir, et tu valides. » Seules celles du premier mois du budget seront à valider (§ 8).

Le retour de la banque peut échouer : accord refusé (« **Tu as dit non à ta banque.** Rien n'est branché. » et
« Réessayer »), délai dépassé, aucun compte rendu. Dans chaque cas rien n'est branché, et « Plus tard » reste
possible.

**Le retour.** Au départ, l'API crée une demande d'accord liée à la personne, à son foyer et à son adhésion à ce
foyer, à durée courte et à usage unique, et rend l'adresse de la banque ; l'écran ne s'y rend que si elle est en
`https`. L'adresse de retour porte le jeton de cette demande : un retour sans jeton, avec un jeton rejoué, expiré,
d'une autre personne, ou d'une personne qui n'est plus dans ce foyer n'a aucun effet. Quitter le foyer, en être
retiré, supprimer son compte ou être remplacé comme porteur de l'accès annule toutes les demandes en cours et coupe
l'accès chez le prestataire.

**Reprendre après une reconnexion.** L'échange du jeton est la seule route du retour ouverte sans session ; toutes
celles qui suivent l'exigent. À l'ouverture du retour, l'écran échange le jeton, avant toute autre requête,
contre une suite que le serveur garde avec la demande (le socle choisit le moyen : état côté serveur ou cookie
`HttpOnly`), puis nettoie l'adresse. Le jeton n'est jamais recopié dans un paramètre de retour après connexion ni
laissé dans l'historique. Le retour peut s'ouvrir dans un autre navigateur que l'appli installée, ou après
l'expiration de la session : l'écran demande alors de se connecter, puis reprend la demande en cours de la personne
connectée depuis le serveur, sans refaire le passage chez la banque. Recharger la page reprend au même endroit.

### 11.2 Qui a branché, qui voit

- Le compte joint est branché par l'un ; ses opérations et son solde sont vus des deux.
- L'accès appartient à celui qui l'a donné : lui seul peut le renouveler, changer de banque ou débrancher. Les
  réglages disent : « Compte joint, branché par Sam. Léa peut le reprendre. » Reprendre refait le parcours du
  § 11.1 avec l'accord de Léa, et remplace l'accès de Sam.
- Si celui qui a branché quitte le foyer, en est retiré ou supprime son compte, l'accès est coupé tout de suite,
  chez le prestataire aussi (§ 11.5).

### 11.3 Lire

- Chaque soir et chaque matin, Popote lit le compte. « Lu à 21 h » dit quand ; passé 24 heures sans lecture
  réussie, l'écran et la tuile le disent (§ 11.4, § 13).
- « Actualiser » relit tout de suite, la personne étant là. Pendant la lecture, la flèche tourne ; le bouton est en
  pause 10 minutes après une lecture réussie.
- Les lectures sans la personne sont limitées à quatre par 24 heures par la règle des banques : l'écran n'en dépend
  pas, mais ne promet jamais « en direct ».
- Popote ne reçoit de la banque que la date, le montant, le sens (débit ou crédit), l'état (passée ou en attente)
  et le libellé de chaque opération, et le solde comptable.

### 11.4 Renouveler, tomber en panne, débrancher

| Situation | Ce qu'on voit |
|---|---|
| L'accès s'arrête dans 7 jours ou moins | la bulle de priorité 1 ; « Renouveler » refait l'accord chez la banque (étapes 3 et 4), puis : « **C'est reparti !** Jusqu'au 1er novembre 2027. » |
| L'accès est arrêté | la même bulle, « s'est arrêté » ; les chiffres restent ceux de la dernière lecture, datés |
| La banque ne répond pas | « Lu hier, 21 h » en rouge clair, marmite inquiète, « **Ta banque ne répond pas.** Tes chiffres datent d'hier soir. Je réessaie cette nuit. » ; rien n'est perdu, tout le reste marche |
| Débrancher (réglages) | une confirmation : « **Débrancher ta banque ?** Je ne lis plus rien, et j'efface ce que ta banque m'a donné et qui n'est pas rangé. Ce qui est rangé reste. » avec « Débrancher » et « Annuler » |

Débrancher coupe l'accès chez le prestataire et efface les données brutes de la banque : les opérations pas encore
validées, les soldes lus, la banque et le numéro masqué. Les opérations validées et les totaux des mois sont à
vous deux : personne ne les efface seul. Ils suivent la durée de garde (§ 17, B-C3) et la suppression du foyer
(« Entrer »).

### 11.5 Quelqu'un quitte le foyer

Les règles du départ sont celles du parcours « Entrer ». Pour le Budget : les revenus, les charges « à moi » et les
avances de la personne partie sont effacés avec son compte ; son accès à la banque et ses demandes d'accord sont
coupés tout de suite ; les opérations déjà rangées du compte joint restent, sans son nom.

Le budget passe **en pause** : le Budget d'une personne seule est hors périmètre (§ 2). L'historique reste lisible,
aucun virement n'est calculé, aucun rappel ne part, Popote ne lit plus le compte, et rien n'est à poser à un seul.
L'écran de celui qui reste dit : « **Le budget est en pause.** Il reprend quand vous serez deux. » Quand un second
membre rejoint le foyer, les deux reposent les revenus et le partage (§ 5), et le budget reprend le 1er du mois qui
suit leur accord. Le plan d'API du Budget aligne le socle (0.4ter) sur cette règle.

## 12. Les réglages du budget (`/budget/reglages`)

« **Réglages du budget.** Tout ce qu'on a posé ensemble est ici. Tu changes ce que tu veux. » Une liste :

| Ligne | Ce qu'elle dit | Ce qu'elle ouvre |
|---|---|---|
| Banque | « Caisse d'Épargne Bretagne Pays de Loire. Compte joint, branché par Sam. Léa peut le reprendre. Accès donné jusqu'au 12 mai 2027. » | « Renouveler », « Changer de banque », « Débrancher » (celui qui a branché) ; « Reprendre » (l'autre) |
| Partage | « Selon les revenus : Sam 65 %, Léa 35 % » | l'écran du § 5.4 |
| Revenus | « 2 600 € et 1 400 € nets par mois » | le sien seulement |
| Charges à deux | « 8 charges, 1 062,40 € par mois » | la liste par thème, avec les pastilles du § 5.2 |
| Charges perso | « Les charges de chacun » | la liste par personne ; l'un ou l'autre les change |
| Avances | « 3 charges payées par Sam, chaque mois » | arrêter une avance répétée |
| Ce que j'ai retenu | « 1 libellé appris » | retirer une règle d'étiquette |
| Mémoire | « Je garde vos opérations 2 ans » | § 17, B-C3 |

- Un changement qui touche aux virements (un revenu, une charge à deux, la règle de partage) est une
  **proposition** : il attend l'accord de l'autre (§ 12.1), puis s'applique à partir du mois suivant. Le virement
  du mois en cours ne change jamais. Exemple, l'électricité passe de 60 à 65 € : « **C'est proposé à Léa.** Si elle
  est d'accord, à partir de décembre : toi 694 €, Léa 374 €. »
- Tout se change aussi en parlant (« l'électricité passe à 65 ») : Popote récapitule avant d'écrire.

### 12.1 Qui peut changer quoi, et l'accord de l'autre

| Chose | Qui la change | Ce que voit l'autre |
|---|---|---|
| Son revenu | soi seul (celui qui pose le budget peut le dire une première fois pour l'autre, à confirmer) | une proposition à accepter |
| Les charges à deux | l'un ou l'autre | une proposition à accepter |
| Les charges « à moi » de chacun | l'un ou l'autre | la charge changée, dans les réglages ; pas de bulle : aucun virement ne change |
| La règle de partage | l'un ou l'autre | une proposition à accepter |
| Une avance | celui qui l'a payée ; dite par l'autre, elle attend sa confirmation (§ 9) | la carte d'avance |
| La décision du point qui change les virements (« Verser moins », « Verser plus ») | l'un ou l'autre | une proposition à accepter |
| L'accès à la banque | celui qui l'a donné | les réglages |

**La première fois.** Quand l'un a posé le budget, l'autre le découvre à sa première ouverture : « **Sam a posé le
budget.** Ta part : 372 € par mois. D'accord ? » avec « D'accord » et « Voir le détail » (ses revenus tels que Sam
les a dits, à corriger ; les charges à deux ; la règle). Tant qu'il n'a pas dit « D'accord », sa ligne de virement
dit « À confirmer », aucun rappel de virement ne part pour lui, et les montants des deux restent provisoires.
S'il corrige son revenu, les parts changent : c'est une proposition que celui qui a posé le budget accepte à son
tour, et le budget commence le 1er du mois qui suit ce dernier accord.

**Une proposition.** Tant que l'autre n'a pas répondu, le dernier budget accepté par les deux vaut : aucun virement
ne bouge, ni le sien ni celui de l'autre. L'autre la voit dans sa bulle : « **Sam propose un changement.**
Électricité : 65 € au lieu de 60 €. À partir de décembre : toi 374 €, Sam 694 €. D'accord ? » avec « D'accord » et
« Non ». « D'accord » l'applique à partir du mois suivant. « Non » la retire, et celui qui l'a faite le lit dans sa
bulle : « **Léa a dit non** pour l'électricité à 65 €. » Une seule proposition est ouverte à la fois : tant qu'elle
attend, les réglages qui touchent aux virements disent « En attente de Léa », avec « Retirer ma proposition ». Une
proposition encore ouverte le 1er ne change pas les virements de ce mois.

## 13. La tuile Budget de l'accueil

L'accueil (« Aujourd'hui », § 4.5) rend la tuile depuis un état typé (B1) ; cette spec remplace la phrase
provisoire « ce qui reste du mois ». L'ordre est celui de la bulle (§ 6). La tuile Budget n'est jamais « mise en
avant » : cette marque reste à la tuile Cuisiner (« Aujourd'hui », § 4.5).

| Priorité | État | Phrase |
|---|---|---|
| 1 | Budget pas posé | À régler ensemble |
| 2 | Budget en pause (§ 11.5) | En pause |
| 3 | Accès à la banque à renouveler ou arrêté | Banque à renouveler |
| 4 | Ma part à confirmer, ou une proposition de l'autre à accepter | Ta part à confirmer (ou : Un changement à voir) |
| 5 | Point du mois à faire | Le point de novembre |
| 6 | Mon virement à verser ou en retard | Ton virement : 691 € |
| 7 | Opérations à ranger | 4 opérations à ranger |
| 8 | La dernière lecture réussie du compte a plus de 24 heures | Banque pas à jour |
| 9 | Le budget est posé et accepté, son premier mois n'a pas commencé | Commence le 1er décembre |
| 10 | Sinon | 299 € pour finir novembre |

Les états 8 et 9 ne montrent aucun montant : un chiffre qui date ne s'affiche pas comme un chiffre du jour, et
avant le premier mois il n'y a rien à finir.

## 14. Sur PC (à partir de 900 px)

Deux colonnes et Popote ouverte à droite, comme sur l'accueil. À gauche : le bloc « Pour finir le mois », les
virements, les postes. Au centre : « Les dernières opérations » en tableau (jour, libellé, étiquette, montant),
les opérations à ranger en tête. La mise en place et la banque gardent leur colonne unique, centrée.
Popote répond aux questions du budget : « On a dépensé combien au resto ce mois-ci ? » rend « **118 € sur 200 €**,
en 4 fois. Le plus gros : 41 €, samedi 7. » et le bouton « Voir les 4 opérations ».

## 15. Ce que l'API doit fournir

Le contrat appartient au socle. Chaque écriture suit la politique d'« Aujourd'hui » (§ 5) : clé d'opération, cible
et version explicites, rejouable sans doublon.

| N° | Besoin |
|---|---|
| B1 | **L'état du budget**, en un appel : posé ou non, où en est la mise en place ; le mois ; s'il est en pause (§ 11.5) ; « pour finir le mois » (montant, par jour, solde comptable, opérations en attente, ce qui est réservé et pour quoi, coussin) ; quand le compte a été lu et si cette lecture a plus de 24 heures ; le virement de chacun (montant, état, date, « prévu » ou figé) ; la proposition en attente (§ 12.1) ; les avances du mois ; les postes (dépensé, prévu) ; les charges fixes (passées, total) ; le nombre d'opérations à ranger ; l'état de l'accès à la banque (date de fin, panne) ; la situation de la bulle (§ 6) ; l'état de la tuile (§ 13). Les deux membres reçoivent le même contenu (B-C4). |
| B2 | **La mise en place** : lire et écrire le brouillon (revenus, charges par thème) ; la liste des thèmes, de leurs charges habituelles et des oublis fréquents (rendue par l'API, sans les charges déjà posées dans le foyer) ; les totaux « à deux » et par personne ; valider le budget. Un brouillon se reprend sur l'autre appareil ; il porte une version : une écriture sur une version périmée est refusée et rend le brouillon à jour, et valider exige la version du récapitulatif affiché. |
| B3 | **Les charges** : ajouter, modifier, retirer, avec la périodicité, le mois d'échéance et à qui elle est (à deux, ou à l'un des membres ; l'un ou l'autre peut poser et changer toute charge du foyer) ; une charge dite deux fois, par l'un ou par l'autre (même identité : thème, pastille ou libellé, propriétaire), n'en fait qu'une. Après la mise en place, changer une charge à deux crée une proposition (B11). Effet au mois suivant. |
| B4 | **Le partage** : les règles avec leurs montants, leur somme et la part du salaire de chacun, calculés par le serveur (arrondis compris) ; le même calcul à la demande pour deux pourcentages choisis (« Autre »), dont la réponse redit les pourcentages calculés ; choisir. L'écran ne calcule aucun montant et ne valide que des montants rendus pour les pourcentages affichés. |
| B5 | **La banque** : chercher une banque et sa caisse ; démarrer l'accord (crée une demande liée à la personne, à son foyer et à son adhésion, à durée courte et à usage unique ; rend l'adresse de la banque) ; échanger le jeton du retour contre une suite gardée côté serveur, puis reprendre la demande en cours après une reconnexion ou un rechargement ; lister les comptes (numéro masqué et référence opaque) ; choisir le compte ; l'avancement de la première lecture ; renouveler ; reprendre ; débrancher (coupe l'accès chez le prestataire et efface les données brutes ; l'historique validé reste) ; annuler les demandes et couper l'accès quand la personne quitte le foyer. Ni IBAN ni identifiant de la banque ne passent par l'écran ; rien n'est gardé des comptes non choisis ; l'historique d'avant le mois de la mise en place est effacé dès que les règles de libellé en sont tirées ; les demandes et leurs jetons sont effacés à leur expiration. |
| B6 | **Lire maintenant** (« Actualiser ») : lance une lecture, rend son état ; refuse poliment pendant la pause de 10 minutes. |
| B7 | **Les opérations à ranger** : la liste (identifiant, version, jour, libellé, montant et sens, étiquette proposée et sa nature, « en attente » comptées à part) ; les choix possibles (liste fermée, vérifiée par le serveur, selon le sens : § 8) ; corriger une étiquette, avec ou sans règle retenue ; valider une opération ou toutes celles montrées ; recorriger une opération validée tant que le point du mois ne l'est pas. |
| B8 | **Le virement** : dire « C'est fait » et « Pas encore fait » ; rappeler l'autre (un par jour, sans montant) ; répondre à « C'est le tien ? » (attribué quand les réponses s'accordent ; une attribution se corrige, avec son auteur et sa date) ; accepter sa part la première fois (« D'accord »), corriger son revenu. |
| B9 | **Dépense à la main et avance** : écrites par la validation d'un bloc de Popote ; une avance peut se répéter ; « Me rembourser plutôt » ; l'avance dite pour l'autre attend sa confirmation ; « pas deux fois » avant de noter ; le double paiement signalé après coup, les deux écritures gardées (« Payée deux fois ? ») ; annuler tant que le point du mois n'est pas validé. |
| B10 | **Le point du mois** : proposé à l'heure du serveur, avec ou sans lecture de la banque, en disant de quand datent les chiffres ; prévu contre dépensé par poste, le reste ou le manque, le coussin au centime, les choix possibles avec leurs montants calculés ; valider le mois suivant (une prévision jusqu'au 1er) ; changer la décision tant qu'elle peut l'être. |
| B11 | **Les réglages** : lire et changer revenus, partage, charges, avances répétées, règles d'étiquette retenues, durée de mémoire. Un changement qui touche aux virements crée une proposition : la lire, l'accepter, la refuser, la retirer ; une seule ouverte à la fois ; le dernier budget accepté vaut d'ici là. |
| B12 | **Popote dans le Budget** : répondre sur les postes, les opérations, les virements ; proposer les blocs « dépense », « avance », « charge », « étiquette » ; mener aux écrans du budget. Le modèle ne reçoit des opérations que la date, le montant et le libellé nettoyé, encadrés comme des données, jamais dans la consigne ; il peut recevoir toutes les charges du foyer, celles de chacun comprises ; les libellés ne sont pas écrits dans le journal des appels. À la voix, aucun montant n'est dit. |
| B13 | **Les rappels du budget** (§ 16) : envoyés par le serveur ; aucun écran de ce plan n'en dépend. |
| B14 | **Les opérations du mois** : « Les dernières opérations » (PC, § 14) et les opérations d'un poste (« Voir les 4 opérations »), avec leur étiquette et leur état. |

Les réponses du Budget ne sont jamais mises en cache : ni par le navigateur (`Cache-Control: no-store`), ni par le
service worker de l'appli installée.

## 16. Ce que le Budget demande aux rappels

Aucun rappel ne contient un montant, un libellé d'opération ni un solde. À la voix, un montant d'argent n'est
jamais dit : Popote l'affiche et dit « Je te l'affiche. » (« Aujourd'hui », § 7).

| Rappel | Quand | Texte |
|---|---|---|
| Budget à confirmer | quand l'autre a posé le budget | Sam a posé le budget : viens voir ta part. |
| Virement à faire | le 1er, 9 h | Nouveau mois : ton virement t'attend dans Popote. |
| Virement en retard | le 6, 9 h, une seule fois | Ton virement du mois n'est pas encore arrivé. |
| Rappel de l'autre | à sa demande | Sam te rappelle le virement du mois. |
| Opérations à ranger | après la lecture du soir, s'il y en a | Des opérations à ranger ce soir. |
| Accès à la banque | 7 jours avant la fin, puis le jour même | Ta banque va te redemander ton accord. |
| Le point du mois | le dernier jour, après la lecture du soir | Le mois est bouclé : on fait le point ? |

## 17. Points à confirmer

Choix que le prototype ne tranche pas. Le 13/11/2026, le propriétaire a demandé de retenir ce que la spec suppose,
qu'il relira ; B-C4 est tranché par lui.

| N° | Point | Ce que la spec suppose |
|---|---|---|
| B-C1 | Brancher aussi les comptes personnels | non pour l'instant ; l'écran du choix du compte montre l'option, décochée |
| B-C2 | Ce qui se passe par défaut à la fin du mois | s'il reste de l'argent : « Coussin » ; s'il en manque : pris sur le coussin s'il le couvre, sinon rien ne change et « Il manque N € » reste affiché, jusqu'à une décision acceptée par les deux |
| B-C3 | Durée de garde des opérations | 2 ans, puis elles sont effacées ; les totaux par mois restent |
| B-C4 | Qui voit quoi | **tranché le 13/11/2026** : chacun voit tout (revenus, charges à deux, charges de chacun, compte joint) ; l'un ou l'autre peut poser et changer les charges de chacun |
| B-C5 | Arrondi des parts | à l'euro supérieur (§ 4) |
| B-C6 | Jour du virement | le 1er du mois, « en retard » après le 5 ; pas de réglage |
| B-C7 | Reconnaître un virement | par le montant attendu, puis le nom dans le libellé ; sinon Popote demande (§ 7) |
| B-C8 | Textes et états que le prototype ne joue pas | la question « à deux, à toi, ou à Léa ? », « Elle tombe quand, la prochaine fois ? », « loyer, ou crédit ? », « Aucune charge à deux. », « À vous de voir. », « Il manque 42 € », « dépassé de », les états « En retard », « Reçu en partie », « À confirmer », « En attente de Léa », « Pas encore fait », « C'est le tien ? », « Le virement de Sam », « Pas une dépense à deux », « Remboursement d'avance », « Sam a posé le budget. », « Sam dit que tu as payé… », « L'électricité est déjà passée », « Payée deux fois ? », « 1 virement reçu, à départager », « Je calcule… », « Moitié-moitié, ou autre ? », « Léa vient de changer le budget. », « Dans le coussin », la bulle « Faire le point », la variante « s'est arrêté », le manque de fin de mois, le refus chez la banque, la confirmation « Léa verra toutes les opérations de ce compte. », « Débrancher ta banque ? », « Le budget est en pause. », « C'est proposé à Léa. », « Sam propose un changement. », « Léa a dit non », « Banque pas à jour », « Chiffres lus le… », les lignes « Avances » et « Ce que j'ai retenu » des réglages, les phrases de la tuile (§ 13), les rappels du § 16 : proposés par la spec |
| B-C9 | Quand le budget commence | le 1er du mois qui suit l'accord de l'autre (§ 4) |
| B-C10 | L'accord de l'autre | sa part et ses revenus sont à confirmer par lui avant tout virement ; ensuite, tout changement qui touche aux virements attend aussi son accord, la décision du point comprise (§ 12.1) |

Ce que le prototype montre autrement, et qui ne fait pas foi : le total « = 1 063 € » ne bouge pas quand on compare
avec « Moitié-moitié » (c'est 1 064 €) ; le début du mois est joué un lundi 2.

## 18. États communs, mouvement, accessibilité

- Les états communs (chargement, réveil, erreur, hors ligne, session expirée) sont ceux de la fondation du front
  (F18 à F21). Les écritures du Budget suivent les trois cas d'« Aujourd'hui » § 5, avec les mêmes textes :
  « En attente. », « Je vérifie… », « Pas sûr que ce soit noté. » et « Vérifier », « Pas noté. » et « Réessayer ».
- Le budget se charge : l'en-tête, Popote et la barre s'affichent tout de suite ; le bloc du haut, les virements et
  les postes ont leur forme vide, sans chiffre. Aucun montant n'est montré avant la réponse de l'API.
- Mouvement : celui du prototype, par Motion, avec les durées et les courbes des jetons. Les compteurs qui montent,
  le tampon « Validé » et les confettis respectent « mouvement réduit » (la valeur finale s'affiche d'un coup).
- Les montants sont du texte : « 1 062,40 € », espace insécable avant « € », virgule décimale, jamais une image.
- Les pastilles sont des boutons ; une pastille cochée s'annonce « Électricité, 60 euros, à deux, cochée ». Les
  icônes de thème portent le nom du thème et « fait » ou « en cours ». Les initiales ne sont jamais le seul
  signe : « à deux », « à toi » et « à Léa » sont dits au lecteur d'écran.
- La couleur ne porte jamais seule un sens : un poste dépassé dit « dépassé de 24 € », un écart porte son signe.
- Chaque changement sans changement d'écran (pastille cochée, étiquette corrigée, virement annoncé) est annoncé
  dans une région `status`. Cibles tactiles de 44 px au moins, même quand le dessin est plus petit (une étiquette
  de 36 px a une zone d'appui de 44 px, comme dans le prototype) ; tout se fait au clavier.
- Le focus après une action :

  | Action | Le focus va sur |
  |---|---|
  | Choisir « À deux », « À moi », « À Léa » (la ligne se ferme) | la pastille cochée |
  | « Rien ici », « C'est tout », « Rien d'autre » | le titre du thème suivant |
  | « C'est tout bon », « C'est bon » | le titre de l'étape suivante |
  | Choisir une étiquette (les choix se ferment) | l'étiquette de l'opération |
  | « Tout valider » (retour à `/budget`) | le titre du bloc du haut |
  | « C'est fait », « Pas encore fait », « Lui rappeler » | la ligne de son virement |
  | « Valider » dans un bloc de Popote | le message de confirmation de la feuille |
  | « D'accord », « Non » (ma part, une proposition) | la bulle, avec son nouveau texte |
  | Fermer une confirmation (« Non », « Annuler ») | le bouton qui l'avait ouverte |
  | Le retour de la banque | le titre de l'étape affichée (le choix du compte, ou l'erreur) |
  | La flèche de retour | l'élément qui avait mené à l'écran quitté, sinon le titre de l'écran |

- Rien du budget (montants, libellés, charges) n'est gardé dans le navigateur : ni stockage local ou de session, ni
  IndexedDB, ni cache du service worker. L'adresse de retour de la banque est nettoyée dès que son jeton est
  échangé (§ 11.1) et ne reste pas dans l'historique.

## 19. Critères d'acceptation (scénarios au clic)

1. *Étant donné* un budget pas posé, *quand* Sam ouvre le Budget, *alors* la mise en place s'ouvre à « Revenus » ;
   après « 2 600 pour moi, 1 400 pour Léa », les deux lignes sont remplies et le thème Logement s'affiche.
2. *Quand* Sam touche « Électricité », tape 60 et choisit « À deux », *alors* la pastille est cochée avec les deux
   initiales et « À deux, par mois » vaut 60 €. Sans choix (« à deux », « à moi », « à Léa »),
   rien n'est coché. *Quand* il pose « Prêt personnel, 300 » et choisit « À Léa », *alors* la pastille porte
   l'initiale de Léa, « À toi, par mois » ne bouge pas, et le récapitulatif montre une ligne « À Léa ».
3. *Quand* Sam dit « copro 240 par trimestre : à deux », *alors* la pastille Copropriété affiche 80 € et Popote dit
   qu'elle compte 80 € par mois.
4. *Étant donné* « Loyer ou crédit » posé dans Logement, *alors* le thème Crédits montre « Crédit du logement »
   déjà coché, en pointillés, et le total « À toi » n'a pas bougé.
5. *Quand* Sam touche « Rien ici » sur Enfants et animaux, *alors* la carte des oublis s'affiche, sans aucune charge
   déjà posée.
6. *Quand* Sam touche « C'est tout bon », *alors* le budget est posé ; fermer l'appli avant ne pose rien, et la
   rouvrir reprend au même thème, avec ce qui était coché.
7. *Quand* Sam passe de « Selon les revenus » à « Moitié-moitié », *alors* les montants affichés sont ceux rendus par
   l'API (532 € chacun) et la part du salaire de chacun change.
8. *Quand* Sam revient de sa banque avec son accord, *alors* aucun compte n'est coché d'avance, il choisit le compte joint
   et la première lecture s'affiche ; *quand* il revient après un refus, ou avec une adresse de retour rejouée, *alors* rien n'est branché.
9. *Le 1er du mois*, la bulle de Sam annonce 691 € ; « C'est fait » passe sa ligne à « Annoncé » ; après la lecture
   du soir qui contient son virement, elle dit « Reçu le 2 ». « Lui rappeler » envoie à Léa un rappel sans montant.
10. *Étant donné* quatre opérations à ranger, *quand* Sam corrige une étiquette, *alors* Popote dit ce qu'elle
    retient ; « Tout valider » reste en pause tant qu'une opération est « À toi de dire » ; après validation, les
    postes ont monté et la bulle dit « Tout est rangé ! ».
11. *Quand* Sam dit qu'il a payé trois charges de son compte, *alors* le récapitulatif les liste avec leur total,
    rien n'est noté avant « Valider », et son virement du mois suivant baisse du total.
12. *Le dernier jour du mois*, le point montre chaque poste et le reste ; « Verser moins » affiche les deux
    virements du mois suivant, calculés par l'API ; « Valider décembre » les enregistre.
13. *Étant donné* Léa, *alors* son écran montre son virement d'abord, les mêmes postes et le même solde ;
    dans les réglages, elle voit et peut changer les charges « à moi » de Sam comme les siennes.
14. *Quand* la banque ne répond pas, *alors* l'écran garde les chiffres de la dernière lecture avec leur date, le
    dit, et tout le reste marche.
15. *Négatif :* un libellé d'opération qui contient une consigne est affiché tel quel, classé « À toi de dire », et
    rien d'autre ne change. Popote ne peut ni payer, ni virer, ni brancher une banque à la place de la personne.
16. *Négatif :* aucun rappel, aucune notification ne contient un montant ; à la voix, aucun montant n'est dit.
17. *Étant donné* le budget posé par Sam, *quand* Léa ouvre le Budget pour la première fois, *alors* elle voit sa
    part et « D'accord » ; avant son accord, sa ligne dit « À confirmer » et aucun rappel de virement ne part pour
    elle. Une avance que Sam dit pour elle ne change rien avant qu'elle la confirme.
18. *Quand* Sam annule une dépense en liquide notée par erreur, *alors* le poste et son virement suivant reviennent à
    leur valeur d'avant.
19. *Sans banque branchée*, « C'est fait » tient lieu de reçu, le bloc du haut dit « Pour finir novembre », et tout
    le reste marche.
20. *Sur téléphone (390 px)*, chaque écran correspond à sa capture de référence ; *sur PC*, l'écran Budget correspond
    à la capture `50-pc.png`, et les autres écrans suivent la règle du § 14.
21. *Quand* Léa quitte le foyer, *alors* l'écran de Sam dit « Le budget est en pause. », aucun virement n'est
    demandé, et une demande d'accord bancaire commencée par Léa n'a plus aucun effet.
22. *Quand* Sam passe l'électricité à 65 €, *alors* aucun virement ne change avant le « D'accord » de Léa ; après,
    les virements de décembre sont 694 € et 374 € ; « Non » retire la proposition.
23. *Étant donné* un débit de 691 € sur le compte joint, *alors* « Le virement de Sam » n'est pas proposé ; chaque
    montant d'opération porte son signe.
24. *Quand* Sam et Léa ajoutent chacun « Internet, 30 €, à deux » au même moment, *alors* le budget n'a qu'une
    charge Internet, et celui dont l'écran était périmé voit le brouillon rechargé avant de pouvoir valider.
25. *Quand* l'électricité avancée par Sam passe aussi sur le compte joint, *alors* les deux paiements restent et
    Popote demande « Payée deux fois ? ».
26. *Quand* Sam débranche la banque, *alors* les opérations déjà rangées et les totaux des mois restent visibles de
    Léa.
