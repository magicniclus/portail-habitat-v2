import { describe, expect, it } from 'vitest';
import { formatNombre, nombreArrondi } from '../format/nombres';
import { calculerStatsPublic } from './statsPublic';

const maintenant = new Date('2026-09-28T12:00:00Z');
const jours = (n: number) => new Date(maintenant.getTime() - n * 86_400_000);

describe('calculerStatsPublic (DATABASE §9, recalcul nocturne)', () => {
  const stats = calculerStatsPublic({
    maintenant,
    artisans: [
      { enLigne: true, ville: 'Bordeaux' },
      { enLigne: true, ville: 'bordeaux ' },
      { enLigne: true, ville: 'Mérignac' },
      { enLigne: false, ville: 'Pessac' },
    ],
    demandes: [{ createdAt: jours(1) }, { createdAt: jours(29) }, { createdAt: jours(31) }],
    avis: [
      { statut: 'publie', note: 5 },
      { statut: 'publie', note: 4 },
      { statut: 'publie', note: 4 },
      { statut: 'refuse', note: 1 },
      { statut: 'en_attente', note: 1 },
    ],
    nbDossiersDiag: 7,
  });

  it('compte seulement les artisans en ligne et leurs villes distinctes', () => {
    expect(stats.nbArtisans).toBe(3);
    expect(stats.nbVilles).toBe(2);
  });
  it('demandes des 30 derniers jours', () => expect(stats.nbDemandesMois).toBe(2));
  it('note moyenne des seuls avis publiés, à un dixième près', () => {
    expect(stats.nbAvisTotal).toBe(3);
    expect(stats.noteMoyenneGlobale).toBe(4.3);
  });
  it('aucun avis : note 0', () => {
    expect(
      calculerStatsPublic({ maintenant, artisans: [], demandes: [], avis: [], nbDossiersDiag: 0 })
        .noteMoyenneGlobale,
    ).toBe(0);
  });
  it('dossiers diagnostic repris tels quels', () => expect(stats.nbDossiersDiag).toBe(7));
});

describe('formats de preuve sociale', () => {
  it('espace fine insécable des milliers', () => {
    expect(formatNombre(2400)).toBe('2 400');
    expect(formatNombre(12)).toBe('12');
  });
  it('arrondi vers le bas pour « 2 000+ avis » (jamais surestimé)', () => {
    expect(nombreArrondi(2140)).toBe('2 000+');
    expect(nombreArrondi(999)).toBe('900+');
    expect(nombreArrondi(140)).toBe('100+');
    expect(nombreArrondi(87)).toBe('87');
    expect(nombreArrondi(1000)).toBe('1 000');
  });
  it('note au format français', () => {
    expect(formatNombre(4.8, 1)).toBe('4,8');
    expect(formatNombre(5, 1)).toBe('5,0');
  });
});
