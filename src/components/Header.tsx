import type { ThemePreference, ResolvedTheme } from '../hooks/useTheme';
import type { EditMode } from '../hooks/useSpots';
import OriginPicker from './OriginPicker';
import { CloseIcon, LockIcon, MenuIcon, MoonIcon, PencilIcon, SunIcon } from './icons';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  editMode: EditMode;
  resolved: ResolvedTheme;
  onChangeTheme: (t: ThemePreference) => void;
  origin: string;
  originHints: string[];
  onChangeOrigin: (origin: string) => void;
  onRequestPin: () => void;
}

const statusText: Record<EditMode, string> = {
  offline: '唯讀模式：本機開啟 dev.bat 才能編輯',
  locked: '線上模式：按右邊的鎖頭輸入密碼即可編輯',
  unlocked: '編輯模式：修改會直接寫回 GitHub',
};

export default function Header({
  onToggleSidebar,
  sidebarOpen,
  editMode,
  resolved,
  onChangeTheme,
  origin,
  originHints,
  onChangeOrigin,
  onRequestPin,
}: HeaderProps) {
  return (
    <header className="flex items-center gap-2 border-b border-line bg-panel px-3 py-2 sm:px-4 shrink-0">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="lg:hidden p-2 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-muted"
        aria-label={sidebarOpen ? '關閉索引' : '開啟索引'}
      >
        {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="text-base sm:text-lg font-semibold tracking-wide truncate">
          日本旅遊筆記
        </h1>
        <p className="hidden sm:block text-[11px] sm:text-xs text-muted truncate">
          {statusText[editMode]}
        </p>
      </div>

      {editMode === 'locked' && (
        <button
          type="button"
          onClick={onRequestPin}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-line
                     text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        >
          <LockIcon className="w-3.5 h-3.5" />
          編輯
        </button>
      )}

      <OriginPicker origin={origin} hints={originHints} editable={editMode !== 'offline'} onChange={onChangeOrigin} />

      <div className="flex items-center gap-1 p-0.5 rounded-full border border-line shrink-0">
        <button
          type="button"
          onClick={() => onChangeTheme('light')}
          className={`p-1.5 rounded-full transition-colors ${
            resolved === 'light'
              ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-white'
              : 'text-muted hover:text-current'
          }`}
          aria-label="淺色模式"
          title="淺色模式"
        >
          <SunIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onChangeTheme('dark')}
          className={`p-1.5 rounded-full transition-colors ${
            resolved === 'dark'
              ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-white'
              : 'text-muted hover:text-current'
          }`}
          aria-label="深色模式"
          title="深色模式"
        >
          <MoonIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}