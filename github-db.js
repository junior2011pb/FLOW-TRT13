async function carregarDados() {
    try {
        const config = window.FLOW_CONFIG || {};
        const url = config.apiBaseUrl || "https://api.github.com/repos/junior2011pb/FLOW-TRT13/contents/dados.json";
        
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn("Ficheiro dados.json não encontrado na API. A usar estrutura vazia.");
                return { records: [] };
            }
            throw new Error("Erro ao carregar dados do GitHub. Status: " + response.status);
        }
        
        const fileData = await response.json();
        if (fileData && fileData.content) {
            const decodedContent = decodeURIComponent(escape(atob(fileData.content.replace(/\s/g, ''))));
            return JSON.parse(decodedContent);
        }
        return { records: [] };
    } catch (error) {
        console.error("Erro em carregarDados:", error);
        return null;
    }
}

async function salvarDados(novosDados, token) {
    try {
        const config = window.FLOW_CONFIG || {};
        const url = config.apiBaseUrl || "https://api.github.com/repos/junior2011pb/FLOW-TRT13/contents/dados.json";
        
        // Obter SHA atual do ficheiro
        const getRes = await fetch(url);
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
                message: "chore(db): atualiza dados.json via frontend",
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
