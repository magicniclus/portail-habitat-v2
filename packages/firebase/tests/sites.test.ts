import { ErreurMetier } from '@ph/core/erreurs';
import { siteParDefaut } from '@ph/core/sites';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, bucketFichiers, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import {
  changerSousDomaine,
  creerSite,
  enregistrerNavigation,
  enregistrerPage,
  envoyerFormulaireSite,
  enregistrerMediaSite,
  gererSectionsEnregistrees,
  lireSitePublie,
  PublicationRefusee,
  publierSite,
  retablirVersion,
} from '../src/serveur/sites';

// SITE_INTERNET.md et DOMAINES.md : SITE-03, SITE-08, SITE-09, SITE-11, SITE-12, SITE-13, DOM-01.
let db: Firestore;
let horloge = Date.UTC(2026, 9, 14, 10);
const s = () => ({ db, horloge: () => horloge, domaineBase: 'portailhabitat.fr' });
const proprio = { artisanId: 'a1', uid: 'p1' };
const PALETTE = {
  primaire: 'primaire',
  accent: 'accent',
  clair: 'clair',
  sombre: 'sombre',
} as const;
const initial = () =>
  siteParDefaut(
    {
      nomCommercial: 'Bertrand Rénovation',
      metier: 'Plombier',
      ville: 'Bordeaux',
      telephone: '05 56 12 34 56',
      photos: [],
    },
    PALETTE,
  );

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
  const m = (role: string) => ({ role, statut: 'actif' });
  await Promise.all([
    db.doc(chemins.membre('a1', 'p1')).set(m('proprietaire')),
    db.doc(chemins.membre('a1', 'c1')).set(m('collaborateur')),
    db.doc(chemins.membre('a2', 'p2')).set(m('proprietaire')),
    db
      .doc(chemins.artisan('a1'))
      .set({ zoneIntervention: { centre: { latitude: 44.84, longitude: -0.58 } } }),
  ]);
});

describe('création et sous-domaine (DOM-01)', () => {
  it('sous-domaine réservé, invalide ou déjà pris → refus clair', async () => {
    expect(
      (await erreur(creerSite(s(), proprio, { sousDomaine: 'admin', initial: initial() }))).message,
    ).toBe('Ce nom est réservé, choisissez-en un autre.');
    await creerSite(s(), proprio, { sousDomaine: 'bertrand-renovation', initial: initial() });
    const e = await erreur(
      creerSite(
        s(),
        { artisanId: 'a2', uid: 'p2' },
        { sousDomaine: 'bertrand-renovation', initial: initial() },
      ),
    );
    expect(e.message).toBe('Ce sous-domaine est déjà pris.');
  });

  it('un collaborateur ne crée ni ne publie le site', async () => {
    expect(
      (
        await erreur(
          creerSite(
            s(),
            { artisanId: 'a1', uid: 'c1' },
            { sousDomaine: 'bertrand', initial: initial() },
          ),
        )
      ).code,
    ).toBe('PERMISSION_REFUSEE');
  });

  it('changer de sous-domaine libère l’ancien', async () => {
    await creerSite(s(), proprio, { sousDomaine: 'bertrand', initial: initial() });
    await publierSite(s(), proprio);
    await changerSousDomaine(s(), proprio, 'bertrand-bordeaux');
    expect(await lireSitePublie(db, 'bertrand.portailhabitat.fr')).toBeNull();
    expect((await lireSitePublie(db, 'bertrand-bordeaux.portailhabitat.fr'))?.siteId).toBe('a1');
    expect((await db.doc(chemins.slugSite('bertrand')).get()).exists).toBe(false);
  });
});

describe('publication', () => {
  it('SITE-09 : un bouton vers une page absente bloque la publication avec un message clair', async () => {
    const i = initial();
    await creerSite(s(), proprio, { sousDomaine: 'bertrand', initial: i });
    const accueil = i.pages.accueil!;
    const bouton = accueil.sections[0]!.rows[0]!.cols[0]!.els.find((x) => x.type === 'bouton')!;
    if (bouton.type === 'bouton') bouton.p.action = { type: 'page', page: 'prestations' };
    await enregistrerPage(s(), proprio, { pageId: 'accueil', page: accueil });
    const e = await erreur(publierSite(s(), proprio));
    expect(e).toBeInstanceOf(PublicationRefusee);
    expect((e as PublicationRefusee).liens[0]).toMatchObject({
      page: 'Accueil',
      erreur: 'Page introuvable',
    });
    expect(e.message).toContain('Bouton « Demander un devis gratuit » : Page introuvable');
    expect(await lireSitePublie(db, 'bertrand.portailhabitat.fr')).toBeNull();
  });

  it('SITE-08 : publiée puis retour immédiat à la version précédente', async () => {
    const i = initial();
    await creerSite(s(), proprio, { sousDomaine: 'bertrand', initial: i });
    expect(await publierSite(s(), proprio)).toEqual({ version: 1 });
    const accueil = i.pages.accueil!;
    accueil.seo.title = 'Plombier à Bordeaux, nouvelle version';
    await enregistrerPage(s(), proprio, { pageId: 'accueil', page: accueil });
    expect(await publierSite(s(), proprio)).toEqual({ version: 2 });
    expect((await lireSitePublie(db, 'bertrand.portailhabitat.fr'))?.pages.accueil?.seo.title).toBe(
      'Plombier à Bordeaux, nouvelle version',
    );
    await retablirVersion(s(), proprio, 1);
    const v1 = await lireSitePublie(db, 'bertrand.portailhabitat.fr');
    expect(v1?.version).toBe(1);
    expect(v1?.pages.accueil?.seo.title).not.toBe('Plombier à Bordeaux, nouvelle version');
  });

  it('SITE-11 : la navigation enregistrée s’applique à toutes les pages sans toucher à leur contenu', async () => {
    const i = initial();
    await creerSite(s(), proprio, { sousDomaine: 'bertrand', initial: i });
    const avant = (await db.doc(chemins.pageSite('a1', 'contact')).get()).get('updatedAt');
    horloge += 60_000;
    await enregistrerNavigation(s(), proprio, { ...i.navigation, nom: 'Bertrand & Fils' });
    expect((await db.doc(chemins.pageSite('a1', 'contact')).get()).get('updatedAt')).toEqual(avant);
    await publierSite(s(), proprio);
    expect((await lireSitePublie(db, 'bertrand.portailhabitat.fr'))?.navigation.nom).toBe(
      'Bertrand & Fils',
    );
  });

  it('adresse de page unique sur le site', async () => {
    const i = initial();
    await creerSite(s(), proprio, { sousDomaine: 'bertrand', initial: i });
    const e = await erreur(
      enregistrerPage(s(), proprio, {
        pageId: 'autre',
        page: { ...i.pages.contact!, nom: 'Autre' },
      }),
    );
    expect(e.message).toBe('Une autre page utilise déjà cette adresse.');
  });
});

describe('formulaire du site → Mes demandes', () => {
  const sf = () => ({
    ...s(),
    auth: getAuth(appAdmin()),
    notifier: async () => ({ ignores: {} }),
    versionLegale: '2026-09',
  });
  const valeurs = {
    nom: 'Claire Martin',
    telephone: '06 12 34 56 78',
    email: 'claire.site@test.local',
    codePostal: '33700',
  };
  beforeEach(async () => {
    await creerSite(s(), proprio, { sousDomaine: 'bertrand', initial: initial() });
    await publierSite(s(), proprio);
  });

  it('SITE-12 : anti-robot refusé → aucune demande', async () => {
    expect(
      (
        await erreur(
          envoyerFormulaireSite(sf(), {
            siteId: 'a1',
            valeurs,
            turnstileOk: false,
            page: '/',
            trace: {},
          }),
        )
      ).code,
    ).toBe('PERMISSION_REFUSEE');
    expect((await db.collection('demandes').get()).size).toBe(0);
  });

  it('SITE-13 : site gratuit, champ supplémentaire rejeté par l’API', async () => {
    expect(
      (
        await erreur(
          envoyerFormulaireSite(sf(), {
            siteId: 'a1',
            valeurs: { ...valeurs, budget: '5000' },
            turnstileOk: true,
            page: '/',
            trace: {},
          }),
        )
      ).code,
    ).toBe('ENTREE_INVALIDE');
    expect((await db.collection('demandes').get()).size).toBe(0);
  });

  it('SITE-03 : demande attribuée directement à l’artisan, hors matching', async () => {
    const { demandeId } = await envoyerFormulaireSite(sf(), {
      siteId: 'a1',
      valeurs,
      turnstileOk: true,
      page: '/',
      trace: {},
    });
    const d = (await db.doc(chemins.demande(demandeId)).get()).data()!;
    expect(d).toMatchObject({
      source: 'site_artisan',
      statut: 'attribuee',
      artisanCibleId: 'a1',
      contact: { prenom: 'Claire', nom: 'Martin', telephone: '+33612345678' },
    });
    expect((await db.doc(chemins.attribution(demandeId, 'a1')).get()).data()).toMatchObject({
      statut: 'acceptee',
      coordonneesDebloquees: true,
    });
  });
});

describe('Mes sections (SITE_INTERNET §4.7)', () => {
  it('enregistrée puis relue et supprimée ; un collaborateur ne peut pas enregistrer', async () => {
    const section = initial().pages.accueil!.sections[0]!;
    const apres = await gererSectionsEnregistrees(s(), proprio, {
      action: 'enregistrer',
      nom: 'Bandeau maison',
      section,
    });
    expect(apres).toEqual([expect.objectContaining({ nom: 'Bandeau maison', section })]);
    expect(
      (
        await erreur(
          gererSectionsEnregistrees(
            s(),
            { artisanId: 'a1', uid: 'c1' },
            {
              action: 'enregistrer',
              nom: 'X',
              section,
            },
          ),
        )
      ).code,
    ).toBe('PERMISSION_REFUSEE');
    const vide = await gererSectionsEnregistrees(s(), proprio, {
      action: 'supprimer',
      id: apres[0]!.id,
    });
    expect(vide).toEqual([]);
  });
});

describe('médiathèque du site', () => {
  it('image absente de Storage : refusée, rien n’est enregistré', async () => {
    const e = await erreur(
      enregistrerMediaSite({ ...s(), bucket: bucketFichiers() }, proprio, {
        nomFichier: 'absente.png',
      }),
    );
    expect(e.code).toBe('INTROUVABLE');
    expect((await db.collection(chemins.mediasSite('a1')).get()).size).toBe(0);
  });
});
