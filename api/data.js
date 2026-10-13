/**
 * GET  → 回報線上寫入功能是否可用（前端用來決定要不要顯示編輯鈕）
 * POST → 覆蓋 public/data/spots.json，產生一個 GitHub commit
 */
import { applyCors, checkPin, configReady, fail, getFile, putFile, assertAllowedPath, MAX_BODY_BYTES, REPO } from './_shared.js';

const DATA_PATH = 'public/data/spots.json';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    return res.status(200).json({
      online: configReady(),
      repo: REPO,
      editable: configReady(),
    });
  }

  if (req.method !== 'POST') {
    return fail(res, 405, '不支援的方法');
  }

  if (!configReady()) {
    return fail(res, 503, '伺服器尚未完成設定（缺少環境變數）');
  }

  const pinError = checkPin(req);
  if (pinError) return fail(res, 401, pinError);

  const raw = JSON.stringify(req.body ?? {});
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return fail(res, 413, '資料太大，超過限制');
  }

  const { data, message } = req.body ?? {};
  if (!data || typeof data !== 'object' || !Array.isArray(data.spots) || !Array.isArray(data.categories)) {
    return fail(res, 400, '資料格式不正確');
  }
  for (const spot of data.spots) {
    if (!spot?.id || !spot?.name) return fail(res, 400, '有景點缺少 id 或名稱');
  }

  try {
    assertAllowedPath(DATA_PATH);

    // 如果前端帶了 base64，優先採用（避免 JSON 重編碼造成中文亂碼）
    const content = req.body.contentBase64 ?? Buffer.from(JSON.stringify(data, null, 2) + '\n', 'utf8').toString('base64');

    const existing = await getFile(DATA_PATH);
    if (existing?.sha && req.body.baseSha && req.body.baseSha !== existing.sha) {
      return fail(res, 409, '資料已經被其他裝置改過了，請重新整理頁面後再試');
    }

    const result = await putFile(
      DATA_PATH,
      content,
      message || `更新旅遊筆記（${data.spots.length} 個景點）`,
      existing?.sha,
    );

    return res.status(200).json({
      ok: true,
      sha: result.content?.sha,
      commitUrl: result.commit?.html_url,
    });
  } catch (err) {
    return fail(res, 500, err.message);
  }
}