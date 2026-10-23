import { pbkdf2Sync, randomBytes } from 'node:crypto';

function readHiddenPassword() {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== 'function') {
      reject(new Error('Execute este script diretamente em um terminal interativo.'));
      return;
    }

    let password = '';
    const cleanup = () => {
      input.off('data', onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write('\n');
    };
    const onData = chunk => {
      for (const character of chunk.toString('utf8')) {
        if (character === '\u0003') {
          cleanup();
          reject(new Error('Operação cancelada.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(password);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          password = password.slice(0, -1);
          continue;
        }
        password += character;
      }
    };

    process.stdout.write('Digite a senha admin (mínimo 12 caracteres; entrada oculta): ');
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

const password = await readHiddenPassword();
if (!password || password.length < 12) {
  console.error('A senha deve ter pelo menos 12 caracteres.');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, 310_000, 32, 'sha256');
const base64url = value => Buffer.from(value).toString('base64url');
process.stdout.write(`pbkdf2$310000$${base64url(salt)}$${base64url(hash)}\n`);
