import type { Formule } from '../paiements/droits';
import { contientMotCle } from './html';
import type { ArticleAControler } from './seo';

/**
 * Blog autonome (BLOG §2 bis, D70) : article en un clic et pilote automatique. Rien n'est publié
 * sans un clic de l'artisan : « Planifier seul » dans l'éditeur, ou le lien de l'email
 * `blog-a-valider` pour le pilote (jamais de « Publier sans moi »).
 */

const JOUR = 86_400_000;

/** Rythmes du pilote ; 2 par semaine seulement en Tout inclus (quota de 15 articles). */
export const RYTHMES_PILOTE = {
  '2_mois': { jours: 15, libelle: '2 par mois' },
  '1_semaine': { jours: 7, libelle: '1 par semaine' },
  '2_semaine': { jours: 3.5, libelle: '2 par semaine' },
} as const;
export type RythmePilote = keyof typeof RYTHMES_PILOTE;

export const rythmePermis = (r: RythmePilote, f: Formule) =>
  r === '2_semaine'
    ? f === 'tout_inclus'
    : f === 'site_pro' || f === 'pack_fiche_site' || f === 'tout_inclus';

/** L'email de validation part 48 h avant ; un jour de marge pour préparer l'article. */
export const DELAI_VALIDATION_MS = 48 * 3_600_000;
const DELAI_MIN_MS = DELAI_VALIDATION_MS + JOUR;

export const normaliserMotCle = (m: string) =>
  m.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

export const motCleDejaUtilise = (m: string, existants: readonly string[]) => {
  const n = normaliserMotCle(m);
  return n.length > 0 && existants.some((e) => normaliserMotCle(e) === n);
};

/** Décalage de Paris (ms) à l'instant `ms`. */
function decalageParis(ms: number): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Paris',
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })
      .formatToParts(ms)
      .map((x) => [x.type, Number(x.value)]),
  ) as Record<string, number>;
  return (
    Date.UTC(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!) - Math.floor(ms / 60_000) * 60_000
  );
}

/** `jour` à 8 h, heure de Paris. */
function huitHeuresParis(annee: number, mois: number, jour: number): number {
  const approx = Date.UTC(annee, mois, jour, 8);
  return approx - decalageParis(approx);
}

const huitHeuresLeJourDe = (ms: number) => {
  const d = new Date(ms + decalageParis(ms));
  return huitHeuresParis(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

/** Date de la prochaine publication du pilote (la précédente + le rythme, 3 jours au plus tôt). */
export function prochainePublicationPilote(
  derniere: number | null,
  r: RythmePilote,
  maintenant: number,
): number {
  const min = maintenant + DELAI_MIN_MS;
  const suivante = derniere === null ? null : derniere + RYTHMES_PILOTE[r].jours * JOUR;
  if (suivante !== null && suivante >= min) return suivante;
  const d = huitHeuresLeJourDe(min);
  return d >= min ? d : huitHeuresLeJourDe(min + JOUR);
}

/**
 * « Planifier seul » (BLOG-11) : le 1er du mois qui précède le pic de recherche, à 8 h. Sans
 * tendance, ou si l'on est déjà dans ce mois ou celui du pic : dans 7 jours.
 */
export function dateSelonTendance(tendance: readonly number[] | null, maintenant: number): number {
  const repli = huitHeuresLeJourDe(maintenant + 7 * JOUR);
  if (!tendance || tendance.length !== 12 || Math.max(...tendance) <= 0) return repli;
  const pic = tendance.indexOf(Math.max(...tendance));
  const mois = (pic + 11) % 12;
  const ici = new Date(maintenant + decalageParis(maintenant));
  const courant = ici.getUTCMonth();
  if (courant === mois || courant === pic) return repli;
  const annee = ici.getUTCFullYear() + (mois < courant ? 1 : 0);
  return huitHeuresParis(annee, mois, 1);
}

const echapper = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Ajoute « Pour aller plus loin » jusqu'à `min` liens internes distincts (BLOG-10). */
export function completerLiensInternes(
  html: string,
  liens: readonly { url: string; titre: string }[],
  min = 3,
): string {
  const presents = new Set([...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]));
  const ajouts = liens
    .filter((l) => l.url.startsWith('/') && !presents.has(l.url))
    .slice(0, Math.max(0, min - presents.size));
  if (!ajouts.length) return html;
  const items = ajouts
    .map((l) => `<li><a href="${echapper(l.url)}">${echapper(l.titre)}</a></li>`)
    .join('');
  return `${html}<h2>Pour aller plus loin</h2><ul>${items}</ul>`;
}

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Coupe au dernier mot entier sous `max` caractères. */
function couper(t: string, max: number): string {
  if (t.length <= max) return t;
  const c = t.slice(0, max + 1);
  const i = c.lastIndexOf(' ');
  return (i > 0 ? c.slice(0, i) : c.slice(0, max)).replace(/[\s,;:–-]+$/, '');
}

/**
 * Corrections automatiques des points bloquants qui ne demandent aucun fait (BLOG §2 bis) :
 * mot-clé dans le titre, longueurs du titre et de la méta, texte alternatif. Les mentions légales
 * et les « [à compléter] » restent à l'artisan.
 */
export function corrigerSeoAuto<A extends ArticleAControler & { sousTitre: string }>(a: A): A {
  const k = a.motCle.trim();
  let titre = a.titre.trim();
  if (k && !contientMotCle(titre, k)) titre = `${majuscule(k)} : ${titre}`;
  titre = couper(titre, 70);
  if (titre.length < 10) titre = `${majuscule(k || titre)} : nos conseils`;
  let meta = a.meta.trim();
  if (meta.length < 120)
    meta = [
      meta,
      a.sousTitre.trim(),
      k
        ? `Nos conseils d’artisan sur ${k} : les questions à se poser et les points à vérifier avant vos travaux.`
        : 'Nos conseils d’artisan : les questions à se poser et les points à vérifier avant vos travaux.',
    ]
      .filter(Boolean)
      .join(' ');
  if (meta.length > 160) meta = `${couper(meta, 158)}…`;
  const alt = a.image.alt.trim().length >= 10 ? a.image.alt : titre;
  return { ...a, titre, meta, image: { ...a.image, alt } };
}
