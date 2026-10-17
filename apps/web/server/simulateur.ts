import 'server-only';
import { champsDuTarif, champSansMontant, type Champ, type TarifChamps } from '@ph/core/simulateur';
import { cache } from 'react';
import type { CatalogueSimulateur } from '@/features/simulateur/types';
import { routes } from '@/lib/routes';
import catalogue from '../../../docs/data/prestations-catalogue.json';
import detaillees from '../../../docs/data/prestations.json';
import { version } from '../../../docs/data/prestations-prix-detaillees.json';

interface PrestationCatalogue {
  id: string;
  nom: string;
  famille: string;
  icone: string;
  pitch: string;
  parcours: string | null;
  tarif: TarifChamps;
}

/**
 * Partie PUBLIQUE du référentiel (COMPTES §6.1) : noms, familles, champs. Les tarifs du catalogue ne
 * servent ici qu'à déduire les champs et ne sont jamais transmis au navigateur (SIM-01b). Même source
 * que `referentiel/prestations/items` (seed), sur laquelle `creerDemande` revérifie les réponses.
 */
export const lireCatalogueSimulateur = cache((): CatalogueSimulateur => {
  const c = catalogue as unknown as {
    familles: { id: string; nom: string }[];
    familleDesPrestationsDetaillees: Record<string, string>;
    prestations: PrestationCatalogue[];
  };
  const d = detaillees as unknown as {
    prestations: { id: string; nom: string; pitch: string; icone: string; champs: Champ[] }[];
  };
  return {
    version,
    familles: c.familles.map((f) => ({ id: f.id, nom: f.nom })),
    prestations: [
      ...d.prestations.map((p) => ({
        id: p.id,
        nom: p.nom,
        pitch: p.pitch,
        icone: p.icone,
        famille: c.familleDesPrestationsDetaillees[p.id] ?? 'interieur',
        champs: p.champs.map(champSansMontant),
      })),
      ...c.prestations.map((p) => ({
        id: p.id,
        nom: p.nom,
        pitch: p.pitch,
        icone: p.icone,
        famille: p.famille,
        // Les diagnostics ont leur propre parcours (liste des diagnostics obligatoires).
        ...(p.parcours ? { lien: routes.diagnosticEstimation as string } : {}),
        champs: champsDuTarif(p.tarif).map(champSansMontant),
      })),
    ],
  };
});
