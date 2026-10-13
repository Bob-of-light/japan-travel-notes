import { useEffect, useMemo, useState } from 'react';
import { useSpots } from './hooks/useSpots';
import { useTheme } from './hooks/useTheme';
import type { IndexMode, Spot } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SpotDetail from './components/SpotDetail';
import EditSpotDialog from './components/EditSpotDialog';

export default function App() {
  const { data, editable, loading, error, updateSpot } = useSpots();
  const { resolved, setPreference } = useTheme();

  const [mode, setMode] = useState<IndexMode>('category');
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Spot | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!selectedId && data.spots.length > 0) setSelectedId(data.spots[0].id);
  }, [data.spots, selectedId]);

  const selected = useMemo(
    () => data.spots.find((s) => s.id === selectedId) ?? null,
    [data.spots, selectedId],
  );

  const handleSelect = (spotId: string) => {
    setSelectedId(spotId);
    setSidebarOpen(false);
  };

  return (
    <div className="bg-app h-full flex flex-col">
      <Header
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
        editable={editable}
        resolved={resolved}
        onChangeTheme={setPreference}
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

      {editing && (
        <EditSpotDialog
          spot={editing}
          categories={data.categories}
          editable={editable}
          onCancel={() => setEditing(null)}
          onSave={async (spot) => {
            await updateSpot(spot);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}