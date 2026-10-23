#!/bin/bash

echo "🚀 Conectando o banco de dados ao seu site automaticamente..."

HTML_FILE=$(find . -maxdepth 2 -name "*.html" | head -n 1)

if [ -n "$HTML_FILE" ]; then
    echo "📄 Arquivo $HTML_FILE encontrado. Injetando a tag de script..."
    if ! grep -q "github-db.js" "$HTML_FILE"; then
        sed -i 's|</head>|  <script src="github-db.js"></script>\n</head>|g' "$HTML_FILE"
        echo "✅ Script github-db.js adicionado ao $HTML_FILE!"
    else
        echo "ℹ️ Script já estava presente no $HTML_FILE."
    fi
else
    echo "⚠️ Nenhum arquivo HTML encontrado."
fi

git add .
git commit -m "feat: conecta o github-db.js automaticamente na interface"
git push origin HEAD

rm conectar.sh

echo ""
echo "🎉 TUDO PRONTO E CONECTADO COM SUCESSO!"
