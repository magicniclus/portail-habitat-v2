import { z } from '../zod';
import { rayonKm } from './artisans';
import { email, id, siren } from './commun';
import { motifAdmin } from './entreesPro';

/** Back-office › Artisans (ADMIN §2.3, COMPTES §3.5 et §4.8) : actions sur l'entreprise. */
export const entreeCreerEntrepriseAdmin = z
  .strictObject({
    siren,
    metierPrincipal: id,
    metiers: z.array(id).min(1).max(5),
    rayonKm,
    /** Facultatif : invitation de revendication envoyée au dirigeant. */
    emailDirigeant: email.optional(),
    motif: motifAdmin,
  })
  .refine((e) => e.metiers.includes(e.metierPrincipal), {
    message: 'Le métier principal doit faire partie des métiers.',
    path: ['metierPrincipal'],
  });

export const entreeRevendicationAdmin = z.strictObject({ artisanId: id, email, motif: motifAdmin });

/** Propriétaire injoignable : procédure support (Kbis à jour), le nouveau est déjà membre actif. */
export const entreeTransfertAdmin = z.strictObject({ artisanId: id, uid: id, motif: motifAdmin });

/** Double confirmation : le nom commercial exact est ressaisi, en plus de la confirmation à l'écran. */
export const entreeSuppressionEntrepriseAdmin = z.strictObject({
  artisanId: id,
  confirmation: z.string().trim().min(1).max(120),
  motif: motifAdmin,
});

export const entreeRecalculFicheAdmin = z.strictObject({ artisanId: id });

/** Référentiels › Pages communes : nouvelle version des textes d'une commune. */
export const entreeTexteCommuneAdmin = z.strictObject({
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  intro: z.string().trim().min(20).max(1500),
  bati: z.string().trim().min(20).max(1500),
  secteurs: z.string().trim().min(20).max(1500),
  risques: z.string().trim().min(20).max(1500),
  frequents: z
    .array(
      z.strictObject({
        titre: z.string().trim().min(3).max(120),
        texte: z.string().trim().min(10).max(600),
      }),
    )
    .min(1)
    .max(6),
  motif: motifAdmin,
});
