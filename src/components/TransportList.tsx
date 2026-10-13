import { googleDirUrl, yahooTransitUrl } from '../utils/links';
import type { Spot, TransportLeg } from '../types';
import { ExternalIcon, TrainIcon } from './icons';

export default function TransportList({
  legs,
  spot,
}: {
  legs: TransportLeg[];
  spot: Spot;
}) {
  if (!legs.length) {
    return <p className="text-sm text-muted">尚未填寫交通方式，可按「修改」補上。</p>;
  }

  return (
    <ul className="space-y-3">
      {legs.map((leg, i) => (
        <TransportCard key={i} leg={leg} spot={spot} />
      ))}
    </ul>
  );
}

function TransportCard({ leg, spot }: { leg: TransportLeg; spot: Spot }) {
  const title = [leg.mode, leg.line].filter(Boolean).join(' ') || '交通';
  const yahoo = yahooTransitUrl(leg, spot);

  return (
    <li className="rounded-lg border border-line bg-raised p-3 sm:p-4">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-muted">
          <TrainIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium">{title}</h4>
          {leg.direction && <p className="text-xs text-muted mt-0.5">{leg.direction}</p>}

          <p className="mt-1.5 text-sm leading-relaxed">
            {leg.fromStation && leg.toStation && leg.fromStation !== leg.toStation ? (
              <>
                <span className="font-medium">{leg.fromStation}</span>
                <span className="text-muted mx-1.5">搭乘 →</span>
                <span className="font-medium">{leg.toStation}</span>
                {leg.rideMin ? <span className="text-muted">（約 {leg.rideMin} 分）</span> : null}
              </>
            ) : (
              <>
                <span className="font-medium">{leg.toStation ?? spot.name}</span>
              </>
            )}
            {leg.walkMin ? (
              <span className="text-muted">，步行約 {leg.walkMin} 分鐘</span>
            ) : null}
          </p>

          {leg.note && <p className="mt-1 text-xs text-muted leading-relaxed">{leg.note}</p>}

          <div className="mt-2.5 flex flex-wrap gap-2">
            <a
              href={googleDirUrl(leg, spot)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-line
                         text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              Google 路線 <ExternalIcon />
            </a>
            {yahoo && (
              <a
                href={yahoo}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-line
                           text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                title="Yahoo!乘換案内：可查詢即時到站、時刻表與延誤資訊"
              >
                Yahoo! 乘換（即時到站） <ExternalIcon />
              </a>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}