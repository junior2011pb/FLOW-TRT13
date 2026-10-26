import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';

const source = await readFile(new URL('./github-db.js', import.meta.url), 'utf8');

function createFlowDb({ admin = true } = {}) {
  const calls = [];
  let signedOut = false;
  const session = { access_token: 'test-access-token', user: { email: 'admin@example.test' } };
  const client = {
    auth: {
      async getSession() { return { data: { session }, error: null }; },
      async signInWithPassword(credentials) {
        calls.push(['signInWithPassword', credentials]);
        return { data: { session, user: session.user }, error: null };
      },
      async signOut() { signedOut = true; return { error: null }; },
      async updateUser(attributes) { calls.push(['updateUser', attributes]); return { data: { user: session.user }, error: null }; }
    },
    async rpc(name, args) {
      calls.push(['rpc', name, args]);
      return { data: name === 'flow_is_admin' ? admin : 3, error: null };
    },
    from(table) {
      return {
        select(columns) {
          calls.push(['select', table, columns]);
          return {
            eq(column, value) {
              calls.push(['eq', column, value]);
              return {
                async maybeSingle() {
                  if (table === 'flow_state') return { data: { records: [{ id: 'sys_1', sistema: 'Aud' }], revision: 2 }, error: null };
                  return { data: { logo_data: 'data:image/jpeg;base64,AA==', revision: 4 }, error: null };
                }
              };
            }
          };
        }
      };
    }
  };

  const window = {
    FLOW_CONFIG: { supabaseUrl: 'https://project.supabase.co', supabaseAnonKey: 'public-anon-key' },
    supabase: { createClient(url, key) {
      calls.push(['createClient', url, key]);
      return client;
    } }
  };
  vm.runInNewContext(source, { window });
  return { api: window.flowDb, calls, wasSignedOut: () => signedOut };
}

test('Supabase adapter reads shared state/assets and saves through protected RPCs', async () => {
  const { api, calls } = createFlowDb();
  assert.equal(api.isConfigured, true);
  const state = await api.carregarDados();
  assert.equal(state.records[0].sistema, 'Aud');
  assert.equal(state.revision, 2);
  const saved = await api.salvarDados([{ id: 'sys_1', sistema: 'Aud' }], 2);
  assert.equal(saved.revision, 3);
  const assets = await api.carregarAssets();
  assert.equal(assets.logo_data, 'data:image/jpeg;base64,AA==');
  const logo = await api.salvarLogo('data:image/jpeg;base64,AA==', 4);
  assert.equal(logo.revision, 3);
  const login = await api.entrarAdmin('admin@example.test', 'test-password');
  assert.equal(login.token, 'test-access-token');
  const restored = await api.restaurarSessao();
  assert.equal(restored.authenticated, true);
  assert.ok(calls.some(call => call[0] === 'rpc' && call[1] === 'flow_save_state'));
});

test('adapter rejects a logged-in Supabase user without the FLOW admin role', async () => {
  const { api, wasSignedOut } = createFlowDb({ admin: false });
  await assert.rejects(api.entrarAdmin('user@example.test', 'test-password'), /não tem perfil de administrador/);
  assert.equal(wasSignedOut(), true);
});
