import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveMapUrl, reverseGeocode, uploadImage } from '../api/spots';
import { assetUrl, mapEmbedUrl } from '../utils/links';
import { compressImage, formatBytes } from '../utils/imageCompress';
import { buildMapQuery, parseMapLink } from '../utils/parseMapLink';
import type { Spot, SpotImage, TransportLeg } from '../types';
import { CloseIcon, SaveIcon, SearchIcon } from './icons';

const MAX_IMAGES = 6;
const IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

interface PendingImage {
  key: string;
  blob: Blob;
  previewUrl: string;
  bytes: number;
  width: number;
  height: number;
}

interface SpotFormDialogProps {
  spot: Spot | null;
  categories: string[];
  knownAreas: string[];
  editable: boolean;
  onCancel: () => void;
  onSave: (spot: Spot) => Promise<void>;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function newId() {
  return `spot-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function SpotFormDialog({
  spot,
  categories,
  knownAreas,
  editable,
  onCancel,
  onSave,
}: SpotFormDialogProps) {
  const isNew = spot === null;
  const [draft, setDraft] = useState<Spot>(() =>
    spot ? structuredClone(spot) : ({ id: newId(), name: '', area: '', categories: [] } as Spot),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showTransport, setShowTransport] = useState(false);

  const [mapUrl, setMapUrl] = useState('');
  const [mapBusy, setMapBusy] = useState(false);
  const [pendingMap, setPendingMap] = useState<{ coord?: string; query?: string; name?: string } | null>(null);
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);
  const [syncAddress, setSyncAddress] = useState(true);
  const [addressTouched, setAddressTouched] = useState(isNew);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryHint, setCategoryHint] = useState<string | null>(null);

  const [existingImages, setExistingImages] = useState<SpotImage[]>(
    () => (spot?.images ?? []).map((i) => ({ ...i })),
  );
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [imageBusy, setImageBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, busy]);

  useEffect(() => () => pending.forEach((p) => URL.revokeObjectURL(p.previewUrl)), [pending]);

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

  /** 輸入新的大項分類，已存在就直接勾選 */
  const addCategory = () => {
    const name = newCategory.trim();
    if (!name) return;

    if (name.length > 12) {
      setCategoryHint('分類名稱請控制在 12 個字以內');
      return;
    }
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(name) ? d.categories : [...d.categories, name],
    }));
    setCategoryHint(
      categories.includes(name) ? `「${name}」已經有了，已直接勾選` : `已新增分類「${name}」`,
    );
    setNewCategory('');
  };

  const toggleExistingImage = (src: string) =>
    setExistingImages((list) =>
      list.some((i) => i.src === src) ? list.filter((i) => i.src !== src) : [...list, { src }],
    );

  const patchExistingCaption = (src: string, caption: string) =>
    setExistingImages((list) => list.map((i) => (i.src === src ? { ...i, caption } : i)));

  /* ---------- Google Maps 連結 ---------- */
  /** 解析連結，結果放進 pendingMap（不直接改 draft，等使用者按套用） */
  const handleMapUrl = async (value: string) => {
    setMapUrl(value);
    setNotice(null);
    setDetectedAddress(null);
    if (!value.trim()) return;

    const parsed = parseMapLink(value);
    if (!parsed) {
      setPendingMap(null);
      setNotice('這看起來不是 Google Maps 的連結。如果沒貼也可以，地圖會用「名稱＋地名」搜尋。');
      return;
    }

    let result = parsed;
    if (parsed.needsResolve && parsed.url) {
      setMapBusy(true);
      try {
        const finalUrl = await resolveMapUrl(parsed.url);
        const resolved = parseMapLink(finalUrl);
        if (resolved) result = resolved;
      } catch (err) {
        setNotice(err instanceof Error ? err.message : '短網址解析失敗，可以手動填地址');
      } finally {
        setMapBusy(false);
      }
    }

    const next = { coord: result.coord, query: result.query, name: result.name };
    setPendingMap(next);

    if (next.coord) {
      setMapBusy(true);
      const [lat, lon] = next.coord.split(',').map(Number);
      try {
        const address = await reverseGeocode(lat, lon);
        setDetectedAddress(address.formatted);
      } catch {
        // 查不到就留空，地址由使用者自行填寫
      } finally {
        setMapBusy(false);
      }
    }
  };

  /** 把解析結果寫進 draft */
  const applyPendingMap = () => {
    if (!pendingMap) return;

    const changes: Partial<Spot> = {};
    if (pendingMap.coord) changes.mapQuery = pendingMap.coord;
    else if (pendingMap.query) changes.mapQuery = pendingMap.query;
    if (pendingMap.name && isNew) {
      changes.name = pendingMap.name;
      if (!draft.nameJa) changes.nameJa = pendingMap.name;
    }
    if (syncAddress && detectedAddress) changes.address = detectedAddress;
    patch(changes);

    setNotice(
      pendingMap.coord
        ? `已套用座標 ${pendingMap.coord}`
        : `已套用搜尋字串「${pendingMap.query}」`,
    );
    setPendingMap(null);
    setDetectedAddress(null);
    setMapUrl('');
  };

  /** 清除定位，改回用「名稱＋地名」自動搜尋 */
  const clearMapQuery = () => {
    patch({ mapQuery: undefined });
    setMapUrl('');
    setPendingMap(null);
    setDetectedAddress(null);
    setNotice('已清除定位，地圖改用「名稱＋地名」自動搜尋');
  };

  /* ---------- 照片 ---------- */
  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_IMAGES - existingImages.length - pending.length;
    if (room <= 0) {
      setError(`一個景點最多 ${MAX_IMAGES} 張照片`);
      return;
    }
    setError(null);
    setImageBusy(true);

    try {
      const picked = Array.from(files).slice(0, room);
      const results: PendingImage[] = [];
      for (const file of picked) {
        const compressed = await compressImage(file);
        results.push({
          key: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
          blob: compressed.blob,
          previewUrl: URL.createObjectURL(compressed.blob),
          bytes: compressed.blob.size,
          width: compressed.width,
          height: compressed.height,
        });
      }
      setPending((p) => [...p, ...results]);
      if (Array.from(files).length > room) {
        setError(`只能再放 ${room} 張，其餘的沒有加入`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '圖片處理失敗');
    } finally {
      setImageBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePending = (key: string) =>
    setPending((p) => {
      const target = p.find((x) => x.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return p.filter((x) => x.key !== key);
    });

  /* ---------- 儲存 ---------- */
  const handleSave = async () => {
    if (!draft.name.trim()) {
      setError('請填寫名稱');
      return;
    }
    if (!draft.area.trim()) {
      setError('請填寫地點（地名）');
      return;
    }
    if (draft.categories.length === 0) {
      setError('請至少選一個分類');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const cleaned: Spot = {
        ...draft,
        name: draft.name.trim(),
        nameJa: draft.nameJa?.trim() || undefined,
        area: draft.area.trim(),
        address: draft.address?.trim() || undefined,
        mapQuery: draft.mapQuery?.trim() || undefined,
        hideMap: draft.hideMap || undefined,
        description: draft.description?.replace(/\n{3,}/g, '\n\n').trim(),
        transport: (draft.transport ?? []).filter(
          (leg) => leg.fromStation || leg.toStation || leg.note || leg.line,
        ),
        images: [],
        updatedAt: today(),
      };

      // 新照片接在既有的編號後面，避免蓋掉舊檔
      let nextIndex = existingImages.reduce((max, image) => {
        const n = Number(image.src.split('/').pop()?.replace('.jpg', '') ?? '0');
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, 0);

      const uploaded: SpotImage[] = [...existingImages];
      for (const item of pending) {
        nextIndex += 1;
        const src = await uploadImage(draft.id, `${nextIndex}.jpg`, item.blob);
        uploaded.push({ src, caption: '' });
      }

      cleaned.images = uploaded.length ? uploaded : undefined;
      await onSave(cleaned);
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
      setBusy(false);
    }
  };

  const input =
    'w-full bg-raised border border-line rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-sky-500';
  const label = 'block text-xs font-medium text-muted mb-1';

  const mapPreview = useMemo(() => (draft.mapQuery ? buildMapQuery(draft) : ''), [draft]);

  const currentMapSource = useMemo(() => {
    if (draft.mapQuery) {
      return /^-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+$/.test(draft.mapQuery)
        ? `使用座標 ${draft.mapQuery}`
        : `使用搜尋字串「${draft.mapQuery}」`;
    }
    return `自動以「${buildMapQuery(draft)}」搜尋`;
  }, [draft]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => !busy && onCancel()} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? '新增景點' : `修改 ${spot?.name}`}
        className="relative w-full sm:max-w-2xl max-h-[94vh] sm:max-h-[88vh] flex flex-col
                   bg-panel border border-line rounded-t-2xl sm:rounded-2xl shadow-xl"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line shrink-0">
          <h3 className="flex-1 text-base font-semibold truncate">
            {isNew ? '新增景點' : '修改景點'}
          </h3>
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
          {isNew && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="f-name">名稱 <span className="text-red-500">*</span></label>
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
                  placeholder="例：スーパーポテト"
                  value={draft.nameJa ?? ''}
                  onChange={(e) => patch({ nameJa: e.target.value })}
                />
              </div>
              <div>
                <label className={label} htmlFor="f-area">地點（地名） <span className="text-red-500">*</span></label>
                <input
                  id="f-area"
                  className={input}
                  list="area-options"
                  placeholder="例：秋葉原"
                  value={draft.area}
                  onChange={(e) => patch({ area: e.target.value })}
                />
                <datalist id="area-options">
                  {knownAreas.map((area) => (
                    <option key={area} value={area} />
                  ))}
                </datalist>
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-line bg-raised p-3">
            <div className="flex items-start justify-between gap-2">
              <span className={label}>地圖定位</span>
              <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={draft.hideMap ?? false}
                  onChange={(e) => patch({ hideMap: e.target.checked || undefined })}
                  className="w-3.5 h-3.5 accent-sky-600"
                />
                不顯示地圖
              </label>
            </div>

            {!draft.hideMap && (
              <>
                <p className="text-xs text-muted leading-relaxed">
                  目前：{currentMapSource}
                </p>

                <div className="relative">
                  <SearchIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="f-mapurl"
                    className={`${input} pl-8`}
                    placeholder={isNew ? 'https://maps.app.goo.gl/…（可留空）' : '貼上新的 Google Maps 連結來更換位置'}
                    value={mapUrl}
                    onChange={(e) => handleMapUrl(e.target.value)}
                    disabled={mapBusy}
                  />
                </div>

                {mapBusy && <p className="text-xs text-muted">讀取連結中…</p>}

                {pendingMap && !mapBusy && (
                  <div className="space-y-1.5 rounded-md border border-emerald-300 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-2.5">
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                      ✓ 讀取到新定位
                      {pendingMap.coord ? `（座標 ${pendingMap.coord}）` : `（${pendingMap.query}）`}
                    </p>
                    {detectedAddress && (
                      <label className="flex items-start gap-1.5 text-xs text-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={syncAddress}
                          onChange={(e) => setSyncAddress(e.target.checked)}
                          className="w-3.5 h-3.5 mt-0.5 accent-sky-600 shrink-0"
                        />
                        <span>
                          同時把地址改成
                          <span className="block text-neutral-700 dark:text-neutral-300">
                            {detectedAddress}
                          </span>
                        </span>
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={applyPendingMap}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
                                 bg-sky-700 text-white text-xs hover:bg-sky-800"
                    >
                      <SaveIcon className="w-3.5 h-3.5" />
                      套用這個位置
                    </button>
                  </div>
                )}

                {draft.mapQuery && (
                  <button
                    type="button"
                    onClick={clearMapQuery}
                    className="text-xs text-muted hover:text-current hover:underline"
                  >
                    清除定位，改用「名稱＋地名」自動搜尋
                  </button>
                )}

                {notice && <p className="text-xs text-amber-700 dark:text-amber-400">{notice}</p>}

                <button
                  type="button"
                  onClick={() => setShowMapPreview((v) => !v)}
                  className="text-xs accent hover:underline"
                >
                  {showMapPreview ? '收起地圖預覽' : '預覽地圖確認位置'}
                </button>

                {showMapPreview && !draft.hideMap && (
                  <div className="overflow-hidden rounded-md border border-line">
                    <iframe
                      key={mapPreview}
                      title="地圖預覽"
                      src={mapEmbedUrl(draft)}
                      className="w-full h-48"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )}
              </>
            )}

            {draft.hideMap && (
              <p className="text-xs text-muted">這個景點不會顯示地圖。</p>
            )}
          </div>

          {!isNew && (
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
                  list="area-options-edit"
                  value={draft.area}
                  onChange={(e) => patch({ area: e.target.value })}
                />
                <datalist id="area-options-edit">
                  {knownAreas.map((area) => (
                    <option key={area} value={area} />
                  ))}
                </datalist>
              </div>
            </div>
          )}

          <div>
            <span className={label}>分類 <span className="text-red-500">*</span></span>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set([...categories, ...draft.categories])].map((cat) => {
                const active = draft.categories.includes(cat);
                const isNew = !categories.includes(cat);
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
                    {isNew && <span className="ml-1 opacity-60">新</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-1.5 mt-2">
              <input
                className={`${input} flex-1`}
                placeholder="新增分類，例如：咖啡廳"
                value={newCategory}
                maxLength={12}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setCategoryHint(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCategory();
                  }
                }}
              />
              <button
                type="button"
                onClick={addCategory}
                disabled={!newCategory.trim()}
                className="shrink-0 px-3 rounded-md text-sm border border-line
                           hover:bg-neutral-100 dark:hover:bg-neutral-700
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                新增
              </button>
            </div>
            {categoryHint && <p className="text-[11px] text-muted mt-1">{categoryHint}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={label} htmlFor="f-address">地址（可留空）</label>
              <input
                id="f-address"
                className={input}
                placeholder="可以在上面的地圖定位貼連結自動填入"
                value={draft.address ?? ''}
                onChange={(e) => {
                  setAddressTouched(true);
                  patch({ address: e.target.value });
                }}
              />
              {draft.address && !addressTouched && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                  ⚠ 這是自動查出來的，請確認是否正確
                </p>
              )}
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

          <div>
            <label className={label}>
              照片（{existingImages.length + pending.length} / {MAX_IMAGES}）
            </label>
            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_TYPES}
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              disabled={imageBusy || existingImages.length + pending.length >= MAX_IMAGES}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={imageBusy || existingImages.length + pending.length >= MAX_IMAGES}
              className="w-full py-2 rounded-md border border-dashed border-line text-sm text-muted hover:text-current
                         disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {imageBusy ? '處理中…' : '＋ 選擇照片'}
            </button>

            {(existingImages.length > 0 || pending.length > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {pending.map((item) => (
                  <div key={item.key} className="relative rounded-md overflow-hidden border border-line">
                    <img src={item.previewUrl} alt="" className="w-full h-24 object-cover" />
                    <div className="px-1.5 py-1 text-[10px] text-muted bg-raised flex justify-between">
                      <span>{item.width}×{item.height}</span>
                      <span>{formatBytes(item.bytes)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePending(item.key)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs leading-none hover:bg-black/80"
                      aria-label="移除這張"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {spot?.images?.map((image) => {
                  const active = existingImages.some((i) => i.src === image.src);
                  return (
                    <div
                      key={image.src}
                      className={`relative rounded-md overflow-hidden border ${
                        active ? 'border-sky-500' : 'border-line opacity-40'
                      }`}
                    >
                      <img src={assetUrl(image.src)} alt="" className="w-full h-24 object-cover" />
                      <input
                        className="w-full px-1.5 py-1 text-[10px] bg-raised text-muted focus:outline-none"
                        placeholder="說明"
                        value={existingImages.find((i) => i.src === image.src)?.caption ?? ''}
                        onChange={(e) => patchExistingCaption(image.src, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => toggleExistingImage(image.src)}
                        className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] hover:bg-black/80"
                      >
                        {active ? '移除' : '加回'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowTransport((v) => !v)}
              className="text-sm accent hover:underline"
            >
              {showTransport ? '收起交通方式' : '編輯交通方式（選填）'}
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
                        placeholder="JR／地下鉄／バス"
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
            <label className={label} htmlFor="f-desc">
              簡易介紹 <span className="text-red-500">*</span>（空一行代表分段）
            </label>
            <textarea
              id="f-desc"
              rows={10}
              className={`${input} leading-relaxed resize-y`}
              placeholder="寫下你推薦這個地方的理由，之後旅遊時看會很方便。"
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
            disabled={busy || !editable || imageBusy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm bg-sky-700 text-white
                       hover:bg-sky-800 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <SaveIcon className="w-4 h-4" />
            {busy ? '儲存中...' : isNew ? '新增景點' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}