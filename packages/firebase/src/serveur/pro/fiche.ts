import { bannieresMax, type CadrageBanniere } from '@ph/core/annuaire';
import { ErreurMetier } from '@ph/core/erreurs';
import { completudeFiche, contenuFiche, doitPasserEnLigne } from '@ph/core/espace-pro';
import { peut, type Membre } from '@ph/core/equipe';
import { normaliserTel } from '@ph/core/format';
import { encoderGeohash } from '@ph/core/geo';
import type { entreeModifierFiche } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { FieldValue, Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

/** Complétude d'après le document de l'entreprise : logo, description, bannière. */
const completudeDepuisBase = (a: DocumentData) => completudeFiche(contenuFiche(a));

/**
 * Champs à écrire après un changement de la fiche : complétude recalculée et, dès que le minimum
 * est fait (100 %), mise en ligne automatique, sauf fiche mise hors ligne par l'artisan.
 */
export function completudeEtMiseEnLigne(a: DocumentData): {
  completude: number;
  enLigne?: true;
} {
  const { pourcent } = completudeDepuisBase(a);
  const auto = doitPasserEnLigne({
    enLigne: a.enLigne === true,
    statut: String(a.statut ?? ''),
    completude: pourcent,
    horsLigneVolontaire: a.horsLigneVolontaire === true,
  });
  return { completude: pourcent, ...(auto ? { enLigne: true as const } : {}) };
}

/** Ma fiche telle que l'artisan la modifie (champs publics et zone). */
export interface FichePro {
  nomCommercial: string;
  slug: string;
  metierPrincipal: string;
  /** Métiers de l'entreprise (identifiants, métier principal d'abord). */
  metiers: string[];
  ville: string;
  /** Code postal du siège (contrôle de la zone d'intervention). */
  codePostal: string;
  /** Adresse du siège affichée dans « Informations » (« 3 rue des Lilas, 33600 Pessac »). */
  adresse: string;
  /** Numéro et rue du siège (modifiables dans « Informations »). */
  rue: string;
  enLigne: boolean;
  pitch: string;
  description: string;
  telephonePublic?: string;
  emailContact?: string;
  siteWeb?: string;
  logoUrl?: string;
  /** Bannières (1 sans visibilité payante, 5 avec) et nombre permis par la formule. */
  bannieres: string[];
  bannieresMax: number;
  cadrageBanniere: CadrageBanniere;
  videoUrl?: string;
  /** Labels prouvés par un document validé et non expiré (décennale, RGE, Qualibat). */
  certifications: string[];
  devis?: { minCentimes: number; maxCentimes: number };
  zone: { centre: { latitude: number; longitude: number }; rayonKm: number };
  completude: ReturnType<typeof completudeDepuisBase>;
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
    metiers: (a.metiers as string[] | undefined) ?? [a.metierPrincipal],
    ville: a.adresseSiege?.ville ?? '',
    codePostal: a.adresseSiege?.codePostal ?? '',
    rue: a.adresseSiege?.ligne1 ?? '',
    adresse: [
      a.adresseSiege?.ligne1,
      [a.adresseSiege?.codePostal, a.adresseSiege?.ville].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(', '),
    enLigne: a.enLigne === true,
    pitch: a.pitch ?? '',
    description: a.description ?? '',
    ...facultatif('telephonePublic'),
    ...facultatif('emailContact'),
    ...facultatif('siteWeb'),
    ...facultatif('logoUrl'),
    bannieres: (a.bannieres as string[] | undefined) ?? [],
    bannieresMax: bannieresMax({ ficheMiseEnAvant: a.droits?.ficheMiseEnAvant === true }),
    cadrageBanniere: (a.cadrageBanniere as CadrageBanniere | undefined) ?? 'centre',
    ...facultatif('videoUrl'),
    certifications: Object.entries(
      (a.labelsVerifies ?? {}) as Record<string, { expireLe?: { toMillis(): number } }>,
    )
      .filter(([, v]) => !v.expireLe || v.expireLe.toMillis() > Date.now())
      .map(([cle]) => cle),
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
    completude: completudeDepuisBase(a),
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
    if (e.adresse) {
      // Position de l'ancienne adresse retirée : elle ne correspond plus.
      maj['adresseSiege.ligne1'] = e.adresse.ligne1 || FieldValue.delete();
      maj['adresseSiege.codePostal'] = e.adresse.codePostal;
      maj['adresseSiege.ville'] = e.adresse.ville;
      maj['adresseSiege.pays'] = 'FR';
      maj['adresseSiege.ligne2'] = FieldValue.delete();
      maj['adresseSiege.geo'] = FieldValue.delete();
      maj['adresseSiege.geohash'] = FieldValue.delete();
    }
    if (e.devis) {
      maj.budgetMin = e.devis.minEuros * 100;
      maj.budgetMax = e.devis.maxEuros * 100;
    }
    if (e.metiers) {
      // Le métier principal (choisi à l'inscription) reste en tête ; doublons retirés.
      const principal =
        (a.get('metierPrincipal') as string | undefined) ?? (a.get('metiers') as string[])[0]!;
      maj.metiers = [...new Set([principal, ...e.metiers])];
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
      ...(maj.metiers ? { metiers: maj.metiers } : {}),
    };
    const c = completudeEtMiseEnLigne(apres);
    Object.assign(maj, c);
    t.update(ref, maj);
    return { completude: c.completude };
  });
}

/**
 * Interrupteur « En ligne » de Ma fiche (droit `fiche.modifier`). Allumer exige une fiche complète
 * (logo, description, bannière) et une entreprise active ; éteindre arrête aussi la mise en ligne
 * automatique jusqu'à ce que l'artisan rallume.
 */
export async function changerMiseEnLigne(
  s: { db: Firestore; horloge: () => number },
  ctx: { artisanId: string; uid: string },
  enLigne: boolean,
): Promise<{ enLigne: boolean }> {
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
    if (!enLigne) {
      t.update(ref, { enLigne: false, horsLigneVolontaire: true, updatedAt: maintenant });
      return { enLigne: false };
    }
    if (a.get('statut') !== 'actif') throw new ErreurMetier('PRECONDITION');
    const c = completudeDepuisBase(a.data()!);
    if (c.pourcent < 100)
      throw new ErreurMetier(
        'PRECONDITION',
        `Pour mettre la fiche en ligne, il manque : ${c.criteres
          .filter((x) => !x.fait)
          .map((x) => x.libelle.toLowerCase())
          .join(', ')}.`,
      );
    t.update(ref, {
      enLigne: true,
      horsLigneVolontaire: false,
      completude: c.pourcent,
      updatedAt: maintenant,
    });
    return { enLigne: true };
  });
}
