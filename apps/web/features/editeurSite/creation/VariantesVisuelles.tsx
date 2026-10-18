'use client';

import type { Theme } from '@ph/core/sites';
import { RadioCard, RadioCardGroup } from '@ph/ui';
import { palettesSites } from '@ph/ui/tokens';

const STYLES: { nom: string; polices: Theme['polices']; rayonBoutons: Theme['rayonBoutons'] }[] = [
  { nom: 'Moderne', polices: 'archivo', rayonBoutons: 8 },
  { nom: 'Chantier', polices: 'barlow', rayonBoutons: 2 },
  { nom: 'Élégant', polices: 'dmserif', rayonBoutons: 999 },
];

/**
 * Trois variantes visuelles après la création (IA_SITE §3.1) : palette, polices et boutons, sans
 * appel à l'IA. Le choix s'applique au brouillon (aperçu en direct, Ctrl Z pour revenir).
 */
export function VariantesVisuelles({
  theme,
  onChoisir,
}: {
  theme: Theme;
  onChoisir: (t: Theme) => void;
}) {
  return (
    <RadioCardGroup legende="Choisissez un style (modifiable ensuite dans Styles)">
      {STYLES.map((v, i) => {
        const { nom: palette, ...p } = palettesSites[i] ?? palettesSites[0]!;
        const actif =
          theme.polices === v.polices &&
          theme.rayonBoutons === v.rayonBoutons &&
          theme.palette.primaire === p.primaire;
        return (
          <RadioCard
            key={v.nom}
            name="variante"
            checked={actif}
            onChange={() =>
              onChoisir({ ...theme, palette: p, polices: v.polices, rayonBoutons: v.rayonBoutons })
            }
            titre={
              <span className="flex items-center gap-2">
                {[p.primaire, p.accent, p.clair].map((c) => (
                  <span
                    key={c}
                    aria-hidden="true"
                    className="size-5 rounded-full ring-1 ring-trait"
                    style={{ background: c }}
                  />
                ))}
                {v.nom}
              </span>
            }
            description={`Couleurs « ${palette.toLowerCase()} »`}
          />
        );
      })}
    </RadioCardGroup>
  );
}
