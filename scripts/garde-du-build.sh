#!/usr/bin/env bash
# La garde de ce qui part en ligne : jouée dans le job `front` et AGAIN dans `deploie-essai`, car celui-ci reconstruit
# `dist/` (un dist contrôlé n'est pas forcément celui qu'on déploie).
#   - une page, et un `sw.js` qui remplace l'ancien service worker (scripts/verifie-sw-remplacant.mjs) ;
#   - rien qui sorte de la CSP : ni script ni style en ligne, ni police en data:, ni chargement vers un autre hôte
#     (scripts/verifie-build.mjs) ;
#   - aucune trace de l'ancien front, ni d'axe-core (outil de test sous MPL-2.0, admise pour les outils non livrés).
# Usage : bash scripts/garde-du-build.sh [dist]   (rend 1 au moindre problème)
set -euo pipefail
dist="${1:-dist}"
ici="$(cd "$(dirname "$0")" && pwd)"

test -f "$dist/index.html" || { echo "$dist/index.html manque" >&2; exit 1; }
test -f "$dist/sw.js" || { echo "$dist/sw.js manque" >&2; exit 1; }
node "$ici/verifie-build.mjs" "$dist"
node "$ici/verifie-sw-remplacant.mjs" "$dist/sw.js"
if grep -rqiE 'supabase|sb_publishable' "$dist"; then
  echo "$dist contient une trace de l'ancien front (supabase ou sb_publishable)" >&2
  exit 1
fi
if grep -rqiE 'axe-core' "$dist"; then
  echo "$dist contient axe-core (outil de test, licence MPL-2.0)" >&2
  exit 1
fi
