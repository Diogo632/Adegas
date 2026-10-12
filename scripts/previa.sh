#!/usr/bin/env bash
# Monta a pasta site/ com a prévia publicada no GitHub Pages:
#   site/          página inicial (previa/index.html)
#   site/painel/   painel web
#   site/app/      app (versão web)
# Uso: BASE=/Adegas npm run previa   (BASE = caminho do site; vazio = raiz)
set -euo pipefail

BASE="${BASE:-}"
raiz="$(cd "$(dirname "$0")/.." && pwd)"
site="$raiz/site"

rm -rf "$site"
mkdir -p "$site"

npm run build:demo --workspace @adegas/web
cp -r "$raiz/apps/web/dist-demo" "$site/painel"

(cd "$raiz/apps/mobile" && ADEGAS_BASE_URL="$BASE/app" EXPO_OFFLINE=1 npx expo export --platform web --output-dir "$site/app")

cp "$raiz/previa/index.html" "$site/index.html"
# O GitHub Pages mostra o 404.html quando alguém recarrega numa tela do app (ex.: /app/venda).
cp "$site/app/index.html" "$site/404.html"
# Sem isso o GitHub Pages esconde a pasta _expo do app.
touch "$site/.nojekyll"

echo "Prévia pronta em $site"
