import { useState } from 'react';
import { savePin, verifyPin } from '../api/spots';

interface PinDialogProps {
  online: boolean;
  onUnlock: () => void;
  onCancel: () => void;
}

export default function PinDialog({ online, onUnlock, onCancel }: PinDialogProps) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!pin.trim()) return;
    setBusy(true);
    setError(null);
    savePin(pin.trim());
    try {
      const ok = await verifyPin(pin.trim());
      if (!ok) {
        savePin('');
        setError('密碼不正確');
        setBusy(false);
        return;
      }
      onUnlock();
    } catch {
      setError('連線失敗，請確認網路後再試');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="輸入編輯密碼"
        className="relative w-full max-w-sm bg-panel border border-line rounded-2xl shadow-xl p-5 space-y-4"
      >
        <div>
          <h3 className="text-base font-semibold">輸入編輯密碼</h3>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            {online
              ? '這組密碼只有你自己知道，用來確認可以寫入資料。會記住這台裝置，之後不用再輸入。'
              : '這組密碼只有你自己知道，用來確認可以寫入資料。'}
          </p>
        </div>

        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="請輸入密碼"
          className="w-full bg-raised border border-line rounded-md px-3 py-2 text-sm
                     focus:outline-none focus:border-sky-500"
        />

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-md text-sm border border-line hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !pin.trim()}
            className="px-3.5 py-2 rounded-md text-sm bg-sky-700 text-white hover:bg-sky-800
                       disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {busy ? '確認中...' : '確定'}
          </button>
        </div>
      </div>
    </div>
  );
}