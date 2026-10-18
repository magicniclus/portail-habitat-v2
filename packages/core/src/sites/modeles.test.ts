import { describe, expect, it } from 'vitest';
import { siteParDefaut, type FicheSite } from './defaut';
import { appliquerModeleSite, MODELES_SITE, modeleSite } from './modeles';

const FICHE: FicheSite = {
  nomCommercial: 'Bertrand Rénovation',
  metier: 'Plombier',
  ville: 'Bordeaux',
  telephone: '05 56 00 00 00',
  description: 'Depuis 2009.',
  noteMoyenne: 4.8,
  nbAvis: 14,
  photos: ['lib:r1/0', 'lib:r1/1', 'lib:r2/0'],
};
const PALETTE = { primaire: '#1d4f73', accent: '#c97a2b', clair: '#f2ede4', sombre: '#14222e' };
const AUTRE = { primaire: '#6e1f2f', accent: '#b88536', clair: '#f6f0e6', sombre: '#2a1015' };
const site = () => siteParDefaut(FICHE, PALETTE);
const bandeau = (s: ReturnType<typeof site>) => s.pages.accueil!.sections[0]!;

describe('modèles de site (SITE_INTERNET §4.7)', () => {
  it('6 modèles fournis, palettes de 0 à 5', () => {
    expect(MODELES_SITE.map((m) => m.id)).toEqual([
      'classique',
      'premium',
      'urgence',
      'minimal',
      'chaleureux',
      'franc',
    ]);
    expect(MODELES_SITE.every((m) => m.palette >= 0 && m.palette <= 5)).toBe(true);
    expect(modeleSite('inconnu')).toBeUndefined();
  });

  it('« Couleurs et polices seulement » : thème changé, pages identiques', () => {
    const s = site();
    const r = appliquerModeleSite(s, modeleSite('premium')!, AUTRE, false);
    expect(r.theme).toEqual({
      palette: AUTRE,
      polices: 'dmserif',
      rayonBoutons: 2,
      ton: 'chaleureux',
    });
    expect(r.pages).toBe(s.pages);
    expect(r.navigation).toBe(s.navigation);
  });

  it('photo plein écran : la photo du bandeau passe en fond voilé, textes gardés', () => {
    const s = site();
    const r = appliquerModeleSite(s, modeleSite('franc')!, AUTRE, true);
    const b = bandeau(r);
    expect(b.p).toMatchObject({ fondType: 'image', fondImage: 'lib:r1/0', voileOpacite: 62 });
    expect(b.rows[0]!.cols).toHaveLength(1);
    expect(b.rows[0]!.cols[0]!.w).toBe(8);
    expect(JSON.stringify(b)).toContain('Bertrand Rénovation, plombier à Bordeaux');
    // Le site de départ n'est pas modifié.
    expect(bandeau(s).rows[0]!.cols).toHaveLength(2);
  });

  it('dépannage 24/7 : bandeau et avis sombres, boutons pleins en accent', () => {
    const r = appliquerModeleSite(site(), modeleSite('urgence')!, AUTRE, true);
    const acc = r.pages.accueil!.sections;
    expect(acc[0]!.p.fond).toBe('sombre');
    expect(acc.find((x) => x.p.nom === 'Avis clients')!.p.fond).toBe('sombre');
    const boutons = acc
      .flatMap((x) => x.rows.flatMap((l) => l.cols.flatMap((c) => c.els)))
      .filter((e) => e.type === 'bouton');
    expect(boutons.length).toBeGreaterThan(0);
    for (const e of boutons)
      expect(e.p.couleur).toBe(e.p.variante === 'plein' ? 'accent' : 'primaire');
  });

  it('minimal : fonds blancs (avis en clair), bandeau aéré', () => {
    const r = appliquerModeleSite(site(), modeleSite('minimal')!, AUTRE, true);
    const acc = r.pages.accueil!.sections;
    expect(acc[0]!.p.padY).toEqual({ desktop: 110, tablet: 80, mobile: 52 });
    for (const x of acc) expect(x.p.fond).toBe(x.p.nom === 'Avis clients' ? 'clair' : 'blanc');
  });

  it('bandeau sans photo : le modèle photo garde la mise en page', () => {
    const s = siteParDefaut({ ...FICHE, photos: [] }, PALETTE);
    const r = appliquerModeleSite(s, modeleSite('premium')!, AUTRE, true);
    expect(bandeau(r).p.fondType).toBe('couleur');
    expect(bandeau(r).rows[0]!.cols).toHaveLength(1);
  });

  it('classique et chaleureux : mise en page inchangée, thème appliqué', () => {
    const s = site();
    const r = appliquerModeleSite(s, modeleSite('chaleureux')!, AUTRE, true);
    expect(r.pages).toEqual(s.pages);
    expect(r.theme.ton).toBe('chaleureux');
  });
});
