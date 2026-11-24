import 'server-only';
import {
  BUDGETS_ANNUAIRE,
  DISPOS_ANNUAIRE,
  LIBELLES_LABELS,
  NOTES_ANNUAIRE,
} from '@ph/core/annuaire';
import type { OptionsFiltres } from '@/features/annuaire/Filtres';
import { metiersFiltre } from './metiers';

/** Options des filtres de l'annuaire (annuaire et pages de secteur). */
export const optionsAnnuaire = (metiers: string[]): OptionsFiltres => ({
  metiers: metiersFiltre(metiers),
  notes: NOTES_ANNUAIRE,
  labels: Object.entries(LIBELLES_LABELS).map(([id, libelle]) => ({ id, libelle })),
  dispos: DISPOS_ANNUAIRE,
  budgets: BUDGETS_ANNUAIRE,
});
