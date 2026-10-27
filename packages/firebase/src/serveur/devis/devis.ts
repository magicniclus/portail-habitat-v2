import {
  assainirHtml,
  calculerTotaux,
  numeroDocument,
  texteAdresse,
  verifierMentionsDevis,
  type LigneDevis,
  transitionPermise,
} from '@ph/core/devis';
import { artisanAAccepte } from '@ph/core/espace';
import {
  attributionApresDevis,
  type EvenementDevis,
  type StatutAttributionPro,
} from '@ph/core/espace-pro';
import { ErreurMetier } from '@ph/core/erreurs';
import type { entreeEnregistrerDevis, entreeStatutDevis } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { Timestamp, type Transaction } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { compterUsageModele } from './bibliotheque';
import {
  exiger,
  jourEnDate,
  lireParametresTx,
  reserverNumero,
  versDate,
  type ContexteDevis,
  avecReprise,
  type ServicesDevis,
} from './communs';

type EntreeDevis = z.output<typeof entreeEnregistrerDevis>;

/** Ce que l'envoi enregistre : PDF stocké, son empreinte et celle du lien envoyé au client. */
export interface ResultatEnvoi {
  pdfPath: string;
  hashPdf: string;
  jetonHash?: string;
}

/**
 * Devis créé depuis « Mes demandes » : la mise en relation suit le devis (envoyé, accepté, refusé)
 * et le particulier le voit dans son espace. Lecture dans la transaction, écriture renvoyée pour
 * passer après toutes les lectures.
 */
export async function suivreDemande(
  t: Transaction,
  s: ServicesDevis,
  artisanId: string,
  demandeId: string | undefined,
  e: EvenementDevis,
): Promise<() => void> {
  if (!demandeId) return () => undefined;
  const ref = s.db.doc(chemins.attribution(demandeId, artisanId));
  const a = await t.get(ref);
  const statut = a.exists
    ? attributionApresDevis(a.get('statut') as StatutAttributionPro, e)
    : null;
  return () => {
    if (statut) t.update(ref, { statut, reponduLe: Timestamp.fromMillis(s.horloge()) });
  };
}

const sansIndefinis = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/**
 * Crée ou modifie un devis en brouillon (`devis.gerer`) : description assainie, totaux, marge et
 * mentions recalculés ici à partir des paramètres de facturation ; numéro D-aaaa-nnnn à la création.
 */
export async function enregistrerDevis(
  s: ServicesDevis,
  ctx: ContexteDevis,
  e: EntreeDevis,
): Promise<{ devisId: string; numero: string; mentionsManquantes: string[] }> {
  const col = s.db.collection(chemins.devis(ctx.artisanId));
  const ref = e.devisId ? col.doc(e.devisId) : col.doc();
  await exiger(s, null, ctx, 'devis.gerer');
  if (e.demandeId) {
    const a = await s.db.doc(chemins.attribution(e.demandeId, ctx.artisanId)).get();
    if (!a.exists || !artisanAAccepte(a.get('statut') as StatutAttributionPro))
      throw new ErreurMetier(
        'PRECONDITION',
        'Acceptez la demande avant d’y répondre par un devis.',
      );
  }
  const p = await lireParametresTx(s, null, ctx.artisanId);
  const r = await avecReprise(() =>
    s.db.runTransaction(
      async (t) => {
        const existant = e.devisId ? await t.get(ref) : null;
        if (existant && !existant.exists) throw new ErreurMetier('INTROUVABLE');
        if (existant && existant.get('statut') !== 'brouillon')
          throw new ErreurMetier(
            'CONFLIT',
            'Un devis envoyé ne se modifie plus : dupliquez-le pour en faire un nouveau.',
          );
        const numero = existant ? null : await reserverNumero(s, t, ctx.artisanId, 'devis');
        const lignes = e.lignes as LigneDevis[];
        const { margeHtCentimes, ...totaux } = calculerTotaux(e, { franchiseTva: p.franchiseTva });
        const validiteLe = jourEnDate(e.validiteLe);
        const debutTravauxLe = jourEnDate(e.debutTravauxLe);
        const sirenClient = e.typeClient === 'pro' ? e.sirenClient?.replace(/\s/g, '') : undefined;
        const mentions = verifierMentionsDevis(
          {
            ...e,
            sirenClient,
            lignes,
            validiteLe: versDate(validiteLe),
            debutTravauxLe: versDate(debutTravauxLe),
          },
          p,
        );
        const maintenant = Timestamp.fromMillis(s.horloge());
        const num = numero
          ? numeroDocument('devis', numero.annee, numero.n)
          : (existant!.get('numero') as string);
        const donnees = sansIndefinis({
          schemaVersion: 1,
          numero: num,
          statut: 'brouillon',
          client: sansIndefinis(e.client),
          demandeId: e.demandeId,
          modeleId: e.modeleId,
          objet: e.objet,
          descriptionHtml: assainirHtml(e.descriptionHtml),
          typeClient: e.typeClient,
          sirenClient,
          horsEtablissement: e.horsEtablissement,
          debutTravauxLe,
          dureeEstimee: e.dureeEstimee,
          fraisDeplacement: e.fraisDeplacement,
          devisGratuit: e.devisGratuit,
          lignes: lignes.map((l) => sansIndefinis({ ...l })),
          remisePct: e.remisePct,
          acomptePct: e.acomptePct,
          totaux,
          margeHtCentimes,
          mentionsOk: mentions.ok,
          mentionsManquantes: mentions.manquantes,
          validiteLe,
          notes: e.notes,
          signatureElectronique: e.signatureElectronique,
          tampon: e.tampon,
          modeSaisie: e.modeSaisie,
          adresseChantier:
            (e.livraison ? texteAdresse(e.livraison) : e.adresseChantier) || undefined,
          livraison: e.livraison,
          clientId: e.clientId,
          tvaIntraClient: e.tvaIntraClient || undefined,
          intitule: e.intitule || undefined,
          libelleDebut: e.libelleDebut || undefined,
          conditionsAcceptation: e.conditionsAcceptation || undefined,
          champSignature: e.champSignature,
          champLibre: e.champLibre?.texte ? e.champLibre : undefined,
          creePar: existant ? (existant.get('creePar') as string) : ctx.uid,
          createdAt: existant ? existant.get('createdAt') : maintenant,
          updatedAt: maintenant,
        });
        numero?.ecrire();
        t.set(ref, donnees);
        return { devisId: ref.id, numero: num, mentionsManquantes: mentions.manquantes };
      },
      { maxAttempts: 30 },
    ),
  );
  if (!e.devisId && e.modeleId) await compterUsageModele(s.db, ctx.artisanId, e.modeleId);
  return r;
}

/**
 * « Valider » ou envoi (DEV-01, DEV-02) : les mentions sont revérifiées ici, sur les paramètres du
 * moment ; un devis incomplet est refusé avec la liste. Le devis est figé et son PDF produit par
 * `apresEnvoi` ; `envoyer` y ajoute l'email au client, `valider` non (il part ensuite du menu).
 */
export async function envoyerDevis(
  s: ServicesDevis & {
    apresEnvoi?: (artisanId: string, devisId: string) => Promise<ResultatEnvoi>;
  },
  ctx: ContexteDevis,
  devisId: string,
  mode: 'envoyer' | 'valider' = 'envoyer',
): Promise<void> {
  const ref = s.db.doc(chemins.unDevis(ctx.artisanId, devisId));
  await s.db.runTransaction(async (t) => {
    await exiger(s, t, ctx, 'devis.gerer');
    const d = await t.get(ref);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE');
    if (d.get('statut') !== 'brouillon')
      throw new ErreurMetier('CONFLIT', 'Ce devis a déjà été envoyé.');
    const p = await lireParametresTx(s, t, ctx.artisanId);
    const m = verifierMentionsDevis(
      {
        typeClient: d.get('typeClient'),
        sirenClient: d.get('sirenClient'),
        client: d.get('client'),
        validiteLe: versDate(d.get('validiteLe')),
        debutTravauxLe: versDate(d.get('debutTravauxLe')),
        dureeEstimee: d.get('dureeEstimee'),
        fraisDeplacement: d.get('fraisDeplacement'),
        horsEtablissement: d.get('horsEtablissement'),
        lignes: d.get('lignes'),
      },
      p,
    );
    if (!m.ok)
      throw new ErreurMetier(
        'PRECONDITION',
        `Mentions obligatoires manquantes : ${m.liste
          .filter((x) => !x.ok)
          .map((x) => x.libelle)
          .join(', ')}.`,
      );
    if (mode === 'envoyer' && !(d.get('client.email') as string | undefined))
      throw new ErreurMetier(
        'PRECONDITION',
        'Indiquez l’email du client pour lui envoyer le devis.',
      );
    const suivre = await suivreDemande(t, s, ctx.artisanId, d.get('demandeId'), 'envoye');
    suivre();
    t.update(ref, {
      statut: 'envoye',
      mentionsOk: true,
      mentionsManquantes: [],
      valideLe: Timestamp.fromMillis(s.horloge()),
      ...(mode === 'envoyer' ? { envoiLe: Timestamp.fromMillis(s.horloge()) } : {}),
      updatedAt: Timestamp.fromMillis(s.horloge()),
    });
  });
  if (s.apresEnvoi) {
    const pdf = await s.apresEnvoi(ctx.artisanId, devisId);
    await ref.update(pdf);
    const d = await ref.get();
    const demandeId = d.get('demandeId') as string | undefined;
    if (demandeId)
      await s.db.doc(chemins.attribution(demandeId, ctx.artisanId)).update({
        devis: {
          montantCentimes: d.get('totaux.ttcCentimes') as number,
          storagePath: pdf.pdfPath,
          envoyeLe: (d.get('envoiLe') ?? d.get('valideLe')) as Timestamp,
        },
      });
  }
}

/** Accepté ou refusé (après envoi), archivé à tout moment. */
export async function changerStatutDevis(
  s: ServicesDevis,
  ctx: ContexteDevis,
  e: z.output<typeof entreeStatutDevis>,
): Promise<void> {
  const ref = s.db.doc(chemins.unDevis(ctx.artisanId, e.devisId));
  await s.db.runTransaction(async (t) => {
    await exiger(s, t, ctx, 'devis.gerer');
    const d = await t.get(ref);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE');
    if (!transitionPermise(d.get('statut') as string, e.statut))
      throw new ErreurMetier('CONFLIT', 'Ce changement de statut n’est pas possible.');
    if (e.statut !== 'archive')
      (
        await suivreDemande(
          t,
          s,
          ctx.artisanId,
          d.get('demandeId'),
          e.statut === 'accepte' ? 'accepte' : 'refuse',
        )
      )();
    t.update(ref, { statut: e.statut, updatedAt: Timestamp.fromMillis(s.horloge()) });
  });
}
