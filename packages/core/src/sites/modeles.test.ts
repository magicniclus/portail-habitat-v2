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
    const visibles = b.rows[0]!.cols.filter((c) => !c.p.masque.desktop);
    expect(visibles).toHaveLength(1);
    expect(visibles[0]!.w).toBe(12);
    expect(visibles[0]!.els.find((e) => e.type === 'titre')!.p).toMatchObject({ align: 'center' });
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
    for (const x of acc)
      expect(x.p.fond).toBe(
        x.p.nom === 'Pied de page' ? 'sombre' : x.p.nom === 'Avis clients' ? 'clair' : 'blanc',
      );
  });

  it('bandeau sans photo : le modèle photo garde un grand bandeau centré, sur la couleur principale', () => {
    const s = siteParDefaut({ ...FICHE, photos: [] }, PALETTE);
    const r = appliquerModeleSite(s, modeleSite('premium')!, AUTRE, true);
    expect(bandeau(r).p).toMatchObject({
      fondType: 'couleur',
      fond: 'primaire',
      padY: { desktop: 130 },
    });
    expect(bandeau(r).rows[0]!.cols).toHaveLength(1);
    expect(bandeau(r).rows[0]!.cols[0]!.els.find((e) => e.type === 'titre')!.p).toMatchObject({
      align: 'center',
    });
    const boutons = (x: typeof r) =>
      bandeau(x).rows[0]!.cols[0]!.els.flatMap((e) => (e.type === 'bouton' ? [e.p.enLigne] : []));
    expect(boutons(r)).toEqual([false, false]);
    // Classique ensuite : de nouveau aligné à gauche, fond clair, boutons côte à côte.
    const c = appliquerModeleSite(r, modeleSite('classique')!, PALETTE, true);
    expect(bandeau(c).p.fond).toBe('clair');
    expect(boutons(c)).toEqual([true, true]);
    expect(bandeau(c).rows[0]!.cols[0]!.els.find((e) => e.type === 'titre')!.p).toMatchObject({
      align: 'left',
    });
  });

  it('classique et chaleureux : mise en page inchangée, thème appliqué', () => {
    const s = site();
    const r = appliquerModeleSite(s, modeleSite('chaleureux')!, AUTRE, true);
    expect(r.pages).toEqual(s.pages);
    expect(r.theme.ton).toBe('chaleureux');
  });

  // Sans les identifiants (une colonne recréée en reçoit un nouveau).
  const forme = (x: ReturnType<typeof site>) =>
    JSON.parse(JSON.stringify(x.pages, (k, v) => (k === 'id' ? undefined : v))) as unknown;

  it('un modèle ne dépend pas du précédent, même après un rechargement (sans « avant »)', () => {
    for (const a of MODELES_SITE)
      for (const b of MODELES_SITE) {
        const direct = appliquerModeleSite(site(), b, AUTRE, true);
        const enchaine = appliquerModeleSite(
          appliquerModeleSite(site(), a, PALETTE, true),
          b,
          AUTRE,
          true,
        );
        // « Minimal » blanchit toutes les zones : seuls le bandeau et les avis se retrouvent.
        if (a.id === 'minimal')
          for (const i of [0, 1])
            expect(enchaine.pages.accueil!.sections[i]!.p, `${a.id} puis ${b.id}`).toEqual(
              direct.pages.accueil!.sections[i]!.p,
            );
        else expect(forme(enchaine), `${a.id} puis ${b.id}`).toEqual(forme(direct));
        expect(enchaine.theme).toEqual(direct.theme);
      }
  });

  it('classique après un ancien bandeau photo (colonne supprimée) : la photo revient à droite', () => {
    const photo = appliquerModeleSite(site(), modeleSite('franc')!, AUTRE, true);
    const r0 = bandeau(photo).rows[0]!;
    r0.cols = r0.cols.filter((c) => !c.p.masque.desktop);
    const r = appliquerModeleSite(photo, modeleSite('classique')!, PALETTE, true);
    const b = bandeau(r);
    expect(b.p).toMatchObject({ fondType: 'couleur', fondImage: '', fond: 'clair' });
    expect(b.rows[0]!.cols.map((c) => c.w)).toEqual([6, 6]);
    expect(b.rows[0]!.cols[1]!.els[0]).toMatchObject({ type: 'image', p: { src: 'lib:r1/0' } });
  });

  it('bandeau renommé : reconnu comme première zone portant le titre principal', () => {
    const s = site();
    bandeau(s).p.nom = 'Haut de page';
    const r = appliquerModeleSite(s, modeleSite('urgence')!, AUTRE, true);
    expect(bandeau(r).p.fond).toBe('sombre');
  });

  it('« tout le site » avec la fiche : accueil, contact et mentions refaits, autres pages variées', () => {
    const s = site();
    // Accueil bricolé : une seule zone vide, sans bandeau.
    s.pages.accueil!.sections = [
      { ...bandeau(s), p: { ...bandeau(s).p, nom: 'Ma zone' }, rows: [] },
    ];
    s.pages.accueil!.seo = { ...s.pages.accueil!.seo, title: 'Mon titre SEO' };
    const libre = { ...s.pages.contact!, nom: 'Libre', type: 'libre' as const };
    s.pages.libre = libre;
    const r = appliquerModeleSite(s, modeleSite('urgence')!, AUTRE, true, FICHE);
    const acc = r.pages.accueil!;
    expect(acc.seo.title).toBe('Mon titre SEO');
    expect(acc.sections[0]!.p).toMatchObject({ nom: 'Bandeau', fond: 'sombre' });
    expect(JSON.stringify(acc)).toContain('Bertrand Rénovation, plombier à Bordeaux');
    expect(r.pages.contact!.sections.map((x) => x.p.nom)).toEqual(
      siteParDefaut(FICHE, AUTRE).pages.contact!.sections.map((x) => x.p.nom),
    );
    expect(r.pages.libre!.sections).toHaveLength(libre.sections.length);
    // Sans la fiche : les pages existantes sont seulement variées.
    const sansFiche = appliquerModeleSite(s, modeleSite('urgence')!, AUTRE, true);
    expect(sansFiche.pages.accueil!.sections[0]!.p.nom).toBe('Ma zone');
  });
});
