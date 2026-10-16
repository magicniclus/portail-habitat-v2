import { ErreurMetier } from '@ph/core/erreurs';
import { droitsDe } from '@ph/core/paiements';
import { A_COMPLETER, elementsDe, siteParDefaut } from '@ph/core/sites';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import type { AppelIa, ReponseIa } from '../src/serveur/ia';
import {
  creerSite,
  demanderIaSite,
  lireSiteEdition,
  type ServicesIaSite,
} from '../src/serveur/sites';

// IA_SITE.md §7 : SITE-IA-03, 04, 05, 08, 10 (06 : tests du cœur, 01/02/07/09 : création assistée).
let db: Firestore;
let reponses: (string | Error)[] = [];
const appels: AppelIa[] = [];
const horloge = Date.UTC(2026, 9, 16, 10);
const usage = { entree: 100, sortie: 50, cacheEcrit: 0, cacheLu: 0 };
const client = async (a: AppelIa): Promise<ReponseIa> => {
  appels.push(a);
  const r = reponses.shift() ?? new Error('plus de réponse');
  if (r instanceof Error) throw r;
  return { texte: r, usage, refus: false };
};
const s = (avecClient = true): ServicesIaSite => ({
  db,
  horloge: () => horloge,
  domaineBase: 'portailhabitat.fr',
  client: avecClient ? client : null,
});
const proprio = { artisanId: 'a1', uid: 'p1' };
const PALETTE = {
  primaire: 'primaire',
  accent: 'accent',
  clair: 'clair',
  sombre: 'sombre',
} as const;
const initial = siteParDefaut(
  { nomCommercial: 'Durand Plomberie', metier: 'Plombier', ville: 'Pessac', photos: [] },
  PALETTE,
);
const titreId = elementsDe(initial.pages.accueil!).find((e) => e.el.type === 'titre')!.el.id;
const sortie = (ops: unknown[], question = '') =>
  JSON.stringify({ resume: 'Titre réécrit', question, operations: JSON.stringify(ops) });
const demande = {
  mode: 'textes' as const,
  portee: 'page' as const,
  pageId: 'accueil',
  cibles: [],
  demande: 'Améliore le titre',
};

async function erreur(p: Promise<unknown>): Promise<ErreurMetier> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErreurMetier) return e;
    throw e;
  }
  throw new Error('Aucune erreur levée');
}
const compteur = async (cle: string) =>
  (await db.doc(chemins.compteurIaSite('a1', cle)).get()).data();
const formule = (f: 'gratuit' | 'site_pro') =>
  db.doc(chemins.artisan('a1')).set({ droits: droitsDe(f) }, { merge: true });

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  reponses = [];
  appels.length = 0;
  await db.doc(chemins.membre('a1', 'p1')).set({ role: 'proprietaire', statut: 'actif' });
  await db
    .doc(chemins.artisanPublic('a1'))
    .set({ nomCommercial: 'Durand Plomberie', ville: 'Pessac' });
  await formule('site_pro');
  await creerSite(s(), proprio, { sousDomaine: 'durand', initial });
});

describe('IA du site', () => {
  it('propose des opérations validées, enregistre la session, ne touche ni les pages ni les versions (SITE-IA-10)', async () => {
    reponses = [
      sortie([{ op: 'texte', cible: titreId, champ: 'texte', valeur: 'Votre plombier à Pessac' }]),
    ];
    const r = await demanderIaSite(s(), proprio, demande);
    expect(r.operations).toHaveLength(1);
    expect(appels[0]!.modele).toBe('claude-haiku-5-5');
    expect(appels[0]!.contexte).toContain(titreId);
    const session = await db.doc(`${chemins.sessionsIaSite('a1')}/${r.sessionId}`).get();
    expect(session.get('versionPrompt')).toBe('site.v1');
    const apres = await lireSiteEdition(db, 'a1');
    expect(JSON.stringify(apres.pages)).not.toContain('Votre plombier à Pessac');
    expect(apres.versions).toEqual([]);
    expect((await compteur('2026-10'))?.textes).toBe(1);
  });

  it('SITE-IA-03 : compte gratuit, fonction réservée à Site Pro → refus, aucun appel au modèle', async () => {
    await formule('gratuit');
    const e = await erreur(demanderIaSite(s(), proprio, { ...demande, mode: 'composant' }));
    expect(e.code).toBe('PERMISSION_REFUSEE');
    expect(appels).toHaveLength(0);
  });

  it('essai gratuit : 3 améliorations de texte à vie, puis refus clair', async () => {
    await formule('gratuit');
    for (let i = 0; i < 3; i++) {
      reponses.push(
        sortie([{ op: 'texte', cible: titreId, champ: 'texte', valeur: `Version ${i}` }]),
      );
      await demanderIaSite(s(), proprio, demande);
    }
    expect((await erreur(demanderIaSite(s(), proprio, demande))).code).toBe('TROP_DE_REQUETES');
    expect(appels).toHaveLength(3);
  });

  it('SITE-IA-04 : hors schéma puis id inexistant → une relance, refus, crédit rendu (SITE-IA-08)', async () => {
    reponses = ['pas du json', sortie([{ op: 'supprimer', cible: 'fantome' }])];
    expect((await erreur(demanderIaSite(s(), proprio, demande))).code).toBe('INDISPONIBLE');
    expect(appels).toHaveLength(2);
    expect(appels[1]!.demande).toContain('refusée');
    expect((await compteur('2026-10'))?.textes).toBe(0);
  });

  it('SITE-IA-08 : panne du modèle → crédit rendu ; sans clé, rien n’est réservé', async () => {
    reponses = [new Error('panne')];
    await expect(demanderIaSite(s(), proprio, demande)).rejects.toThrow('panne');
    expect((await compteur('2026-10'))?.textes).toBe(0);
    expect((await erreur(demanderIaSite(s(false), proprio, demande))).code).toBe('INDISPONIBLE');
    expect((await compteur('2026-10'))?.textes).toBe(0);
  });

  it('SITE-IA-05 : certification ou chiffre absents de la fiche → [à compléter] et avertissement', async () => {
    reponses = [
      sortie([
        {
          op: 'texte',
          cible: titreId,
          champ: 'texte',
          valeur: 'Plombier RGE, 25 ans d’expérience',
        },
      ]),
    ];
    const r = await demanderIaSite(s(), proprio, demande);
    expect(r.operations[0]).toMatchObject({
      valeur: `Plombier ${A_COMPLETER}, ${A_COMPLETER} ans d’expérience`,
    });
    expect(r.avertissements).toEqual(['RGE', '25']);
  });

  it('question de précision : aucun crédit consommé', async () => {
    reponses = [sortie([], 'Quel délai pour un devis : 24 h ou 48 h ?')];
    const r = await demanderIaSite(s(), proprio, demande);
    expect(r.question).toContain('délai');
    expect((await compteur('2026-10'))?.textes).toBe(0);
  });
});
