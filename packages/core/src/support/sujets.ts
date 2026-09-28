/** Sujets du formulaire Aide et contact (maquette Contact). `ref` : libellé du champ de précision facultatif. */
export const SUJETS_CONTACT = [
  {
    id: 'question',
    label: 'Une question sur un projet de travaux',
    aide: "Prix, démarches, choix d'un artisan : décrivez votre projet en quelques lignes.",
  },
  {
    id: 'diagnostic',
    label: 'Un diagnostic immobilier',
    aide: "Précisez le type de bien, la commune et s'il s'agit d'une vente ou d'une location.",
  },
  {
    id: 'demande',
    label: 'Le suivi de ma demande',
    aide: "Indiquez la référence reçue par email si vous l'avez.",
    ref: 'Référence de la demande',
  },
  {
    id: 'mediation',
    label: 'Un litige avec un artisan (médiation)',
    aide: "Décrivez ce qui s'est passé. Notre équipe contacte l'artisan avant toute autre démarche.",
    ref: "Nom de l'entreprise",
  },
  {
    id: 'ajout-artisan',
    label: 'Ajouter une entreprise introuvable',
    aide: "Donnez le nom, la commune et si possible le SIRET de l'entreprise.",
    ref: "Nom de l'entreprise",
  },
  {
    id: 'signalement',
    label: 'Signaler un contenu ou un avis',
    aide: "Indiquez l'adresse de la page et le motif du signalement.",
    ref: 'Adresse de la page',
  },
  {
    id: 'donnees',
    label: 'Mes données personnelles (RGPD)',
    aide: "Accès, rectification, suppression : répondez depuis l'email lié à votre compte.",
  },
  {
    id: 'juridique',
    label: 'Une question juridique ou une réclamation',
    aide: 'Précisez le document concerné (CGU, mentions légales…).',
  },
  {
    id: 'inscription-pro',
    label: 'Inscrire mon entreprise',
    aide: 'Indiquez votre métier, votre commune et votre SIRET : nous créons votre fiche avec vous.',
    ref: 'SIRET',
  },
  {
    id: 'pro',
    label: 'Mon espace professionnel',
    aide: 'Connexion, fiche, abonnement : décrivez la difficulté rencontrée.',
  },
] as const;

export type SujetContact = (typeof SUJETS_CONTACT)[number]['id'];
export const IDS_SUJETS = SUJETS_CONTACT.map((s) => s.id) as [SujetContact, ...SujetContact[]];

export const sujetContact = (id: string | null | undefined) =>
  SUJETS_CONTACT.find((s) => s.id === id) ?? SUJETS_CONTACT[0];

/** Référence lisible donnée à l'usager (« CT-7K2Q9M ») ; `alea` fournit 6 entiers de 0 à 31. */
export function referenceContact(alea: () => number): string {
  const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let r = '';
  for (let i = 0; i < 6; i++) r += ALPHABET[Math.floor(alea() * 32) % 32];
  return `CT-${r}`;
}
