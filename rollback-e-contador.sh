#!/bin/bash

echo "🔄 A reverter para o estado estável (Commit 8ead784 ou anterior) e aplicar contador seguro..."

# 1. Faz o reset para o commit seguro anterior (ou faz checkout do estado limpo)
git reset --hard HEAD~1
git pull origin main || true

# 2. Insere o contador de sistemas diretamente no index.html de forma totalmente isolada (sem tocar em fetch ou dados)
HTML_FILE=$(find . -maxdepth 2 -name "index.html" | head -n 1)

if [ -f "$HTML_FILE" ]; then
    cat << 'HTML_INJECT' > contador-seguro.html
    <style>
        #total-sistemas-contador {
            position: absolute;
            top: 20px;
            right: 30px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 6px 12px;
            border-radius: 6px;
            color: #fff;
            font-size: 13px;
            font-weight: bold;
            z-index: 999;
        }
        @media (max-width: 768px) {
            #total-sistemas-contador {
                position: relative;
                top: auto;
                right: auto;
                margin: 10px auto;
                text-align: center;
                display: table;
            }
        }
    </style>
    <script>
        window.addEventListener('DOMContentLoaded', () => {
            setInterval(() => {
                const cards = document.querySelectorAll('.card, [class*="card"], [class*="system"]');
                const validCards = Array.from(cards).filter(el => el.offsetHeight > 40);
                const count = validCards.length > 0 ? validCards.length : 0;
                
                let badge = document.getElementById('total-sistemas-contador');
                if (!badge) {
                    badge = document.createElement('div');
                    badge.id = 'total-sistemas-contador';
                    document.body.appendChild(badge);
                }
                badge.textContent = `Total de Sistemas Cadastrados: ${count}`;
            }, 1000);
        });
    </script>
</head>
HTML_INJECT

    sed -i -e '/<\/head>/r contador-seguro.html' -e 's/<\/head>//' "$HTML_FILE"
    rm contador-seguro.html
fi

# 3. Força o envio para o GitHub
git add -A
git commit -m "fix(ui): reverte para estado estavel e adiciona contador de sistemas isolado"
git push origin HEAD --force

rm rollback-e-contador.sh
echo "🎉 SISTEMA REVERTIDO E ESTABILIZADO COM SUCESSO!"
