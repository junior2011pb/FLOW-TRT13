import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { generateKeyPairSync, pbkdf2Sync, randomBytes } from 'node:crypto';
import worker from './index.js';

let originalFetch;
let currentDataFile;
let nextSha;
let env;
const origin = 'https://junior2011pb.github.io';

function encodeHash(password) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 310_000, 32, 'sha256');
  return `pbkdf2$310000$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function createAppPrivateKey() {
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return pair.privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
}
let currentAssetsFile;

async function call(path, method = 'GET', body, token) {
  const headers = { Origin: origin };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return worker.fetch(new Request(`https://flow-api.test${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  }), env);
}

before(async () => {
  originalFetch = globalThis.fetch;
  currentDataFile = null;
    currentAssetsFile = null;
  nextSha = 0;
  const values = new Map();
  env = {
    GITHUB_APP_ID: 'test-app-id',
    GITHUB_APP_PRIVATE_KEY: await createAppPrivateKey(),
    GITHUB_INSTALLATION_ID: 'test-installation-id',
    GITHUB_REPOSITORY: 'junior2011pb/FLOW-TRT13',
    GITHUB_BRANCH: 'main',
    FLOW_FRONTEND_ORIGINS: origin,
    SESSION_SIGNING_SECRET: 'test-session-secret-with-32-characters',
    ADMIN_PASSWORD_HASH: encodeHash('old-test-password-123'),
    FLOW_KV: {
      async get(key) { return values.get(key) ?? null; },
      async put(key, value) { values.set(key, value); },
      async delete(key) { values.delete(key); }
    }
  };

  globalThis.fetch = async (input, options = {}) => {
    const url = String(input);
    if (url.includes('/access_tokens')) return jsonResponse({ token: 'mock-installation-token', expires_at: new Date(Date.now() + 3_600_000).toISOString() });
    if (url.includes('/contents/data/flow.json?')) {
      if (!currentDataFile) return jsonResponse({ message: 'Not Found' }, 404);
      return jsonResponse({ content: Buffer.from(currentDataFile.content).toString('base64'), sha: currentDataFile.sha });
    }
    if (url.includes('/contents/data/flow-assets.json?')) {
      if (!currentAssetsFile) return jsonResponse({ message: 'Not Found' }, 404);
      return jsonResponse({ content: Buffer.from(currentAssetsFile.content).toString('base64'), sha: currentAssetsFile.sha });
    }
    if (url.includes('/contents/data/flow.json')) {
      const body = JSON.parse(options.body);
      if (currentDataFile && body.sha !== currentDataFile.sha) return jsonResponse({ message: 'sha conflict' }, 409);
      const content = Buffer.from(body.content, 'base64').toString('utf8');
      currentDataFile = { content, sha: `mock-sha-${++nextSha}` };
      return jsonResponse({ content: { sha: currentDataFile.sha } });
    }
    if (url.includes('/contents/data/flow-assets.json')) {
      const body = JSON.parse(options.body);
      if (currentAssetsFile && body.sha !== currentAssetsFile.sha) return jsonResponse({ message: 'sha conflict' }, 409);
      const content = Buffer.from(body.content, 'base64').toString('utf8');
      currentAssetsFile = { content, sha: `mock-assets-sha-${++nextSha}` };
      return jsonResponse({ content: { sha: currentAssetsFile.sha } });
    }
    throw new Error(`URL inesperada no teste: ${url}`);
  };
});

after(() => {
  globalThis.fetch = originalFetch;
});

test('API autentica, compartilha dados, detecta conflito e troca senha', async () => {
  const options = await worker.fetch(new Request('https://flow-api.test/api/data', {
    method: 'OPTIONS', headers: { Origin: origin }
  }), env);
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('Access-Control-Allow-Origin'), origin);

  const publicRead = await call('/api/data');
  assert.equal(publicRead.status, 200);
  assert.deepEqual(await publicRead.json(), { records: [], revision: null });

  const unauthorizedWrite = await call('/api/data', 'PUT', { records: [], revision: null });
  assert.equal(unauthorizedWrite.status, 401);

  const failedLogin = await call('/api/login', 'POST', { username: 'admin', password: 'wrong-password-123' });
  assert.equal(failedLogin.status, 401);

  const login = await call('/api/login', 'POST', { username: 'admin', password: 'old-test-password-123' });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  assert.ok(token);

  const records = [{
    id: 'custom_1', sistema: 'Teste', acesso: 'Público', descricao: 'Registro compartilhado',
    url: 'https://example.test/', responsavel: '', obs: '', fluxo: []
  }];
  const write = await call('/api/data', 'PUT', { records, revision: null }, token);
  assert.equal(write.status, 200);
  const writeResult = await write.json();
  assert.equal(writeResult.ok, true);

  const readAfterWrite = await call('/api/data');
  assert.equal(readAfterWrite.status, 200);
  assert.deepEqual((await readAfterWrite.json()).records, records);

  const unsafeUrl = await call('/api/data', 'PUT', {
    records: [{ id: 'custom_unsafe', sistema: 'Inseguro', url: 'javascript:alert(1)' }],
    revision: writeResult.revision
  }, token);
  assert.equal(unsafeUrl.status, 400);

  const conflict = await call('/api/data', 'PUT', { records: [], revision: null }, token);
  assert.equal(conflict.status, 409);

  const changePassword = await call('/api/password', 'POST', {
    currentPassword: 'old-test-password-123', newPassword: 'new-test-password-456'
  }, token);
  assert.equal(changePassword.status, 200);

  const newLogin = await call('/api/login', 'POST', { username: 'admin', password: 'new-test-password-456' });
  assert.equal(newLogin.status, 200);
  const oldLogin = await call('/api/login', 'POST', { username: 'admin', password: 'old-test-password-123' });
  assert.equal(oldLogin.status, 401);
});

test('API compartilha logo somente com sessão administrativa para escrita', async () => {
  const login = await call('/api/login', 'POST', { username: 'admin', password: 'new-test-password-456' });
  assert.equal(login.status, 200);
  const { token } = await login.json();

  const publicRead = await call('/api/assets');
  assert.equal(publicRead.status, 200);
  assert.deepEqual(await publicRead.json(), { assets: {}, revision: null });

  const unauthorizedWrite = await call('/api/assets', 'PUT', { assets: {}, revision: null });
  assert.equal(unauthorizedWrite.status, 401);

  const logo = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  const write = await call('/api/assets', 'PUT', { assets: { logo }, revision: null }, token);
  assert.equal(write.status, 200);

  const readAfterWrite = await call('/api/assets');
  assert.equal(readAfterWrite.status, 200);
  assert.equal((await readAfterWrite.json()).assets.logo, logo);

  const invalidLogo = await call('/api/assets', 'PUT', { assets: { logo: 'data:text/plain;base64,SGVsbG8=' }, revision: currentAssetsFile.sha }, token);
  assert.equal(invalidLogo.status, 400);
});
