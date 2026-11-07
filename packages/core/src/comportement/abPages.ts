/**
 * Tests A/B des pages (COMPORTEMENT §4) : répartition déterministe par session, puis test
 * bayésien bêta-binomial (a priori uniforme). La bascule est seulement **proposée** à 95 %.
 */
export interface VarianteTest {
  id: string;
  poids: number;
}

/** Variante d'une session : `hash(sessionId) % 100` réparti selon les poids. */
export function varianteSession(sessionId: string, variantes: readonly VarianteTest[]): string {
  let h = 0;
  for (let i = 0; i < sessionId.length; i++) h = (h * 31 + sessionId.charCodeAt(i)) >>> 0;
  const tirage = h % 100;
  const total = variantes.reduce((t, v) => t + v.poids, 0) || 1;
  let cumul = 0;
  for (const v of variantes) {
    cumul += (v.poids / total) * 100;
    if (tirage < cumul) return v.id;
  }
  return variantes[variantes.length - 1]!.id;
}

/** Fonction de répartition de la loi normale centrée réduite (Abramowitz et Stegun 7.1.26). */
function phi(z: number) {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const erf =
    1 -
    t *
      (0.254829592 +
        t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) *
      Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

const posterieure = (sessions: number, conversions: number) => {
  const a = conversions + 1;
  const b = sessions - conversions + 1;
  const moyenne = a / (a + b);
  return { moyenne, variance: (a * b) / ((a + b) ** 2 * (a + b + 1)) };
};

export interface ResultatAB {
  /** Probabilité que la variante soit meilleure que la référence (première variante). */
  probabilites: Record<string, number>;
  /** Gain relatif attendu sur le taux de conversion par rapport à la référence. */
  gains: Record<string, number>;
  /** Variante dont la bascule est proposée (≥ 95 %), jamais appliquée automatiquement. */
  proposee: string | null;
}

export const SEUIL_PROPOSITION_AB = 0.95;
const SESSIONS_MIN_AB = 100;

export function evaluerTestPage(
  stats: readonly { id: string; sessions: number; conversions: number }[],
): ResultatAB {
  const [ref, ...autres] = stats;
  const r: ResultatAB = { probabilites: {}, gains: {}, proposee: null };
  if (!ref) return r;
  const pa = posterieure(ref.sessions, ref.conversions);
  let meilleure = SEUIL_PROPOSITION_AB;
  for (const v of autres) {
    const pb = posterieure(v.sessions, v.conversions);
    const p = phi((pb.moyenne - pa.moyenne) / Math.sqrt(pa.variance + pb.variance));
    r.probabilites[v.id] = Math.round(p * 1000) / 1000;
    r.gains[v.id] = Math.round((pb.moyenne / pa.moyenne - 1) * 1000) / 1000;
    const assez = v.sessions >= SESSIONS_MIN_AB && ref.sessions >= SESSIONS_MIN_AB;
    if (assez && p >= meilleure) {
      meilleure = p;
      r.proposee = v.id;
    }
  }
  return r;
}
