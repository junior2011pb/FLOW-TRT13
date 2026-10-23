const API_VERSION = '2022-11-28';
const DATA_PATH = 'data/flow.json';
const ASSETS_PATH = 'data/flow-assets.json';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const MAX_DATA_BYTES = 950_000;
const MAX_RECORDS = 250;
const MAX_LOGO_CHARS = 800_000;
let installationTokenCache;

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request, env);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      if (url.pathname === '/api/data' && request.method === 'GET') {
        const data = await readData(env);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (url.pathname === '/api/login' && request.method === 'POST') {
        return await handleLogin(request, env, corsHeaders);
      }

      if (url.pathname === '/api/session' && request.method === 'GET') {
        const session = await requireSession(request, env);
        return jsonResponse({ authenticated: Boolean(session) }, session ? 200 : 401, corsHeaders);
      }

      if (url.pathname === '/api/data' && request.method === 'PUT') {
        await requireSession(request, env);
        const body = await readJsonBody(request);
        const records = validateRecords(body.records);
        const result = await writeData(env, records, body.revision ?? null);
        return jsonResponse(result, 200, corsHeaders);
      }

      if (url.pathname === '/api/assets' && request.method === 'GET') {
        const assets = await readAssets(env);
        return jsonResponse(assets, 200, corsHeaders);
      }

      if (url.pathname === '/api/assets' && request.method === 'PUT') {
        await requireSession(request, env);
        const body = await readJsonBody(request);
        const result = await writeAssets(env, body.assets, body.revision ?? null);
        return jsonResponse(result, 200, corsHeaders);
      }

      if (url.pathname === '/api/password' && request.method === 'POST') {
        return await handlePasswordChange(request, env, corsHeaders);
      }

      return jsonResponse({ error: 'Rota não encontrada.' }, 404, corsHeaders);
    } catch (error) {
      const status = error.status || 500;
      if (status >= 500) console.error('FLOW API error:', error);
      return jsonResponse({ error: error.message || 'Erro interno da API.' }, status, corsHeaders);
    }
  }
};

async function handleLogin(request, env, corsHeaders) {
  requireBackendConfig(env);
  const body = await readJsonBody(request);
  if (body.username !== 'admin' || typeof body.password !== 'string') {
    return jsonResponse({ error: 'Credenciais inválidas.' }, 401, corsHeaders);
  }

  const clientId = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateKey = `login:${await sha256Hex(clientId)}`;
  const attempts = Number(await env.FLOW_KV.get(rateKey) || '0');
  if (attempts >= 10) {
    return jsonResponse({ error: 'Muitas tentativas. Aguarde 15 minutos.' }, 429, corsHeaders);
  }

  const passwordHash = await getPasswordHash(env);
  if (!await verifyPassword(body.password, passwordHash)) {
    await env.FLOW_KV.put(rateKey, String(attempts + 1), { expirationTtl: 900 });
    return jsonResponse({ error: 'Credenciais inválidas.' }, 401, corsHeaders);
  }

  await env.FLOW_KV.delete(rateKey);
  const token = await createSessionToken(env.SESSION_SIGNING_SECRET);
  return jsonResponse({ token, expiresIn: SESSION_TTL_SECONDS }, 200, corsHeaders);
}

async function handlePasswordChange(request, env, corsHeaders) {
  await requireSession(request, env);
  const body = await readJsonBody(request);
  if (typeof body.currentPassword !== 'string' || typeof body.newPassword !== 'string' || body.newPassword.length < 12) {
    return jsonResponse({ error: 'A nova senha deve ter pelo menos 12 caracteres.' }, 400, corsHeaders);
  }

  const currentHash = await getPasswordHash(env);
  if (!await verifyPassword(body.currentPassword, currentHash)) {
    return jsonResponse({ error: 'A senha atual está incorreta.' }, 401, corsHeaders);
  }

  const nextHash = await hashPassword(body.newPassword);
  await env.FLOW_KV.put('admin-password-hash', nextHash);
  return jsonResponse({ ok: true }, 200, corsHeaders);
}

async function readData(env) {
  const token = await getInstallationToken(env);
  const response = await githubRequest(env, token, `/contents/${DATA_PATH}?ref=${encodeURIComponent(env.GITHUB_BRANCH || 'main')}`);
  if (response.status === 404) return { records: [], revision: null };
  if (!response.ok) throw new Error(`GitHub recusou a leitura (${response.status}).`);

  const file = await response.json();
  const content = decodeBase64Utf8(file.content || '');
  const records = JSON.parse(content);
  if (!Array.isArray(records)) throw new Error('O arquivo compartilhado tem formato inválido.');
  return { records, revision: file.sha };
}

async function writeData(env, records, expectedRevision) {
  const current = await readData(env);
  if (current.revision !== expectedRevision) {
    throw httpError(409, 'Os dados mudaram desde a última leitura. Atualize a página e reaplique sua alteração.');
  }

  const serialized = JSON.stringify(records, null, 2);
  if (new TextEncoder().encode(serialized).length > MAX_DATA_BYTES) {
    throw httpError(413, 'O conjunto de dados excede o limite permitido.');
  }

  const token = await getInstallationToken(env);
  const response = await githubRequest(env, token, `/contents/${DATA_PATH}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: 'Atualiza dados do FLOW pelo painel administrativo',
      content: encodeBase64Utf8(serialized),
      branch: env.GITHUB_BRANCH || 'main',
      ...(current.revision ? { sha: current.revision } : {})
    })
  });

  if (response.status === 409 || response.status === 422) {
    throw httpError(409, 'O GitHub detectou uma gravação concorrente. Atualize os dados e tente novamente.');
  }
  if (!response.ok) throw new Error(`GitHub recusou a gravação (${response.status}).`);

  const result = await response.json();
  return { ok: true, revision: result.content.sha };
}

async function readAssets(env) {
  const token = await getInstallationToken(env);
  const response = await githubRequest(env, token, `/contents/${ASSETS_PATH}?ref=${encodeURIComponent(env.GITHUB_BRANCH || 'main')}`);
  if (response.status === 404) return { assets: {}, revision: null };
  if (!response.ok) throw new Error(`GitHub recusou a leitura dos assets (${response.status}).`);

  const file = await response.json();
  const assets = JSON.parse(decodeBase64Utf8(file.content || ''));
  if (!assets || typeof assets !== 'object' || Array.isArray(assets)) throw new Error('O arquivo de assets tem formato inválido.');
  return { assets, revision: file.sha };
}

async function writeAssets(env, assets, expectedRevision) {
  if (!assets || typeof assets !== 'object' || Array.isArray(assets) ||
      Object.keys(assets).some(key => key !== 'logo')) {
    throw httpError(400, 'Lista de assets inválida.');
  }
  if (assets.logo !== undefined && (typeof assets.logo !== 'string' ||
      assets.logo.length > MAX_LOGO_CHARS || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(assets.logo))) {
    throw httpError(400, 'A logo deve ser JPEG, PNG ou WebP válida dentro do limite.');
  }

  const current = await readAssets(env);
  if (current.revision !== expectedRevision) {
    throw httpError(409, 'Os assets mudaram desde a última leitura. Atualize a página e tente novamente.');
  }

  const serialized = JSON.stringify(assets, null, 2);
  const token = await getInstallationToken(env);
  const response = await githubRequest(env, token, `/contents/${ASSETS_PATH}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: 'Atualiza identidade visual do FLOW pelo painel administrativo',
      content: encodeBase64Utf8(serialized),
      branch: env.GITHUB_BRANCH || 'main',
      ...(current.revision ? { sha: current.revision } : {})
    })
  });

  if (response.status === 409 || response.status === 422) {
    throw httpError(409, 'O GitHub detectou uma gravação concorrente de assets. Tente novamente.');
  }
  if (!response.ok) throw new Error(`GitHub recusou a gravação dos assets (${response.status}).`);

  const result = await response.json();
  return { ok: true, revision: result.content.sha };
}

async function getInstallationToken(env) {
  requireBackendConfig(env);
  if (installationTokenCache && installationTokenCache.expiresAt > Date.now() + 60_000) {
    return installationTokenCache.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const jwt = await createAppJwt(env.GITHUB_APP_ID, env.GITHUB_APP_PRIVATE_KEY, now);
  const response = await fetch(`https://api.github.com/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`, {
    method: 'POST',
    headers: githubHeaders(jwt),
    body: '{}'
  });
  if (!response.ok) throw new Error(`Não foi possível obter token da instalação GitHub (${response.status}).`);

  const result = await response.json();
  installationTokenCache = { token: result.token, expiresAt: Date.parse(result.expires_at) };
  return result.token;
}

async function githubRequest(env, token, path, options = {}) {
  return fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}${path}`, {
    ...options,
    headers: {
      ...githubHeaders(token),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
}

function githubHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'FLOW-TRT13',
    'X-GitHub-Api-Version': API_VERSION
  };
}

async function createAppJwt(appId, privateKeyPem, now) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({ iss: appId, iat: now - 60, exp: now + 540 }));
  const unsigned = `${header}.${payload}`;
  const key = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;
}

async function importPrivateKey(pem) {
  const isPkcs1 = /-----BEGIN RSA PRIVATE KEY-----/.test(pem);
  const encoded = pem.replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----|-----END (?:RSA )?PRIVATE KEY-----|\s/g, '');
  const binary = atob(encoded);
  let bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  if (isPkcs1) {
    const algorithmIdentifier = Uint8Array.from([0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]);
    const version = Uint8Array.from([0x02, 0x01, 0x00]);
    const privateKeyOctet = derElement(0x04, bytes);
    bytes = derElement(0x30, concatBytes(version, algorithmIdentifier, privateKeyOctet));
  }
  return crypto.subtle.importKey('pkcs8', bytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

function derElement(tag, content) {
  const length = encodeDerLength(content.length);
  return concatBytes(Uint8Array.from([tag]), length, content);
}

function encodeDerLength(length) {
  if (length < 0x80) return Uint8Array.from([length]);
  const bytes = [];
  for (let value = length; value > 0; value >>>= 8) bytes.unshift(value & 0xff);
  return Uint8Array.from([0x80 | bytes.length, ...bytes]);
}

function concatBytes(...parts) {
  const result = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

async function createSessionToken(secret) {
  const payload = base64UrlEncode(JSON.stringify({ sub: 'admin', exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }));
  const signature = await hmacSign(secret, payload);
  return `${payload}.${base64UrlEncodeBytes(signature)}`;
}

async function requireSession(request, env) {
  const authorization = request.headers.get('Authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !env.SESSION_SIGNING_SECRET) throw httpError(401, 'Faça login novamente.');

  const expected = base64UrlEncodeBytes(await hmacSign(env.SESSION_SIGNING_SECRET, payload));
  if (!constantTimeEqual(signature, expected)) throw httpError(401, 'Sessão inválida. Faça login novamente.');

  let session;
  try { session = JSON.parse(decodeBase64Url(payload)); } catch { throw httpError(401, 'Sessão inválida.'); }
  if (session.sub !== 'admin' || session.exp <= Math.floor(Date.now() / 1000)) throw httpError(401, 'Sessão expirada. Faça login novamente.');
  return session;
}

async function getPasswordHash(env) {
  const storedHash = await env.FLOW_KV.get('admin-password-hash');
  const passwordHash = storedHash || env.ADMIN_PASSWORD_HASH;
  if (!passwordHash) throw new Error('Configure o segredo ADMIN_PASSWORD_HASH no Worker.');
  return passwordHash;
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$310000$${base64UrlEncodeBytes(salt)}$${base64UrlEncodeBytes(new Uint8Array(bits))}`;
}

async function verifyPassword(password, encodedHash) {
  const [algorithm, iterationText, saltText, expectedHash] = encodedHash.split('$');
  if (algorithm !== 'pbkdf2' || !/^\d+$/.test(iterationText) || !saltText || !expectedHash) return false;
  const iterations = Number(iterationText);
  if (iterations < 100_000 || iterations > 1_000_000) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: base64UrlDecodeBytes(saltText), iterations, hash: 'SHA-256' }, key, 256);
  return constantTimeEqual(base64UrlEncodeBytes(new Uint8Array(bits)), expectedHash);
}

async function readJsonBody(request) {
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length > MAX_DATA_BYTES + 32_000) throw httpError(413, 'Requisição excede o limite permitido.');
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw httpError(400, 'JSON inválido.'); }
}

function validateRecords(records) {
  if (!Array.isArray(records) || records.length > MAX_RECORDS) throw httpError(400, 'Lista de sistemas inválida.');
  const ids = new Set();
  for (const item of records) {
    if (!item || typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(item.id) || ids.has(item.id)) {
      throw httpError(400, 'Há identificadores inválidos ou duplicados.');
    }
    ids.add(item.id);
    if (typeof item.sistema !== 'string' || !item.sistema.trim() || item.sistema.length > 200) {
      throw httpError(400, 'O nome do sistema é obrigatório e deve ter até 200 caracteres.');
    }
    for (const field of ['descricao', 'url', 'acesso', 'responsavel', 'obs']) {
      if (item[field] !== undefined && (typeof item[field] !== 'string' || item[field].length > 5000)) {
        throw httpError(400, `Campo ${field} inválido.`);
      }
    }
    if (item.url) {
      let parsedUrl;
      try { parsedUrl = new URL(item.url); } catch { throw httpError(400, `URL inválida para ${item.sistema}.`); }
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw httpError(400, `URL não permitida para ${item.sistema}.`);
    }
    if (item.fluxo !== undefined && (!Array.isArray(item.fluxo) || item.fluxo.length > 20 || item.fluxo.some(step =>
      !step || ['nivel', 'fila', 'resp'].some(field => step[field] !== undefined && (typeof step[field] !== 'string' || step[field].length > 1000))
    ))) {
      throw httpError(400, `Fluxo inválido para ${item.sistema}.`);
    }
  }
  return records;
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = (env.FLOW_FRONTEND_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
  if (allowedOrigins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function jsonResponse(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
  });
}

function requireBackendConfig(env) {
  for (const key of ['GITHUB_APP_ID', 'GITHUB_APP_PRIVATE_KEY', 'GITHUB_INSTALLATION_ID', 'GITHUB_REPOSITORY', 'SESSION_SIGNING_SECRET']) {
    if (!env[key]) throw new Error(`Configure o segredo ${key} no Worker.`);
  }
  if (!env.FLOW_KV) throw new Error('Configure o namespace KV FLOW_KV no Worker.');
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

async function hmacSign(secret, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

async function sha256Hex(value) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function base64UrlEncode(value) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlEncodeBytes(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeBytes(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

function decodeBase64Url(value) {
  return new TextDecoder().decode(base64UrlDecodeBytes(value));
}

function decodeBase64Utf8(value) {
  const binary = atob(value.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, character => character.charCodeAt(0)));
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}
