window.addEventListener('DOMContentLoaded', () => {
    // 1. Animar o logo no canto superior esquerdo para ficar se mexendo (efeito flutuação sutil)
    const logoContainer = document.querySelector('header img, .logo, [class*="logo"], a img, header > div:first-child');
    if (logoContainer) {
        logoContainer.style.animation = 'logoMoveAnim 3s ease-in-out infinite alternate';
    }

    // 2. Estilizar e posicionar o botão do GLPI perfeitamente ao lado dos botões do topo
    const basePublicaBtn = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent.includes('Base Pública'));
    if (basePublicaBtn) {
        let glpiBtn = document.getElementById('btn-glpi-custom');
        if (!glpiBtn) {
            glpiBtn = document.createElement('a');
            glpiBtn.id = 'btn-glpi-custom';
            glpiBtn.href = 'https://centraldeservicos.trt13.jus.br/front/ticket.php';
            glpiBtn.target = '_blank';
            glpiBtn.textContent = 'GLPI';
            glpiBtn.className = basePublicaBtn.className;
            basePublicaBtn.parentNode.insertBefore(glpiBtn, basePublicaBtn.nextSibling);
        }
        glpiBtn.style.marginLeft = '8px';
        glpiBtn.style.marginRight = '8px';
        glpiBtn.style.display = 'inline-flex';
        glpiBtn.style.alignItems = 'center';
        glpiBtn.style.justifyContent = 'center';
    }

    // 3. Adiciona as animações CSS globais
    if (!document.getElementById('flow-custom-animations')) {
        const style = document.createElement('style');
        style.id = 'flow-custom-animations';
        style.innerHTML = `
            @keyframes logoMoveAnim {
                0% { transform: translateY(0px) scale(1.2); }
                50% { transform: translateY(-3px) scale(1.23); }
                100% { transform: translateY(0px) scale(1.2); }
            }
            @keyframes glowMove {
                0% { text-shadow: 0 0 5px rgba(66,153,225,0.6), 0 0 10px rgba(66,153,225,0.4); transform: scale(1); }
                50% { text-shadow: 0 0 15px rgba(72,187,120,0.8), 0 0 25px rgba(72,187,120,0.6); transform: scale(1.03); }
                100% { text-shadow: 0 0 5px rgba(66,153,225,0.6), 0 0 10px rgba(66,153,225,0.4); transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    // Efeito no título FLOW
    const flowTitle = Array.from(document.querySelectorAll('h1, h2, .title, span')).find(el => el.textContent.trim() === 'FLOW');
    if (flowTitle) {
        flowTitle.style.animation = 'glowMove 3s infinite alternate';
    }
});
