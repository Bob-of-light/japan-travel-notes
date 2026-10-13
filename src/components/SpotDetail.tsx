import { mapSearchUrl } from '../utils/links';
import type { Spot } from '../types';
import MapEmbed from './MapEmbed';
import TransportList from './TransportList';
import { ExternalIcon, PencilIcon, PinIcon } from './icons';

interface SpotDetailProps {
  spot: Spot;
  editable: boolean;
  onEdit: () => void;
}

export default function SpotDetail({ spot, editable, onEdit }: SpotDetailProps) {
  const paragraphs = (spot.description ?? '').split(/\n{2,}/).filter(Boolean);

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-7">
      <header className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold leading-tight">{spot.name}</h2>
        {spot.nameJa && spot.nameJa !== spot.name && (
          <p className="text-sm text-muted">{spot.nameJa}</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="px-2 py-0.5 rounded-full text-xs bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200">
            {spot.area}
          </span>
          {spot.categories.map((cat) => (
            <span
              key={cat}
              className="px-2 py-0.5 rounded-full text-xs border border-line text-muted"
            >
              {cat}
            </span>
          ))}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={!editable}
            title={editable ? '修改這個景點的內容' : '唯讀模式：本機開啟 dev.bat 才能編輯'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border border-line
                       hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors
                       disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <PencilIcon className="w-4 h-4" />
            修改
          </button>
        </div>
      </header>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wide text-muted">地點與地圖</h3>
        {spot.address && (
          <p className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 text-muted shrink-0">
              <PinIcon />
            </span>
            <span>
              {spot.address}
              {spot.phone && <span className="text-muted">／{spot.phone}</span>}
            </span>
          </p>
        )}

        {(spot.hours || spot.closed) && (
          <p className="text-sm text-muted">
            {spot.hours && <span>營業時間：{spot.hours}</span>}
            {spot.closed && <span className="ml-3">定休日：{spot.closed}</span>}
          </p>
        )}

        <div className="flex flex-wrap gap-3 text-sm">
          <a
            href={mapSearchUrl(spot)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 accent hover:underline"
          >
            在 Google 地圖開啟 <ExternalIcon />
          </a>
          {spot.website && (
            <a
              href={spot.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 accent hover:underline"
            >
              官方網站 <ExternalIcon />
            </a>
          )}
        </div>

        <MapEmbed spot={spot} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wide text-muted">交通方式</h3>
        <TransportList legs={spot.transport ?? []} spot={spot} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wide text-muted">簡易介紹</h3>
        {paragraphs.length ? (
          <div className="space-y-3 text-sm sm:text-[15px] leading-relaxed">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-wrap">
                {p}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">尚未填寫介紹，可按「修改」補上。</p>
        )}
        {spot.updatedAt && (
          <p className="text-[11px] text-muted pt-1">最後更新：{spot.updatedAt}</p>
        )}
      </section>
    </article>
  );
}