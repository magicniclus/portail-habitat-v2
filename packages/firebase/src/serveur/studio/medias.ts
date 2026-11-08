import { ErreurMetier } from '@ph/core/erreurs';
import {
  creerFrise,
  frise as schemaFrise,
  LIMITES_MEDIAS,
  media as schemaMedia,
  verifierFrise,
  type FormatStudio,
  type Frise,
  type Media,
} from '@ph/core/studio';
import { Timestamp } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { exiger, maj, type ServicesStudio } from './projets';

/**
 * Montage libre (STUDIO.md §5 bis) : un projet qui s'ouvre directement dans l'éditeur, sans idée
 * ni script, avec une frise vide et une bibliothèque de médias importés (vidéos, sons, images).
 */
export async function creerMontageLibreStudio(
  s: ServicesStudio,
  e: { auteurUid: string; titre: string; format: FormatStudio },
): Promise<string> {
  const ref = s.db.collection(collections.studioProjets).doc();
  const t = Timestamp.fromMillis(s.horloge());
  await ref.set({
    schemaVersion: 1,
    auteurUid: e.auteurUid,
    titre: e.titre,
    titreAuto: false,
    statut: 'enregistrement',
    libre: true,
    frise: creerFrise(e.format, e.titre),
    format: e.format,
    camera: false,
    theme: null,
    serie: null,
    sujets: [],
    sujet: null,
    prise: null,
    plan: null,
    version: 0,
    captures: {},
    rendu: null,
    erreur: null,
    coutCentimes: 0,
    createdAt: t,
    updatedAt: t,
  });
  return ref.id;
}

/** Frise du projet : la sienne, ou une frise vide au format du projet. */
const friseDe = (p: Awaited<ReturnType<typeof exiger>>): Frise =>
  p.frise ?? creerFrise(p.format, p.titre);

/**
 * Média envoyé dans le bucket par le navigateur : la taille et le type sont relus côté serveur
 * (jamais ceux annoncés par le client), puis le média rejoint la bibliothèque du projet.
 */
export async function ajouterMediaStudio(
  s: ServicesStudio,
  e: { projetId: string; auteurUid: string; media: Media },
): Promise<Media> {
  const p = await exiger(s, e.projetId);
  const m = schemaMedia.parse(e.media);
  if (!m.chemin.startsWith(`studio/${e.auteurUid}/medias/`))
    throw new ErreurMetier('ENTREE_INVALIDE', 'Fichier de média invalide.');
  const info = s.infoFichier ? await s.infoFichier(m.chemin) : null;
  if (!info) throw new ErreurMetier('INTROUVABLE', 'Le fichier n’est pas arrivé : renvoyez-le.');
  const type = info.type.split('/')[0];
  if (type !== m.type) throw new ErreurMetier('ENTREE_INVALIDE', 'Type de fichier inattendu.');
  if (info.taille > LIMITES_MEDIAS[m.type])
    throw new ErreurMetier('ENTREE_INVALIDE', 'Fichier trop lourd.');
  const f = friseDe(p);
  const total = f.medias.reduce((t, x) => t + x.taille, 0) + info.taille;
  if (total > LIMITES_MEDIAS.projet)
    throw new ErreurMetier('ENTREE_INVALIDE', 'Les médias dépassent 5 Go pour ce projet.');
  if (f.medias.some((x) => x.id === m.id))
    throw new ErreurMetier('ENTREE_INVALIDE', 'Ce média est déjà dans la bibliothèque.');
  const lu: Media = { ...m, taille: info.taille };
  await maj(s, p.id, { frise: { ...f, medias: [...f.medias, lu] } });
  return lu;
}

/** Enregistre la frise (schéma et vérifications refaits côté serveur). */
export async function enregistrerFriseStudio(
  s: ServicesStudio,
  e: { projetId: string; frise: unknown },
): Promise<void> {
  const p = await exiger(s, e.projetId);
  const lu = schemaFrise.safeParse(e.frise);
  if (!lu.success) throw new ErreurMetier('ENTREE_INVALIDE', 'Montage invalide.');
  const erreurs = verifierFrise(lu.data).filter((x) => !x.startsWith('La frise est vide'));
  if (erreurs.length) throw new ErreurMetier('ENTREE_INVALIDE', erreurs.join(' '));
  // Les médias sont ceux du serveur : la frise ne peut ni en inventer, ni changer leur taille.
  const connus = new Map(friseDe(p).medias.map((m) => [m.id, m]));
  if (lu.data.medias.some((m) => connus.get(m.id)?.chemin !== m.chemin))
    throw new ErreurMetier('ENTREE_INVALIDE', 'Média inconnu dans le montage.');
  const medias = lu.data.medias.map((m) => connus.get(m.id)!);
  await maj(s, p.id, { frise: { ...lu.data, medias }, format: lu.data.format });
}

/**
 * Supprime un projet : ses médias importés (gardés tant que le projet existe), ses versions et
 * le projet lui-même. Les vidéos finies déjà publiées restent sur les réseaux.
 */
export async function supprimerProjetStudio(
  s: ServicesStudio,
  e: { projetId: string },
): Promise<void> {
  const p = await exiger(s, e.projetId);
  if (s.supprimerFichier)
    await Promise.all(
      (p.frise?.medias ?? []).map((m) => s.supprimerFichier!(m.chemin).catch(() => undefined)),
    );
  const ref = s.db.doc(chemins.projetStudio(p.id));
  await s.db.recursiveDelete(ref);
}
