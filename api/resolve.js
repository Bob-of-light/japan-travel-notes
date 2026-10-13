/**
 * POST → 跟隨 Google Maps 短網址（maps.app.goo.gl）的轉址，
 *        前端才能拿到裡面的座標。
 *
 * 只允許 Google / goo.gl 網域，避免被當成跳板去內部服務。
 */
import { applyCors, fail } from './_shared.js';

const ALLOWED_HOSTS = /(^|\.)(google\.[a-z.]{2,6}|goo\.gl)$/i;

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, '不支援的方法');

  const { url } = req.body ?? {};
  if (typeof url !== 'string' || !url) return fail(res, 400, '缺少 url');

  let target;
  try {
    target = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    return fail(res, 400, '網址格式不正確');
  }

  if (!ALLOWED_HOSTS.test(target.hostname)) {
    return fail(res, 400, '只接受 Google Maps 的連結');
  }

  try {
    const response = await fetch(target.toString(), {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ryoko-notes)' },
      signal: AbortSignal.timeout(10000),
    });
    res.status(200).json({ url: response.url || target.toString() });
  } catch (err) {
    fail(res, 502, `無法解析短網址：${err.message}`);
  }
}