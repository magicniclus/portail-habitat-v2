import { MODELES, type NomModele } from '@ph/core/notifications';
import { bouton, para, titre } from '../blocs';
import { modele, type Modele } from '../modele';

/** Sujets des modèles rédigés dans les lots suivants (EMAILS §4.4 à 4.8) : squelettes en attendant. */
const SUJETS: Partial<Record<NomModele, string>> = {
  'reprise-simulateur-rappel': 'Votre estimation vous attend',
  'demande-confirmee': 'Votre demande est enregistrée',
  'demande-sans-artisan': 'Nous cherchons toujours un artisan',
  'artisan-a-repondu': 'Un artisan a répondu à votre demande',
  'devis-recu': 'Vous avez reçu un devis',
  'nouveau-message': 'Nouveau message',
  'relance-devis': 'Un devis attend votre réponse',
  'demande-avis': 'Comment s’est passé votre chantier ?',
  'rappel-avis': 'Votre avis aide les autres particuliers',
  'avis-recu': 'Merci pour votre avis',
  'avis-publie': 'Votre avis est publié',
  'avis-refuse': 'Votre avis n’a pas été publié',
  'avis-preuve-demandee': 'Une preuve est demandée pour votre avis',
  'reponse-artisan-avis': 'L’artisan a répondu à votre avis',
  'dossier-diag-confirme': 'Votre dossier de diagnostics est enregistré',
  'compte-inactif': 'Votre compte va être supprimé',
  'nouvelle-demande': 'Nouvelle demande de devis',
  'relance-demande': 'Une demande attend votre réponse',
  'demande-expiree': 'Une demande a expiré',
  'devis-accepte': 'Votre devis a été accepté',
  'devis-refuse': 'Votre devis n’a pas été retenu',
  'nouvel-appel-offres': 'Nouvel appel d’offres dans votre zone',
  'resume-appels-offres': 'Les appels d’offres du jour',
  'lead-debloque': 'Coordonnées débloquées',
  'credits-faibles': 'Il vous reste peu de crédits',
  'credits-expirent': 'Des crédits vont expirer',
  'remboursement-lead': 'Décision sur votre contestation',
  'nouvel-avis': 'Vous avez reçu un nouvel avis',
  'avis-signale-decision': 'Décision sur votre signalement',
  'assurance-expire': 'Votre attestation décennale expire bientôt',
  'rapport-hebdo': 'Votre semaine sur Portail Habitat',
  'rapport-mensuel': 'Votre mois sur Portail Habitat',
  'avertissement-charte': 'Avertissement concernant la charte',
  suspension: 'Votre fiche est suspendue',
  'levee-sanction': 'Votre fiche est de nouveau active',
  'abonnement-active': 'Votre abonnement est actif',
  recu: 'Votre reçu',
  'paiement-echoue': 'Votre paiement n’a pas abouti',
  renouvellement: 'Votre abonnement va être renouvelé',
  'abonnement-resilie': 'Résiliation enregistrée',
  'abonnement-termine': 'Votre abonnement est terminé',
  'pack-achete': 'Vos crédits sont disponibles',
  'moyen-paiement-expire': 'Votre carte expire bientôt',
  'resume-file': 'File de travail',
  'alerte-urgente': 'Alerte urgente',
  'rgpd-demande': 'Nouvelle demande RGPD',
  'ia-synthese-hebdo': 'Synthèse IA de la semaine',
  'alerte-budget': 'Alerte budget',
};

const sujetPar = (nom: string) =>
  SUJETS[nom as NomModele] ?? nom.replace(/-/g, ' ').replace(/^./, (x) => x.toUpperCase());

interface Squelette {
  message: string;
  lien: string;
}

/** Squelette : titre = sujet, un paragraphe, un bouton. Remplacé par le vrai modèle dans son lot. */
export function squelette(nom: string): Modele<Squelette> {
  const sujet = sujetPar(nom);
  return modele<Squelette>({
    sujet: () => sujet,
    preheader: (d) => d.message,
    blocs: (d) => [titre(sujet), para(d.message), bouton('Voir le détail', d.lien)],
    exemple: { message: 'Contenu rédigé dans le lot concerné.', lien: 'https://portailhabitat.fr' },
  });
}

export const nomsSquelettes = (redigés: readonly string[]) =>
  (Object.keys(MODELES) as NomModele[]).filter((n) => !redigés.includes(n));
