import { IDS_SUJETS } from '../support/sujets';
import { z } from '../zod';
import { email } from './commun';

/** Formulaire Aide et contact (`/aide`). `site` : piège à robots, doit rester vide. */
export const entreeContact = z.object({
  sujet: z.enum(IDS_SUJETS),
  nom: z.string().trim().min(2).max(120),
  email,
  referenceDossier: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10).max(5000),
  site: z.string().max(0).optional(),
});

/** Événement de recherche (RECHERCHE §5) : requête déjà nettoyée par `requeteJournal`, aucune donnée personnelle. */
export const entreeEvenementRecherche = z.object({
  nature: z.enum(['saisie', 'choix', 'zero', 'abandon']),
  q: z.string().max(80),
  intention: z
    .string()
    .regex(/^[a-z0-9-]{2,60}$/)
    .optional(),
  rang: z.number().int().min(1).max(7).optional(),
  /** Identifiant aléatoire d'onglet, sans lien avec une personne. */
  session: z.string().regex(/^[a-z0-9]{8,32}$/),
});

/** Compteurs d'une fiche publique (`statsJour`) : anonymes, sans cookie ni identifiant. */
export const entreeEvenementFiche = z.strictObject({
  artisanId: z.string().regex(/^[A-Za-z0-9_-]{4,64}$/),
  type: z.enum(['vue', 'tel', 'devis']),
});
