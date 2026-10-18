import {
  DELAI_VALIDATION_MS,
  prochainePublicationPilote,
  RYTHMES_PILOTE,
  rythmePermis,
  type RythmePilote,
} from '@ph/core/blog';
import { ErreurMetier } from '@ph/core/erreurs';
import { formatDate } from '@ph/core/format';
import type { Formule } from '@ph/core/paiements';
import { Timestamp } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { empreinteJeton, nouveauJeton, type Notifier } from '../comptes/services';
import type { ContexteSite } from '../sites/edition';
import { exigerBlog, lireMentionsBlog, sitePro, type ServicesBlog } from './acces';
import { articleEnUnClic, ideesLibres, motsClesUtilises, seoDe } from './autonome';
import type { ServicesIaBlog } from './ia';

/** Groupe de collections des réglages du blog (`sites/{id}/reglagesBlog/pilote`). */
const GROUPE_REGLAGES = 'reglagesBlog';
const NB_SUJETS = 3;

export interface Pilote {
  actif: boolean;
  rythme: RythmePilote;
  sujets: { titre: string; motCle: string }[];
  prochaineLe: number | null;
}

const ms = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : null);

export async function lirePilote(s: ServicesBlog, artisanId: string): Promise<Pilote> {
  const d = await s.db.doc(chemins.piloteBlog(artisanId)).get();
  return {
    actif: d.get('actif') === true,
    rythme: (d.get('rythme') as RythmePilote | undefined) ?? '2_mois',
    sujets: (d.get('sujets') as Pilote['sujets'] | undefined) ?? [],
    prochaineLe: ms(d.get('prochaineLe')),
  };
}

/** Complète la liste des prochains sujets (idées gratuites, mots-clés jamais repris, BLOG-13). */
async function completerSujets(
  s: ServicesIaBlog,
  ctx: ContexteSite,
  sujets: Pilote['sujets'],
): Promise<Pilote['sujets']> {
  if (sujets.length >= NB_SUJETS || !s.client) return sujets;
  try {
    const pris = await motsClesUtilises(s, ctx.artisanId);
    const idees = await ideesLibres(s, ctx, [...pris, ...sujets.map((x) => x.motCle)]);
    return [...sujets, ...idees].slice(0, NB_SUJETS);
  } catch {
    return sujets;
  }
}

/**
 * Pilote automatique (BLOG §2 bis, D70) : toujours « Je valide d'abord ». 2 par semaine réservé à
 * Tout inclus (BLOG-13). Activer calcule la prochaine date et propose 3 sujets.
 */
export async function reglerPilote(
  s: ServicesIaBlog,
  ctx: ContexteSite,
  e: { actif: boolean; rythme: RythmePilote },
): Promise<Pilote> {
  const ref = s.db.doc(chemins.piloteBlog(ctx.artisanId));
  const avant = await s.db.runTransaction(async (t) => {
    await exigerBlog(s, t, ctx);
    const [artisan, p] = await Promise.all([
      t.get(s.db.doc(chemins.artisan(ctx.artisanId))),
      t.get(ref),
    ]);
    const formule = (artisan.get('droits.formule') as Formule | undefined) ?? 'gratuit';
    if (!rythmePermis(e.rythme, formule))
      throw new ErreurMetier(
        'PERMISSION_REFUSEE',
        `${RYTHMES_PILOTE[e.rythme].libelle} : réservé à Tout inclus (15 articles par mois).`,
      );
    return p;
  });
  const derniere = ms(avant.get('derniereLe'));
  const prochaineLe = e.actif ? prochainePublicationPilote(derniere, e.rythme, s.horloge()) : null;
  const sujets = e.actif
    ? await completerSujets(s, ctx, (avant.get('sujets') as Pilote['sujets'] | undefined) ?? [])
    : ((avant.get('sujets') as Pilote['sujets'] | undefined) ?? []);
  await ref.set(
    {
      schemaVersion: 1,
      actif: e.actif,
      rythme: e.rythme,
      validation: 'avant',
      uid: ctx.uid,
      sujets,
      prochaineLe: prochaineLe ? Timestamp.fromMillis(prochaineLe) : null,
      majLe: Timestamp.fromMillis(s.horloge()),
    },
    { merge: true },
  );
  return { actif: e.actif, rythme: e.rythme, sujets, prochaineLe };
}

/** « Autre sujet » : remplace un des 3 prochains sujets par une nouvelle idée. */
export async function remplacerSujetPilote(
  s: ServicesIaBlog,
  ctx: ContexteSite,
  e: { index: number },
): Promise<Pilote> {
  await s.db.runTransaction((t) => exigerBlog(s, t, ctx));
  const p = await lirePilote(s, ctx.artisanId);
  if (!p.sujets[e.index]) throw new ErreurMetier('INTROUVABLE');
  const pris = await motsClesUtilises(s, ctx.artisanId);
  const [idee] = await ideesLibres(s, ctx, [...pris, ...p.sujets.map((x) => x.motCle)]);
  if (!idee) throw new ErreurMetier('INDISPONIBLE', 'Aucun autre sujet pour l’instant.');
  const sujets = p.sujets.map((x, i) => (i === e.index ? idee : x));
  await s.db.doc(chemins.piloteBlog(ctx.artisanId)).update({ sujets });
  return { ...p, sujets };
}

/**
 * Chaque heure : pour chaque pilote dont la prochaine publication est dans 48 h, l'article est
 * rédigé (brouillon, un crédit) et l'email `blog-a-valider` part avec un lien personnel. Sans
 * clic, l'article reste un brouillon et n'est jamais publié (BLOG-12). Échec (quota, IA) : la date
 * passe à la suivante, rien n'est publié.
 */
export async function preparerArticlesPilote(
  s: ServicesIaBlog & { notifier: Notifier; jeton?: () => string },
): Promise<{ prepares: number; echecs: number }> {
  const maintenant = s.horloge();
  const r = await s.db
    .collectionGroup(GROUPE_REGLAGES)
    .where('actif', '==', true)
    .where('prochaineLe', '<=', Timestamp.fromMillis(maintenant + DELAI_VALIDATION_MS))
    .limit(100)
    .get();
  let prepares = 0;
  let echecs = 0;
  for (const d of r.docs) {
    const artisanId = d.ref.parent.parent!.id;
    const ctx = { artisanId, uid: d.get('uid') as string };
    const date = ms(d.get('prochaineLe'))!;
    const rythme = d.get('rythme') as RythmePilote;
    const sujets = (d.get('sujets') as Pilote['sujets'] | undefined) ?? [];
    const suivante = {
      derniereLe: Timestamp.fromMillis(date),
      prochaineLe: Timestamp.fromMillis(prochainePublicationPilote(date, rythme, maintenant)),
      majLe: Timestamp.fromMillis(maintenant),
    };
    try {
      const sujet = sujets[0];
      const a = await articleEnUnClic(s, ctx, {
        ...(sujet ? { sujet: `${sujet.titre} (mot-clé principal : ${sujet.motCle})` } : {}),
        fin: 'relire',
      });
      const jeton = (s.jeton ?? nouveauJeton)();
      const refArticle = s.db.doc(chemins.articleBlog(artisanId, a.articleId));
      await refArticle.update({
        pilote: { jetonHash: empreinteJeton(jeton), publierLe: Timestamp.fromMillis(date) },
      });
      const reste = await completerSujets(s, ctx, sujets.slice(1));
      await d.ref.update({ ...suivante, sujets: reste });
      const artisan = await s.db.doc(chemins.artisan(artisanId)).get();
      const titre = ((await refArticle.get()).get('titre') as string | undefined) ?? '';
      await s.notifier({
        modele: 'blog-a-valider',
        destinataire: { uid: ctx.uid, artisanId },
        refObjet: refArticle.path,
        donnees: {
          nomCommercial: (artisan.get('nomCommercial') as string | undefined) ?? '',
          titre,
          date: formatDate(date, 'long'),
          aCorriger: a.seo.bloquants.map((b) => b.libelle),
          lienRelire: `/pro/site/blog/${a.articleId}`,
        },
        secrets: { lienValider: `/pro/blog-valider/${artisanId}.${a.articleId}.${jeton}` },
      });
      prepares++;
    } catch {
      await d.ref.update(suivante);
      echecs++;
    }
  }
  return { prepares, echecs };
}

const lireLien = (lien: string) => {
  const [artisanId, articleId, jeton] = lien.split('.');
  if (!artisanId || !articleId || !jeton) throw new ErreurMetier('INTROUVABLE');
  return { artisanId, articleId, jeton };
};

export type EtatValidation =
  | { etat: 'a_valider'; titre: string; publierLe: number; aCorriger: string[] }
  | { etat: 'valide'; titre: string; publierLe: number }
  | { etat: 'invalide' };

/** Page du lien de l'email : l'article attend-il la validation ? (Rien n'est écrit en lecture.) */
export async function lireValidationPilote(s: ServicesBlog, lien: string): Promise<EtatValidation> {
  try {
    const { artisanId, articleId, jeton } = lireLien(lien);
    const a = (await s.db.doc(chemins.articleBlog(artisanId, articleId)).get()).data();
    const p = a?.pilote as
      { jetonHash?: string; publierLe: Timestamp; valideLe?: Timestamp } | undefined;
    if (!a || !p || a.supprimeLe || p.jetonHash !== empreinteJeton(jeton))
      return { etat: 'invalide' };
    const titre = a.titre as string;
    const publierLe = p.publierLe.toMillis();
    if (p.valideLe) return { etat: 'valide', titre, publierLe };
    const mentions = await lireMentionsBlog(s.db, artisanId);
    return {
      etat: 'a_valider',
      titre,
      publierLe,
      aCorriger: seoDe(a, mentions.complet).bloquants.map((b) => b.libelle),
    };
  } catch {
    return { etat: 'invalide' };
  }
}

/**
 * « Valider la publication » (bouton de la page du lien, jamais au simple chargement) : planifié
 * à la date prévue, ou publié tout de suite si elle est passée. Refusé si un point bloquant reste.
 */
export async function validerArticlePilote(
  s: ServicesBlog,
  lien: string,
): Promise<{ statut: 'planifie' | 'publie'; date: number }> {
  const { artisanId, articleId, jeton } = lireLien(lien);
  const mentions = await lireMentionsBlog(s.db, artisanId);
  const ref = s.db.doc(chemins.articleBlog(artisanId, articleId));
  return s.db.runTransaction(async (t) => {
    const [d, artisan] = await Promise.all([
      t.get(ref),
      t.get(s.db.doc(chemins.artisan(artisanId))),
    ]);
    const a = d.data();
    const p = a?.pilote as
      { jetonHash?: string; publierLe: Timestamp; valideLe?: Timestamp } | undefined;
    if (!a || !p || a.supprimeLe || p.jetonHash !== empreinteJeton(jeton))
      throw new ErreurMetier('INTROUVABLE', 'Ce lien n’est plus valable.');
    if (p.valideLe) throw new ErreurMetier('CONFLIT', 'Cet article est déjà validé.');
    if (a.statut !== 'brouillon')
      throw new ErreurMetier('PRECONDITION', 'Cet article a été modifié depuis l’éditeur.');
    if (!sitePro(artisan.get('droits')))
      throw new ErreurMetier('PERMISSION_REFUSEE', 'Le blog est inclus dans Site Pro.');
    const seo = seoDe(a, mentions.complet);
    if (seo.bloquants.length)
      throw new ErreurMetier(
        'PRECONDITION',
        `À corriger dans l’éditeur : ${seo.bloquants.map((b) => b.libelle.toLowerCase()).join(', ')}.`,
      );
    const maintenant = s.horloge();
    const date = Math.max(p.publierLe.toMillis(), maintenant);
    const statut = date > maintenant ? 'planifie' : 'publie';
    t.update(ref, {
      statut,
      datePublication: Timestamp.fromMillis(date),
      seo,
      'pilote.valideLe': Timestamp.fromMillis(maintenant),
      modifieLe: Timestamp.fromMillis(maintenant),
    });
    return { statut, date };
  });
}
