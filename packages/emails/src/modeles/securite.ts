import { alerte, bouton, note, para, recap, titre } from '../blocs';
import { bonjour, modele } from '../modele';

/** EMAILS §4.1 : authentification et sécurité (catégorie `securite`, jamais désactivable). */
interface Lien {
  prenom?: string;
  lien: string;
}
interface Appareil extends Lien {
  appareil: string;
  lieu: string;
  date: string;
}
const EX = { prenom: 'Camille', lien: 'https://portailhabitat.fr/connexion/lien?t=exemple' };
const EX_APPAREIL = {
  ...EX,
  appareil: 'Safari sur iPhone',
  lieu: 'Mérignac, France',
  date: '25 septembre 2026 à 08 h 12',
};
const pasVous = alerte(
  'Vous n’êtes pas à l’origine de cette demande ? Ignorez simplement cet email : personne ne peut se connecter sans ce lien.',
);

export const modelesSecurite = {
  'lien-connexion': modele<Lien>({
    sujet: () => 'Votre lien de connexion à Portail Habitat',
    preheader: () =>
      'Valable 1 heure. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.',
    blocs: (d) => [
      titre('Connectez-vous en un clic'),
      para(
        `${bonjour(d.prenom)}voici votre lien pour accéder à votre espace. Aucun mot de passe n’est nécessaire.`,
      ),
      bouton('Me connecter', d.lien),
      note('Ce lien est valable 1 heure et ne fonctionne qu’une seule fois.'),
      pasVous,
    ],
    exemple: EX,
  }),
  'verifier-email': modele<Lien>({
    sujet: () => 'Confirmez votre adresse email',
    preheader: () => 'Une dernière étape pour activer votre compte Portail Habitat.',
    blocs: (d) => [
      titre('Confirmez votre adresse email'),
      para(
        `${bonjour(d.prenom)}cliquez sur le bouton ci-dessous pour confirmer que cette adresse vous appartient.`,
      ),
      bouton('Confirmer mon adresse', d.lien),
      note(
        `Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur : ${d.lien} · Valable 24 heures.`,
      ),
    ],
    exemple: EX,
  }),
  'mot-de-passe-oublie': modele<Lien>({
    sujet: () => 'Réinitialisation de votre mot de passe',
    preheader: () => 'Choisissez un nouveau mot de passe. Lien valable 1 heure.',
    blocs: (d) => [
      titre('Choisissez un nouveau mot de passe'),
      para(
        'Nous avons reçu une demande de réinitialisation du mot de passe de votre compte Portail Habitat.',
      ),
      bouton('Choisir un nouveau mot de passe', d.lien),
      note(
        'Lien valable 1 heure, utilisable une seule fois. Votre mot de passe actuel reste valable tant que vous n’en choisissez pas un nouveau.',
      ),
      alerte(
        'Ce n’était pas vous ? Aucune action n’est nécessaire, mais nous vous conseillons d’activer la double authentification.',
      ),
    ],
    exemple: EX,
  }),
  'mot-de-passe-modifie': modele<Appareil>({
    sujet: () => 'Votre mot de passe a été modifié',
    preheader: (d) => `${d.appareil} · ${d.date}. C’était vous ?`,
    blocs: (d) => [
      titre('Votre mot de passe a été modifié'),
      recap([
        ['Appareil', d.appareil],
        ['Lieu approximatif', d.lieu],
        ['Date', d.date],
      ]),
      para('C’était vous ? Vous n’avez rien à faire.'),
      bouton('Ce n’était pas moi', d.lien),
    ],
    exemple: EX_APPAREIL,
  }),
  'nouvel-appareil': modele<Appareil>({
    sujet: () => 'Nouvelle connexion à votre compte',
    preheader: (d) => `${d.appareil} · ${d.lieu} · ${d.date}. C’était vous ?`,
    blocs: (d) => [
      titre('Nouvelle connexion détectée'),
      para(
        'Votre compte Portail Habitat vient d’être utilisé depuis un appareil que nous ne connaissions pas.',
      ),
      recap([
        ['Appareil', d.appareil],
        ['Lieu approximatif', d.lieu],
        ['Date', d.date],
      ]),
      para('C’était vous ? Vous n’avez rien à faire.'),
      bouton('Ce n’était pas moi : sécuriser mon compte', d.lien),
      note(
        'Sécuriser votre compte déconnecte tous les appareils et vous demande un nouveau mot de passe.',
      ),
    ],
    exemple: EX_APPAREIL,
  }),
  'changement-email-alerte': modele<Lien & { nouvelEmailMasque: string }>({
    sujet: () => 'Changement de l’adresse email de votre compte',
    preheader: (d) =>
      `Nouvelle adresse : ${d.nouvelEmailMasque}. Annulation possible pendant 7 jours.`,
    blocs: (d) => [
      titre('L’adresse email de votre compte va changer'),
      para(
        `Une demande de changement vers ${d.nouvelEmailMasque} a été faite depuis votre compte.`,
      ),
      bouton('Ce n’était pas moi : annuler', d.lien),
      note(
        'Lien d’annulation valable 7 jours. Le compte est bloqué 24 heures par précaution si vous annulez.',
      ),
    ],
    exemple: { ...EX, nouvelEmailMasque: 'c•••@e•••.fr' },
  }),
  'changement-email-verifier': modele<Lien>({
    sujet: () => 'Confirmez votre nouvelle adresse email',
    preheader: () => 'Cliquez pour utiliser cette adresse sur Portail Habitat.',
    blocs: (d) => [
      titre('Confirmez votre nouvelle adresse'),
      para(
        `${bonjour(d.prenom)}confirmez que cette adresse vous appartient pour terminer le changement.`,
      ),
      bouton('Confirmer cette adresse', d.lien),
      note('Lien valable 24 heures.'),
    ],
    exemple: EX,
  }),
  '2fa-activee': modele<Lien>({
    sujet: () => 'Double authentification activée',
    preheader: () => 'Votre compte est mieux protégé.',
    blocs: (d) => [
      titre('Double authentification activée'),
      para('Un code vous sera demandé à chaque connexion depuis un nouvel appareil.'),
      bouton('Ce n’était pas moi', d.lien),
    ],
    exemple: EX,
  }),
  '2fa-desactivee': modele<Lien>({
    sujet: () => 'Double authentification désactivée',
    preheader: () => 'Votre compte est moins protégé. C’était vous ?',
    blocs: (d) => [
      titre('Double authentification désactivée'),
      alerte('Votre compte n’est plus protégé par un second facteur.', 'warn'),
      bouton('Ce n’était pas moi : sécuriser mon compte', d.lien),
    ],
    exemple: EX,
  }),
  'compte-bloque': modele<Lien>({
    sujet: () => 'Votre compte est temporairement bloqué',
    preheader: () => 'Trop de tentatives de connexion. Débloquez-le en un clic.',
    blocs: (d) => [
      titre('Votre compte est temporairement bloqué'),
      para(
        'Nous avons constaté 10 tentatives de connexion infructueuses et bloqué l’accès par précaution.',
      ),
      bouton('Débloquer mon compte', d.lien),
      note('Si ce n’était pas vous, changez votre mot de passe après le déblocage.'),
    ],
    exemple: EX,
  }),
  'compte-suspendu': modele<Lien & { motif: string }>({
    sujet: () => 'Votre compte a été suspendu',
    preheader: (d) => `Motif : ${d.motif}`,
    blocs: (d) => [
      titre('Votre compte a été suspendu'),
      recap([['Motif', d.motif, true]]),
      para(
        'Vous pouvez contester cette décision en répondant à cet email ou depuis la page d’aide.',
      ),
      bouton('Contester la décision', d.lien),
    ],
    exemple: { ...EX, motif: 'Non-respect de la charte des avis' },
  }),
  'compte-reactive': modele<Lien>({
    sujet: () => 'Votre compte est de nouveau actif',
    preheader: () => 'Vous pouvez à nouveau vous connecter.',
    blocs: (d) => [titre('Votre compte est de nouveau actif'), bouton('Me connecter', d.lien)],
    exemple: EX,
  }),
  'suppression-compte-confirmee': modele<{ prenom?: string }>({
    sujet: () => 'Votre compte a été supprimé',
    preheader: () => 'Récapitulatif de ce qui est conservé.',
    blocs: (d) => [
      titre('Votre compte a été supprimé'),
      para(`${bonjour(d.prenom)}vos données personnelles ont été effacées.`),
      recap([
        ['Conservé', 'Factures (10 ans, obligation comptable)'],
        ['Effacé', 'Profil, préférences, historique de connexion'],
      ]),
    ],
    exemple: { prenom: 'Camille' },
  }),
  'export-donnees-pret': modele<Lien>({
    sujet: () => 'L’export de vos données est prêt',
    preheader: () => 'Téléchargeable pendant 7 jours, connexion requise.',
    blocs: (d) => [
      titre('L’export de vos données est prêt'),
      bouton('Télécharger mes données', d.lien),
      note('Lien valable 7 jours. Vous devrez vous connecter pour télécharger le fichier.'),
    ],
    exemple: EX,
  }),
  'bienvenue-particulier': modele<Lien>({
    sujet: () => 'Bienvenue sur Portail Habitat',
    preheader: () => 'Suivez vos demandes et échangez avec les artisans depuis votre espace.',
    blocs: (d) => [
      titre('Bienvenue sur Portail Habitat'),
      para(
        `${bonjour(d.prenom)}votre espace vous permet de suivre vos demandes, de comparer les devis et d’échanger avec les artisans.`,
      ),
      bouton('Accéder à mon espace', d.lien),
    ],
    exemple: EX,
  }),
};
