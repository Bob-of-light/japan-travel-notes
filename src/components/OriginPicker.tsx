import { useEffect, useRef, useState } from 'react';
import { PinIcon } from './icons';

interface OriginPickerProps {
  origin: string;
  hints: string[];
  editable: boolean;
  onChange: (origin: string) => void;
}

export default function OriginPicker({ origin, hints, editable, onChange }: OriginPickerProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(origin);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setValue(origin), [origin]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const commit = () => {
    onChange(value.trim());
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => editable && setOpen((v) => !v)}
        disabled={!editable}
        title={editable ? '設定常用出發地' : '唯讀模式，無法設定出發地'}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-line text-xs
                   hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed max-w-[10rem]"
      >
        <span className={origin ? 'accent' : 'text-muted'}>
          <PinIcon className="w-3.5 h-3.5" />
        </span>
        <span className="truncate">{origin || '設定出發地'}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-40 w-64 rounded-lg border border-line
                        bg-raised shadow-lg p-3 space-y-2">
          <p className="text-xs text-muted leading-relaxed">
            設定出發地後，每個景點的交通方式會自動產生從這裡出發的查詢連結。
          </p>
          <input
            autoFocus
            list="origin-hints"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
            }}
            placeholder="例：上野站"
            className="w-full bg-panel border border-line rounded-md px-2.5 py-1.5 text-sm
                       focus:outline-none focus:border-sky-500"
          />
          <datalist id="origin-hints">
            {hints.map((hint) => (
              <option key={hint} value={hint} />
            ))}
          </datalist>

          {hints.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hints.slice(0, 8).map((hint) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => setValue(hint)}
                  className="px-2 py-0.5 rounded-full text-[11px] border border-line text-muted hover:text-current"
                >
                  {hint}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            {origin && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-md text-xs text-muted hover:text-current"
              >
                清除
              </button>
            )}
            <button
              type="button"
              onClick={commit}
              className="px-3 py-1.5 rounded-md text-xs bg-sky-700 text-white hover:bg-sky-800"
            >
              儲存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}