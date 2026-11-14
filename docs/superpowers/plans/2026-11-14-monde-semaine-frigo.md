# Le monde « Semaine et Frigo » : le plan du front

**Spec :** `docs/superpowers/specs/2026-11-14-monde-semaine-frigo-design.md`. **Référence visuelle :**
`.design/semaine-frigo/prototype.html` et `.design/semaine-frigo/captures/`. **Style :** `.design/systeme/`.

Ce plan ne couvre que les écrans, dans `popote-web`. Il ne fait ni l'API, ni le placement des parts, ni la lecture
des phrases et des photos, ni l'assistant.

## Ce que ce plan attend, sans le faire

- **Le plan de fondation du front** (`docs/superpowers/plans/2026-11-13-fondation-du-front.md`, F1 à F25).
- **Le parcours « Aujourd'hui »** (H1 à H9) : la barre de Popote (H1), noter ce qu'on mange et ses feuilles (H3,
  H4), la feuille de Popote (H5), apprendre un produit (H6), le mode vocal (H7), la politique de mutation. Ce monde
  ouvre ces feuilles en leur donnant un jour et un repas ; il ne les refait pas.
- **Les besoins S1 à S14 de la spec (§ 14)** : leur contrat et leur plan appartiennent au socle. Chaque tâche les
  cite ainsi : « S2, plan du socle ». Aucune tâche d'ici ne les code. Une tâche ne démarre que quand ses routes
  sont dans le contrat. S14 (les rappels) est côté push : pas de tâche ici ; le réglage des deux interrupteurs est
  dans « Foyer et réglages ». S11 (photos) attend le plan des photos (0.6).
- **Le monde « Cuisiner »** : c'est lui qui crée les parts d'une session ; « Voir la recette » mène à sa fiche.
- **Le parcours « Foyer et réglages »** : le réglage des objectifs et des rappels.

**Ordre :** N1, N2, puis N3 et N4 en parallèle, N5, N6, puis N7 et N8 en parallèle, N9, N10. Les gestes (N3, N7)
passent avant les boutons de bulle : N6 ne livre que le texte de la bulle, **N7 livre ses boutons**. Une tâche, une
demande de fusion, 400 lignes visées ; les coupes prévues sont écrites.

## Règles valables pour chaque tâche

- Charger avant de coder les skills qui s'appliquent (`building-frontends`, `securing-code`, `handling-errors`,
  `protecting-personal-data`, `writing-tests`, `writing-commits`, `opening-pull-requests`).
- Les textes de l'écran sont ceux de la spec, au mot près. Un texte qui manque se demande, il ne s'invente pas.
- **L'écran ne calcule rien** : les dates, les mots d'urgence, « à sortir », « à jeter », le placement, les
  jauges, les moyennes, la série, le mot de la porte viennent de l'API. L'écran ne compare aucune date à l'heure
  de l'appareil.
- Les mots sont ceux de la spec § 4.1 : part, plat, repas, produit, sortir, jeter. Un test cherche les mots
  interdits (« portion », « stock », « cycle », « créneau ») dans les textes de ce monde.
- Les noms de plats et de produits sont rendus comme du texte, jamais comme du HTML ; les phrases de Popote
  arrivent en segments typés (spec « Aujourd'hui » § 6).
- **Rien de ce monde ne reste dans le navigateur** : ni stockage local ou de session, ni IndexedDB, ni cache du
  service worker pour les réponses de l'API. Un test le vérifie après chaque scénario.
- Une lecture en échec n'est jamais montrée comme une semaine vide ou un frigo vide.
- Aucune couleur, taille, rayon ni durée en dur : tout vient des jetons. La porte, le tiroir givré et la planche
  du placard sont des composants de ce monde, dessinés avec les jetons du système.
- Chaque écran est livré en 390 px et en 1440 px, avec ses états de la spec. En 390 px, sa capture Playwright est
  posée à côté de la capture de référence. En 1440 px, seule la capture PC de la semaine en grille sert de
  référence ; les autres écrans suivent la spec § 12 et sont relus à l'œil.
- Chaque écriture suit la politique de mutation d'« Aujourd'hui » (spec § 5) : clé d'opération, cible et version
  explicites, les trois cas en attente, incertain, refusé, avec leurs tests.
- Tout changement sans changement d'écran est annoncé dans une région `status` ; le focus suit la spec § 16.
  Glisser a toujours un équivalent au toucher et au clavier.
- Les points de la spec § 15 sont retenus tels quels (décision du propriétaire, 13/11/2026). Il les relira : un
  point qu'il change rouvre la tâche concernée.

---

### N1 : La semaine en lecture

**Pourquoi :** spec § 3, § 4.4, § 5. **Dépend de :** H1, H2 ; S1, plan du socle.

- [ ] Les routes du § 3 ; l'en-tête, la bulle et ses six situations (dont « Sam a mangé ta part de gratin »), le bandeau des sept jours et ses points, la
  liste des jours, les cartes de repas et leurs étiquettes, « Moi seulement », les sept jours d'avant.
- [ ] La tuile Semaine de l'accueil suit le § 4.4 : « pas là » et « autre chose de prévu » (« Resto ») ne sont jamais
  « rien de prévu » ; un test le fige (amendement au plan d'API « Aujourd'hui »). L'écran relit l'état quand
  `valid_until` est passé.
- Tests : un repas « passé » à 15 h (midi) et à minuit (soir) ; chaque état d'un repas (§ 4.4, dont « pas noté : lasagnes » et « pas là » qui ne complète pas un jour) ; deux personnes sur une carte ; un jour passé pas noté ; un foyer d'une
  personne ; le jour qui change pendant que l'écran est ouvert (l'écran relit, il ne calcule pas) ; les formes
  vides ; une lecture en échec.

### N2 : Popote place les parts

**Pourquoi :** spec § 5.1. **Dépend de :** N1, F16 ; S2, plan du socle.

- [ ] « Oui, place-les », « Je remplis quels repas ? », l'envol des parts, le récapitulatif, « Ça me va », « Je
  change », le tampon ; « Les repas à remplir » et « Replace le reste » dans « … » ; « ne tiendront pas ».
- Tests : rien n'est écrit avant « Ça me va » ; « La semaine a changé » si un repas visé a changé, est passé, ou
  si une part visée n'est plus libre, est « à jeter » ou a changé (cas 33 a, b, c) ; « Les repas à remplir » par
  personne (« Pour Léa, je remplis ses soirs. ») ; « Congèle-les » absent si « Congeler » n'est pas permis ; la bulle « neuves » ne revient pas pour les parts laissées libres ; double appui ; la question n'est posée qu'une fois ; un placement
  qui ne remplit rien ; ce qui ne rentre pas est dit ; mouvement réduit.

### N3 : Changer un repas

**Pourquoi :** spec § 5.2. **Dépend de :** N1 ; S3, plan du socle.

- [ ] La feuille d'un repas et ses six choix (dont « Noter ce repas » pour un repas d'aujourd'hui ou passé) ; la liste des plats libres ; « Pour qui ? » ; la phrase de ce que le
  changement entraîne ; glisser pour déplacer et échanger, et « Déplacer ».
- Tests : chaque choix ; une part à jeter n'est jamais offerte ; une carte à deux déplacée sur un repas noté (« Pas possible pour Léa. ») ; une part posée après sa date est refusée avec sa phrase ; une part congelée trop proche
  porte « encore congelée » ; l'autre change le même repas (conflit, rien d'écrit) ; un repas mangé ne se change
  pas ; déplacer au clavier.

### N4 : Rattraper hier, le détail d'un jour

**Pourquoi :** spec § 5.3, § 6. **Dépend de :** N1, H3, H4 ; S4, S5, plan du socle.

- [ ] Les cartes de rattrapage et leurs quatre réponses (« Je ne sais plus » sur toutes), la question sur la part
  prévue (« Et tes lasagnes ? » : reste au frigo, congélateur si permis, jetée), la part libérée et sa
  proposition, « Je ne note pas ce jour » et son retour, « Rattraper pour Léa » (membre visé explicite).
- [ ] `/semaine/jour/:date` : les jauges et l'objectif (ceux de l'autre en lecture seule), « Moi » / « Léa », les trois blocs, « Noter ce repas » sur un repas prévu, la feuille d'une ligne (quantité,
  « Retirer », « Tu l'as jetée ? »), « estimé », « + Ajouter » (la saisie d'« Aujourd'hui », visée).
- Tests : la question sur la part prévue (cas 39, 40) ; « Je ne sais plus » et « Je ne note pas ce jour » (cas 42, 57) ; noter pour l'autre, foyer étranger refusé (cas 55) ; rattraper « pas là » (« tu n'étais pas là : tu as mangé quoi ? ») et « Oui, mangé » sur la part d'origine ou « Il n'y a plus de lasagnes » ; « Retirer » rend la part à son état et sa date d'avant ; un jour à venir (pas de jauges) ; tout jour passé se lit, au-delà de 7 jours sans rien changer ; sans objectifs ; changer une
  quantité met les jauges à jour depuis l'API ; les trois cas de la politique de mutation.

### N5 : La semaine en chiffres

**Pourquoi :** spec § 4.5, § 7. **Dépend de :** N4 ; S6, plan du socle.

- [ ] Les sept colonnes (les 7 derniers jours jusqu'à hier) et leurs états, les deux chiffres, « N jours dans tes objectifs », la série, « ce
  qu'on a jeté », la phrase de Popote, « Moi » / « Léa », « 4 semaines ».
- Tests : aucun jour complet ; « rien » + « rien » + yaourt est un jour complet (cas 9) ; « 7 derniers jours » (cas 53) ; un jour sans objectif hors du « sur N » (cas 54) ; la phrase suit la table du § 7 ; « objectif variable » ; un seul seuil (153 sur 160 g n'est pas dans les objectifs) ; sans objectifs ; une phrase hors de la liste fermée n'est pas affichée ; la couleur
  n'est jamais le seul signe (un jour incomplet porte « ? ») ; l'équivalent en tableau pour un lecteur d'écran.

### N6 : Le frigo en lecture

**Pourquoi :** spec § 8. **Dépend de :** H1, H2 ; S7, plan du socle.

- [ ] La porte et son mot, son ouverture, les trois onglets, les deux étagères, le tiroir givré, la planche du
  placard, la bulle et ses situations (texte seulement : ses boutons sont en N7), dont « Tu l'as mangée mercredi soir ? » et « Rien à sortir. » ; « + ».
- [ ] La tuile Frigo de l'accueil suit la règle du § 8 (elle remplace la règle provisoire d'« Aujourd'hui »).
- Tests : chaque ligne du tableau de la tuile (« à sortir » compte **toutes les parts dues** : curry 2 + chili 2 = « 4 à sortir ») ; textes de la bulle repris de l'accueil au mot près ; une chose à faire = un plat ; un onglet vide ; le mot de la porte et la tuile disent le même
  nombre ; une lecture en échec n'affiche pas « Vide » ; mouvement réduit (porte ouverte d'emblée).

### N7 : La fiche d'un plat, sortir, jeter

**Pourquoi :** spec § 9, § 10. **Dépend de :** N3, N4, N6 ; S5, S8, S9, plan du socle.

- [ ] Les jetons de parts et leurs états ; « En manger une » (n'importe quelle part du foyer, plusieurs au même
  repas), « Congeler » (jusqu'à cuisson + 2 jours), « Sortir », « Jeter » (les parts à jeter d'abord),
  « Corriger » (vers plus tôt seulement) ; ce que le geste retire de la semaine, dit avant ; « Annuler » 6 s après
  « Jeté », « Sortir » et « Congeler » ; **les boutons de la bulle** : « Je les sors », « Jeté », « Oui » / « Non »
  de « Tu l'as mangée ? », « Et ta part de … ? » (Au frigo, Au congélateur éteint avec sa raison, À la poubelle),
  « Je la mange ce soir », avec leurs mouvements ; **la feuille « Manger en plus »** (§ 6.1), ouverte depuis le
  détail d'un jour et la feuille d'un repas.
- Tests : « Congeler » n'est pas offert à une part sortie ; aucun geste ne prend une part à jeter, sauf « Jeter » et « Je l'ai mangée » ; les parts montrées avant confirmation partent (identifiants et versions), refus si l'une a changé ; « En manger une » vise le repas montré ; « Annuler » 6 s après « Jeté », « Sortir » et « Congeler » (cas 50) ; congeler, corriger, jeter selon les cas 43, 44, 45 ; manger la part de l'autre (cas 38) ; manger en plus : plusieurs parts, un autre plat, la part de l'autre, du congélateur (cas 66 à 69) ; « Et ta part de … ? » et son absence de réponse (cas 65) ; « Il y
  en a moins » ne compte pas comme jeté ; double appui sur « Jeté » ; la chose à faire disparaît de l'accueil ; les
  trois cas de la politique de mutation.

### N8 : Ajouter

**Pourquoi :** spec § 11. **Dépend de :** N6, H5, H6 ; S10, S11, S12, plan du socle. **Coupe prévue :** le dire et
son ticket (N8a) ; la photo du frigo (N8b) ; un plat tout prêt et la feuille d'un produit (N8c).

- [ ] Les quatre tuiles ; la phrase et son récapitulatif (plat ou produit, lieu, quantité, « connu » ou
  « estimé »), « Ranger », « Modifier », « + Ajouter ce que j'ai oublié » ; changer le stock à la voix ou par écrit (l'avant et
  l'après, « Plus de café. Je le mets sur la liste de courses ? »).
- [ ] La photo : **réduite à 2 048 px au plus et ré-encodée en JPEG sur l'appareil** (test : plus de métadonnées),
  « Je regarde… », des lignes jamais cochées d'avance, « Tout cocher », « vu » / « deviné », « déjà là », les quatre gestes (confirmer, modifier, supprimer par la croix ou « Enlever ce produit », « + Ajouter ce que j'ai oublié »), « Ajouter N produits » qui suit le compte des lignes cochées, la mention du fournisseur du modèle.
- [ ] « Un plat tout prêt » ; la feuille d'un produit : quantité, lieu, date, « Fini » et son annulation.
- Tests : rien n'est rangé avant « Ranger » ; une phrase incomprise ; une phrase ou un nom contenant du HTML ou une
  consigne est affiché tel quel ; une photo trop lourde, illisible ; ce qui n'est pas coché n'est pas ajouté ;
  « Fini » puis « Annuler » ; « À la main » ; le quota atteint et Popote indisponible (textes du § 11) ; les produits (frigo, congélateur, placard) suivent la saisie.

### N9 : Sur PC

**Pourquoi :** spec § 12. **Dépend de :** N1 à N8.

- [ ] La semaine en grille de sept colonnes et deux lignes, glisser d'une case à l'autre, le jour en panneau ; le
  frigo en trois colonnes.
- Tests : de 900 à 1440 px ; glisser et son équivalent au clavier.

### N10 : Les scénarios au clic et les captures

**Pourquoi :** spec § 17. **Dépend de :** toutes les tâches. **Coupe prévue :** les scénarios 1 à 11 ; les
scénarios 12 à 69 (cycle de vie, dates dont le changement d'heure, sécurité, gestes sur N parts, frigo partagé,
relances, photos, stock ; horloge fixée).

- [ ] Un scénario Playwright par critère d'acceptation, sur l'environnement d'essai, avec une horloge de serveur
  fixée, un assistant aux réponses fixées, et deux navigateurs pour les scénarios à deux (4, 18).
- [ ] Pour chaque écran et chaque état : une capture en 390 px à côté de sa référence, **sur des données et une
  horloge figées** (2 % de pixels) ; en plus, à 320 px, en zoom
  200 %, au clavier seul, avec `prefers-reduced-motion`, et un passage axe sans violation.
- [ ] Au lecteur d'écran, **à la main, hors de la chaîne automatique**, avec VoiceOver et Safari sur iPhone, puis NVDA et Firefox sur PC, trois
  parcours et leurs annonces attendues :
  1. Lire la semaine : « mercredi 18, soir : curry, pour Sam et Léa, à sortir mardi soir, bouton ».
  2. Changer un repas : la feuille, « Pour qui ?, bouton », « Sam, bouton » ; après l'appui, le focus sur la
     carte et l'annonce « Léa ne mange pas là mardi ? Sa part de gratin reste au frigo. ».
  3. Sortir : la bulle « Sors 2 parts de curry pour demain midi. », « Je les sors, bouton » ; l'annonce « 2 parts
     sorties ! Prêtes pour demain midi. ».
- [ ] Revue adverse du monde entier par un agent à l'œil frais ; mise à jour de `docs/ETAT.md`.
