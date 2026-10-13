/**
 * POST → 把瀏覽器已經壓縮好的 JPEG 寫進 public/images/<spotId>/<n>.jpg
 *
 * 前端送 base64（fetch 讀 blob 再轉 base64），這裡解回 Buffer 交給 GitHub。
 * 每張圖會各自產生一個 commit。
 */
import crypto from 'node:crypto';
import { applyCors, checkPin, configReady, fail, getFile, putFile, assertAllowedPath, MAX_BODY_BYTES } from './_shared.js';

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, '不支援的方法');

  if (!configReady()) return fail(res, 503, '伺服器尚未完成設定（缺少環境變數）');

  const pinError = checkPin(req);
  if (pinError) return fail(res, 401, pinError);

  const { spotId, name, contentBase64 } = req.body ?? {};

  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(spotId ?? '')) {
    return fail(res, 400, '景點 id 不合法');
  }
  if (!/^\d{1,3}\.jpg$/.test(name ?? '')) {
    return fail(res, 400, '圖片檔名不合法');
  }
  if (typeof contentBase64 !== 'string' || !contentBase64) {
    return fail(res, 400, '沒有收到圖片內容');
  }
  if (contentBase64.length * 0.75 > MAX_BODY_BYTES) {
    return fail(res, 413, '圖片太大，請重新選擇');
  }

  const buffer = Buffer.from(contentBase64, 'base64');
  if (buffer.length < 4 || !buffer.subarray(0, 3).equals(JPEG_MAGIC)) {
    return fail(res, 415, '只接受 JPEG（前端應該已經壓縮過了）');
  }

  const path = `public/images/${spotId}/${name}`;

  try {
    assertAllowedPath(path);

    const existing = await getFile(path);
    await putFile(
      path,
      contentBase64,
      `新增照片 ${spotId}/${name}`,
      existing?.sha,
    );

    return res.status(200).json({
      ok: true,
      src: `images/${spotId}/${name}`,
      bytes: buffer.length,
      commit: crypto.randomUUID(),
    });
  } catch (err) {
    return fail(res, 500, err.message);
  }
}