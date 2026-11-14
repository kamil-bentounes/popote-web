#!/usr/bin/env bash
# Compare ce que le front connaît (contrat/openapi.json) à ce que `popote-api` publie sur `main` :
# `oasdiff breaking` rend 1 si l'API a retiré ou changé quelque chose sous le front. Un ajout
# compatible n'est pas une rupture ; il va, avec les avertissements, dans le résumé du job.
#
# Choix conservateur : le contrat entier compte, pas seulement les routes que le front consomme
# (on ne tient pas cette liste). Procédure de reprise : docs/contrat.md.
#
# Codes de sortie : 0 rien à signaler ; 1 une rupture (l'API a retiré ou changé quelque chose sous le
# front) ; 2 amont injoignable ou absent, ou oasdiff introuvable (rien n'a pu être comparé).
#
# Environnement : OASDIFF (binaire, défaut `oasdiff`) ; CONTRAT_AMONT_FICHIER (un fichier local à la
# place du téléchargement : les tests) ; GITHUB_STEP_SUMMARY (fourni par GitHub Actions).
set -euo pipefail

DEPOT="kamil-bentounes/popote-api"
ici="$(cd "$(dirname "$0")" && pwd)"
TAILLE_MAX=1048576 # 1 Mio : un contrat plus gros n'est pas le nôtre
OASDIFF="${OASDIFF:-oasdiff}"
CONTRAT="contrat/openapi.json"
dossier="$(mktemp -d)"
trap 'rm -rf "$dossier"' EXIT

echoerr() { echo "$@" >&2; }

# Une commande réseau, trois essais espacés ; échec = amont injoignable (jamais vert par défaut).
avec_essais() {
  local essai
  for essai in 1 2 3; do
    if "$@"; then return 0; fi
    [ "$essai" -lt 3 ] && sleep $((essai * 2))
  done
  return 1
}

if [ -n "${CONTRAT_AMONT_FICHIER:-}" ]; then
  [ -f "$CONTRAT_AMONT_FICHIER" ] || { echoerr "amont absent : $CONTRAT_AMONT_FICHIER"; exit 2; }
  amont="$CONTRAT_AMONT_FICHIER"
else
  # Un délai (`git ls-remote` n'en a pas), aucune invite, et un SHA valide : une sortie vide se reprend.
  sha_main() {
    GIT_TERMINAL_PROMPT=0 timeout 30 git ls-remote "https://github.com/$DEPOT" refs/heads/main | cut -f1 > "$dossier/sha"
    [[ "$(cat "$dossier/sha")" =~ ^[0-9a-f]{40}$ ]]
  }
  avec_essais sha_main || { echoerr "amont injoignable : git ls-remote n'a pas rendu de SHA en trois essais"; exit 2; }
  sha="$(cat "$dossier/sha")"
  amont="$dossier/openapi-amont.json"
  # Ni redirection (l'hôte reste celui de la liste), ni plus d'1 Mio.
  telecharge() { curl --silent --show-error --fail --max-time 30 --max-filesize "$TAILLE_MAX" --output "$amont" "https://raw.githubusercontent.com/$DEPOT/$sha/openapi.json"; }
  avec_essais telecharge || { echoerr "amont injoignable : le contrat de $DEPOT@$sha n'a pas pu être téléchargé"; exit 2; }
fi

command -v "$OASDIFF" > /dev/null || { echoerr "oasdiff est introuvable ($OASDIFF)"; exit 2; }

# Le résumé du job : le journal des changements (ajouts compris) et les avertissements.
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### Contrat de popote-api (main) contre la copie du front"
    echo
    echo '```'
    "$OASDIFF" changelog "$CONTRAT" "$amont" || true
    echo '```'
  } >> "$GITHUB_STEP_SUMMARY"
fi

# Le verdict : une rupture (niveau ERR) d'oasdiff, OU un écart qu'il laisse passer (une opération
# retirée même dépréciée, une protection changée : scripts/compare-contrats.mjs). Les deux
# s'exécutent toujours, pour que toutes les annotations paraissent.
rupture=0
"$OASDIFF" breaking "$CONTRAT" "$amont" --fail-on ERR --format githubactions || rupture=1
node "$ici/compare-contrats.mjs" "$CONTRAT" "$amont" || rupture=1
exit "$rupture"
