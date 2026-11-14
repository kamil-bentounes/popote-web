# Le monde « Budget » : le plan du front

**Spec :** `docs/superpowers/specs/2026-11-13-monde-budget-design.md`. **Référence visuelle :**
`.design/budget/prototype.html` et `.design/budget/captures/`. **Style :** `.design/systeme/`.

Ce plan ne couvre que les écrans, dans `popote-web`. Il ne fait ni l'API, ni la lecture bancaire, ni l'assistant.

## Ce que ce plan attend, sans le faire

- **Le plan de fondation du front** (`docs/superpowers/plans/2026-11-13-fondation-du-front.md`, F1 à F25) : routeur
  et coque, client généré, garde de session, composants du système « Jeu », marmite, mouvement, feuille, confettis,
  états communs.
- **Le parcours « Aujourd'hui »** (H1 à H9) : la barre « Parle-moi, ou écris » dans la coque (H1), la feuille de
  Popote et ses blocs typés (H5), le mode vocal (H7), la politique de mutation et ses trois cas. Le Budget les
  réutilise, il ne les refait pas.
- **Les besoins B1 à B15 de la spec (§ 15)** : leur contrat et leur plan appartiennent au socle, prestataire de
  lecture bancaire compris. Chaque tâche les cite ainsi : « B7, plan du socle ». Aucune tâche d'ici ne les code. Une
  tâche ne démarre que quand ses routes sont dans le contrat.
- **L'épargne et les projets** : pas de parcours encore ; « Un projet » mène à la page d'attente « Bientôt ».

**Ordre :** G1, G2, puis G3 et G4 en parallèle, G5, puis G6 et G7 en parallèle, G8, G9, G10, G11 (les comptes perso, après
G5 à G8 et G10), G12. Une tâche, une
demande de fusion, 400 lignes visées ; les coupes prévues sont écrites.

## Règles valables pour chaque tâche

- Charger avant de coder les skills qui s'appliquent (`building-frontends`, `securing-code`, `handling-errors`,
  `protecting-personal-data`, `writing-tests`, `writing-commits`, `opening-pull-requests`).
- Les textes de l'écran sont ceux de la spec, au mot près. Un texte qui manque se demande, il ne s'invente pas.
- **L'écran ne calcule aucun montant** : parts, arrondis, « pour finir le mois », « par jour », écarts, virements du
  mois suivant, totaux des deux compteurs de la mise en place et montants du partage « Autre » viennent de l'API
  (B1, B2, B4, B10), le reste à reprendre ou à déduire compris. Aucune addition de montants côté écran, et rien de
  « Mon compte » (B15) n'entre dans un montant du budget commun : l'écran n'additionne rien venant d'un compte perso, et
  les montants de « Mon compte » (prévu, dépensé, reste) viennent aussi de l'API.
- Les montants s'affichent par une seule fonction (`Intl.NumberFormat('fr-FR')`, deux décimales seulement quand il
  y a des centimes, espace insécable avant « € »), testée ; aucun montant n'est formaté ailleurs.
- **Rien du budget ne reste dans le navigateur** (montants, libellés, charges, brouillon de mise en place) : ni
  stockage local ou de session, ni IndexedDB, ni cache du service worker (les routes du Budget en sont exclues, et
  leurs réponses portent `Cache-Control: no-store`, à vérifier avec le socle et F22). Le brouillon vit côté serveur
  (B2). Un test le vérifie après chaque scénario, sur les quatre.
- Les libellés d'opérations et les noms de charges sont rendus comme du texte, jamais comme du HTML ; les phrases
  de Popote arrivent en segments typés (spec « Aujourd'hui » § 6).
- Aucune couleur, taille, rayon ni durée en dur : tout vient des jetons. Aucun composant hors du système.
- Chaque écran est livré en 390 px et en 1440 px, avec ses états de la spec. En 390 px, sa capture Playwright est
  posée à côté de la capture de référence dans la demande de fusion. En 1440 px, seule la capture `50-pc.png`
  (l'écran Budget) sert de référence ; les autres écrans suivent la règle de la spec § 14 et sont relus à l'œil.
- Chaque écriture suit la politique de mutation d'« Aujourd'hui » (spec § 5, plan : règles communes) : clé
  d'opération, cible et version explicites, les trois cas en attente, incertain, refusé, avec leurs tests.
- Les points de la spec § 17 sont retenus tels que la spec les suppose (décision du propriétaire, 13/11/2026 ; B-C4
  est tranché : chacun voit tout ; B-C1, B-C2, B-C3 et B-C6 sont tranchés le 14/11/2026 ; B-C11 à B-C17 sont supposés par
  la spec). Il les relira : un point qu'il change rouvre la tâche concernée.
- Tout changement sans changement d'écran est annoncé dans une région `status` ; le focus suit la spec § 18.
- À la voix, aucun montant n'est dit : Popote l'affiche et dit « Je te l'affiche. » Chaque tâche qui passe par
  Popote le teste.
- Les rappels (B13) sont envoyés par le serveur : aucune tâche de ce plan ne les code (leurs textes, prénoms permis et
  jamais de montant, sont au § 16 de la spec).

## Hypothèses à vérifier avant G5

- Le passage chez la banque quitte l'appli (navigation de premier niveau, pas de cadre intégré, vers une adresse en
  `https` rendue par B5) et y revient par `/budget/banque/retour`. La politique de sécurité du contenu de la fondation (F23) n'a pas à s'ouvrir : aucune
  ressource de la banque ou du prestataire n'est chargée dans Popote. À vérifier avec le socle.
- Dans l'appli installée sur iPhone, le retour de la banque peut s'ouvrir dans le navigateur et non dans l'appli :
  l'écran de retour doit marcher dans les deux cas. La demande d'accord est liée à la personne, à son foyer et à son
  adhésion, pas au navigateur : sans session, l'écran demande de se connecter puis reprend la demande depuis le
  serveur (spec § 11.1). Le socle le mesure sur un vrai appareil.
- La liste des banques et des caisses vient du prestataire, par l'API (B5) : l'écran n'en garde aucune copie.
- Un compte perso a son consentement (B15) : le socle dit si le prestataire permet plusieurs comptes par passage chez la
  banque, et comment il compte les quatre lectures par 24 h sans la personne (par consentement ou par compte). L'écran
  n'en dépend pas ; avant G11, la spec § 11.3 et § 11.6 suppose un consentement par passage, quatre lectures partagées.

---

### G1 : L'écran Budget en lecture

**Pourquoi :** spec § 3, § 6, § 13. **Dépend de :** H1, H2 ; B1, plan du socle.

- [ ] Les routes du § 3 ; `/budget` redirige vers `/budget/poser` tant que le budget n'est pas posé.
- [ ] L'en-tête, la bulle, ses neuf situations et ses deux cas à part (budget en pause, proposition à accepter), le bloc « Pour finir le mois » (dont le cas négatif), les deux
  virements et leurs états en lecture, les postes et la ligne des charges fixes, les formes vides ; le premier mois
  (aucun virement) ; le budget sans banque ; « Le budget est en pause. » (spec § 11.5) ; « Le budget commence le 1er décembre » ; les
  montants « prévus » ; le virement du mois suivant dès le 29, nommé par son mois (« Ton virement de décembre ») ; les
  sommes mises de côté (« …et 60 € à décider ») ; la ligne « Mon compte » (seulement quand un compte perso est branché,
  B15).
- [ ] La tuile Budget de l'accueil rend les dix états du § 13, sans mise en avant : G1 fournit ces états à la
  tuile d'« Aujourd'hui » (H2), qui ne garde plus sa phrase provisoire.
- Tests : chaque ligne des tableaux § 6 et § 13 ; un poste dépassé (texte « dépassé de », pas seulement la
  couleur) ; un montant avec et sans centimes ; la vue de l'autre membre (son virement d'abord, les mêmes
  postes et le même solde) ; sans banque : pas de « Lu à », pas d'« Actualiser », le bloc dit « Pour
  finir novembre » ; aucun chiffre avant la réponse de l'API ; une lecture de plus de 24 heures : la tuile dit
  « Banque pas à jour », sans montant ; le budget en pause : aucun virement, aucun bouton ; la bulle du 29 (« Décembre se prépare ») puis du 1er
  (« Nouveau mois ») ; un virement du mois suivant reçu avant le 1er : le montant de « Pour finir novembre » est celui
  de l'API, l'écran ne retranche rien ; « Mon compte » absente sans compte perso, présente avec son compteur
  d'opérations à ranger ; la proposition de l'autre pour le reste du mois en priorité 2.

### G2 : Poser le budget : revenus et thèmes

**Pourquoi :** spec § 5.1, § 5.2. **Dépend de :** G1, F14, F16 ; B2 et B3, plan du socle. **Coupe prévue :** les
étapes et les revenus (G2a) ; la carte de thème, les pastilles et la ligne ouverte (G2b) ; la charge déjà dite
ailleurs et la reprise du brouillon (G2c).

- [ ] Les quatre étapes ; les revenus ; la rangée des sept thèmes ; la carte, son bouton à trois libellés, les
  pastilles rendues par l'API ; la ligne ouverte (montant, périodicité, mois d'échéance pour une charge qui ne
  tombe pas chaque mois, « À deux », « À moi » ou « À Léa », sans choix fait d'avance) ; « loyer, ou crédit ? » ; la pastille cochée, corrigée, retirée ; les deux compteurs.
- [ ] Une charge à cheval sur deux thèmes : déjà cochée, en pointillés, comptée une fois.
- [ ] Le brouillon : quitter et revenir, sur le même appareil et sur un autre ; sa version, le refus d'une écriture
  périmée, « Léa vient de changer le budget. » et le rechargement.
- Tests : chaque thème ; « Rien ici », « C'est tout », « Rien d'autre » ; un montant refusé (0, négatif, trop
  grand, lettres) ; une périodicité par trimestre et par an (le montant par mois affiché est celui de l'API) ; sans
  choix « à deux », « à moi » ou « à Léa » : rien n'est coché ; une charge « à Léa » porte son initiale et ne
  compte pas dans « À toi, par mois » ; revenir à un thème passé ; un nom de charge contenant du HTML
  s'affiche tel quel ; le nom accessible d'une pastille cochée ; la cible d'une pastille fait au moins 44 px ; deux
  « Assurance auto » de montants différents restent deux charges ; rien dans le stockage du navigateur ; à deux
  navigateurs, la même charge ajoutée des deux côtés n'en fait qu'une, et l'écran périmé se recharge.

### G3 : Poser le budget en parlant

**Pourquoi :** spec § 5 (vrac), § 5.2 (« le dire »). **Dépend de :** G2, H5 ; B2, B12, plan du socle.

- [ ] Une phrase dite dans la barre coche les pastilles une à une ; une charge sans pastille en gagne une ; la
  question « à deux, à toi, ou à Léa ? » quand l'information manque ; le vrac qui range dans les thèmes.
- Tests : une phrase à cinq charges ; une charge dans un thème qui n'est pas affiché ; une information manquante ;
  une réponse de l'assistant qui ne correspond à aucune charge possible (rien n'est coché) ; une consigne glissée
  dans un nom de charge est traitée comme un nom.

### G4 : Les oublis, le récapitulatif, le partage

**Pourquoi :** spec § 5.3, § 5.4. **Dépend de :** G2, F16 ; B2, B4, plan du socle.

- [ ] La carte « On oublie souvent » ; le récapitulatif en ticket, avec une ligne par personne qui a des charges à elle ; « C'est tout bon » (tampon, confettis) et
  « Modifier » ; le cas « aucune charge à deux ».
- [ ] Le partage : les trois choix, la barre, les montants, leur somme et les parts de salaire rendus par l'API,
  « Autre » et ses deux curseurs liés (un appel à B4 à chaque arrêt ; pendant le calcul, « Je calcule… » et
  « C'est bon » en pause ; on ne valide que des montants rendus pour les pourcentages affichés), « C'est bon ».
- Tests : la liste des oublis ne contient aucune charge posée ; « C'est tout bon » n'enregistre qu'une fois (double
  appui) ; fermer avant ne pose rien ; les montants du partage sont ceux de l'API, au centime ; un revenu à 0 ;
  « Autre » : deux parts qui font toujours 100, au clavier aussi, et une réponse lente de B4 ne remplace pas une
  plus récente et ne permet pas de valider pendant le calcul, au clavier non plus ; deux revenus à 0 (« Selon les
  revenus » absent, aucune règle choisie d'avance, « C'est bon » en pause) ; un récapitulatif périmé est réaffiché
  avant « C'est tout bon » ; mouvement réduit.

### G5 : Brancher la banque

**Pourquoi :** spec § 5.5, § 11.1, § 11.2. **Dépend de :** G1 ; B5, plan du socle ; les hypothèses ci-dessus.
**Coupe prévue :** la banque, la caisse et les promesses (G5a) ; le retour, le choix du compte et la première
lecture (G5b).

- [ ] Les six étapes du § 11.1, dont la confirmation « Léa verra toutes les opérations de ce compte. » ; « Plus
  tard » ; les échecs du retour (refus, délai, aucun compte).
- [ ] `/budget/banque/retour` : ne fait rien sans le jeton de la demande d'accord, liée à la personne, à son foyer
  et à son adhésion ; échange ce jeton avant toute autre requête, puis nettoie l'adresse ; sans session, demande la
  connexion puis reprend la demande depuis le serveur, sans jamais recopier le jeton dans une adresse ; ne garde
  aucun paramètre de la banque dans l'historique ni dans le stockage. L'écran ne part chez la banque que vers une adresse en
  `https`.
- Tests : une banque sans caisse (l'étape 2 est sautée) ; la recherche sans résultat ; le retour réussi ; le retour
  rejoué, sans jeton, avec le jeton d'une autre personne, jeton expiré : rien n'est branché ; session expirée ou
  retour dans un autre navigateur : après connexion, la demande reprend et le compte se choisit ; avec un serveur
  simulé, l'échange du jeton passe sans session, les routes suivantes répondent `401` sans elle, et le retour après
  connexion pointe sur l'adresse déjà nettoyée ; recharger la
  page du retour reprend au même endroit ; la personne a quitté le foyer entre-temps : rien n'est branché ; aucun
  compte n'est coché d'avance et le bouton est en pause sans choix ; une adresse de
  départ qui n'est pas en `https` est refusée ;
  la liste ne propose aucun compte perso dans ce parcours ; l'avancement de la première lecture ; la navigation « retour » du navigateur
  après le retour de la banque.

### G6 : Le virement du mois

**Pourquoi :** spec § 4 (calendrier), § 6 (variante de début de mois), § 7, § 12.1. **Dépend de :** G1 ; B8, plan du socle.

- [ ] « C'est fait », « Pas encore fait », « Annoncé » (et « vu sur ton compte perso »), « Reçu le », « Reçu en partie », « En retard », « Lui
  rappeler », « C'est le tien ? » (attribué quand les réponses s'accordent, « 1 virement reçu, à départager »
  d'ici là), « Le mois est payé ! » ; le bloc « Sur le compte joint » et ses quatre lignes.
- [ ] L'accord de l'autre : « Sam a posé le budget. », « D'accord », « Voir le détail » (corriger son revenu),
  l'état « À confirmer » ; une proposition reçue : « Sam propose un changement. », « D'accord », « Non ».
- [ ] Le calendrier (spec § 4, § 7) : le virement du mois suivant et son mois nommé dès le 29 (le dernier jour du mois
  sans 29), l'état « à verser » dès ce jour, « en retard » après le 5, la variante de début de mois avec un virement
  reçu avant le 1er. Les dates viennent de l'API (B1), jamais de l'appareil.
- Tests : chaque état ; « Lui rappeler » en pause après un envoi ; l'écran de l'autre membre ; double appui sur
  « C'est fait » ; la variante de début de mois disparaît le 6 et sans banque ; avant l'accord de l'autre, aucun
  bouton de virement pour lui ; deux virements du même montant, un seul arrivé : annoncé par un seul, par les deux,
  réponses qui s'accordent ou non ; une proposition refusée ne change aucun virement ; les trois cas de la
  politique de mutation ; le 29 (et le 28 en février d'une année sans 29) le virement du mois suivant est affiché avec
  son mois ; le 28, le virement affiché est « prévu » ; un virement reçu le 30 : « Reçu », et la variante de début de
  mois du 1er dit « Pour tout décembre » si les deux le sont ; « Annoncé, vu sur ton compte perso » ; « Pas encore
  fait » défait une coche automatique.

### G7 : Les opérations à ranger

**Pourquoi :** spec § 8. **Dépend de :** G1 ; B7 et B14, plan du socle.

- [ ] La liste, le signe de chaque montant, les trois natures d'étiquette, les choix (selon le sens), la phrase de ce que Popote retient, « Encore N à dire »,
  l'opération en attente, « Tout valider », le retour à l'écran Budget ; recorriger une opération validée (B14).
- Tests : corriger une étiquette, avec la règle retenue ; une opération « À toi de dire » bloque « Tout valider » ;
  un crédit ne propose aucun poste, un débit ne propose aucun « Le virement de… » ;
  l'autre membre a déjà rangé une opération (liste périmée : seul le reste est rangé, l'écran se met à jour) ; un
  libellé contenant du HTML ou une consigne est affiché tel quel ; une liste vide ; une longue liste (le bouton du
  bas ne masque pas la dernière ligne) ; les trois cas de la politique de mutation ; mouvement réduit.
- La liste prévoit la section « Mon compte » du titulaire seul (spec § 8.1) : G7 laisse la place et réutilise ses
  composants, G11 la remplit.

### G8 : Dépense en liquide, avance

**Pourquoi :** spec § 9. **Dépend de :** G1, G7 (« Remboursement d'avance »), H5 ; B9, B12, plan du socle.

- [ ] Les blocs « dépense » et « avance » dans la feuille de Popote ; « Valider », « Modifier », « Me rembourser
  plutôt » ; la question « je le refais chaque mois ? » ; la carte d'avance de l'écran Budget ; « pas deux fois » ; « Payée deux fois ? » et ses deux réponses ;
  annuler ; la confirmation par l'autre d'une avance dite pour lui.
- Tests : rien n'est noté avant « Valider » ; un bloc validé deux fois n'agit qu'une fois ; une avance plus grande
  que le virement ; l'avance dite pour l'autre membre ne change rien avant sa confirmation ; une charge déjà passée
  sur le compte joint ; une charge avancée qui passe ensuite sur le compte joint : les deux paiements restent ;
  l'avance retirée du bon virement (celui du mois s'il n'est ni annoncé ni reçu, sinon le suivant) ; annuler remet le poste et le virement ; à la voix, aucun montant n'est dit (« Je te
  l'affiche. »).

### G9 : Le point du mois

**Pourquoi :** spec § 10. **Dépend de :** G1, G7 ; B10, plan du socle.

- [ ] Les postes et leurs écarts, la ligne du coussin, le reste et ses trois réponses (« Le reprendre », « Le garder
  en coussin », « Le déduire ») avec les parts de chacun rendues par l'API, la case « Toujours pareil », le manque et
  ses deux choix ; « Proposer », la proposition reçue (« Sam propose : », « D'accord », « Non », « Léa a dit non ») ;
  la somme mise de côté (« 60 € à décider ») ; le point proposé le 1er à l'heure du serveur, avec ou sans banque, et
  « Chiffres lus le… ; « Novembre est rangé ! » sans reste.
- [ ] La règle « Toujours pareil » appliquée toute seule : la phrase « comme d'habitude », sans question.
- Tests : reste, manque, pile ; un reste que l'arrondi ne rend à personne (aucune question) ; la somme reste mise de
  côté tant qu'ils n'ont pas répondu, sans autre relance ; un nouveau point avant la réponse : les deux restes dans la
  même question ; les parts de « Le reprendre » et « Le déduire » sont celles de l'API, au centime ; sans l'accord de
  l'autre aucun virement ne change, et un virement déjà préparé ne bouge jamais ; il ne peut plus accepter une fois le
  virement concerné annoncé ou reçu ; « Non » rend la question aux deux ; des opérations restent à ranger (renvoi) ;
  sans banque, le point est proposé le 1er à 0 h ; une opération du mois arrivée après le point compte dans le mois
  ouvert ; « Un projet » n'existe plus ; mouvement réduit.


### G10 : Les réglages, renouveler, la panne

**Pourquoi :** spec § 11.3, § 11.4, § 12. **Dépend de :** G2, G4, G5, G9 ; B6, B11, plan du socle.

- [ ] La liste des réglages et chacun de ses écrans, dont « Le reste du mois » et la ligne « Comptes perso » (son écran est
  G11) ; « Actualiser » et sa pause ; renouveler ; l'accès arrêté ; la
  banque qui ne répond pas ; débrancher (sa confirmation, ce qui reste), reprendre ; qui peut changer quoi et la
  proposition (« C'est proposé à Léa. », « En attente de Léa », « Retirer ma proposition », « Léa a dit non »). La ligne
  « Mémoire » dit 1 an.
- Tests : un changement accepté s'applique au premier virement pas encore préparé (avant le 29, celui du mois suivant ; après, le
  suivant ; un virement préparé ne bouge pas) ; changer « Le reste du mois » est une proposition ; la ligne « Mémoire »
  dit « 1 an » ; une seule
  proposition ouverte à la fois ; après « Débrancher », l'autre membre voit toujours les opérations rangées ; « Actualiser » pendant la
  pause ; chaque ligne du tableau § 11.4 ; débrancher demande confirmation ; reprendre par l'autre membre.

### G11 : Mon compte et les comptes perso

**Pourquoi :** spec § 7 (rapprochement), § 8.1, § 11.6, § 10 (« Reprise du reste »). **Dépend de :** G5, G6, G7, G8,
G10 ; B15, B7, B8, B9, B3, plan du socle. **Coupe prévue :** brancher, renouveler, débrancher (G11a) ; l'écran « Mon
compte », ses onglets et la ligne de l'écran Budget (G11b) ; le rangement du soir du compte perso, « Pas prévu » et
« Je l'ajoute à tes charges ? » (G11c) ; « C'était pour le foyer ? » et la question du virement (G11d).

Un compte perso suit **le même mécanisme que le compte joint** (spec § 8.1) : les composants de G1 (barres de poste,
« dépassé de »), de G2 (la ligne de charge) et de G7 (la liste à ranger, les étiquettes, « Tout valider ») sont
réutilisés, pas refaits.

- [ ] Brancher un compte perso : le parcours de G5 avec ses quatre différences (la liste sans le compte joint, un ou
  plusieurs comptes cochables et aucun d'avance, la confirmation « Léa verra les opérations de ce compte. », la
  promesse sans solde) ; la ligne « Comptes perso » des réglages ; renouveler ; débrancher (sa confirmation, ce
  qui reste : les charges « à moi » et les avances validées ; le budget perso redevient déclaratif) ; ce que voit
  l'autre (« Compte perso de Léa », sans bouton).
- [ ] « Mon compte » : les onglets « Moi » et « Léa » (celui de l'autre en lecture seule : aucun bouton), par thème
  le prévu, le dépensé, le reste, les charges fixes attendues pas encore passées, « Pas prévu », les dernières
  opérations avec l'avatar ; la ligne de l'écran Budget et son compteur ; sans compte perso, le budget perso reste
  déclaratif (rien de G11 n'apparaît).
- [ ] Le rangement du soir : la section « Mon compte » de l'écran des opérations à ranger (G7), pour le titulaire
  seul ; les étiquettes (ses charges « à moi », « Pas prévu », « À toi de dire », « C'était pour le foyer », « Mon
  virement vers le compte joint », « Autre ») ; « Tout valider » ; ce que Popote retient (propre aux comptes perso) ;
  « Je l'ajoute à tes charges ? » (récapitulatif, « Valider », « Modifier », « Non, juste cette fois »).
- [ ] « C'était pour le foyer ? » (« Oui, pour le foyer » ouvre le bloc de G8 ; « Non, c'est perso ») et « C'est ton
  virement vers le compte joint ? » (rapprochement non sûr).
- Tests : sans aucun compte perso, rien de G11 n'apparaît et tout le budget marche ; Léa ne peut ni renouveler ni
  débrancher le compte de Sam, ni ranger, corriger ou valider à sa place, ni répondre à sa place (aucun bouton, et un
  appel direct refusé par le serveur) ; après « Débrancher », plus aucune opération du compte, les charges « à moi »
  restent, l'avance validée reste sans libellé ; l'avatar et « compte de Léa » au lecteur d'écran ; un libellé
  contenant du HTML ou une consigne est affiché tel quel ; aucune opération perso dans un poste du foyer ni dans
  « Pour finir le mois » ; les montants de « Mon compte » sont ceux de l'API, au centime ; un poste perso dépassé dit
  « dépassé de » ; corriger une étiquette perso avec la règle retenue, qui ne touche pas le joint ; « Tout valider »
  bloqué par une opération perso « À toi de dire » ; une opération « Pas prévu » ajoutée aux charges perso fait monter
  le « prévu » ; le compteur « à ranger » d'une personne compte le joint et son compte perso, jamais celui de l'autre ;
  une question « C'était pour le foyer ? » compte dans « opérations à ranger » ; « Oui » : rien n'est noté avant
  « Valider », « Non » : rangée dans les charges « à moi » ou « Pas prévu » ; un accès perso arrêté ne change ni la
  bulle ni la tuile ; les trois cas de la politique de mutation ; mouvement réduit.


### G12 : Sur PC, les scénarios au clic et les captures

**Pourquoi :** spec § 14, § 19. **Dépend de :** toutes les tâches. **Coupe prévue :** le PC ; les scénarios 1 à 8 ;
les scénarios 9 à 40.

- [ ] Les deux colonnes à partir de 900 px, « Les dernières opérations » en tableau (B14), Popote à droite.
- [ ] Un scénario Playwright par critère d'acceptation, sur l'environnement d'essai, avec une banque d'essai aux
  réponses fixées, deux navigateurs pour les scénarios à deux personnes (9, 13, 17, 21, 22, 24, 26, 27, 28, 29, 30, 32, 33, 39, 40) et un assistant aux réponses
  fixées.
- [ ] Pour chaque écran et chaque état : une capture en 390 px, rangée à côté de sa capture de référence, et une en
  1440 px (référence : `50-pc.png` pour l'écran Budget seulement) ; en plus, à 320 px, en zoom 200 %, au clavier
  seul, avec `prefers-reduced-motion`, et un passage axe sans violation.
- [ ] Au lecteur d'écran, à la main, avec VoiceOver et Safari sur iPhone, puis NVDA et Firefox sur PC, trois
  parcours et leurs annonces attendues :
  1. Poser une charge : la pastille « Électricité, bouton » ; la ligne ouverte « Électricité, montant » ; les
     choix « À deux », « À moi », « À Léa » ; après le choix, le focus sur « Électricité, 60 euros, à deux,
     cochée » et l'annonce « À deux, par mois : 60 euros ».
  2. Ranger une opération : « CB BURGER EXPRESS 2341, moins 41 euros, estimé : Fast-food à emporter » ; les
     choix ; après le choix, le focus sur l'étiquette et l'annonce de ce que Popote retient ; « Tout valider »,
     puis le focus sur le titre du bloc du haut.
  3. Annoncer son virement : la bulle, « C'est fait, bouton » ; après l'appui, le focus sur la ligne « Ton
     virement, 691 euros, annoncé » et l'annonce « Merci ! Je regarde ce soir s'il est arrivé. »
- [ ] Revue adverse du monde entier par un agent à l'œil frais ; mise à jour de `docs/ETAT.md`.
