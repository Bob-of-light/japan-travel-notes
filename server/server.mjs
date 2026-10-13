import http from 'node:http';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'public', 'data');
const DATA_FILE = path.join(DATA_DIR, 'spots.json');
const BACKUP_FILE = path.join(DATA_DIR, 'spots.backup.json');
const DIST_DIR = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 3001);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function readData() {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeData(next) {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const current = await fs.readFile(DATA_FILE, 'utf8');
  const stamped = new Date().toISOString().slice(0, 16).replace('T', ' ');
  await fs.writeFile(BACKUP_FILE, current, 'utf8');

  const payload = {
    ...next,
    version: next.version ?? 1,
    updatedAt: new Date().toISOString(),
  };

  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, DATA_FILE);

  await fs.writeFile(
    path.join(DIST_DIR, 'data', 'spots.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8',
  ).catch(() => {});

  console.log(`[ryoko] 已儲存 ${stamped}`);
  return payload;
}

function validateData(data) {
  if (!data || typeof data !== 'object') return '資料格式錯誤';
  if (!Array.isArray(data.categories)) return 'categories 必須是陣列';
  if (!Array.isArray(data.spots)) return 'spots 必須是陣列';
  for (const spot of data.spots) {
    if (!spot || typeof spot !== 'object') return '景點資料格式錯誤';
    if (typeof spot.id !== 'string' || !spot.id) return '景點缺少 id';
    if (typeof spot.name !== 'string' || !spot.name) return `景點 ${spot.id} 缺少名稱`;
    if (!Array.isArray(spot.categories)) return `景點 ${spot.name} 的 categories 必須是陣列`;
    if (!Array.isArray(spot.transport ?? [])) return `景點 ${spot.name} 的 transport 必須是陣列`;
  }
  return null;
}

function readBody(req, limit = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('資料過大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function serveStatic(req, res) {
  if (!fsSync.existsSync(DIST_DIR)) {
    sendJson(res, 404, {
      error: '找不到 dist 資料夾，請先執行 npm run build（或用 dev.bat 開發模式）',
    });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const decoded = decodeURIComponent(url.pathname);
  let filePath = path.join(DIST_DIR, decoded);

  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  if (!fsSync.existsSync(filePath) || fsSync.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const stat = await fs.stat(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600',
    });
    fsSync.createReadStream(filePath).pipe(res);
  } catch {
    sendJson(res, 404, { error: '檔案不存在' });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, editable: true });
    return;
  }

  if (url.pathname === '/api/spots' && req.method === 'GET') {
    try {
      sendJson(res, 200, { data: await readData(), editable: true });
    } catch (err) {
      sendJson(res, 500, { error: `讀取資料失敗：${err.message}` });
    }
    return;
  }

  if (url.pathname === '/api/spots' && req.method === 'PUT') {
    try {
      const body = await readBody(req);
      const parsed = JSON.parse(body);
      const invalid = validateData(parsed);
      if (invalid) {
        sendJson(res, 400, { error: invalid });
        return;
      }
      const saved = await writeData(parsed);
      sendJson(res, 200, { data: saved, editable: true });
    } catch (err) {
      sendJson(res, 400, { error: `儲存失敗：${err.message}` });
    }
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: '不支援的方法' });
    return;
  }

  await serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`[ryoko] API 伺服器啟動： http://localhost:${PORT}`);
});