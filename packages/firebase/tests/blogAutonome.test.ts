import { ErreurMetier } from '@ph/core/erreurs';
import { droitsDe } from '@ph/core/paiements';
import { siteParDefaut } from '@ph/core/sites';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import type { Notification } from '../src/serveur/comptes/services';
import {
  agirSurArticles,
  articleEnUnClic,
  enregistrerArticle,
  lireArticle,
  lirePilote,
  lireValidationPilote,
  preparerArticlesPilote,
  publierArticlesPlanifies,
  reglerPilote,
  remplacerSujetPilote,
  validerArticlePilote,
} from '../src/serveur/blog';
import type { AppelIa, ReponseIa } from '../src/serveur/ia';
import { creerSite } from '../src/serveur/sites';

// BLOG §2 bis, D70 : BLOG-10 à BLOG-13 (pilote toujours validé par l'artisan).
let db: Firestore;
let maintenant = Date.UTC(2026, 9, 17, 10);
const JOUR = 86_400_000;
const ctx = { artisanId: 'a1', uid: 'p1' };
const PARAMS = {
  raisonSociale: 'Durand Plomberie SARL',
  adresseSiege: '3 rue des Lilas, 33600 Pessac',
  siret: '73282932000074',
  franchiseTva: false,
  tvaSurDebits: false,
  assuranceDecennale: { assureur: 'SMABTP', contrat: 'D-123', zone: 'France' },
  mediateur: { nom: 'Médiateur du bâtiment', adresse: 'Paris' },
  delaiPaiementJours: 30,
};
const mots = (n: number) => Array.from({ length: n }, () => 'chantier').join(' ');

// Faux modèle : répond selon la consigne envoyée.
const idees = [
  { titre: 'Pompe à chaleur : le guide', motCle: 'pompe à chaleur' },
  { titre: 'Changer sa chaudière gaz', motCle: 'chaudière gaz' },
  { titre: 'Entretenir son poêle', motCle: 'poêle à bois' },
  { titre: 'Ballon thermodynamique', motCle: 'ballon thermodynamique' },
  { titre: 'Radiateurs à inertie', motCle: 'radiateur inertie' },
];
const appels: AppelIa[] = [];
const client = async (a: AppelIa): Promise<ReponseIa> => {
  appels.push(a);
  const d = a.demande;
  const sujet = /Sujet ou mot-clé : .*mot-clé principal : ([^)]+)\)/.exec(d)?.[1] ?? 'chauffage';
  const sortie = d.includes('Propose 5 idées')
    ? { idees }
    : d.includes('Rédige un article complet')
      ? {
          titre: `${sujet} : ce qu’il faut savoir`,
          sousTitre: 'Les questions à se poser avant de lancer vos travaux.',
          meta: 'Court.',
          motCle: sujet,
          corpsHtml: `<p>${sujet} ${mots(40)}</p><h2>Avant</h2><p>${mots(150)}</p><h2>Après</h2><p>${mots(150)}</p>`,
        }
      : d.includes('Choisis la catégorie')
        ? { categorie: 'Chauffage', tags: [] }
        : d.includes('textes alternatifs')
          ? { propositions: ['Chaudière posée par Durand Plomberie'] }
          : { facebook: 'f', instagram: 'i', linkedin: 'l', google: 'g', hashtags: ['#a'] };
  return {
    texte: JSON.stringify(sortie),
    usage: { entree: 10, sortie: 10, cacheEcrit: 0, cacheLu: 0 },
    refus: false,
  };
};
const envois: Notification[] = [];
const s = () => ({
  db,
  horloge: () => maintenant,
  client,
  notifier: async (n: Notification) => void envois.push(n),
  jeton: () => 'jeton-du-pilote-123456789',
});

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
  maintenant = Date.UTC(2026, 9, 17, 10);
  appels.length = 0;
  envois.length = 0;
  await db.doc(chemins.membre('a1', 'p1')).set({ role: 'proprietaire', statut: 'actif' });
  await db.doc(chemins.artisan('a1')).set({
    droits: droitsDe('site_pro'),
    proprietaireUid: 'p1',
    nomCommercial: 'Durand',
  });
  await db.doc(chemins.parametresFacturation('a1')).set(PARAMS);
  await creerSite({ db, horloge: () => maintenant, domaineBase: 'portailtravaux.fr' }, ctx, {
    sousDomaine: 'site-a1',
    initial: siteParDefaut(
      { nomCommercial: 'Durand', metier: 'Plombier', ville: 'Pessac', photos: [] },
      { primaire: 'primaire', accent: 'accent', clair: 'clair', sombre: 'sombre' },
    ),
  });
  // Un article publié sur « pompe à chaleur » : ce mot-clé est déjà pris.
  const a = await enregistrerArticle(s(), ctx, {
    titre: 'Pompe à chaleur à Pessac : prix et aides',
    sousTitre: '',
    corpsHtml: `<p>La pompe à chaleur ${mots(30)}</p>`,
    image: { src: '', alt: 'Pompe à chaleur posée à Pessac' },
    meta: 'Combien coûte une pompe à chaleur à Pessac ? Prix posés, aides et conseils pour choisir votre installateur. Devis gratuit et rapide.',
    motCle: 'pompe à chaleur',
    motsSecondaires: [],
    categorieId: '',
    tags: [],
  });
  await db.doc(chemins.articleBlog('a1', a.articleId)).update({ categorieId: 'c0' });
  await agirSurArticles(s(), ctx, { ids: [a.articleId], action: 'publier' });
});

const compteur = async () =>
  ((await db.doc(chemins.compteurIaSite('a1', '2026-10')).get()).get('blogArticles') as
    number | undefined) ?? 0;

describe('article en un clic (BLOG §2 bis)', () => {
  it('BLOG-10 : sans sujet, mot-clé neuf, 0 point bloquant, 3 liens internes, brouillon', async () => {
    const r = await articleEnUnClic(s(), ctx, { fin: 'relire' });
    expect(r.motCle).toBe('chaudière gaz');
    expect(r.statut).toBe('brouillon');
    expect(r.seo.bloquants).toEqual([]);
    const a = (await lireArticle(db, 'a1', r.articleId))!;
    expect(a.corpsHtml.match(/href="\//g)?.length).toBeGreaterThanOrEqual(3);
    expect(a.titre.toLowerCase()).toContain('chaudière gaz');
    expect(a.meta.length).toBeGreaterThanOrEqual(120);
    expect(a.categorieId).toBeTruthy();
    expect(a.genereParIA).toBe(true);
    expect(
      (await db.doc(chemins.articleBlog('a1', r.articleId)).get()).get('postsReseaux'),
    ).toMatchObject({ facebook: 'f' });
    expect(await compteur()).toBe(1);
  });

  it('BLOG-11 : « Planifier seul » → planifié ; jamais publié directement', async () => {
    const r = await articleEnUnClic(s(), ctx, { sujet: 'radiateur électrique', fin: 'planifier' });
    expect(r.statut).toBe('planifie');
    expect(r.datePublication! - maintenant).toBeGreaterThan(6 * JOUR);
    const a = (await lireArticle(db, 'a1', r.articleId))!;
    expect(a.statut).toBe('planifie');
  });
});

describe('pilote automatique (D70 : toujours « Je valide d’abord »)', () => {
  it('BLOG-13 : 2 par semaine refusé en Site Pro ; 1 par semaine : date et 3 sujets neufs', async () => {
    expect((await erreur(reglerPilote(s(), ctx, { actif: true, rythme: '2_semaine' }))).code).toBe(
      'PERMISSION_REFUSEE',
    );
    const p = await reglerPilote(s(), ctx, { actif: true, rythme: '1_semaine' });
    expect(p.prochaineLe! - maintenant).toBeGreaterThanOrEqual(3 * JOUR);
    expect(p.sujets.map((x) => x.motCle)).toEqual([
      'chaudière gaz',
      'poêle à bois',
      'ballon thermodynamique',
    ]);
    const r = await remplacerSujetPilote(s(), ctx, { index: 1 });
    expect(r.sujets[1]!.motCle).toBe('radiateur inertie');
  });

  it('BLOG-12 : email 48 h avant ; sans clic jamais publié ; le lien valide une seule fois', async () => {
    const p = await reglerPilote(s(), ctx, { actif: true, rythme: '1_semaine' });
    maintenant = p.prochaineLe! - 47 * 3_600_000;
    expect(await preparerArticlesPilote(s())).toEqual({ prepares: 1, echecs: 0 });
    const envoi = envois.find((e) => e.modele === 'blog-a-valider')!;
    const lienValider = (envoi.secrets as { lienValider: string }).lienValider;
    expect(lienValider).toMatch(/^\/pro\/blog-valider\/a1\./);
    const lien = lienValider.replace('/pro/blog-valider/', '');
    const articleId = lien.split('.')[1]!;
    const avant = (await db.doc(chemins.articleBlog('a1', articleId)).get()).data()!;
    expect(avant).toMatchObject({ statut: 'brouillon', motCle: 'chaudière gaz' });
    expect(avant.pilote.jetonHash).not.toContain('jeton');
    // Le pilote passe à la date suivante, le sujet utilisé quitte la liste.
    const suite = await lirePilote(s(), 'a1');
    expect(suite.prochaineLe! - p.prochaineLe!).toBe(7 * JOUR);
    expect(suite.sujets.map((x) => x.motCle)).not.toContain('chaudière gaz');
    // Rien de neuf à préparer tout de suite.
    expect(await preparerArticlesPilote(s())).toEqual({ prepares: 0, echecs: 0 });

    // Sans clic : la date passe, l'article reste un brouillon.
    maintenant = p.prochaineLe! + JOUR;
    await publierArticlesPlanifies(db, maintenant);
    expect((await lireArticle(db, 'a1', articleId))!.statut).toBe('brouillon');

    expect(await lireValidationPilote(s(), `a1.${articleId}.mauvais`)).toEqual({
      etat: 'invalide',
    });
    expect(await lireValidationPilote(s(), lien)).toMatchObject({
      etat: 'a_valider',
      aCorriger: [],
    });
    // Clic après la date prévue : publié tout de suite.
    expect(await validerArticlePilote(s(), lien)).toMatchObject({ statut: 'publie' });
    expect((await lireArticle(db, 'a1', articleId))!.statut).toBe('publie');
    expect((await erreur(validerArticlePilote(s(), lien))).code).toBe('CONFLIT');
    expect((await erreur(validerArticlePilote(s(), `a1.${articleId}.faux`))).code).toBe(
      'INTROUVABLE',
    );
  });

  it('clic avant la date : planifié à la date prévue ; pilote coupé : rien n’est préparé', async () => {
    const p = await reglerPilote(s(), ctx, { actif: true, rythme: '2_mois' });
    maintenant = p.prochaineLe! - 40 * 3_600_000;
    await preparerArticlesPilote(s());
    const lien = (envois[0]!.secrets as { lienValider: string }).lienValider.replace(
      '/pro/blog-valider/',
      '',
    );
    const r = await validerArticlePilote(s(), lien);
    expect(r).toEqual({ statut: 'planifie', date: p.prochaineLe });
    await reglerPilote(s(), ctx, { actif: false, rythme: '2_mois' });
    await db
      .doc(chemins.piloteBlog('a1'))
      .update({ prochaineLe: Timestamp.fromMillis(maintenant) });
    expect(await preparerArticlesPilote(s())).toEqual({ prepares: 0, echecs: 0 });
  });
});
