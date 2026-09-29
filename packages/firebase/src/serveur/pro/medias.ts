import { ErreurMetier } from '@ph/core/erreurs';
import { peut, type ActionEquipe, type Membre } from '@ph/core/equipe';
import type { entreeRealisation } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { urlPubliqueFichier, type bucketFichiers } from '../../admin';
import { chemins, fichiers } from '../../chemins';
import { completudeDepuisBase } from './fiche';

type Services = { db: Firestore; bucket: ReturnType<typeof bucketFichiers>; horloge: () => number };
type Contexte = { artisanId: string; uid: string };

const IMAGES = /^image\/(jpeg|png|webp|avif)$/;

/** Le fichier existe dans Storage, est une image et respecte la taille de storage.rules. */
async function verifierImage(s: Services, chemin: string, maxMo: number) {
  const fichier = s.bucket.file(chemin);
  const [existe] = await fichier.exists();
  if (!existe) throw new ErreurMetier('INTROUVABLE', 'Image introuvable : renvoyez-la.');
  const [meta] = await fichier.getMetadata();
  if (!IMAGES.test(meta.contentType ?? '') || Number(meta.size) > maxMo * 1024 * 1024)
    throw new ErreurMetier('ENTREE_INVALIDE', `Image JPEG, PNG ou WebP de ${maxMo} Mo au plus.`);
}

/** Membre relu dans la transaction : droit demandé, sinon refus. */
async function exiger(
  t: FirebaseFirestore.Transaction,
  s: Services,
  ctx: Contexte,
  action: ActionEquipe,
) {
  const m = await t.get(s.db.doc(chemins.membre(ctx.artisanId, ctx.uid)));
  if (!peut(m.data() as Membre | undefined, action)) throw new ErreurMetier('PERMISSION_REFUSEE');
}

/** Complétude recalculée après un changement de logo ou de réalisations. */
async function majCompletude(
  t: FirebaseFirestore.Transaction,
  s: Services,
  ctx: Contexte,
  apres: Record<string, unknown>,
) {
  const ref = s.db.doc(chemins.artisan(ctx.artisanId));
  const a = await t.get(ref);
  if (!a.exists) throw new ErreurMetier('INTROUVABLE');
  return { ref, donnees: { ...a.data(), ...apres } };
}

/** Logo de l'entreprise (propriétaire ou gérant : `fiche.modifier`), lisible publiquement. */
export async function enregistrerLogo(s: Services, ctx: Contexte, nomFichier: string) {
  const chemin = fichiers.logo(ctx.artisanId, nomFichier);
  await verifierImage(s, chemin, 2);
  const logoUrl = urlPubliqueFichier(chemin);
  return s.db.runTransaction(async (t) => {
    await exiger(t, s, ctx, 'fiche.modifier');
    const { ref, donnees } = await majCompletude(t, s, ctx, { logoUrl });
    const { pourcent } = await completudeDepuisBase(s.db, ctx.artisanId, donnees, t);
    t.update(ref, { logoUrl, completude: pourcent, updatedAt: Timestamp.fromMillis(s.horloge()) });
    return { logoUrl };
  });
}

export interface RealisationPro {
  id: string;
  titre: string;
  ville: string;
  photos: { url: string; largeur: number; hauteur: number }[];
}

export async function lireRealisationsPro(
  db: Firestore,
  artisanId: string,
): Promise<RealisationPro[]> {
  const r = await db.collection(chemins.realisations(artisanId)).orderBy('ordre', 'desc').get();
  return r.docs.map((d) => ({
    id: d.id,
    titre: d.get('titre') as string,
    ville: d.get('ville') as string,
    photos: (d.get('photos') as RealisationPro['photos']).map(({ url, largeur, hauteur }) => ({
      url,
      largeur,
      hauteur,
    })),
  }));
}

/**
 * Réalisation publiée (droit `realisations.modifier`) : photos vérifiées dans Storage, accord du
 * propriétaire du chantier exigé par le schéma (CGV §9).
 */
export async function enregistrerRealisation(
  s: Services,
  ctx: Contexte,
  e: z.output<typeof entreeRealisation>,
): Promise<void> {
  const photos = await Promise.all(
    e.photos.map(async (p) => {
      const chemin = fichiers.realisation(ctx.artisanId, e.rid, p.nomFichier);
      await verifierImage(s, chemin, 8);
      return {
        url: urlPubliqueFichier(chemin),
        storagePath: chemin,
        largeur: p.largeur,
        hauteur: p.hauteur,
      };
    }),
  );
  const ref = s.db.doc(`${chemins.realisations(ctx.artisanId)}/${e.rid}`);
  await s.db.runTransaction(async (t) => {
    await exiger(t, s, ctx, 'realisations.modifier');
    const { ref: refArtisan, donnees } = await majCompletude(t, s, ctx, {});
    if ((await t.get(ref)).exists)
      throw new ErreurMetier('CONFLIT', 'Réalisation déjà enregistrée.');
    const maintenant = Timestamp.fromMillis(s.horloge());
    const { pourcent } = await completudeDepuisBase(s.db, ctx.artisanId, donnees, t, photos.length);
    t.create(ref, {
      schemaVersion: 1,
      createdAt: maintenant,
      updatedAt: maintenant,
      titre: e.titre,
      description: e.description,
      metier: donnees.metierPrincipal as string,
      ville: e.ville,
      photos,
      autorisationProprietaire: true,
      publie: true,
      ordre: s.horloge(),
    });
    t.update(refArtisan, { completude: pourcent, updatedAt: maintenant });
  });
}

/** Retire une réalisation (et ses photos). */
export async function supprimerRealisation(s: Services, ctx: Contexte, rid: string): Promise<void> {
  const ref = s.db.doc(`${chemins.realisations(ctx.artisanId)}/${rid}`);
  const photos = await s.db.runTransaction(async (t) => {
    await exiger(t, s, ctx, 'realisations.modifier');
    const r = await t.get(ref);
    if (!r.exists) throw new ErreurMetier('INTROUVABLE');
    const liste = (r.get('photos') as { storagePath: string }[] | undefined) ?? [];
    const { ref: refArtisan, donnees } = await majCompletude(t, s, ctx, {});
    const retirees = r.get('publie') === true ? liste.length : 0;
    const { pourcent } = await completudeDepuisBase(s.db, ctx.artisanId, donnees, t, -retirees);
    t.delete(ref);
    t.update(refArtisan, { completude: pourcent, updatedAt: Timestamp.fromMillis(s.horloge()) });
    return liste;
  });
  await Promise.all(
    photos.map((p) => s.bucket.file(p.storagePath).delete({ ignoreNotFound: true })),
  );
}
