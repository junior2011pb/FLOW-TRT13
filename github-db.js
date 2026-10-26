// Compatibilidade para chamadas legadas: toda leitura/gravação passa pelo Worker.
async function carregarDados() {
  try {
    const result = await flowApi('/api/data', { method: 'GET' });
    apiRevision = result.revision || null;
    return Array.isArray(result.records) ? result.records : [];
  } catch (error) {
    console.error('Erro ao carregar dados compartilhados:', error);
    return null;
  }
}

async function salvarDados(records) {
  try {
    const result = await flowApi('/api/data', {
      method: 'PUT',
      body: JSON.stringify({ records, revision: apiRevision })
    });
    apiRevision = result.revision;
    return true;
  } catch (error) {
    console.error('Erro ao salvar dados no Worker:', error);
    return false;
  }
}
