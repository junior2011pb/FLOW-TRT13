// Módulo de Integração com o GitHub (dados.json)

const GH_CONFIG = {
  owner: "junior2011pb",
  repo: "FLOW-TRT13",
  path: "dados.json"
};

/**
 * Lê os dados atuais armazenados em dados.json
 */
async function carregarDados() {
  try {
    const response = await fetch(`https://raw.githubusercontent.com/${GH_CONFIG.owner}/${GH_CONFIG.repo}/main/${GH_CONFIG.path}?t=${Date.now()}`);
    if (!response.ok) throw new Error("Erro ao carregar dados do GitHub.");
    return await response.json();
  } catch (error) {
    console.error("Erro em carregarDados:", error);
    return null;
  }
}

/**
 * Grava novos dados no arquivo dados.json
 */
async function salvarDados(novosDados, token) {
  const tokenUtilizado = token || window.GH_TOKEN;

  if (!tokenUtilizado) {
    alert("Token de acesso do GitHub não encontrado!");
    return false;
  }

  try {
    const url = `https://api.github.com/repos/${GH_CONFIG.owner}/${GH_CONFIG.repo}/contents/${GH_CONFIG.path}`;
    
    // 1. Obtém o SHA atual do arquivo
    const getRes = await fetch(url, {
      headers: { "Authorization": `Bearer ${tokenUtilizado}` }
    });
    
    if (!getRes.ok) throw new Error("Erro ao consultar o arquivo no GitHub.");
    const fileData = await getRes.json();
    const sha = fileData.sha;

    // 2. Atualiza os dados com a data/hora atual
    novosDados.updated_at = new Date().toISOString();
    const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(novosDados, null, 2))));

    // 3. Envia o commit de atualização
    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${tokenUtilizado}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Atualização de dados via sistema FLOW-TRT13",
        content: contentBase64,
        sha: sha
      })
    });

    if (putRes.ok) {
      console.log("✅ Dados salvos com sucesso no GitHub!");
      return true;
    } else {
      const err = await putRes.json();
      console.error("❌ Erro no envio:", err);
      return false;
    }
  } catch (error) {
    console.error("Erro em salvarDados:", error);
    return false;
  }
}
