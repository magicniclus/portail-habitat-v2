'use server';

import {
  entreeChoixSujetStudio,
  entreeCommentairesStudio,
  entreeCreerProjetStudio,
  entreeDeclinaisonStudio,
  entreeGarderIdeeStudio,
  entreeIdeeStudio,
  entreeTournerIdeeStudio,
  entreeModifierPlanStudio,
  entreePriseStudio,
  entreeProjetStudio,
  entreeRetoucheStudio,
  entreeSansPriseStudio,
  entreePreparationStudio,
  entreeFilmerStudio,
  entreeMontageLibreStudio,
  entreeMediaStudio,
  entreeFriseStudio,
  entreeSujetsStudio,
  entreeVoixSyntheseStudio,
} from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import {
  choisirSujetStudio,
  creerProjetStudio,
  declinerSujetStudio,
  garderIdeeStudio,
  supprimerIdeeStudio,
  tournerIdeeStudio,
  lancerMontageStudio,
  modifierPlanStudio,
  priseEnregistreeStudio,
  proposerSujetsStudio,
  relancerStudio,
  sansPriseStudio,
  sujetsDepuisCommentairesStudio,
  voixDisponiblesStudio,
  voixSyntheseStudio,
  configReseaux,
  preparerCapturesStudio,
  modifierPreparationStudio,
  ignorerCapturesStudio,
  filmerCapturesStudio,
  creerMontageLibreStudio,
  ajouterMediaStudio,
  enregistrerFriseStudio,
  supprimerProjetStudio,
} from '@ph/firebase/studio';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';
import { servicesStudio } from './services';

/** Back-office › Studio (STUDIO.md) : chaque action exige `studio.utiliser` et est journalisée. */
const P = 'studio.utiliser' as const;
// « layout » : toutes les pages d'étape du projet sont relues.
const page = (id?: string) =>
  id ? revalidatePath(`/admin/studio/${id}`, 'layout') : revalidatePath('/admin/studio');
type Res<T = null> = { ok: true; data: T } | { ok: false; message: string };
const fin = <T>(r: { ok: true; data: T } | { ok: false; message: string }, id?: string): Res<T> => {
  page(id);
  return r.ok ? { ok: true, data: r.data } : { ok: false, message: r.message };
};

const creer = actionAdmin(
  { schema: entreeCreerProjetStudio, nom: 'adminStudioCreer', permission: P },
  async (e, ctx) => creerProjetStudio(servicesStudio(), { ...e, auteurUid: ctx.uid! }),
);
export const creerProjet = async (e: z.input<typeof entreeCreerProjetStudio>) =>
  fin(await creer(e));

const sujets = actionAdmin(
  { schema: entreeSujetsStudio, nom: 'adminStudioSujets', permission: P },
  async (e) => proposerSujetsStudio(servicesStudio(), e),
);
export const proposerSujets = async (e: z.input<typeof entreeSujetsStudio>) =>
  fin(await sujets(e), e.projetId);

const choix = actionAdmin(
  { schema: entreeChoixSujetStudio, nom: 'adminStudioChoixSujet', permission: P },
  async (e) => choisirSujetStudio(servicesStudio(), e),
);
export const choisirSujet = async (e: z.input<typeof entreeChoixSujetStudio>) =>
  fin(await choix(e), e.projetId);

const prise = actionAdmin(
  { schema: entreePriseStudio, nom: 'adminStudioPrise', permission: P },
  async (e, ctx) => priseEnregistreeStudio(servicesStudio(), { ...e, auteurUid: ctx.uid! }),
);
export const enregistrerPrise = async (e: z.input<typeof entreePriseStudio>) =>
  fin(await prise(e), e.projetId);

const retouche = actionAdmin(
  { schema: entreeRetoucheStudio, nom: 'adminStudioRetouche', permission: P },
  async (e) => lancerMontageStudio(servicesStudio(), { projetId: e.projetId, retouche: e.demande }),
);
export const retoucher = async (e: z.input<typeof entreeRetoucheStudio>) =>
  fin(await retouche(e), e.projetId);

const modifier = actionAdmin(
  { schema: entreeModifierPlanStudio, nom: 'adminStudioModifierPlan', permission: P },
  async (e) => modifierPlanStudio(servicesStudio(), e),
);
export const modifierPlan = async (e: z.input<typeof entreeModifierPlanStudio>) =>
  fin(await modifier(e), e.projetId);

const relance = actionAdmin(
  { schema: entreeProjetStudio, nom: 'adminStudioRelance', permission: P },
  async (e) => relancerStudio(servicesStudio(), e),
);
export const relancer = async (e: z.input<typeof entreeProjetStudio>) =>
  fin(await relance(e), e.projetId);

const declinaison = actionAdmin(
  { schema: entreeDeclinaisonStudio, nom: 'adminStudioDeclinaison', permission: P },
  async (e, ctx) => declinerSujetStudio(servicesStudio(), { ...e, auteurUid: ctx.uid! }),
);
export const declinerSujet = async (e: z.input<typeof entreeDeclinaisonStudio>) =>
  fin(await declinaison(e));

const synthese = actionAdmin(
  { schema: entreeVoixSyntheseStudio, nom: 'adminStudioVoixSynthese', permission: P },
  async (e, ctx) => voixSyntheseStudio(servicesStudio(), { ...e, auteurUid: ctx.uid! }),
);
export const voixSynthese = async (e: z.input<typeof entreeVoixSyntheseStudio>) =>
  fin(await synthese(e), e.projetId);

const listeVoix = actionAdmin(
  { schema: entreeProjetStudio, nom: 'adminStudioVoix', permission: P },
  async () => voixDisponiblesStudio(servicesStudio()),
);
/** Voix ElevenLabs proposées (vide si la clé manque). Lecture seule : rien à revalider. */
export const listerVoix = async (e: z.input<typeof entreeProjetStudio>) => {
  const r = await listeVoix(e);
  return r.ok ? r.data : [];
};

const garder = actionAdmin(
  { schema: entreeGarderIdeeStudio, nom: 'adminStudioGarderIdee', permission: P },
  async (e, ctx) => garderIdeeStudio(servicesStudio(), { ...e, auteurUid: ctx.uid! }),
);
export const garderIdee = async (e: z.input<typeof entreeGarderIdeeStudio>) =>
  fin(await garder(e), e.projetId);

const supprimerI = actionAdmin(
  { schema: entreeIdeeStudio, nom: 'adminStudioSupprimerIdee', permission: P },
  async (e) => supprimerIdeeStudio(servicesStudio(), e),
);
export const supprimerIdee = async (e: z.input<typeof entreeIdeeStudio>) =>
  fin(await supprimerI(e));

const tourner = actionAdmin(
  { schema: entreeTournerIdeeStudio, nom: 'adminStudioTournerIdee', permission: P },
  async (e, ctx) => tournerIdeeStudio(servicesStudio(), { ...e, auteurUid: ctx.uid! }),
);
export const tournerIdee = async (e: z.input<typeof entreeTournerIdeeStudio>) =>
  fin(await tourner(e));

const depuisCommentaires = actionAdmin(
  { schema: entreeCommentairesStudio, nom: 'adminStudioCommentaires', permission: P },
  async (_, ctx) =>
    sujetsDepuisCommentairesStudio(
      { ...servicesStudio(), reseaux: configReseaux(process.env), fetch },
      { auteurUid: ctx.uid! },
    ),
);
/** Les questions des commentaires de vos vidéos deviennent des sujets (nouveau projet). */
export const sujetsDepuisCommentaires = async () => fin(await depuisCommentaires({}));

const sansPrise = actionAdmin(
  { schema: entreeSansPriseStudio, nom: 'adminStudioSansPrise', permission: P },
  async (e) => sansPriseStudio(servicesStudio(), e),
);
/** Vidéo sans voix ni image : Claude monte directement cartons, captures et musique. */
export const videoSansPrise = async (e: z.input<typeof entreeSansPriseStudio>) =>
  fin(await sansPrise(e), e.projetId);

// Captures avant le montage (STUDIO.md §4) : préparer, corriger, filmer, ou s'en passer.
const preparation = actionAdmin(
  { schema: entreeProjetStudio, nom: 'adminStudioPreparerCaptures', permission: P },
  async (e) => preparerCapturesStudio(servicesStudio(), e),
);
export const preparerCaptures = async (e: z.input<typeof entreeProjetStudio>) =>
  fin(await preparation(e), e.projetId);

const correction = actionAdmin(
  { schema: entreePreparationStudio, nom: 'adminStudioModifierPreparation', permission: P },
  async (e) => modifierPreparationStudio(servicesStudio(), e),
);
export const modifierPreparation = async (e: z.input<typeof entreePreparationStudio>) =>
  fin(await correction(e), e.projetId);

const sansCaptures = actionAdmin(
  { schema: entreeProjetStudio, nom: 'adminStudioSansCaptures', permission: P },
  async (e) => ignorerCapturesStudio(servicesStudio(), e),
);
export const ignorerCaptures = async (e: z.input<typeof entreeProjetStudio>) =>
  fin(await sansCaptures(e), e.projetId);

const filmer = actionAdmin(
  { schema: entreeFilmerStudio, nom: 'adminStudioFilmerCaptures', permission: P },
  async (e) => filmerCapturesStudio(servicesStudio(), e),
);
export const filmerCaptures = async (e: z.input<typeof entreeFilmerStudio>) =>
  fin(await filmer(e), e.projetId);

// Montage libre (STUDIO.md §5 bis) : sans génération, médias importés, frise multipistes.
const montageLibre = actionAdmin(
  { schema: entreeMontageLibreStudio, nom: 'adminStudioMontageLibre', permission: P },
  async (e, ctx) => creerMontageLibreStudio(servicesStudio(), { ...e, auteurUid: ctx.uid! }),
);
export const creerMontageLibre = async (e: z.input<typeof entreeMontageLibreStudio>) =>
  fin(await montageLibre(e));

const media = actionAdmin(
  { schema: entreeMediaStudio, nom: 'adminStudioMedia', permission: P },
  async (e, ctx) => ajouterMediaStudio(servicesStudio(), { ...e, auteurUid: ctx.uid! }),
);
export const ajouterMedia = async (e: z.input<typeof entreeMediaStudio>) =>
  fin(await media(e), e.projetId);

const friseEnregistree = actionAdmin(
  { schema: entreeFriseStudio, nom: 'adminStudioFrise', permission: P },
  async (e) => enregistrerFriseStudio(servicesStudio(), e),
);
export const enregistrerFrise = async (e: z.input<typeof entreeFriseStudio>) =>
  fin(await friseEnregistree(e), e.projetId);

const suppression = actionAdmin(
  { schema: entreeProjetStudio, nom: 'adminStudioSupprimerProjet', permission: P },
  async (e) => supprimerProjetStudio(servicesStudio(), e),
);
export const supprimerProjet = async (e: z.input<typeof entreeProjetStudio>) =>
  fin(await suppression(e));
