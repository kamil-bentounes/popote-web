#!/usr/bin/env bash
# Fumée après le déploiement du relais d'essai : le front et l'API répondent, avec les bons en-têtes.
# Échoue (code 1) si, après ESSAIS tentatives espacées de PAUSE secondes, un contrôle reste rouge.
# Ne lit aucun secret : seulement des GET publics.
set -u

BASE="${BASE_URL:-https://essai.notre-popote.fr}"
ESSAIS="${ESSAIS:-6}"
PAUSE="${PAUSE:-10}"
DELAI_REQUETE="${DELAI_REQUETE:-10}"

dossier="$(mktemp -d)"
trap 'rm -rf "$dossier"' EXIT

# Récupère statut, en-têtes et corps de $1 ; en cas d'échec réseau le statut vaut 000.
recupere() {
  curl -sS --max-time "$DELAI_REQUETE" -o "$dossier/corps" -D "$dossier/entetes" -w "%{http_code}" "$1" 2>"$dossier/erreur" || true
}

# Valeur de l'en-tête $1 (insensible à la casse), vide s'il manque.
entete() {
  tr -d '\r' <"$dossier/entetes" | awk -F': ' -v n="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')" \
    'tolower($1) == n { sub(/^[^:]*: */, ""); v = $0 } END { print v }'
}

# Affiche les écarts ; code 0 s'il n'y en a aucun.
verifie_front() {
  local statut ecarts=0 v
  statut="$(recupere "$BASE/")"
  [ "$statut" = 200 ] || { echo "  / : statut $statut au lieu de 200"; return 1; }
  v="$(entete Strict-Transport-Security)"
  case "$v" in
    max-age=*) ;;
    *) echo "  / : Strict-Transport-Security absent"; ecarts=1 ;;
  esac
  case "$v" in
    *preload*) echo "  / : preload sur l'essai (il ne vaut que pour la prod)"; ecarts=1 ;;
  esac
  [ "$(entete X-Content-Type-Options)" = nosniff ] || { echo "  / : X-Content-Type-Options != nosniff"; ecarts=1; }
  [ -n "$(entete Referrer-Policy)" ] || { echo "  / : Referrer-Policy absent"; ecarts=1; }
  [ -n "$(entete Permissions-Policy)" ] || { echo "  / : Permissions-Policy absent"; ecarts=1; }
  [ "$(entete Cross-Origin-Opener-Policy)" = same-origin ] || { echo "  / : Cross-Origin-Opener-Policy != same-origin"; ecarts=1; }
  # Report-only jusqu'à F23 (plan de la fondation du front) ; l'une ou l'autre doit être là.
  if [ -z "$(entete Content-Security-Policy)" ] && [ -z "$(entete Content-Security-Policy-Report-Only)" ]; then
    echo "  / : aucune Content-Security-Policy"; ecarts=1
  fi
  return "$ecarts"
}

verifie_api() {
  local statut ecarts=0
  statut="$(recupere "$BASE/api/healthz")"
  [ "$statut" = 200 ] || { echo "  /api/healthz : statut $statut au lieu de 200"; return 1; }
  case "$(entete Content-Type)" in
    application/json*) ;;
    *) echo "  /api/healthz : Content-Type '$(entete Content-Type)' au lieu de application/json"; ecarts=1 ;;
  esac
  [ "$(entete X-Content-Type-Options)" = nosniff ] || { echo "  /api/healthz : X-Content-Type-Options != nosniff"; ecarts=1; }
  [ -n "$(entete Cache-Control)" ] || { echo "  /api/healthz : Cache-Control absent"; ecarts=1; }
  return "$ecarts"
}

for essai in $(seq 1 "$ESSAIS"); do
  echo "Essai $essai/$ESSAIS sur $BASE"
  sortie="$(verifie_front 2>&1)"; rc_front=$?
  sortie_api="$(verifie_api 2>&1)"; rc_api=$?
  if [ "$rc_front" -eq 0 ] && [ "$rc_api" -eq 0 ]; then
    echo "Fumée verte."
    exit 0
  fi
  [ -z "$sortie" ] || echo "$sortie"
  [ -z "$sortie_api" ] || echo "$sortie_api"
  [ "$essai" -lt "$ESSAIS" ] && sleep "$PAUSE"
done
echo "Fumée rouge : $ESSAIS essais sans succès." >&2
exit 1
