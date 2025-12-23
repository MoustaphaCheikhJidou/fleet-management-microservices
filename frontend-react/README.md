# Frontend React (sans build)

Ce dossier contient une première migration du front FleetOS vers React (chargé en modules ESM, sans dépendance à Node). L’interface reprend la charte métier existante et reste 100 % compatible same-origin via `/api`.

## Structure

- `index.html` : point d’entrée SPA (import map vers React vendorizé)
- `src/` : pages, router minimal, services (`config`, `api`, `session`, `adminDataService`) et styles
- `vendor/` : bundles ESM de React, ReactDOM et `htm`
- `mock/` : données métier pour animer immédiatement le tableau de bord admin
- `nginx.conf` + `Dockerfile` : service statique avec proxy `/api` → gateway

## Lancer en local (sans Node)

```bash
# Depuis la racine du repo
DOCKER_BUILDKIT=1 docker compose up -d frontend-react-ui
```

L’interface sera accessible sur http://localhost:8082 (le legacy reste servi sur 8081).

## Règles fonctionnelles

- Tous les appels réseau passent par `safeFetch` avec `API_BASE_URL = '/api'`
- Aucun texte technique n’apparaît dans l’UI ; seuls les concepts métier sont exposés
- Les gardes d’accès redirigent immédiatement vers `/login` ou `/dashboard` si besoin
- Le tableau de bord administrateur affiche des KPIs, graphes CSS et tableaux basés sur `adminMockData`

## Vérifications

Un script (`scripts/scan_forbidden.py`) permet de s’assurer qu’aucun endpoint interdit (ports backend internes) n’apparaît dans le code React :

```bash
cd frontend-react
python3 scripts/scan_forbidden.py
```

Ce socle pourra être remplacé par un projet Vite dès que Node/npm seront disponibles, sans perdre la hiérarchie ni les services existants.
