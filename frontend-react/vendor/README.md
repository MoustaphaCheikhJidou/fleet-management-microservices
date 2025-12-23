# Vendor bundles

Ces fichiers reprennent les builds UMD officiels de React 18 et HTM afin de fonctionner sans Node ni bundler.

## Contenu attendu

- `react.production.min.js`
- `react-dom.production.min.js`
- `react-dom-client.production.min.js`
- `htm.umd.js`

## Mise à jour

```bash
cd frontend-react/vendor
./download_vendor.sh
```

Le script télécharge les builds depuis `unpkg.com` et peut être relancé pour rafraîchir les versions. Incluez ces fichiers dans le contrôle de version afin de garantir un fonctionnement hors ligne.
