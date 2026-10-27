const SUPABASE_URL = "https://usnpbeipfcyvbhzjtkjd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbnBiZWlwZmN5dmJoemp0a2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2OTcxNjksImV4cCI6MjA4NzI3MzE2OX0.H... (sua chave)";

async function carregarDados() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // Timeout de segurança de 4s

        const response = await fetch(`${SUPABASE_URL}/rest/v1/flow_data?id=eq.1&select=payload`, {
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error("Erro na resposta do Supabase");
        const data = await response.json();
        
        if (data && data.length > 0 && data[0].payload) {
            return data[0].payload;
        }
        return { records: [] };
    } catch (error) {
        console.warn("Aviso de rede, usando dados locais de resguardo:", error);
        // Retorna um objeto padrão garantido para nunca travar a tela de carregamento
        return window._cachedFlowData || { records: [] };
    }
}

async function salvarDados(novosDados) {
    try {
        window._cachedFlowData = novosDados;
        const response = await fetch(`${SUPABASE_URL}/rest/v1/flow_data?id=eq.1`, {
            method: "PATCH",
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            body: JSON.stringify({ payload: novosDados })
        });
        return response.ok;
    } catch (error) {
        console.error("Erro ao salvar:", error);
        return false;
    }
}

// Força disparos globais caso o app original espere por nomes específicos
window.carregarDadosFromGitHub = carregarDados;
window.salvarDadosNoGitHub = salvarDados;
