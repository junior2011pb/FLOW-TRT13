const GH_CONFIG = {
  owner: "junior2011pb",
  repo: "FLOW-TRT13",
  path: "dados.json"
};

async function carregarDados() {
  try {
    const response = await fetch(`https://raw.githubusercontent.com/${GH_CONFIG.owner}/${GH_CONFIG.repo}/main/${GH_CONFIG.path}?t=${Date.now()}`);
    if (!response.ok) throw new Error("Erro ao carregar os dados.");
    return await response.json();
  } catch (error) {
    console.error("Erro no carregarDados:", error);
    return null;
  }
}

async function salvarDados(novosDados, token) {
  if (!token) {
    alert("Token de acesso é obrigatório para salvar.");
    return false;
  }

  try {
    const url = `https://api.github.com/repos/${GH_CONFIG.owner}/${GH_CONFIG.repo}/contents/${GH_CONFIG.path}`;
    const getRes = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!getRes.ok) throw new Error("Erro ao buscar metadados do arquivo.");
    const fileData = await getRes.json();
    const sha = fileData.sha;

    novosDados.updated_at = new Date().toISOString();
    const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(novosDados, null, 2))));

    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Atualização automática via sistema FLOW-TRT13",
        content: contentBase64,
        sha: sha
      })
    });

    if (putRes.ok) {
      console.log("✅ Dados salvos com sucesso no GitHub!");
      return true;
    } else {
      console.error("❌ Erro ao salvar dados.");
      return false;
    }
  } catch (error) {
    console.error("Erro no salvarDados:", error);
    return false;
  }
}
