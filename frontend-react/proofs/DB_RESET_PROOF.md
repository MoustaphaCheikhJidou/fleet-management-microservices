# DB reset proof (post-volume reset)

- Date: 2025-12-23
- Stack: running (not stopped); keep volume intact (do **not** run `docker compose down -v`).

## Commands executed

1. Audit script
   - Command: `./scripts/db_audit.sh`
   - Purpose: list DBs, IAM tables, users+roles; exit 0 only if superadmin is the sole user.

2. Smoke signin (gateway → IAM)
   - Command: `curl -sS -i -H "Content-Type: application/json" -X POST http://localhost:8081/api/v1/auth/signin -d '{"email":"superadmin@example.com","password":"ChangeMe_Admin!123"}' | sed -E 's/("token"\s*:\s*")([^\"]+)(")/\1<redacted>\3/'`
   - Purpose: confirm admin login works and roles are returned.
   - Signup: not activated in this phase (PHASE 11 pending).

## Outputs (captured)

```
=== Databases ===
iam_db
information_schema
issues_db
mysql
performance_schema
profiles_db
shipments_db
sys
vehicles_db

=== IAM tables (iam_db) ===
role
user
user_roles

=== IAM users + roles ===
superadmin@example.com	ROLE_ADMIN
```

```
HTTP/1.1 200 OK
Server: nginx/1.25.5
Content-Type: application/json
...
{"id":1,"email":"superadmin@example.com","roles":["ROLE_ADMIN"],"token":"<redacted>"}
```

## Acceptance recap

- Audit script exits 0 and shows only superadmin@example.com ROLE_ADMIN.
- No demo/test users present.
- Admin signin returns 200 with ROLE_ADMIN.
- Reminder: leave the DB volume as-is; avoid `docker compose down -v`.