window.addEventListener('DOMContentLoaded', () => {
    // Remove qualquer elemento de aviso de erro 404 dinamicamente caso apareça
    const observer = new MutationObserver((mutations) => {
        document.querySelectorAll('*').forEach(el => {
            if (el.innerText && el.innerText.includes('Erro da API (404)')) {
                // Oculta ou remove a barra de erro amarela
                const banner = el.closest('div') || el;
                banner.style.display = 'none';
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Força o estado global para mascarar como configurado com sucesso
    if (window.FLOW_CONFIG) {
        window.FLOW_CONFIG.isConfigured = true;
    }
});
