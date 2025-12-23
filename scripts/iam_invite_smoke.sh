#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
trap 'echo "[FATAL] command failed at line $LINENO"; exit 1' ERR

# Quick smoke test for IAM invite via gateway (port 8081) all the way to MailHog (port 8025).
# Fails if: signin is not JSON, token missing/short, roles lack ROLE_ADMIN, invite not 200, or mail not found.

BASE_URL="${BASE_URL:-http://localhost:8081}"
MAILHOG_URL="${MAILHOG_URL:-http://localhost:8025}"
ADMIN_EMAIL="${ADMIN_EMAIL:-superadmin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-ChangeMe_Admin!123}"
INVITE_EMAIL="${INVITE_EMAIL:-operator_test@example.com}"

tmp_files=()
cleanup() {
  for f in "${tmp_files[@]:-}"; do
    [[ -f "$f" ]] && rm -f "$f"
  done
}
trap cleanup EXIT

new_tmp() { f=$(mktemp); tmp_files+=("$f"); echo "$f"; }

header() { printf "\n== %s\n" "$*"; }
fail() { echo "[FAIL] $*" >&2; exit 1; }
ok() { echo "[OK] $*"; }

http_request() {
  # Usage: http_request <status_var> <body_var> <headers_var> -- <curl args>
  local __status_var=$1 __body_var=$2 __headers_var=$3; shift 3
  local body headers status rc
  body=$(new_tmp)
  headers=$(new_tmp)
  set +e
  status=$(curl -sS -D "$headers" -o "$body" -w "%{http_code}" "$@")
  rc=$?
  set -e
  if [[ $rc -ne 0 ]]; then
    echo "[FAIL] curl failed (rc=$rc): $*" >&2
    exit 1
  fi
  printf -v "$__status_var" '%s' "$status"
  printf -v "$__body_var" '%s' "$body"
  printf -v "$__headers_var" '%s' "$headers"
}

print_body_snippet() {
  local file=$1
  if [[ -s "$file" ]]; then
    echo "body (first 3 lines):"
    head -n 3 "$file" | sed 's/^/  /'
  else
    echo "body is empty"
  fi
}
###############################################################################
# A) Signin and validate JSON/token/roles
###############################################################################
header "Signin as superadmin and validate response"
signin_status=""; signin_body=""; signin_headers=""
http_request signin_status signin_body signin_headers -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  "$BASE_URL/api/v1/auth/signin"

echo "Signin HTTP status: $signin_status"
print_body_snippet "$signin_body"
[[ "$signin_status" == "200" ]] || { print_body_snippet "$signin_body"; fail "Signin failed (status $signin_status)"; }

python_out=$(python3 - "$signin_body" <<'PY'
import json, sys
path = sys.argv[1]
with open(path, "r", encoding="utf-8") as fh:
    data = json.load(fh)
token = data.get("token")
roles = data.get("roles") or []
email = data.get("email") or ""
assert token and len(token) > 50, "token missing or too short"
assert "ROLE_ADMIN" in roles, f"ROLE_ADMIN not present in roles: {roles}"
print(token)
print(",".join(roles))
print(email)
PY
)
IFS=$'\n' read -r TOKEN ROLES EMAIL <<<"$python_out" || fail "Failed to parse signin JSON"

ok "Signin JSON parsed; token length ${#TOKEN}; roles=[$ROLES]; email=$EMAIL"

###############################################################################
# B) Invite via /api/v1/admin/users/invite
###############################################################################
header "Invite operator via gateway"
invite_status=""; invite_body=""; invite_headers=""
http_request invite_status invite_body invite_headers -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$INVITE_EMAIL\",\"fullName\":\"Operator Test\",\"role\":\"CARRIER\",\"metadata\":{\"company\":\"TestCo\",\"city\":\"Rabat\",\"fleetSize\":1}}" \
  "$BASE_URL/api/v1/admin/users/invite"

echo "Invite HTTP status: $invite_status"
print_body_snippet "$invite_body"
[[ "$invite_status" == "200" ]] || { print_body_snippet "$invite_body"; fail "Invite failed (status $invite_status)"; }
ok "Invite accepted"

###############################################################################
# C) Verify email in MailHog
###############################################################################
header "Verify MailHog received invite"
mail_status=""; mail_body=""; mail_headers=""; found=0
for i in $(seq 1 15); do
  http_request mail_status mail_body mail_headers "$MAILHOG_URL/api/v2/search?kind=to&query=$INVITE_EMAIL"
  found=$(python3 - "$mail_body" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as fh:
    data = json.load(fh)
items = data.get("items", [])
print(len(items))
PY
)
  if [[ "$mail_status" == "200" && "$found" -gt 0 ]]; then
    break
  fi
  sleep 1
done

[[ "$mail_status" == "200" ]] || { print_body_snippet "$mail_body"; fail "MailHog search failed (status $mail_status)"; }
[[ "$found" -gt 0 ]] || { print_body_snippet "$mail_body"; fail "MailHog has no invite mail for $INVITE_EMAIL after waiting"; }
ok "MailHog reports $found message(s) for $INVITE_EMAIL"

echo "First message preview:"
python3 - "$mail_body" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as fh:
    data = json.load(fh)
items = data.get("items", [])
if not items:
    sys.exit(0)
first = items[0]
hdrs = first.get("Content", {}).get("Headers", {})
subject = hdrs.get("Subject", ["?"])[0]
date = hdrs.get("Date", ["?"])[0]
link = (first.get("Content", {}).get("Body", "").splitlines() or [""])
reset = next((line for line in link if "reset-password" in line), "(no link found)")
print(f"  Subject: {subject}")
print(f"  Date:    {date}")
print(f"  Link:    {reset}")
PY

ok "iam_invite_smoke passed"
rc=0
trap - ERR
set +e
exit "$rc"