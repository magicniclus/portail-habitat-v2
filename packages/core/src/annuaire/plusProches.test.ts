import { describe, expect, it } from 'vitest';
import { plusProches, resultatsAnnuaire, type FicheAnnuaire } from './tri';

const a = (id: string, km: number, o: Partial<FicheAnnuaire> = {}): FicheAnnuaire => ({
  id,
  nom: id,
  metiers: ['couvreur'],
  pitch: '',
  tags: [],
  km,
  note: 4,
  avis: 3,
  premium: false,
  labels: [],
  delaiJ: 5,
  ...o,
});

describe('à la une : partenaires (Tout inclus) avant les autres premium', () => {
  it('partenaire en tête même plus loin ; les standards ne bougent pas', () => {
    const r = resultatsAnnuaire(
      [
        a('premium', 2, { premium: true }),
        a('partenaire', 15, { premium: true, partenaire: true }),
        a('gratuit', 1),
      ],
      { rayonKm: 20 },
      'pertinence',
    );
    expect(r.premium.map((x) => x.id)).toEqual(['partenaire', 'premium']);
    expect(r.standards.map((x) => x.id)).toEqual(['gratuit']);
  });
});

describe('plusProches (aucun artisan dans le secteur)', () => {
  const liste = [
    a('loin', 140),
    a('proche', 35),
    a('premium', 90, { premium: true }),
    a('partenaire', 120, { premium: true, partenaire: true }),
    a('plombier', 10, { metiers: ['plombier'] }),
  ];

  it('même métier d’abord : partenaire, premium, puis le plus proche', () => {
    expect(plusProches(liste, { metiers: ['couvreur'] }).map((x) => x.id)).toEqual([
      'partenaire',
      'premium',
      'proche',
      'loin',
    ]);
  });

  it('aucun artisan de ce métier : les plus proches tous métiers confondus', () => {
    expect(plusProches(liste, { metiers: ['carreleur'] }, 2).map((x) => x.id)).toEqual([
      'partenaire',
      'premium',
    ]);
  });

  it('sans aucun artisan : liste vide', () => {
    expect(plusProches([], {})).toEqual([]);
  });
});
