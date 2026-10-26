const SUPABASE_URL = "https://usnpbeipfcyvbhzjtkjd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbnBiZWlwZmN5dmJoemp0a2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMTY3MTEsImV4cCI6MjEwODU5MjcxMX0.LA7XRP_XwzohlKxPkXTzVjQLZz1L5L85bYTo80kaw3Y";

async function carregarDados() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/flow_data?id=eq.1&select=payload`, {
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (!response.ok) throw new Error("Erro ao carregar do Supabase");
        const data = await response.json();
        
        if (data && data.length > 0) {
            return data[0].payload;
        }
        return { records: [] };
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
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
