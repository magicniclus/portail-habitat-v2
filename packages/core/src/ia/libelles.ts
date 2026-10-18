import type { ModeIa, PerimetreIa } from './sortie';

/** Libellés de l'écran Admin › Assistant IA. */
export const LIBELLES_PERIMETRE_IA: Readonly<Record<PerimetreIa, string>> = {
  landings: 'Landings et comportement',
  parcours: 'Parcours et formulaires',
  emails: 'Emails et séquences',
  offres: 'Offres et prix',
  fiches: 'Fiches artisans',
};

export const MODES_ANALYSE_IA: readonly { id: ModeIa; nom: string; description: string }[] = [
  {
    id: 'rapide',
    nom: 'Points d’amélioration',
    description: '3 à 6 actions à fort gain, classées par gain attendu et effort.',
  },
  {
    id: 'audit',
    nom: 'Audit complet',
    description:
      'Chaque étape de l’entonnoir notée de 0 à 100, puis 6 à 12 actions et un gain total estimé.',
  },
];

export const LIBELLES_ACTION_IA: Readonly<Record<string, string>> = {
  ab_test: 'Préparer le test A/B',
  tache: 'Créer la tâche',
  texte: 'Créer la tâche',
  sequence: 'Créer la tâche',
  prix: 'Créer la tâche',
};

export const LIBELLES_STATUT_RECOMMANDATION: Readonly<Record<string, string>> = {
  nouvelle: 'Nouvelle',
  en_cours: 'En cours',
  faite: 'Faite · effet mesuré dans 30 jours',
  ignoree: 'Ignorée',
};
