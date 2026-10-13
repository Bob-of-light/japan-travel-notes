import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSpots } from './hooks/useSpots';
import { useTheme } from './hooks/useTheme';
import { collectStationHints } from './utils/links';
import type { IndexMode, Spot, SpotsData } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SpotDetail from './components/SpotDetail';
import SpotFormDialog from './components/SpotFormDialog';

export default function App() {
  const { data, editable, loading, error, updateSpot, addSpot, saveSettings } = useSpots();
  const { resolved, setPreference } = useTheme();

  const [mode, setMode] = useState<IndexMode>('category');
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Spot | null>(null);
  const [creating, setCreating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const origin = data.settings?.origin ?? '';

  useEffect(() => {
    if (!selectedId && data.spots.length > 0) setSelectedId(data.spots[0].id);
  }, [data.spots, selectedId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const selected = useMemo(
    () => data.spots.find((s) => s.id === selectedId) ?? null,
    [data.spots, selectedId],
  );

  const knownAreas = useMemo(() => {
    const set = new Set(data.spots.map((s) => s.area).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  }, [data.spots]);

  const originHints = useMemo(() => collectStationHints(data.spots), [data.spots]);

  const handleSelect = (spotId: string) => {
    setSelectedId(spotId);
    setSidebarOpen(false);
  };

  const handleChangeOrigin = useCallback(
    async (next: string) => {
      if (next === origin) return;
      try {
        await saveSettings({ ...data.settings, origin: next });
        setToast(next ? `出發地已設為「${next}」` : '已清除出發地');
      } catch (err) {
        setToast(err instanceof Error ? err.message : '出發地儲存失敗');
      }
    },
    [data.settings, origin, saveSettings],
  );

  const handleSaveSpot = useCallback(
    async (spot: Spot) => {
      const isNew = !data.spots.some((s) => s.id === spot.id);
      if (isNew) await addSpot(spot);
      else await updateSpot(spot);
      setSelectedId(spot.id);
      setToast(isNew ? `已新增「${spot.name}」` : '已儲存');
    },
    [addSpot, data.spots, updateSpot],
  );

  return (
    <div className="bg-app h-full flex flex-col">
      <Header
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
        editable={editable}
        resolved={resolved}
        onChangeTheme={setPreference}
        origin={origin}
        originHints={originHints}
        onChangeOrigin={handleChangeOrigin}
      />

      <div className="flex-1 flex min-h-0 relative">
        <aside
          className={`shrink-0 border-r border-line bg-panel lg:w-1/5 lg:min-w-56 lg:max-w-80
                      absolute inset-y-0 left-0 z-30 w-[80%] max-w-xs lg:relative
                      ${sidebarOpen ? 'block' : 'hidden'} lg:block`}
        >
          {loading ? (
            <p className="p-4 text-sm text-muted">載入中...</p>
          ) : (
            <Sidebar
              data={data}
              mode={mode}
              onModeChange={setMode}
              keyword={keyword}
              onKeywordChange={setKeyword}
              selectedId={selectedId}
              onSelect={handleSelect}
              editable={editable}
              onCreate={() => {
                setCreating(true);
                setSidebarOpen(false);
              }}
            />
          )}
        </aside>

        {sidebarOpen && (
          <div
            className="absolute inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        <main className="flex-1 min-w-0 overflow-y-auto">
          {error && (
            <p className="p-4 text-sm text-red-600 dark:text-red-400">載入失敗：{error}</p>
          )}
          {!error && selected && (
            <SpotDetail
              spot={selected}
              editable={editable}
              origin={origin}
              onEdit={() => setEditing(selected)}
            />
          )}
          {!error && !selected && !loading && (
            <div className="h-full flex items-center justify-center p-8">
              <p className="text-sm text-muted text-center">
                左邊選一個景點，這裡就會顯示詳細介紹。
              </p>
            </div>
          )}
        </main>
      </div>

      {(creating || editing) && (
        <SpotFormDialog
          spot={editing}
          categories={data.categories}
          knownAreas={knownAreas}
          editable={editable}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={async (spot) => {
            await handleSaveSpot(spot);
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg
                     bg-neutral-900 text-neutral-50 text-sm shadow-lg dark:bg-neutral-100 dark:text-neutral-900"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export type { SpotsData };