# Le monde « Cuisiner » : le plan du front

**Spec :** `docs/superpowers/specs/2026-11-14-monde-cuisiner-design.md`. **Référence visuelle :**
`.design/cuisiner/prototype.html` et `.design/cuisiner/captures/`. **Style :** `.design/systeme/`.

Ce plan ne couvre que les écrans, dans `popote-web`. Il ne fait ni l'API, ni le calcul du plan, ni la lecture ou
l'invention des recettes, ni l'assistant.

## Ce que ce plan attend, sans le faire

- **Le plan de fondation du front** (`docs/superpowers/plans/2026-11-13-fondation-du-front.md`, F1 à F25) : routeur
  et coque, client généré, garde de session, composants du système « Jeu », marmite, mouvement, feuille, confettis,
  états communs.
- **Le parcours « Aujourd'hui »** (H1 à H9) : la barre « Parle-moi, ou écris » (H1), la feuille de Popote et ses
  blocs typés (H5), le mode vocal (H7), la politique de mutation et ses trois cas. Ce monde les réutilise.
- **Les besoins K1 à K17 de la spec (§ 17)** : leur contrat et leur plan appartiennent au socle, dont le calcul du
  plan (K9, K11) et les modèles d'IA (K3, K5, K7). Chaque tâche les cite ainsi : « K9, plan du socle ». Aucune
  tâche d'ici ne les code. Une tâche ne démarre que quand ses routes sont dans le contrat.
- **Les notifications** (`docs/superpowers/plans/2026-11-13-notifications-push.md`) : les minuteurs (spec § 16).
- **Le parcours « Semaine et Frigo »** : « Oui, place-les » y mène ; avant lui, le bouton mène à « Bientôt ».

**Ordre :** M1, M2, puis M3 et M4 en parallèle, M5, M6, M7, M8, puis M9 et M10 en parallèle, M11, M12, M13, M14.
Une tâche, une demande de fusion, 400 lignes visées ; les coupes prévues sont écrites.

## Règles valables pour chaque tâche

- Charger avant de coder les skills qui s'appliquent (`building-frontends`, `securing-code`, `handling-errors`,
  `protecting-personal-data`, `writing-tests`, `writing-commits`, `opening-pull-requests`).
- Les textes de l'écran sont ceux de la spec, au mot près. Un texte qui manque se demande, il ne s'invente pas.
- **L'écran ne calcule rien** : quantités à l'échelle, durées, valeurs par part, estimation, plan, heure de fin,
  poids des barquettes, coût par part viennent de l'API. Aucune multiplication de quantité côté écran. La seule
  exception est le décompte d'un minuteur, calé sur l'heure de fin rendue par le serveur.
- Les quantités et les durées s'affichent par deux fonctions testées (« 800 g », « 1,5 kg », « 40 cl », « 1 h 50 »,
  « ≈ 4 min », « 24:10 ») ; aucune n'est formatée ailleurs.
- Les mots sont ceux de la spec § 4.1 : session, part, barquette, recette, étape, minuteur, cuisinier. Un test
  cherche les mots interdits (« cycle », « portion », « hôte », « convive ») dans les textes de ce monde.
- Les titres, ingrédients, étapes et textes de recettes sont rendus comme du texte, jamais comme du HTML ; les
  phrases de Popote arrivent en segments typés (spec « Aujourd'hui » § 6).
- **Rien de ce monde ne reste dans le navigateur**, sauf la liste blanche de la cuisine (spec § 19, K-C14) : dans
  IndexedDB, sous la clé (foyer, personne, session), les étapes de la session (texte, durées), les minuteurs et
  les gestes en attente. Ni prénom, ni objectif, ni valeur de nutrition, ni montant ; ni stockage local ou de
  session, ni cache du service worker pour les réponses de l'API. Un test de liste blanche le vérifie après chaque
  scénario : tout ce qui est stocké est dans la liste, rien d'autre.
- Aucune couleur, taille, rayon ni durée en dur : tout vient des jetons. L'écran de cuisine prend ses couleurs
  sombres dans les jetons du système ; s'il en manque, ils s'ajoutent d'abord au système, par sa propre demande de
  fusion.
- Chaque écran est livré en 390 px et en 1440 px, avec ses états de la spec. En 390 px, sa capture Playwright est
  posée à côté de la capture de référence. En 1440 px, seule la capture PC du plan sert de référence ; les autres
  écrans suivent la spec § 15 et sont relus à l'œil.
- Chaque écriture suit la politique de mutation d'« Aujourd'hui » (spec § 5) : clé d'opération, cible et version
  explicites, les trois cas en attente, incertain, refusé, avec leurs tests.
- Tout changement sans changement d'écran est annoncé dans une région `status` ; le focus suit la spec § 19.
- Glisser a toujours un équivalent au toucher et au clavier.
- Les points de la spec § 18 sont retenus tels quels (décision du propriétaire, 13/11/2026). Il les relira : un
  point qu'il change rouvre la tâche concernée.

## Hypothèses à vérifier par le socle avant les tâches qui en dépendent

- **L'écran qui ne se met pas en veille** (M9), **le son, la vibration, la notification** (M10) : chaque capacité
  se vérifie sur de vrais iPhone et Android, dans l'appli installée et dans le navigateur ; les replis sont ceux
  de la spec § 19.
- **Ce que la cuisine garde sur l'appareil** (M9, K-C14) : accepté par le socle. C'est un **amendement à la règle
  F22 de la fondation** (« rien dans le navigateur »), limité à ceci : en IndexedDB, clé (foyer, personne,
  session), jamais dans le cache du service worker ni dans `localStorage` ; autorisés : les étapes de la session,
  les minuteurs, les gestes en attente avec leur clé ; interdits : tout prénom, objectif, valeur de nutrition ;
  purge à la fin ou à l'arrêt de la session, à la déconnexion, au 401, au changement de compte, et au démarrage
  si les données ont plus de 24 heures ; rejeu sous le compte d'origine seulement, sans doublon. M9 teste chacune
  de ces conditions.
- **Le son d'une alarme** (M10) : un son joué par la page n'est permis qu'après un appui ; « C'est parti ! » sert
  d'appui. Appli à l'arrière-plan : c'est la notification qui sonne.
- **Parler en cuisine** (M12) : vérifié par le socle le 14/11/2026 (`cuisiner-hypotheses.md` côté orchestration) :
  l'écoute continue est fragile sur Android (elle s'arrête à chaque phrase) et sur iPhone (muette après un son de
  l'appli). M12 livre « maintenir pour parler » ; mains libres ne s'ajoute qu'après un essai sur de vrais
  appareils. L'écran allumé demande l'en-tête `screen-wake-lock=(self)` et se redemande au retour de l'appli.
- **La relecture à deux** (M6, M9) : à quelle cadence les deux téléphones relisent la liste et la session (socle
  § « temps réel » : relecture avec `ETag`), et ce que cela coûte un dimanche.

---

### M1 : L'entrée du monde

**Pourquoi :** spec § 3, § 5, § 14. **Dépend de :** H1, H2 ; K1, plan du socle.

- [ ] Les routes du § 3 et leurs redirections vers l'étape en cours ; les quatre étapes en haut d'une session.
- [ ] `/cuisiner` : la bulle et ses huit situations, les cartes de session, « Nouvelle session », « Mes
  recettes » ; annuler une session et sa confirmation.
- [ ] La tuile Cuisiner de l'accueil rend les huit états du § 14.
- Tests : chaque ligne des tableaux § 5 et § 14 ; aucune session ; deux sessions ouvertes ; une adresse de session
  à une étape qui n'est pas la sienne redirige ; une session d'un autre foyer est introuvable ; les formes vides.

### M2 : Le menu : les parts, « Je choisis », la liste des recettes

**Pourquoi :** spec § 6.1, § 6.3, § 7.1. **Dépend de :** M1 ; K2, K4, plan du socle. **Coupe prévue :** les parts
et le compteur (M2a) ; la liste des recettes, la recherche, les filtres, les pages de dix (M2b).

- [ ] « Combien de parts ? », les pastilles, « Autre », la phrase de ce que le nombre couvre ; « Propose-moi » et
  « Je choisis ».
- [ ] La liste : le champ, les filtres, les vignettes (photo ou carré de couleur), dix par page, « Les 10
  suivantes », « Rien ne correspond. » ; « + », « Retenue », le compteur et ses trois cas (sous, à, au-dessus de la
  cible).
- Tests : 1 et 40 parts, 0 et 41 refusés ; la recherche sans accent ; deux filtres cumulés ; changer un filtre
  ramène à la page 1 ; une recette ne change pas de page entre deux lectures ; une photo qui ne charge pas montre
  le carré ; double appui sur « + » ne retient qu'une fois ; mouvement réduit.

### M3 : La fiche d'une recette

**Pourquoi :** spec § 4.4, § 7.2. **Dépend de :** M2 ; K4, plan du socle. « Corriger » reste grisé (avec « Bientôt »)
  tant que M5c n'est pas livrée : il ne mène à aucun écran avant.

- [ ] La fiche en page et en feuille : photo, provenance, trois tuiles, valeurs par part et leur fourchette,
  appareils, ingrédients à l'échelle, étapes et leurs pilules ; « Ajouter : N parts », « On aime », « Plus
  jamais », « Corriger », « Voir l'original », « Supprimer ».
- Tests : une recette sans valeurs (la raison est dite) ; sans photo ; inventée jamais testée ; changer les parts
  redemande les quantités à l'API ; « Plus jamais » et son retour ; le lien externe s'ouvre sans transmettre
  l'adresse de la page ; un titre contenant du HTML s'affiche tel quel.

### M4 : Popote propose le menu

**Pourquoi :** spec § 6.2. **Dépend de :** M2, H5 ; K3, plan du socle.

- [ ] Les cartes et leur raison, le résumé à trois chiffres, « Ça me va », « Autre menu », « Changer », − et + ;
  la demande en mots et son récapitulatif ; le tampon « Menu validé ».
- Tests : une raison hors de la liste fermée n'est pas affichée ; sans prix connus, pas d'estimation ; une phrase
  incomprise ne change rien ; à 0 part la carte s'en va ; « Ça me va » deux fois ne valide qu'une fois ; une
  consigne glissée dans la demande est traitée comme une demande.

### M5 : Ajouter une recette : la lire, la corriger, la garder

**Pourquoi :** spec § 8.1 à § 8.4, § 8.6. **Dépend de :** M3, H5, H7 ; K5, K6, plan du socle. **Coupe prévue :**
les quatre chemins et la lecture (M5a) ; le récapitulatif et les questions (M5b) ; la correction ligne à ligne
(M5c).

- [ ] Les quatre tuiles et « L'écrire moi-même » ; coller, photographier (une à trois photos, réduites et sans
  métadonnées avant l'envoi, avec les deux lignes qui préviennent avant l'envoi : masquer carte et fidélité, service
  aux États-Unis), le lien, la dictée ; « Je lis… », illisible, « Je ne peux
  pas lire cette adresse. ».
- [ ] Le récapitulatif en ticket et ses étiquettes (« supposé », « laquelle ? », « combien ? », « pas compté »,
  « pas reconnu », « quelle quantité ? », « estimé », « combien de temps ? », « à vérifier »), l'aliment reconnu
  sous chaque ligne ; les questions une à une, dans l'ordre de l'API ; les
  valeurs qui se calculent ; « Garder la recette » et sa pause, « Garder quand même ».
- [ ] Corriger une ligne, en ajouter, en retirer, réordonner les étapes ; chercher un aliment ; plusieurs recettes
  dans un texte ; « Je l'ajoute à la session ? ».
- Tests : un texte trop court, trop long ; une photo trop lourde ; un lien qui n'est pas en `https` est refusé
  avant l'envoi ; une recette sans nombre de parts ; un ingrédient à confirmer ; une durée manquante ; garder avec
  des manques ; quitter au milieu et revenir (le brouillon est sur le serveur) ; un texte collé contenant du HTML
  ou une consigne est affiché tel quel ; le quota atteint (« L'écrire moi-même » marche encore) ; l'échec du modèle se dit en français et ne coûte rien ;
  une étape « à vérifier » bloque « Garder » d'une recette inventée ; un ingrédient sans quantité laisse les
  valeurs « inconnues » ;
  le test de liste blanche du stockage ; une quatrième photo refusée ; la dictée ne se coupe pas au silence.

### M6 : La liste de courses

**Pourquoi :** spec § 9. **Dépend de :** M1, H5 ; K8, plan du socle. Le cycle de vie d'une ligne est celui du § 9.2. **Coupe prévue :** la liste, cocher, « Déjà
chez toi » (M6a) ; ajouter, retirer, « Pas trouvé » (M6b) ; à deux et finir (M6c).

- [ ] `/courses` : le compteur, « Déjà chez toi », les rayons dans l'ordre rendu par l'API, les lignes ; cocher,
  décocher ; « Je n'en ai plus ».
- [ ] Ajouter en mots et par le formulaire, « Le remettre à chaque fois », retirer ; « Pas trouvé » et ses trois
  choix, le remplaçant et « D'accord ».
- [ ] L'initiale de celui qui coche, le bandeau « Léa est à la boucherie » ; « Tout est là ! », « J'ai fini » et
  « Il en reste 3. ».
- Tests : une liste vide ; un menu que le placard couvre rend la session prête sans courses ; une session en
  cuisine garde ses besoins dans la liste ; un aliment couvert par le placard n'est pas à acheter ; une ligne « 300 g + 2 » ; le menu
  change pendant que la liste est ouverte (elle suit, sans toucher ce qui est coché) ; l'autre coche pendant que
  je coche la même ligne (elle reste cochée, une fois) ; cocher sans réseau (« En attente. », en mémoire de la page seulement, puis l'envoi) ; une ligne périmée par un menu
  pendant que Léa coche (« Léa vient de la changer. ») ; le besoin qui monte après l'achat ; décocher après le débit
  du placard (jamais sous zéro) ; « Je repasserai » survit à la session ; « Pas trouvé » sans remplaçant ;
  retirer un ingrédient qui compte demande pour la recette ; glisser a son équivalent au clavier ; une longue
  liste (le bouton du bas ne masque pas la dernière ligne).

### M7 : Le plan

**Pourquoi :** spec § 10. **Dépend de :** M1, M5b (la question de durée du § 8.3), F16 ; K9, K10, plan du socle. **Coupe prévue :** qui cuisine, avec
quoi, les durées manquantes (M7a) ; la frise et son envol (M7b).

- [ ] Les pastilles de cuisiniers et d'appareils, « + Quelqu'un d'autre », le nombre de places ; un appareil
  éteint dont une recette a besoin ; les durées manquantes, une à une.
- [ ] L'envol des étapes vers la frise, le grand chiffre, les phrases de ce qui est gagné, « Si on commence
  maintenant », le goulot, toucher une brique ; l'équivalent en liste pour un lecteur d'écran ; « C'est parti ! »
  et son décompte.
- Tests : « Je prépare le plan… » pendant le calcul asynchrone ; un plan trop gros refusé avec son texte ; un appareil
  trop petit pour la recette avec son texte ; un cuisinier, deux, quatre ; éteindre puis rallumer redonne le même plan (même version) ; un plan qui
  gagne moins de 10 minutes ne dit pas « au lieu de » ; une phrase hors de la liste fermée n'est pas affichée ; une
  boucle dans une recette affiche l'erreur et le lien ; « aucun plan possible » et ses deux issues ; « C'est parti ! » sur deux téléphones ne lance qu'une
  fois ; une autre session déjà en cuisine ; mouvement réduit (la frise s'affiche d'un coup).

### M8 : L'écran de cuisine en lecture

**Pourquoi :** spec § 11.1. **Dépend de :** M7 ; K11, plan du socle.

- [ ] L'écran sombre : l'anneau, la fin prévue, la ligne de l'autre, la carte de l'étape et son dos (texte de la
  recette, ingrédients), « Pendant ce temps », « Rien pour toi pour l'instant. » ; « On partage cet écran ».
- Tests : chaque état de la carte ; une étape fusionnée porte ses recettes ; un cuisinier sans compte ; la carte
  est lisible à 320 px et en zoom 200 % ; le contraste de l'écran sombre ; la région `status` annonce la carte.

### M9 : Fait, passer, un souci, le plan qui se refait

**Pourquoi :** spec § 11.2, § 11.4, § 19 (sans réseau). **Dépend de :** M8, M6b (le remplaçant de « Il me manque un
  ingrédient ») ; K11, plan du socle.

- [ ] « Fait » et « Annuler » (10 secondes), « Passer », « Aider Léa », les trois soucis ; « Je m'en vais », « Le
  four est pris » ; les phrases du recalcul et la nouvelle heure de fin ; l'écran qui ne se met pas en veille.
- [ ] Ce que la cuisine garde sur l'appareil (K-C14) : les étapes, les minuteurs et les cinq gestes en attente
  (« Fait », « Sorti », « + 5 min », « Passer », « Pause ») avec leur clé ; les cartes suivantes données d'avance par
  l'API, jamais calculées par l'écran ; le décalage serveur/appareil mesuré à la dernière synchro et une horloge
  monotone pour les décomptes ; l'envoi dans l'ordre au retour ; la purge (fin ou arrêt, déconnexion, 401,
  changement de compte, démarrage après 24 heures) ; le bandeau « Pas de réseau. » avec « aucune alarme écran
  verrouillé » ; « Annuler » aussi dans « … » sans limite de temps.
- Tests : deux téléphones prennent la même étape (un seul l'obtient) ; après un plan refait, « Fait » sur une
  étape toujours à moi passe, sur une étape qui ne l'est plus n'écrit rien et montre la nouvelle carte ; « Annuler »
  disparaît quand une étape qui en dépend est faite ; recharger la page hors ligne garde la carte et la file ; rien
  ne reste sur l'appareil après la session ; passer une étape qu'on ne peut pas passer ; « C'est raté » remet les
  étapes dites ; trois « Fait » sans réseau partent dans l'ordre ; l'heure de l'appareil décalée de 10 minutes ; un geste en attente
  ne se rejoue pas sous un autre compte ; sans carte d'avance, le texte du § 19 ; « Annuler » refusé quand l'étape
  dépendante est donnée ; « Fait » n'attend pas un recalcul ; double appui sur « Fait » ; quitter et rouvrir
  l'écran retrouve la même carte.

### M10 : Les minuteurs et l'alarme

**Pourquoi :** spec § 11.3, § 16. **Dépend de :** M8 ; le focus va sur « Sorti » à l'apparition de l'alarme, qui n'est
  annoncée qu'une fois (spec § 19) ; K11, plan du socle ; le plan des notifications.

- [ ] Le minuteur qui démarre seul, le décompte calé sur l'heure du serveur, l'alarme plein écran (son, vibration),
  « Sorti », « + 5 min », le rappel chaque minute, « attendent depuis 12 min », deux alarmes ensemble, un minuteur
  à la demande.
- [ ] Les replis de la spec § 19 quand l'appareil ne sait pas rester allumé, sonner ou prévenir.
- Tests : avec une horloge simulée ; un minuteur lancé hors ligne finit à l'heure affichée ; l'heure de l'appareil décalée de 10 minutes ne décale pas l'alarme ;
  « Sorti » sur un téléphone l'arrête sur l'autre ; l'alarme pendant la pause ; l'alarme sans réseau ; l'alarme
  est une région `alert` ; mouvement réduit ; le son seulement après un appui.

### M11 : La pause, l'arrêt, la fin

**Pourquoi :** spec § 11.6, § 12.4 (la carte du placard, partagée avec M13b). **Dépend de :** M9, M10 ; K12, K14,
  plan du socle.

- [ ] La carte du placard (§ 12.4) : ce qu'il y avait, ce qui reste, corriger, « Ne touche pas au placard », ce qui ne
  se compte pas ; M13b la reprend telle quelle.
- [ ] « Pause » et « Reprendre », la question après 24 heures, « Arrêter la session » et « Terminer quand même »
  recette par recette, « C'est cuit ! » et l'écart au plan.
- Tests : la pause vue de l'autre téléphone ; arrêter avec une recette pas cuite (elle n'arrive pas au rangement) ;
  toutes les étapes faites ; « C'est cuit ! » deux fois.

### M12 : Parler à Popote en cuisine

**Pourquoi :** spec § 11.5. **Dépend de :** M9, M10, H7 ; K11, K17, plan du socle ; l'hypothèse ci-dessus.

- [ ] « Maintenir pour parler » (livré d'abord) : le micro n'écoute que pendant l'appui ; une demande par appui.
- [ ] Mains libres, seulement sur les appareils où l'essai du socle a réussi, masqué ailleurs : le bouton et ce
  qu'il implique, écrit une fois ; le point rouge ; les phrases du tableau, reconnues par une
  liste fixe côté écran ; un seul appareil à la fois par session (« Léa écoute déjà… ») ; le point rouge nommé « Micro
  ouvert » ; « Popote, annule » ; la lecture du geste suivant ; sans micro, le bouton n'existe pas.
- Tests : une phrase sans « Popote » ne fait rien et ne part nulle part ; aucune phrase n'arrête la session ni ne
  supprime ; « Popote, c'est fait » pendant une alarme ; le micro refusé ;
  quitter l'écran coupe le micro ; aucun montant n'est dit.

### M13 : Dresser et ranger

**Pourquoi :** spec § 12. **Dépend de :** M11 (dont la carte du placard) ; K13, K14, plan du socle. **Coupe prévue :** dresser et peser
(M13a) ; où ranger, « Tout ranger », la fin (M13b).

- [ ] Les cartes de recette, le partage et son réglage, « Peser le plat », léger et copieux, le complément, une
  recette sans valeurs.
- [ ] Les deux colonnes et leurs jetons (glisser et toucher), la proposition, ce qui ne se congèle pas, « Cuit
  le » (2 jours en arrière au plus) ; « Tout ranger », « Oui, place-les » ; la carte de fin et ses
  pouces.
- Tests : les parts de chacun s'affichent mais jamais un objectif, un repas visé ni un pourcentage ; un foyer d'une personne ; personne sans objectifs ; un poids hors de la moitié au double de l'estimation
  demande confirmation ; l'autre change le dressage pendant « Tout ranger » (rien n'est rangé, l'écran se met à
  jour) ;
  la somme des poids affichés fait le poids pesé ; « Tout ranger » deux fois, et sur deux téléphones ; « Cuit le »
  hors bornes ; « Ne touche pas au placard » ; un pouce baissé et sa question ; mouvement réduit.

### M14 : Le coût, le PC, les scénarios au clic

**Pourquoi :** spec § 13, § 15, § 20. **Dépend de :** toutes les tâches ; K15, plan du socle. **Coupe prévue :** le
coût par la banque et le ticket (M14a) ; le PC (M14b) ; les scénarios 1 à 20 (M14c) ; les scénarios 21 à 55
(M14d).

- [ ] « C'était ces courses ? », le coût par part ; « Scanner le ticket » : la lecture, les lignes, « à vérifier »,
  « Enregistrer ».
- [ ] Les deux colonnes à partir de 900 px : la grille de recettes, la frise en grand, la cuisine en colonnes par
  cuisinier.
- [ ] Un scénario Playwright par critère d'acceptation, sur l'environnement d'essai, avec un assistant et un
  calcul de plan aux réponses fixées, une horloge simulée, et deux navigateurs pour les scénarios à deux (9, 15,
  16, 17, 20, 21, 26, 31, 32, 38, 42, 43, 46, 52, 53).
  Les critères que le serveur tient (2, 12, 13, 26, 28, 29, 30, 36, 44, 50, 51, 54) sont rattachés aux tests d'API du
  socle ; le front les rejoue avec des réponses fixées, sans les recalculer. Les fixtures sont synthétiques : aucune
  photo ni ticket réel, aucun texte de site tiers, aucune donnée EXIF. La capture de référence : écart sous 0,5 %.
- [ ] Pour chaque écran et chaque état : une capture en 390 px à côté de sa référence ; en plus, à 320 px, en zoom
  200 %, au clavier seul, avec `prefers-reduced-motion`, et un passage axe sans violation.
- [ ] Au lecteur d'écran, à la main, avec VoiceOver et Safari sur iPhone, puis NVDA et Firefox sur PC, trois
  parcours et leurs annonces attendues :
  1. Retenir une recette : « Lasagnes aux épinards et ricotta, bouton » ; la fiche ; « Ajouter : 4 parts,
     bouton » ; après l'appui, le focus sur le compteur et l'annonce « 4 parts sur 10 ».
  2. Lire le plan : la liste par cuisinier, « Sam : 10 h 30, émince les oignons, 4 minutes » ; « C'est parti !,
     bouton ».
  3. Cuisiner : l'annonce « À toi : émince 3 oignons, environ 4 minutes » ; « Fait, bouton » ; l'annonce de la
     carte suivante ; l'alarme « Dring ! Sors les lasagnes du four. » annoncée aussitôt, puis « Sorti, bouton ».
- [ ] Revue adverse du monde entier par un agent à l'œil frais ; mise à jour de `docs/ETAT.md`.
