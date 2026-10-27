import {
  texteAdresse,
  type AdresseLivraison,
  type LigneDevis,
  type ModeSaisie,
  type NatureLigne,
  type TauxTva,
} from '@ph/core/devis';
import { parseEuros } from '@ph/core/format';
import type {
  BrouillonFacture,
  DevisComplet,
  DevisDepuisDemande,
  ModeleDevisResume,
} from '@ph/firebase/devis';

/** Ligne telle que saisie : montants en texte (« 78,50 »), convertis en centimes à l'envoi. */
export interface LigneSaisie {
  cle: string;
  /** Ligne de texte : désignation seule (titre, précision), hors totaux. */
  type: 'chiffree' | 'texte';
  nature: NatureLigne;
  designation: string;
  quantite: string;
  unite: string;
  puHt: string;
  tva: TauxTva;
  cout: string;
}

export interface ClientSaisi {
  nom: string;
  email: string;
  tel: string;
  adresse: string;
  complement?: string;
  codePostal?: string;
  ville?: string;
  pays?: string;
}

export interface EtatDevis {
  devisId?: string;
  numero?: string;
  client: ClientSaisi;
  typeClient: 'particulier' | 'pro';
  sirenClient: string;
  horsEtablissement: boolean;
  objet: string;
  descriptionHtml: string;
  lignes: LigneSaisie[];
  remisePct: string;
  acomptePct: string;
  validiteLe: string;
  debutTravauxLe: string;
  dureeEstimee: string;
  fraisDeplacement: string;
  devisGratuit: boolean;
  notes: string;
  signatureElectronique: boolean;
  tampon: boolean;
  demandeId?: string;
  modeleId?: string;
  /** Options de l'éditeur A4. */
  modeSaisie?: ModeSaisie;
  /** Adresse de livraison / du chantier en cases (Options › Client). */
  livraison?: AdresseLivraison;
  tvaIntraClient?: string;
  intitule?: string;
  libelleDebut?: string;
  conditionsAcceptation?: string;
  champSignature?: boolean;
  champLibre?: { titre: string; texte: string };
  /** Fiche de la base clients choisie (le document garde sa copie du client). */
  clientId?: string;
  /** « Enregistrer ce client dans ma base » coché (nouveau client). */
  enregistrerClient?: boolean;
  /** Brouillon de facture rouvert (émis ensuite avec son numéro). */
  factureId?: string;
  /** Facture sans devis : date de la prestation (AAAA-MM-JJ). */
  datePrestationLe?: string;
}

/** Conditions d'acceptation proposées sur un nouveau devis (modifiables sur la feuille). */
export const TEXTE_CONDITIONS_DEFAUT =
  'Pour être accepté, le devis doit être daté, signé et suivi de la mention manuscrite « Bon pour accord ».';

// Préfixe propre au serveur et au navigateur : une ligne créée côté navigateur ne reprend
// jamais la clé d'une ligne venue du serveur (compteurs repartis de zéro de chaque côté).
const prefixe = Math.random().toString(36).slice(2, 8);
let compteur = 0;
const cle = () => `l${prefixe}${++compteur}`;
const texteEuros = (c: number) => (c / 100).toFixed(2).replace('.', ',');
const nombre = (s: string) => {
  const n = Number(s.replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export const ligneVide = (tva: TauxTva): LigneSaisie => ({
  cle: cle(),
  type: 'chiffree',
  nature: 'prestation',
  designation: '',
  quantite: '1',
  unite: 'u',
  puHt: '',
  tva,
  cout: '',
});

/** Ligne de texte seul (« + Ligne de texte ») : titre ou précision, sans prix. */
export const ligneTexte = (tva: TauxTva): LigneSaisie => ({
  ...ligneVide(tva),
  type: 'texte',
  quantite: '',
  unite: '',
});

/** Ligne enregistrée (devis, modèle, ligne type) → ligne saisie. */
export const ligneSaisie = (
  l: Omit<LigneDevis, 'quantite' | 'designation'> & { quantite?: number; designation: string },
): LigneSaisie =>
  l.type === 'texte'
    ? { ...ligneTexte(l.tva), designation: l.designation }
    : {
        cle: cle(),
        type: 'chiffree',
        nature: l.nature ?? 'prestation',
        designation: l.designation,
        quantite: String(l.quantite ?? 1).replace('.', ','),
        unite: l.unite,
        puHt: texteEuros(l.puHtCentimes),
        tva: l.tva,
        cout: l.coutHtCentimes !== undefined ? texteEuros(l.coutHtCentimes) : '',
      };

/** Mode rapide (désignation, TVA, montant) : chaque ligne chiffrée devient « 1 × total ». */
export const versRapide = (lignes: readonly LigneSaisie[]): LigneSaisie[] =>
  lignes.map((l) => {
    if (l.type === 'texte' || nombre(l.quantite) === 1) return l;
    const total = Math.round(nombre(l.quantite) * (parseEuros(l.puHt) ?? 0));
    return { ...l, quantite: '1', puHt: texteEuros(total) };
  });

const optionsDe = (d: DevisComplet): Partial<EtatDevis> => ({
  ...(d.clientId ? { clientId: d.clientId } : {}),
  ...(d.modeSaisie ? { modeSaisie: d.modeSaisie } : {}),
  ...(d.livraison
    ? { livraison: d.livraison }
    : d.adresseChantier
      ? { livraison: { adresse: d.adresseChantier } }
      : {}),
  ...(d.tvaIntraClient ? { tvaIntraClient: d.tvaIntraClient } : {}),
  ...(d.intitule ? { intitule: d.intitule } : {}),
  ...(d.libelleDebut ? { libelleDebut: d.libelleDebut } : {}),
  ...(d.conditionsAcceptation ? { conditionsAcceptation: d.conditionsAcceptation } : {}),
  ...(d.champSignature ? { champSignature: true } : {}),
  ...(d.champLibre ? { champLibre: d.champLibre } : {}),
});

export function etatInitial(o: {
  devis?: DevisComplet;
  /** « Créer un devis » depuis une demande acceptée : client et objet repris. */
  demande?: DevisDepuisDemande;
  /** « Utiliser ce modèle » : lignes et titre repris. */
  modele?: ModeleDevisResume;
  acompteDefautPct: number;
  validiteJours: number;
  tvaDefaut: TauxTva;
  aujourdHui: number;
}): EtatDevis {
  const d = o.devis;
  if (d)
    return {
      devisId: d.id,
      numero: d.numero,
      client: { ...d.client, email: d.client.email ?? '', tel: d.client.tel ?? '' },
      typeClient: d.typeClient,
      sirenClient: d.sirenClient ?? '',
      horsEtablissement: d.horsEtablissement,
      objet: d.objet,
      descriptionHtml: d.descriptionHtml,
      lignes: d.lignes.map(ligneSaisie),
      remisePct: String(d.remisePct),
      acomptePct: String(d.acomptePct),
      validiteLe: d.validiteLe ?? '',
      debutTravauxLe: d.debutTravauxLe ?? '',
      dureeEstimee: d.dureeEstimee,
      fraisDeplacement: d.fraisDeplacement,
      devisGratuit: d.devisGratuit,
      notes: d.notes,
      signatureElectronique: d.signatureElectronique,
      tampon: d.tampon,
      demandeId: d.demandeId,
      modeleId: d.modeleId,
      ...optionsDe(d),
    };
  const m = o.demande;
  return {
    client: m ? { ...m.client } : { nom: '', email: '', tel: '', adresse: '' },
    typeClient: 'particulier',
    sirenClient: '',
    horsEtablissement: false,
    objet: m?.objet ?? o.modele?.titre ?? '',
    descriptionHtml: '',
    ...(m ? { demandeId: m.demandeId } : {}),
    ...(o.modele ? { modeleId: o.modele.id } : {}),
    lignes: o.modele?.lignes.length ? o.modele.lignes.map(ligneSaisie) : [ligneVide(o.tvaDefaut)],
    remisePct: '0',
    acomptePct: String(o.acompteDefautPct),
    validiteLe: new Date(o.aujourdHui + o.validiteJours * 86_400_000).toISOString().slice(0, 10),
    debutTravauxLe: '',
    dureeEstimee: '',
    fraisDeplacement: '',
    devisGratuit: true,
    notes: '',
    signatureElectronique: false,
    tampon: false,
    conditionsAcceptation: TEXTE_CONDITIONS_DEFAUT,
    champSignature: true,
  };
}

/** Lignes en centimes, pour les totaux affichés et l'enregistrement. */
export const lignesCentimes = (lignes: readonly LigneSaisie[]): LigneDevis[] =>
  lignes.map((l) =>
    l.type === 'texte'
      ? {
          type: 'texte',
          designation: l.designation.trim(),
          quantite: 0,
          unite: '',
          puHtCentimes: 0,
          tva: l.tva,
        }
      : {
          ...(l.nature === 'fourniture' ? { nature: 'fourniture' as const } : {}),
          designation: l.designation.trim(),
          quantite: nombre(l.quantite),
          unite: l.unite.trim(),
          puHtCentimes: parseEuros(l.puHt) ?? 0,
          tva: l.tva,
          ...(parseEuros(l.cout) !== null ? { coutHtCentimes: parseEuros(l.cout)! } : {}),
        },
  );

const borner = (s: string) => Math.min(100, Math.max(0, nombre(s)));
/** `{ cle: valeur }` si le texte n'est pas vide (les champs vides ne partent pas). */
const siRempli = <K extends string>(cle: K, v: string | undefined) =>
  v?.trim() ? ({ [cle]: v.trim() } as Record<K, string>) : {};

/** Cases de l'adresse de livraison remplies, et leur texte imprimé (recalculé par le serveur). */
function livraisonEntree(l: AdresseLivraison | undefined) {
  if (!l) return {};
  const cases = Object.fromEntries(
    Object.entries(l).flatMap(([k, v]) => (v?.trim() ? [[k, v.trim()]] : [])),
  ) as AdresseLivraison;
  const texte = texteAdresse(cases);
  return texte ? { livraison: cases, adresseChantier: texte } : {};
}

/** Entrée de `POST /api/pro/devis` (schéma `entreeEnregistrerDevis`). */
export function versEntree(e: EtatDevis) {
  const c = e.client;
  const client = {
    nom: c.nom.trim(),
    adresse: c.adresse.trim(),
    ...siRempli('email', c.email),
    ...siRempli('tel', c.tel),
    ...siRempli('complement', c.complement),
    ...siRempli('codePostal', c.codePostal),
    ...siRempli('ville', c.ville),
    ...siRempli('pays', c.pays),
  };
  return {
    ...(e.devisId ? { devisId: e.devisId } : {}),
    client,
    typeClient: e.typeClient,
    ...(e.typeClient === 'pro' ? siRempli('sirenClient', e.sirenClient) : {}),
    horsEtablissement: e.horsEtablissement,
    objet: e.objet.trim(),
    descriptionHtml: e.descriptionHtml,
    lignes: lignesCentimes(e.lignes),
    remisePct: borner(e.remisePct),
    acomptePct: borner(e.acomptePct),
    ...(e.validiteLe ? { validiteLe: e.validiteLe } : {}),
    ...(e.debutTravauxLe ? { debutTravauxLe: e.debutTravauxLe } : {}),
    dureeEstimee: e.dureeEstimee.trim(),
    fraisDeplacement: e.fraisDeplacement.trim(),
    devisGratuit: e.devisGratuit,
    notes: e.notes,
    signatureElectronique: e.signatureElectronique,
    tampon: e.tampon,
    ...(e.demandeId ? { demandeId: e.demandeId } : {}),
    ...(e.modeleId ? { modeleId: e.modeleId } : {}),
    ...(e.clientId ? { clientId: e.clientId } : {}),
    ...(e.modeSaisie ? { modeSaisie: e.modeSaisie } : {}),
    ...livraisonEntree(e.livraison),
    ...siRempli('tvaIntraClient', e.tvaIntraClient),
    ...siRempli('intitule', e.intitule),
    ...siRempli('libelleDebut', e.libelleDebut),
    ...siRempli('conditionsAcceptation', e.conditionsAcceptation),
    ...(e.champSignature ? { champSignature: true } : {}),
    ...(e.champLibre?.texte.trim()
      ? { champLibre: { titre: e.champLibre.titre.trim(), texte: e.champLibre.texte.trim() } }
      : {}),
  };
}

/**
 * Entrée de `POST /api/pro/factures` (« Nouvelle facture », schéma `entreeCreerFacture`) : la
 * même saisie que le devis, sans ce qui n'existe que sur un devis (validité, acompte, travaux,
 * intitulé, conditions d'acceptation, signature).
 */
export function versEntreeFacture(e: EtatDevis, cleIdempotence: string) {
  return {
    ...versEntreeBrouillonFacture(e),
    datePrestationLe: e.datePrestationLe ?? '',
    cleIdempotence,
  };
}

/** Entrée de `POST /api/pro/factures/brouillon` (sans numéro, date de prestation facultative). */
export function versEntreeBrouillonFacture(e: EtatDevis) {
  const d = versEntree(e);
  return {
    ...(e.factureId ? { factureId: e.factureId } : {}),
    client: d.client,
    typeClient: d.typeClient,
    ...(e.typeClient === 'pro' ? siRempli('sirenClient', e.sirenClient) : {}),
    objet: d.objet,
    lignes: d.lignes,
    remisePct: d.remisePct,
    ...(e.datePrestationLe ? { datePrestationLe: e.datePrestationLe } : {}),
    ...(d.modeSaisie ? { modeSaisie: d.modeSaisie } : {}),
    ...(e.clientId ? { clientId: e.clientId } : {}),
    ...livraisonEntree(e.livraison),
    ...siRempli('tvaIntraClient', e.tvaIntraClient),
    ...(d.champLibre ? { champLibre: d.champLibre } : {}),
  };
}

/** Brouillon de facture → saisie de l'éditeur. */
export function etatBrouillonFacture(
  b: BrouillonFacture,
  o: { tvaDefaut: TauxTva; aujourdHui: number },
): EtatDevis {
  return {
    ...etatInitial({ acompteDefautPct: 0, validiteJours: 0, ...o }),
    factureId: b.id,
    client: { ...b.client, email: b.client.email ?? '', tel: b.client.tel ?? '' },
    typeClient: b.typeClient,
    sirenClient: b.sirenClient ?? '',
    objet: b.objet,
    lignes: b.lignes.length ? b.lignes.map(ligneSaisie) : [ligneVide(o.tvaDefaut)],
    remisePct: String(b.remisePct),
    datePrestationLe: b.datePrestationLe
      ? new Date(b.datePrestationLe).toISOString().slice(0, 10)
      : '',
    ...(b.modeSaisie ? { modeSaisie: b.modeSaisie } : {}),
    ...(b.tvaIntraClient ? { tvaIntraClient: b.tvaIntraClient } : {}),
    ...(b.champLibre ? { champLibre: b.champLibre } : {}),
    ...(b.clientId ? { clientId: b.clientId } : {}),
    ...(b.livraison ? { livraison: b.livraison } : {}),
  };
}
