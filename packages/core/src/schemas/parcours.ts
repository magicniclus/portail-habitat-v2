import { z } from '../zod';
import { empreinte, horodatage, id, schemaVersion } from './commun';

/** `brouillons/{id}` (REPRISE_PARCOURS.md §5) : sans coordonnées, TTL 30 jours. */
export const brouillon = z.object({
  schemaVersion,
  parcours: z.enum(['simulateur', 'diagnostic', 'avis', 'onboarding']),
  uid: id.optional(),
  emailHash: empreinte.optional(),
  donnees: z.record(z.string(), z.unknown()),
  jetonHash: empreinte.optional(),
  majLe: horodatage,
  expireLe: horodatage,
  createdAt: horodatage,
});

/** `brouillonsOnboarding/{id}` (COMPTES §3.2) : identifiant en cookie httpOnly, TTL 30 jours. */
export const brouillonOnboarding = z.object({
  schemaVersion,
  etape: z.number().int().min(1).max(3),
  donnees: z.record(z.string(), z.unknown()),
  emailHash: empreinte.optional(),
  majLe: horodatage,
  expireLe: horodatage,
  createdAt: horodatage,
});

/** `simulations/{id}` : résultat partagé d'une simulation admin (TTL 7 jours), jamais en production. */
export const simulation = z.object({
  schemaVersion,
  type: z.enum(['bareme', 'matching']),
  parametres: z.record(z.string(), z.unknown()),
  resultat: z.record(z.string(), z.unknown()),
  creePar: id,
  createdAt: horodatage,
  expireLe: horodatage,
});

/** `cacheSirene/{siren}` : réponse des API entreprises, 24 h. */
export const cacheSirene = z.object({
  schemaVersion,
  donnees: z.record(z.string(), z.unknown()),
  expireLe: horodatage,
  createdAt: horodatage,
});
