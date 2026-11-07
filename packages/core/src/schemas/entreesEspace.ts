import { z } from '../zod';
import { email, id } from './commun';

/** Demande d'un lien de connexion (`/connexion`) : la réponse est la même que l'email existe ou non. */
export const entreeLienConnexion = z.strictObject({
  email,
  /** Piège à robots : doit rester vide. */
  site: z.string().max(0).optional(),
});

/** Retour du lien magique : l'email est ressaisi (ou mémorisé) pour qu'un lien intercepté ne suffise pas. */
export const entreeConnexionLien = z.strictObject({
  email,
  oobCode: z.string().min(10).max(512),
});

/** Lecture d'une demande de l'espace particulier (ESP-02 : refusée si elle appartient à un autre). */
export const entreeLireDemande = z.strictObject({ demandeId: id });

/** Message du particulier à un artisan de sa demande (ESP-03). */
export const entreeMessageParticulier = z.strictObject({
  cleIdempotence: z.string().min(8).max(64),
  demandeId: id,
  artisanId: id,
  texte: z.string().trim().min(1, 'Écrivez votre message').max(4000),
});

/** Suppression du compte : second temps de la confirmation (ESP-04). */
export const entreeSuppressionCompte = z.strictObject({
  confirmation: z.literal('SUPPRIMER', 'Tapez SUPPRIMER pour confirmer'),
});
