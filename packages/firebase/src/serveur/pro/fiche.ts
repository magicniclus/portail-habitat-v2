import { ErreurMetier } from '@ph/core/erreurs';
import { completudeFiche } from '@ph/core/espace-pro';
import { peut, type Membre } from '@ph/core/equipe';
import { normaliserTel } from '@ph/core/format';
import { encoderGeohash } from '@ph/core/geo';
import type { entreeModifierFiche } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

/**
 * Complétude de la fiche (`artisans.completude`) à partir du document et des réalisations publiées ;
 * « coordonnées vérifiées » : téléphone vérifié du compte propriétaire.
 */
export async function completudeDepuisBase(
  db: Firestore,
  artisanId: string,
  a: DocumentData,
  t?: Transaction,
) {
  const requete = db.collection(chemins.realisations(artisanId)).where('publie', '==', true);
  const refProprietaire = a.proprietaireUid
    ? db.doc(chemins.user(a.proprietaireUid as string))
    : null;
  const [realisations, proprietaire] = await Promise.all([
    t ? t.get(requete) : requete.get(),
    refProprietaire ? (t ? t.get(refProprietaire) : refProprietaire.get()) : null,
  ]);
  return completudeFiche({
    metiers: (a.metiers as string[] | undefined) ?? [],
    zoneDefinie: Boolean(a.zoneIntervention?.rayonKm),
    telephoneVerifie: proprietaire?.get('telephoneVerifie') === true,
    description: (a.description as string | undefined) ?? '',
    logo: Boolean(a.logoUrl),
    nbPhotos: realisations.docs.reduce(
      (t, r) => t + ((r.get('photos') as unknown[] | undefined)?.length ?? 0),
      0,
    ),
    nbCertifications: ((a.labels as string[] | undefined) ?? []).length,
  });
}

/** Ma fiche telle que l'artisan la modifie (champs publics et zone). */
export interface FichePro {
  nomCommercial: string;
  slug: string;
  metierPrincipal: string;
  ville: string;
  enLigne: boolean;
  pitch: string;
  description: string;
  telephonePublic?: string;
  emailContact?: string;
  siteWeb?: string;
  devis?: { minCentimes: number; maxCentimes: number };
  zone: { centre: { latitude: number; longitude: number }; rayonKm: number };
  completude: Awaited<ReturnType<typeof completudeDepuisBase>>;
}

export async function lireFichePro(db: Firestore, artisanId: string): Promise<FichePro | null> {
  const d = await db.doc(chemins.artisan(artisanId)).get();
  const a = d.data();
  if (!a) return null;
  const facultatif = (cle: string) => (a[cle] ? { [cle]: a[cle] as string } : {});
  return {
    nomCommercial: a.nomCommercial,
    slug: a.slug,
    metierPrincipal: a.metierPrincipal,
    ville: a.adresseSiege?.ville ?? '',
    enLigne: a.enLigne === true,
    pitch: a.pitch ?? '',
    description: a.description ?? '',
    ...facultatif('telephonePublic'),
    ...facultatif('emailContact'),
    ...facultatif('siteWeb'),
    ...(a.budgetMin !== undefined && a.budgetMax !== undefined
      ? { devis: { minCentimes: a.budgetMin, maxCentimes: a.budgetMax } }
      : {}),
    // GeoPoint → objet simple (transmis aux composants client).
    zone: {
      centre: {
        latitude: a.zoneIntervention.centre.latitude as number,
        longitude: a.zoneIntervention.centre.longitude as number,
      },
      rayonKm: a.zoneIntervention.rayonKm,
    },
    completude: await completudeDepuisBase(db, artisanId, a),
  };
}

/**
 * Ma fiche : enregistre une section (droit `fiche.modifier`, membre relu dans la transaction) et
 * recalcule la complétude. La fiche publique suit par le déclencheur `projeterArtisan`.
 */
export async function modifierFiche(
  s: { db: Firestore; horloge: () => number },
  ctx: { artisanId: string; uid: string },
  e: z.output<typeof entreeModifierFiche>,
): Promise<{ completude: number }> {
  const ref = s.db.doc(chemins.artisan(ctx.artisanId));
  return s.db.runTransaction(async (t) => {
    const [m, a] = await Promise.all([
      t.get(s.db.doc(chemins.membre(ctx.artisanId, ctx.uid))),
      t.get(ref),
    ]);
    if (!peut(m.data() as Membre | undefined, 'fiche.modifier'))
      throw new ErreurMetier('PERMISSION_REFUSEE');
    if (!a.exists) throw new ErreurMetier('INTROUVABLE');
    const maintenant = Timestamp.fromMillis(s.horloge());
    const maj: Record<string, unknown> = { updatedAt: maintenant };
    if (e.pitch !== undefined) maj.pitch = e.pitch;
    if (e.description !== undefined) maj.description = e.description;
    // Chaîne vide : champ retiré de la fiche.
    for (const cle of ['telephonePublic', 'emailContact', 'siteWeb'] as const) {
      const v = e[cle];
      if (v === undefined) continue;
      if (v === '') maj[cle] = FieldValue.delete();
      else if (cle !== 'telephonePublic') maj[cle] = v;
      else {
        const tel = normaliserTel(v);
        if (!tel) throw new ErreurMetier('ENTREE_INVALIDE', 'Numéro de téléphone invalide.');
        maj[cle] = tel;
      }
    }
    if (e.devis) {
      maj.budgetMin = e.devis.minEuros * 100;
      maj.budgetMax = e.devis.maxEuros * 100;
    }
    if (e.zone) {
      maj['zoneIntervention.centre'] = e.zone.centre;
      maj['zoneIntervention.geohash'] = encoderGeohash(
        e.zone.centre.latitude,
        e.zone.centre.longitude,
      );
      maj['zoneIntervention.rayonKm'] = e.zone.rayonKm;
      maj['zoneIntervention.rayonAccepteLe'] = maintenant;
    }
    const apres = {
      ...a.data(),
      ...(e.description !== undefined ? { description: e.description } : {}),
    };
    const { pourcent } = await completudeDepuisBase(s.db, ctx.artisanId, apres, t);
    maj.completude = pourcent;
    t.update(ref, maj);
    return { completude: pourcent };
  });
}
