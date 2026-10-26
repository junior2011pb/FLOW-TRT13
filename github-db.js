async function carregarDados() {
    try {
        // Tenta carregar o dados.json diretamente do GitHub Pages (rota relativa ou absoluta)
        const response = await fetch('./dados.json?t=' + new Date().getTime());
        if (!response.ok) {
            console.warn("dados.json não encontrado ou vazio. A retornar estrutura padrão.");
            return { records: [] };
        }
        return await response.json();
    } catch (error) {
        console.error("Erro ao carregar dados locais:", error);
        return { records: [] };
    }
}

async function salvarDados(novosDados, token) {
    try {
        if (!token) {
            alert("Token do GitHub não configurado para salvamento.");
            return false;
        }

        const url = "https://api.github.com/repos/junior2011pb/FLOW-TRT13/contents/dados.json";
        
        // Obter SHA atual do ficheiro para atualizar na API do GitHub
        const getRes = await fetch(url, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        let sha = "";
        if (getRes.ok) {
            const fileInfo = await getRes.json();
            sha = fileInfo.sha;
        }

        const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(novosDados, null, 2))));
        
        const putRes = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "chore(db): atualiza dados.json via interface",
                content: contentEncoded,
                sha: sha,
                branch: "main"
            })
        });

        if (!putRes.ok) throw new Error("Erro ao salvar no GitHub. Status: " + putRes.status);
        return true;
    } catch (error) {
        console.error("Erro em salvarDados:", error);
        return false;
    }
}
