import { nouvellePage } from '@ph/core/pages-secteur';
import type { TexteSecteur } from '@ph/core/schemas';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import { pageSecteur } from '@ph/core/schemas';
import { depot } from '../src/serveur/depot';
import type { ClientIa } from '../src/serveur/ia/client';
import { viderCacheReferentiel } from '../src/serveur/matching/lecture';
import {
  BUDGET_SECTEUR_CENTIMES,
  lirePageSecteur,
  pagesSansTexte,
  redigerTextePage,
  type RechercheWeb,
} from '../src/serveur/pagesSecteur';

const T = Date.UTC(2026, 10, 24, 10);
const INSEE = 'https://www.insee.fr/fr/statistiques/2011101?geo=COM-33119';
let db: Firestore;

const CENON = {
  nom: 'Cenon',
  slug: 'cenon',
  codePostal: '33150',
  departement: '33',
  population: 24_000,
  centre: { latitude: 44.857, longitude: -0.531 },
};

const TEXTE: TexteSecteur = {
  intro:
    'Vous cherchez un plombier à Cenon ? Sur les hauteurs de la rive droite, la commune mêle maisons de ville anciennes et résidences récentes : les besoins en plomberie y sont variés, de la rénovation de salle de bains au remplacement de chauffe-eau.',
  sections: [
    {
      titre: 'Les travaux de plomberie fréquents à Cenon',
      paragraphes: [
        'Dans les maisons anciennes, les canalisations en plomb ou en acier galvanisé sont souvent à remplacer. Les appartements récents demandent surtout des dépannages et le remplacement des équipements.',
      ],
    },
    {
      titre: 'Choisir un plombier près de Cenon',
      paragraphes: [
        'Comparez les fiches des artisans du secteur, leurs réalisations et leurs avis vérifiés. Demandez au moins deux devis détaillés pour un même projet, avec les mêmes prestations.',
      ],
    },
    {
      titre: 'Le parc de logements de la commune',
      paragraphes: [
        'La commune compte 24000 habitants. Une part importante des logements date d’avant 1975, selon les données publiques de l’Insee.',
      ],
    },
  ],
  faq: [
    {
      q: 'Comment trouver un plombier à Cenon ?',
      r: 'Comparez les fiches des plombiers du secteur et contactez-les gratuitement.',
    },
    {
      q: 'Le contact est-il gratuit ?',
      r: 'Oui, contacter un artisan ou demander un devis est gratuit et sans engagement.',
    },
    {
      q: 'Faut-il plusieurs devis ?',
      r: 'Oui, comparer au moins deux devis détaillés aide à choisir au juste prix.',
    },
    {
      q: 'Les artisans sont-ils vérifiés ?',
      r: 'Oui, leur SIRET est contrôlé et les avis affichés sont vérifiés.',
    },
  ],
  faits: [
    { texte: 'Une part importante des logements de Cenon date d’avant 1975.', source: INSEE },
  ],
};

const usage = { entree: 2_000, sortie: 1_500, cacheEcrit: 0, cacheLu: 0 };
const recherche: RechercheWeb = async () => ({
  faits: TEXTE.faits,
  urls: [INSEE],
  usage,
  recherches: 3,
});
const client =
  (t: unknown): ClientIa =>
  async () => ({ texte: JSON.stringify(t), usage, refus: false });

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  viderCacheReferentiel();
  await db
    .doc(`${chemins.metiersRecherche()}/plombier`)
    .set({ nom: 'Plombier', famille: 'plomberie' });
  await db
    .doc(`${chemins.prestationsItems()}/chauffe-eau`)
    .set({ nom: 'Remplacement de chauffe-eau', famille: 'plomberie' });
});

async function creerPage(id: string, nb = 2) {
  const p = nouvellePage(
    'plombier',
    { ...CENON, slug: id.split('__')[1]! },
    nb,
    new Date(T - 86_400_000),
  );
  await depot(db, collections.pagesSecteur, pageSecteur).ecrire(id, p);
}

const ctx = (t: unknown = TEXTE) => ({
  db,
  horloge: () => T,
  client: client(t),
  recherche,
});

describe('texte IA d’une page de secteur', () => {
  it('texte contrôlé et publié ; dépense du mois enregistrée', async () => {
    await creerPage('plombier__cenon');
    expect(await redigerTextePage(ctx(), 'plombier__cenon')).toBe('pret');
    const p = await lirePageSecteur(db, 'plombier__cenon');
    expect(p).toMatchObject({
      texteEtat: 'pret',
      texteModele: 'claude-sonnet-5-5',
      texteEssais: 0,
    });
    expect(p?.texte?.intro).toContain('Cenon');
    const budget = await db.doc(`${collections.iaQuotas}/pagesSecteur_2026-11`).get();
    expect(budget.get('coutCentimes')).toBeGreaterThan(0);
    // Texte frais : rien n'est refait.
    expect(await redigerTextePage(ctx(), 'plombier__cenon')).toBe('ignoree');
  });

  it('chiffre inventé : texte refusé, page gardée avec son texte de données', async () => {
    await creerPage('plombier__cenon');
    const faux = structuredClone(TEXTE);
    faux.sections[0]!.paragraphes[0] += ' Un dépannage coûte 180 € en moyenne.';
    expect(await redigerTextePage(ctx(faux), 'plombier__cenon')).toBe('echec');
    const p = await lirePageSecteur(db, 'plombier__cenon');
    expect(p).toMatchObject({ texteEtat: 'echec', texteEssais: 1 });
    expect(p?.texteErreur).toMatch(/180/);
    expect(p?.texte).toBeUndefined();
  });

  it('fait dont la source n’a pas été trouvée par la recherche : refusé', async () => {
    await creerPage('plombier__cenon');
    const faux = structuredClone(TEXTE);
    faux.faits[0]!.source = 'https://www.insee.fr/autre-page';
    expect(await redigerTextePage(ctx(faux), 'plombier__cenon')).toBe('echec');
    expect((await lirePageSecteur(db, 'plombier__cenon'))?.texteErreur).toMatch(/sans source/);
  });

  it('deux pages du même métier presque identiques : la seconde est refusée', async () => {
    await creerPage('plombier__cenon');
    await creerPage('plombier__lormont');
    await redigerTextePage(ctx(), 'plombier__cenon');
    const copie = structuredClone(TEXTE);
    copie.intro = copie.intro.replace('Cenon', 'Lormont');
    // La ville attendue est celle de la page (Cenon dans ce jeu de test) : seule la copie échoue.
    expect(await redigerTextePage(ctx(copie), 'plombier__lormont')).toBe('echec');
    expect((await lirePageSecteur(db, 'plombier__lormont'))?.texteErreur).toMatch(/trop proche/);
  });

  it('page sans artisan, budget du mois atteint, réponse illisible ou déclinée', async () => {
    await creerPage('plombier__cenon', 0);
    expect(await redigerTextePage(ctx(), 'plombier__cenon')).toBe('ignoree');
    await creerPage('plombier__cenon');
    await db
      .doc(`${collections.iaQuotas}/pagesSecteur_2026-11`)
      .set({ coutCentimes: BUDGET_SECTEUR_CENTIMES });
    expect(await redigerTextePage(ctx(), 'plombier__cenon')).toBe('budget');
    await db.doc(`${collections.iaQuotas}/pagesSecteur_2026-11`).delete();
    expect(await redigerTextePage(ctx({ intro: 'trop court' }), 'plombier__cenon')).toBe('echec');
    const refus: ClientIa = async () => ({ texte: '', usage, refus: true });
    await creerPage('plombier__cenon');
    expect(await redigerTextePage({ ...ctx(), client: refus }, 'plombier__cenon')).toBe('echec');
    expect(await redigerTextePage(ctx(), 'inconnue__x')).toBe('ignoree');
  });

  it('deux déclencheurs en même temps : une seule rédaction ; pages en attente de texte listées', async () => {
    await creerPage('plombier__cenon');
    let appels = 0;
    const compteur: ClientIa = async (a) => {
      appels++;
      return client(TEXTE)(a);
    };
    const r = await Promise.all([
      redigerTextePage({ ...ctx(), client: compteur }, 'plombier__cenon'),
      redigerTextePage({ ...ctx(), client: compteur }, 'plombier__cenon'),
    ]);
    expect(r.sort()).toEqual(['ignoree', 'pret']);
    expect(appels).toBe(1);
    await creerPage('plombier__lormont');
    expect(await pagesSansTexte(db)).toEqual(['plombier__lormont']);
  });
});
