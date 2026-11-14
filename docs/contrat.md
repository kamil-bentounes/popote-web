# Le contrat de `popote-api` dans `popote-web`

`popote-api` publie son contrat (`openapi.json`, OpenAPI 3.1). Le front en garde une **copie épinglée** : il sait à quelle
version de l'API il parle, et voit tout de suite quand elle change sous lui (spec §§ 3.9 et 9.2).

| Fichier | Rôle | Qui l'écrit |
|---|---|---|
| `contrat/openapi.json` | la copie du contrat d'un commit de `popote-api` | `npm run contrat:sync` |
| `contrat/AMONT` | le SHA de ce commit (40 caractères hexadécimaux) | `npm run contrat:sync` |
| `src/api/schema.d.ts` | le client TypeScript, généré depuis la copie | `npm run contrat:genere` |
| `src/api/routes-protegees.ts` | les opérations qui exigent une session, tirées du `security` du contrat | `npm run contrat:genere` |

On ne retouche aucun de ces quatre fichiers à la main : la CI le refuse.

## Reprendre le contrat

```bash
npm run contrat:sync -- main      # ou un SHA précis de popote-api
npm run contrat:genere
git add contrat src/api && git commit
```

Les quatre fichiers (copie, `AMONT`, client, routes protégées) vont dans le même commit. Un conflit sur ces fichiers se règle en relançant les deux commandes, jamais à la main.

## Ce que la CI vérifie

- **`contrat`** (chaque envoi, bloquant) : `npm run contrat:verifie` (le client et la liste des routes protégées sont ceux de la
  copie) et `node scripts/sync-contrat.mjs --verifie` (la copie est identique, au caractère près et aux fins de ligne près, au contrat du SHA de `AMONT`, et
  ce SHA est un ancêtre de `main` de `popote-api` : l'API fusionne par écrasement, le SHA d'une branche retirée resterait servi
  par GitHub sans être celui d'aucune version).
- **`contrat-amont`** : `oasdiff breaking` compare la copie à `main` de `popote-api` (`scripts/contrat-amont.sh`).
  - Sur `main` et chaque jour à 05 h 17 UTC (`contrat-quotidien.yml`, aussi lançable à la main) : **rouge** si l'API a rompu son contrat.
  - Sur une demande de fusion : un **avertissement** seulement, une rupture d'amont ne bloque pas une demande sans rapport.
  - Hôte injoignable : trois essais, puis rouge (« amont injoignable »), jamais vert par défaut.
  - `contrat-amont` n'est **pas** dans `resultat` : c'est l'API qui a bougé, le front reste cohérent avec sa copie, et bloquer
    son déploiement n'y changerait rien. La rupture est vue, rouge, sur `main` et au quotidien.
  - Ce que `oasdiff` laisse passer, `scripts/compare-contrats.mjs` le refuse : une opération **retirée même dépréciée** (oasdiff
    admet la suppression d'une route dépréciée, avec ou sans date de fin), et une route dont la **protection change** (la liste
    `routes-protegees.ts` serait périmée). Ce que ni l'un ni l'autre ne refuse : un ajout, et un **élargissement** d'énumération
    de réponse (un `WARN` d'oasdiff, vert même en strict) : il peut casser un `switch` exhaustif sur le type généré, et se voit
    au `tsc -b` après `contrat:sync`.
  - Codes de `scripts/contrat-amont.sh` : 1 = une rupture ; 2 = amont injoignable (rien n'a pu être comparé). L'annotation d'une demande de fusion les distingue.
  - **Le quotidien peut s'éteindre** : GitHub désactive les workflows planifiés d'un dépôt public après 60 jours sans activité. Deux
    mois sans commit suffisent ; `contrat-amont` tourne aussi à chaque envoi sur `main`, qui relance le compteur. Si le dépôt dort, le
    relancer à la main (`workflow_dispatch`) ou en réactiver le cron dans l'onglet Actions.
- **`resultat`** réunit `front`, `secrets` et `contrat` ; `deploie-essai` ne part qu'après lui.

## Lire le résumé du job `contrat-amont`

Le résumé (onglet du run) contient le journal des changements entre la copie et `main` : les **ajouts** (routes, champs) n'en
sont pas des ruptures, ils sont là pour information ; les avertissements (`WARN`, par exemple une énumération de réponse
élargie) aussi. Les ruptures (`ERR`) sont des annotations rouges.

## Quand l'API a rompu son contrat

Le contrôle compare le contrat **entier**, pas seulement les routes que le front consomme (on ne tient pas cette liste) : une
rupture sur une route que le front n'appelle pas est donc rouge aussi. C'est le prix du choix conservateur.

1. Lire les annotations : quelle route, quel changement.
2. `npm run contrat:sync -- main && npm run contrat:genere`, puis `npx tsc -b` : les erreurs de types désignent le code à adapter.
3. Adapter le front, commiter la copie, le client et l'adaptation ensemble.
4. Si la rupture est voulue et que le front n'utilise pas la route, reprendre quand même la copie : elle redevient alors celle de `main`.
