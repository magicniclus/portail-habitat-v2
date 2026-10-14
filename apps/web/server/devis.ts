import 'server-only';
import {
  conditionsDevis,
  conditionsFacture,
  verifierMentionsDevis,
  type LigneDevis,
  type ParametresFacturation,
} from '@ph/core/devis';
import { formatDate, formatEuros, formatTel } from '@ph/core/format';
import { genererPdf, htmlEnTexte, type DonneesPdf } from '@ph/emails/pdf';
import { appAdmin, bucketFichiers } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import type { ResultatEnvoi, ServicesDevis } from '@ph/firebase/devis';
import { empreinteJeton, nouveauJeton } from '@ph/firebase/comptes';
import { getFirestore, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { URL_SITE } from '@/features/vitrine/seo';
import { servicesComptes } from './espace';

const db = () => getFirestore(appAdmin());

export function servicesDevis(): ServicesDevis {
  return { db: db(), horloge: Date.now };
}

const date = (v: unknown) => (v instanceof Timestamp ? v.toDate() : undefined);
const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');

async function entreprise(artisanId: string) {
  const [p, a] = await Promise.all([
    db().doc(chemins.parametresFacturation(artisanId)).get(),
    db().doc(chemins.artisan(artisanId)).get(),
  ]);
  const tel = a.get('telephonePublic') as string | undefined;
  return {
    ...(p.data() as ParametresFacturation & { tauxPenalitesAnnuel?: number; rcPro?: string }),
    ...(tel ? { telephone: formatTel(tel) } : {}),
    ...(a.get('emailContact') ? { email: a.get('emailContact') as string } : {}),
  };
}

/** Données du PDF d'un devis : conditions et annexes calculées depuis le document enregistré. */
function donneesDevis(
  numero: string,
  x: DocumentData,
  e: Awaited<ReturnType<typeof entreprise>>,
): DonneesPdf {
  const lignes = x.lignes as LigneDevis[];
  const m = verifierMentionsDevis(
    {
      typeClient: x.typeClient,
      sirenClient: x.sirenClient,
      client: x.client,
      validiteLe: date(x.validiteLe),
      debutTravauxLe: date(x.debutTravauxLe),
      dureeEstimee: x.dureeEstimee,
      fraisDeplacement: x.fraisDeplacement,
      horsEtablissement: x.horsEtablissement,
      lignes,
    },
    e,
  );
  return {
    type: 'devis',
    numero,
    date: date(x.envoiLe) ?? date(x.createdAt) ?? new Date(),
    validiteLe: date(x.validiteLe),
    client: x.client,
    sirenClient: x.sirenClient,
    objet: x.objet,
    description: htmlEnTexte(x.descriptionHtml ?? ''),
    lignes,
    totaux: x.totaux,
    remisePct: x.remisePct,
    conditions: conditionsDevis(
      {
        typeClient: x.typeClient,
        horsEtablissement: x.horsEtablissement,
        tauxReduit: m.annexes.includes('attestation_tva_reduite'),
        devisGratuit: x.devisGratuit,
        validiteLe: date(x.validiteLe),
        debutTravauxLe: date(x.debutTravauxLe),
        dureeEstimee: x.dureeEstimee,
        fraisDeplacement: x.fraisDeplacement,
        acomptePct: x.acomptePct,
        acompteCentimes: x.totaux.acompteCentimes ?? 0,
      },
      e,
    ),
    notes: x.notes || undefined,
    annexes: m.annexes,
    entreprise: e,
  };
}

/**
 * Après l'envoi (transaction validée) : PDF généré, stocké tel quel dans Storage (le fichier
 * téléchargé sera toujours celui-là, DEV-05), puis email au client avec un lien de téléchargement
 * dont seule l'empreinte est gardée.
 */
export async function produireEtEnvoyerDevis(
  artisanId: string,
  devisId: string,
): Promise<ResultatEnvoi> {
  const d = await db().doc(chemins.unDevis(artisanId, devisId)).get();
  const x = d.data() as DocumentData;
  const e = await entreprise(artisanId);
  const pdf = await genererPdf(donneesDevis(x.numero as string, x, e));
  const pdfPath = `artisans/${artisanId}/devis/${x.numero as string}.pdf`;
  await bucketFichiers()
    .file(pdfPath)
    .save(pdf, { contentType: 'application/pdf', resumable: false });
  const jeton = nouveauJeton();
  await servicesComptes().notifier({
    modele: 'devis-recu',
    destinataire: { email: x.client.email as string },
    refObjet: `${chemins.unDevis(artisanId, devisId)}`,
    donnees: {
      entreprise: e.raisonSociale,
      numero: x.numero,
      objet: x.objet,
      montant: formatEuros(x.totaux.ttcCentimes as number, {
        decimales: 'toujours',
        suffixe: 'TTC',
      }),
      validite: x.validiteLe ? formatDate(date(x.validiteLe)!) : '',
    },
    secrets: { lien: `${URL_SITE}/api/devis-client/${artisanId}.${devisId}.${jeton}` },
  });
  return { pdfPath, hashPdf: sha256(pdf), jetonHash: empreinteJeton(jeton) };
}

/** PDF d'une facture, produit une fois à l'émission puis servi tel quel. */
export async function produirePdfFacture(artisanId: string, factureId: string): Promise<void> {
  const ref = db().doc(chemins.factureClient(artisanId, factureId));
  const f = await ref.get();
  const x = f.data() as DocumentData;
  if (x.pdfPath) return;
  const e = await entreprise(artisanId);
  const origine = x.factureOrigineId
    ? ((
        await db()
          .doc(chemins.factureClient(artisanId, x.factureOrigineId as string))
          .get()
      ).get('numero') as string)
    : undefined;
  const pdf = await genererPdf({
    type: x.type,
    numero: x.numero,
    date: date(x.emiseLe) ?? new Date(),
    datePrestationLe: date(x.datePrestationLe),
    echeanceLe: x.type === 'avoir' ? undefined : date(x.echeanceLe),
    client: x.client,
    sirenClient: x.sirenClient,
    lieuExecution: x.lieuExecution,
    objet: x.objet,
    description: x.motifAvoir ? `Motif : ${x.motifAvoir as string}` : '',
    lignes: x.lignes,
    totaux: x.totaux,
    remisePct: x.remisePct ?? 0,
    acomptesDeduits: x.acomptesDeduits,
    resteCentimes: x.resteCentimes,
    conditions: conditionsFacture(
      {
        typeClient: x.typeClient,
        type: x.type,
        echeanceLe: date(x.echeanceLe),
        devisNumero: x.devisNumero,
        factureOrigine: origine,
      },
      e,
    ),
    annexes: [],
    entreprise: e,
  });
  const pdfPath = `artisans/${artisanId}/factures/${x.numero as string}.pdf`;
  await bucketFichiers()
    .file(pdfPath)
    .save(pdf, { contentType: 'application/pdf', resumable: false });
  await ref.update({ pdfPath, hashPdf: sha256(pdf) });
}

/** Fichier stocké (jamais régénéré) : même contenu que celui envoyé (DEV-05). */
export async function lirePdf(pdfPath: string): Promise<Buffer> {
  const [b] = await bucketFichiers().file(pdfPath).download();
  return b;
}

/** Lien du client : `artisanId.devisId.jeton`, vérifié par l'empreinte stockée sur le devis. */
export async function pdfDuLienClient(
  lien: string,
): Promise<{ pdf: Buffer; numero: string } | null> {
  const [artisanId, devisId, jeton] = lien.split('.');
  if (!artisanId || !devisId || !jeton || jeton.length < 20) return null;
  const d = await db().doc(chemins.unDevis(artisanId, devisId)).get();
  if (!d.exists || !d.get('pdfPath') || d.get('jetonHash') !== empreinteJeton(jeton)) return null;
  return { pdf: await lirePdf(d.get('pdfPath') as string), numero: d.get('numero') as string };
}
