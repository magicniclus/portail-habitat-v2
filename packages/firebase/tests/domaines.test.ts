import { ErreurMetier } from '@ph/core/erreurs';
import { siteParDefaut } from '@ph/core/sites';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import {
  connecterDomaine,
  creerSite,
  domainesAVerifier,
  lireSitePublie,
  publierSite,
  retirerDomaine,
  verifierDomaineSite,
  type ServicesDomaines,
} from '../src/serveur/sites';
import { synchroniserOffreSite } from '../src/serveur/sites/offre';

// DOMAINES.md §8 : DOM-04, DOM-06 (échec après 72 h), DOM-07, DOM-08 ; domaine unique (§6).
let db: Firestore;
let horloge = Date.UTC(2026, 9, 14, 10);
let dnsActuel: Record<string, string[]> = {};
let servi = true;
const envois: { modele: string }[] = [];
const ajoutes: string[] = [];
const s = (): ServicesDomaines => ({
  db,
  horloge: () => horloge,
  domaineBase: 'portailhabitat.fr',
  jeton: () => 'a'.repeat(24),
  notifier: async (e) => void envois.push(e),
  hebergeur: {
    ajouterDomaine: async (nom) => {
      ajoutes.push(nom);
      return { apex: ['203.0.113.7'], cname: 'cname.hebergeur.test.', verifications: [] };
    },
    verifierDomaine: async () => servi,
    retirerDomaine: async () => undefined,
  },
  dns: { resoudre: async (type, nom) => dnsActuel[`${type} ${nom}`] ?? [] },
});
const proprio = { artisanId: 'a1', uid: 'p1' };
const PALETTE = {
  primaire: 'primaire',
  accent: 'accent',
  clair: 'clair',
  sombre: 'sombre',
} as const;

async function erreur(p: Promise<unknown>): Promise<ErreurMetier> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErreurMetier) return e;
    throw e;
  }
  throw new Error('Aucune erreur levée');
}

const DNS_OK = {
  'A exemple.fr': ['203.0.113.7'],
  'CNAME www.exemple.fr': ['cname.hebergeur.test.'],
  'TXT _portailhabitat.exemple.fr': [`ph-verif=${'a'.repeat(24)}`],
};
const domaine = async () => (await db.doc(chemins.site('a1')).get()).get('domaine');

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  horloge = Date.UTC(2026, 9, 14, 10);
  dnsActuel = {};
  servi = true;
  envois.length = 0;
  ajoutes.length = 0;
  await Promise.all([
    db.doc(chemins.membre('a1', 'p1')).set({ role: 'proprietaire', statut: 'actif' }),
    db.doc(chemins.membre('a2', 'p2')).set({ role: 'proprietaire', statut: 'actif' }),
    db.doc(chemins.artisan('a1')).set({ proprietaireUid: 'p1', nomCommercial: 'Bertrand' }),
  ]);
  await creerSite(s(), proprio, {
    sousDomaine: 'bertrand',
    initial: siteParDefaut(
      { nomCommercial: 'Bertrand', metier: 'Plombier', ville: 'Bordeaux', photos: [] },
      PALETTE,
    ),
  });
  await publierSite(s(), proprio);
});

describe('connexion d’un domaine existant (cas C)', () => {
  it('réservée à Site Pro ; domaine invalide refusé', async () => {
    expect((await erreur(connecterDomaine(s(), proprio, 'exemple.fr'))).code).toBe('PRECONDITION');
    await synchroniserOffreSite(db, 'a1', true);
    expect((await erreur(connecterDomaine(s(), proprio, 'pas un domaine'))).code).toBe(
      'ENTREE_INVALIDE',
    );
    expect(ajoutes).toEqual([]);
  });

  it('DOM-04 : chaque ligne jugée seule ; valeur erronée → incorrect + valeur trouvée', async () => {
    await synchroniserOffreSite(db, 'a1', true);
    await connecterDomaine(s(), proprio, 'https://www.Exemple.fr/');
    const d = await domaine();
    expect(d).toMatchObject({ nom: 'exemple.fr', statut: 'attente_dns', principal: 'www' });
    expect(d.enregistrements.map((e: { type: string }) => e.type)).toEqual(['A', 'CNAME', 'TXT']);
    // DOM-08 : aucun MX demandé.
    expect(JSON.stringify(d)).not.toContain('MX');

    dnsActuel = {
      ...DNS_OK,
      'A exemple.fr': ['198.51.100.1'],
      'TXT _portailhabitat.exemple.fr': [],
    };
    expect(await verifierDomaineSite(s(), 'a1')).toBe('attente_dns');
    const e = (await domaine()).enregistrements;
    expect(e.map((x: { etat: string }) => x.etat)).toEqual(['incorrect', 'ok', 'en_attente']);
    expect(e[0].trouve).toBe('198.51.100.1');
    expect(await lireSitePublie(db, 'www.exemple.fr')).toBeNull();
  });

  it('tout correct → actif, servi sur le domaine et www, email ; l’adresse gratuite reste', async () => {
    await synchroniserOffreSite(db, 'a1', true);
    await connecterDomaine(s(), proprio, 'exemple.fr');
    dnsActuel = DNS_OK;
    expect(await verifierDomaineSite(s(), 'a1')).toBe('actif');
    expect((await domaine()).prochaineVerifLe).toBeUndefined();
    expect((await lireSitePublie(db, 'www.exemple.fr'))?.siteId).toBe('a1');
    expect((await lireSitePublie(db, 'exemple.fr'))?.siteId).toBe('a1');
    expect((await lireSitePublie(db, 'bertrand.portailhabitat.fr'))?.siteId).toBe('a1');
    expect(envois.map((e) => e.modele)).toEqual(['site-domaine-actif']);
    expect(await domainesAVerifier(s())).toEqual([]);
  });

  it('un domaine actif sur un autre site est refusé sans révéler lequel', async () => {
    await db.doc(chemins.domaineSite('exemple.fr')).set({ schemaVersion: 1, siteId: 'a2' });
    await synchroniserOffreSite(db, 'a1', true);
    const e = await erreur(connecterDomaine(s(), proprio, 'exemple.fr'));
    expect(e.code).toBe('CONFLIT');
    expect(e.message).not.toContain('a2');
  });

  it('72 h sans enregistrements → échec et email ; « Vérifier maintenant » limité à 1 / 30 s', async () => {
    await synchroniserOffreSite(db, 'a1', true);
    await connecterDomaine(s(), proprio, 'exemple.fr');
    expect(await domainesAVerifier(s())).toEqual(['a1']);
    await verifierDomaineSite(s(), 'a1', { manuel: true });
    expect((await erreur(verifierDomaineSite(s(), 'a1', { manuel: true }))).code).toBe(
      'TROP_DE_REQUETES',
    );
    horloge += 73 * 3_600_000;
    expect(await verifierDomaineSite(s(), 'a1')).toBe('echec');
    expect(envois.map((e) => e.modele)).toEqual(['site-domaine-echec']);
    expect(await domainesAVerifier(s())).toEqual([]);
  });
});

describe('fin du domaine', () => {
  it('DOM-07 : résiliation Site Pro → le site repasse sur le sous-domaine', async () => {
    await synchroniserOffreSite(db, 'a1', true);
    await connecterDomaine(s(), proprio, 'exemple.fr');
    dnsActuel = DNS_OK;
    await verifierDomaineSite(s(), 'a1');
    await synchroniserOffreSite(db, 'a1', false);
    expect(await lireSitePublie(db, 'www.exemple.fr')).toBeNull();
    expect((await lireSitePublie(db, 'bertrand.portailhabitat.fr'))?.siteId).toBe('a1');
    expect((await domaine()).statut).toBe('resilie');
  });

  it('retrait par l’artisan : index supprimés, domaine oublié', async () => {
    await synchroniserOffreSite(db, 'a1', true);
    await connecterDomaine(s(), proprio, 'exemple.fr');
    dnsActuel = DNS_OK;
    await verifierDomaineSite(s(), 'a1');
    await retirerDomaine(s(), proprio);
    expect(await lireSitePublie(db, 'exemple.fr')).toBeNull();
    expect(await domaine()).toBeUndefined();
  });
});
