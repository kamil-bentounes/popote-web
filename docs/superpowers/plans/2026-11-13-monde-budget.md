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
- **Les besoins B1 à B14 de la spec (§ 15)** : leur contrat et leur plan appartiennent au socle, prestataire de
  lecture bancaire compris. Chaque tâche les cite ainsi : « B7, plan du socle ». Aucune tâche d'ici ne les code. Une
  tâche ne démarre que quand ses routes sont dans le contrat.
- **L'épargne et les projets** : pas de parcours encore ; « Un projet » mène à la page d'attente « Bientôt ».

**Ordre :** G1, G2, puis G3 et G4 en parallèle, G5, puis G6 et G7 en parallèle, G8, G9, G10, G11. Une tâche, une
demande de fusion, 400 lignes visées ; les coupes prévues sont écrites.

## Règles valables pour chaque tâche

- Charger avant de coder les skills qui s'appliquent (`building-frontends`, `securing-code`, `handling-errors`,
  `protecting-personal-data`, `writing-tests`, `writing-commits`, `opening-pull-requests`).
- Les textes de l'écran sont ceux de la spec, au mot près. Un texte qui manque se demande, il ne s'invente pas.
- **L'écran ne calcule aucun montant** : parts, arrondis, « pour finir le mois », « par jour », écarts, virements du
  mois suivant, totaux des deux compteurs de la mise en place et montants du partage « Autre » viennent de l'API
  (B1, B2, B4, B10). Aucune addition de montants côté écran.
- Les montants s'affichent par une seule fonction (`Intl.NumberFormat('fr-FR')`, deux décimales seulement quand il
  y a des centimes, espace insécable avant « € »), testée ; aucun montant n'est formaté ailleurs.
- **Rien du budget ne reste dans le navigateur** (montants, libellés, charges, brouillon de mise en place) : ni
  stockage local ou de session, ni IndexedDB, ni cache du service worker (les routes du Budget en sont exclues, et
  leurs réponses portent `Cache-Control: no-store`, à vérifier avec le socle et F22). Le brouillon vit côté serveur
  (B2). Un test le vérifie après chaque scénario, sur les quatre.
- Les libellés d'opérations et les noms de charges sont rendus comme du texte, jamais comme du HTML ; les phrases
  de Popote arrivent en segments typés (spec « Aujourd'hui » § 6).
- Aucune couleur, taille, rayon ni durée en dur : tout vient des jetons. Aucun composant hors du système.
- Chaque écran est livré en 390 px et en 1440 px, avec ses états de la spec, et sa capture Playwright posée à côté
  de la capture de référence dans la demande de fusion.
- Chaque écriture suit la politique de mutation d'« Aujourd'hui » (spec § 5, plan : règles communes) : clé
  d'opération, cible et version explicites, les trois cas en attente, incertain, refusé, avec leurs tests.
- Un point de la spec § 17 se confirme avec le propriétaire avant la tâche qui en dépend : B-C4 et B-C9 avant G1, B-C5 avant
  G4, B-C1 avant G5, B-C6, B-C7 et B-C10 avant G6, B-C2 avant G9, B-C3 avant G10, B-C8 avant chaque tâche qui pose un de
  ses textes.
- Tout changement sans changement d'écran est annoncé dans une région `status` ; le focus suit la spec § 18.
- À la voix, aucun montant n'est dit : Popote l'affiche et dit « Je te l'affiche. » Chaque tâche qui passe par
  Popote le teste.
- Les rappels (B13) sont envoyés par le serveur : aucune tâche de ce plan ne les code.

## Hypothèses à vérifier avant G5

- Le passage chez la banque quitte l'appli (navigation de premier niveau, pas de cadre intégré, vers une adresse en
  `https` rendue par B5) et y revient par `/budget/banque/retour`. La politique de sécurité du contenu de la fondation (F23) n'a pas à s'ouvrir : aucune
  ressource de la banque ou du prestataire n'est chargée dans Popote. À vérifier avec le socle.
- Dans l'appli installée sur iPhone, le retour de la banque peut s'ouvrir dans le navigateur et non dans l'appli :
  l'écran de retour doit marcher dans les deux cas. La demande d'accord est liée à la personne, pas au navigateur :
  sans session, l'écran demande de se connecter puis reprend la demande. Le socle le mesure sur un vrai appareil.
- La liste des banques et des caisses vient du prestataire, par l'API (B5) : l'écran n'en garde aucune copie.

---

### G1 : L'écran Budget en lecture

**Pourquoi :** spec § 3, § 6, § 13. **Dépend de :** H1, H2 ; B1, plan du socle.

- [ ] Les routes du § 3 ; `/budget` redirige vers `/budget/poser` tant que le budget n'est pas posé.
- [ ] L'en-tête, la bulle et ses neuf situations, le bloc « Pour finir le mois » (dont le cas négatif), les deux
  virements et leurs états en lecture, les postes et la ligne des charges fixes, les formes vides ; le premier mois
  (aucun virement) ; le budget sans banque ; « Le budget est à reposer. » (spec § 11.5).
- [ ] La tuile Budget de l'accueil rend les sept états du § 13, sans mise en avant.
- Tests : chaque ligne des tableaux § 6 et § 13 ; un poste dépassé (texte « dépassé de », pas seulement la
  couleur) ; un montant avec et sans centimes ; la vue de l'autre membre (son virement d'abord, aucune charge « à
  moi » de l'autre dans la réponse affichée) ; sans banque : pas de « Lu à », pas d'« Actualiser », le bloc dit « Pour
  finir novembre » ; aucun chiffre avant la réponse de l'API.

### G2 : Poser le budget : revenus et thèmes

**Pourquoi :** spec § 5.1, § 5.2. **Dépend de :** G1, F14, F16 ; B2 et B3, plan du socle. **Coupe prévue :** les
étapes et les revenus (G2a) ; la carte de thème, les pastilles et la ligne ouverte (G2b) ; la charge déjà dite
ailleurs et la reprise du brouillon (G2c).

- [ ] Les quatre étapes ; les revenus ; la rangée des sept thèmes ; la carte, son bouton à trois libellés, les
  pastilles rendues par l'API ; la ligne ouverte (montant, périodicité, mois d'échéance pour une charge qui ne
  tombe pas chaque mois, « À deux » ou « À moi », sans choix fait d'avance) ; « loyer, ou crédit ? » ; la pastille cochée, corrigée, retirée ; les deux compteurs.
- [ ] Une charge à cheval sur deux thèmes : déjà cochée, en pointillés, comptée une fois.
- [ ] Le brouillon : quitter et revenir, sur le même appareil et sur un autre.
- Tests : chaque thème ; « Rien ici », « C'est tout », « Rien d'autre » ; un montant refusé (0, négatif, trop
  grand, lettres) ; une périodicité par trimestre et par an (le montant par mois affiché est celui de l'API) ; pas de
  « à deux » ni « à moi » : rien n'est coché ; revenir à un thème passé ; un nom de charge contenant du HTML
  s'affiche tel quel ; le nom accessible d'une pastille cochée ; rien dans le stockage du navigateur.

### G3 : Poser le budget en parlant

**Pourquoi :** spec § 5 (vrac), § 5.2 (« le dire »). **Dépend de :** G2, H5 ; B2, B12, plan du socle.

- [ ] Une phrase dite dans la barre coche les pastilles une à une ; une charge sans pastille en gagne une ; la
  question « à deux, ou à toi ? » quand l'information manque ; le vrac qui range dans les thèmes.
- Tests : une phrase à cinq charges ; une charge dans un thème qui n'est pas affiché ; une information manquante ;
  une réponse de l'assistant qui ne correspond à aucune charge possible (rien n'est coché) ; une consigne glissée
  dans un nom de charge est traitée comme un nom.

### G4 : Les oublis, le récapitulatif, le partage

**Pourquoi :** spec § 5.3, § 5.4. **Dépend de :** G2, F16 ; B2, B4, plan du socle.

- [ ] La carte « On oublie souvent » ; le récapitulatif en ticket ; « C'est tout bon » (tampon, confettis) et
  « Modifier » ; le cas « aucune charge à deux ».
- [ ] Le partage : les trois choix, la barre, les montants, leur somme et les parts de salaire rendus par l'API,
  « Autre » et ses deux curseurs liés (un appel à B4 à chaque arrêt, le dernier appel gagne), « C'est bon ».
- Tests : la liste des oublis ne contient aucune charge posée ; « C'est tout bon » n'enregistre qu'une fois (double
  appui) ; fermer avant ne pose rien ; les montants du partage sont ceux de l'API, au centime ; un revenu à 0 ;
  « Autre » : deux parts qui font toujours 100, au clavier aussi, et une réponse lente de B4 ne remplace pas une
  plus récente ; deux revenus à 0 (« Selon les revenus » absent) ; mouvement réduit.

### G5 : Brancher la banque

**Pourquoi :** spec § 5.5, § 11.1, § 11.2. **Dépend de :** G1 ; B5, plan du socle ; les hypothèses ci-dessus.
**Coupe prévue :** la banque, la caisse et les promesses (G5a) ; le retour, le choix du compte et la première
lecture (G5b).

- [ ] Les six étapes du § 11.1, dont la confirmation « Léa verra toutes les opérations de ce compte. » ; « Plus
  tard » ; les échecs du retour (refus, délai, aucun compte).
- [ ] `/budget/banque/retour` : ne fait rien sans le jeton de la demande d'accord, liée à la personne ; sans
  session, demande la connexion puis reprend la demande ; ne garde aucun paramètre de la banque dans l'historique ni
  dans le stockage (l'adresse est nettoyée dès la lecture). L'écran ne part chez la banque que vers une adresse en
  `https`.
- Tests : une banque sans caisse (l'étape 2 est sautée) ; la recherche sans résultat ; le retour réussi ; le retour
  rejoué, sans jeton, avec le jeton d'une autre personne, jeton expiré : rien n'est branché ; session expirée ou
  retour dans un autre navigateur : après connexion, la demande reprend et le compte se choisit ; une adresse de
  départ qui n'est pas en `https` est refusée ; le
  compte personnel reste décoché ; l'avancement de la première lecture ; la navigation « retour » du navigateur
  après le retour de la banque.

### G6 : Le virement du mois

**Pourquoi :** spec § 6 (variante de début de mois), § 7, § 12.1. **Dépend de :** G1 ; B8, plan du socle.

- [ ] « C'est fait », « Pas encore fait », « Annoncé », « Reçu le », « Reçu en partie », « En retard », « Lui
  rappeler », « C'est le tien ? », « Le mois est payé ! » ; le bloc « Sur le compte joint » et ses quatre lignes.
- [ ] L'accord de l'autre : « Sam a posé le budget. », « D'accord », « Voir le détail » (corriger son revenu),
  l'état « À confirmer ».
- Tests : chaque état ; « Lui rappeler » en pause après un envoi ; l'écran de l'autre membre ; double appui sur
  « C'est fait » ; la variante de début de mois disparaît le 6 et sans banque ; avant l'accord de l'autre, aucun
  bouton de virement pour lui ; les trois cas de la politique de mutation.

### G7 : Les opérations à ranger

**Pourquoi :** spec § 8. **Dépend de :** G1 ; B7, plan du socle.

- [ ] La liste, les trois natures d'étiquette, les choix, la phrase de ce que Popote retient, « Encore N à dire »,
  l'opération en attente, « Tout valider », le retour à l'écran Budget ; recorriger une opération validée (B14).
- Tests : corriger une étiquette, avec la règle retenue ; une opération « À toi de dire » bloque « Tout valider » ;
  l'autre membre a déjà rangé une opération (liste périmée : seul le reste est rangé, l'écran se met à jour) ; un
  libellé contenant du HTML ou une consigne est affiché tel quel ; une liste vide ; une longue liste (le bouton du
  bas ne masque pas la dernière ligne) ; les trois cas de la politique de mutation ; mouvement réduit.

### G8 : Dépense en liquide, avance

**Pourquoi :** spec § 9. **Dépend de :** G1, G7 (« Remboursement d'avance »), H5 ; B9, B12, plan du socle.

- [ ] Les blocs « dépense » et « avance » dans la feuille de Popote ; « Valider », « Modifier », « Me rembourser
  plutôt » ; la question « je le refais chaque mois ? » ; la carte d'avance de l'écran Budget ; « pas deux fois » ;
  annuler ; la confirmation par l'autre d'une avance dite pour lui.
- Tests : rien n'est noté avant « Valider » ; un bloc validé deux fois n'agit qu'une fois ; une avance plus grande
  que le virement ; l'avance dite pour l'autre membre ne change rien avant sa confirmation ; une charge déjà passée
  sur le compte joint ; annuler remet le poste et le virement ; à la voix, aucun montant n'est dit (« Je te
  l'affiche. »).

### G9 : Le point du mois

**Pourquoi :** spec § 10. **Dépend de :** G1, G7 ; B10, plan du socle.

- [ ] Les postes et leurs écarts, le reste et ses trois choix, le manque et ses deux choix, « Valider décembre »,
  la décision vue et changée par l'autre.
- Tests : reste, manque, pile ; le défaut tant que le point n'est pas validé ; « Un projet » mène à « Bientôt » ; des opérations restent à ranger (renvoi) ; les
  virements du mois suivant sont ceux de l'API ; l'autre change la décision ; il ne le peut plus après « C'est
  fait » ; mouvement réduit.

### G10 : Les réglages, renouveler, la panne

**Pourquoi :** spec § 11.3, § 11.4, § 12. **Dépend de :** G2, G4, G5 ; B6, B11, plan du socle.

- [ ] La liste des réglages et chacun de ses écrans ; « Actualiser » et sa pause ; renouveler ; l'accès arrêté ; la
  banque qui ne répond pas ; débrancher (avec ou sans effacement), reprendre ; qui peut changer quoi (spec § 12.1).
- Tests : un changement s'applique au mois suivant (le virement en cours ne bouge pas) ; « Actualiser » pendant la
  pause ; chaque ligne du tableau § 11.4 ; débrancher demande confirmation ; reprendre par l'autre membre.

### G11 : Sur PC, les scénarios au clic et les captures

**Pourquoi :** spec § 14, § 19. **Dépend de :** toutes les tâches. **Coupe prévue :** le PC ; les scénarios 1 à 8 ;
les scénarios 9 à 20.

- [ ] Les deux colonnes à partir de 900 px, « Les dernières opérations » en tableau (B14), Popote à droite.
- [ ] Un scénario Playwright par critère d'acceptation, sur l'environnement d'essai, avec une banque d'essai aux
  réponses fixées, deux navigateurs pour les scénarios à deux personnes (9, 13, 17) et un assistant aux réponses
  fixées.
- [ ] Pour chaque écran et chaque état : une capture en 390 px et en 1440 px, rangée à côté de la capture de
  référence ; en plus, à 320 px, en zoom 200 %, au clavier seul, avec un lecteur d'écran, avec
  `prefers-reduced-motion`, et un passage axe sans violation.
- [ ] Revue adverse du monde entier par un agent à l'œil frais ; mise à jour de `docs/ETAT.md`.
