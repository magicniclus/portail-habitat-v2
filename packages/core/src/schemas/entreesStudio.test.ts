import { describe, expect, it } from 'vitest';
import { entreeCreerProjetStudio, entreePriseStudio } from './entreesStudio';

describe('entrées du Studio', () => {
  it('format vertical, horizontal ou carré', () => {
    expect(
      entreeCreerProjetStudio.safeParse({ titre: 'Vidéo', format: 'vertical', camera: true })
        .success,
    ).toBe(true);
    expect(
      entreeCreerProjetStudio.safeParse({ titre: 'Vidéo', format: '4k', camera: true }).success,
    ).toBe(false);
  });

  it('prise : fichiers dans studio/{uid}/{prise}/, voix obligatoire', () => {
    const base = { projetId: 'p1', priseId: 'pr1', dureeMs: 30_000 };
    expect(
      entreePriseStudio.safeParse({ ...base, fichiers: { voix: 'studio/uid1/pr1/voix.webm' } })
        .success,
    ).toBe(true);
    expect(
      entreePriseStudio.safeParse({ ...base, fichiers: { ecran: 'studio/uid1/pr1/ecran.webm' } })
        .success,
    ).toBe(false);
    expect(
      entreePriseStudio.safeParse({ ...base, fichiers: { voix: 'studio/../artisans/x.webm' } })
        .success,
    ).toBe(false);
  });
});
