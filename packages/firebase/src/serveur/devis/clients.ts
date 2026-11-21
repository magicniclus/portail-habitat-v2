import { ErreurMetier } from '@ph/core/erreurs';
import type { entreeClientCarnet } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { exiger, type ContexteDevis, type ServicesDevis } from './communs';

/** Plafond de la base (lue en entier à l'ouverture de l'onglet et de l'éditeur). */
const MAX_CLIENTS = 1000;

export interface ClientCarnet {
  id: string;
  nom: string;
  typeClient: 'particulier' | 'pro';
  sirenClient?: string;
  tvaIntraClient?: string;
  email?: string;
  tel?: string;
  adresse: string;
  complement?: string;
  codePostal?: string;
  ville?: string;
  pays?: string;
  notes?: string;
}

const CHAMPS = [
  'sirenClient',
  'tvaIntraClient',
  'email',
  'tel',
  'complement',
  'codePostal',
  'ville',
  'pays',
  'notes',
] as const;

const nomTri = (nom: string) =>
  nom
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .slice(0, 120);

/** Base clients de l'entreprise, par ordre alphabétique. */
export async function lireClients(db: Firestore, artisanId: string): Promise<ClientCarnet[]> {
  const r = await db
    .collection(chemins.clientsCarnet(artisanId))
    .orderBy('nomTri')
    .limit(MAX_CLIENTS)
    .get();
  return r.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      nom: x.nom as string,
      typeClient: (x.typeClient as ClientCarnet['typeClient']) ?? 'particulier',
      adresse: (x.adresse as string | undefined) ?? '',
      ...Object.fromEntries(CHAMPS.flatMap((k) => (x[k] ? [[k, x[k] as string]] : []))),
    };
  });
}

/**
 * Fiche client créée, modifiée ou supprimée (`devis.gerer` : le comptable lit seulement). Les
 * devis et factures déjà faits gardent leur copie ; une fiche liée à une facture émise reste.
 */
export async function gererClient(
  s: ServicesDevis,
  ctx: ContexteDevis,
  e: z.output<typeof entreeClientCarnet>,
): Promise<{ id: string }> {
  await exiger(s, null, ctx, 'devis.gerer');
  const col = s.db.collection(chemins.clientsCarnet(ctx.artisanId));
  if (e.action === 'supprimer') {
    const liees = await s.db
      .collection(chemins.facturesClients(ctx.artisanId))
      .where('clientId', '==', e.id)
      .limit(20)
      .get();
    if (liees.docs.some((f) => f.get('statut') !== 'brouillon'))
      throw new ErreurMetier(
        'PRECONDITION',
        'Ce client figure sur une facture émise : sa fiche est conservée.',
      );
    await col.doc(e.id).delete();
    return { id: e.id };
  }
  const { action: _a, ...saisie } = e;
  const fiche = Object.fromEntries(
    Object.entries(saisie).filter(([k, v]) => k !== 'id' && v !== undefined && v !== ''),
  );
  const maintenant = Timestamp.fromMillis(s.horloge());
  if (e.action === 'modifier') {
    const ref = col.doc(e.id);
    await s.db.runTransaction(async (t) => {
      const avant = await t.get(ref);
      if (!avant.exists) throw new ErreurMetier('INTROUVABLE');
      t.set(ref, {
        schemaVersion: 1,
        ...fiche,
        nomTri: nomTri(e.nom),
        createdAt: avant.get('createdAt') as Timestamp,
        updatedAt: maintenant,
      });
    });
    return { id: e.id };
  }
  if ((await col.count().get()).data().count >= MAX_CLIENTS)
    throw new ErreurMetier('PRECONDITION', `Votre base compte déjà ${MAX_CLIENTS} clients.`);
  const ref = col.doc();
  await ref.set({
    schemaVersion: 1,
    ...fiche,
    nomTri: nomTri(e.nom),
    createdAt: maintenant,
    updatedAt: maintenant,
  });
  return { id: ref.id };
}
