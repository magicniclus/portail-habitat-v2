import { alerte, bouton, note, para, recap, titre } from '../blocs';
import { bonjour, modele } from '../modele';

/** EMAILS §4.3 : équipes (charte orange). */
const ROLES: Record<string, string> = {
  proprietaire: 'Propriétaire',
  gerant: 'Gérant',
  collaborateur: 'Collaborateur',
  comptable: 'Comptable',
};
const POUVOIRS: Record<string, string> = {
  gerant: 'Gérer les demandes, la fiche, l’équipe et l’abonnement',
  collaborateur: 'Répondre aux demandes, envoyer des devis, ajouter des réalisations',
  comptable: 'Consulter et télécharger les factures',
  proprietaire: 'Tous les droits sur l’entreprise',
};
const libelleRole = (r: string) => ROLES[r] ?? r;

interface Equipe {
  prenom?: string;
  nomCommercial: string;
  lien: string;
}
interface Invitation extends Equipe {
  invitant: string;
  role: string;
  ville: string;
  expireLe: string;
  emailMasque: string;
}
const EX: Equipe = {
  prenom: 'Léa',
  nomCommercial: 'Bertrand Rénovation',
  lien: 'https://portailhabitat.fr/pro/equipe',
};
const EX_INV: Invitation = {
  ...EX,
  invitant: 'Julien Bertrand',
  role: 'collaborateur',
  ville: 'Bordeaux',
  expireLe: '2 octobre 2026',
  emailMasque: 'l•••@g•••.com',
  lien: 'https://portailhabitat.fr/pro/invitation?t=exemple',
};

export const modelesEquipes = {
  'invitation-membre': modele<Invitation>({
    sujet: (d) =>
      `${d.invitant.split(' ')[0]} vous invite à rejoindre ${d.nomCommercial}`.slice(0, 60),
    preheader: (d) => `Rôle : ${libelleRole(d.role).toLowerCase()}. Invitation valable 7 jours.`,
    blocs: (d) => [
      titre(`Rejoignez l’équipe ${d.nomCommercial}`),
      para(
        `${d.invitant} vous invite à gérer les demandes de devis de l’entreprise sur Portail Habitat Pro.`,
      ),
      recap([
        ['Entreprise', `${d.nomCommercial} · ${d.ville}`],
        ['Votre rôle', libelleRole(d.role), true],
        ['Vous pourrez', POUVOIRS[d.role] ?? ''],
      ]),
      bouton('Accepter l’invitation', d.lien),
      note(
        `Invitation valable jusqu’au ${d.expireLe}, destinée à ${d.emailMasque}. Vous ne connaissez pas ${d.invitant} ? Ignorez cet email.`,
      ),
    ],
    exemple: EX_INV,
  }),
  'invitation-relance': modele<Invitation>({
    sujet: (d) => `Rappel : ${d.nomCommercial} vous attend`,
    preheader: (d) => `Invitation valable jusqu’au ${d.expireLe}.`,
    blocs: (d) => [
      titre(`${d.invitant} vous attend`),
      para(
        `Vous avez été invité à rejoindre ${d.nomCommercial} en tant que ${libelleRole(d.role).toLowerCase()}.`,
      ),
      bouton('Accepter l’invitation', d.lien),
      note(`Invitation valable jusqu’au ${d.expireLe}.`),
    ],
    exemple: EX_INV,
  }),
  'invitation-acceptee': modele<Equipe & { membre: string; role: string }>({
    sujet: (d) => `${d.membre} a rejoint votre équipe`,
    preheader: (d) => `Rôle : ${libelleRole(d.role).toLowerCase()}.`,
    blocs: (d) => [
      titre(`${d.membre} a rejoint ${d.nomCommercial}`),
      recap([['Rôle', libelleRole(d.role), true]]),
      bouton('Voir mon équipe', d.lien),
    ],
    exemple: { ...EX, membre: 'Léa Durand', role: 'collaborateur' },
  }),
  'invitation-expiree': modele<Equipe & { emailMasque: string }>({
    sujet: () => 'Une invitation a expiré',
    preheader: (d) => `L’invitation envoyée à ${d.emailMasque} n’a pas été acceptée.`,
    blocs: (d) => [
      titre('Invitation expirée'),
      para(`L’invitation envoyée à ${d.emailMasque} n’a pas été acceptée dans les 7 jours.`),
      bouton('Renvoyer l’invitation', d.lien),
    ],
    exemple: { ...EX, emailMasque: 'l•••@g•••.com' },
  }),
  'demande-acces': modele<Equipe & { demandeur: string; message?: string }>({
    sujet: (d) => `${d.demandeur} demande à rejoindre votre équipe`,
    preheader: () => 'Acceptez en choisissant un rôle, ou refusez.',
    blocs: (d) => [
      titre('Demande pour rejoindre votre équipe'),
      para(`${d.demandeur} souhaite rejoindre ${d.nomCommercial} sur Portail Habitat Pro.`),
      ...(d.message ? [{ type: 'citation' as const, texte: `« ${d.message} »` }] : []),
      bouton('Répondre à la demande', d.lien),
      note('Sans réponse sous 14 jours, la demande expire automatiquement.'),
    ],
    exemple: { ...EX, demandeur: 'Hugo Martin', message: 'Je suis le nouveau chef de chantier.' },
  }),
  'demande-acces-reponse': modele<Equipe & { acceptee: boolean; role?: string }>({
    sujet: (d) =>
      d.acceptee
        ? `Bienvenue dans l’équipe ${d.nomCommercial}`
        : 'Votre demande n’a pas été acceptée',
    preheader: (d) =>
      d.acceptee
        ? `Rôle : ${libelleRole(d.role ?? '').toLowerCase()}.`
        : `Réponse de ${d.nomCommercial}.`,
    blocs: (d) =>
      d.acceptee
        ? [
            titre(`Bienvenue dans l’équipe ${d.nomCommercial}`),
            recap([['Rôle', libelleRole(d.role ?? ''), true]]),
            bouton('Accéder à l’espace pro', d.lien),
          ]
        : [
            titre('Demande non acceptée'),
            para(`${d.nomCommercial} n’a pas accepté votre demande pour rejoindre l’équipe.`),
          ],
    exemple: { ...EX, acceptee: true, role: 'collaborateur' },
  }),
  'role-modifie': modele<Equipe & { role: string }>({
    sujet: (d) => `Votre rôle chez ${d.nomCommercial} a changé`.slice(0, 60),
    preheader: (d) => `Nouveau rôle : ${libelleRole(d.role).toLowerCase()}.`,
    blocs: (d) => [
      titre('Votre rôle a changé'),
      recap([
        ['Entreprise', d.nomCommercial],
        ['Nouveau rôle', libelleRole(d.role), true],
        ['Vous pouvez', POUVOIRS[d.role] ?? ''],
      ]),
      bouton('Accéder à l’espace pro', d.lien),
    ],
    exemple: { ...EX, role: 'gerant' },
  }),
  'membre-retire': modele<Equipe>({
    sujet: (d) => `Vous ne faites plus partie de ${d.nomCommercial}`.slice(0, 60),
    preheader: () => 'Votre accès à l’espace de l’entreprise a été retiré.',
    blocs: (d) => [
      titre('Accès retiré'),
      para(
        `${bonjour(d.prenom)}votre accès à l’espace pro de ${d.nomCommercial} a été retiré. Vos messages restent visibles par l’équipe.`,
      ),
      note('Votre compte personnel reste actif.'),
    ],
    exemple: EX,
  }),
  'transfert-propriete': modele<Equipe & { nouveauProprietaire: string }>({
    sujet: (d) => `Transfert de propriété de ${d.nomCommercial}`.slice(0, 60),
    preheader: (d) => `${d.nouveauProprietaire} est désormais propriétaire.`,
    blocs: (d) => [
      titre('Transfert de propriété effectué'),
      recap([
        ['Entreprise', d.nomCommercial],
        ['Nouveau propriétaire', d.nouveauProprietaire, true],
      ]),
      para('L’ancien propriétaire devient gérant.'),
      alerte('Vous n’êtes pas à l’origine de ce transfert ? Contactez-nous immédiatement.', 'warn'),
      bouton('Voir mon équipe', d.lien),
    ],
    exemple: { ...EX, nouveauProprietaire: 'Léa Durand' },
  }),
  'sieges-suspendus': modele<Equipe & { suspendus: number }>({
    sujet: () => 'Accès de votre équipe suspendu',
    preheader: (d) =>
      `${d.suspendus} membre(s) suspendu(s) : réactivez Premium pour leur rendre l’accès.`,
    blocs: (d) => [
      titre('Accès de l’équipe suspendu'),
      para(
        `${d.nomCommercial} est passée à l’offre gratuite, qui comprend un seul siège. ${d.suspendus} membre(s) sont suspendus : aucune donnée n’est perdue.`,
      ),
      bouton('Réactiver Premium', d.lien),
    ],
    exemple: { ...EX, suspendus: 3 },
  }),
  'entreprise-fermee': modele<Equipe>({
    sujet: (d) => `${d.nomCommercial} a été fermée`.slice(0, 60),
    preheader: () => 'La fiche est retirée de l’annuaire. Les factures restent disponibles.',
    blocs: (d) => [
      titre('Entreprise fermée'),
      para(
        `L’espace de ${d.nomCommercial} a été fermé par son propriétaire. La fiche est retirée de l’annuaire.`,
      ),
      note('Les factures restent conservées 10 ans et disponibles sur demande.'),
    ],
    exemple: EX,
  }),
};
