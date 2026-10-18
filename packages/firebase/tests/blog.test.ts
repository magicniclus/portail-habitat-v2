import { ErreurMetier } from '@ph/core/erreurs';
import { droitsDe } from '@ph/core/paiements';
import { siteParDefaut } from '@ph/core/sites';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import {
  agirSurArticles,
  articleParAdresse,
  demanderIaBlog,
  articlesPublies,
  enregistrerArticle,
  gererCategorie,
  gererTag,
  lireArticle,
  lireClassement,
  listerArticles,
  publierArticlesPlanifies,
  viderCorbeilleBlog,
  type EntreeArticle,
} from '../src/serveur/blog';
import type { AppelIa, ReponseIa } from '../src/serveur/ia';
import { creerSite } from '../src/serveur/sites';

// BLOG.md §8 : BLOG-01, 04, 05, 06, 07, 09 (02, 03, 14 : IA, tranche 3 ; 08 : export CSV du cœur).
let db: Firestore;
let maintenant = Date.UTC(2026, 9, 16, 10);
const s = () => ({ db, horloge: () => maintenant });
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
let categorie = '';
const article = (p: Partial<EntreeArticle> = {}): EntreeArticle => ({
  titre: 'Pompe à chaleur à Pessac : prix et aides',
  sousTitre: 'Ce qu’il faut savoir',
  corpsHtml: `<p>La pompe à chaleur ${mots(30)}</p><h2>Prix</h2><p>${mots(150)}</p>`,
  image: { src: '', alt: 'Pompe à chaleur posée à Pessac' },
  meta: 'Combien coûte une pompe à chaleur à Pessac ? Prix posés, aides et conseils pour choisir votre installateur. Devis gratuit et rapide.',
  motCle: 'pompe à chaleur',
  motsSecondaires: [],
  categorieId: categorie,
  tags: [],
  ...p,
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

async function preparer(aid: string, uid: string, formule: 'site_pro' | 'gratuit' = 'site_pro') {
  await db.doc(chemins.membre(aid, uid)).set({ role: 'proprietaire', statut: 'actif' });
  await db.doc(chemins.artisan(aid)).set({ droits: droitsDe(formule) });
  await db.doc(chemins.parametresFacturation(aid)).set(PARAMS);
  const initial = siteParDefaut(
    { nomCommercial: 'Durand', metier: 'Plombier', ville: 'Pessac', photos: [] },
    { primaire: 'primaire', accent: 'accent', clair: 'clair', sombre: 'sombre' },
  );
  await creerSite(
    { ...s(), domaineBase: 'portailtravaux.fr' },
    { artisanId: aid, uid },
    { sousDomaine: `site-${aid}`, initial },
  );
}

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  maintenant = Date.UTC(2026, 9, 16, 10);
  await preparer('a1', 'p1');
  categorie = (await gererCategorie(s(), ctx, { action: 'creer', nom: 'Chauffage' })).id!;
});

describe('blog des artisans', () => {
  it('BLOG-01 : sans Site Pro, rien n’est créé', async () => {
    await db.doc(chemins.artisan('a1')).set({ droits: droitsDe('fiche_pro') });
    const e = await erreur(enregistrerArticle(s(), ctx, article()));
    expect(e.code).toBe('PERMISSION_REFUSEE');
    expect(await listerArticles(db, 'a1')).toEqual([]);
  });

  it('BLOG-09 : script, iframe et onclick supprimés à l’enregistrement', async () => {
    const { articleId } = await enregistrerArticle(
      s(),
      ctx,
      article({
        corpsHtml:
          '<p onclick="x()">Bonjour<script>alert(1)</script></p><iframe src="https://x"></iframe>',
      }),
    );
    expect((await lireArticle(db, 'a1', articleId))!.corpsHtml).toBe('<p>Bonjour</p>');
  });

  it('adresse : suit le titre, unique ; après publication, l’ancienne adresse redirige (301)', async () => {
    const a = await enregistrerArticle(s(), ctx, article());
    const b = await enregistrerArticle(s(), ctx, article());
    expect(a.slug).toBe('pompe-a-chaleur-a-pessac-prix-et-aides');
    expect(b.slug).toBe('pompe-a-chaleur-a-pessac-prix-et-aides-2');
    await agirSurArticles(s(), ctx, { ids: [a.articleId], action: 'publier' });
    const r = await enregistrerArticle(
      s(),
      ctx,
      article({ articleId: a.articleId, titre: 'Pompe à chaleur : le guide des aides' }),
    );
    expect(r.slug).toBe('pompe-a-chaleur-le-guide-des-aides');
    expect(await articleParAdresse(db, 'a1', a.slug)).toEqual({ redirection: r.slug });
    expect(await articleParAdresse(db, 'a1', r.slug)).toMatchObject({
      article: { id: a.articleId },
    });
    const e = await erreur(enregistrerArticle(s(), ctx, article({ slug: a.slug })));
    expect(e.code).toBe('CONFLIT');
  });

  it('BLOG-04 : méta vide → publier et planifier refusés ; publication groupée partielle', async () => {
    const vide = await enregistrerArticle(s(), ctx, article({ meta: '' }));
    const ok = await enregistrerArticle(s(), ctx, article());
    expect(vide.seo.bloquants.map((b) => b.cle)).toEqual(['meta']);
    const r = await agirSurArticles(s(), ctx, {
      ids: [vide.articleId, ok.articleId],
      action: 'publier',
    });
    expect(r.faits).toEqual([ok.articleId]);
    expect(r.refuses[0]).toMatchObject({ id: vide.articleId });
    expect(r.refuses[0]!.raison).toMatch(/méta-description/);
    const p = await agirSurArticles(s(), ctx, {
      ids: [vide.articleId],
      action: 'planifier',
      date: maintenant + 86_400_000,
    });
    expect(p.faits).toEqual([]);
    // Article en ligne : impossible de l'enregistrer avec un point bloquant.
    const e = await erreur(
      enregistrerArticle(s(), ctx, article({ articleId: ok.articleId, meta: '' })),
    );
    expect(e.code).toBe('PRECONDITION');
  });

  it('BLOG-05 : mentions lues en direct depuis Devis & factures', async () => {
    await db.doc(chemins.parametresFacturation('a1')).update({ assuranceDecennale: null });
    const a = await enregistrerArticle(s(), ctx, article());
    expect(a.seo.bloquants.map((b) => b.cle)).toEqual(['mentions']);
    expect(
      (await agirSurArticles(s(), ctx, { ids: [a.articleId], action: 'publier' })).faits,
    ).toEqual([]);
    await db
      .doc(chemins.parametresFacturation('a1'))
      .update({ assuranceDecennale: PARAMS.assuranceDecennale });
    expect(
      (await agirSurArticles(s(), ctx, { ids: [a.articleId], action: 'publier' })).faits,
    ).toEqual([a.articleId]);
  });

  it('planification : date passée refusée ; la tâche publie à l’heure dite', async () => {
    const a = await enregistrerArticle(s(), ctx, article());
    expect(
      (
        await erreur(
          agirSurArticles(s(), ctx, {
            ids: [a.articleId],
            action: 'planifier',
            date: maintenant - 1,
          }),
        )
      ).code,
    ).toBe('ENTREE_INVALIDE');
    await agirSurArticles(s(), ctx, {
      ids: [a.articleId],
      action: 'planifier',
      date: maintenant + 3_600_000,
    });
    expect(await publierArticlesPlanifies(db, maintenant)).toBe(0);
    expect(await publierArticlesPlanifies(db, maintenant + 3_600_000)).toBe(1);
    expect((await lireArticle(db, 'a1', a.articleId))!.statut).toBe('publie');
  });

  it('corbeille : restaurable, vidée après 30 jours', async () => {
    const a = await enregistrerArticle(s(), ctx, article());
    await agirSurArticles(s(), ctx, { ids: [a.articleId], action: 'corbeille' });
    expect(
      (await erreur(enregistrerArticle(s(), ctx, article({ articleId: a.articleId })))).code,
    ).toBe('PRECONDITION');
    await agirSurArticles(s(), ctx, { ids: [a.articleId], action: 'restaurer' });
    expect((await listerArticles(db, 'a1'))[0]!.supprimeLe).toBeUndefined();
    await agirSurArticles(s(), ctx, { ids: [a.articleId], action: 'corbeille' });
    expect(await viderCorbeilleBlog(db, maintenant + 29 * 86_400_000)).toBe(0);
    expect(await viderCorbeilleBlog(db, maintenant + 31 * 86_400_000)).toBe(1);
    expect(await listerArticles(db, 'a1')).toEqual([]);
  });

  it('BLOG-06 : publié dans « Chauffage », l’article sort dans la liste filtrée sans republication', async () => {
    const autre = (await gererCategorie(s(), ctx, { action: 'creer', nom: 'Salle de bain' })).id!;
    const a = await enregistrerArticle(s(), ctx, article());
    const b = await enregistrerArticle(s(), ctx, article({ categorieId: autre }));
    await agirSurArticles(s(), ctx, { ids: [a.articleId, b.articleId], action: 'publier' });
    expect(
      (await articlesPublies(db, 'a1', { categorieId: categorie, limite: 6 })).map((x) => x.id),
    ).toEqual([a.articleId]);
    expect(await articlesPublies(db, 'a1', { limite: 6 })).toHaveLength(2);
  });

  it('BLOG-07 : les articles d’un artisan n’apparaissent jamais sur le site d’un autre', async () => {
    await preparer('a2', 'p2');
    const a = await enregistrerArticle(s(), ctx, article());
    await agirSurArticles(s(), ctx, { ids: [a.articleId], action: 'publier' });
    expect(await articlesPublies(db, 'a2', { limite: 9 })).toEqual([]);
    expect(await articleParAdresse(db, 'a2', a.slug)).toBeNull();
    // Un autre artisan ne peut pas agir sur les articles de a1.
    const e = await erreur(
      agirSurArticles(
        s(),
        { artisanId: 'a1', uid: 'p2' },
        { ids: [a.articleId], action: 'archiver' },
      ),
    );
    expect(e.code).toBe('PERMISSION_REFUSEE');
  });

  it('catégories : nom unique, ordre, suppression refusée si utilisée ; tags retirés des articles', async () => {
    expect(
      (await erreur(gererCategorie(s(), ctx, { action: 'creer', nom: 'chauffage' }))).code,
    ).toBe('CONFLIT');
    const sdb = (await gererCategorie(s(), ctx, { action: 'creer', nom: 'Salle de bain' })).id!;
    await gererCategorie(s(), ctx, { action: 'ordonner', ids: [sdb, categorie] });
    await gererCategorie(s(), ctx, { action: 'renommer', id: categorie, nom: 'Chauffage et PAC' });
    const c = await lireClassement(db, 'a1');
    expect(c.categories.map((x) => [x.nom, x.slug])).toEqual([
      ['Salle de bain', 'salle-de-bain'],
      ['Chauffage et PAC', 'chauffage-et-pac'],
    ]);
    const tag = (await gererTag(s(), ctx, { action: 'creer', nom: 'Aides' })).id!;
    expect((await gererTag(s(), ctx, { action: 'creer', nom: 'aides' })).id).toBe(tag);
    const a = await enregistrerArticle(s(), ctx, article({ tags: [tag, 'inconnu'] }));
    expect((await lireArticle(db, 'a1', a.articleId))!.tags).toEqual([tag]);
    expect(
      (await erreur(gererCategorie(s(), ctx, { action: 'supprimer', id: categorie }))).code,
    ).toBe('PRECONDITION');
    await gererTag(s(), ctx, { action: 'supprimer', id: tag });
    expect((await lireArticle(db, 'a1', a.articleId))!.tags).toEqual([]);
    await gererCategorie(s(), ctx, { action: 'supprimer', id: sdb });
    expect((await lireClassement(db, 'a1')).categories).toHaveLength(1);
  });

  describe('IA du blog', () => {
    let reponses: (string | Error)[] = [];
    const appels: AppelIa[] = [];
    const client = async (a: AppelIa): Promise<ReponseIa> => {
      appels.push(a);
      const r = reponses.shift() ?? new Error('plus de réponse');
      if (r instanceof Error) throw r;
      return {
        texte: r,
        usage: { entree: 10, sortie: 10, cacheEcrit: 0, cacheLu: 0 },
        refus: false,
      };
    };
    const envois: { modele: string; donnees: Record<string, unknown> }[] = [];
    const si = (avec = true) => ({
      ...s(),
      client: avec ? client : null,
      notifier: async (e: { modele: string; donnees?: Record<string, unknown> }) =>
        void envois.push({ modele: e.modele, donnees: e.donnees ?? {} }),
    });
    const redaction = JSON.stringify({
      titre: 'Pompe à chaleur : prix',
      sousTitre: '',
      meta: 'Tout savoir.',
      motCle: 'pompe à chaleur',
      corpsHtml: '<p>Texte</p>',
    });
    const base = {
      article: { titre: '', meta: '', motCle: '', corps: '' },
      categories: ['Chauffage'],
    };
    const compteur = async () =>
      ((await db.doc(chemins.compteurIaSite('a1', '2026-10')).get()).get('blogArticles') as
        number | undefined) ?? 0;

    beforeEach(async () => {
      reponses = [];
      appels.length = 0;
      envois.length = 0;
      await db
        .doc(chemins.artisan('a1'))
        .update({ proprietaireUid: 'p1', nomCommercial: 'Durand' });
    });

    it('BLOG-02 : Site Pro, 6e rédaction du mois refusée ; retouches toujours possibles (BLOG-03)', async () => {
      for (let i = 0; i < 5; i++) {
        reponses.push(redaction);
        const r = await demanderIaBlog(si(), ctx, { ...base, action: 'rediger', sujet: 'pac' });
        expect(r.restant).toBe(4 - i);
      }
      // Dernier article du quota : un email, avec le lien vers Tout inclus (Site Pro).
      expect(envois.map((x) => x.modele)).toEqual(['blog-quota-atteint']);
      expect(envois[0]!.donnees).toMatchObject({
        max: 5,
        remise: '1er novembre',
        lienOffre: '/pro/abonnement?offre=tout',
      });
      const e = await erreur(demanderIaBlog(si(), ctx, { ...base, action: 'rediger' }));
      expect(e.code).toBe('TROP_DE_REQUETES');
      expect(e.message).toMatch(/5 articles/);
      reponses.push(JSON.stringify({ propositions: ['Titre A', 'Titre B', 'Titre C'] }));
      const t = await demanderIaBlog(si(), ctx, { ...base, action: 'titres' });
      expect(t).toMatchObject({
        action: 'titres',
        sortie: { propositions: ['Titre A', 'Titre B', 'Titre C'] },
      });
      expect(await compteur()).toBe(5);
      expect(appels.filter((a) => a.modele === 'claude-sonnet-5-5')).toHaveLength(5);
    });

    it('BLOG-02 : Tout inclus, 16e rédaction refusée', async () => {
      await db.doc(chemins.artisan('a1')).set({ droits: droitsDe('tout_inclus') });
      await db
        .doc(chemins.compteurIaSite('a1', '2026-10'))
        .set({ schemaVersion: 1, blogArticles: 15 });
      expect(
        (await erreur(demanderIaBlog(si(), ctx, { ...base, action: 'rediger' }))).message,
      ).toMatch(/15 articles/);
      expect(appels).toHaveLength(0);
    });

    it('échec technique : crédit rendu ; sans clé ou sans Site Pro : rien n’est décompté', async () => {
      reponses.push(new Error('panne'));
      await expect(demanderIaBlog(si(), ctx, { ...base, action: 'rediger' })).rejects.toThrow();
      expect(await compteur()).toBe(0);
      expect(
        (await erreur(demanderIaBlog(si(false), ctx, { ...base, action: 'rediger' }))).code,
      ).toBe('INDISPONIBLE');
      await db.doc(chemins.artisan('a1')).set({ droits: droitsDe('fiche_pro') });
      expect((await erreur(demanderIaBlog(si(), ctx, { ...base, action: 'titres' }))).code).toBe(
        'PERMISSION_REFUSEE',
      );
      expect(appels).toHaveLength(1);
      expect(await compteur()).toBe(0);
    });

    it('faits non sourcés remplacés ; modération avant tout appel', async () => {
      reponses.push(
        JSON.stringify({
          titre: 'Pompe à chaleur',
          sousTitre: '',
          meta: 'Certifiés RGE.',
          motCle: 'pac',
          corpsHtml: '<p>Depuis 1998.</p>',
        }),
      );
      const r = await demanderIaBlog(si(), ctx, { ...base, action: 'rediger' });
      expect(r.avertissements).toEqual(expect.arrayContaining(['RGE', '1998']));
      const e = await erreur(
        demanderIaBlog(si(), ctx, {
          ...base,
          action: 'rediger',
          sujet: 'nos concurrents sont des escrocs',
        }),
      );
      expect(e.code).toBe('ENTREE_INVALIDE');
      expect(appels).toHaveLength(1);
    });
  });
});
