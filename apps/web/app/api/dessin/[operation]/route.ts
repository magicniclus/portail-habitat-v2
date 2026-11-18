import {
  entreeAdresse,
  entreeCreerPlan,
  entreeEnregistrerPlan,
  entreeFondPlan,
  entreeLireFond,
  entreeParcelle,
  entreePdfPlan,
  entreePartagerPlan,
  entreePhotoPlan,
  entreePlan,
  entreeRenommerPlan,
  entreeRevoquerPartage,
  entreeRestaurerVersion,
  entreeSupprimerPhoto,
  migrerScene,
} from '@ph/core/dessin';
import { ErreurMetier } from '@ph/core/erreurs';
import type { Resultat } from '@ph/core/resultat';
import { z } from '@ph/core/zod';
import {
  chargerParcelle,
  chercherAdresses,
  creerPlan,
  dupliquerPlan,
  enregistrerFond,
  enregistrerPhoto,
  enregistrerPlan,
  lireFond,
  lirePlan,
  listerPartages,
  listerPhotos,
  listerPlans,
  listerVersions,
  mettreALaCorbeille,
  partagerPlan,
  renommerPlan,
  restaurerDeLaCorbeille,
  restaurerVersion,
  revoquerPartage,
  supprimerPhoto,
} from '@ph/firebase/dessin';
import { action } from '@/server/action';
import { pdfDuPlan } from '@/server/pdfPlan';
import { contexteDessin, servicesDessin } from '@/server/dessin';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const espace = { espace: z.enum(['particulier', 'entreprise']) };
const debit = { cle: 'dessin', max: 600, fenetre: '1h' } as const;
/** Opérations coûteuses (COUTS) : limites propres, en plus de la limite générale. */
const debitPdf = { cle: 'dessin-pdf', max: 30, fenetre: '1h' } as const;
const debitParcelle = { cle: 'dessin-parcelle', max: 20, fenetre: '1h' } as const;
const debitAdresses = { cle: 'dessin-adresses', max: 120, fenetre: '1h' } as const;
const debitFichiers = { cle: 'dessin-fichiers', max: 30, fenetre: '1h' } as const;
/** Une scène tient en 4 Mo de JSON (limite des requêtes de l'hébergeur : 4,5 Mo). */
const TAILLE_SCENE = 4 * 1024 * 1024;

const OPERATIONS: Record<string, (brut: unknown) => Promise<Resultat<unknown>>> = {
  lister: action(
    { schema: z.object(espace), nom: 'dessin.lister', lectureSeule: true, rateLimit: debit },
    async (e, ctx) => listerPlans(servicesDessin(), await contexteDessin(ctx.uid!, e.espace)),
  ),
  lire: action(
    { schema: entreePlan.extend(espace), nom: 'dessin.lire', lectureSeule: true, rateLimit: debit },
    async (e, ctx) =>
      lirePlan(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), e.planId),
  ),
  versions: action(
    {
      schema: entreePlan.extend(espace),
      nom: 'dessin.versions',
      lectureSeule: true,
      rateLimit: debit,
    },
    async (e, ctx) =>
      listerVersions(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), e.planId),
  ),
  creer: action(
    { schema: entreeCreerPlan.extend(espace), nom: 'dessin.creer', rateLimit: debit },
    async (e, ctx) =>
      creerPlan(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), {
        titre: e.titre,
        ...(e.scene === undefined ? {} : { scene: e.scene }),
      }),
  ),
  enregistrer: action(
    { schema: entreeEnregistrerPlan.extend(espace), nom: 'dessin.enregistrer', rateLimit: debit },
    async (e, ctx) =>
      enregistrerPlan(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), {
        planId: e.planId,
        versionAttendue: e.versionAttendue,
        scene: e.scene,
        ...(e.nomVersion ? { nomVersion: e.nomVersion } : {}),
      }),
  ),
  renommer: action(
    { schema: entreeRenommerPlan.extend(espace), nom: 'dessin.renommer', rateLimit: debit },
    async (e, ctx) => renommerPlan(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), e),
  ),
  dupliquer: action(
    { schema: entreePlan.extend(espace), nom: 'dessin.dupliquer', rateLimit: debit },
    async (e, ctx) =>
      dupliquerPlan(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), e.planId),
  ),
  corbeille: action(
    { schema: entreePlan.extend(espace), nom: 'dessin.corbeille', rateLimit: debit },
    async (e, ctx) =>
      mettreALaCorbeille(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), e.planId),
  ),
  restaurer: action(
    { schema: entreePlan.extend(espace), nom: 'dessin.restaurer', rateLimit: debit },
    async (e, ctx) =>
      restaurerDeLaCorbeille(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), e.planId),
  ),
  'restaurer-version': action(
    {
      schema: entreeRestaurerVersion.extend(espace),
      nom: 'dessin.restaurerVersion',
      rateLimit: debit,
    },
    async (e, ctx) =>
      restaurerVersion(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), e),
  ),
  fond: action(
    { schema: entreeFondPlan.extend(espace), nom: 'dessin.fond', rateLimit: debitFichiers },
    async (e, ctx) =>
      enregistrerFond(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), e),
  ),
  'lire-fond': action(
    {
      schema: entreeLireFond.extend(espace),
      nom: 'dessin.lireFond',
      lectureSeule: true,
      rateLimit: debit,
    },
    async (e, ctx) => lireFond(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), e),
  ),
  photo: action(
    { schema: entreePhotoPlan.extend(espace), nom: 'dessin.photo', rateLimit: debitFichiers },
    async (e, ctx) =>
      enregistrerPhoto(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), e),
  ),
  photos: action(
    {
      schema: entreePlan.extend(espace),
      nom: 'dessin.photos',
      lectureSeule: true,
      rateLimit: debit,
    },
    async (e, ctx) => listerPhotos(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), e),
  ),
  'supprimer-photo': action(
    { schema: entreeSupprimerPhoto.extend(espace), nom: 'dessin.supprimerPhoto', rateLimit: debit },
    async (e, ctx) => supprimerPhoto(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), e),
  ),
  adresses: action(
    {
      schema: entreeAdresse.extend(espace),
      nom: 'dessin.adresses',
      lectureSeule: true,
      rateLimit: debitAdresses,
    },
    async (e, ctx) => {
      // Flag et permission vérifiés : pas de relais de géocodage pour qui n'a pas accès aux plans.
      await contexteDessin(ctx.uid!, e.espace);
      return { adresses: await chercherAdresses(e.texte) };
    },
  ),
  parcelle: action(
    { schema: entreeParcelle.extend(espace), nom: 'dessin.parcelle', rateLimit: debitParcelle },
    async (e, ctx) =>
      chargerParcelle(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), e),
  ),
  pdf: action(
    {
      schema: entreePdfPlan.extend(espace),
      nom: 'dessin.pdf',
      lectureSeule: true,
      rateLimit: debitPdf,
    },
    async (e, ctx) => {
      // Accès au plan vérifié ; le PDF suit la scène affichée, validée comme à l'enregistrement.
      const { titre } = await lirePlan(
        servicesDessin(),
        await contexteDessin(ctx.uid!, e.espace),
        e.planId,
      );
      const scene = migrerScene(e.scene);
      if (!scene.ok) throw new ErreurMetier(scene.code, scene.message);
      return { base64: (await pdfDuPlan({ titre, scene: scene.data }, e)).toString('base64') };
    },
  ),
  partages: action(
    {
      schema: entreePlan.extend(espace),
      nom: 'dessin.partages',
      lectureSeule: true,
      rateLimit: debit,
    },
    async (e, ctx) => ({
      liens: await listerPartages(
        servicesDessin(),
        await contexteDessin(ctx.uid!, e.espace),
        e.planId,
      ),
    }),
  ),
  'revoquer-partage': action(
    {
      schema: entreeRevoquerPartage.extend(espace),
      nom: 'dessin.revoquerPartage',
      rateLimit: debit,
    },
    async (e, ctx) => {
      await revoquerPartage(
        servicesDessin(),
        await contexteDessin(ctx.uid!, e.espace),
        e.partageId,
      );
      return { ok: true };
    },
  ),
  partager: action(
    { schema: entreePartagerPlan.extend(espace), nom: 'dessin.partager', rateLimit: debit },
    async (e, ctx) =>
      partagerPlan(servicesDessin(), await contexteDessin(ctx.uid!, e.espace), {
        planId: e.planId,
        joursValidite: e.joursValidite,
      }),
  ),
};

/** Dessin (DESSIN.md §4) : `/api/dessin/{operation}`, une action de l'enveloppe par opération. */
export async function POST(
  requete: Request,
  { params }: { params: Promise<{ operation: string }> },
) {
  const { operation } = await params;
  const executer = Object.hasOwn(OPERATIONS, operation) ? OPERATIONS[operation] : undefined;
  if (!executer) return new Response(null, { status: 404 });
  // Corps volumineux : scène (enregistrer, créer, PDF de la scène affichée) ou image en base64.
  const avecScene = ['enregistrer', 'creer', 'fond', 'photo', 'pdf'].includes(operation);
  return routeJson(requete, executer, avecScene ? TAILLE_SCENE : undefined);
}
