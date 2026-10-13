/**
 * 共用工具：環境變數、CORS、PIN 驗證、GitHub API 呼叫。
 *
 * 需要的環境變數（全部在 Vercel 後台設定，不要寫進程式碼）：
 *   GITHUB_TOKEN      fine-grained personal access token，權限僅限
 *                     目標倉庫的 Contents: Read and write
 *   GITHUB_REPO       owner/repo，例：Bob-of-light/japan-travel-notes
 *   WRITE_PIN         你自己決定的數字密碼
 *   ALLOWED_ORIGIN    允許呼叫的來源，例：
 *                     https://bob-of-light.github.io（多個用逗號隔開）
 */
import crypto from 'node:crypto';

export const REPO = process.env.GITHUB_REPO ?? 'Bob-of-light/japan-travel-notes';
export const TOKEN = process.env.GITHUB_TOKEN ?? '';
export const PIN = process.env.WRITE_PIN ?? '';

const API = 'https://api.github.com';

/** 允許寫入的路徑，避免被拿來改其他檔案或塞奇怪的路徑 */
export const ALLOWED_PATHS = [/^public\/data\/spots\.json$/, /^public\/images\/[a-z0-9][a-z0-9_-]{0,63}\/\d{1,3}\.jpg$/];

export function applyCors(req, res) {
  const configured = (process.env.ALLOWED_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean);

  const origin = req.headers.origin;
  if (origin && (configured.includes('*') || configured.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Pin');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export function configReady() {
  return Boolean(TOKEN && PIN && REPO.includes('/'));
}

export function checkPin(req) {
  if (!PIN) return '伺服器尚未設定 WRITE_PIN';
  if (!TOKEN) return '伺服器尚未設定 GITHUB_TOKEN';

  const given = String(req.headers['x-pin'] ?? '');
  const a = Buffer.from(given.padEnd(64).slice(0, 64));
  const b = Buffer.from(PIN.padEnd(64).slice(0, 64));
  return crypto.timingSafeEqual(a, b) ? null : '密碼錯誤';
}

export function fail(res, status, message) {
  res.status(status).json({ error: message });
}

/** 取得檔案目前的 sha（GitHub 更新既有檔案時必須帶） */
export async function getFile(path) {
  const res = await fetch(`${API}/repos/${REPO}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub 讀取失敗 (${res.status})`);
  return res.json();
}

export async function putFile(path, contentBase64, message, sha) {
  const res = await fetch(`${API}/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      message,
      content: contentBase64,
      ...(sha ? { sha } : {}),
      branch: 'main',
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = json?.message ?? `HTTP ${res.status}`;
    throw new Error(`GitHub 寫入失敗：${detail}`);
  }
  return json;
}

export function assertAllowedPath(path) {
  if (!ALLOWED_PATHS.some((re) => re.test(path))) {
    throw new Error('不允許寫入這個路徑');
  }
}

/** Vercel 免費方案單次請求 body 上限約 4.5MB */
export const MAX_BODY_BYTES = 4 * 1024 * 1024;