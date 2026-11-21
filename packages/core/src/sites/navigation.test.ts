import { describe, expect, it } from 'vitest';
import { navigationComplete } from './navigation';
import type { Navigation } from './schemas';

const base = {
  logo: { mode: 'nom', image: '', initiales: 'BP' },
  nom: 'Bâti Pierre',
  liens: [],
  cta: { visible: true, texte: 'Devis', action: { type: 'aucun' }, couleur: 'accent' },
  tel: { visible: false, numero: '' },
  fond: 'blanc',
  collante: true,
  mobile: { sens: 'droite' },
} as unknown as Navigation;

describe('navigation complète', () => {
  it('ancien site : valeurs par défaut de la maquette', () => {
    const n = navigationComplete(base);
    expect(n.align).toBe('centre');
    expect(n.logo).toMatchObject({ fond: 'primaire', taille: { desktop: 40, mobile: 32 } });
    expect(n.mobile).toMatchObject({
      burger: 'droite',
      barreAppel: true,
      ctaMenu: true,
      cta: false,
    });
    expect(n.cta.texteCouleur).toBe('auto');
  });

  it('réglages existants gardés', () => {
    const n = navigationComplete({
      ...base,
      align: 'gauche',
      texte: 'blanc',
      hauteur: { desktop: 20, tablet: 18, mobile: 10 },
      logo: { ...base.logo, fond: 'sombre', taille: { desktop: 60, tablet: 50, mobile: 40 } },
      cta: { ...base.cta, texteCouleur: 'sombre' },
      mobile: {
        sens: 'gauche',
        burger: 'gauche',
        traits: 'primaire',
        cta: true,
        tel: true,
        fond: 'sombre',
        taille: 24,
        separateurs: false,
        ctaMenu: false,
        barreAppel: false,
      },
    } as Navigation);
    expect(n).toMatchObject({ align: 'gauche', texte: 'blanc', hauteur: { mobile: 10 } });
    expect(n.mobile).toMatchObject({ burger: 'gauche', separateurs: false, barreAppel: false });
    expect(n.logo.fond).toBe('sombre');
  });
});
