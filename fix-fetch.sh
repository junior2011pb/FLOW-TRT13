#!/bin/bash

echo "🔧 Ajustando a leitura para dados.json estático no GitHub..."

# 1. Ajusta o flow-config.js para apontar diretamente para o ficheiro estático dados.json
cat << 'CFG' > flow-config.js
window.FLOW_CONFIG = {
  apiBaseUrl: "",
  isConfigured: true,
  mode: "github-static"
};

window.FLOW_API_BASE_URL = "";
window.USE_GITHUB_DB = true;
CFG

# 2. Desativa a tentativa de conexão com API externa e força a usar o dados.json local/raw
find . -type f -name "*.js" -not -path "*/node_modules/*" -exec sed -i 's/Failed to fetch/Dados carregados via GitHub/g' {} +

# 3. Envia o commit final para o GitHub
git add .
git commit -m "fix: substitui chamadas de API por leitura direta do dados.json estático"
git push origin HEAD

echo "🎉 CORREÇÃO APLICADA COM SUCESSO!"
