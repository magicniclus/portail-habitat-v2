'use server';

import {
  entreeActionArtisanAdmin,
  entreeCrediterAdmin,
  entreeDocumentAdmin,
  entreeNoteAdmin,
} from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import {
  ajouterNoteAdmin,
  crediterArtisanAdmin,
  deciderDocumentAdmin,
  sanctionnerArtisanAdmin,
  verifierArtisanAdmin,
} from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';
import { servicesComptes } from '@/server/espace';
import { lireSessionAdmin } from '@/server/sessionAdmin';

const services = () => ({ db: getFirestore(appAdmin()), horloge: Date.now });

const verifier = actionAdmin(
  {
    schema: entreeActionArtisanAdmin,
    nom: 'adminVerifierArtisan',
    permission: 'artisans.verifier',
  },
  async (e, ctx) => verifierArtisanAdmin(services(), { acteurUid: ctx.uid!, ...e }),
);
const sanctionner = actionAdmin(
  { schema: entreeActionArtisanAdmin, nom: 'adminSanctionner', permission: 'artisans.suspendre' },
  async (e, ctx) =>
    sanctionnerArtisanAdmin(services(), {
      acteurUid: ctx.uid!,
      artisanId: e.artisanId,
      action: e.action === 'lever' ? 'lever' : 'suspendre',
      motif: e.motif,
    }),
);
const crediter = actionAdmin(
  { schema: entreeCrediterAdmin, nom: 'adminCrediter', permission: 'credits.crediter' },
  async (e, ctx) => {
    const r = await lireSessionAdmin();
    const illimite = r.etat === 'ok' && r.session.permissions.includes('credits.crediter_illimite');
    return crediterArtisanAdmin(services(), { acteurUid: ctx.uid!, illimite, ...e });
  },
);

/** Vérifier, suspendre ou lever la suspension (motif obligatoire, audit avant/après). */
export async function agirSurArtisan(
  artisanId: string,
  action: 'verifier' | 'suspendre' | 'lever',
  motif: string,
): Promise<string | null> {
  const r = await (action === 'verifier' ? verifier : sanctionner)({ artisanId, action, motif });
  revalidatePath('/admin/artisans');
  return r.ok ? null : r.message;
}

/** Geste commercial en crédits (5 au plus sans `credits.crediter_illimite`). */
export async function crediterArtisan(
  artisanId: string,
  credits: number,
  motif: string,
): Promise<string | null> {
  const r = await crediter({ artisanId, credits, motif });
  revalidatePath('/admin/artisans');
  return r.ok ? null : r.message;
}

const documenter = actionAdmin(
  { schema: entreeDocumentAdmin, nom: 'adminValiderDocument', permission: 'documents.valider' },
  async (e, ctx) =>
    deciderDocumentAdmin(
      { ...services(), notifier: servicesComptes().notifier },
      {
        acteurUid: ctx.uid!,
        artisanId: e.artisanId,
        documentId: e.documentId,
        decision: e.decision,
        motif: e.motif,
        ...(e.valideAu ? { valideAu: Date.parse(`${e.valideAu}T23:59:59Z`) } : {}),
      },
    ),
);

/** Valider ou refuser un document déposé (motif obligatoire, artisan prévenu). */
export async function deciderDocument(
  artisanId: string,
  documentId: string,
  decision: 'valide' | 'refuse',
  motif: string,
  valideAu?: string,
): Promise<string | null> {
  const r = await documenter({
    artisanId,
    documentId,
    decision,
    motif,
    ...(valideAu ? { valideAu } : {}),
  });
  revalidatePath('/admin/artisans');
  return r.ok ? null : r.message;
}

const noter = actionAdmin(
  { schema: entreeNoteAdmin, nom: 'adminNoteInterne', permission: 'artisans.lire' },
  async (e, ctx) =>
    ajouterNoteAdmin(services(), {
      acteurUid: ctx.uid!,
      cible: `artisans/${e.artisanId}`,
      texte: e.texte,
    }),
);

/** Formulaire « Ajouter une note » de la fiche. */
export async function ajouterNote(formulaire: FormData): Promise<void> {
  const artisanId = String(formulaire.get('artisanId') ?? '');
  await noter({ artisanId, texte: String(formulaire.get('texte') ?? '') });
  revalidatePath('/admin/artisans');
}
