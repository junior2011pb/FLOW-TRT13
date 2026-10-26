# FLOW-TRT13

Catálogo de escalonamento servido pelo GitHub Pages e persistido no Supabase. O frontend usa somente a chave pública `anon`; tabelas com RLS e funções `SECURITY DEFINER` fazem a autorização.

## Arquivos

- `Index.html` e `index.html`: interface pública; o Pages serve `index.html`.
- `flow-config.js`: URL do projeto e chave pública Supabase.
- `github-db.js`: cliente Supabase para dados, assets e autenticação.
- `supabase/migrations/20261026000000_flow_state.sql`: tabelas, RLS e RPCs.

## Ativar Supabase

1. No Supabase Dashboard, abra **SQL Editor** e execute o conteúdo de `supabase/migrations/20261026000000_flow_state.sql`. A consulta anônima já confirmou que `flow_state` ainda não existia (`PGRST205`); até aplicar a migration, o aviso de banco não conectado é esperado.
2. Em **Authentication → Users**, crie o usuário admin com e-mail e senha. Copie o UUID desse usuário.
3. No SQL Editor, associe somente esse usuário ao perfil admin, substituindo o e-mail:

	```sql
	insert into public.flow_admins (user_id)
	select id from auth.users where email = 'admin@trt13.jus.br'
	on conflict (user_id) do nothing;
	```

4. Em **Project Settings → API**, confirme que Project URL e chave pública `anon`/`publishable` correspondem a `flow-config.js`. Essa chave é pública por projeto; nunca coloque `service_role` no frontend.
5. Publique `flow-config.js`, `github-db.js`, a migration e os HTMLs no branch `main`. O workflow do GitHub Pages publica o frontend.
6. No site publicado, entre com o e-mail criado. O acesso administrativo também precisa passar por `flow_is_admin`; só depois da migration e do vínculo do UUID os botões de edição liberam gravação.
7. Para levar as alterações antigas do navegador, use **Exportar backup** antes de qualquer limpeza. Depois do login Supabase, use **Migrar dados deste navegador**; confirme que os dados aparecem para outro navegador antes de apagar o armazenamento antigo.

## Segurança e persistência

- `anon` não recebe permissões de escrita direta nas tabelas. `flow_state` e `flow_assets` permitem leitura pública; as gravações passam pelas RPCs `flow_save_state` e `flow_save_logo`, que exigem sessão Auth e perfil em `flow_admins`.
- As gravações têm revisão para impedir que duas edições concorrentes se sobrescrevam silenciosamente.
- Sem Supabase configurada, a interface preserva dados locais para recuperação e bloqueia gravações que poderiam aparentar sucesso sem salvar.