import http from 'node:http';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser } from './open-browser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'public', 'data');
const DATA_FILE = path.join(DATA_DIR, 'spots.json');
const BACKUP_FILE = path.join(DATA_DIR, 'spots.backup.json');
const DIST_DIR = path.join(ROOT, 'dist');
const IMAGES_DIR = path.join(ROOT, 'public', 'images');
const PORT = Number(process.env.PORT || 3001);

/**
 * GitHub Pages 的部署路徑，必須和 vite.config.ts 的 base 一致。
 * 本機伺服器會自動把這個前綴剝掉，所以 http://localhost:3001/
 * 和 https://<user>.github.io/japan-travel-notes/ 都能正常運作。
 */
const BASE = process.env.BASE_PATH ?? '/japan-travel-notes/';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const ALLOWED_MAP_HOSTS = /(^|\.)(google\.[a-z.]{2,6}|goo\.gl)$/i;
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

/** 記憶體快取，避免重複打同一個外部服務 */
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key, value, ttlMs = 7 * 24 * 60 * 60 * 1000) {
  cache.set(key, { value, expires: Date.now() + ttlMs });
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/** 檢查圖片檔是不是 JPEG，避免使用者亂傳其他檔案 */
function looksLikeJpeg(buffer) {
  return buffer.length > 3 && buffer.subarray(0, 3).equals(JPEG_MAGIC);
}

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
  if (data.settings !== undefined) {
    if (typeof data.settings !== 'object' || Array.isArray(data.settings)) {
      return 'settings 必須是物件';
    }
    if (data.settings.origin !== undefined && typeof data.settings.origin !== 'string') {
      return 'settings.origin 必須是字串';
    }
  }
  const ids = new Set();
  for (const spot of data.spots) {
    if (!spot || typeof spot !== 'object') return '景點資料格式錯誤';
    if (typeof spot.id !== 'string' || !spot.id) return '景點缺少 id';
    if (ids.has(spot.id)) return `景點 id 重複：${spot.id}`;
    ids.add(spot.id);
    if (typeof spot.name !== 'string' || !spot.name) return `景點 ${spot.id} 缺少名稱`;
    if (!Array.isArray(spot.categories)) return `景點 ${spot.name} 的 categories 必須是陣列`;
    if (!Array.isArray(spot.transport ?? [])) return `景點 ${spot.name} 的 transport 必須是陣列`;
    if (!Array.isArray(spot.images ?? [])) return `景點 ${spot.name} 的 images 必須是陣列`;
    for (const image of spot.images ?? []) {
      if (typeof image?.src !== 'string' || !image.src) {
        return `景點 ${spot.name} 有圖片缺少 src`;
      }
    }
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

function readRawBody(req, limit = MAX_UPLOAD_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error(`圖片超過上限（${Math.round(limit / 1024 / 1024)} MB）`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function readJson(req, limit = 256 * 1024) {
  return readBody(req, limit).then((raw) => {
    if (!raw.trim()) return {};
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error('請求格式不是合法的 JSON');
    }
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
  let pathname = decodeURIComponent(url.pathname);

  // 剝掉 GitHub Pages 的 base 前綴，讓本機也能用同一份 build
  if (BASE !== '/' && pathname.startsWith(BASE)) {
    pathname = '/' + pathname.slice(BASE.length);
  } else if (BASE !== '/' && pathname === BASE.slice(0, -1)) {
    pathname = '/';
  }

  let filePath = path.join(DIST_DIR, pathname);

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

/** POST /api/upload —— 收已經在瀏覽器壓縮好的 JPEG */
async function handleUpload(req, res, url) {
  const spotId = url.searchParams.get('spotId') ?? '';
  const name = url.searchParams.get('name') ?? '';

  if (!SAFE_ID.test(spotId)) {
    sendJson(res, 400, { error: '景點 id 不合法' });
    return;
  }
  if (!/^\d{1,3}\.jpg$/.test(name)) {
    sendJson(res, 400, { error: '圖片檔名不合法' });
    return;
  }
  if (!/^image\/jpe?g$/i.test(req.headers['content-type'] ?? '')) {
    sendJson(res, 415, { error: '只接受 JPEG（請從網頁上選檔上傳）' });
    return;
  }

  const buffer = await readRawBody(req);
  if (buffer.length === 0) {
    sendJson(res, 400, { error: '沒有收到檔案內容' });
    return;
  }
  if (!looksLikeJpeg(buffer)) {
    sendJson(res, 415, { error: '檔案內容不是 JPEG' });
    return;
  }

  const dir = path.join(IMAGES_DIR, spotId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buffer);

  const distDir = path.join(DIST_DIR, 'images', spotId);
  await fs.mkdir(distDir, { recursive: true }).catch(() => {});
  await fs.writeFile(path.join(distDir, name), buffer).catch(() => {});

  const src = `images/${spotId}/${name}`;
  sendJson(res, 200, { src, bytes: buffer.length });
}

/** POST /api/resolve-url —— 跟隨 Google Maps 短網址的轉址 */
async function handleResolveUrl(req, res) {
  const { url: raw } = await readJson(req);
  if (typeof raw !== 'string' || !raw) {
    sendJson(res, 400, { error: '缺少 url' });
    return;
  }

  let target;
  try {
    target = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    sendJson(res, 400, { error: '網址格式不正確' });
    return;
  }

  // 只允許 Google / goo.gl，避免被當成跳板去打內部服務
  if (!ALLOWED_MAP_HOSTS.test(target.hostname)) {
    sendJson(res, 400, { error: '只接受 Google Maps 的連結' });
    return;
  }

  try {
    const response = await fetch(target.toString(), {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ryoko-notes)' },
      signal: AbortSignal.timeout(10000),
    });
    sendJson(res, 200, { url: response.url || target.toString() });
  } catch (err) {
    sendJson(res, 502, { error: `無法解析短網址：${err.message}` });
  }
}

const PREFECTURE_SUFFIX = /(都|道|府|県)$/;

/** POST /api/geocode —— 座標反查地址（Nominatim，帶快取） */
async function handleGeocode(req, res) {
  const { lat, lon } = await readJson(req);
  const latNum = Number(lat);
  const lonNum = Number(lon);

  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum) ||
      Math.abs(latNum) > 90 || Math.abs(lonNum) > 180) {
    sendJson(res, 400, { error: '座標不合法' });
    return;
  }

  const key = `${latNum.toFixed(5)},${lonNum.toFixed(5)}`;
  const cached = cacheGet(`geo:${key}`);
  if (cached) {
    sendJson(res, 200, { address: cached, cached: true });
    return;
  }

  try {
    const endpoint =
      `https://nominatim.openstreetmap.org/reverse?lat=${latNum}&lon=${lonNum}` +
      '&format=json&addressdetails=1&accept-language=ja';

    const response = await fetch(endpoint, {
      headers: { 'User-Agent': 'ryoko-japan-notes/1.0 (personal travel notes)' },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`Nominatim 回應 ${response.status}`);

    const json = await response.json();
    const a = json.address ?? {};
    const parts = String(json.display_name ?? '').split(',').map((s) => s.trim());
    const prefecture = parts.find((p) => PREFECTURE_SUFFIX.test(p)) ?? a.state ?? '';

    const address = {
      postcode: a.postcode,
      prefecture,
      city: a.city ?? a.city_district ?? '',
      quarter: a.quarter ?? '',
      neighbourhood: a.neighbourhood ?? a.suburb ?? '',
      houseNumber: a.house_number ?? '',
      building: a.building ?? '',
      formatted: '',
    };

    // neighbourhood 通常已經包含 quarter（例：外神田二丁目 vs 外神田），避免重複
    const quarter =
      address.quarter && !address.neighbourhood?.startsWith(address.quarter) ? address.quarter : '';
    const street = [address.neighbourhood, address.houseNumber].filter(Boolean).join('');
    const body = [address.prefecture, address.city, quarter, street].filter(Boolean).join('');

    address.formatted =
      [
        address.postcode ? `〒${address.postcode}` : '',
        body,
        address.building ? `（${address.building}）` : '',
      ]
        .filter(Boolean)
        .join(' ') || String(json.display_name ?? '');

    cacheSet(`geo:${key}`, address);
    sendJson(res, 200, { address, cached: false });
  } catch (err) {
    sendJson(res, 502, { error: `地址查詢失敗：${err.message}` });
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

  if (url.pathname === '/api/upload' && req.method === 'POST') {
    try {
      await handleUpload(req, res, url);
    } catch (err) {
      sendJson(res, 400, { error: `上傳失敗：${err.message}` });
    }
    return;
  }

  if (url.pathname === '/api/resolve-url' && req.method === 'POST') {
    try {
      await handleResolveUrl(req, res);
    } catch (err) {
      sendJson(res, 400, { error: `解析失敗：${err.message}` });
    }
    return;
  }

  if (url.pathname === '/api/geocode' && req.method === 'POST') {
    try {
      await handleGeocode(req, res);
    } catch (err) {
      sendJson(res, 400, { error: `查詢失敗：${err.message}` });
    }
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: '不支援的方法' });
    return;
  }

  await serveStatic(req, res);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error(`[ryoko] 連接埠 ${PORT} 已經被占用。`);
    console.error('');
    console.error('  可能是 dev.bat / start.bat 已經開著了。');
    console.error('  請先關掉那個黑色的終端機視窗，再重新執行。');
    console.error('');
    console.error(`  或者指定其他連接埠： set PORT=3002 && npm start`);
    console.error('');
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`[ryoko] API 伺服器啟動： ${url}`);
  openBrowser(url);
});