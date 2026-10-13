import { useEffect, useState } from 'react';
import { assetUrl } from '../utils/links';
import type { SpotImage } from '../types';
import { CloseIcon } from './icons';

interface ImageGalleryProps {
  images: SpotImage[];
  spotName: string;
}

export default function ImageGallery({ images, spotName }: ImageGalleryProps) {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null);
      if (e.key === 'ArrowRight') setActive((i) => (i === null ? null : (i + 1) % images.length));
      if (e.key === 'ArrowLeft')
        setActive((i) => (i === null ? null : (i - 1 + images.length) % images.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, images.length]);

  if (!images.length) return null;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {images.map((image, i) => (
          <figure key={image.src} className="space-y-1.5">
            <button
              type="button"
              onClick={() => setActive(i)}
              className="block w-full overflow-hidden rounded-lg border border-line
                         transition-opacity hover:opacity-90"
              aria-label={`放大查看${image.caption ?? `第 ${i + 1} 張`}`}
            >
              <img
                src={assetUrl(image.src)}
                alt={image.caption ?? `${spotName} 照片 ${i + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-52 sm:h-64 object-cover bg-neutral-200 dark:bg-neutral-800"
              />
            </button>
            {image.caption && (
              <figcaption className="text-xs text-muted px-0.5">{image.caption}</figcaption>
            )}
          </figure>
        ))}
      </div>

      {active !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${spotName} 照片`}
        >
          <button
            type="button"
            onClick={() => setActive(null)}
            className="absolute top-3 right-3 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10"
            aria-label="關閉"
          >
            <CloseIcon />
          </button>

          <figure className="max-w-full max-h-full flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <img
              src={assetUrl(images[active].src)}
              alt={images[active].caption ?? spotName}
              className="max-h-[78vh] max-w-full object-contain rounded"
            />
            {images[active].caption && (
              <figcaption className="text-sm text-white/80 text-center">
                {images[active].caption}
              </figcaption>
            )}
            {images.length > 1 && (
              <div className="flex items-center gap-2">
                {images.map((image, i) => (
                  <button
                    key={image.src}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`第 ${i + 1} 張`}
                    className={`h-2 rounded-full transition-all ${
                      i === active ? 'w-5 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            )}
          </figure>
        </div>
      )}
    </>
  );
}