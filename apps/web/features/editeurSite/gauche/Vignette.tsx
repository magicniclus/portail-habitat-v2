import { estFonce, resoudreCouleur, type Palette } from '@ph/core/sites';

/**
 * Vignette d'une zone prête (maquette) : son fond aux couleurs du site et ses blocs ; barres
 * claires sur fond foncé, teintées de la couleur principale sinon ; zone vide en pointillés.
 */
export function Vignette({
  fond,
  largeurs,
  palette,
}: {
  fond: 'blanc' | 'clair' | 'primaire' | 'sombre';
  largeurs: number[];
  palette: Palette;
}) {
  const couleur = resoudreCouleur(fond, palette) ?? 'white';
  const fonce = estFonce(couleur);
  const barre = fonce
    ? 'rgba(255,255,255,.55)'
    : `color-mix(in srgb, ${resoudreCouleur('primaire', palette) ?? 'gray'} 27%, transparent)`;
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-16 flex-none gap-[3px] rounded-[6px] px-1.5 py-2"
      style={{ background: couleur, border: fond === 'blanc' ? '1px solid var(--color-trait)' : 0 }}
    >
      {(largeurs.length ? largeurs : [12]).map((w, i) => (
        <span
          key={i}
          className="rounded-[2px]"
          style={
            largeurs.length
              ? { flex: w, background: barre }
              : { flex: w, border: '1px dashed var(--color-neutre-400)' }
          }
        />
      ))}
    </span>
  );
}
