import { ErreurMetier } from '@ph/core/erreurs';
import {
  artisanAAccepte,
  LIBELLES_ATTRIBUTION_PARTICULIER,
  masquerCoordonnees,
} from '@ph/core/espace';
import type { entreeMessageParticulier } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { supprimerMonCompte } from '../comptes/suppression';
import type { ServicesComptes } from '../comptes/services';

type StatutAttribution = keyof typeof LIBELLES_ATTRIBUTION_PARTICULIER;

/** Statuts d'une demande encore en cours : annulée si le particulier supprime son compte. */
const EN_COURS = ['nouvelle', 'en_attribution', 'appel_offres', 'attribuee', 'devis_recus'];

/**
 * Message du particulier à un artisan de sa demande (ESP-03). Tant que l'artisan n'a pas
 * accepté, numéros et emails sont masqués **avant** l'enregistrement : l'original n'est stocké nulle part.
 */
export async function envoyerMessageParticulier(
  s: { db: Firestore; horloge: () => number },
  uid: string,
  e: z.output<typeof entreeMessageParticulier>,
): Promise<{ messageId: string; masque: boolean }> {
  const refDemande = s.db.doc(chemins.demande(e.demandeId));
  const refAttribution = s.db.doc(chemins.attribution(e.demandeId, e.artisanId));
  const ref = s.db.collection(chemins.messages(e.demandeId)).doc();
  return s.db.runTransaction(async (t) => {
    const [demande, attribution] = await Promise.all([t.get(refDemande), t.get(refAttribution)]);
    if (!demande.exists || demande.get('particulierUid') !== uid)
      throw new ErreurMetier('INTROUVABLE');
    const statut = attribution.get('statut') as StatutAttribution | undefined;
    if (!statut || LIBELLES_ATTRIBUTION_PARTICULIER[statut] === null)
      throw new ErreurMetier('PRECONDITION', 'Cet artisan ne suit plus votre demande.');
    const { texte, masque } = artisanAAccepte(statut)
      ? { texte: e.texte, masque: false }
      : masquerCoordonnees(e.texte);
    t.create(ref, {
      schemaVersion: 1,
      auteurUid: uid,
      auteurRole: 'particulier',
      artisanId: e.artisanId,
      texte,
      pieces: [],
      lu: false,
      createdAt: Timestamp.fromMillis(s.horloge()),
    });
    return { messageId: ref.id, masque };
  });
}

/** Champs internes exclus de l'export (empreintes techniques, score de qualification). */
const INTERNES = new Set(['ipHash', 'userAgent', 'qualification']);

const enClair = (v: unknown): unknown =>
  v instanceof Timestamp
    ? v.toDate().toISOString()
    : Array.isArray(v)
      ? v.map(enClair)
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enClair(x)]))
        : v;

/**
 * Export RGPD (ESP-04, droit d'accès et de portabilité) : profil, demandes et leurs messages,
 * dossiers de diagnostics. Les données internes (empreintes d'IP, scores) sont retirées.
 */
export async function exporterMesDonnees(db: Firestore, uid: string) {
  const [profil, demandes, dossiers] = await Promise.all([
    db.doc(chemins.user(uid)).get(),
    db.collection(collections.demandes).where('particulierUid', '==', uid).get(),
    db.collection(collections.dossiersDiag).where('particulierUid', '==', uid).get(),
  ]);
  const sansInterne = (d: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(d).filter(([k]) => !INTERNES.has(k)));
  return enClair({
    exporteLe: new Date(),
    profil: profil.data() ?? null,
    demandes: await Promise.all(
      demandes.docs.map(async (d) => ({
        id: d.id,
        ...sansInterne(d.data()),
        messages: (await d.ref.collection('messages').orderBy('createdAt').get()).docs.map((m) =>
          m.data(),
        ),
      })),
    ),
    dossiersDiagnostics: dossiers.docs.map((d) => ({ id: d.id, ...sansInterne(d.data()) })),
  }) as Record<string, unknown>;
}

/**
 * Suppression du compte particulier (ESP-04, second temps de la confirmation) : demandes en cours
 * annulées, puis suppression commune (équipes, profil anonymisé, compte Auth).
 */
export async function supprimerCompteParticulier(s: ServicesComptes, uid: string): Promise<void> {
  const ouvertes = await s.db
    .collection(collections.demandes)
    .where('particulierUid', '==', uid)
    .where('statut', 'in', EN_COURS)
    .get();
  const maintenant = new Date(s.horloge());
  for (let i = 0; i < ouvertes.docs.length; i += 400) {
    const lot = s.db.batch();
    for (const d of ouvertes.docs.slice(i, i + 400))
      lot.update(d.ref, { statut: 'annulee', updatedAt: maintenant });
    await lot.commit();
  }
  await supprimerMonCompte(s, uid);
}
