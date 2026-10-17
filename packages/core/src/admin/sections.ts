import type { PermissionAdmin } from './permissions';

/**
 * Sections du back-office (maquette « Admin Portail Habitat ») : une section n'apparaît dans le menu
 * que si le membre a au moins une des permissions listées (ADMIN §1, « Règles d'affichage ») ;
 * sinon son URL renvoie une 403. Le serveur revérifie chaque action.
 */
export interface SectionAdmin {
  id: string;
  libelle: string;
  /** Segment d'URL sous `/admin` (`''` = tableau de bord). */
  chemin: string;
  /** Au moins une de ces permissions ; vide = toute l'équipe. */
  lecture: readonly PermissionAdmin[];
  /** Tracé de l'icône (maquette). */
  icone: string;
}

export const SECTIONS_ADMIN: readonly SectionAdmin[] = [
  {
    id: 'tableau',
    libelle: 'Tableau de bord',
    chemin: '',
    lecture: [],
    icone: 'M3 11 12 4l9 7M6 12.5V20h12v-7.5',
  },
  {
    id: 'ia',
    libelle: 'Audit IA conversion',
    chemin: 'ia',
    lecture: ['ia.utiliser', 'ia.configurer'],
    icone:
      'M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5',
  },
  {
    id: 'file',
    libelle: 'File de travail',
    chemin: 'file',
    lecture: [
      'documents.valider',
      'avis.moderer',
      'contacts.traiter',
      'litiges.traiter',
      'conversion.piloter',
    ],
    icone: 'M4 13h4l2 3h4l2-3h4M4 13l2-8h12l2 8v6H4z',
  },
  {
    id: 'artisans',
    libelle: 'Artisans',
    chemin: 'artisans',
    lecture: ['artisans.lire'],
    icone:
      'M16 20v-2a4 4 0 0 0-8 0v2M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3 3 0 0 0-2.5-3M17 5.3a3 3 0 0 1 0 5.4',
  },
  {
    id: 'demandes',
    libelle: 'Demandes',
    chemin: 'demandes',
    lecture: ['demandes.lire'],
    icone: 'M4 6h16v10H9l-5 3V6z',
  },
  {
    id: 'appels-offres',
    libelle: 'Appels d’offres',
    chemin: 'appels-d-offres',
    lecture: ['leads.lire'],
    icone:
      'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 8.5a4 4 0 0 1 0 7M18 6a8 8 0 0 1 0 12',
  },
  {
    id: 'avis',
    libelle: 'Avis',
    chemin: 'avis',
    lecture: ['avis.lire'],
    icone: 'm12 3.8 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-3.9 5.6-.8z',
  },
  {
    id: 'litiges',
    libelle: 'Litiges',
    chemin: 'litiges',
    lecture: ['litiges.lire'],
    icone: 'M12 4v16M7 20h10M5 8h14M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z',
  },
  {
    id: 'finances',
    libelle: 'Finances',
    chemin: 'finances',
    lecture: ['finances.lire'],
    icone: 'M4 7h16v10H4zM4 11h16M8 15h3',
  },
  {
    id: 'conversion',
    libelle: 'Conversion',
    chemin: 'conversion',
    lecture: ['conversion.lire'],
    icone: 'M3 5h18l-7 8v6l-4-2v-4z',
  },
  {
    id: 'comportement',
    libelle: 'Comportement',
    chemin: 'comportement',
    lecture: ['comportement.lire'],
    icone: 'M5 3l14 7-6 2-2 6z',
  },
  {
    id: 'referentiels',
    libelle: 'Référentiels',
    chemin: 'referentiels',
    lecture: ['referentiels.lire'],
    icone: 'M4 6h16M4 12h16M4 18h10',
  },
  {
    id: 'algorithme',
    libelle: 'Algorithme',
    chemin: 'matching',
    lecture: ['matching.lire'],
    icone: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  },
  {
    id: 'contenus',
    libelle: 'Contenus',
    chemin: 'contenus',
    lecture: ['annonces.gerer', 'referentiels.lire'],
    icone: 'M5 4h10l4 4v12H5zM14 4v5h5M8 13h8M8 17h5',
  },
  {
    id: 'equipe',
    libelle: 'Équipe et audit',
    chemin: 'equipe',
    lecture: ['equipe.gerer', 'audit.lire'],
    icone: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  },
  {
    id: 'rgpd',
    libelle: 'RGPD',
    chemin: 'rgpd',
    lecture: ['rgpd.traiter'],
    icone: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  },
];

export const peutLireSection = (s: SectionAdmin, permissions: readonly string[]) =>
  s.lecture.length === 0 || s.lecture.some((p) => permissions.includes(p));

export const sectionsVisibles = (permissions: readonly string[]) =>
  SECTIONS_ADMIN.filter((s) => peutLireSection(s, permissions));

/** Section d'un chemin `/admin/…` (premier segment) ; `null` si inconnue. */
export function sectionDuChemin(chemin: string): SectionAdmin | null {
  const segment = chemin.replace(/^\/admin\/?/, '').split(/[/?#]/)[0] ?? '';
  return SECTIONS_ADMIN.find((s) => s.chemin === segment) ?? null;
}

/** Session admin (ADMIN §1, « Sécurité ») : 8 h au plus, déconnexion après 30 min d'inactivité. */
export const DUREE_SESSION_ADMIN_MS = 8 * 3_600_000;
export const INACTIVITE_ADMIN_MS = 30 * 60_000;

/** Motif obligatoire des actions destructrices ou sensibles (ADM-03). */
export const MOTIF_MIN = 5;
