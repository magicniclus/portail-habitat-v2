import { ETAPES_ENTONNOIR } from '@ph/core/ia';
import { entreeAnalyseIa } from '@ph/core/schemas';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { collections } from '../src/chemins';
import {
  agirSurRecommandation,
  analyserIa,
  calculerContextesIa,
  lireAnalyseIa,
  syntheseHebdoIa,
  type AppelIa,
  type ClientIa,
  lireStatsRedactionIa,
  mesurerEffetsIa,
  poserQuestionSuiviIa,
} from '../src/serveur/ia';

/** Assistant IA (IA_ADMIN ; IA-01 à IA-06) avec un faux modèle : aucun appel réel. */
let db: Firestore;
const T = Date.UTC(2026, 9, 6, 9);
const appels: AppelIa[] = [];
const reco = (titre: string, valeur = '62 %') => ({
  titre,
  perimetre: 'landing:acquisition-artisans',
  etape: 'Landing → intérêt',
  gainEstime: '+1 à +2 pts',
  priorite: 1,
  impact: 'élevé',
  effort: 'faible',
  confiance: 0.7,
  constat: 'Beaucoup de sorties dans la section offres.',
  preuves: [{ source: 'comportementAgregats', ref: 'acquisition-artisans · 30 j', valeur }],
  action: { type: 'ab_test', details: 'Monter le comparatif des offres.' },
});
const reponse = (n: number, valeur?: string, etapes?: unknown) =>
  JSON.stringify({
    resume: 'Les offres font partir les visiteurs.',
    recommandations: Array.from({ length: n }, (_, i) => reco(`Reco ${i}`, valeur)),
    ...(etapes ? { etapes } : {}),
    questionsOuvertes: [],
  });
const faux =
  (...textes: string[]): ClientIa =>
  async (a) => {
    appels.push(a);
    return {
      texte: textes[Math.min(appels.length - 1, textes.length - 1)]!,
      refus: false,
      usage: { entree: 2000, sortie: 1500, cacheEcrit: 4000, cacheLu: 0 },
    };
  };
const services = (client: ClientIa | null) => ({ db, horloge: () => T, client });
const entree = (e: Record<string, unknown> = {}) =>
  entreeAnalyseIa.parse({ mode: 'rapide', perimetres: ['landings'], ...e });

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  appels.length = 0;
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await db.doc(`${collections.iaContexte}/landings`).set({
    schemaVersion: 1,
    json: JSON.stringify([{ page: 'acquisition-artisans', sessions: 1234, sorties: '62 %' }]),
    tokensEstimes: 30,
    updatedAt: Timestamp.fromMillis(T),
  });
});

describe('analyserIa', () => {
  it('IA-01 : enregistre une sortie conforme dont chaque valeur citée existe dans le contexte', async () => {
    const r = await analyserIa(services(faux(reponse(3))), entree(), 'admin1');
    expect(r.depuisCache).toBe(false);
    const lu = await lireAnalyseIa(db, r.analyseId);
    expect(lu!.analyse).toMatchObject({
      statut: 'ok',
      modele: 'claude-haiku-4-5',
      coutCentimes: 2,
    });
    expect(lu!.recommandations).toHaveLength(3);
    expect(appels[0]!.modele).toBe('claude-haiku-4-5');
  });

  it('redemande une fois une sortie qui cite une valeur inventée, puis l’accepte corrigée', async () => {
    const r = await analyserIa(services(faux(reponse(3, '38 %'), reponse(3))), entree(), 'admin1');
    expect(appels).toHaveLength(2);
    expect(appels[1]!.demande).toContain('valeur absente du contexte : « 38 % »');
    expect((await lireAnalyseIa(db, r.analyseId))!.analyse.statut).toBe('ok');
  });

  it('échoue sans rien recommander après deux sorties non conformes', async () => {
    await expect(
      analyserIa(services(faux('pas du JSON', reponse(9))), entree(), 'admin1'),
    ).rejects.toThrow('analyse exploitable');
    expect((await db.collection(collections.iaRecommandations).get()).size).toBe(0);
    const [a] = (await db.collection(collections.iaAnalyses).get()).docs;
    expect(a!.data()).toMatchObject({ statut: 'erreur' });
  });

  it('IA-02 : la même question dans les 24 h ne rappelle pas le modèle, sauf « Relancer »', async () => {
    const client = faux(reponse(3));
    const a = await analyserIa(services(client), entree({ question: 'Pourquoi ?' }), 'admin1');
    const b = await analyserIa(services(client), entree({ question: 'pourquoi ?' }), 'admin2');
    expect(b).toEqual({ analyseId: a.analyseId, depuisCache: true });
    expect(appels).toHaveLength(1);
    await analyserIa(
      services(client),
      entree({ question: 'Pourquoi ?', relancer: true }),
      'admin1',
    );
    expect(appels).toHaveLength(2);
  });

  it('IA-03 : budget du mois atteint, l’assistant est coupé avec un message clair', async () => {
    await db.doc(`${collections.iaQuotas}/budget_2026-10`).set({ coutCentimes: 1000 });
    await expect(analyserIa(services(faux(reponse(3))), entree(), 'admin1')).rejects.toThrow(
      'Budget mensuel de l’assistant atteint',
    );
    expect(appels).toHaveLength(0);
  });

  it('coupé sans clé API, et quota de 30 analyses par jour et par membre', async () => {
    await expect(analyserIa(services(null), entree(), 'admin1')).rejects.toThrow(
      'pas encore activé',
    );
    await db.doc(`${collections.iaQuotas}/admin1_2026-10-06`).set({ utilisations: 30 });
    await expect(analyserIa(services(faux(reponse(3))), entree(), 'admin1')).rejects.toThrow(
      '30 analyses',
    );
  });

  it('IA-04 : en audit, Sonnet si approfondie, 7 étapes notées et 6 à 12 recommandations', async () => {
    const etapes = ETAPES_ENTONNOIR.map((etape) => ({ etape, score: 40, constat: 'à travailler' }));
    const r = await analyserIa(
      services(faux(reponse(6, undefined, etapes))),
      entree({ mode: 'audit', approfondie: true }),
      'admin1',
    );
    const lu = await lireAnalyseIa(db, r.analyseId);
    expect(lu!.analyse.etapes).toHaveLength(7);
    expect(lu!.analyse.modele).toBe('claude-sonnet-5-5');
    expect(appels[0]!.maxTokens).toBe(16_000);
  });

  it('IA-06 : seuls les périmètres choisis sont envoyés au modèle', async () => {
    await db
      .doc(`${collections.iaContexte}/emails`)
      .set({ json: '{"secret":"emails"}', updatedAt: Timestamp.fromMillis(T) });
    await analyserIa(services(faux(reponse(3))), entree(), 'admin1');
    expect(appels[0]!.contexte).toContain('### landings');
    expect(appels[0]!.contexte).not.toContain('emails');
  });
});

describe('agirSurRecommandation', () => {
  it('crée une tâche, un brouillon de test A/B, et transforme un refus en consigne', async () => {
    const r = await analyserIa(services(faux(reponse(3))), entree(), 'admin1');
    const [a, b, c] = (await lireAnalyseIa(db, r.analyseId))!.recommandations;
    const s = { db, horloge: () => T };
    await agirSurRecommandation(s, { acteurUid: 'admin1', id: a!.id, action: 'tache' });
    await agirSurRecommandation(s, { acteurUid: 'admin1', id: b!.id, action: 'ab_test' });
    await agirSurRecommandation(s, {
      acteurUid: 'admin1',
      id: c!.id,
      action: 'ignorer',
      motif: 'déjà testé',
    });
    expect((await db.doc(`${collections.filesModeration}/ia-${a!.id}`).get()).get('type')).toBe(
      'recommandation_ia',
    );
    expect((await db.doc(`${collections.abTests}/ia-${b!.id}`).get()).data()).toMatchObject({
      page: 'acquisition-artisans',
      statut: 'brouillon',
    });
    expect((await db.doc('config/ia').get()).get('consignes')).toEqual([
      `${c!.titre} — déjà testé`,
    ]);
    expect(
      (
        await db
          .collection(collections.auditLog)
          .where('action', '==', 'adminRecommandationIa')
          .get()
      ).size,
    ).toBe(3);
  });
});

describe('calculerContextesIa', () => {
  it('écrit un contexte compact par périmètre, sans donnée personnelle', async () => {
    await db.doc(`${collections.comportementAgregats}/acquisition-artisans_30j_tous`).set({
      sessions: 1000,
      conversions: 50,
      dureeMediane: 65_000,
      profondeurMediane: 55,
      sections: {
        offres: { vues: 600, lues: 400, tempsTotalMs: 1, sorties: 300, conversionsSiLue: 20 },
      },
      elements: { 'prix-premium': { clics: 0, morts: 40, rages: 0, hesitations: 0 } },
    });
    await db.doc(`${collections.artisans}/a1`).set({
      enLigne: true,
      plan: 'gratuit',
      completude: 80,
      nbAvis: 2,
      email: 'pierre@exemple.fr',
    });
    await calculerContextesIa(db, T);
    const landings = (await db.doc(`${collections.iaContexte}/landings`).get()).get(
      'json',
    ) as string;
    expect(landings).toContain('"conversion":"5 %"');
    expect(landings).toContain('"clicsMorts":"4 %"');
    const fiches = (await db.doc(`${collections.iaContexte}/fiches`).get()).get('json') as string;
    expect(fiches).toContain('"completudeMoyenne":"80 %"');
    expect(fiches).not.toContain('pierre');
  });
});

describe('syntheseHebdoIa (IA-07)', () => {
  it('audit complet au modèle approfondi, envoyé aux superadmins actifs avec l’évolution', async () => {
    await db.doc(`${collections.admins}/sa1`).set({ role: 'superadmin', actif: true });
    await db.doc(`${collections.admins}/sa2`).set({ role: 'superadmin', actif: false });
    await db.doc(`${collections.admins}/op1`).set({ role: 'operateur', actif: true });
    await db.collection(collections.iaAnalyses).add({
      demandePar: 'systeme:synthese-hebdo',
      statut: 'ok',
      createdAt: Timestamp.fromMillis(T - 7 * 86_400_000),
      etapes: ETAPES_ENTONNOIR.map((etape) => ({ etape, score: 50 })),
    });
    const envois: {
      modele: string;
      destinataire: { uid?: string };
      donnees: { message: string };
    }[] = [];
    const etapes = ETAPES_ENTONNOIR.map((etape, i) => ({
      etape,
      score: 30 + i * 5,
      constat: 'à suivre',
    }));
    const r = await syntheseHebdoIa({
      ...services(faux(reponse(6, undefined, etapes))),
      notifier: async (n) => void envois.push(n as unknown as (typeof envois)[number]),
    });
    expect(r.destinataires).toBe(1);
    expect(appels[0]!.modele).toBe('claude-sonnet-5-5');
    expect(envois[0]).toMatchObject({ modele: 'ia-synthese-hebdo', destinataire: { uid: 'sa1' } });
    expect(envois[0]!.donnees.message).toContain('Acquisition (trafic) 30/100 (-20)');
  });
});

describe('lireStatsRedactionIa', () => {
  it('30 derniers jours seulement, taux d’acceptation', async () => {
    const ligne = (action: string, accepte: boolean, ilYa: number) =>
      db.collection(collections.iaRedactions).add({
        artisanId: 'a1',
        type: 'apropos',
        action,
        accepte,
        coutCentimes: 1,
        createdAt: Timestamp.fromMillis(T - ilYa * 86_400_000),
      });
    await ligne('relire', true, 1);
    await ligne('reecrire', false, 2);
    await ligne('relire', true, 40);
    expect(await lireStatsRedactionIa(db, T)).toMatchObject({
      total: 2,
      acceptees: 1,
      tauxAcceptation: 50,
      parAction: { relire: { total: 1, acceptees: 1 } },
    });
  });
});

describe('questions de suivi', () => {
  it('réponse vérifiée enregistrée sur l’analyse ; valeur inventée deux fois : refusée', async () => {
    const r = await analyserIa(services(faux(reponse(3))), entree(), 'admin1');
    appels.length = 0;
    const ok = JSON.stringify({
      reponse: 'Sur mobile, les sorties restent à 62 %.',
      preuves: [{ source: 'landings', ref: 'acquisition-artisans', valeur: '62 %' }],
    });
    const suivi = await poserQuestionSuiviIa(
      services(faux(ok)),
      { analyseId: r.analyseId, question: 'Et sur mobile ?' },
      'admin1',
    );
    expect(suivi).toMatchObject({ question: 'Et sur mobile ?', reponse: expect.any(String) });
    expect(appels[0]!.demande).toContain('Reco 0');
    expect(appels[0]!.contexte).toContain('1234');
    const doc = await db.collection(collections.iaAnalyses).doc(r.analyseId).get();
    expect(doc.get('suivis')).toHaveLength(1);
    const faux2 = JSON.stringify({
      reponse: 'x',
      preuves: [{ source: 'a', ref: 'b', valeur: '99 %' }],
    });
    await expect(
      poserQuestionSuiviIa(
        services(faux(faux2)),
        { analyseId: r.analyseId, question: 'Autre ?' },
        'admin1',
      ),
    ).rejects.toMatchObject({ code: 'INDISPONIBLE' });
    expect(
      (await db.collection(collections.iaAnalyses).doc(r.analyseId).get()).get('suivis'),
    ).toHaveLength(1);
  });
});

describe('mesurerEffetsIa', () => {
  it('30 jours après « faite » : effet enregistré une fois ; avant 30 jours : rien', async () => {
    const r = await analyserIa(services(faux(reponse(3))), entree(), 'admin1');
    const [a, b] = (await lireAnalyseIa(db, r.analyseId))!.recommandations;
    const refA = db.collection(collections.iaRecommandations).doc(a!.id);
    await refA.update({ statut: 'faite', faiteLe: Timestamp.fromMillis(T - 31 * 86_400_000) });
    await db
      .collection(collections.iaRecommandations)
      .doc(b!.id)
      .update({ statut: 'faite', faiteLe: Timestamp.fromMillis(T - 10 * 86_400_000) });
    await db.doc(`${collections.iaContexte}/landings`).update({
      json: JSON.stringify([{ page: 'acquisition-artisans', sessions: 1500, sorties: '48 %' }]),
    });
    appels.length = 0;
    const effet = JSON.stringify({
      verdict: 'amelioration',
      resume: 'Les sorties passent de 62 % à 48 %.',
      mesures: [{ ref: 'acquisition-artisans', avant: '62 %', apres: '48 %' }],
    });
    expect(await mesurerEffetsIa(services(faux(effet)))).toEqual({ mesurees: 1 });
    expect(appels[0]!.demande).toContain('62 %');
    expect((await refA.get()).get('effet')).toMatchObject({
      verdict: 'amelioration',
      mesures: [{ avant: '62 %', apres: '48 %' }],
    });
    expect(await mesurerEffetsIa(services(faux(effet)))).toEqual({ mesurees: 0 });
  });
  it('valeurs introuvables : « non mesurable », sans nouvel essai la nuit suivante', async () => {
    const r = await analyserIa(services(faux(reponse(3))), entree(), 'admin1');
    const [a] = (await lireAnalyseIa(db, r.analyseId))!.recommandations;
    const refA = db.collection(collections.iaRecommandations).doc(a!.id);
    await refA.update({ statut: 'faite', faiteLe: Timestamp.fromMillis(T - 31 * 86_400_000) });
    const invente = JSON.stringify({
      verdict: 'amelioration',
      resume: 'x',
      mesures: [{ ref: 'r', avant: '62 %', apres: '12 %' }],
    });
    await mesurerEffetsIa(services(faux(invente)));
    expect((await refA.get()).get('effet.verdict')).toBe('indetermine');
    expect(await mesurerEffetsIa(services(faux(invente)))).toEqual({ mesurees: 0 });
  });
});
