#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
fetch() {
  local url="$1"
  local output="$2"
  echo "→ Téléchargement ${output}"
  curl -fsSL "$url" -o "$output"
}

fetch "https://unpkg.com/react@18/umd/react.production.min.js" "react.production.min.js"
fetch "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" "react-dom.production.min.js"
fetch "https://unpkg.com/htm@3.1.1/dist/htm.umd.js" "htm.umd.js"

cat <<'EOF' > react-dom-client.production.min.js
/*! ReactDOMClient bridge – dépend de react-dom.production.min.js */
if (typeof window !== 'undefined' && window.ReactDOM) {
  window.ReactDOMClient = window.ReactDOM;
}
EOF

echo "✅ Bundles UMD téléchargés."
