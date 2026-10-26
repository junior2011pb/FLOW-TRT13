#!/bin/bash

echo "🚀 Aplicando correção sênior de configuração do banco de dados..."

# 1. Reescreve o flow-config.js com os parâmetros válidos exigidos pela aplicação
cat << 'CFG' > flow-config.js
// Configuração Oficial do Banco no GitHub para FLOW-TRT13
window.FLOW_API_BASE_URL = "https://api.github.com/repos/junior2011pb/FLOW-TRT13/contents";

window.FLOW_CONFIG = {
  apiBaseUrl: "https://api.github.com/repos/junior2011pb/FLOW-TRT13/contents",
  isConfigured: true,
  storageType: "github",
  repo: "junior2011pb/FLOW-TRT13",
  branch: "main",
  path: "dados.json"
};
CFG

# 2. Garante que o index.html importa o flow-config.js e o github-db.js na ordem correta
HTML_FILE=$(find . -maxdepth 2 -name "index.html" | head -n 1)

if [ -n "$HTML_FILE" ]; then
    # Remove chamadas duplicadas para evitar conflito de versão
    sed -i '/flow-config.js/d' "$HTML_FILE"
    sed -i '/github-db.js/d' "$HTML_FILE"
    
    # Injeta a ordem de dependências correta no <head>
    sed -i 's|</head>|  <script src="flow-config.js"></script>\n  <script src="github-db.js"></script>\n</head>|g' "$HTML_FILE"
    echo "✅ Ordem de carregamento ajustada em $HTML_FILE"
fi

# 3. Commit e envio direto para o repositório
git add .
git commit -m "fix(core): estabelece contrato de API do GitHub e remove alerta de configuracao"
git push origin HEAD

rm fix-senior.sh

echo ""
echo "🎉 CORREÇÃO APLICADA E ENVIADA COM SUCESSO!"
