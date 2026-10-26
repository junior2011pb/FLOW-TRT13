// Interceptor Global e Camada Supabase para FLOW-TRT13
const SUPABASE_URL = "https://usnpbeipfcyvbhzjtkjd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbnBiZWlwZmN5dmJoemp0a2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2OTcxNjksImV4cCI6MjA4NzI3MzE2OX0.H... (sua chave)";

async function carregarDados() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/flow_data?id=eq.1&select=payload`, {
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (!response.ok) throw new Error("Erro 404 simulado ou falha de rede");
        const data = await response.json();
        
        if (data && data.length > 0) {
            return data[0].payload;
        }
        return { records: [] };
    } catch (error) {
        console.warn("Aviso: A usar dados locais de fallback devido a:", error);
        return { records: [] };
    }
}

async function salvarDados(novosDados) {
    try {
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

        if (!response.ok) throw new Error("Erro ao salvar no Supabase");
        return true;
    } catch (error) {
        console.error("Erro ao salvar dados:", error);
        return false;
    }
}

// Sobrescreve funções globais antigas caso o app.js tente chamá-las
window.carregarDadosFromGitHub = carregarDados;
window.salvarDadosNoGitHub = salvarDados;
