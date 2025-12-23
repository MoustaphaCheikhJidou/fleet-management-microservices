PHASE 1 ✅
PHASE 2 ✅ (auth same-origin OK)
PHASE 3 ✅ (0 vocabulaire technique UI)
PHASE 4 ✅ (cockpit admin mock validé : KPIs, 2 graphiques, 5 tables, filtres, ajout, refresh; fallback sans backend)
- 2025-12-22 preuves: [frontend-react/proofs/admin-proof.json](frontend-react/proofs/admin-proof.json), [frontend-react/proofs/admin-dashboard.png](frontend-react/proofs/admin-dashboard.png)
- Critères: KPIs=6, graphes=12, tables=5, filtres Critique 18->2, refresh alertes=3 et kpi alertes 10->12, ajout exploitant 5->6, scan_forbidden OK

## PHASE 6.1 — Preuves dashboards Exploitant/Conducteur
- operator-live-fallback.png / driver-live-fallback.png copiés dans frontend-react/proofs/
- scan_forbidden: ✅

## PHASE 4.2 — Graphiques Admin visibles
- Preuve: frontend-react/proofs/admin-charts-visible.png + .json (barsCount=12, height>0)
- Accès admin via session injectée, fallback démo OK, scan_forbidden ✅

## PHASE 6.2 — Admin live-first + fallback (charts persistants)
- Preuve: frontend-react/proofs/admin-charts-never-disappear.png + .json (before/afterLive/afterMock bars=12)
- Fallback série mock si alertes live absentes, boutons live/mock conservés, scan_forbidden ✅

## PHASE 9 — Preuves comptes Conducteur & Exploitant (MAD)
- scan_forbidden: ✅
- driver-account-proof.(png|json): ✅ (EXIT 0)
- operator-account-proof.(png|json): ✅ (EXIT 0)

## PHASE 10 — Stabilisation UX (verrouillée)
- Smoke HTTP: HOME/LOGIN/SIGNUP/ADMIN/DASH = 200
- scan_forbidden: ✅
- Proofs Playwright: ✅ (tous EXIT 0)
- UX: nav active ✅, banners auto-dismiss ~4s ✅, tables responsive ✅

## PHASE DB-RESET-1 — Réinitialisation base (verrouillée)
- Backup: /tmp/db_backup/backup_2025-12-23_1252.sql (MySQL)
- Volume reset: fleet-management-microservices_mysql_data supprimé puis recréé
- Smoke auth: superadmin@example.com OK (200 via gateway), jiddou/medou refusés (403)
- Proofs Playwright: ✅ login_flow, admin_charts_never_disappear, admin_filters_actions
- scan_forbidden: ✅
- Seul compte actif: admin seed (ROLE_ADMIN), UI admin rôle clair

## PHASE 11 — Admin clean + creation flows + charts
- Admin /admin sans données démo par défaut (fallback démo uniquement via flag localStorage fleet_demo=1)
- Tables comptes mock retirées; état vide guidé; formulaires exploitant/conducteur validés + persistance locale (fleet_admin_seed)
- Graphiques Chart.js visibles même à zéro (admin-daily-canvas/admin-type-canvas); KPIs recalculés après créations
- Preuves: frontend-react/proofs/admin-clean-create-proof.(png|json)
- Playwright: prove_admin_clean_create_flows.js (EXIT 0 attendu)
- Playwright: prove_admin_charts_never_disappear.js (EXIT 0 attendu)
- scan_forbidden: ✅

## INVITE & ACTIVATE — Proof charts live-only (admin)
- scan_forbidden: ✅
- prove_admin_charts_never_disappear.js: ✅ (EXIT 0)
- artefacts: frontend-react/proofs/admin-charts-never-disappear.(png|json)
