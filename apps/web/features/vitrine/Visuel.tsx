import { cn } from '@ph/ui';

/**
 * Photo d'illustration. Tant que les visuels définitifs ne sont pas fournis (README « Visuels »),
 * un aplat teinté décoratif occupe la place : même ratio, aucun décalage à l'arrivée de l'image.
 */
export function Visuel({
  src,
  alt = '',
  className,
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL Storage publique, taille fixée par le conteneur
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn('size-full object-cover', className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-full items-center justify-center bg-[linear-gradient(135deg,var(--accent-100),var(--accent-200))] text-accent-400',
        className,
      )}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 19.5 20 7l15 12.5" />
        <path d="M9 21.5V33h22V21.5" />
      </svg>
    </span>
  );
}
