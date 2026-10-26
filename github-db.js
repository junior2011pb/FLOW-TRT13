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
        if (!response.ok) return { records: [] };
        const data = await response.json();
        return (data && data.length > 0) ? data[0].payload : { records: [] };
    } catch (e) {
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
        return response.ok;
    } catch (e) {
        return false;
    }
}
