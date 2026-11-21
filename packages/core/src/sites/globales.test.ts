import { describe, expect, it } from 'vitest';
import { propagerGlobales, zonesGlobales } from './globales';
import type { PageSite, Section } from './schemas';

const zone = (id: string, nom: string, globale?: string, ancre = ''): Section =>
  ({
    id,
    p: { nom, ancre, ...(globale ? { globale } : {}) },
    rows: [],
  }) as unknown as Section;
const page = (...sections: Section[]) => ({ sections }) as unknown as PageSite;

describe('zones globales', () => {
  const avant = {
    accueil: page(zone('z1', 'Bandeau', 'gab12'), zone('z2', 'Texte')),
    contact: page(zone('z9', 'Bandeau', 'gab12', 'haut')),
  };

  it('une copie modifiée est recopiée sur les autres pages, chacune garde son id et son ancre', () => {
    const modifiee = zone('z1', 'Bandeau rouge', 'gab12', 'promo');
    const apres = { ...avant, accueil: page(modifiee, avant.accueil.sections[1]!) };
    const r = propagerGlobales(avant, apres);
    expect(r.contact!.sections[0]).toMatchObject({
      id: 'z9',
      p: { nom: 'Bandeau rouge', ancre: 'haut' },
    });
    expect(r.accueil).toBe(apres.accueil);
  });

  it('rien à recopier : mêmes objets', () => {
    const apres = { ...avant, accueil: page(avant.accueil.sections[0]!, zone('z2', 'Autre')) };
    expect(propagerGlobales(avant, apres)).toBe(apres);
  });

  it('liste : une entrée par zone globale, avec le nombre de pages', () => {
    expect(zonesGlobales(avant)).toEqual([expect.objectContaining({ globale: 'gab12', pages: 2 })]);
  });
});
