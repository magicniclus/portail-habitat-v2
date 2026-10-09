import { normaliser } from '../recherche/texte';

export interface EntreeStatsPublic {
  maintenant: Date;
  artisans: readonly { enLigne: boolean; ville: string }[];
  demandes: readonly { createdAt: Date }[];
  avis: readonly { statut: string; note: number }[];
  nbDossiersDiag: number;
}

export interface StatsPublicCalculees {
  nbArtisans: number;
  nbDemandesMois: number;
  nbVilles: number;
  noteMoyenneGlobale: number;
  nbAvisTotal: number;
  nbDossiersDiag: number;
}

const MOIS_MS = 30 * 86_400_000;

/** Compteurs de `stats/public` (DATABASE §9), recalculés chaque nuit : aucune donnée personnelle. */
export function calculerStatsPublic(e: EntreeStatsPublic): StatsPublicCalculees {
  const enLigne = e.artisans.filter((a) => a.enLigne);
  const publies = e.avis.filter((a) => a.statut === 'publie');
  const depuis = e.maintenant.getTime() - MOIS_MS;
  const somme = publies.reduce((s, a) => s + a.note, 0);
  return {
    nbArtisans: enLigne.length,
    nbDemandesMois: e.demandes.filter((d) => d.createdAt.getTime() >= depuis).length,
    nbVilles: new Set(enLigne.map((a) => normaliser(a.ville))).size,
    noteMoyenneGlobale: publies.length ? Math.round((somme / publies.length) * 10) / 10 : 0,
    nbAvisTotal: publies.length,
    nbDossiersDiag: e.nbDossiersDiag,
  };
}
