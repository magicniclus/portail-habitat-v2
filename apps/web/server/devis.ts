import 'server-only';
import {
  conditionsDevis,
  conditionsFacture,
  signatureDevis,
  verifierMentionsDevis,
  type LigneDevis,
  type ParametresFacturation,
} from '@ph/core/devis';
import { formatDate, formatEuros, formatTel } from '@ph/core/format';
import { genererPdf, htmlEnTexte, type DonneesPdf } from '@ph/emails/pdf';
import { appAdmin, bucketFichiers, cheminDepuisUrlPublique } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import {
  dechiffrer,
  lireLienClient,
  type ResultatEnvoi,
  type ServicesDevis,
} from '@ph/firebase/devis';
import { empreinteJeton, nouveauJeton } from '@ph/firebase/comptes';
import { getFirestore, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { URL_SITE } from '@/features/vitrine/seo';
import { servicesComptes } from './espace';

const db = () => getFirestore(appAdmin());

export function servicesDevis(): ServicesDevis & { cleIban?: Buffer } {
  const cleIban = cleChiffrementIban();
  return { db: db(), horloge: Date.now, ...(cleIban ? { cleIban } : {}) };
}

/**
 * Clé AES-256 des IBAN (secret `IBAN_CLE_CHIFFREMENT`, 32 octets en base64). Hors production
 * seulement, une clé de développement fixe ; en production sans secret, l'IBAN est refusé.
 */
function cleChiffrementIban(): Buffer | undefined {
  const b64 = process.env.IBAN_CLE_CHIFFREMENT;
  if (b64) {
    const cle = Buffer.from(b64, 'base64');
    return cle.length === 32 ? cle : undefined;
  }
  if (process.env.VERCEL_ENV === 'production') return undefined;
  return createHash('sha256').update('cle-iban-developpement-local-uniquement').digest();
}

const date = (v: unknown) => (v instanceof Timestamp ? v.toDate() : undefined);
const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');

/**
 * Logo de « Ma fiche » (déjà vérifié au dépôt) repris en haut des devis et factures. Un logo
 * absent, d'un autre dossier ou illisible : le PDF part sans lui.
 */
async function logoPdf(artisanId: string, url: string | undefined): Promise<Buffer | undefined> {
  const chemin = url ? cheminDepuisUrlPublique(url) : null;
  if (!chemin?.startsWith(`artisans/${artisanId}/logo/`)) return undefined;
  try {
    const [b] = await bucketFichiers().file(chemin).download();
    return b;
  } catch {
    return undefined;
  }
}

async function entreprise(artisanId: string) {
  const [p, a] = await Promise.all([
    db().doc(chemins.parametresFacturation(artisanId)).get(),
    db().doc(chemins.artisan(artisanId)).get(),
  ]);
  const tel = a.get('telephonePublic') as string | undefined;
  const logo = await logoPdf(artisanId, a.get('logoUrl') as string | undefined);
  const { ibanChiffre, ...parametres } = p.data() as ParametresFacturation & {
    tauxPenalitesAnnuel?: number;
    rcPro?: string;
    ibanChiffre?: string;
  };
  const cle = cleChiffrementIban();
  const iban = ibanChiffre && cle ? dechiffrer(ibanChiffre, cle) : null;
  return {
    logo,
    ...parametres,
    ...(iban ? { iban } : {}),
    ...(tel ? { telephone: formatTel(tel) } : {}),
    ...(a.get('emailContact') ? { email: a.get('emailContact') as string } : {}),
  };
}

/** Données du PDF d'un devis : conditions et annexes calculées depuis le document enregistré. */
function donneesDevis(
  numero: string,
  x: DocumentData,
  e: Omit<Awaited<ReturnType<typeof entreprise>>, 'logo'>,
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
  const { logo, ...ent } = e;
  const pdf = await genererPdf({
    ...donneesDevis(x.numero as string, x, ent),
    ...(logo ? { logo } : {}),
  });
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
    secrets: {
      lien: `${URL_SITE}/api/devis-client/${artisanId}.${devisId}.${jeton}`,
      ...(x.signatureElectronique
        ? { lienAccepter: `${URL_SITE}/devis-client/${artisanId}.${devisId}.${jeton}` }
        : {}),
    },
  });
  return { pdfPath, hashPdf: sha256(pdf), jetonHash: empreinteJeton(jeton) };
}

/** PDF d'une facture, produit une fois à l'émission puis servi tel quel. */
export async function produirePdfFacture(artisanId: string, factureId: string): Promise<void> {
  const ref = db().doc(chemins.factureClient(artisanId, factureId));
  const f = await ref.get();
  const x = f.data() as DocumentData;
  if (x.pdfPath) return;
  const { logo, ...e } = await entreprise(artisanId);
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
    ...(logo ? { logo } : {}),
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

/**
 * Lien du client : `artisanId.documentId.jeton`, vérifié par l'empreinte stockée sur le devis (envoi)
 * ou sur la facture (dernière relance).
 */
export async function pdfDuLienClient(
  lien: string,
  type: 'devis' | 'facture' = 'devis',
): Promise<{ pdf: Buffer; numero: string } | null> {
  const [artisanId, docId, jeton] = lien.split('.');
  if (!artisanId || !docId || !jeton || jeton.length < 20) return null;
  const chemin =
    type === 'devis' ? chemins.unDevis(artisanId, docId) : chemins.factureClient(artisanId, docId);
  const d = await db().doc(chemin).get();
  if (!d.exists || !d.get('pdfPath') || d.get('jetonHash') !== empreinteJeton(jeton)) return null;
  return { pdf: await lirePdf(d.get('pdfPath') as string), numero: d.get('numero') as string };
}

/** Résumé du devis pour la page du client (lien de l'email) ; `null` si le lien ne vaut rien. */
export async function devisPourClient(lien: string) {
  const l = lireLienClient(lien);
  if (!l) return null;
  const d = await db().doc(chemins.unDevis(l.artisanId, l.devisId)).get();
  if (!d.exists || d.get('jetonHash') !== empreinteJeton(l.jeton)) return null;
  const x = d.data() as DocumentData;
  const p = await db().doc(chemins.parametresFacturation(l.artisanId)).get();
  const validite = date(x.validiteLe);
  return {
    numero: x.numero as string,
    entreprise: (p.get('raisonSociale') as string | undefined) ?? '',
    objet: x.objet as string,
    montant: formatEuros(x.totaux.ttcCentimes as number, { decimales: 'toujours', suffixe: 'TTC' }),
    validite: validite ? formatDate(validite) : '',
    signature: signatureDevis(
      {
        statut: x.statut as string,
        signatureElectronique: x.signatureElectronique === true,
        ...(validite ? { validiteLe: validite } : {}),
      },
      Date.now(),
    ),
    signe: x.signature
      ? { nom: x.signature.nom as string, le: formatDate(date(x.signature.le)!) }
      : null,
  };
}
