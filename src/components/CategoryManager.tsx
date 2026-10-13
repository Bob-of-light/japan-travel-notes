import { useMemo, useState } from 'react';
import type { Spot } from '../types';
import { CloseIcon, SaveIcon, TrashIcon } from './icons';

interface CategoryManagerProps {
  categories: string[];
  spots: Spot[];
  editable: boolean;
  onCancel: () => void;
  onRename: (from: string, to: string) => Promise<void>;
  onDelete: (name: string) => Promise<void>;
  onCreate: (name: string) => Promise<void>;
}

export default function CategoryManager({
  categories,
  spots,
  editable,
  onCancel,
  onRename,
  onDelete,
  onCreate,
}: CategoryManagerProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const cat of categories) map.set(cat, 0);
    for (const spot of spots) {
      for (const cat of spot.categories) {
        map.set(cat, (map.get(cat) ?? 0) + 1);
      }
    }
    return map;
  }, [categories, spots]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗');
      setBusy(false);
    }
  };

  const submitRename = () => {
    if (!editing) return;
    const from = editing;
    const name = draftName.trim();
    if (name === from) {
      setEditing(null);
      return;
    }
    run(async () => {
      await onRename(from, name);
      setEditing(null);
      setBusy(false);
    });
  };

  const submitCreate = () => {
    const name = newName.trim();
    if (!name) return;
    run(async () => {
      await onCreate(name);
      setNewName('');
      setBusy(false);
    });
  };

  const confirmDeleteNow = () => {
    const name = confirmDelete;
    if (!name) return;
    run(async () => {
      await onDelete(name);
      setConfirmDelete(null);
      setBusy(false);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => !busy && onCancel()} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="管理分類"
        className="relative w-full sm:max-w-lg max-h-[88vh] flex flex-col bg-panel
                   border border-line rounded-t-2xl sm:rounded-2xl shadow-xl"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line shrink-0">
          <h3 className="flex-1 text-base font-semibold">管理分類</h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="p-1.5 rounded-md text-muted hover:text-current disabled:opacity-40"
            aria-label="關閉"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            重新命名會同時套用到所有使用該分類的景點；
            刪除則會把這個分類從所有景點上一起移除。
          </p>

          <ul className="space-y-1.5">
            {categories.map((cat) => (
              <li
                key={cat}
                className="flex items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2"
              >
                {editing === cat ? (
                  <>
                    <input
                      autoFocus
                      value={draftName}
                      maxLength={12}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename();
                        if (e.key === 'Escape') setEditing(null);
                      }}
                      className="flex-1 min-w-0 bg-panel border border-line rounded-md px-2 py-1
                                 text-sm focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={submitRename}
                      disabled={busy || !draftName.trim()}
                      className="p-1.5 rounded-md bg-sky-700 text-white hover:bg-sky-800
                                 disabled:opacity-40 shrink-0"
                      aria-label="確認改名"
                    >
                      <SaveIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      disabled={busy}
                      className="p-1.5 rounded-md text-muted hover:text-current disabled:opacity-40 shrink-0"
                      aria-label="取消"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 min-w-0 truncate text-sm">{cat}</span>
                    <span className="text-[11px] tabular-nums text-muted shrink-0">
                      {usage.get(cat) ?? 0} 個景點
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(cat);
                        setDraftName(cat);
                        setError(null);
                      }}
                      disabled={!editable || busy}
                      className="px-2 py-1 rounded-md text-xs border border-line text-muted
                                 hover:text-current disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      改名
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(cat)}
                      disabled={!editable || busy}
                      className="p-1.5 rounded-md text-red-600 dark:text-red-400
                                 hover:bg-red-50 dark:hover:bg-red-950/40
                                 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      aria-label={`刪除分類 ${cat}`}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          <div className="flex gap-1.5 pt-1">
            <input
              value={newName}
              maxLength={12}
              disabled={busy || !editable}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCreate();
              }}
              placeholder="新增分類，例如：咖啡廳"
              className="flex-1 min-w-0 bg-raised border border-line rounded-md px-2.5 py-1.5
                         text-sm focus:outline-none focus:border-sky-500 disabled:opacity-45"
            />
            <button
              type="button"
              onClick={submitCreate}
              disabled={busy || !editable || !newName.trim()}
              className="shrink-0 px-3 rounded-md text-sm bg-sky-700 text-white hover:bg-sky-800
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              新增
            </button>
          </div>

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          {confirmDelete && (
            <div className="rounded-lg border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 space-y-2">
              <p className="text-sm">
                確定要刪除分類「<strong>{confirmDelete}</strong>」嗎？
              </p>
              <p className="text-xs text-muted">
                會從 {usage.get(confirmDelete) ?? 0} 個景點上移除這個標籤，這個動作無法復原。
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  disabled={busy}
                  className="px-2.5 py-1 rounded-md text-xs border border-line
                             hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteNow}
                  disabled={busy}
                  className="px-2.5 py-1 rounded-md text-xs bg-red-600 text-white hover:bg-red-700
                             disabled:opacity-45"
                >
                  確定刪除
                </button>
              </div>
            </div>
          )}

          {!editable && (
            <p className="text-xs text-muted">目前為唯讀模式，無法變更分類。</p>
          )}
        </div>
      </div>
    </div>
  );
}