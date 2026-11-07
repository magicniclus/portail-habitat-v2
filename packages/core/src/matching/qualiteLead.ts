/** Signaux du score de qualité d'une demande (MATCHING.md [9]). */
export interface SignauxLead {
  emailVerifie: boolean;
  telephoneVerifie: boolean;
  /** Part des champs du projet renseignés (0–1). */
  tauxReponses: number;
  photos: boolean;
  longueurPrecisions: number;
  /** Délai souhaité en jours (null : « je me renseigne »). */
  delaiSouhaiteJours: number | null;
  budgetCoherent: boolean;
  dejaVus7j: number;
  emailJetable: boolean;
  horsZone: boolean;
}

/** En dessous : file de modération `fraude_suspectee` avant tout matching. */
export const SEUIL_MODERATION = 30;

export function qualiteLead(s: SignauxLead): number {
  const points =
    (s.emailVerifie ? 25 : 0) +
    (s.telephoneVerifie ? 20 : 0) +
    (s.tauxReponses >= 0.8 ? 15 : 0) +
    (s.photos ? 10 : 0) +
    (s.longueurPrecisions >= 60 ? 10 : 0) +
    (s.delaiSouhaiteJours !== null && s.delaiSouhaiteJours <= 90 ? 10 : 0) +
    (s.budgetCoherent ? 10 : 0) -
    (s.dejaVus7j >= 3 ? 30 : 0) -
    (s.emailJetable ? 40 : 0) -
    (s.horsZone ? 20 : 0);
  return Math.min(100, Math.max(0, points));
}

export const aModerer = (score: number) => score < SEUIL_MODERATION;
