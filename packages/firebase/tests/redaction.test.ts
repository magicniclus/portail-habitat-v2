import { entreeRedactionIa } from '@ph/core/schemas';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { collections } from '../src/chemins';
import {
  marquerRedactionAcceptee,
  redigerIa,
  type AppelIa,
  type ClientIa,
} from '../src/serveur/ia';

/** Assistant de rédaction (IA_ADMIN §8) avec un faux modèle. */
let db: Firestore;
const T = Date.UTC(2026, 9, 6, 9);
const appels: AppelIa[] = [];
const faux =
  (...textes: string[]): ClientIa =>
  async (a) => {
    appels.push(a);
    return {
      texte: JSON.stringify({
        texte: textes[Math.min(appels.length - 1, textes.length - 1)],
        changements: ['ton'],
      }),
      refus: false,
      usage: { entree: 400, sortie: 200, cacheEcrit: 0, cacheLu: 0 },
    };
  };
const services = (client: ClientIa | null) => ({
  db,
  horloge: () => T,
  client,
  nomMetier: () => 'Plombier',
});
const entree = (e: Record<string, unknown> = {}) =>
  entreeRedactionIa.parse({
    type: 'apropos',
    action: 'reecrire',
    ton: 'chaleureux',
    texte: 'Plombier à Bordeaux.',
    ...e,
  });

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  appels.length = 0;
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await db.doc(`${collections.artisans}/a1`).set({
    nomCommercial: 'Martin Plomberie',
    metiers: ['plombier'],
    adresseSiege: { ville: 'Bordeaux' },
    labels: ['decennale'],
  });
});

describe('redigerIa', () => {
  it('propose un texte et journalise sans le texte', async () => {
    const r = await redigerIa(
      services(faux('Plombier chaleureux à Bordeaux, devis gratuit.')),
      { artisanId: 'a1' },
      entree(),
    );
    expect(r.texte).toBe('Plombier chaleureux à Bordeaux, devis gratuit.');
    expect(appels[0]).toMatchObject({ modele: 'claude-haiku-4-5', maxTokens: 900 });
    expect(appels[0]!.contexte).toContain(
      'Martin Plomberie · métiers : Plombier · ville : Bordeaux',
    );
    const journal = (await db.doc(`${collections.iaRedactions}/${r.redactionId}`).get()).data()!;
    expect(journal).toMatchObject({
      artisanId: 'a1',
      type: 'apropos',
      action: 'reecrire',
      ton: 'chaleureux',
      accepte: false,
    });
    expect(JSON.stringify(journal)).not.toContain('Bordeaux');
    await marquerRedactionAcceptee(db, 'a1', r.redactionId);
    expect(
      (await db.doc(`${collections.iaRedactions}/${r.redactionId}`).get()).get('accepte'),
    ).toBe(true);
    await expect(marquerRedactionAcceptee(db, 'autre', r.redactionId)).rejects.toThrow();
  });

  it('écarte une certification inventée, après une nouvelle tentative', async () => {
    await expect(
      redigerIa(
        services(faux('Artisan certifié RGE.', 'Artisan RGE et Qualibat.')),
        { artisanId: 'a1' },
        entree(),
      ),
    ).rejects.toThrow('absente de votre fiche');
    expect(appels).toHaveLength(2);
    expect(appels[1]!.demande).toContain('certification non vérifiée sur la fiche : rge');
  });

  it('20 utilisations par jour et par entreprise, puis un message clair', async () => {
    await db.doc(`${collections.iaQuotas}/a1_2026-10-06`).set({ utilisations: 20 });
    await expect(redigerIa(services(faux('x')), { artisanId: 'a1' }, entree())).rejects.toThrow(
      '20 aides du jour',
    );
    expect(appels).toHaveLength(0);
  });

  it('indisponible sans clé API', async () => {
    await expect(redigerIa(services(null), { artisanId: 'a1' }, entree())).rejects.toThrow(
      'pas encore disponible',
    );
  });
});

describe('entreeRedactionIa', () => {
  it('borne la longueur selon le type et exige un ton pour réécrire', () => {
    expect(
      entreeRedactionIa.safeParse({ type: 'projet', action: 'relire', texte: 'x'.repeat(401) })
        .success,
    ).toBe(false);
    expect(
      entreeRedactionIa.safeParse({ type: 'apropos', action: 'reecrire', texte: 'abc' }).success,
    ).toBe(false);
    expect(
      entreeRedactionIa.safeParse({ type: 'apropos', action: 'relire', texte: '' }).success,
    ).toBe(false);
    expect(
      entreeRedactionIa.safeParse({ type: 'projet', action: 'generer', infos: { titre: 'Douche' } })
        .success,
    ).toBe(true);
  });
});
