/** Cinq étoiles décoratives (la note est toujours écrite à côté en texte). */
export function Etoiles({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={className ?? 'tracking-[1px] text-etoile'}>
      ★★★★★
    </span>
  );
}
