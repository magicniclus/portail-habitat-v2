import { calculerTotaux, type LigneDevis } from '@ph/core/devis';
import { ErreurMetier } from '@ph/core/erreurs';
import type { entreeModeleDevis, entreePrestationBiblio } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { exiger, type ContexteDevis, type ServicesDevis } from './communs';

/** Plafonds de l'onglet Modèles (coût de lecture borné à chaque ouverture de l'éditeur). */
const MAX_PRESTATIONS = 300;
const MAX_MODELES = 50;

export interface PrestationBiblio {
  id: string;
  /** Absent : ligne chiffrée ; `texte` : titre ou précision sans prix. */
  type?: LigneDevis['type'];
  nature?: LigneDevis['nature'];
  designation: string;
  unite: string;
  puHtCentimes: number;
  tva: LigneDevis['tva'];
  coutHtCentimes?: number;
}

export interface ModeleDevisResume {
  id: string;
  titre: string;
  lignes: LigneDevis[];
  /** Total HT des lignes du modèle (« à partir de »). */
  htCentimes: number;
  usage: number;
}

/** Modèles (les plus utilisés d'abord) et bibliothèque (ordre alphabétique) de l'entreprise. */
export async function lireBibliotheque(
  db: Firestore,
  artisanId: string,
): Promise<{ modeles: ModeleDevisResume[]; prestations: PrestationBiblio[] }> {
  const [m, p] = await Promise.all([
    db.collection(chemins.modelesDevis(artisanId)).limit(MAX_MODELES).get(),
    db.collection(chemins.prestationsBiblio(artisanId)).limit(MAX_PRESTATIONS).get(),
  ]);
  const modeles = m.docs.map((d) => {
    const lignes = (d.get('lignes') as LigneDevis[] | undefined) ?? [];
    return {
      id: d.id,
      titre: d.get('titre') as string,
      lignes,
      htCentimes: calculerTotaux({ lignes, remisePct: 0, acomptePct: 0 }).htCentimes,
      usage: (d.get('usage') as number | undefined) ?? 0,
    };
  });
  const prestations = p.docs.map((d) => {
    const cout = d.get('coutHtCentimes') as number | undefined;
    const type = d.get('type') as LigneDevis['type'];
    const nature = d.get('nature') as LigneDevis['nature'];
    return {
      id: d.id,
      ...(type ? { type } : {}),
      ...(nature ? { nature } : {}),
      designation: d.get('designation') as string,
      unite: d.get('unite') as string,
      puHtCentimes: d.get('puHtCentimes') as number,
      tva: d.get('tva') as LigneDevis['tva'],
      ...(cout !== undefined ? { coutHtCentimes: cout } : {}),
    };
  });
  return {
    modeles: modeles.sort((a, b) => b.usage - a.usage || a.titre.localeCompare(b.titre, 'fr')),
    prestations: prestations.sort((a, b) => a.designation.localeCompare(b.designation, 'fr')),
  };
}

/**
 * « + Ajouter une prestation », « Enregistrer comme ligne type » (chiffrée ou texte seul) ou
 * suppression (`devis.gerer`).
 */
export async function gererPrestation(
  s: ServicesDevis,
  ctx: ContexteDevis,
  e: z.output<typeof entreePrestationBiblio>,
): Promise<{ id: string }> {
  await exiger(s, null, ctx, 'devis.gerer');
  const col = s.db.collection(chemins.prestationsBiblio(ctx.artisanId));
  if (e.action === 'supprimer') {
    await col.doc(e.id).delete();
    return { id: e.id };
  }
  if ((await col.count().get()).data().count >= MAX_PRESTATIONS)
    throw new ErreurMetier(
      'PRECONDITION',
      `La bibliothèque compte déjà ${MAX_PRESTATIONS} prestations.`,
    );
  const { action: _a, ...saisie } = e;
  // Ligne de texte : ni quantité ni prix, TVA neutre (jamais comptée).
  const p =
    e.action === 'creerTexte'
      ? { type: 'texte', designation: e.designation, unite: '', puHtCentimes: 0, tva: 20 }
      : saisie;
  const maintenant = Timestamp.fromMillis(s.horloge());
  const ref = col.doc();
  await ref.set({ schemaVersion: 1, ...p, createdAt: maintenant, updatedAt: maintenant });
  return { id: ref.id };
}

/** « Enregistrer comme modèle » : les lignes d'un devis deviennent un modèle ; ou suppression. */
export async function gererModele(
  s: ServicesDevis,
  ctx: ContexteDevis,
  e: z.output<typeof entreeModeleDevis>,
): Promise<{ id: string }> {
  await exiger(s, null, ctx, 'devis.gerer');
  const col = s.db.collection(chemins.modelesDevis(ctx.artisanId));
  if (e.action === 'supprimer') {
    await col.doc(e.id).delete();
    return { id: e.id };
  }
  const [d, n] = await Promise.all([
    s.db.doc(chemins.unDevis(ctx.artisanId, e.devisId)).get(),
    col.count().get(),
  ]);
  if (!d.exists) throw new ErreurMetier('INTROUVABLE');
  if (n.data().count >= MAX_MODELES)
    throw new ErreurMetier('PRECONDITION', `Vous avez déjà ${MAX_MODELES} modèles.`);
  const lignes = ((d.get('lignes') as LigneDevis[]) ?? []).filter((l) => l.designation);
  if (!lignes.length) throw new ErreurMetier('PRECONDITION', 'Ce devis n’a aucune ligne.');
  const maintenant = Timestamp.fromMillis(s.horloge());
  const ref = col.doc();
  await ref.set({
    schemaVersion: 1,
    titre: e.titre,
    lignes: lignes.slice(0, 100),
    usage: 0,
    createdAt: maintenant,
    updatedAt: maintenant,
  });
  return { id: ref.id };
}

/** Un devis créé depuis un modèle : compteur « Utilisé n fois ». */
export async function compterUsageModele(
  db: Firestore,
  artisanId: string,
  modeleId: string,
): Promise<void> {
  const ref = db.doc(chemins.modeleDevis(artisanId, modeleId));
  if ((await ref.get()).exists) await ref.update({ usage: FieldValue.increment(1) });
}
