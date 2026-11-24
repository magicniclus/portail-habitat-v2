import type { CommuneSecteur, PageSecteur, TexteSecteur } from '../schemas/pagesSecteur';

/**
 * Pages de secteur « métier à une commune » (SEO local, décision du propriétaire du 24/11/2026) :
 * créées pour la commune d'un artisan en ligne et les grandes communes de sa zone ; indexées
 * seulement s'il y a au moins un artisan du métier à 20 km ; texte local rédigé par l'IA, publié
 * seulement s'il passe `controlerTexteSecteur` (aucun chiffre sans source, rien d'invérifiable).
 */
export const RAYON_SECTEUR_KM = 20;
export const POPULATION_MIN_VOISINE = 5_000;
export const MAX_COMMUNES_PAR_ARTISAN = 20;
export const ESSAIS_TEXTE_MAX = 3;
const JOUR = 86_400_000;
const DUREE_TEXTE = 365 * JOUR;

export const idPageSecteur = (metier: string, slug: string) => `${metier}__${slug}`;
export function lirePageSecteurId(id: string): { metier: string; slug: string } | null {
  const m = /^([a-z0-9-]+)__([a-z0-9-]+)$/.exec(id);
  return m ? { metier: m[1]!, slug: m[2]! } : null;
}

export type CommuneCandidate = CommuneSecteur & { distanceKm: number };

/** Commune de l'artisan, puis les communes d'au moins 5 000 habitants de son rayon (20 au total). */
export function communesDeLArtisan(
  siege: CommuneSecteur | null,
  voisines: readonly CommuneCandidate[],
  rayonKm: number,
): CommuneSecteur[] {
  const grandes = voisines
    .filter(
      (c) =>
        c.slug !== siege?.slug && c.distanceKm <= rayonKm && c.population >= POPULATION_MIN_VOISINE,
    )
    .sort((a, b) => b.population - a.population)
    .map(({ distanceKm: _d, ...c }) => c);
  return [...(siege ? [siege] : []), ...grandes].slice(0, MAX_COMMUNES_PAR_ARTISAN);
}

export function pagesAAssurer(metiers: readonly string[], communes: readonly CommuneSecteur[]) {
  const vus = new Set<string>();
  const r: { id: string; metier: string; commune: CommuneSecteur }[] = [];
  for (const metier of metiers)
    for (const commune of communes) {
      const id = idPageSecteur(metier, commune.slug);
      if (vus.has(id)) continue;
      vus.add(id);
      r.push({ id, metier, commune });
    }
  return r;
}

const estIndexable = (nb: number, bloquee: boolean) => nb >= 1 && !bloquee;

export function nouvellePage(
  metier: string,
  commune: CommuneSecteur,
  nbArtisans: number,
  maintenant: Date,
): PageSecteur {
  return {
    schemaVersion: 1,
    metier,
    commune,
    nbArtisans,
    indexable: estIndexable(nbArtisans, false),
    bloquee: false,
    texteEtat: 'absent',
    texteEssais: 0,
    creeeLe: maintenant,
    majLe: maintenant,
  };
}

/** Champs à écrire après un recomptage ; `null` si rien ne change (COUTS, règle 5). */
export function majCompte(
  page: Pick<PageSecteur, 'nbArtisans' | 'indexable' | 'bloquee'>,
  nbArtisans: number,
  maintenant: Date,
): Pick<PageSecteur, 'nbArtisans' | 'indexable' | 'majLe'> | null {
  const indexable = estIndexable(nbArtisans, page.bloquee);
  if (page.nbArtisans === nbArtisans && page.indexable === indexable) return null;
  return { nbArtisans, indexable, majLe: maintenant };
}

/** Faut-il (re)rédiger le texte local ? Seulement pour une page indexable, sans en abuser. */
export function besoinTexte(page: PageSecteur, maintenant: Date): boolean {
  if (!page.indexable || page.bloquee) return false;
  const t = maintenant.getTime();
  if (page.texteEtat === 'pret')
    return !page.texteGenereLe || t - page.texteGenereLe.getTime() > DUREE_TEXTE;
  if (page.texteEtat === 'echec')
    return page.texteEssais < ESSAIS_TEXTE_MAX && t - page.majLe.getTime() >= JOUR;
  return true;
}

// ——— Contrôle du texte rédigé par l'IA ———

const INTERDITS: [RegExp, string][] = [
  [/\blead/i, 'le mot « lead » est interdit'],
  [
    /\b(meilleure?s?|n°\s?1|numéro un|imbattables?|le moins cher|garantie? à vie|100 ?% satisfait)\b/i,
    'superlatif ou promesse invérifiable',
  ],
  [/★|\d[,.]\d\s*\/\s*5|\bétoiles?\b/i, 'note ou étoiles inventées'],
];

/** Nombres d'un texte (« 24 000 », « 38 % », « 1,5 »), normalisés sans espaces. */
function nombres(texte: string): string[] {
  return [...texte.matchAll(/\d[\d\u00a0\u202f ]*\d|\d/g)]
    .map((m) => m[0].replace(/[\s\u00a0\u202f]/g, ''))
    .filter(Boolean);
}
const estAnnee = (n: string) => /^(1[89]\d\d|20\d\d)$/.test(n);
const estPetit = (n: string) => Number(n) <= 12;

export interface ContexteTexte {
  ville: string;
  metier: string;
  /** Chiffres issus de nos données (population, nombre d'artisans, rayon). */
  nombresConnus: readonly number[];
}

/** Liste des problèmes ; vide si le texte peut être publié. */
export function controlerTexteSecteur(t: TexteSecteur, ctx: ContexteTexte): string[] {
  const corps = [
    t.intro,
    ...t.sections.flatMap((s) => [s.titre, ...s.paragraphes]),
    ...t.faq.flatMap((f) => [f.q, f.r]),
  ];
  const tout = corps.join('\n');
  const problemes: string[] = [];
  if (!t.intro.toLowerCase().includes(ctx.ville.toLowerCase()))
    problemes.push(`l’introduction doit citer ${ctx.ville}`);
  if (!tout.toLowerCase().includes(ctx.metier.toLowerCase()))
    problemes.push(`le texte doit parler de ${ctx.metier.toLowerCase()}`);
  for (const [motif, raison] of INTERDITS) if (motif.test(tout)) problemes.push(raison);

  const sources = new Set(t.faits.flatMap((f) => nombres(f.texte)));
  const connus = new Set(ctx.nombresConnus.map(String));
  const sansSource = [
    ...new Set(
      nombres(tout).filter(
        (n) => !estAnnee(n) && !estPetit(n) && !connus.has(n) && !sources.has(n),
      ),
    ),
  ];
  if (sansSource.length) problemes.push(`chiffres sans source : ${sansSource.join(', ')}`);

  for (const f of t.faits) {
    const u = URL.parse(f.source);
    if (!u || u.protocol !== 'https:' || /portailtravaux/i.test(u.hostname))
      problemes.push(`source refusée : ${f.source}`);
  }
  const mots = tout.split(/\s+/).length;
  if (mots < 150) problemes.push(`texte trop court (${mots} mots)`);
  if (mots > 2_200) problemes.push(`texte trop long (${mots} mots)`);
  return problemes;
}

/** Texte complet d'une page (pour comparer deux pages entre elles). */
export const texteBrut = (t: TexteSecteur) =>
  [t.intro, ...t.sections.flatMap((s) => s.paragraphes), ...t.faq.map((f) => f.r)].join(' ');

/** Ressemblance de deux textes (Jaccard sur les suites de 3 mots), de 0 à 1. */
export function similarite(a: string, b: string): number {
  const suites = (s: string) => {
    const m = s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean);
    return new Set(
      m.slice(0, Math.max(0, m.length - 2)).map((_, i) => m.slice(i, i + 3).join(' ')),
    );
  };
  const [x, y] = [suites(a), suites(b)];
  if (!x.size || !y.size) return 0;
  let commun = 0;
  for (const s of x) if (y.has(s)) commun++;
  return commun / (x.size + y.size - commun);
}
/** Au-delà, deux pages se ressemblent trop (contenu dupliqué) : le texte est refusé. */
export const SIMILARITE_MAX = 0.35;
