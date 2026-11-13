# Le monde « Budget » : la spec

Troisième parcours de la nouvelle appli. Il couvre l'argent du foyer : poser le budget, savoir combien chacun verse
sur le compte joint, lire ce compte chaque soir, ranger les opérations, et faire le point à la fin du mois.

- **Style :** le système « Jeu » (`.design/systeme/`). Aucun composant hors de ce système.
- **Prototype de référence :** `.design/budget/prototype.html` (film et moments rejouables) et ses captures dans
  `.design/budget/captures/`. Le prototype fait foi pour le dessin et le mouvement, cette spec fait foi pour les
  textes, les états, les règles de calcul et les données.
- **Côté API :** rien n'existe encore pour ce monde. Le § 15 liste ce que l'écran attend (B1 à B13) ; le contrat et le
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
| À deux ou à moi | Chaque charge est dite « à deux » ou « à moi » au moment où elle est posée. Il n'y a pas d'écran à part pour les charges personnelles. |
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
« à deux » ou « à moi ». Une charge qui ne tombe pas chaque mois porte aussi le **mois de sa prochaine échéance**.
Son montant par mois est le montant divisé par 1, 3 ou 12, arrondi au centime.

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
1 062,40 € ; en moitié-moitié, 1 064 €). Si les deux revenus valent 0, « Selon les revenus » n'est pas proposée.

**Gardé pour plus tard.** Une charge qui ne tombe pas chaque mois est comptée par mois, et la somme s'accumule sur
le compte joint jusqu'à l'échéance : la mensualité, multipliée par le nombre de mois écoulés depuis la dernière
échéance, mois en cours compris. Copropriété, 240 € par trimestre, prochaine échéance en janvier : 80 € gardés en
novembre, 160 € en décembre, 240 € en janvier ; quand elle passe, le gardé retombe à 0. Le mois de l'échéance, la
charge n'est comptée qu'une fois : le gardé la couvre. Une charge posée en cours de cycle n'a pas tout son gardé à
la première échéance : Popote dit ce qui manquera et l'ajoute aux virements de ce mois-là, selon le partage.

**Pour finir le mois.** Le solde lu du compte joint, moins ce qui est gardé pour plus tard, moins les charges fixes
du mois que Popote n'a pas encore **vues sur le compte** (une opération lui correspond, qu'elle soit déjà validée
ou encore « estimée »). Arrondi à l'euro inférieur. « Soit N € par jour » divise ce montant par le nombre de jours
qui restent, aujourd'hui compris, arrondi à l'euro inférieur. Exemple, vendredi 13 novembre : 379,30 € sur le
compte, dont 80 € gardés pour la copropriété, soit 299 € pour finir novembre, sur 18 jours : 16 € par jour.

**Le virement du mois.** Ce que la personne doit verser sur le compte joint ce mois-ci : sa part, moins ses avances
validées (au centime, § 9), plus ou moins la décision du point précédent (§ 10). Il peut porter des centimes
(588,60 €) et ne descend jamais sous 0 € : le reste est reporté au mois suivant.

| État | Quand |
|---|---|
| À verser | par défaut |
| Annoncé | la personne a touché « C'est fait » |
| Reçu | Popote a reconnu sur le compte des crédits dont la somme atteint le montant attendu ; un virement de 0 € est reçu d'office |
| En retard | ni annoncé ni reçu après le 5 du mois |

**Une avance.** Une dépense à deux payée par l'un, de son compte ou en liquide. Le compte joint lui doit cette somme.

**Le mois** est le mois civil, à l'heure de Paris. Une opération compte dans le mois de sa date.

**Le premier mois.** Le budget commence le 1er du mois qui suit sa mise en place (§ 17, B-C9). D'ici là, Popote lit
et range le mois en cours et montre les postes, mais ne demande aucun virement et ne fait pas de point.

**Sans banque branchée**, tout marche : les dépenses se disent à Popote ; « reçu » n'existe pas, un virement
annoncé en tient lieu ; « Pour finir le mois » part des virements annoncés, moins les dépenses notées, moins le
gardé et les charges fixes pas encore notées.

**Tant que l'autre n'a pas rejoint le foyer**, le budget se pose quand même ; sa ligne de virement dit « En attente
de Léa », et aucun rappel ne part pour elle.

## 5. Poser le budget (`/budget/poser`)

Une seule fois, par l'un des deux ; l'autre peut ouvrir l'écran et y dire ses charges à lui. En haut, quatre
étapes : **Revenus**, **Charges**, **Partage**, **Banque**. L'étape en cours est jaune, une étape faite est verte.
Quitter garde ce qui est dit : on reprend où on en était (B2).

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
  « À deux » ou « À moi ». Le choix ferme la ligne. Rien n'est coché d'avance : il faut choisir.
- *Le dire* : « Internet 30, assurance 12,40, copro 240 par trimestre : à deux. Le crédit, 450 : à moi. » Popote
  coche les pastilles une à une. Une charge qui n'a pas de pastille en gagne une. Si « à deux » ou « à moi » manque,
  Popote le demande avant de cocher : « **Internet, 30 €.** C'est à deux, ou à toi ? »

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

**Les charges « à moi » de l'autre.** Chacun dit les siennes, sur son téléphone. Celui qui pose le budget ne dit pas
celles de l'autre. Les pastilles cochées, la liste des oublis et le rapprochement « déjà dite ailleurs » ne
tiennent compte que des charges à deux et des charges « à moi » de la personne : rien ne laisse deviner les charges
de l'autre.

### 5.3 Les oublis, puis le récapitulatif

Après le dernier thème, Popote dit : « **7 thèmes passés.** Un dernier tour : les oublis. » La carte « **On oublie
souvent** » propose les charges fréquentes que le foyer n'a pas
dites, celles qui tombent une fois par an d'abord. Popote : « **Les oublis fréquents.** Surtout ce qui tombe une fois
par an. » La liste vient de l'API (B2) : elle ne contient jamais une charge déjà posée. Exemple : Taxe foncière,
Entretien de la voiture, Impôts, Eau, Vacances, Cadeaux. Le bouton dit « Rien de tout ça », puis « C'est tout ».

« La taxe foncière, 900 par an : à moi » coche la pastille à 75 € ; Popote : « **75 € par mois** à prévoir pour
elle. Autre chose ? » (« mis de côté » ne se dit que d'une charge à deux, gardée sur le compte joint.)

Puis le **récapitulatif** remplace la carte : un ticket « À deux », son total par mois et ses lignes (la périodicité
d'origine en petit : « 240 € par trimestre »), et une ligne « À toi » avec le total et le nombre de charges.
Popote : « **Voilà votre budget.** Léa dira ses charges à elle. Tout est juste ? » Deux boutons : « C'est tout
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
| Autre | deux curseurs liés, par pas de 1 % ; les montants sont recalculés par l'API à chaque arrêt (B4) ; **À vous de voir.** Dis-moi les deux parts. |

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

L'API choisit la situation (B1) ; l'écran ne trie rien.

**Le bloc du haut : « Pour finir novembre ».** Le montant en grand, puis : « Soit 16 € par jour. Sur le compte :
379,30 €, dont 80 € gardés pour la copropriété. » À droite, « Lu à 21 h » et le bouton « Actualiser » (§ 11.3). Si
le montant est négatif : le bloc passe en rouge clair, « **Il manque 42 €** pour finir novembre. », sans « par
jour ».

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
  « **691 € bien reçus.** » Si rien ne départage deux virements du même montant, Popote demande à chacun : « **Un
  virement de 532 € est arrivé.** C'est le tien ? » ; la première réponse suffit.
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
en haut : le libellé de la banque tel quel, le montant, le jour, et une étiquette.

| Étiquette | Sens | Ce que la personne fait |
|---|---|---|
| un poste, marqué « estimé » | Popote propose | rien si c'est juste ; touche l'étiquette pour la corriger |
| une charge fixe, marquée « charge du mois » | le montant et le libellé correspondent à une charge posée | rien, ou corriger |
| « À toi de dire » | Popote ne devine pas | choisir une étiquette |

- Popote : « Regarde si j'ai bon. Touche une étiquette pour la corriger. »
- Toucher une étiquette ouvre les choix : les postes, les charges fixes, « Le virement de Sam », « Le virement de
  Léa », « Remboursement d'avance », « Pas une dépense à deux » (un remboursement, une erreur), « Autre ».
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
- **Ce qui est à ranger.** Seulement les opérations datées du premier mois du budget ou d'après. L'historique lu au
  branchement (90 jours) sert à Popote pour apprendre les libellés ; il ne compte dans aucun poste et n'est jamais à
  ranger.
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

Après « Valider » : « Le compte joint te doit 20 €. Retirés de ton virement de décembre. » et la bulle : « **C'est
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
  « **L'électricité est déjà passée** sur le compte joint, le 10. » Si elle y passe après l'avance, l'opération
  arrive « À toi de dire », avec la question : « Tu m'avais dit l'avoir payée. **Laquelle je garde ?** »
- **Annuler.** Une dépense à la main ou une avance s'annule tant que le point du mois n'est pas validé : en le
  disant à Popote, ou depuis sa ligne dans « Les dernières opérations ». Le virement suivant est recalculé.
- On peut dire l'avance de l'autre (« Léa a payé le restaurant, 45 € ») : le récapitulatif nomme Léa. Rien ne change
  pour elle tant qu'elle ne l'a pas confirmée, dans sa bulle : « **Sam dit que tu as payé le restaurant, 45 €.**
  C'est ça ? »
- À la voix, un montant n'est jamais dit : Popote l'affiche et dit « Je te l'affiche. » (« Aujourd'hui », § 7).

## 10. La fin du mois : le point (`/budget/point`)

À partir de la lecture du soir du dernier jour du mois, Popote propose le point. « **Novembre est bouclé !** 60 € n'ont pas été
dépensés. » Pour chaque poste : dépensé sur prévu, et l'écart en pastille (« −30 » en vert, « +24 » en rouge) ; une
ligne « Charges fixes : 182,40 €, pile ».

**Il reste de l'argent.** « Les 60 € qui restent ? » avec trois choix, puis les virements du mois suivant :

| Choix | Popote dit | Effet |
|---|---|---|
| Coussin | **Un coussin.** Ils restent sur le compte, pour un mois plus cher. | rien ne change ; le coussin s'affiche dans « gardé » |
| Verser moins | **Verser moins.** 39 € de moins pour toi, 21 € de moins pour elle. | le reste est rendu selon la règle de partage, chaque baisse arrondie à l'euro inférieur : 652 € et 351 € en décembre |
| Un projet | « Bientôt » | hors périmètre |

Le bouton du bas dit « Choisis pour les 60 € » en pause, puis « Valider décembre » : « **Décembre est prêt !** Je
vous fais signe le 1er. »

**Il a manqué de l'argent.** « **Novembre a coûté 48 € de plus.** » Deux choix : « Verser plus » (réparti selon la
règle de partage, chaque hausse arrondie à l'euro supérieur, ajoutée au virement suivant) ou « Prendre sur le
coussin » (proposé seulement si le coussin le couvre).

- Les opérations encore à ranger se rangent d'abord : le point renvoie vers elles.
- Une opération du mois qui arrive après la validation du point compte dans le mois suivant ; sa ligne garde sa
  date.
- L'un des deux valide ; l'autre voit la décision dans sa bulle et peut la changer tant qu'aucun des deux virements
  du mois suivant n'est annoncé ni reçu.
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
   - **Une fois par soir.** Et quand tu touches « Actualiser ».
   - **Date, montant, libellé,** et le solde du compte. Rien d'autre.
   - **Tous les 6 mois**, ta banque te redemande ton accord.

   Popote : « Je t'envoie chez ta banque : **c'est elle qui te demande ton accord.** »
4. La personne donne son accord chez sa banque, hors de Popote, puis revient sur `/budget/banque/retour`.
5. « **Deux comptes !** Lequel je regarde ? » La liste des comptes rendus par la banque, par leurs quatre derniers
   chiffres. Le compte joint est à cocher ; un compte personnel dit : « Si tu le branches : vu par toi seul. »
   Bouton : « Brancher le compte joint », puis une confirmation : « **Léa verra toutes les opérations de ce
   compte.** C'est bien votre compte joint ? » avec « Oui, c'est lui » et « Non ». Rien n'est lu ni gardé des
   comptes qui ne sont pas choisis.
6. « Je lis vos 90 derniers jours… » avec une barre, puis : « **C'est branché !** Je lis ce que ta banque me
   donne. », « 212 opérations lues », le bouton « Voir mon budget », et : « **212 opérations.** Je les range ce
   soir, et tu valides. » Seules celles du premier mois du budget seront à valider (§ 8).

Le retour de la banque peut échouer : accord refusé (« **Tu as dit non à ta banque.** Rien n'est branché. » et
« Réessayer »), délai dépassé, aucun compte rendu. Dans chaque cas rien n'est branché, et « Plus tard » reste
possible.

**Le retour.** Au départ, l'API crée une demande d'accord liée à la personne, à durée courte et à usage unique, et
rend l'adresse de la banque ; l'écran ne s'y rend que si elle est en `https`. L'adresse de retour porte le jeton
de cette demande : un retour sans jeton, avec un jeton rejoué, expiré ou d'une autre personne n'a aucun effet. Le
retour peut s'ouvrir dans un autre navigateur que l'appli installée, ou après l'expiration de la session : l'écran
demande alors de se connecter, puis reprend la demande de la personne connectée, sans refaire le passage chez la
banque.

### 11.2 Qui a branché, qui voit

- Le compte joint est branché par l'un ; ses opérations et son solde sont vus des deux.
- L'accès appartient à celui qui l'a donné : lui seul peut le renouveler, changer de banque ou débrancher. Les
  réglages disent : « Compte joint, branché par Sam. Léa peut le reprendre. » Reprendre refait le parcours du
  § 11.1 avec l'accord de Léa, et remplace l'accès de Sam.
- Si celui qui a branché quitte le foyer ou supprime son compte, l'accès est coupé tout de suite ; l'autre voit la
  bulle « Mon accès à ta banque **s'est arrêté**. » et peut brancher à son tour.

### 11.3 Lire

- Chaque soir et chaque matin, Popote lit le compte. « Lu à 21 h » dit quand.
- « Actualiser » relit tout de suite, la personne étant là. Pendant la lecture, la flèche tourne ; le bouton est en
  pause 10 minutes après une lecture réussie.
- Les lectures sans la personne sont limitées à quatre par 24 heures par la règle des banques : l'écran n'en dépend
  pas, mais ne promet jamais « en direct ».
- Popote ne reçoit de la banque que la date, le montant et le libellé de chaque opération, et le solde.

### 11.4 Renouveler, tomber en panne, débrancher

| Situation | Ce qu'on voit |
|---|---|
| L'accès s'arrête dans 7 jours ou moins | la bulle de priorité 1 ; « Renouveler » refait l'accord chez la banque (étapes 3 et 4), puis : « **C'est reparti !** Jusqu'au 1er novembre 2027. » |
| L'accès est arrêté | la même bulle, « s'est arrêté » ; les chiffres restent ceux de la dernière lecture, datés |
| La banque ne répond pas | « Lu hier, 21 h » en rouge clair, marmite inquiète, « **Ta banque ne répond pas.** Tes chiffres datent d'hier soir. Je réessaie cette nuit. » ; rien n'est perdu, tout le reste marche |
| Débrancher (réglages) | une confirmation : « **Débrancher ta banque ?** Je garde ce qui est déjà rangé, je ne lis plus rien. » avec « Débrancher » et « Débrancher et effacer ce que j'ai lu » |

### 11.5 Quelqu'un quitte le foyer

Les règles du départ sont celles du parcours « Entrer ». Pour le Budget : les revenus, les charges « à moi » et les
avances de la personne partie sont effacés avec son compte ; son accès à la banque est coupé tout de suite ; les
opérations déjà rangées du compte joint restent, sans son nom. Le budget n'a plus de virement à calculer : l'écran
de celui qui reste dit « **Le budget est à reposer.** » avec « Reposer le budget », et rien d'autre ne bouge tant
qu'il ne l'a pas fait.

## 12. Les réglages du budget (`/budget/reglages`)

« **Réglages du budget.** Tout ce qu'on a posé ensemble est ici. Tu changes ce que tu veux. » Une liste :

| Ligne | Ce qu'elle dit | Ce qu'elle ouvre |
|---|---|---|
| Banque | « Caisse d'Épargne Bretagne Pays de Loire. Compte joint, branché par Sam. Léa peut le reprendre. Accès donné jusqu'au 12 mai 2027. » | « Renouveler », « Changer de banque », « Débrancher » (celui qui a branché) ; « Reprendre » (l'autre) |
| Partage | « Selon les revenus : Sam 65 %, Léa 35 % » | l'écran du § 5.4 |
| Revenus | « 2 600 € et 1 400 € nets par mois » | le sien seulement |
| Charges à deux | « 8 charges, 1 062,40 € par mois » | la liste par thème, avec les pastilles du § 5.2 |
| Charges perso | « Chacun les siennes » | les siennes seulement |
| Avances | « 3 charges payées par Sam, chaque mois » | arrêter une avance répétée |
| Ce que j'ai retenu | « 1 libellé appris » | retirer une règle d'étiquette |
| Mémoire | « Je garde vos opérations 2 ans » | § 17, B-C3 |

- Un changement de revenu, de partage ou de charge s'applique **à partir du mois suivant** : le virement du mois en
  cours ne change pas. Popote le dit. Exemple, l'électricité passe de 60 à 65 € : « **C'est changé.** À partir de
  décembre : toi 694 €, Léa 374 €. »
- Tout se change aussi en parlant (« l'électricité passe à 65 ») : Popote récapitule avant d'écrire.

### 12.1 Qui peut changer quoi, et l'accord de l'autre

| Chose | Qui la change | Ce que voit l'autre |
|---|---|---|
| Son revenu | soi seul (celui qui pose le budget peut le dire une première fois pour l'autre, à confirmer) | le nouveau montant et les nouvelles parts, dans sa bulle |
| Les charges à deux | l'un ou l'autre | la charge changée et les nouvelles parts, dans sa bulle |
| Ses charges « à moi » | soi seul | rien |
| La règle de partage | l'un ou l'autre ; elle ne s'applique que quand l'autre l'a acceptée | la demande, dans sa bulle |
| Une avance | celui qui l'a payée ; dite par l'autre, elle attend sa confirmation (§ 9) | la carte d'avance |
| L'accès à la banque | celui qui l'a donné | les réglages |

**La première fois.** Quand l'un a posé le budget, l'autre le découvre à sa première ouverture : « **Sam a posé le
budget.** Ta part : 372 € par mois. D'accord ? » avec « D'accord » et « Voir le détail » (ses revenus tels que Sam
les a dits, à corriger ; les charges à deux ; la règle). Tant qu'il n'a pas dit « D'accord », sa ligne de virement
dit « À confirmer », aucun rappel de virement ne part pour lui, et les montants des deux restent provisoires.

## 13. La tuile Budget de l'accueil

L'accueil (« Aujourd'hui », § 4.5) rend la tuile depuis un état typé (B1) ; cette spec remplace la phrase
provisoire « ce qui reste du mois ». L'ordre est celui de la bulle (§ 6). La tuile Budget n'est jamais « mise en
avant » : cette marque reste à la tuile Cuisiner (« Aujourd'hui », § 4.5).

| Priorité | État | Phrase |
|---|---|---|
| 1 | Budget pas posé | À régler ensemble |
| 2 | Accès à la banque à renouveler ou arrêté | Banque à renouveler |
| 3 | Ma part à confirmer | Ta part à confirmer |
| 4 | Point du mois à faire | Le point de novembre |
| 5 | Mon virement à verser ou en retard | Ton virement : 691 € |
| 6 | Opérations à ranger | 4 opérations à ranger |
| 7 | Sinon | 299 € pour finir novembre |

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
| B1 | **L'état du budget**, en un appel : posé ou non, où en est la mise en place ; le mois ; « pour finir le mois » (montant, par jour, solde, gardé et pour quoi) ; quand le compte a été lu ; le virement de chacun (montant, état, date) ; les avances du mois ; les postes (dépensé, prévu) ; les charges fixes (passées, total) ; le nombre d'opérations à ranger ; l'état de l'accès à la banque (date de fin, panne) ; la situation de la bulle (§ 6) ; l'état de la tuile (§ 13). Chacun n'y reçoit que ce qu'il peut voir (§ 17, B-C4). |
| B2 | **La mise en place** : lire et écrire le brouillon (revenus, charges par thème) ; la liste des thèmes, de leurs charges habituelles et des oublis fréquents (rendue par l'API, sans les charges à deux déjà posées ni les charges « à moi » de la personne, jamais d'après celles de l'autre) ; les deux totaux « à deux » et « à toi » ; valider le budget. Un brouillon se reprend sur l'autre appareil. |
| B3 | **Les charges** : ajouter, modifier, retirer, avec la périodicité et le mois d'échéance ; une charge dite deux fois par la même personne (même libellé, thème lié) n'en fait qu'une, sans jamais rapprocher les charges « à moi » de deux personnes. Effet au mois suivant. |
| B4 | **Le partage** : les règles avec leurs montants, leur somme et la part du salaire de chacun, calculés par le serveur (arrondis compris) ; le même calcul à la demande pour deux pourcentages choisis (« Autre ») ; choisir ; accepter ou refuser la règle proposée par l'autre. L'écran ne calcule aucun montant. |
| B5 | **La banque** : chercher une banque et sa caisse ; démarrer l'accord (crée une demande liée à la personne, à durée courte et à usage unique ; rend l'adresse de la banque) ; finir l'accord au retour, y compris après une reconnexion ; lister les comptes ; choisir le compte ; l'avancement de la première lecture ; renouveler ; reprendre ; débrancher, avec ou sans effacement. Aucun identifiant bancaire ne passe par l'écran ; rien n'est gardé des comptes non choisis. |
| B6 | **Lire maintenant** (« Actualiser ») : lance une lecture, rend son état ; refuse poliment pendant la pause de 10 minutes. |
| B7 | **Les opérations à ranger** : la liste (identifiant, version, jour, libellé, montant, étiquette proposée et sa nature, « en attente » comptées à part) ; les choix possibles (liste fermée, vérifiée par le serveur) ; corriger une étiquette, avec ou sans règle retenue ; valider une opération ou toutes celles montrées ; recorriger une opération validée tant que le point du mois ne l'est pas. |
| B8 | **Le virement** : dire « C'est fait » et « Pas encore fait » ; rappeler l'autre (un par jour, sans montant) ; répondre à « C'est le tien ? » ; accepter sa part la première fois (« D'accord »), corriger son revenu. |
| B9 | **Dépense à la main et avance** : écrites par la validation d'un bloc de Popote ; une avance peut se répéter ; « Me rembourser plutôt » ; l'avance dite pour l'autre attend sa confirmation ; le rapprochement avec une opération du compte joint (« pas deux fois ») ; annuler tant que le point du mois n'est pas validé. |
| B10 | **Le point du mois** : prévu contre dépensé par poste, le reste ou le manque, les choix possibles avec leurs montants calculés ; valider le mois suivant ; changer la décision tant qu'elle peut l'être. |
| B11 | **Les réglages** : lire et changer revenus, partage, charges, avances répétées, règles d'étiquette retenues, durée de mémoire. |
| B12 | **Popote dans le Budget** : répondre sur les postes, les opérations, les virements ; proposer les blocs « dépense », « avance », « charge », « étiquette » ; mener aux écrans du budget. Le modèle ne reçoit des opérations que la date, le montant et le libellé nettoyé, encadrés comme des données, jamais dans la consigne ; il ne reçoit jamais les charges « à moi » ni les comptes personnels de l'autre ; les libellés ne sont pas écrits dans le journal des appels. À la voix, aucun montant n'est dit. |
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

Choix que le prototype ne tranche pas ; à confirmer par le propriétaire avant le code des tâches concernées.

| N° | Point | Ce que la spec suppose |
|---|---|---|
| B-C1 | Brancher aussi les comptes personnels | non pour l'instant ; l'écran du choix du compte montre l'option, décochée |
| B-C2 | Ce qui se passe par défaut à la fin du mois | s'il reste de l'argent : « Coussin » ; s'il en manque : « Prendre sur le coussin » s'il le couvre, sinon « Verser plus » |
| B-C3 | Durée de garde des opérations | 2 ans, puis elles sont effacées ; les totaux par mois restent |
| B-C4 | Qui voit quoi | les revenus des deux, les charges à deux, le compte joint : les deux ; les charges « à moi » et leur total : soi seul |
| B-C5 | Arrondi des parts | à l'euro supérieur (§ 4) |
| B-C6 | Jour du virement | le 1er du mois, « en retard » après le 5 ; pas de réglage |
| B-C7 | Reconnaître un virement | par le montant attendu, puis le nom dans le libellé ; sinon Popote demande (§ 7) |
| B-C8 | Textes et états que le prototype ne joue pas | la question « à deux, ou à toi ? », « Elle tombe quand, la prochaine fois ? », « loyer, ou crédit ? », « Aucune charge à deux. », « À vous de voir. », « Il manque 42 € », « dépassé de », les états « En retard », « Reçu en partie », « À confirmer », « En attente de Léa », « Pas encore fait », « C'est le tien ? », « Le virement de Sam », « Pas une dépense à deux », « Remboursement d'avance », « Sam a posé le budget. », « Sam dit que tu as payé… », « L'électricité est déjà passée », « Laquelle je garde ? », la bulle « Faire le point », la variante « s'est arrêté », le manque de fin de mois, le refus chez la banque, la confirmation « Léa verra toutes les opérations de ce compte. », « Débrancher ta banque ? », « Le budget est à reposer. », « C'est changé. », les lignes « Avances » et « Ce que j'ai retenu » des réglages, les phrases de la tuile (§ 13), les rappels du § 16 : proposés par la spec |
| B-C9 | Quand le budget commence | le 1er du mois qui suit sa mise en place (§ 4) |
| B-C10 | L'accord de l'autre | sa part et ses revenus sont à confirmer par lui avant tout virement (§ 12.1) |

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
  signe : « à deux » et « à toi » sont dits au lecteur d'écran.
- La couleur ne porte jamais seule un sens : un poste dépassé dit « dépassé de 24 € », un écart porte son signe.
- Chaque changement sans changement d'écran (pastille cochée, étiquette corrigée, virement annoncé) est annoncé
  dans une région `status`. Cibles tactiles de 44 px au moins ; tout se fait au clavier.
- Rien du budget (montants, libellés, charges) n'est gardé dans le navigateur : ni stockage local ou de session, ni
  IndexedDB, ni cache du service worker. L'adresse de retour de la banque est nettoyée dès sa lecture et ne reste
  pas dans l'historique.

## 19. Critères d'acceptation (scénarios au clic)

1. *Étant donné* un budget pas posé, *quand* Sam ouvre le Budget, *alors* la mise en place s'ouvre à « Revenus » ;
   après « 2 600 pour moi, 1 400 pour Léa », les deux lignes sont remplies et le thème Logement s'affiche.
2. *Quand* Sam touche « Électricité », tape 60 et choisit « À deux », *alors* la pastille est cochée avec les deux
   initiales et « À deux, par mois » vaut 60 €. Sans choix « à deux » ou « à moi », rien n'est coché.
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
8. *Quand* Sam revient de sa banque avec son accord, *alors* il choisit le compte joint et la première lecture
   s'affiche ; *quand* il revient après un refus, ou avec une adresse de retour rejouée, *alors* rien n'est branché.
9. *Le 1er du mois*, la bulle de Sam annonce 691 € ; « C'est fait » passe sa ligne à « Annoncé » ; après la lecture
   du soir qui contient son virement, elle dit « Reçu le 2 ». « Lui rappeler » envoie à Léa un rappel sans montant.
10. *Étant donné* quatre opérations à ranger, *quand* Sam corrige une étiquette, *alors* Popote dit ce qu'elle
    retient ; « Tout valider » reste en pause tant qu'une opération est « À toi de dire » ; après validation, les
    postes ont monté et la bulle dit « Tout est rangé ! ».
11. *Quand* Sam dit qu'il a payé trois charges de son compte, *alors* le récapitulatif les liste avec leur total,
    rien n'est noté avant « Valider », et son virement du mois suivant baisse du total.
12. *Le dernier jour du mois*, le point montre chaque poste et le reste ; « Verser moins » affiche les deux
    virements du mois suivant, calculés par l'API ; « Valider décembre » les enregistre.
13. *Étant donné* Léa, *alors* son écran montre son virement d'abord, les mêmes postes et le même solde, et aucune
    charge « à moi » de Sam, ni dans l'écran, ni dans une réponse de Popote.
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
20. *Sur PC (1440 px) et sur téléphone (390 px)*, chaque écran correspond à sa capture de référence.
