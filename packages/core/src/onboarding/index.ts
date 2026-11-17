/** Inscription des artisans (COMPTES §3) : règles pures partagées par les écrans et le serveur. */

export interface IntentionMetier {
  id: string;
  libelle: string;
  metier: string;
}

/**
 * Chantiers proposés (COMPTES §3.1 bis, ONB-01c) : toutes les intentions des métiers choisis,
 * cochées par défaut ; l'artisan décoche ce qu'il ne fait pas.
 */
export function chantiersDesMetiers(
  metiers: readonly string[],
  intentions: readonly IntentionMetier[],
) {
  return metiers.map((m) => ({ metier: m, chantiers: intentions.filter((i) => i.metier === m) }));
}

/**
 * Intentions retenues après un changement de métiers : celles des métiers encore choisis, plus toutes
 * celles d'un métier nouvellement ajouté (cochées par défaut) ; un chantier décoché le reste.
 */
export function intentionsApresChangement(
  avant: { metiers: readonly string[]; intentions: readonly string[] },
  metiers: readonly string[],
  toutes: readonly IntentionMetier[],
): string[] {
  const ajoutes = metiers.filter((m) => !avant.metiers.includes(m));
  return toutes
    .filter(
      (i) =>
        metiers.includes(i.metier) &&
        (ajoutes.includes(i.metier) || avant.intentions.includes(i.id)),
    )
    .map((i) => i.id);
}

/** Barre fixe (D26e, ONB-07) : libellé de statut et bouton actif seulement si l'étape est complète. */
export function statutZone(z: { ville?: string; rayonKm?: number }) {
  const complete = Boolean(z.ville && z.rayonKm);
  return { complete, statut: complete ? `${z.ville} · ${z.rayonKm} km` : 'Choisissez votre ville' };
}

/**
 * Étape 3 (décision du 15/11/2026) : entreprise, puis Google ou mot de passe confirmé ; les
 * conditions générales sont acceptées une seule fois, à l'étape 1.
 */
export function statutCompte(c: {
  methode: 'google' | 'motDePasse';
  entrepriseChoisie: boolean;
  motDePasse: string;
  confirmation: string;
}) {
  if (!c.entrepriseChoisie) return { complete: false, statut: 'Indiquez votre entreprise (SIREN)' };
  if (c.methode === 'motDePasse') {
    if (forceMotDePasse(c.motDePasse) < 3)
      return { complete: false, statut: 'Choisissez un mot de passe d’au moins 10 caractères' };
    if (c.motDePasse !== c.confirmation)
      return { complete: false, statut: 'Les deux mots de passe sont différents' };
  }
  return { complete: true, statut: 'Tout est prêt' };
}

/** Force d'un mot de passe de 0 à 4 (longueur ≥ 10 exigée, variété de caractères en plus). */
export function forceMotDePasse(m: string): number {
  if (m.length < 10) return m.length >= 6 ? 1 : 0;
  const variete = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(m)).length;
  return Math.min(4, 2 + Math.floor(variete / 2));
}
/** Rayon d'intervention réglé au curseur (décision du 15/11/2026, schéma `rayonKm` : 10 à 100). */
export const RAYON_ZONE = { min: 10, max: 100, pas: 5, defaut: 30 } as const;

/** Plancher des demandes récentes affichées aux étapes 2 et 3 (engagement du propriétaire, 15/11/2026). */
export const DEMANDES_RECENTES_MIN = 3;
/** Part conservée de l'estimation : 10 % en dessous, la phrase dit « au moins » (17/11/2026). */
const MARGE_DEMANDES_RECENTES = 0.9;

/** Couverture du modèle pour un rayon quelconque : interpolée entre 0 km et les points connus. */
function couvertureRayon(couverture: Readonly<Record<string, number>>, rayonKm: number) {
  const points = [
    [0, 0],
    ...Object.entries(couverture)
      .map(([k, v]) => [Number(k), v] as const)
      .sort((a, b) => a[0] - b[0]),
  ] as const;
  const dernier = points[points.length - 1]!;
  if (rayonKm >= dernier[0]) return dernier[1];
  const i = points.findIndex(([r]) => r >= rayonKm);
  const [r0, c0] = points[i - 1]!;
  const [r1, c1] = points[i]!;
  return c0 + ((c1 - c0) * (rayonKm - r0)) / (r1 - r0);
}

/**
 * Demandes des dernières 48 h dans la zone (décision du 17/11/2026 : le nombre suit le rayon).
 * `mensuel30` : demandes du mois des métiers de l'artisan à 30 km (STATS_DEMANDES : réel ou modèle), mis à
 * l'échelle du rayon par la couverture du modèle, ramené à 48 h, moins 10 %, jamais sous 3.
 */
export function demandesRecentes(e: {
  mensuel30: number | null;
  rayonKm: number;
  couverture: Readonly<Record<string, number>>;
}): number {
  const ref = e.couverture['30'];
  if (!e.mensuel30 || !ref) return DEMANDES_RECENTES_MIN;
  const n = (e.mensuel30 * couvertureRayon(e.couverture, e.rayonKm)) / ref;
  return Math.max(DEMANDES_RECENTES_MIN, Math.floor(((n * 2) / 30) * MARGE_DEMANDES_RECENTES));
}

export function phraseDemandesRecentes(
  z: { ville: string; rayonKm: number },
  nombre: number = DEMANDES_RECENTES_MIN,
) {
  return {
    phrase: `Au moins ${nombre} demandes de travaux déposées ces dernières 48 h autour de ${z.ville}, dans un rayon de ${z.rayonKm} km.`,
    precision:
      'Certaines ont peut-être déjà été confiées à un artisan : vous verrez dans votre espace celles qui sont encore ouvertes.',
  };
}

/** Nom saisi à l'inscription (ou du compte Google) → prénom (premier mot) et nom (le reste). */
export function decouperNom(complet: string): { prenom?: string; nom?: string } {
  const [prenom, ...reste] = complet.trim().split(/\s+/).filter(Boolean);
  if (!prenom) return {};
  return reste.length ? { prenom, nom: reste.join(' ') } : { prenom };
}

export * from './carte';
