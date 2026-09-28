import { ErreurMetier } from '@ph/core/erreurs';
import type { ReferentielDiagnostic } from '@ph/core/diagnostic';
import { dossierDiag, entreeDossierDiag } from '@ph/core/schemas';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import { depuisFirestore } from '../src/conversion';
import type { Notification } from '../src/serveur/comptes';
import { creerDossierDiag, type ServicesDiagnostic } from '../src/serveur/demandes';

const T = Date.UTC(2026, 8, 28, 10);
let db: Firestore;
let auth: Auth;
let envois: Notification[];
let s: ServicesDiagnostic;

const tarif = (id: string, min: number, max: number, validiteAns: number) => ({
  id,
  prixMinCentimes: min * 100,
  prixMaxCentimes: max * 100,
  validiteAns,
});
const referentiel: ReferentielDiagnostic = {
  version: '2026-01',
  anneeReference: 2026,
  obligatoires: [
    tarif('dpe', 110, 190, 10),
    tarif('amiante', 90, 160, 99),
    tarif('termites', 90, 150, 0.5),
    tarif('elec', 95, 155, 3),
    tarif('erp', 25, 55, 0.5),
    tarif('gaz', 95, 145, 3),
  ],
  conseilles: [tarif('merule', 120, 220, 0)],
  invalideAvantAnnee: { dpe: 2021, amiante: 2013 },
  pack: { seuil: 4, coefMin: 0.88, coefMax: 0.92 },
};

beforeAll(() => {
  db = getFirestore(appAdmin());
  auth = getAuth(appAdmin());
});
beforeEach(async () => {
  await Promise.all([
    fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
      { method: 'DELETE' },
    ),
    fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/accounts`,
      { method: 'DELETE' },
    ),
  ]);
  envois = [];
  s = {
    db,
    auth,
    horloge: () => T,
    notifier: async (n) => void envois.push(n),
    urlSite: 'https://portail-habitat.test',
    versionLegale: '2026-09-22',
    referentiel,
    textes: { dpe: { nom: 'DPE', quand: 'Vente et location', validite: '10 ans' } },
    commune: (slug) =>
      slug === 'cenon'
        ? { nom: 'Cenon', presquile: false }
        : slug === 'ambes'
          ? { nom: 'Ambès', presquile: true }
          : null,
  };
});

const entree = (autres: Record<string, unknown> = {}) =>
  entreeDossierDiag.parse({
    cleIdempotence: 'cle-diag-00001',
    bien: {
      adresse: '12 rue Camille Pelletan',
      communeSlug: 'cenon',
      codePostal: '33150',
      type: 'maison',
      periode: '1949-1976',
      surface: 110,
      motif: 'vente',
      gaz: 'non',
      elec: 'ancienne',
      assainissement: 'collectif',
      classe: 'inconnu',
    },
    existants: [{ diagId: 'dpe', annee: 2019 }],
    contact: { nom: 'Camille Martin', email: 'camille@test.local', telephone: '0612345678' },
    visiteSouhaitee: 'semaine',
    accepteContact: true,
    ...autres,
  });

describe('creerDossierDiag', () => {
  it('DIA-02, DIA-03, DIA-04 : dossier recalculé côté serveur, pack, PHD-XXXXXX, email', async () => {
    const r = await creerDossierDiag(s, entree());
    expect(r.reference).toMatch(/^PHD-[2-9A-HJ-NP-Z]{6}$/);
    // Maison 1968 à la vente : DPE (2019 → à refaire), amiante, termites, électricité, ERP.
    expect(r.resultat.map((l) => [l.diagId, l.statut])).toEqual([
      ['dpe', 'a_refaire'],
      ['amiante', 'a_realiser'],
      ['termites', 'a_realiser'],
      ['elec', 'a_realiser'],
      ['erp', 'a_realiser'],
    ]);
    // 5 à réaliser ≥ 4 : remise pack (0,88 / 0,92) appliquée au total.
    const min = (110 + 90 + 90 + 95 + 25) * 100;
    const max = (190 + 160 + 150 + 155 + 55) * 100;
    expect(r.estimation).toEqual({
      minCentimes: Math.round(min * 0.88),
      maxCentimes: Math.round(max * 0.92),
      remisePack: true,
    });
    expect(r.resultat[0]!.raison).toContain('Rapport de 2019 hors délai');

    const d = depuisFirestore(
      (await db.doc(chemins.dossierDiag(r.dossierId)).get()).data()!,
    ) as Record<string, unknown>;
    expect(dossierDiag.safeParse(d).success).toBe(true);
    expect(d).toMatchObject({
      reference: r.reference,
      statut: 'nouvelle',
      bien: { communeSlug: 'cenon', codePostal: '33150', gaz: false, electricite: true },
      contact: {
        email: 'camille@test.local',
        telephone: '+33612345678',
        visiteSouhaitee: 'semaine',
      },
    });
    const uid = d.particulierUid as string;
    expect((await auth.getUser(uid)).email).toBe('camille@test.local');
    expect(envois[0]).toMatchObject({
      modele: 'dossier-diag-confirme',
      refObjet: `dossiersDiag/${r.dossierId}`,
      donnees: { reference: r.reference, aRealiser: 5, remisePack: true },
    });
    expect(envois[0]!.secrets!.lien).toContain('mode=signIn');
  });

  it('diagnostic conseillé (Presqu’île) : listé, jamais compté dans le budget', async () => {
    const r = await creerDossierDiag(
      s,
      entree({ bien: { ...entree().bien, communeSlug: 'ambes', codePostal: '33810' } }),
    );
    expect(r.resultat.at(-1)).toMatchObject({ diagId: 'merule', statut: 'conseille' });
    expect(r.estimation.maxCentimes).toBe(Math.round((190 + 160 + 150 + 155 + 55) * 100 * 0.92));
  });

  it('commune inconnue : refus métier, rien d’écrit', async () => {
    await expect(
      creerDossierDiag(s, entree({ bien: { ...entree().bien, communeSlug: 'inconnue' } })),
    ).rejects.toBeInstanceOf(ErreurMetier);
    expect((await db.collection(collections.dossiersDiag).get()).size).toBe(0);
  });
});
