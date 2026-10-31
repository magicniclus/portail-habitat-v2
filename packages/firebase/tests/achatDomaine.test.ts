import { ErreurMetier } from '@ph/core/erreurs';
import { siteParDefaut } from '@ph/core/sites';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import {
  avancerDomaine,
  choisirDomaine,
  creerSite,
  rechercherDomaines,
  type RegistrarDomaines,
  type ServicesAchatDomaine,
} from '../src/serveur/sites';
import { synchroniserOffreSite } from '../src/serveur/sites/offre';

/** Vrais avis : le site de départ n'a aucune carte « [à compléter] » et se publie tel quel. */
const avisDeTest = () =>
  Array.from({ length: 4 }, (_, i) => ({ nom: `Client ${i}`, note: 5, texte: 'Parfait.' }));

// DOMAINES §3 et §8 : DOM-02 (rien avant paiement), DOM-03 (au nom de l'entreprise), DOM-07, DOM-08.
let db: Firestore;
let horloge = Date.UTC(2026, 9, 14, 10);
let livraison: 'en_cours' | 'livre' | 'echec' = 'livre';
let dnsActuel: Record<string, string[]> = {};
const envois: { modele: string; secrets?: Record<string, string> }[] = [];
const commandes: { nom: string; organisation: string; siren: string }[] = [];
const zones: { nom: string; lignes: { type: string }[] }[] = [];
const registrar: RegistrarDomaines = {
  fournisseur: 'test',
  disponibilite: async (noms) => noms.map((nom) => ({ nom, libre: !nom.includes('pris') })),
  commander: async (nom, t) => {
    commandes.push({ nom, organisation: t.organisation, siren: t.siren });
    return { commandeId: `c-${nom}` };
  },
  etatCommande: async () => livraison,
  ecrireZone: async (nom, lignes) => void zones.push({ nom, lignes }),
  codeTransfert: async () => 'AUTH-TEST',
};
const s = (): ServicesAchatDomaine => ({
  db,
  horloge: () => horloge,
  domaineBase: 'portailtravaux.fr',
  notifier: async (e) => void envois.push(e as never),
  hebergeur: {
    ajouterDomaine: async () => ({
      apex: ['203.0.113.7'],
      cname: 'cname.hebergeur.test.',
      verifications: [],
    }),
    verifierDomaine: async () => true,
    retirerDomaine: async () => undefined,
  },
  dns: { resoudre: async (type, nom) => dnsActuel[`${type} ${nom}`] ?? [] },
  registrar,
});
const proprio = { artisanId: 'a1', uid: 'p1' };
const FICHE = {
  proprietaireUid: 'p1',
  nomCommercial: 'Bertrand Rénovation',
  raisonSociale: 'Bertrand Rénovation SARL',
  siren: '443061841',
  adresseSiege: { ligne1: '3 rue des Lilas', codePostal: '33000', ville: 'Bordeaux' },
  emailContact: 'contact@bertrand.fr',
  telephonePublic: '+33556123456',
};
const site = async () => (await db.doc(chemins.site('a1')).get()).data()!;

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
  horloge = Date.UTC(2026, 9, 14, 10);
  livraison = 'livre';
  dnsActuel = {};
  envois.length = 0;
  commandes.length = 0;
  zones.length = 0;
  await Promise.all([
    db.doc(chemins.membre('a1', 'p1')).set({ role: 'proprietaire', statut: 'actif' }),
    db.doc(chemins.artisan('a1')).set(FICHE),
  ]);
  await creerSite(s(), proprio, {
    sousDomaine: 'bertrand',
    initial: siteParDefaut(
      {
        nomCommercial: 'Bertrand',
        metier: 'Plombier',
        ville: 'Bordeaux',
        photos: [],
        avis: avisDeTest(),
      },
      { primaire: 'primaire', accent: 'accent', clair: 'clair', sombre: 'sombre' },
    ),
  });
});

describe('achat de domaine (cas B)', () => {
  it('recherche : suggestions depuis le nom commercial, disponibilité, non-membre refusé', async () => {
    const r = await rechercherDomaines(s(), proprio);
    expect(r[0]).toEqual({ nom: 'bertrand-renovation.fr', libre: true });
    expect(r.map((x) => x.nom)).toContain('bertrand-renovation-bordeaux.fr');
    const pris = await rechercherDomaines(s(), proprio, 'deja-pris');
    expect(pris.every((x) => !x.libre)).toBe(true);
    await erreur(rechercherDomaines(s(), { artisanId: 'a1', uid: 'intrus' }));
  });

  it('DOM-02 : sans Site Pro, le domaine est mis de côté et rien n’est commandé', async () => {
    expect(await choisirDomaine(s(), proprio, 'bertrand-renovation.fr')).toEqual({
      paiement: true,
      nom: 'bertrand-renovation.fr',
    });
    const d = await site();
    expect(d.domaineVoulu.nom).toBe('bertrand-renovation.fr');
    expect(d.domaine).toBeUndefined();
    expect(commandes).toEqual([]);
  });

  it('après paiement : commande au nom de l’entreprise, zone A + CNAME, HTTPS, actif', async () => {
    await choisirDomaine(s(), proprio, 'bertrand-renovation.fr');
    await synchroniserOffreSite(db, 'a1', true);
    expect((await site()).domaine).toMatchObject({ statut: 'commande', mode: 'achat' });
    expect((await site()).domaineVoulu).toBeUndefined();

    expect(await avancerDomaine(s(), 'a1')).toBe('commande');
    // DOM-03 : titulaire = raison sociale et SIREN de la fiche.
    expect(commandes).toEqual([
      {
        nom: 'bertrand-renovation.fr',
        organisation: 'Bertrand Rénovation SARL',
        siren: '443061841',
      },
    ]);
    dnsActuel = {
      'A bertrand-renovation.fr': ['203.0.113.7'],
      'CNAME www.bertrand-renovation.fr': ['cname.hebergeur.test.'],
    };
    expect(await avancerDomaine(s(), 'a1')).toBe('actif');
    // DOM-08 : A et CNAME seulement, aucun MX.
    expect(zones[0]!.lignes.map((l) => l.type)).toEqual(['A', 'CNAME']);
    const d = await site();
    expect(d.domaine).toMatchObject({ statut: 'actif', registrar: { etape: 'livre' } });
    expect(
      (await db.doc(chemins.domaineSite('www.bertrand-renovation.fr')).get()).get('siteId'),
    ).toBe('a1');
    expect(envois.map((e) => e.modele)).toContain('site-domaine-actif');
    const j = await db.collection(chemins.journalDomaine('a1')).get();
    expect(j.docs.map((x) => x.get('action')).sort()).toEqual(['choix', 'commande', 'zone']);
  });

  it('avec Site Pro : commande immédiate en un clic', async () => {
    await synchroniserOffreSite(db, 'a1', true);
    expect((await choisirDomaine(s(), proprio, 'bertrand.com')).paiement).toBe(false);
    expect(commandes.map((c) => c.nom)).toEqual(['bertrand.com']);
    // Un second domaine est refusé tant que le premier est en cours.
    expect((await erreur(choisirDomaine(s(), proprio, 'bertrand.eu'))).code).toBe('PRECONDITION');
  });

  it('fiche incomplète, domaine pris ou extension non proposée : refus', async () => {
    expect((await erreur(choisirDomaine(s(), proprio, 'bertrand.net'))).code).toBe(
      'ENTREE_INVALIDE',
    );
    expect((await erreur(choisirDomaine(s(), proprio, 'deja-pris.fr'))).code).toBe('CONFLIT');
    await db.doc(chemins.artisan('a1')).update({ siren: '' });
    const e = await erreur(choisirDomaine(s(), proprio, 'bertrand.fr'));
    expect(e.code).toBe('PRECONDITION');
    expect(e.message).toContain('SIREN');
  });

  it('commande refusée ou non livrée en 48 h : échec', async () => {
    await synchroniserOffreSite(db, 'a1', true);
    await choisirDomaine(s(), proprio, 'bertrand-lent.fr');
    livraison = 'en_cours';
    expect(await avancerDomaine(s(), 'a1')).toBe('commande');
    horloge += 49 * 3600 * 1000;
    expect(await avancerDomaine(s(), 'a1')).toBe('echec');
    expect((await site()).domaine.statut).toBe('echec');
  });

  it('DOM-07 : résiliation → code de transfert envoyé une fois, jamais stocké', async () => {
    await synchroniserOffreSite(db, 'a1', true);
    await choisirDomaine(s(), proprio, 'bertrand-fin.fr');
    await avancerDomaine(s(), 'a1');
    await synchroniserOffreSite(db, 'a1', false);
    expect(await avancerDomaine(s(), 'a1')).toBe('resilie');
    expect(await avancerDomaine(s(), 'a1')).toBe(null);
    const t = envois.filter((e) => e.modele === 'site-domaine-transfert');
    expect(t).toHaveLength(1);
    expect(t[0]!.secrets?.authCode).toBe('AUTH-TEST');
    expect(JSON.stringify(await site())).not.toContain('AUTH-TEST');
  });
});
