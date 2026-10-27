window.addEventListener('DOMContentLoaded', () => {
    // Aumentar o logo levemente
    const logoArea = document.querySelector('header img, .logo, [class*="logo"], a img');
    if (logoArea) {
        logoArea.style.transform = 'scale(1.25)';
        logoArea.style.transformOrigin = 'left center';
    }

    // Adicionar botão do GLPI ao lado de Base Pública
    const basePublicaBtn = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent.includes('Base Pública'));
    if (basePublicaBtn && !document.getElementById('btn-glpi-custom')) {
        const glpiBtn = document.createElement('a');
        glpiBtn.id = 'btn-glpi-custom';
        glpiBtn.href = 'https://centraldeservicos.trt13.jus.br/front/ticket.php';
        glpiBtn.target = '_blank';
        glpiBtn.textContent = 'GLPI';
        glpiBtn.className = basePublicaBtn.className;
        glpiBtn.style.marginLeft = '8px';
        glpiBtn.style.backgroundColor = '#2b6cb0';
        glpiBtn.style.color = '#fff';
        basePublicaBtn.parentNode.insertBefore(glpiBtn, basePublicaBtn.nextSibling);
    }

    // Efeito de movimento ao redor do título FLOW
    const flowTitle = Array.from(document.querySelectorAll('h1, h2, .title, span')).find(el => el.textContent.trim() === 'FLOW');
    if (flowTitle) {
        flowTitle.style.animation = 'glowMove 3s infinite alternate';
        
        if (!document.getElementById('flow-glow-style')) {
            const style = document.createElement('style');
            style.id = 'flow-glow-style';
            style.innerHTML = `
                @keyframes glowMove {
                    0% { text-shadow: 0 0 5px rgba(66,153,225,0.6), 0 0 10px rgba(66,153,225,0.4); transform: scale(1); }
                    50% { text-shadow: 0 0 15px rgba(72,187,120,0.8), 0 0 25px rgba(72,187,120,0.6); transform: scale(1.03); }
                    100% { text-shadow: 0 0 5px rgba(66,153,225,0.6), 0 0 10px rgba(66,153,225,0.4); transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
    }
});
