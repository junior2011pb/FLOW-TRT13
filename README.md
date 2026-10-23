# FLOW-TRT13

Catálogo de escalonamento publicado no GitHub Pages. O frontend é estático; a API compartilhada usa Cloudflare Workers e grava o arquivo `data/flow.json` neste repositório por meio de um GitHub App.

## Arquitetura de persistência

- `Index.html` e `index.html`: frontend público.
- `flow-config.js`: URL pública do Worker; nunca deve conter tokens ou chaves.
- `worker/index.js`: API de leitura, login, escrita e troca de senha.
- `data/flow.json`: registros compartilhados e versionados no GitHub.
- `data/flow-assets.json`: logo compartilhada.
- Cloudflare KV: hash da senha administrativa e limite de tentativas de login.
- Segredos do Worker: chave privada do GitHub App, hash inicial da senha e segredo de sessão.

O frontend não contém credenciais GitHub. O Worker valida a sessão admin, usa o GitHub App instalado apenas neste repositório e verifica a revisão do arquivo para detectar edições concorrentes. A API pública só permite leitura; criação, edição, exclusão, importação e troca de senha exigem autenticação.

## Configuração inicial

A ativação ainda depende de configurar os recursos abaixo nas contas Cloudflare e GitHub. Os arquivos deste repositório não incluem nem devem incluir chaves privadas.

1. Crie um GitHub App para a organização/usuário dono de `junior2011pb/FLOW-TRT13`. Dê somente a permissão de repositório **Contents: Read and write**, instale-o apenas nesse repositório e gere uma chave privada. Não habilite webhooks para este uso.
2. Crie um namespace KV na Cloudflare e copie o ID. Copie também o Account ID da conta.
3. Copie `worker/wrangler.toml.example` para `worker/wrangler.toml` e informe Account ID, App ID, Installation ID, ID do namespace KV, `GITHUB_REPOSITORY` e origem permitida do Pages. `worker/wrangler.toml` é local e não deve receber chave privada.
4. Gere um hash inicial de senha em terminal local interativo: `node worker/generate-password-hash.mjs`. Digite uma senha forte de pelo menos 12 caracteres quando solicitado. Guarde somente a saída hash para o próximo passo. Não cole a senha ou a chave privada no chat.
5. No painel do repositório, configure estes GitHub Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GITHUB_APP_PRIVATE_KEY` (PEM completo), `ADMIN_PASSWORD_HASH` (hash produzido no passo anterior) e `SESSION_SIGNING_SECRET` (valor aleatório de pelo menos 32 bytes).
6. Configure estas GitHub Actions variables do repositório: `FLOW_GITHUB_APP_ID`, `FLOW_GITHUB_INSTALLATION_ID`, `FLOW_KV_NAMESPACE_ID` e `FLOW_FRONTEND_ORIGINS`. O workflow gera `wrangler.toml` temporariamente no runner; o arquivo e as chaves não são versionados.
7. Execute manualmente o workflow **Deploy FLOW API**. Ele cria/atualiza o Worker e publica os três secrets de runtime nele.
8. Copie a URL `https://<worker>.<subdominio>.workers.dev` para `flow-config.js` como `window.FLOW_API_BASE_URL`. O domínio raiz deve ser exatamente a origem do GitHub Pages, sem barra final; confirme a URL do Pages nas configurações do repositório e ajuste `FLOW_FRONTEND_ORIGINS` se o domínio for diferente.
9. Antes de migrar, no navegador que contém as edições locais, entre como admin e use **Exportar backup**. Depois que a API estiver implantada e o frontend apontar para ela, entre no admin e importe esse JSON. A importação exige confirmação e passa a gravar a cópia compartilhada no `data/flow.json`. Não limpe os dados desse navegador até confirmar a importação.

## Rotas da API

- `GET /api/data`: leitura pública de registros e revisão atual.
- `GET /api/assets`: leitura pública da logo compartilhada.
- `POST /api/login`: valida usuário `admin` e senha contra hash PBKDF2; retorna token assinado e limitado a 8 horas.
- `PUT /api/data`: grava registros usando GitHub Contents API e exige token admin e revisão atual.
- `PUT /api/assets`: atualiza a logo e exige token admin e revisão atual.
- `POST /api/password`: troca senha com sessão admin válida.

Sem `FLOW_API_BASE_URL`, o frontend preserva o fallback local para recuperação/exportação, exibe um aviso e bloqueia alterações para não mostrar falso sucesso. Isso não substitui a configuração e o deploy da API.