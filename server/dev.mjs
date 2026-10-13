import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const API_PORT = 3001;
const IS_WIN = process.platform === 'win32';

const children = [];

function quoteWin(arg) {
  return /^[\w.\-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '\\"')}"`;
}

function run(name, command, args, color) {
  const child = IS_WIN
    ? spawn([quoteWin(command), ...args.map(quoteWin)].join(' '), {
        cwd: ROOT,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PORT: String(API_PORT) },
      })
    : spawn(command, args, {
        cwd: ROOT,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PORT: String(API_PORT) },
      });

  const prefix = `\x1b[${color}m[${name}]\x1b[0m`;
  const pipe = (stream) => {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) if (line.trim()) console.log(`${prefix} ${line}`);
    });
  };
  pipe(child.stdout);
  pipe(child.stderr);

  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());

run('api', process.execPath, [path.join(ROOT, 'server', 'server.mjs')], '36');
run('vite', IS_WIN ? 'npx.cmd' : 'npx', ['vite'], '35');

console.log('');
console.log('  開發模式啟動中，請開啟 http://localhost:5173');
console.log('  關閉這個視窗即可停止');
console.log('');