import { mapEmbedUrl } from '../utils/links';
import type { Spot } from '../types';

export default function MapEmbed({ spot }: { spot: Spot }) {
  const query = spot.mapQuery || spot.nameJa || spot.name || spot.address;
  if (!query) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <iframe
        key={query}
        title={`${spot.name} 地圖`}
        src={mapEmbedUrl(spot)}
        className="w-full h-56 sm:h-80 lg:h-96"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}