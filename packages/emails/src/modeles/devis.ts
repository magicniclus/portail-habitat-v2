import { alerte, bouton, note, para, recap, titre } from '../blocs';
import { modele } from '../modele';

/** Relance du client à J+7 d'un devis envoyé resté sans réponse (EMAILS §4.4). */
interface RelanceDevis {
  entreprise: string;
  numero: string;
  objet: string;
  montant: string;
  /** Date d'envoi du devis (« 10 octobre 2026 »). */
  envoye: string;
  validite: string;
}

/**
 * Relance d'une facture du client (J−3, J+1, J+15 ou « Relancer ») : reste dû, échéance, PDF de la
 * facture à télécharger (lien personnel, `secrets.lien`).
 */
interface RelanceFacture {
  entreprise: string;
  numero: string;
  objet: string;
  reste: string;
  echeance: string;
  /** Échéance dépassée. */
  echue: boolean;
  /** J+15 : rappel des pénalités de retard. */
  dernier: boolean;
  /** Taux annuel des pénalités (« 12,15 % »). */
  penalites: string;
  /** Client professionnel : indemnité forfaitaire de 40 € (art. L441-10 C. com.). */
  pro: boolean;
  lien: string;
}

/** Devis accepté en ligne par le client (signature électronique simple). */
interface DevisAccepte {
  numero: string;
  client: string;
  montant: string;
  lien: string;
}

export const modelesDevis = {
  'devis-accepte': modele<DevisAccepte>({
    sujet: (d) => `Devis ${d.numero} accepté par ${d.client}`.slice(0, 59),
    preheader: (d) => `${d.montant} · signé en ligne`,
    blocs: (d) => [
      titre('Votre devis a été accepté'),
      para(
        `${d.client} a accepté en ligne votre devis ${d.numero} (${d.montant}). La signature (nom, date et empreinte du PDF envoyé) est enregistrée avec le devis.`,
      ),
      para('Vous pouvez maintenant facturer l’acompte ou transformer le devis en facture.'),
      bouton('Ouvrir le devis', d.lien),
    ],
    exemple: {
      numero: 'D-2026-0152',
      client: 'Claire Martin',
      montant: '8 932,40 € TTC',
      lien: 'https://portailhabitat.fr/pro/devis/exemple',
    },
  }),

  'relance-devis': modele<RelanceDevis>({
    sujet: (d) => `Devis ${d.numero} : il attend votre réponse`,
    preheader: (d) => `${d.objet} · ${d.montant}`,
    blocs: (d) => [
      titre('Un devis attend votre réponse'),
      para(
        `Bonjour, ${d.entreprise} vous a adressé le ${d.envoye} son devis pour votre projet. Vous le retrouverez, avec son lien de téléchargement, dans l’email reçu ce jour-là.`,
      ),
      recap([
        ['Devis', d.numero, true],
        ['Objet', d.objet],
        ['Montant', d.montant],
        ...(d.validite ? ([['Valable jusqu’au', d.validite]] as [string, string][]) : []),
      ]),
      note(
        'Pour l’accepter, renvoyez-le daté et signé avec la mention « Bon pour accord », ou répondez directement à l’artisan. Si vous avez déjà répondu, ne tenez pas compte de ce message.',
      ),
    ],
    exemple: {
      entreprise: 'Bertrand Rénovation',
      numero: 'D-2026-0152',
      objet: 'Rénovation de salle de bain',
      montant: '8 932,40 € TTC',
      envoye: '10 octobre 2026',
      validite: '9 novembre 2026',
    },
  }),

  'facture-relance': modele<RelanceFacture>({
    sujet: (d) =>
      d.echue
        ? `Facture ${d.numero} : paiement en attente`
        : `Facture ${d.numero} : échéance proche`,
    preheader: (d) => `${d.reste} à régler · échéance le ${d.echeance}`,
    blocs: (d) => [
      titre(d.echue ? 'Votre facture attend son règlement' : 'Votre facture arrive à échéance'),
      para(
        d.echue
          ? `Bonjour, sauf erreur de notre part, la facture de ${d.entreprise} arrivée à échéance le ${d.echeance} n’est pas encore réglée.`
          : `Bonjour, la facture de ${d.entreprise} arrive à échéance le ${d.echeance}. Voici un petit rappel pour l’anticiper.`,
      ),
      recap([
        ['Facture', d.numero, true],
        ['Objet', d.objet],
        ['Reste à payer', d.reste, true],
        ['Échéance', d.echeance],
      ]),
      ...(d.dernier
        ? [
            alerte(
              `Tout retard de paiement entraîne des pénalités au taux annuel de ${d.penalites}${d.pro ? ', ainsi qu’une indemnité forfaitaire de 40 € pour frais de recouvrement' : ''}.`,
              'warn',
            ),
          ]
        : []),
      bouton('Télécharger la facture (PDF)', d.lien),
      note(
        `Pour toute question, contactez directement ${d.entreprise}. Si vous avez déjà réglé, ne tenez pas compte de ce message. Ce lien est personnel : ne le transférez pas.`,
      ),
    ],
    exemple: {
      entreprise: 'Bertrand Rénovation',
      numero: 'F-2026-0087',
      objet: 'Rénovation de salle de bain',
      reste: '2 679,72 €',
      echeance: '20 octobre 2026',
      echue: true,
      dernier: true,
      penalites: '12,15 %',
      pro: false,
      lien: 'https://portailhabitat.fr/api/facture-client/exemple',
    },
  }),
};
