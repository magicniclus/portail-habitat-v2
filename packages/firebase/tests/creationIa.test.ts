import { ErreurMetier } from '@ph/core/erreurs';
import { droitsDe } from '@ph/core/paiements';
import { siteParDefaut, type FicheCreation } from '@ph/core/sites';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import type { AppelIa, ReponseIa } from '../src/serveur/ia';
import {
  creerSite,
  demarrerCreationIa,
  genererPageCreation,
  lireCreationIa,
  lireSiteEdition,
  reprendreCreationIa,
  type ServicesIaSite,
} from '../src/serveur/sites';

// IA_SITE.md §7 : SITE-IA-01, 02, 09, 10 (07 : tests du cœur).
let db: Firestore;
let reponses: string[] = [];
const appels: AppelIa[] = [];
const client = async (a: AppelIa): Promise<ReponseIa> => {
  appels.push(a);
  return {
    texte: reponses.shift() ?? '{}',
    usage: { entree: 10, sortie: 10, cacheEcrit: 0, cacheLu: 0 },
    refus: false,
  };
};
const s = (): ServicesIaSite => ({
  db,
  horloge: () => Date.UTC(2026, 9, 16, 10),
  domaineBase: 'portailhabitat.fr',
  client,
});
const proprio = { artisanId: 'a1', uid: 'p1' };
const PALETTE = {
  primaire: 'primaire',
  accent: 'accent',
  clair: 'clair',
  sombre: 'sombre',
} as const;
const fiche: FicheCreation = {
  metierPrincipal: 'plombier',
  metierNom: 'Plombier',
  ville: 'Pessac',
  prestations: ['Chauffe-eau', 'Dépannage fuite'],
  nbPhotos: 0,
  nbAvis: 0,
  labels: [],
  rayonKm: 5,
  communesProches: [],
};
const sec = {
  rows: [
    {
      cols: [
        { w: 12, els: [{ type: 'titre', p: { texte: 'Votre plombier à Pessac', niveau: 'h1' } }] },
      ],
    },
  ],
};
const page = (op: object) =>
  JSON.stringify({ resume: 'Page', question: '', operations: JSON.stringify([op]) });
const accueil = page({ op: 'remplacerContenuPage', cible: 'accueil', sections: [sec] });
const formule = (f: 'gratuit' | 'site_pro') =>
  db.doc(chemins.artisan('a1')).set({ droits: droitsDe(f) }, { merge: true });

async function erreur(p: Promise<unknown>): Promise<ErreurMetier> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErreurMetier) return e;
    throw e;
  }
  throw new Error('Aucune erreur levée');
}

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
  await formule('gratuit');
  await creerSite(s(), proprio, {
    sousDomaine: 'durand',
    initial: siteParDefaut(
      { nomCommercial: 'Durand', metier: 'Plombier', ville: 'Pessac', photos: [] },
      PALETTE,
    ),
  });
});

describe('création assistée', () => {
  it('SITE-IA-01 : compte gratuit → aperçu de l’accueil seulement, jamais appliqué, une seule fois', async () => {
    const d = await demarrerCreationIa(s(), proprio, { reponses: { q6: 'Chaleureux' }, fiche });
    expect(d).toMatchObject({ statut: 'apercu' });
    expect(d.plan.map((p) => p.cle)).toEqual(['accueil']);
    reponses = [accueil];
    const r = await genererPageCreation(s(), proprio, 'accueil');
    expect(r.apercu).toBe(true);
    expect(appels[0]!.modele).toBe('claude-sonnet-5-5');
    const site = await lireSiteEdition(db, 'a1');
    expect(JSON.stringify(site.pages)).not.toContain('Votre plombier à Pessac');
    expect((await lireCreationIa(db, 'a1'))?.statut).toBe('attente_paiement');
    expect((await erreur(demarrerCreationIa(s(), proprio, { reponses: {}, fiche }))).code).toBe(
      'TROP_DE_REQUETES',
    );
  });

  it('SITE-IA-02 : après paiement, reprise sans question ; SITE-IA-09 : « Avant IA » dans Mes modèles', async () => {
    await demarrerCreationIa(s(), proprio, { reponses: { q6: 'Chaleureux' }, fiche });
    reponses = [accueil];
    await genererPageCreation(s(), proprio, 'accueil');
    expect((await erreur(reprendreCreationIa(s(), proprio))).code).toBe('PERMISSION_REFUSEE');
    await formule('site_pro');
    const r = await reprendreCreationIa(s(), proprio);
    expect(r.plan.map((p) => p.cle)).toEqual(['accueil', 'prestations', 'contact']);
    expect(r.accueil[0]).toMatchObject({ op: 'remplacerContenuPage', cible: 'accueil' });
    const modeles = await db.collection(chemins.modelesSite('a1')).get();
    expect(modeles.docs.map((m) => m.get('nom'))).toEqual([expect.stringMatching(/^Avant IA – /)]);
    // Pages suivantes, avec les réponses gardées (aucune question reposée).
    reponses = [page({ op: 'creerPage', page: { nom: 'Prestations', sections: [sec] } })];
    await genererPageCreation(s(), proprio, 'prestations');
    expect(appels.at(-1)!.demande).toContain('Chaleureux');
    reponses = [page({ op: 'remplacerContenuPage', cible: 'contact', sections: [sec] })];
    await genererPageCreation(s(), proprio, 'contact');
    expect((await lireCreationIa(db, 'a1'))?.statut).toBe('terminee');
    // SITE-IA-10 : aucune version publiée par l'IA.
    expect((await lireSiteEdition(db, 'a1')).versions).toEqual([]);
  });

  it('opération inattendue → une relance puis refus ; la page peut être redemandée', async () => {
    await formule('site_pro');
    await demarrerCreationIa(s(), proprio, { reponses: {}, fiche });
    reponses = [
      page({ op: 'supprimer', cible: 'x' }),
      page({ op: 'creerPage', page: { nom: 'X', sections: [sec] } }),
    ];
    expect((await erreur(genererPageCreation(s(), proprio, 'accueil'))).code).toBe('INDISPONIBLE');
    expect(appels).toHaveLength(2);
    reponses = [accueil];
    expect((await genererPageCreation(s(), proprio, 'accueil')).apercu).toBe(false);
  });
});
