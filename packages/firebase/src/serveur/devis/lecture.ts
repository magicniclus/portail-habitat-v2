import type { LigneDevis } from '@ph/core/devis';
import { artisanAAccepte } from '@ph/core/espace';
import type { StatutAttributionPro } from '@ph/core/espace-pro';
import { Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

const ms = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : undefined);
/** `AAAA-MM-JJ` pour les champs date des formulaires. */
const jour = (v: unknown) =>
  v instanceof Timestamp ? v.toDate().toISOString().slice(0, 10) : undefined;

export interface DevisResume {
  id: string;
  numero: string;
  statut: string;
  client: string;
  objet: string;
  ttcCentimes: number;
  creeLe: number;
  validiteLe?: number;
  factureId?: string;
}

export interface FactureResume {
  id: string;
  numero: string;
  type: 'facture' | 'acompte' | 'avoir';
  statut: string;
  client: string;
  devisNumero?: string;
  echeanceLe?: number;
  ttcCentimes: number;
  resteCentimes: number;
  annulee: boolean;
}

/** Liste « Devis » de l'espace pro : les 300 plus récents. */
export async function lireDevisListe(db: Firestore, artisanId: string): Promise<DevisResume[]> {
  const r = await db
    .collection(chemins.devis(artisanId))
    .orderBy('createdAt', 'desc')
    .limit(300)
    .get();
  return r.docs.map((d) => ({
    id: d.id,
    numero: (d.get('numero') as string | undefined) ?? '',
    statut: d.get('statut') as string,
    client: (d.get('client.nom') as string | undefined) ?? '',
    objet: (d.get('objet') as string | undefined) ?? '',
    ttcCentimes: (d.get('totaux.ttcCentimes') as number | undefined) ?? 0,
    creeLe: ms(d.get('createdAt')) ?? 0,
    validiteLe: ms(d.get('validiteLe')),
    factureId: d.get('factureId') as string | undefined,
  }));
}

/** Liste « Factures » : factures, acomptes et avoirs, du plus récent au plus ancien. */
export async function lireFacturesListe(
  db: Firestore,
  artisanId: string,
): Promise<FactureResume[]> {
  const r = await db
    .collection(chemins.facturesClients(artisanId))
    .orderBy('createdAt', 'desc')
    .limit(300)
    .get();
  return r.docs.map((d) => ({
    id: d.id,
    numero: d.get('numero') as string,
    type: d.get('type') as FactureResume['type'],
    statut: d.get('statut') as string,
    client: (d.get('client.nom') as string | undefined) ?? '',
    devisNumero: d.get('devisNumero') as string | undefined,
    echeanceLe: ms(d.get('echeanceLe')),
    ttcCentimes: (d.get('totaux.ttcCentimes') as number | undefined) ?? 0,
    resteCentimes: (d.get('resteCentimes') as number | undefined) ?? 0,
    annulee: Boolean(d.get('avoirId')),
  }));
}

export interface DevisComplet {
  id: string;
  numero: string;
  statut: string;
  client: { nom: string; email?: string; tel?: string; adresse: string };
  typeClient: 'particulier' | 'pro';
  sirenClient?: string;
  horsEtablissement: boolean;
  objet: string;
  descriptionHtml: string;
  lignes: LigneDevis[];
  remisePct: number;
  acomptePct: number;
  validiteLe?: string;
  debutTravauxLe?: string;
  dureeEstimee: string;
  fraisDeplacement: string;
  devisGratuit: boolean;
  notes: string;
  signatureElectronique: boolean;
  tampon: boolean;
  totaux: { htCentimes: number; ttcCentimes: number; tva: Record<string, number> };
  margeHtCentimes: number;
  mentionsManquantes: string[];
  envoiLe?: number;
  pdfPath?: string;
  factureId?: string;
  demandeId?: string;
  modeleId?: string;
}

export async function lireDevisComplet(
  db: Firestore,
  artisanId: string,
  devisId: string,
): Promise<DevisComplet | null> {
  const d = await db.doc(chemins.unDevis(artisanId, devisId)).get();
  if (!d.exists) return null;
  const x = d.data() as DocumentData;
  return {
    id: d.id,
    numero: x.numero,
    statut: x.statut,
    client: x.client,
    typeClient: x.typeClient,
    sirenClient: x.sirenClient,
    horsEtablissement: x.horsEtablissement,
    objet: x.objet,
    descriptionHtml: x.descriptionHtml,
    lignes: x.lignes,
    remisePct: x.remisePct,
    acomptePct: x.acomptePct,
    validiteLe: jour(x.validiteLe),
    debutTravauxLe: jour(x.debutTravauxLe),
    dureeEstimee: x.dureeEstimee,
    fraisDeplacement: x.fraisDeplacement,
    devisGratuit: x.devisGratuit,
    notes: x.notes,
    signatureElectronique: x.signatureElectronique,
    tampon: x.tampon,
    totaux: x.totaux,
    margeHtCentimes: x.margeHtCentimes,
    mentionsManquantes: x.mentionsManquantes ?? [],
    envoiLe: ms(x.envoiLe),
    pdfPath: x.pdfPath,
    factureId: x.factureId,
    demandeId: x.demandeId,
    modeleId: x.modeleId,
  };
}

export interface FactureComplete extends FactureResume {
  objet: string;
  lignes: LigneDevis[];
  totaux: { htCentimes: number; ttcCentimes: number; tva: Record<string, number> };
  paiements: { montantCentimes: number; moyen: string; le: number; ref?: string }[];
  acomptesDeduits: { numero: string; ttcCentimes: number }[];
  emiseLe?: number;
  pdfPath?: string;
  avoirId?: string;
  factureOrigineId?: string;
  motifAvoir?: string;
  relances: { le: number; type: string }[];
  /** L'email du client est connu (relances possibles). */
  aEmailClient: boolean;
}

export async function lireFactureComplete(
  db: Firestore,
  artisanId: string,
  factureId: string,
): Promise<FactureComplete | null> {
  const d = await db.doc(chemins.factureClient(artisanId, factureId)).get();
  if (!d.exists) return null;
  const x = d.data() as DocumentData;
  return {
    id: d.id,
    numero: x.numero,
    type: x.type,
    statut: x.statut,
    client: x.client?.nom ?? '',
    devisNumero: x.devisNumero,
    echeanceLe: ms(x.echeanceLe),
    ttcCentimes: x.totaux?.ttcCentimes ?? 0,
    resteCentimes: x.resteCentimes ?? 0,
    annulee: Boolean(x.avoirId),
    objet: x.objet ?? '',
    lignes: x.lignes ?? [],
    totaux: x.totaux,
    paiements: ((x.paiements ?? []) as DocumentData[]).map((p) => ({
      montantCentimes: p.montantCentimes,
      moyen: p.moyen,
      le: ms(p.le) ?? 0,
      ref: p.ref,
    })),
    acomptesDeduits: x.acomptesDeduits ?? [],
    emiseLe: ms(x.emiseLe),
    pdfPath: x.pdfPath,
    avoirId: x.avoirId,
    factureOrigineId: x.factureOrigineId,
    motifAvoir: x.motifAvoir,
    relances: ((x.relances ?? []) as DocumentData[]).map((r) => ({
      le: ms(r.le) ?? 0,
      type: r.type as string,
    })),
    aEmailClient: Boolean(x.client?.email),
  };
}

/** Paramètres de facturation tels qu'enregistrés ; `null` tant qu'ils n'ont pas été saisis. */
export async function lireParametresFacturation(
  db: Firestore,
  artisanId: string,
): Promise<Record<string, unknown> | null> {
  const d = await db.doc(chemins.parametresFacturation(artisanId)).get();
  if (!d.exists) return null;
  // L'IBAN chiffré ne quitte jamais le serveur : seuls ses 4 derniers caractères sont lus.
  const { updatedAt: _u, schemaVersion: _v, ibanChiffre: _i, ...reste } = d.data() as DocumentData;
  return reste;
}

/** Client et objet d'un devis créé depuis une demande acceptée (« Créer un devis »). */
export interface DevisDepuisDemande {
  demandeId: string;
  client: { nom: string; email: string; tel: string; adresse: string };
  objet: string;
  precisions: string;
}

/** `null` si la demande n'a pas été acceptée par l'entreprise : aucune coordonnée avant. */
export async function lireDevisDepuisDemande(
  db: Firestore,
  artisanId: string,
  demandeId: string,
  nomPrestation: (id: string) => string,
): Promise<DevisDepuisDemande | null> {
  const [a, d] = await Promise.all([
    db.doc(chemins.attribution(demandeId, artisanId)).get(),
    db.doc(chemins.demande(demandeId)).get(),
  ]);
  if (!a.exists || !d.exists || !artisanAAccepte(a.get('statut') as StatutAttributionPro))
    return null;
  const c = d.get('contact') as { prenom: string; nom: string; email: string; telephone: string };
  const lieu = d.get('adresseChantier') as { codePostal: string; ville: string };
  return {
    demandeId,
    client: {
      nom: `${c.prenom} ${c.nom}`.trim(),
      email: c.email,
      tel: c.telephone,
      adresse: `${lieu.codePostal} ${lieu.ville}`,
    },
    objet: nomPrestation(d.get('prestationId') as string),
    precisions: (d.get('precisions') as string | undefined) ?? '',
  };
}
