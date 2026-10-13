import { useMemo } from 'react';
import { buildIndex } from '../utils/buildIndex';
import type { IndexMode, SpotsData } from '../types';
import IndexTree from './IndexTree';
import { SearchIcon, SlidersIcon } from './icons';

interface SidebarProps {
  data: SpotsData;
  mode: IndexMode;
  onModeChange: (mode: IndexMode) => void;
  keyword: string;
  onKeywordChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (spotId: string) => void;
  editable: boolean;
  onCreate: () => void;
  onManageCategories: () => void;
}

export default function Sidebar({
  data,
  mode,
  onModeChange,
  keyword,
  onKeywordChange,
  selectedId,
  onSelect,
  editable,
  onCreate,
  onManageCategories,
}: SidebarProps) {
  const tree = useMemo(() => buildIndex(data, mode, keyword), [data, mode, keyword]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3 border-b border-line space-y-2 shrink-0">
        <button
          type="button"
          onClick={onCreate}
          disabled={!editable}
          title={editable ? '新增一個景點' : '唯讀模式：本機開啟 dev.bat 才能新增'}
          className="w-full py-2 rounded-md text-sm font-medium bg-sky-700 text-white
                     hover:bg-sky-800 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
        >
          ＋ 新增景點
        </button>

        <div className="flex p-0.5 rounded-lg bg-neutral-200/60 dark:bg-neutral-800/70">
          {(
            [
              ['category', '依目的'],
              ['area', '依地點'],
            ] as [IndexMode, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onModeChange(value)}
              className={`flex-1 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${
                mode === value
                  ? 'bg-raised shadow-sm font-medium'
                  : 'text-muted hover:text-current'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <SearchIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="搜尋景點、地名、分類"
            className="w-full bg-raised border border-line rounded-md pl-8 pr-2 py-1.5 text-sm
                       placeholder:text-muted focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {tree.roots.length === 0 ? (
          <p className="p-4 text-sm text-muted">找不到符合的項目</p>
        ) : (
          <IndexTree nodes={tree.roots} selectedId={selectedId} onSelect={onSelect} />
        )}
      </div>

      <div className="px-3 py-2 border-t border-line flex items-center justify-between gap-2 shrink-0">
        <span className="text-[11px] text-muted">共 {tree.total} 個景點</span>
        <button
          type="button"
          onClick={onManageCategories}
          disabled={!editable}
          title={editable ? '新增、重新命名或刪除分類' : '唯讀模式：本機開啟 dev.bat 才能變更'}
          className="inline-flex items-center gap-1 text-[11px] text-muted
                     hover:text-current transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <SlidersIcon className="w-3.5 h-3.5" />
          管理分類
        </button>
      </div>
    </div>
  );
}