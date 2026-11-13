# Parcours « Entrer dans Popote » : le plan du front

**Spec :** `docs/superpowers/specs/2026-11-13-parcours-entrer-design.md`. **Référence visuelle :**
`.design/entrer/prototype.html` et `.design/entrer/captures/`. **Style :** `.design/systeme/`.

Ce plan ne couvre que les écrans, dans `popote-web`. Il ne refait ni l'API ni le squelette du front.

## Ce que ce plan attend, sans le faire

- **Le plan de fondation du front** (`docs/superpowers/plans/2026-11-13-fondation-du-front.md`, tâches F1 à F25) :
  routeur, client généré depuis le contrat, garde de session, PWA, politique de sécurité du contenu, polices,
  composants du système « Jeu » portés en React, marmite comprise, états communs (réveil, chargement, erreurs, `429`,
  réseau perdu, session expirée). Les tâches ci-dessous posent des écrans sur ce socle, le citent par numéro et n'y
  ajoutent aucun composant de base.
- **Le plan du socle 0.4bis** : codes, clés d'accès, sessions, preuve récente, invitations par mail, suppression.
- **Les ajouts R1 à R9 de la spec (§ 9)**, intégrés au plan du socle. Chaque tâche les cite ainsi : « R3, plan du
  socle ». Aucune tâche d'ici ne les code.
- **Les mails au style « Jeu »** (spec § 4.6 et § 7) : gabarit HTML et version texte de chaque mail, expéditeur
  `Popote <bonjour@notre-popote.fr>`. Ils sont envoyés par l'API : à porter dans le plan du socle, avec sa tâche S4.

**Ordre :** E1, puis E2 à E7 dans l'ordre de leurs dépendances, puis E8. Une tâche, une demande de fusion, 400
lignes visées ; les coupes prévues sont écrites. Une tâche ne démarre que quand ses routes sont dans le contrat.

## Règles valables pour chaque tâche

- Charger avant de coder les skills qui s'appliquent (`building-frontends`, `securing-code`,
  `handling-errors`, `writing-tests`, `writing-commits`, `opening-pull-requests`).
- Les textes de l'écran sont ceux de la spec, au mot près. Un texte qui manque se demande, il ne s'invente pas.
- Aucune couleur, taille, rayon ni durée en dur : tout vient des jetons. Aucun composant hors du système.
- Chaque écran est livré en 390 px et en 1440 px, avec ses états de la spec (§ 4 et § 6), et sa capture Playwright
  posée à côté de la capture de référence dans la demande de fusion.
- Le mouvement suit la spec § 10 et passe par Motion ; le prototype montre l'intention, son script n'est pas repris.
- Dépôt public : « Sam » et « Léa » dans les exemples et les tests, jamais de vraie donnée.

## Hypothèse à vérifier avant E3

Le navigateur expose `PublicKeyCredential.isConditionalMediationAvailable` : c'est lui qui décide de la version
« appareil connu » de `/entrer`. Sans lui, l'écran montre toujours le champ e-mail, avec un lien « Entrer avec mon
empreinte ».

---

### E1 : La garde « sans foyer » et les textes des états communs

**Pourquoi :** spec § 3, § 4.4, § 6. **Dépend de :** F5b (garde de session, retour à l'adresse demandée), F18 à F21
(réveil, chargement, erreurs, `429`, réseau perdu, session expirée) ; R5, plan du socle.

- [ ] La garde de session vient de F5b : E1 n'ajoute que la garde « sans foyer » → `/sans-foyer` (sauf `/compte` et
  `/invitation`).
- [ ] Les états communs viennent de F18 à F21 : E1 y pose les textes de la spec § 4.4 et § 6, et vérifie que chaque
  écran du parcours les montre. Aucune nouvelle machine à états.
- Tests : une personne sans foyer est conduite à `/sans-foyer` depuis toute route protégée ; les textes des états
  sont ceux de la spec.

### E2 : `/entrer` et `/entrer/code`

**Pourquoi :** spec § 4.1 et § 4.2. **Dépend de :** E1, F9 (bouton, champ), F11 (cases du code). **Coupe prévue :** la porte (E2a), le code (E2b).

- [ ] Les deux versions de la porte. Le champ de code unique et ses six cases, l'envoi automatique à six chiffres.
- [ ] Tous les états du code : juste, faux avec le nombre d'essais, expiré, pause avec décompte, renvoi désactivé.
- Tests : chaque état ; collage d'un code à six chiffres ; saisie au clavier seul ; lecteur d'écran (noms et alertes).

### E3 : L'empreinte : la proposer, puis entrer avec

**Pourquoi :** spec § 4.1 (appareil connu) et § 4.3. **Dépend de :** E2.

- [ ] `/entrer/cle` : activer, plus tard, navigateur sans clés d'accès (écran sauté).
- [ ] « Entrer avec mon empreinte » sur la porte ; annulation et refus sans message d'erreur brutal.
- Tests : avec l'authentificateur virtuel de Playwright (création, connexion, annulation).

### E4 : `/foyer`, l'invitation et son suivi

**Pourquoi :** spec § 4.5. **Dépend de :** E1, F12, F13, F15 (feuille), F16 (confettis) ; R1, R2 et R8, plan du socle. **Coupe prévue :** le foyer et la
feuille (E4a), le suivi et ses actions (E4b).

- [ ] Les deux blocs, la feuille, l'envoi avec l'enveloppe et les confettis, le suivi relu toutes les 30 s tant
  que l'écran est visible, renvoyer (délai, épuisé), copier le lien, annuler avec confirmation en ligne, demande de
  nouveau lien mise en avant.
- Tests : chaque erreur de la feuille ; passage « envoyée », « ouverte », « dans le foyer » ; le relevé s'arrête
  quand l'écran n'est plus visible.

### E5 : `/invitation` et `/bienvenue`

**Pourquoi :** spec § 4.7 et § 4.8. **Dépend de :** E2 (cases du code), E3 ; R1 et R9, plan du socle. Tant que R9
n'est pas là, l'écran de bienvenue ne montre que le bloc des objectifs.

- [ ] Le jeton est lu dans le fragment d'adresse puis retiré de l'adresse ; il n'est jamais écrit dans un journal
  ni dans le stockage du navigateur.
- [ ] Les cinq issues : lien du mail, lien copié (avec code), lien mort (avec la demande), compte existant, déjà
  dans un foyer. Puis la proposition d'empreinte et l'écran de bienvenue.
- Tests : chaque issue ; rechargement de la page au milieu ; deux onglets sur le même lien.

### E6 : `/compte` et la preuve récente

**Pourquoi :** spec § 4.9 et § 5. **Dépend de :** E1, E3.

- [ ] Identité (prénom modifiable), appareils, empreintes (renommer, retirer, ajouter), télécharger mes données, me
  déconnecter.
- [ ] Le composant « Prouve que c'est toi », réutilisé par E7 : empreinte, sinon feuille de code.
- Tests : déconnecter un appareil (la ligne se referme, l'autre navigateur revient à `/entrer`) ; preuve par
  empreinte, par code, refusée.

### E7 : Partir, quitter, supprimer, retirer

**Pourquoi :** spec § 4.10. **Dépend de :** E6, F10 (bouton à maintenir, avec ses deux appuis espacés pour qui ne
peut pas maintenir) ; R3, R4, R6 et R7, plan du socle. **Coupe prévue :** partir,
quitter et sans foyer (E7a), supprimer et adieu (E7b), retirer (E7c).

- [ ] Les écrans et leurs variantes « seule dans le foyer ». Le bouton à maintenir reste désactivé avant la
  preuve, se remet à zéro si on relâche, et marche au clavier.
- [ ] `/sans-foyer` avec le décompte des jours.
- Tests : relâcher à 1,9 s ne fait rien ; tenir 2 s agit une seule fois ; un `member` ne voit aucun chemin vers
  « retirer » et l'adresse directe est refusée.

### E8 : Les scénarios au clic et les captures

**Pourquoi :** spec § 12. **Dépend de :** toutes les tâches, et les mails du plan du socle. **Coupe prévue :**
scénarios 1 à 6, puis 7 à 12.

- [ ] Un scénario Playwright par critère d'acceptation, sur l'environnement d'essai, avec deux navigateurs pour les
  scénarios à deux personnes et la boîte de test pour lire les mails.
- [ ] Pour chaque écran et chaque état : une capture en 390 px et en 1440 px, rangée à côté de la capture de
  référence. L'écart est jugé par la session de design avant que le propriétaire ne voie quoi que ce soit.
- [ ] Revue adverse du parcours entier par un agent à l'œil frais ; mise à jour de `docs/ETAT.md`.
