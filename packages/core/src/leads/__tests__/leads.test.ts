import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  arrondir,
  calculerPrixLead,
  coefQualite,
  niveauConcurrence,
  prixDeblocage,
  trancheBudget,
  type Bareme,
  type CaracteristiquesLead,
  type TarificationLead,
} from '..';

const lire = (f: string) => JSON.parse(readFileSync(resolve(__dirname, f), 'utf8'));
const { bareme } = lire('../../../../../docs/data/bareme-appels-offres.json') as { bareme: Bareme };
const { cas } = lire('leads.cases.json') as {
  cas: { entree: CaracteristiquesLead; attendu: Record<string, number> }[];
};

describe('prix automatique (DATABASE §5)', () => {
  it('au moins 30 cas', () => expect(cas.length).toBeGreaterThanOrEqual(30));
  it.each(cas.map((c, i) => [i, c] as const))('cas %i', (_, c) => {
    const { detailCalcul, ...prix } = calculerPrixLead(c.entree, bareme);
    expect(prix).toEqual(c.attendu);
    expect(Object.keys(detailCalcul)).toContain('coefConcurrence');
  });

  const lead: CaracteristiquesLead = {
    metier: 'plombier',
    famille: 'plomberie',
    trancheBudget: 'M',
    urgence: 'normale',
    qualiteLead: 60,
    nbEligibles: 5,
  };
  it('exemple : plomberie, budget M, qualité moyenne → 15 €, Premium 11 €, 2 crédits', () => {
    expect(calculerPrixLead(lead, bareme)).toEqual({
      prixBaseCentimes: 1500,
      prixPremiumCentimes: 1100,
      prixCredits: 2,
      detailCalcul: {
        base: 1500,
        coefBudget: 1,
        coefUrgence: 1,
        coefQualite: 1,
        coefConcurrence: 1,
        coefNiveau: 1,
        coefEligibilite: 1,
      },
    });
  });
  it('rénovation globale XL urgente, forte concurrence : plafonnée à 99 €', () => {
    const r = calculerPrixLead(
      {
        ...lead,
        metier: 'renovation',
        trancheBudget: 'XL',
        urgence: 'urgente',
        qualiteLead: 90,
        nbEligibles: 12,
      },
      bareme,
    );
    expect(r.prixBaseCentimes).toBe(9900);
    expect(r.prixCredits).toBe(10);
  });
  it('dépannage S de mauvaise qualité : plancher de 5 €', () => {
    const r = calculerPrixLead(
      {
        ...lead,
        metier: 'multiservice',
        famille: 'depannage',
        trancheBudget: 'S',
        qualiteLead: 10,
        nbEligibles: 0,
      },
      bareme,
    );
    expect(r.prixBaseCentimes).toBe(500);
    expect(r.prixPremiumCentimes).toBe(400);
  });
  it('le métier prime sur la famille, puis le prix par défaut', () => {
    expect(
      calculerPrixLead({ ...lead, metier: 'diag', famille: 'traitements' }, bareme).detailCalcul
        .base,
    ).toBe(900);
    expect(
      calculerPrixLead({ ...lead, metier: 'x', famille: undefined }, bareme).detailCalcul.base,
    ).toBe(bareme.prixBaseDefaut);
  });
  it('montants toujours en centimes entiers', () => {
    for (const c of cas) {
      const r = calculerPrixLead(c.entree, bareme);
      expect(Number.isInteger(r.prixBaseCentimes) && Number.isInteger(r.prixPremiumCentimes)).toBe(
        true,
      );
    }
  });
  it('demandes partenaires : niveau et éligibilité aux aides', () => {
    const b: Bareme = {
      ...bareme,
      coefNiveau: { A: 1.3, B: 1, C: 0.8 },
      coefEligibilite: { eligible: 1.1, non_eligible: 1 },
    };
    const r = calculerPrixLead({ ...lead, niveau: 'A', eligibiliteAides: 'ampleur_seulement' }, b);
    expect(r.detailCalcul).toMatchObject({ coefNiveau: 1.3, coefEligibilite: 1.1 });
    expect(r.prixBaseCentimes).toBe(2100); // 1500 × 1,3 × 1,1 = 2145 → 21 €
    const c = calculerPrixLead({ ...lead, niveau: 'C', eligibiliteAides: 'non_eligible' }, b);
    expect(c.prixBaseCentimes).toBe(1200);
    expect(calculerPrixLead({ ...lead, niveau: 'A' }, bareme).detailCalcul.coefNiveau).toBe(1);
  });
});

describe('composantes', () => {
  it.each([
    [0, 400_000, 'S'],
    [400_000, 600_000, 'M'],
    [1_000_000, 2_990_000, 'M'],
    [1_000_000, 3_000_000, 'L'],
    [3_000_000, 5_000_000, 'L'],
    [5_000_000, 6_990_000, 'L'],
    [6_000_000, 6_000_000, 'XL'],
  ] as const)('tranche %i–%i → %s', (min, max, t) => expect(trancheBudget(min, max)).toBe(t));
  it.each([
    [0, 'faible'],
    [2, 'faible'],
    [3, 'normale'],
    [7, 'normale'],
    [8, 'forte'],
  ] as const)('%i éligibles → concurrence %s', (n, c) =>
    expect(niveauConcurrence(n, bareme)).toBe(c),
  );
  it('paliers de qualité dans n’importe quel ordre', () => {
    const paliers = [
      { min: 0, coef: 0.7 },
      { min: 80, coef: 1.2 },
      { min: 50, coef: 1 },
    ];
    expect(coefQualite(80, paliers)).toBe(1.2);
    expect(coefQualite(79, paliers)).toBe(1);
    expect(coefQualite(3, [{ min: 10, coef: 0.5 }])).toBe(0.5);
    expect(coefQualite(3, [])).toBe(1);
  });
  it('arrondi robuste aux erreurs de virgule flottante', () => {
    expect(arrondir(1749.9999999, 100)).toBe(1800);
    expect(arrondir(1900 * 0.7, 100)).toBe(1300);
  });
});

describe('prix payé au déblocage (MATCHING [8])', () => {
  const t: TarificationLead = {
    mode: 'auto',
    prixBaseCentimes: 1900,
    prixPremiumCentimes: 1300,
    prixCredits: 2,
  };
  const maintenant = new Date('2026-09-27T12:00:00Z');
  it('standard et Premium', () => {
    expect(prixDeblocage(t, { premium: false, maintenant })).toEqual({
      centimes: 1900,
      credits: 2,
      promo: false,
    });
    expect(prixDeblocage(t, { premium: true, maintenant })).toEqual({
      centimes: 1300,
      credits: 2,
      promo: false,
    });
  });
  it('promo en cours : −50 %', () => {
    const p = { ...t, promo: { pourcentage: 50, jusquau: new Date('2026-09-28T00:00:00Z') } };
    expect(prixDeblocage(p, { premium: false, maintenant })).toEqual({
      centimes: 1000,
      credits: 1,
      promo: true,
    });
    expect(prixDeblocage(p, { premium: true, maintenant })).toEqual({
      centimes: 700,
      credits: 1,
      promo: true,
    });
  });
  it('promo à 30 % sur 10 crédits : 7 crédits (pas d’erreur de virgule)', () => {
    const p = {
      ...t,
      prixCredits: 10,
      promo: { pourcentage: 30, jusquau: new Date('2027-01-01') },
    };
    expect(prixDeblocage(p, { premium: false, maintenant }).credits).toBe(7);
  });
  it('promo expirée : ignorée', () => {
    const p = { ...t, promo: { pourcentage: 50, jusquau: maintenant } };
    expect(prixDeblocage(p, { premium: false, maintenant }).promo).toBe(false);
  });
  it('gratuit', () => {
    expect(prixDeblocage({ ...t, mode: 'gratuit' }, { premium: false, maintenant })).toEqual({
      centimes: 0,
      credits: 0,
      promo: false,
    });
  });
});

describe('BAREME_DEFAUT', () => {
  it('identique à docs/data/bareme-appels-offres.json', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const { BAREME_DEFAUT } = await import('..');
    const f = JSON.parse(
      readFileSync(
        resolve(__dirname, '../../../../../docs/data/bareme-appels-offres.json'),
        'utf8',
      ),
    );
    expect(BAREME_DEFAUT).toEqual(f.bareme);
  });
});
