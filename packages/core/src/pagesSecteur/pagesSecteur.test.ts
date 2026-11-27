import { describe, expect, it } from 'vitest';
import type { CommuneSecteur, PageSecteur, TexteSecteur } from '../schemas/pagesSecteur';
import {
  besoinTexte,
  communesDeLArtisan,
  controlerTexteSecteur,
  idPageSecteur,
  lirePageSecteurId,
  majCompte,
  nouvellePage,
  pageIndexee,
  pagesAAssurer,
  similarite,
  MAX_COMMUNES_PAR_ARTISAN,
} from './index';

const commune = (
  nom: string,
  population: number,
  distanceKm = 0,
): CommuneSecteur & {
  distanceKm: number;
} => ({
  nom,
  slug: nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-'),
  codePostal: '33000',
  departement: '33',
  population,
  centre: { latitude: 44.8, longitude: -0.57 },
  distanceKm,
});

const T0 = new Date('2026-11-24T10:00:00Z');

describe('identifiant de page', () => {
  it('métier et commune, réversible', () => {
    expect(idPageSecteur('plombier', 'saint-loubes')).toBe('plombier__saint-loubes');
    expect(lirePageSecteurId('plombier__saint-loubes')).toEqual({
      metier: 'plombier',
      slug: 'saint-loubes',
    });
    expect(lirePageSecteurId('mauvais')).toBeNull();
  });
});

describe('communes publiées pour un artisan', () => {
  it('sa commune, puis les communes de 5 000 habitants et plus de son rayon, les plus peuplées d’abord', () => {
    const siege = commune('Carbon-Blanc', 8_000);
    const r = communesDeLArtisan(
      siege,
      [
        commune('Bordeaux', 260_000, 8),
        commune('Petit Village', 900, 3),
        commune('Lormont', 23_000, 4),
        commune('Libourne', 25_000, 28),
        commune('Carbon-Blanc', 8_000, 0),
      ],
      20,
    );
    expect(r.map((c) => c.nom)).toEqual(['Carbon-Blanc', 'Bordeaux', 'Lormont']);
  });

  it('jamais plus de 20 communes, siège compris ; sans siège reconnu, seulement les voisines', () => {
    const voisines = Array.from({ length: 40 }, (_, i) => commune(`Ville ${i}`, 6_000 + i, 5));
    expect(communesDeLArtisan(commune('Siège', 100), voisines, 30)).toHaveLength(
      MAX_COMMUNES_PAR_ARTISAN,
    );
    expect(communesDeLArtisan(commune('Siège', 100), voisines, 30)[0]!.nom).toBe('Siège');
    expect(communesDeLArtisan(null, voisines, 30)[0]!.nom).toBe('Ville 39');
  });

  it('une page par métier et par commune, sans doublon', () => {
    const r = pagesAAssurer(['plombier', 'plombier', 'electricien'], [commune('Cenon', 24_000)]);
    expect(r.map((p) => p.id)).toEqual(['plombier__cenon', 'electricien__cenon']);
  });
});

describe('compte et indexation', () => {
  const base = nouvellePage('plombier', commune('Cenon', 24_000), 0, T0);

  it('nouvelle page : non indexée à 0 artisan, indexée dès 1', () => {
    expect(base.indexable).toBe(false);
    expect(base.texteEtat).toBe('absent');
    expect(nouvellePage('plombier', commune('Cenon', 24_000), 1, T0).indexable).toBe(true);
  });

  it('écrit seulement ce qui change', () => {
    expect(majCompte(base, 0, T0)).toBeNull();
    const T1 = new Date(T0.getTime() + 1000);
    expect(majCompte(base, 2, T1)).toEqual({ nbArtisans: 2, indexable: true, majLe: T1 });
    const avec = { ...base, nbArtisans: 2, indexable: true };
    expect(majCompte(avec, 0, T1)).toEqual({ nbArtisans: 0, indexable: false, majLe: T1 });
  });

  it('page bloquée par l’admin : jamais indexée', () => {
    expect(majCompte({ ...base, bloquee: true }, 3, T0)).toEqual({
      nbArtisans: 3,
      indexable: false,
      majLe: T0,
    });
  });
});

describe('besoin d’un texte IA', () => {
  const p = (x: Partial<PageSecteur>): PageSecteur => ({
    ...nouvellePage('plombier', commune('Cenon', 24_000), 1, T0),
    ...x,
  });
  it('seulement pour une page indexable, non bloquée, sans texte ou au texte vieux d’un an', () => {
    expect(besoinTexte(p({}), T0)).toBe(true);
    expect(besoinTexte(p({ indexable: false, nbArtisans: 0 }), T0)).toBe(false);
    expect(besoinTexte(p({ bloquee: true, indexable: false }), T0)).toBe(false);
    expect(besoinTexte(p({ texteEtat: 'pret', texteGenereLe: T0 }), T0)).toBe(false);
    const unAn = new Date(T0.getTime() + 366 * 86_400_000);
    expect(besoinTexte(p({ texteEtat: 'pret', texteGenereLe: T0 }), unAn)).toBe(true);
  });
  it('après un échec : on réessaie au plus 3 fois, une fois par jour', () => {
    const echec = p({ texteEtat: 'echec', texteEssais: 1, majLe: T0 });
    expect(besoinTexte(echec, new Date(T0.getTime() + 3_600_000))).toBe(false);
    expect(besoinTexte(echec, new Date(T0.getTime() + 25 * 3_600_000))).toBe(true);
    expect(besoinTexte({ ...echec, texteEssais: 3 }, new Date(T0.getTime() + 9e9))).toBe(false);
  });
});

const TEXTE: TexteSecteur = {
  intro:
    'Vous cherchez un plombier à Cenon ? Sur les hauteurs de la rive droite, la commune mêle maisons de ville anciennes et résidences récentes : les besoins en plomberie y sont variés, de la rénovation de salle de bains au remplacement de chauffe-eau.',
  sections: [
    {
      titre: 'Les travaux de plomberie les plus fréquents à Cenon',
      paragraphes: [
        'Dans les maisons construites avant les années 1970, les canalisations en plomb ou en acier galvanisé sont souvent à remplacer. Les appartements récents demandent surtout des dépannages et des remplacements d’équipements.',
      ],
    },
    {
      titre: 'Choisir un plombier près de Cenon',
      paragraphes: [
        'Comparez les fiches des artisans du secteur, leurs réalisations et leurs avis vérifiés. Demandez au moins deux devis détaillés pour un même projet.',
      ],
    },
    {
      titre: 'Le parc de logements de la commune',
      paragraphes: [
        'La commune compte 24 000 habitants. Une part importante des logements date d’avant 1975, selon les données publiques.',
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
    {
      texte: 'Une part importante des logements de Cenon date d’avant 1975.',
      source: 'https://www.insee.fr/fr/statistiques/2011101?geo=COM-33119',
    },
  ],
};
const CTX = { ville: 'Cenon', metier: 'Plombier', nombresConnus: [24_000] };

describe('contrôle du texte IA', () => {
  it('accepte un texte local, sourcé, sans chiffre inventé', () => {
    expect(controlerTexteSecteur(TEXTE, CTX)).toEqual([]);
  });

  it('refuse un chiffre absent des données et des faits sourcés', () => {
    const t = structuredClone(TEXTE);
    t.sections[0]!.paragraphes[0] += ' Un dépannage coûte 180 € en moyenne.';
    expect(controlerTexteSecteur(t, CTX).join(' ')).toMatch(/180/);
  });

  it('accepte un chiffre présent dans un fait sourcé ; les années restent permises', () => {
    const t = structuredClone(TEXTE);
    t.sections[2]!.paragraphes[0] += ' 38 % des logements datent d’avant 1975.';
    expect(controlerTexteSecteur(t, CTX).join(' ')).toMatch(/38/);
    t.faits.push({
      texte: '38 % des résidences principales de Cenon datent d’avant 1975.',
      source: 'https://www.insee.fr/fr/statistiques/2011101?geo=COM-33119',
    });
    expect(controlerTexteSecteur(t, CTX)).toEqual([]);
  });

  it('exige la ville dans l’introduction et le métier dans le texte', () => {
    expect(controlerTexteSecteur(TEXTE, { ...CTX, ville: 'Lormont' }).join(' ')).toMatch(/Lormont/);
    expect(controlerTexteSecteur(TEXTE, { ...CTX, metier: 'Couvreur' }).join(' ')).toMatch(
      /couvreur/i,
    );
  });

  it('refuse « lead », les superlatifs non prouvables et les fausses notes', () => {
    for (const ajout of [
      ' Nos leads sont qualifiés.',
      ' Le meilleur plombier de la ville.',
      ' Note 4,9/5.',
    ]) {
      const t = structuredClone(TEXTE);
      t.intro += ajout;
      expect(controlerTexteSecteur(t, CTX).length, ajout).toBeGreaterThan(0);
    }
  });

  it('refuse une source qui n’est pas en https ou qui renvoie vers notre site', () => {
    const t = structuredClone(TEXTE);
    t.faits[0]!.source = 'https://portailtravaux.fr/metiers';
    expect(controlerTexteSecteur(t, CTX).join(' ')).toMatch(/source/i);
  });
});

describe('similarité entre deux textes', () => {
  it('identiques : 1 ; sans rapport : proche de 0', () => {
    const a = 'les canalisations anciennes des maisons de ville sont souvent à remplacer';
    expect(similarite(a, a)).toBe(1);
    expect(
      similarite(a, 'la toiture en ardoise demande un entretien régulier chaque automne'),
    ).toBeLessThan(0.1);
  });
});

describe('indexation à l’affichage', () => {
  it('registre indexable et au moins un artisan affiché : indexée ; sinon non', () => {
    expect(pageIndexee({ indexable: true }, 2)).toBe(true);
    expect(pageIndexee({ indexable: true }, 0)).toBe(false);
    expect(pageIndexee({ indexable: false }, 3)).toBe(false);
    expect(pageIndexee('absente', 3)).toBe(false);
  });
  it('registre illisible : le compte affiché décide (pas de désindexation par erreur)', () => {
    expect(pageIndexee(null, 1)).toBe(true);
    expect(pageIndexee(null, 0)).toBe(false);
  });
});
