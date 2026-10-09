import { getAuth } from 'firebase-admin/auth';
import { GeoPoint, getFirestore } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';
import { appAdmin } from '../src/admin';
import { ecrireJeu } from '../src/seed/ecrire';
import { lireFichiersSeed } from '../src/seed/fichiers';
import { verifierCibleSeed } from '../src/seed/garde';
import { genererJeu, schemaPour, validerDocuments } from '../src/seed/jeu';

const fichiers = lireFichiersSeed(new URL('../../../docs/data/', import.meta.url));
const MAINTENANT = new Date('2026-09-27T10:00:00Z');
const jeu = genererJeu(fichiers, 42, MAINTENANT);
const docs = [...jeu.documents.entries()];
const dans = (prefixe: RegExp) => docs.filter(([c]) => prefixe.test(c)).map(([, d]) => d);

describe('jeu de données (COMPTES §6.4)', () => {
  it('chaque document respecte son schéma Zod', () => {
    expect(validerDocuments(jeu.documents)).toEqual([]);
  });
  it('aucun tableau imbriqué (refusé par Firestore)', () => {
    const imbrique = (x: unknown): boolean =>
      Array.isArray(x)
        ? x.some((y) => Array.isArray(y) || imbrique(y))
        : typeof x === 'object' &&
          x !== null &&
          !(x instanceof Date) &&
          Object.values(x).some(imbrique);
    expect(docs.filter(([, d]) => imbrique(d)).map(([c]) => c)).toEqual([]);
  });
  it('déterministe : même graine, même jeu', () => {
    const autre = genererJeu(fichiers, 42, MAINTENANT);
    expect(JSON.stringify([...autre.documents])).toBe(JSON.stringify(docs));
    expect(JSON.stringify([...genererJeu(fichiers, 7, MAINTENANT).documents])).not.toBe(
      JSON.stringify(docs),
    );
  });
  it('référentiel : 112 prestations, prix à part, recherche, 11 communes', () => {
    expect(dans(/^referentiel\/prestations\/items\//)).toHaveLength(112);
    expect(dans(/^referentiel\/prestations\/prix\//)).toHaveLength(113);
    expect(dans(/^referentiel\/recherche\/intentions\//)).toHaveLength(137);
    expect(dans(/^referentiel\/recherche\/metiers\//)).toHaveLength(60);
    expect(dans(/^communes\//)).toHaveLength(11);
    const publics = JSON.stringify(dans(/^referentiel\/prestations\/items\//));
    expect(publics).not.toMatch(/unitaire|prixM2|"base"/);
  });
  it('60 artisans, tous plans et statuts de vérification', () => {
    const artisans = dans(/^artisans\/[^/]+$/);
    expect(artisans).toHaveLength(60);
    expect(new Set(artisans.map((a) => a.plan))).toEqual(
      new Set(['gratuit', 'visibilite', 'premium']),
    );
    expect(new Set(artisans.map((a) => (a.verification as { statut: string }).statut))).toEqual(
      new Set(['a_faire', 'en_cours', 'verifie', 'refuse', 'expire']),
    );
    expect(artisans.filter((a) => a.revendiquee === false && a.origine === 'admin')).toHaveLength(
      1,
    );
  });
  it('5 entreprises multi-membres, une personne membre de 2 entreprises', () => {
    const membres = docs
      .filter(([c]) => /^artisans\/[^/]+\/membres\//.test(c))
      .map(([c]) => c.split('/'));
    const parEntreprise = new Map<string, number>();
    const parPersonne = new Map<string, number>();
    for (const [, aid, , uid] of membres) {
      parEntreprise.set(aid!, (parEntreprise.get(aid!) ?? 0) + 1);
      parPersonne.set(uid!, (parPersonne.get(uid!) ?? 0) + 1);
    }
    expect([...parEntreprise.values()].filter((n) => n > 1)).toHaveLength(5);
    expect([...parPersonne.entries()].filter(([, n]) => n > 1)).toEqual([['seed-proprio', 2]]);
    expect(jeu.claims.get('seed-proprio')).toEqual({
      roles: ['particulier', 'artisan'],
      ent: { 'seed-a-00': 'p', 'seed-a-01': 'g' },
    });
  });
  it('200 demandes à tous les statuts, 40 appels d’offres (auto, manuel, gratuit, promo)', () => {
    const demandes = dans(/^demandes\/[^/]+$/);
    expect(demandes).toHaveLength(200);
    expect(new Set(demandes.map((d) => d.statut)).size).toBe(9);
    const ao = dans(/^appelsOffres\/[^/]+$/) as {
      tarification: { mode: string; promo?: unknown };
    }[];
    expect(ao).toHaveLength(40);
    expect(new Set(ao.map((a) => a.tarification.mode))).toEqual(
      new Set(['auto', 'manuel', 'gratuit']),
    );
    expect(ao.filter((a) => a.tarification.promo)).toHaveLength(4);
  });
  it('300 avis, dont en attente et signalés ; aucune donnée personnelle dans l’avis publié', () => {
    const avis = dans(/^avis\/[^/]+$/);
    expect(avis).toHaveLength(300);
    expect(avis.some((a) => a.statut === 'en_attente')).toBe(true);
    expect(dans(/^avis\/[^/]+\/signalements\//).length).toBeGreaterThan(0);
    expect(JSON.stringify(avis)).not.toMatch(/@test\.local/);
  });
  it('cas limites : invitation expirée, revendication en cours, SIREN en doublon', () => {
    expect(dans(/^invitations\//).map((i) => i.statut)).toEqual(['expiree']);
    expect(dans(/^revendications\//).map((r) => r.statut)).toEqual(['ouverte']);
    const sirens = dans(/^artisans\/[^/]+$/).map((a) => a.siren);
    expect(sirens.length - new Set(sirens).size).toBe(1);
  });
  it('comptes de test fixes', () => {
    const emails = jeu.comptes.map((c) => c.email);
    for (const e of ['particulier', 'proprio', 'collab', 'compta', 'admin'])
      expect(emails).toContain(`${e}@test.local`);
    expect(new Set(emails).size).toBe(emails.length);
    expect(jeu.claims.get('seed-admin')?.staff?.r).toBe('superadmin');
  });
  it('stats/public cohérent avec les fiches et les avis publiés (ACC-01)', () => {
    const stats = jeu.documents.get('stats/public')!;
    const fiches = [...jeu.documents.keys()].filter((p) => p.startsWith('artisansPublic/'));
    expect(stats.nbArtisans).toBe(fiches.length);
    expect(stats.nbVilles).toBeGreaterThan(5);
    expect(stats.nbAvisTotal).toBeGreaterThan(100);
    expect(stats.noteMoyenneGlobale).toBeGreaterThan(3);
  });
  it('fiches publiques sans donnée privée', () => {
    const publics = dans(/^artisansPublic\//);
    expect(publics.length).toBeGreaterThan(40);
    expect(JSON.stringify(publics)).not.toMatch(/siren|siret|@test\.local|proprietaireUid/);
  });
  it('chemin sans schéma signalé', () => {
    expect(schemaPour('inconnu/x')).toBeUndefined();
    expect(validerDocuments(new Map([['inconnu/x', {}]]))).toEqual(['inconnu/x : aucun schéma']);
  });
});

describe('garde du seed', () => {
  const ok = { SEED_MOT_DE_PASSE: 'un-mot-de-passe-long' };
  it('émulateur demo-… : accepté', () => {
    expect(verifierCibleSeed({ ...ok, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' })).toMatchObject({
      projet: 'demo-portail-habitat',
      emulateur: true,
    });
  });
  it('préproduction -staging : acceptée', () => {
    expect(verifierCibleSeed({ ...ok, GCLOUD_PROJECT: 'portail-habitat-staging' }).emulateur).toBe(
      false,
    );
  });
  it.each([
    [{ ...ok, NODE_ENV: 'production', FIRESTORE_EMULATOR_HOST: 'x' }, /NODE_ENV/],
    [{ ...ok, GCLOUD_PROJECT: 'portail-habitat-prod' }, /refusé/],
    [{ ...ok, FIRESTORE_EMULATOR_HOST: 'x', GCLOUD_PROJECT: 'portail-habitat-prod' }, /refusé/],
    [{ ...ok }, /refusé/],
    [{ FIRESTORE_EMULATOR_HOST: 'x', SEED_MOT_DE_PASSE: 'court' }, /SEED_MOT_DE_PASSE/],
  ])('refusé : %j', (env, message) => {
    expect(() => verifierCibleSeed(env as NodeJS.ProcessEnv)).toThrow(message);
  });
});

describe('écriture sur l’émulateur', () => {
  it('documents, comptes et claims ; relançable', async () => {
    const db = getFirestore(appAdmin());
    const auth = getAuth(appAdmin());
    const petit = {
      ...jeu,
      documents: new Map(
        [...jeu.documents].filter(([c]) =>
          /^(artisans\/seed-a-00|artisansPublic\/seed-a-00|users\/seed-proprio)$/.test(c),
        ),
      ),
    };
    for (let i = 0; i < 2; i++) {
      const r = await ecrireJeu(db, auth, petit, 'mot-de-passe-de-test');
      expect(r).toEqual({ comptes: jeu.comptes.length, documents: 3 });
    }
    expect((await db.doc('artisansPublic/seed-a-00').get()).get('geo')).toBeInstanceOf(GeoPoint);
    expect((await auth.getUser('seed-proprio')).customClaims).toEqual(
      jeu.claims.get('seed-proprio'),
    );
    expect((await auth.getUserByEmail('admin@test.local')).emailVerified).toBe(true);
  });
});
