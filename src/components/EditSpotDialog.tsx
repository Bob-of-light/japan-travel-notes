import { useEffect, useState } from 'react';
import type { Spot, SpotsData, TransportLeg } from '../types';
import { CloseIcon, SaveIcon } from './icons';

interface EditSpotDialogProps {
  spot: Spot;
  categories: string[];
  editable: boolean;
  onCancel: () => void;
  onSave: (spot: Spot) => Promise<void>;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function EditSpotDialog({
  spot,
  categories,
  editable,
  onCancel,
  onSave,
}: EditSpotDialogProps) {
  const [draft, setDraft] = useState<Spot>(() => structuredClone(spot));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTransport, setShowTransport] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, busy]);

  const patch = (changes: Partial<Spot>) => setDraft((d) => ({ ...d, ...changes }));

  const patchLeg = (index: number, changes: Partial<TransportLeg>) =>
    setDraft((d) => {
      const transport = [...(d.transport ?? [])];
      transport[index] = { ...transport[index], ...changes };
      return { ...d, transport };
    });

  const addLeg = () =>
    setDraft((d) => ({ ...d, transport: [...(d.transport ?? []), { mode: '', line: '' }] }));

  const removeLeg = (index: number) =>
    setDraft((d) => {
      const transport = [...(d.transport ?? [])];
      transport.splice(index, 1);
      return { ...d, transport };
    });

  const toggleCategory = (cat: string) =>
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(cat)
        ? d.categories.filter((c) => c !== cat)
        : [...d.categories, cat],
    }));

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const cleaned: Spot = {
        ...draft,
        address: draft.address?.trim(),
        mapQuery: draft.mapQuery?.trim() || undefined,
        description: draft.description?.replace(/\n{3,}/g, '\n\n').trim(),
        transport: (draft.transport ?? []).filter(
          (leg) => leg.fromStation || leg.toStation || leg.note || leg.line,
        ),
        updatedAt: today(),
      };
      await onSave(cleaned);
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
      setBusy(false);
    }
  };

  const input =
    'w-full bg-raised border border-line rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-sky-500';
  const label = 'block text-xs font-medium text-muted mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !busy && onCancel()}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`修改 ${spot.name}`}
        className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col
                   bg-panel border border-line rounded-t-2xl sm:rounded-2xl shadow-xl"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line shrink-0">
          <h3 className="flex-1 text-base font-semibold truncate">修改景點</h3>
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
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="f-name">名稱</label>
              <input
                id="f-name"
                className={input}
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </div>
            <div>
              <label className={label} htmlFor="f-nameJa">日文名稱</label>
              <input
                id="f-nameJa"
                className={input}
                value={draft.nameJa ?? ''}
                onChange={(e) => patch({ nameJa: e.target.value })}
              />
            </div>
            <div>
              <label className={label} htmlFor="f-area">地點（地名）</label>
              <input
                id="f-area"
                className={input}
                value={draft.area}
                onChange={(e) => patch({ area: e.target.value })}
              />
            </div>
            <div>
              <label className={label} htmlFor="f-mapQuery">地圖搜尋關鍵字</label>
              <input
                id="f-mapQuery"
                className={input}
                placeholder="例：スーパーポテト 秋葉原店"
                value={draft.mapQuery ?? ''}
                onChange={(e) => patch({ mapQuery: e.target.value })}
              />
            </div>
          </div>

          <div>
            <span className={label}>分類（可複選）</span>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const active = draft.categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      active
                        ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200 border-sky-300 dark:border-sky-800'
                        : 'border-line text-muted hover:text-current'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={label} htmlFor="f-address">地址</label>
              <input
                id="f-address"
                className={input}
                value={draft.address ?? ''}
                onChange={(e) => patch({ address: e.target.value })}
              />
            </div>
            <div>
              <label className={label} htmlFor="f-hours">營業時間</label>
              <input
                id="f-hours"
                className={input}
                value={draft.hours ?? ''}
                onChange={(e) => patch({ hours: e.target.value })}
              />
            </div>
            <div>
              <label className={label} htmlFor="f-closed">定休日</label>
              <input
                id="f-closed"
                className={input}
                value={draft.closed ?? ''}
                onChange={(e) => patch({ closed: e.target.value })}
              />
            </div>
            <div>
              <label className={label} htmlFor="f-phone">電話</label>
              <input
                id="f-phone"
                className={input}
                value={draft.phone ?? ''}
                onChange={(e) => patch({ phone: e.target.value })}
              />
            </div>
            <div>
              <label className={label} htmlFor="f-website">官方網站</label>
              <input
                id="f-website"
                className={input}
                value={draft.website ?? ''}
                onChange={(e) => patch({ website: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowTransport((v) => !v)}
              className="text-sm accent hover:underline"
            >
              {showTransport ? '收起交通方式' : '編輯交通方式'}
            </button>
            {!showTransport && (draft.transport?.length ?? 0) > 0 && (
              <span className="text-xs text-muted">目前 {draft.transport!.length} 組</span>
            )}
          </div>

          {showTransport && (
            <div className="space-y-3">
              {(draft.transport ?? []).map((leg, i) => (
                <div key={i} className="rounded-lg border border-line bg-raised p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={label}>交通方式</label>
                      <input
                        className={input}
                        placeholder="JR／地下鉄／巴士"
                        value={leg.mode ?? ''}
                        onChange={(e) => patchLeg(i, { mode: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={label}>路線名稱</label>
                      <input
                        className={input}
                        placeholder="山手線"
                        value={leg.line ?? ''}
                        onChange={(e) => patchLeg(i, { line: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={label}>方向</label>
                      <input
                        className={input}
                        placeholder="各停／新宿方面"
                        value={leg.direction ?? ''}
                        onChange={(e) => patchLeg(i, { direction: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={label}>上車站</label>
                      <input
                        className={input}
                        value={leg.fromStation ?? ''}
                        onChange={(e) => patchLeg(i, { fromStation: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={label}>下車站</label>
                      <input
                        className={input}
                        value={leg.toStation ?? ''}
                        onChange={(e) => patchLeg(i, { toStation: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={label}>乘車分鐘</label>
                      <input
                        type="number"
                        min={0}
                        className={input}
                        value={leg.rideMin ?? ''}
                        onChange={(e) =>
                          patchLeg(i, { rideMin: e.target.value ? Number(e.target.value) : undefined })
                        }
                      />
                    </div>
                    <div>
                      <label className={label}>步行分鐘</label>
                      <input
                        type="number"
                        min={0}
                        className={input}
                        value={leg.walkMin ?? ''}
                        onChange={(e) =>
                          patchLeg(i, { walkMin: e.target.value ? Number(e.target.value) : undefined })
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={label}>備註</label>
                      <input
                        className={input}
                        value={leg.note ?? ''}
                        onChange={(e) => patchLeg(i, { note: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeLeg(i)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      刪除這組路線
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addLeg}
                className="w-full py-2 rounded-md border border-dashed border-line text-sm text-muted hover:text-current"
              >
                + 新增一組路線
              </button>
            </div>
          )}

          <div>
            <label className={label} htmlFor="f-desc">簡易介紹（空一行代表分段）</label>
            <textarea
              id="f-desc"
              rows={10}
              className={`${input} leading-relaxed resize-y`}
              value={draft.description ?? ''}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>

          {!editable && (
            <p className="text-xs text-red-600 dark:text-red-400">
              目前為唯讀模式（沒有後端），儲存不會生效。請在本機執行 dev.bat 或 start.bat。
            </p>
          )}
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-line shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-3.5 py-2 rounded-md text-sm border border-line hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || !editable}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm bg-sky-700 text-white
                       hover:bg-sky-800 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <SaveIcon className="w-4 h-4" />
            {busy ? '儲存中...' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { SpotsData };