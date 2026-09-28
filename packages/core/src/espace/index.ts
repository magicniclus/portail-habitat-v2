import type { STATUTS_DEMANDE } from '../schemas/demandes';

type StatutDemande = (typeof STATUTS_DEMANDE)[number];

/** Étapes du suivi d'une demande (maquette Mon Espace Particulier). */
export const ETAPES_SUIVI = ['Envoyée', 'Artisans trouvés', 'Devis reçus', 'Travaux'] as const;

/** Libellé et ton de l'étiquette de statut, vus par le particulier. */
export const LIBELLES_STATUT_PARTICULIER: Record<
  StatutDemande,
  { libelle: string; ton: 'attente' | 'succes' | 'neutre'; etape: number }
> = {
  nouvelle: { libelle: 'Envoyée', ton: 'attente', etape: 1 },
  en_attribution: { libelle: 'En attente', ton: 'attente', etape: 1 },
  appel_offres: { libelle: 'En attente', ton: 'attente', etape: 1 },
  attribuee: { libelle: 'Artisans trouvés', ton: 'succes', etape: 2 },
  devis_recus: { libelle: 'Devis reçus', ton: 'succes', etape: 3 },
  signee: { libelle: 'Devis signé', ton: 'succes', etape: 4 },
  close: { libelle: 'Terminé', ton: 'neutre', etape: 4 },
  annulee: { libelle: 'Annulée', ton: 'neutre', etape: 0 },
  spam: { libelle: 'Annulée', ton: 'neutre', etape: 0 },
};

export const etapeSuivi = (statut: StatutDemande) => LIBELLES_STATUT_PARTICULIER[statut].etape;

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** « 2 devis · 1 artisan en attente » (ESP-01 : nombre d'artisans et de devis). */
export function resumeSuivi({ nbArtisans, nbDevis }: { nbArtisans: number; nbDevis: number }) {
  if (nbArtisans === 0) return 'Artisans en cours de sélection';
  if (nbDevis === 0) return `${pluriel(nbArtisans, 'artisan')} · aucun devis pour l’instant`;
  const enAttente = nbArtisans - nbDevis;
  return enAttente > 0
    ? `${nbDevis} devis · ${pluriel(enAttente, 'artisan')} en attente`
    : `${nbDevis} devis reçus`;
}

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// 8 chiffres ou plus, séparés au plus par un espace, un point ou un tiret (06 12 34 56 78, +33…).
const TELEPHONE = /\+?\d(?:[\s.-]?\d){7,}/g;

/**
 * Masque numéros de téléphone et emails d'un message tant que l'artisan n'a pas accepté la
 * demande (ESP-03). Appliqué côté serveur à l'enregistrement : le texte complet n'est pas stocké.
 */
export function masquerCoordonnees(texte: string): { texte: string; masque: boolean } {
  const resultat = texte.replace(EMAIL, '[email masqué]').replace(TELEPHONE, '[numéro masqué]');
  return { texte: resultat, masque: resultat !== texte };
}

export const contientCoordonnees = (texte: string) => masquerCoordonnees(texte).masque;

type StatutAttribution =
  | 'proposee'
  | 'vue'
  | 'acceptee'
  | 'refusee'
  | 'devis_envoye'
  | 'devis_accepte'
  | 'devis_refuse'
  | 'expiree';

/** Ce que le particulier voit d'un artisan sollicité ; `null` : l'artisan n'apparaît pas. */
export const LIBELLES_ATTRIBUTION_PARTICULIER: Record<StatutAttribution, string | null> = {
  proposee: 'Demande transmise, réponse attendue',
  vue: 'Demande vue, réponse attendue',
  acceptee: 'A accepté votre demande',
  devis_envoye: 'Devis envoyé',
  devis_accepte: 'Devis accepté',
  devis_refuse: 'Devis refusé',
  refusee: null,
  expiree: null,
};

/** L'artisan a accepté la demande : les coordonnées ne sont plus masquées dans les messages. */
export const artisanAAccepte = (statut: StatutAttribution) =>
  statut === 'acceptee' || statut.startsWith('devis_');
