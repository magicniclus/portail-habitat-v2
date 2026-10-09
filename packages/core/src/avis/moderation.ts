/**
 * Modération des avis (ADMIN §2.6, maquette « Admin Avis ») : score de risque combinant l'IP,
 * l'ancienneté du compte, le texte dupliqué et le lien avec l'artisan. Aucune modification du
 * texte : publier, refuser avec un motif prédéfini, demander une preuve, suspendre.
 */
export interface SignauxAvis {
  /** Compte de l'auteur créé il y a moins de 48 h. */
  compteRecent?: boolean;
  /** Nombre d'autres avis venant de la même adresse IP (empreinte). */
  memeIp?: number;
  texteDuplique?: boolean;
  /** Auteur membre de l'entreprise, ou même email que l'entreprise. */
  lienArtisan?: boolean;
  /** Ni preuve, ni mise en relation par le site. */
  sansPreuve?: boolean;
}

export function scoreRisqueAvis(s: SignauxAvis): { score: number; raisons: string[] } {
  const signaux: [boolean, number, string][] = [
    [Boolean(s.lienArtisan), 40, 'Auteur lié à l’entreprise'],
    [
      (s.memeIp ?? 0) > 0,
      30,
      `Même adresse IP que ${s.memeIp} autre${(s.memeIp ?? 0) > 1 ? 's' : ''} avis`,
    ],
    [Boolean(s.texteDuplique), 25, 'Texte proche d’un autre avis'],
    [Boolean(s.compteRecent), 20, 'Compte créé il y a moins de 48 h'],
    [Boolean(s.sansPreuve), 10, 'Ni preuve, ni mise en relation par le site'],
  ];
  const retenus = signaux.filter(([actif]) => actif);
  return {
    score: Math.min(
      100,
      retenus.reduce((n, [, points]) => n + points, 0),
    ),
    raisons: retenus.map(([, , raison]) => raison),
  };
}

export type NiveauRisque = 'faible' | 'moyen' | 'eleve';
export const niveauRisque = (score: number): NiveauRisque =>
  score >= 50 ? 'eleve' : score >= 25 ? 'moyen' : 'faible';

const mots = (t: string) =>
  new Set(
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((m) => m.length > 2),
  );

/** Deux textes partageant au moins 80 % de leurs mots (Jaccard). */
export function textesProches(a: string, b: string): boolean {
  const x = mots(a);
  const y = mots(b);
  if (!x.size || !y.size) return false;
  const communs = [...x].filter((m) => y.has(m)).length;
  return communs / (x.size + y.size - communs) >= 0.8;
}

/** Motifs de refus envoyés à l'auteur (maquette). */
export const MOTIFS_REFUS_AVIS = [
  'Sans lien avec une prestation',
  'Propos injurieux ou diffamatoires',
  'Conflit d’intérêts',
  'Doublon',
] as const;

/** Note moyenne de l'entreprise après publication ou retrait d'un avis (au centième). */
export function moyenneApres(
  actuel: { moyenne: number; nb: number },
  note: number,
  sens: 'ajout' | 'retrait',
): { moyenne: number; nb: number } {
  const nb = actuel.nb + (sens === 'ajout' ? 1 : -1);
  if (nb <= 0) return { moyenne: 0, nb: 0 };
  const total = actuel.moyenne * actuel.nb + (sens === 'ajout' ? note : -note);
  return { moyenne: Math.round((total / nb) * 100) / 100, nb };
}
