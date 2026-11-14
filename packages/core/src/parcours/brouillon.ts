import { z } from '../zod';

/** Parcours en plusieurs étapes qui peuvent être repris (REPRISE_PARCOURS.md). */
export const PARCOURS = ['simulateur', 'diagnostic', 'avis', 'onboarding'] as const;
export type Parcours = (typeof PARCOURS)[number];

/** Durée de vie d'un brouillon après sa dernière modification (§2). */
/** Indicateur « une session est ouverte » lisible par le navigateur (valeur « 1 », sans donnée personnelle). */
export const COOKIE_CONNECTE = 'ph_connecte';

export const DUREE_BROUILLON_MS = 30 * 24 * 60 * 60 * 1000;

/** Clé localStorage d'un parcours : un seul brouillon par parcours, le plus récent l'emporte. */
export const cleBrouillon = (p: Parcours) => `ph:parcours:${p}`;

const texteCourt = z.string().max(60);
const reponse = z.union([z.number().finite(), texteCourt, z.array(texteCourt).max(30)]);

/**
 * Brouillon enregistré sur l'appareil (et recopié tel quel côté serveur dans `brouillons.donnees`).
 * Objets stricts : une clé inconnue (un email, un nom…) rend le brouillon invalide, donc supprimé.
 * Aucun montant n'est enregistré : l'estimation est recalculée côté serveur (règle n° 3).
 */
export const brouillonParcours = z.strictObject({
  v: z.literal(1),
  id: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  parcours: z.enum(PARCOURS),
  versionReferentiel: z.string().min(1).max(32),
  prestationId: z
    .string()
    .regex(/^[a-z0-9-]{1,64}$/)
    .optional(),
  etape: z.number().int().min(1).max(20),
  reponses: z
    .record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,39}$/), reponse)
    .refine((r) => Object.keys(r).length <= 60, 'Trop de réponses'),
  chantier: z
    .strictObject({
      codePostal: z
        .string()
        .regex(/^\d{0,5}$/)
        .optional(),
      acces: z.enum(['facile', 'etage', 'difficile']).optional(),
      delai: z.string().max(32).optional(),
    })
    .optional(),
  creeLe: z.number().int().nonnegative(),
  majLe: z.number().int().nonnegative(),
});
export type BrouillonParcours = z.infer<typeof brouillonParcours>;

export interface OptionsLecture {
  parcours: Parcours;
  maintenant: number;
  /** Vrai si la prestation existe encore et est active dans le référentiel actuel. */
  prestationExiste?: (id: string) => boolean;
  /** Étape minimale pour proposer la reprise (simulateur : 2, au-delà du choix de la prestation). */
  etapeMinimale?: number;
}

/**
 * Lit un brouillon brut (JSON.parse du stockage ou document serveur).
 * Renvoie `null` pour tout brouillon à supprimer sans erreur visible (§2 et §4) :
 * format inconnu ou corrompu, autre parcours, plus de 30 jours, prestation disparue, trop tôt dans le parcours.
 */
export function lireBrouillon(brut: unknown, o: OptionsLecture): BrouillonParcours | null {
  const r = brouillonParcours.safeParse(brut);
  if (!r.success) return null;
  const b = r.data;
  if (b.parcours !== o.parcours) return null;
  if (b.creeLe > b.majLe || b.majLe > o.maintenant + 60_000) return null;
  if (o.maintenant - b.majLe > DUREE_BROUILLON_MS) return null;
  if (o.prestationExiste && (!b.prestationId || !o.prestationExiste(b.prestationId))) return null;
  if (b.etape < (o.etapeMinimale ?? 1)) return null;
  return b;
}

/** Brouillon local et brouillon serveur : le plus récent (`majLe`) l'emporte, l'autre est écrasé (§4). */
export function plusRecent(
  a: BrouillonParcours | null,
  b: BrouillonParcours | null,
): BrouillonParcours | null {
  if (!a) return b;
  if (!b) return a;
  return b.majLe > a.majLe ? b : a;
}

export type DonneesBrouillon = Omit<BrouillonParcours, 'v' | 'id' | 'creeLe' | 'majLe'>;

/**
 * Brouillon à écrire après un changement de réponse (portage de ecrireBrouillon) :
 * la date de début et l'identifiant sont conservés tant que la prestation ne change pas.
 * Le résultat est revalidé : un appelant qui glisserait une donnée de contact obtient une erreur.
 */
export function brouillonAJour(
  precedent: BrouillonParcours | null,
  d: DonneesBrouillon,
  maintenant: number,
  nouvelId: () => string,
): BrouillonParcours {
  const suite = precedent && precedent.prestationId === d.prestationId ? precedent : null;
  return brouillonParcours.parse({
    ...d,
    v: 1,
    id: suite?.id ?? nouvelId(),
    creeLe: suite?.creeLe ?? maintenant,
    majLe: maintenant,
  });
}
