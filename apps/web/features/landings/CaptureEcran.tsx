import type { CaptureLanding } from '@ph/core/landings';
import { cn } from '@ph/ui';

/**
 * Capture réelle de l'espace (`pnpm captures`) dans un cadre navigateur ou téléphone : AVIF puis WebP,
 * dimensions fixées (pas de décalage), chargée à l'approche (LANDINGS §6). Sans capture (écran pas
 * encore livré), le cadre reste vide avec sa légende.
 */
export function CaptureEcran({
  capture,
  cadre,
  prioritaire = false,
  className,
}: {
  capture: CaptureLanding;
  cadre: 'navigateur' | 'telephone';
  prioritaire?: boolean;
  className?: string;
}) {
  const tel = cadre === 'telephone';
  const [l, h] = tel ? [390, 844] : [1280, 800];
  const base = capture.image
    ? `/landing/captures/${capture.image}-${tel ? 'mobile' : 'desktop'}`
    : null;
  return (
    <figure className={cn('m-0', className)}>
      <div
        className={cn(
          'overflow-hidden border border-trait bg-blanc shadow-lg',
          tel ? 'rounded-[28px] border-[6px] border-neutre-900' : 'rounded-[12px]',
        )}
      >
        {tel ? null : (
          <div className="flex items-center gap-1.5 border-b border-trait bg-neutre-100 px-3 py-2">
            {[0, 1, 2].map((i) => (
              <span key={i} aria-hidden="true" className="size-2.5 rounded-full bg-neutre-300" />
            ))}
            {capture.url ? (
              <span className="ml-2 truncate rounded-pill bg-blanc px-3 py-0.5 text-xs text-neutre-700">
                {capture.url}
              </span>
            ) : null}
          </div>
        )}
        {base ? (
          <picture>
            <source srcSet={`${base}.avif`} type="image/avif" />
            <img
              src={`${base}.webp`}
              alt={capture.legende}
              width={l}
              height={h}
              loading={prioritaire ? 'eager' : 'lazy'}
              decoding="async"
              className="block h-auto w-full"
            />
          </picture>
        ) : (
          <div
            role="img"
            aria-label={capture.legende}
            style={{ aspectRatio: `${l} / ${h}` }}
            className="bg-[linear-gradient(135deg,var(--accent-100),var(--color-neutre-100))]"
          />
        )}
      </div>
      <figcaption className="mt-2 text-[13px] text-neutre-700">{capture.legende}</figcaption>
    </figure>
  );
}
