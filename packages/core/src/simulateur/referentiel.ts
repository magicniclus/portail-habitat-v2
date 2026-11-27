import type { Coefficients, TarifGenerique } from './types';
import { tarifEnCentimes } from './generique';
import type { ParametresDetailles, Referentiel } from './estimer';

/**
 * Référentiel de prix à partir des fichiers de docs/data (seed, tests) : prix détaillés déjà en centimes,
 * tarifs du catalogue convertis en centimes. En production, lu dans `referentiel/prestations/prix`.
 */
export function referentielDepuisFichiers(
  detailles: { version: string; coefficients: Coefficients; prestations: ParametresDetailles },
  catalogue: { prestations: readonly { id: string; tva: number; tarif: TarifGenerique }[] },
): Referentiel {
  return {
    version: detailles.version,
    coefficients: detailles.coefficients,
    detailles: detailles.prestations,
    catalogue: Object.fromEntries(
      catalogue.prestations.map((p) => [p.id, tarifEnCentimes(p.tarif)]),
    ),
    tvaCatalogue: Object.fromEntries(catalogue.prestations.map((p) => [p.id, p.tva])),
  };
}
