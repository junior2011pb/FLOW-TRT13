(function() {
    function criarOuAtualizarContador() {
        // Procura especificamente o container dos botões do topo ou o botão Entrar
        const botoesTopo = document.querySelector('header, .top-bar, div[style*="flex"], div');
        let badge = document.getElementById('contador-sistemas-topo');

        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'contador-sistemas-topo';
            badge.style.cssText = 'background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.3); padding: 6px 14px; border-radius: 8px; color: #fff; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center; margin-left: 15px; vertical-align: middle; box-shadow: 0 2px 5px rgba(0,0,0,0.2);';
            
            // Tenta inserir ao lado do botão 'Entrar' ou na barra superior
            const entrarBtn = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent.trim() === 'Entrar');
            if (entrarBtn && entrarBtn.parentNode) {
                entrarBtn.parentNode.insertBefore(badge, entrarBtn);
            } else {
                // Fallback: coloca no topo absoluto se não achar o botão
                badge.style.position = 'absolute';
                badge.style.top = '15px';
                badge.style.right = '120px';
                badge.style.zIndex = '9999';
                document.body.appendChild(badge);
            }
        }

        // Conta os cards reais exibidos na grelha do sistema
        const cards = document.querySelectorAll('.card, [class*="card"], [class*="sistema"]');
        const totalVisiveis = Array.from(cards).filter(c => c.offsetHeight > 30).length;

        badge.textContent = `Sistemas: ${totalVisiveis > 0 ? totalVisiveis : '51'}`;
    }

    // Executa repetidamente até garantir que a página carregou e o elemento foi inserido
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(criarOuAtualizarContador, 500);
        setTimeout(criarOuAtualizarContador, 1500);
        setTimeout(criarOuAtualizarContador, 3000);
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(criarOuAtualizarContador, 1000);
            setTimeout(criarOuAtualizarContador, 2500);
        });
    }

    // Atualiza periodicamente caso haja filtros de pesquisa
    setInterval(criarOuAtualizarContador, 2000);
})();
