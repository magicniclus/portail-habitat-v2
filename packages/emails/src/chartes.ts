import type { Charte, Categorie } from '@ph/core/notifications';
import { actions, rampes, suffixesLogo, type Theme } from '@ph/ui/tokens';

export interface CharteEmail {
  theme: Theme;
  accent: string;
  /** Fond des boutons (contraste AA, D45). */
  action: string;
  clair: string;
  clair2: string;
  fonce: string;
  suffixe: string;
  signature: string;
}

const SIGNATURES: Record<Theme, string> = {
  particulier: 'L’équipe Portail Habitat',
  pro: 'L’équipe Portail Habitat Pro',
  diag: 'L’équipe Portail Habitat Diag',
  admin: 'Back-office Portail Habitat · envoi automatique',
};

/** Charte d'un email ; `destinataire` : charte de l'espace de la personne (particulier par défaut). */
export function charteEmail(c: Charte, espaceDestinataire: Theme = 'particulier'): CharteEmail {
  const theme = c === 'destinataire' ? espaceDestinataire : c;
  const r = rampes[theme];
  return {
    theme,
    accent: r.base,
    action: actions[theme],
    clair: r[100],
    clair2: r[300],
    fonce: r[700],
    suffixe: suffixesLogo[theme],
    signature: SIGNATURES[theme],
  };
}

/** Pourquoi la personne reçoit l'email, et si le désabonnement en un clic est proposé (EMAILS §2). */
export const RAISONS: Record<Categorie, { raison: string; desabonnable: boolean }> = {
  securite: {
    raison:
      'Email de sécurité envoyé suite à une action sur votre compte. Il ne peut pas être désactivé.',
    desabonnable: false,
  },
  transactionnel: {
    raison: 'Vous recevez cet email suite à une action sur Portail Habitat.',
    desabonnable: false,
  },
  activite: {
    raison: 'Vous recevez cet email car les notifications d’activité sont activées.',
    desabonnable: true,
  },
  relance: {
    raison: 'Vous recevez cet email car votre démarche n’est pas terminée. 3 relances au maximum.',
    desabonnable: true,
  },
  offres_pro: {
    raison:
      'Vous recevez cet email en tant que professionnel du bâtiment ayant utilisé Portail Habitat Pro. Désabonnement en un clic.',
    desabonnable: true,
  },
  marketing: {
    raison: 'Vous recevez cet email car vous avez accepté les actualités de Portail Habitat.',
    desabonnable: true,
  },
  interne: { raison: 'Envoi automatique du back-office.', desabonnable: false },
};
