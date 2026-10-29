window.addEventListener('DOMContentLoaded', () => {
    const injetarContador = setInterval(() => {
        // Procura o botão 'Entrar' ou o menu superior para se alinhar perfeitamente
        const entrarBtn = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent.includes('Entrar'));
        
        if (entrarBtn && entrarBtn.parentNode) {
            let badge = document.getElementById('contador-sistemas-topo');
            if (!badge) {
                badge = document.createElement('span');
                badge.id = 'contador-sistemas-topo';
                badge.style.cssText = 'background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 6px; color: #fff; font-size: 12px; font-weight: bold; margin-right: 8px; vertical-align: middle; display: inline-block;';
                entrarBtn.parentNode.insertBefore(badge, entrarBtn);
            }
            
            // Conta os cartões visíveis na tela
            const cards = document.querySelectorAll('.card, [class*="card"], [class*="system"]');
            const validCards = Array.from(cards).filter(el => el.offsetHeight > 40);
            const count = validCards.length > 0 ? validCards.length : 0;
            
            badge.textContent = `Sistemas: ${count}`;
        }
    }, 1000);
});
