import { spawn } from 'node:child_process';

/** 開啟系統預設瀏覽器。NO_OPEN=1 時略過（開發模式會帶入）。 */
export function openBrowser(url) {
  if (process.env.NO_OPEN === '1') return false;

  const platform = process.platform;
  const [command, args] =
    platform === 'win32'
      ? ['cmd.exe', ['/c', 'start', '', url]]
      : platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];

  try {
    const child = spawn(command, args, {
      stdio: 'ignore',
      detached: true,
    });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

/** 輪詢等待某個網址回應，就緒後開啟瀏覽器。逾時不做事。 */
export async function openWhenReady(url, { timeoutMs = 30000, intervalMs = 400 } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.ok || res.status === 404) {
        openBrowser(url);
        return true;
      }
    } catch {
      // 還沒起來，繼續等
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return false;
}