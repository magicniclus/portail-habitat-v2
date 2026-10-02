import { formatEuros } from '@ph/core/format';
import { alerte, bouton, note, para, recap, titre } from '../blocs';
import { bonjour, modele } from '../modele';

/** EMAILS §4.6 : facturation (webhooks Stripe, charte orange, catégorie transactionnel). */

const OFFRES: Record<string, string> = { premium: 'Premium', visibilite: 'Option Visibilité' };
const offre = (p: string) => OFFRES[p] ?? p;
const periode = (p: string) =>
  p === 'annuel' ? 'annuelle (12 mois payés en une fois)' : 'mensuelle, sans engagement';
const ttc = (c: number) => formatEuros(c, { decimales: 'toujours', suffixe: 'TTC' });

interface Abonnement {
  prenom?: string;
  nomCommercial: string;
  produit: string;
  periode: string;
  /** Date de fin de période, déjà mise en forme (« 1 novembre 2026 »). */
  finPeriode: string;
  lien: string;
}
interface Facture {
  prenom?: string;
  nomCommercial: string;
  numero: string;
  montantTtcCentimes: number;
  lien: string;
  lienFacture?: string;
}
interface Pack {
  prenom?: string;
  nomCommercial: string;
  credits: number;
  soldeCredits: number;
  lien: string;
}

const EX: Abonnement = {
  prenom: 'Julien',
  nomCommercial: 'Bertrand Rénovation',
  produit: 'premium',
  periode: 'annuel',
  finPeriode: '1 octobre 2027',
  lien: 'https://portailhabitat.fr/pro/facturation',
};
const EX_FACTURE: Facture = {
  prenom: 'Julien',
  nomCommercial: 'Bertrand Rénovation',
  numero: 'PH-2026-0042',
  montantTtcCentimes: 115_056,
  lien: 'https://portailhabitat.fr/pro/facturation',
  lienFacture: 'https://invoice.stripe.com/i/exemple',
};

export const modelesFacturation = {
  'abonnement-active': modele<Abonnement>({
    sujet: (d) => `${offre(d.produit)} est activé pour ${d.nomCommercial}`.slice(0, 59),
    preheader: () => 'Merci ! Votre abonnement est actif dès maintenant.',
    blocs: (d) => [
      titre(`Bienvenue dans ${offre(d.produit)}`),
      para(`${bonjour(d.prenom)}votre abonnement est actif pour ${d.nomCommercial}.`),
      recap([
        ['Formule', offre(d.produit), true],
        ['Facturation', periode(d.periode)],
        ['Prochaine échéance', d.finPeriode],
      ]),
      bouton('Voir mon abonnement', d.lien),
      note('Vos factures sont disponibles à tout moment dans l’onglet Facturation.'),
    ],
    exemple: EX,
  }),
  recu: modele<Facture>({
    sujet: (d) => `Reçu de paiement ${d.numero}`,
    preheader: (d) => `${ttc(d.montantTtcCentimes)} payés. Facture disponible en ligne.`,
    blocs: (d) => [
      titre('Paiement reçu, merci'),
      para(`${bonjour(d.prenom)}nous avons bien reçu votre paiement pour ${d.nomCommercial}.`),
      recap([
        ['Facture', d.numero],
        ['Montant', ttc(d.montantTtcCentimes), true],
      ]),
      bouton('Télécharger la facture', d.lienFacture ?? d.lien),
    ],
    exemple: EX_FACTURE,
  }),
  'paiement-echoue': modele<Facture>({
    sujet: () => 'Votre paiement n’a pas abouti',
    preheader: () => 'Mettez à jour votre carte pour garder votre abonnement.',
    blocs: (d) => [
      titre('Votre paiement n’a pas abouti'),
      para(
        `${bonjour(d.prenom)}le paiement de ${ttc(d.montantTtcCentimes)} pour ${d.nomCommercial} a été refusé par votre banque.`,
      ),
      alerte(
        'Sans nouveau paiement sous 7 jours, votre abonnement repasse à la formule gratuite.',
        'warn',
      ),
      bouton('Mettre à jour ma carte', d.lien),
      note('Nous réessayons automatiquement le paiement dans les prochains jours.'),
    ],
    exemple: EX_FACTURE,
  }),
  renouvellement: modele<Abonnement & { montantTtcCentimes: number }>({
    sujet: () => 'Votre abonnement se renouvelle dans 7 jours',
    preheader: (d) => `${offre(d.produit)} : ${ttc(d.montantTtcCentimes)} le ${d.finPeriode}.`,
    blocs: (d) => [
      titre('Renouvellement de votre abonnement'),
      para(
        `${bonjour(d.prenom)}votre abonnement annuel ${offre(d.produit)} pour ${d.nomCommercial} se renouvelle automatiquement le ${d.finPeriode}.`,
      ),
      recap([
        ['Formule', offre(d.produit)],
        ['Montant', ttc(d.montantTtcCentimes), true],
        ['Date', d.finPeriode],
      ]),
      bouton('Gérer mon abonnement', d.lien),
      note('Vous pouvez résilier avant cette date depuis l’onglet Facturation, sans frais.'),
    ],
    exemple: { ...EX, montantTtcCentimes: 115_056 },
  }),
  'abonnement-resilie': modele<Abonnement>({
    sujet: () => 'Votre résiliation est enregistrée',
    preheader: (d) => `${offre(d.produit)} reste actif jusqu’au ${d.finPeriode}.`,
    blocs: (d) => [
      titre('Résiliation enregistrée'),
      para(
        `${bonjour(d.prenom)}${offre(d.produit)} reste actif pour ${d.nomCommercial} jusqu’au ${d.finPeriode}, puis votre fiche repasse à la formule gratuite.`,
      ),
      recap([
        ['Fin de l’abonnement', d.finPeriode, true],
        ['Ensuite', 'fiche gratuite, sans mise en avant ni demandes garanties'],
      ]),
      bouton('Annuler la résiliation', d.lien),
    ],
    exemple: EX,
  }),
  'abonnement-termine': modele<Abonnement>({
    sujet: (d) => `${offre(d.produit)} est terminé`,
    preheader: () => 'Votre fiche reste en ligne avec la formule gratuite.',
    blocs: (d) => [
      titre(`${offre(d.produit)} est terminé`),
      para(
        `${bonjour(d.prenom)}l’abonnement de ${d.nomCommercial} est terminé. Votre fiche reste visible avec la formule gratuite.`,
      ),
      bouton('Reprendre un abonnement', d.lien),
    ],
    exemple: EX,
  }),
  'pack-achete': modele<Pack>({
    sujet: (d) => `${d.credits} crédits ajoutés à votre compte`,
    preheader: (d) => `Nouveau solde : ${d.soldeCredits} crédits.`,
    blocs: (d) => [
      titre('Crédits ajoutés'),
      para(
        `${bonjour(d.prenom)}votre pack de ${d.credits} crédits est disponible pour ${d.nomCommercial}.`,
      ),
      recap([
        ['Crédits ajoutés', String(d.credits)],
        ['Nouveau solde', String(d.soldeCredits), true],
      ]),
      bouton('Voir les appels d’offres', d.lien),
    ],
    exemple: {
      prenom: 'Julien',
      nomCommercial: 'Bertrand Rénovation',
      credits: 10,
      soldeCredits: 14,
      lien: 'https://portailhabitat.fr/pro/facturation',
    },
  }),
};
