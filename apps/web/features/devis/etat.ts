import type { LigneDevis, TauxTva } from '@ph/core/devis';
import { parseEuros } from '@ph/core/format';
import type { DevisComplet, DevisDepuisDemande } from '@ph/firebase/devis';

/** Ligne telle que saisie : montants en texte (« 78,50 »), convertis en centimes à l'envoi. */
export interface LigneSaisie {
  cle: string;
  designation: string;
  quantite: string;
  unite: string;
  puHt: string;
  tva: TauxTva;
  cout: string;
}

export interface EtatDevis {
  devisId?: string;
  numero?: string;
  client: { nom: string; email: string; tel: string; adresse: string };
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
}

let compteur = 0;
const cle = () => `l${++compteur}`;
const texteEuros = (c: number) => (c / 100).toFixed(2).replace('.', ',');
const nombre = (s: string) => {
  const n = Number(s.replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export const ligneVide = (tva: TauxTva): LigneSaisie => ({
  cle: cle(),
  designation: '',
  quantite: '1',
  unite: 'u',
  puHt: '',
  tva,
  cout: '',
});

export function etatInitial(o: {
  devis?: DevisComplet;
  /** « Créer un devis » depuis une demande acceptée : client et objet repris. */
  demande?: DevisDepuisDemande;
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
      client: {
        nom: d.client.nom,
        email: d.client.email ?? '',
        tel: d.client.tel ?? '',
        adresse: d.client.adresse,
      },
      typeClient: d.typeClient,
      sirenClient: d.sirenClient ?? '',
      horsEtablissement: d.horsEtablissement,
      objet: d.objet,
      descriptionHtml: d.descriptionHtml,
      lignes: d.lignes.map((l) => ({
        cle: cle(),
        designation: l.designation,
        quantite: String(l.quantite).replace('.', ','),
        unite: l.unite,
        puHt: texteEuros(l.puHtCentimes),
        tva: l.tva,
        cout: l.coutHtCentimes !== undefined ? texteEuros(l.coutHtCentimes) : '',
      })),
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
    };
  const m = o.demande;
  return {
    client: m ? { ...m.client } : { nom: '', email: '', tel: '', adresse: '' },
    typeClient: 'particulier',
    sirenClient: '',
    horsEtablissement: false,
    objet: m?.objet ?? '',
    descriptionHtml: '',
    ...(m ? { demandeId: m.demandeId } : {}),
    lignes: [ligneVide(o.tvaDefaut)],
    remisePct: '0',
    acomptePct: String(o.acompteDefautPct),
    validiteLe: new Date(o.aujourdHui + o.validiteJours * 86_400_000).toISOString().slice(0, 10),
    debutTravauxLe: '',
    dureeEstimee: '',
    fraisDeplacement: 'Inclus',
    devisGratuit: true,
    notes: '',
    signatureElectronique: false,
    tampon: false,
  };
}

/** Lignes en centimes, pour les totaux affichés et l'enregistrement. */
export const lignesCentimes = (lignes: readonly LigneSaisie[]): LigneDevis[] =>
  lignes.map((l) => ({
    designation: l.designation.trim(),
    quantite: nombre(l.quantite),
    unite: l.unite.trim(),
    puHtCentimes: parseEuros(l.puHt) ?? 0,
    tva: l.tva,
    ...(parseEuros(l.cout) !== null ? { coutHtCentimes: parseEuros(l.cout)! } : {}),
  }));

const borner = (s: string) => Math.min(100, Math.max(0, nombre(s)));

/** Entrée de `POST /api/pro/devis` (schéma `entreeEnregistrerDevis`). */
export function versEntree(e: EtatDevis) {
  const client = {
    nom: e.client.nom.trim(),
    adresse: e.client.adresse.trim(),
    ...(e.client.email.trim() ? { email: e.client.email.trim() } : {}),
    ...(e.client.tel.trim() ? { tel: e.client.tel.trim() } : {}),
  };
  return {
    ...(e.devisId ? { devisId: e.devisId } : {}),
    client,
    typeClient: e.typeClient,
    ...(e.typeClient === 'pro' && e.sirenClient.trim()
      ? { sirenClient: e.sirenClient.trim() }
      : {}),
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
  };
}
