import { z } from '../zod';
import { garderFaits } from '../sites/ia/operations';
import { assainirCorps } from './html';

/**
 * IA du blog (BLOG §2, §3) : seule la rédaction complète consomme un crédit ; les retouches
 * (titres, méta, texte alternatif, classement, idées, textes réseaux) sont illimitées (BLOG-03).
 * Rien n'est enregistré ni publié par l'IA : l'artisan applique la proposition.
 */
export const ACTIONS_IA_BLOG = [
  'rediger',
  'titres',
  'meta',
  'alt',
  'classement',
  'idees',
  'reseaux',
] as const;
export type ActionIaBlog = (typeof ACTIONS_IA_BLOG)[number];

/** D50 ⏳ : Sonnet pour la rédaction, Haiku pour les retouches. */
export const MODELE_IA_BLOG: Record<ActionIaBlog, 'claude-sonnet-5-5' | 'claude-haiku-5-5'> = {
  rediger: 'claude-sonnet-5-5',
  titres: 'claude-haiku-5-5',
  meta: 'claude-haiku-5-5',
  alt: 'claude-haiku-5-5',
  classement: 'claude-haiku-5-5',
  idees: 'claude-haiku-5-5',
  reseaux: 'claude-haiku-5-5',
};

export const TYPES_ARTICLE = [
  'Conseils',
  'Guide des prix',
  'Avant / après',
  'Questions fréquentes',
] as const;
export const LONGUEURS_ARTICLE = { court: 600, moyen: 900, long: 1400 } as const;
export type LongueurArticle = keyof typeof LONGUEURS_ARTICLE;

export const VERSION_PROMPT_IA_BLOG = 'blog.v1';

export const PROMPT_SYSTEME_IA_BLOG = `Tu aides un artisan du bâtiment à écrire les articles du blog de son site internet.
Règles :
- Français, vouvoiement, phrases courtes, vocabulaire de chantier, ton concret et utile. Jamais le mot « lead » : on parle de demandes ou de devis.
- N'invente aucun fait : chiffres, prix, années, délais, certifications (RGE, Qualibat…), assurances, notes d'avis. Seulement s'ils figurent dans la fiche vérifiée ou la demande de l'artisan ; sinon écris « [à compléter] ».
- Pas de promesse de prix ferme. Jamais de critique d'un concurrent.
- HTML du corps : seulement p, h2, h3, strong, em, ul, ol, li, blockquote, a (liens vers les pages du site, en adresses relatives). Pas de h1, pas d'image, pas de style.
- Réponds uniquement avec l'objet JSON demandé.`;

const s = { type: 'string' } as const;
const objet = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const propositions = objet({ propositions: { type: 'array', items: s } });

export const SCHEMAS_IA_BLOG: Record<ActionIaBlog, Record<string, unknown>> = {
  rediger: objet({ titre: s, sousTitre: s, meta: s, motCle: s, corpsHtml: s }),
  titres: propositions,
  meta: propositions,
  alt: propositions,
  classement: objet({ categorie: s, tags: { type: 'array', items: s } }),
  idees: objet({ idees: { type: 'array', items: objet({ titre: s, motCle: s }) } }),
  reseaux: objet({
    facebook: s,
    instagram: s,
    linkedin: s,
    google: s,
    hashtags: { type: 'array', items: s },
  }),
};

const texte = (max: number) => z.string().max(max);
const LECTEURS = {
  rediger: z.object({
    titre: texte(200),
    sousTitre: texte(300),
    meta: texte(320),
    motCle: texte(80),
    corpsHtml: texte(100_000),
  }),
  titres: z.object({ propositions: z.array(texte(200)).min(1).max(5) }),
  meta: z.object({ propositions: z.array(texte(320)).min(1).max(5) }),
  alt: z.object({ propositions: z.array(texte(200)).min(1).max(5) }),
  classement: z.object({ categorie: texte(60), tags: z.array(texte(40)).max(8) }),
  idees: z.object({
    idees: z
      .array(z.object({ titre: texte(200), motCle: texte(80) }))
      .min(1)
      .max(8),
  }),
  reseaux: z.object({
    facebook: texte(2000),
    instagram: texte(2200),
    linkedin: texte(3000),
    google: texte(1500),
    hashtags: z.array(texte(60)).max(30),
  }),
} as const;
type Lecteurs = typeof LECTEURS;
export type SortieIaBlog = {
  [A in ActionIaBlog]: { action: A; sortie: z.output<Lecteurs[A]> };
}[ActionIaBlog];

/** Garde-fou des faits sur le texte du HTML seulement (jamais dans les balises ni les liens). */
export function garderFaitsHtml(
  html: string,
  sources: string,
): { texte: string; remplaces: string[] } {
  const remplaces: string[] = [];
  const sortie = html
    .split(/(<[^>]*>)/)
    .map((morceau) => {
      if (morceau.startsWith('<')) return morceau;
      const r = garderFaits(morceau, sources);
      remplaces.push(...r.remplaces);
      return r.texte;
    })
    .join('');
  return { texte: sortie, remplaces };
}

/**
 * Réponse du modèle : JSON, schéma de l'action, puis garde-fou des faits sur chaque texte et
 * corps assaini (même liste blanche qu'à l'enregistrement).
 */
export function lireSortieBlog(
  action: ActionIaBlog,
  brut: string,
  sources: string,
): ({ ok: true; avertissements: string[] } & SortieIaBlog) | { ok: false; erreur: string } {
  let json: unknown;
  try {
    json = JSON.parse(brut);
  } catch {
    return { ok: false, erreur: 'Réponse illisible.' };
  }
  const r = LECTEURS[action].safeParse(json);
  if (!r.success) return { ok: false, erreur: 'Réponse hors format.' };
  const avert: string[] = [];
  const g = (t: string) => {
    const x = garderFaits(t, sources);
    avert.push(...x.remplaces);
    return x.texte;
  };
  const d = r.data as Record<string, unknown>;
  const nettoye = Object.fromEntries(
    Object.entries(d).map(([k, v]) => [
      k,
      k === 'corpsHtml'
        ? (() => {
            const x = garderFaitsHtml(assainirCorps(v as string), sources);
            avert.push(...x.remplaces);
            return x.texte;
          })()
        : typeof v === 'string'
          ? g(v)
          : Array.isArray(v)
            ? v.map((x) =>
                typeof x === 'string'
                  ? g(x)
                  : {
                      titre: g((x as { titre: string }).titre),
                      motCle: (x as { motCle: string }).motCle,
                    },
              )
            : v,
    ]),
  );
  return { ok: true, action, sortie: nettoye, avertissements: [...new Set(avert)] } as {
    ok: true;
    avertissements: string[];
  } & SortieIaBlog;
}

export interface DemandeIaBlog {
  action: ActionIaBlog;
  sujet?: string;
  type?: (typeof TYPES_ARTICLE)[number];
  longueur?: LongueurArticle;
  chantiers?: boolean;
  /** Article en cours (pour les retouches) ; corps tronqué. */
  article: { titre: string; meta: string; motCle: string; corps: string };
  categories: string[];
}

const CONSIGNES: Record<ActionIaBlog, string> = {
  rediger:
    'Rédige un article complet : titre de 50 à 60 caractères avec le mot-clé principal, sous-titre en une phrase, méta-description de 120 à 155 caractères, corps avec au moins 2 intertitres H2, le mot-clé dans les 100 premiers mots, et un appel à demander un devis à la fin.',
  titres: 'Propose 3 titres de 50 à 60 caractères avec le mot-clé principal.',
  meta: 'Propose 3 méta-descriptions de 120 à 155 caractères avec le mot-clé principal.',
  alt: 'Propose 2 textes alternatifs pour la photo à la une (10 à 120 caractères, concrets).',
  classement:
    'Choisis la catégorie la plus adaptée parmi la liste (exactement son nom, sinon vide) et 3 à 5 tags courts.',
  idees:
    'Propose 5 idées d’articles utiles aux clients de cet artisan (saison, métiers, recherches locales), chacune avec son mot-clé principal.',
  reseaux:
    'Rédige un texte court pour Facebook, Instagram, LinkedIn et la fiche Google, et 5 hashtags.',
};

export function messageIaBlog(e: DemandeIaBlog): string {
  return [
    `Action : ${CONSIGNES[e.action]}`,
    ...(e.sujet ? [`Sujet ou mot-clé : ${e.sujet}`] : []),
    ...(e.action === 'rediger' && e.type ? [`Type d'article : ${e.type}`] : []),
    ...(e.action === 'rediger' && e.longueur
      ? [`Longueur : environ ${LONGUEURS_ARTICLE[e.longueur]} mots.`]
      : []),
    ...(e.action === 'rediger' && e.chantiers
      ? [
          'Cite les chantiers et les avis de la fiche quand ils illustrent le propos, sans rien inventer.',
        ]
      : []),
    ...(e.categories.length ? [`Catégories existantes : ${e.categories.join(', ')}`] : []),
    `Article en cours : titre « ${e.article.titre} », mot-clé « ${e.article.motCle} », méta « ${e.article.meta} ».`,
    ...(e.article.corps ? [`Texte actuel (extrait) : ${e.article.corps.slice(0, 4000)}`] : []),
  ].join('\n');
}
