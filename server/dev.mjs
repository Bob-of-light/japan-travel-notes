import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openWhenReady } from './open-browser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const API_PORT = 3001;
// 必須和 vite.config.ts 的 base 一致
const BASE_PATH = '/japan-travel-notes/';
const VITE_PORT = 5173;
const VITE_URL = `http://localhost:${VITE_PORT}${BASE_PATH}`;
const IS_WIN = process.platform === 'win32';

const children = [];

function quoteWin(arg) {
  return /^[\w.\-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '\\"')}"`;
}

function run(name, command, args, color, extraEnv = {}) {
  const env = { ...process.env, PORT: String(API_PORT), ...extraEnv };

  const child = IS_WIN
    ? spawn([quoteWin(command), ...args.map(quoteWin)].join(' '), {
        cwd: ROOT,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
      })
    : spawn(command, args, {
        cwd: ROOT,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
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

// 開發模式：API 只負責存檔，瀏覽器等 Vite 就緒後再開，避免開錯分頁
run('api', process.execPath, [path.join(ROOT, 'server', 'server.mjs')], '36', { NO_OPEN: '1' });
run('vite', IS_WIN ? 'npx.cmd' : 'npx', ['vite'], '35');

openWhenReady(VITE_URL).then((opened) => {
  if (!opened) {
    console.log('');
    console.log(`  Vite 好像沒有在 ${VITE_PORT} 埠啟動，請手動開啟 ${VITE_URL}`);
  }
});

console.log('');
console.log(`  開發模式啟動中，瀏覽器會自動開啟 ${VITE_URL}`);
console.log('  關閉這個視窗即可停止');
console.log('');