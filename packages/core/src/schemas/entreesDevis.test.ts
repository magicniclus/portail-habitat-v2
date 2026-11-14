import { describe, expect, it } from 'vitest';
import { entreeEnregistrerDevis, entreePaiementFacture } from './entreesDevis';

const base = {
  client: { nom: 'Claire Martin', adresse: '3 rue des Lilas, 33700 Mérignac' },
  typeClient: 'particulier',
  horsEtablissement: false,
  objet: 'Salle de bain',
  descriptionHtml: '',
  lignes: [{ designation: 'Pose', quantite: 1, unite: 'u', puHtCentimes: 69000, tva: 10 }],
  remisePct: 0,
  acomptePct: 30,
  dureeEstimee: '5 jours',
  fraisDeplacement: 'Inclus',
  devisGratuit: true,
  notes: '',
  signatureElectronique: true,
  tampon: false,
};

describe('entrées Devis & factures', () => {
  it('règle 3 : totaux, marge, mentions ou numéro envoyés par le navigateur → refus', () => {
    expect(entreeEnregistrerDevis.safeParse(base).success).toBe(true);
    for (const champ of ['totaux', 'margeHtCentimes', 'mentionsOk', 'numero', 'statut'])
      expect(entreeEnregistrerDevis.safeParse({ ...base, [champ]: 1 }).success).toBe(false);
  });

  it('TVA limitée à 5,5 / 10 / 20 % ; montants en centimes entiers', () => {
    const l = base.lignes[0]!;
    expect(entreeEnregistrerDevis.safeParse({ ...base, lignes: [{ ...l, tva: 7 }] }).success).toBe(
      false,
    );
    expect(
      entreeEnregistrerDevis.safeParse({ ...base, lignes: [{ ...l, puHtCentimes: 10.5 }] }).success,
    ).toBe(false);
    expect(
      entreePaiementFacture.safeParse({
        factureId: 'f1',
        montantCentimes: 0,
        moyen: 'virement',
        le: '2026-10-14',
      }).success,
    ).toBe(false);
  });
});
