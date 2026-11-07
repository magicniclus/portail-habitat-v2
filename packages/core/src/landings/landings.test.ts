import { describe, expect, it } from 'vitest';
import { formatNombre } from '../format/nombres';
import { SOURCES_ACQUISITION } from '../schemas/artisans';
import {
  contenuLanding,
  decouperGras,
  EVENEMENTS_LANDING,
  evenementLanding,
  LANDINGS,
  OUTILS_LANDING,
  preuveHeroPro,
  preuveSociale,
  sourceDeLanding,
} from './index';

const textes = (o: unknown): string[] =>
  typeof o === 'string'
    ? [o]
    : Array.isArray(o)
      ? o.flatMap(textes)
      : o && typeof o === 'object'
        ? Object.values(o).flatMap(textes)
        : [];

describe('landings par outil (LANDINGS §1)', () => {
  it('trois routes, trois sources enregistrables sur le compte', () => {
    expect(OUTILS_LANDING.map((o) => [LANDINGS[o].route, LANDINGS[o].source])).toEqual([
      ['/pro/trouver-des-chantiers', 'trouver-chantier'],
      ['/pro/site-internet-artisan', 'site-internet-artisan'],
      ['/pro/logiciel-devis-factures', 'logiciel-devis-facture'],
    ]);
    for (const o of OUTILS_LANDING) expect(SOURCES_ACQUISITION).toContain(LANDINGS[o].source);
  });

  it('source lue dans l’URL : seulement une valeur connue', () => {
    expect(sourceDeLanding('site-internet-artisan')).toBe('site-internet-artisan');
    expect(sourceDeLanding('inconnue')).toBeUndefined();
    expect(sourceDeLanding(null)).toBeUndefined();
  });

  it('LAND-02 : aucun prix dans le hero', () => {
    for (const o of OUTILS_LANDING) {
      const c = contenuLanding(o, { preuves: true });
      const hero = textes([c.surtitre, c.h1a, c.h1b, c.sousTitre, c.points, c.badges, c.cta]);
      for (const t of hero) expect(t).not.toMatch(/\d\s?€|€\s?\d|HT|TTC|\/ ?mois/u);
    }
  });

  it('LAND-07 : sans preuve validée, ni chiffre non sourcé, ni « premier réseau », ni avis', () => {
    for (const o of OUTILS_LANDING) {
      const c = contenuLanding(o, { preuves: false });
      const tout = textes(c).join(' ');
      expect(tout).not.toMatch(/300|premier réseau|centaines d’euros|centaines d'euros/iu);
      expect(c.avis).toEqual([]);
    }
  });

  it('avec preuves activées (config.marketing.preuves) : surtitre chiffré et bandeau d’avis', () => {
    const c = contenuLanding('site', { preuves: true });
    expect(c.surtitre).toMatch(/300/u);
    expect(c.points).toContain('Premier réseau de France');
    expect(c.avis.length).toBe(20);
  });

  it('chaque landing : 3 bénéfices, 3 étapes, une FAQ, un titre de CTA', () => {
    for (const o of OUTILS_LANDING) {
      const c = contenuLanding(o, { preuves: false });
      expect(c.benefices).toHaveLength(3);
      expect(c.etapes).toHaveLength(3);
      expect(c.faq.length).toBeGreaterThanOrEqual(4);
      expect(c.ctaTitre.length).toBeGreaterThan(5);
    }
    expect(contenuLanding('site', { preuves: false }).faq).toHaveLength(10);
  });
});

describe('sous-titre en gras', () => {
  it('découpe sur **', () => {
    expect(decouperGras('Des **particuliers** et **vous**.')).toEqual([
      { texte: 'Des ', gras: false },
      { texte: 'particuliers', gras: true },
      { texte: ' et ', gras: false },
      { texte: 'vous', gras: true },
      { texte: '.', gras: false },
    ]);
    expect(decouperGras('Sans gras')).toEqual([{ texte: 'Sans gras', gras: false }]);
  });
});

describe('LAND-04 : preuve sociale', () => {
  it('absente sans donnée réelle', () => {
    expect(preuveSociale(null).visible).toBe(false);
    expect(
      preuveSociale({ nbInscrits: 0, nbSites: 0, note: 0, nbAvis: 0, temoignages: [] }),
    ).toMatchObject({ visible: false, chiffres: [], temoignages: [] });
  });

  it('chiffres renseignés seulement ; note sans nombre d’avis ignorée', () => {
    const p = preuveSociale({
      nbInscrits: 1250,
      nbSites: 0,
      note: 4.7,
      nbAvis: 0,
      temoignages: [],
    });
    expect(p.visible).toBe(true);
    expect(p.chiffres.map((c) => c.libelle)).toEqual(['entreprises inscrites']);
    expect(p.chiffres[0]!.valeur).toBe('1 250');
    expect(
      preuveSociale({ nbInscrits: 0, nbSites: 0, note: 4.7, nbAvis: 312, temoignages: [] })
        .chiffres[0],
    ).toEqual({ valeur: '4,7/5', libelle: 'sur 312 avis vérifiés' });
  });

  it('un témoignage sans accord écrit n’est jamais affiché', () => {
    const t = { nom: 'Julien M.', metier: 'Plombier', ville: 'Lyon', texte: 'Très bien.' };
    const p = preuveSociale({
      temoignages: [t, { ...t, nom: 'Sandrine L.', accordLe: new Date('2026-09-01') }],
    });
    expect(p.temoignages.map((x) => x.nom)).toEqual(['Sandrine L.']);
  });
});

describe('LAND-06 : événements analytics', () => {
  it('les 9 événements, toujours avec `landing`', () => {
    expect(EVENEMENTS_LANDING).toEqual([
      'landing_site_view',
      'hero_form_started',
      'hero_form_submitted',
      'demo_played',
      'pricing_section_viewed',
      'site_example_clicked',
      'faq_opened',
      'sticky_cta_clicked',
      'final_cta_clicked',
    ]);
    expect(evenementLanding('faq_opened', 'devis', { question: 2 })).toEqual({
      event: 'faq_opened',
      landing: 'devis',
      question: 2,
    });
  });
});

describe('hero de /pro : note, avis et artisans (maquette Acquisition v2, D72)', () => {
  it('sans réglage : chiffres déclarés par le propriétaire', () => {
    expect(preuveHeroPro(null)).toEqual({
      note: '4,8',
      avis: `${formatNombre(2000)}+`,
      artisans: formatNombre(3200),
    });
  });

  it('réglage config/preuveSociale prioritaire, nombre d’avis arrondi', () => {
    expect(preuveHeroPro({ note: 4.6, nbAvis: 2345, nbInscrits: 4100 })).toEqual({
      note: '4,6',
      avis: `${formatNombre(2000)}+`,
      artisans: formatNombre(4100),
    });
  });

  it('réglage partiel : la valeur manquante n’est pas affichée', () => {
    expect(preuveHeroPro({ nbInscrits: 3500 })).toEqual({
      note: null,
      avis: null,
      artisans: formatNombre(3500),
    });
  });
});
