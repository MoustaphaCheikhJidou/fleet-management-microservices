#!/usr/bin/env bash
set -euo pipefail

# Lists databases, IAM tables, and IAM users/roles, then fails if any user other than
# superadmin@example.com exists. Intended to prove DB reset state stays clean.

MYSQL_CONTAINER=${MYSQL_CONTAINER:-fleet-mysql}
MYSQL_USER=${MYSQL_USER:-root}
EXPECTED_USER=${EXPECTED_USER:-superadmin@example.com}
EXPECTED_ROLE=${EXPECTED_ROLE:-ROLE_ADMIN}

section() {
  printf '\n=== %s ===\n' "$1"
}

run_mysql() {
  local query="$1"
  docker exec -i "$MYSQL_CONTAINER" mysql -u"$MYSQL_USER" -N -B -e "$query"
}

section "Databases"
run_mysql "SHOW DATABASES;"

section "IAM tables (iam_db)"
run_mysql "SHOW TABLES FROM iam_db;"

section "IAM users + roles"
users_roles=$(run_mysql "SELECT u.email, COALESCE(r.name,'') AS role FROM iam_db.user u LEFT JOIN iam_db.user_roles ur ON u.id=ur.user_id LEFT JOIN iam_db.role r ON ur.role_id=r.id ORDER BY u.email;")
printf '%s\n' "$users_roles"

expected_line="${EXPECTED_USER}	${EXPECTED_ROLE}"

if [[ "$users_roles" == "$expected_line" ]]; then
  exit 0
else
  echo "Unexpected IAM users detected. Expected only: ${EXPECTED_USER} ${EXPECTED_ROLE}" >&2
  exit 1
fi