import type { SceneCapture } from './catalogue';
import { PLAN_MIN_MS } from './formats';
import type { Calque, MotTranscrit, PlanMontage, PlanVideo } from './plan';

/**
 * Éditeur de montage (STUDIO.md §5) : opérations pures sur le plan, faites à la main dans la
 * frise. Chaque opération rend un nouveau plan ; `verifierPlan` valide avant l'enregistrement.
 * Les temps des plans sont dans la prise (voix), ceux des animations dans leur plan.
 */

const avecPlans = (p: PlanMontage, plans: PlanVideo[]): PlanMontage => ({ ...p, plans });

/** Identifiant libre : `prefixe` suivi du premier numéro non pris. */
function nouvelId(prefixe: string, pris: Iterable<string>): string {
  const deja = new Set(pris);
  let n = 1;
  while (deja.has(`${prefixe}${n}`)) n++;
  return `${prefixe}${n}`;
}

/** Animations ramenées dans `[0, duree]` ; celles qui n'y tiennent plus disparaissent. */
function recadrer(calques: readonly Calque[], decalage: number, duree: number): Calque[] {
  return calques.flatMap((c) => {
    const debut = Math.max(0, c.debut - decalage);
    const fin = Math.min(duree, c.fin - decalage);
    return fin - debut >= 100 ? [{ ...c, debut, fin }] : [];
  });
}

export function deplacerPlan(p: PlanMontage, de: number, vers: number): PlanMontage {
  const plans = [...p.plans];
  const [x] = plans.splice(de, 1);
  if (!x) return p;
  plans.splice(Math.max(0, Math.min(vers, plans.length)), 0, x);
  return avecPlans(p, plans);
}

/** Coupe le plan `i` à `t` ms de son début (refusé à moins du minimum d'un bord). */
export function couperPlan(p: PlanMontage, i: number, t: number): PlanMontage {
  const x = p.plans[i];
  if (!x) return p;
  const d = x.source.fin - x.source.debut;
  if (t < PLAN_MIN_MS || d - t < PLAN_MIN_MS) return p;
  const a: PlanVideo = {
    ...x,
    source: { debut: x.source.debut, fin: x.source.debut + t },
    calques: recadrer(x.calques, 0, t),
  };
  const b: PlanVideo = {
    ...x,
    id: nouvelId(
      `${x.id.slice(0, 20)}-`,
      p.plans.map((y) => y.id),
    ),
    source: { debut: x.source.debut + t, fin: x.source.fin },
    calques: recadrer(x.calques, t, d - t),
  };
  return avecPlans(p, [...p.plans.slice(0, i), a, b, ...p.plans.slice(i + 1)]);
}

/** Change le passage de la prise gardé pour le plan `i` (bornes dans la prise, durée minimale). */
export function rognerPlan(
  p: PlanMontage,
  i: number,
  nouvelle: { debut?: number; fin?: number },
  dureePriseMs: number,
): PlanMontage {
  const x = p.plans[i];
  if (!x) return p;
  let debut = Math.max(0, Math.min(nouvelle.debut ?? x.source.debut, dureePriseMs - PLAN_MIN_MS));
  let fin = Math.min(dureePriseMs, nouvelle.fin ?? x.source.fin);
  if (fin - debut < PLAN_MIN_MS) {
    if (nouvelle.fin !== undefined) fin = debut + PLAN_MIN_MS;
    else debut = fin - PLAN_MIN_MS;
  }
  debut = Math.round(debut);
  fin = Math.round(fin);
  const plans = [...p.plans];
  plans[i] = {
    ...x,
    source: { debut, fin },
    calques: recadrer(x.calques, debut - x.source.debut, fin - debut),
  };
  return avecPlans(p, plans);
}

export function supprimerPlan(p: PlanMontage, i: number): PlanMontage {
  if (p.plans.length <= 1 || !p.plans[i]) return p;
  return avecPlans(
    p,
    p.plans.filter((_, j) => j !== i),
  );
}

export function modifierPlanVideo(
  p: PlanMontage,
  i: number,
  champs: Partial<PlanVideo>,
): PlanMontage {
  const x = p.plans[i];
  if (!x) return p;
  const plans = [...p.plans];
  plans[i] = { ...x, ...champs } as PlanVideo;
  return avecPlans(p, plans);
}

/** Montre une scène filmée sur l'artisan d'exemple dans le plan `i` (capture réutilisée si elle existe). */
export function ajouterCapture(p: PlanMontage, i: number, scene: SceneCapture): PlanMontage {
  const existante = p.captures.find((c) => c.scene === scene);
  const id =
    existante?.id ??
    nouvelId(
      'c',
      p.captures.map((c) => c.id),
    );
  const q: PlanMontage = existante ? p : { ...p, captures: [...p.captures, { id, scene }] };
  return modifierPlanVideo(q, i, { visuel: 'capture', captureId: id });
}

const max8 = (calques: Calque[]) => calques.slice(0, 8);

export function ajouterCalque(p: PlanMontage, i: number, c: Calque): PlanMontage {
  const x = p.plans[i];
  if (!x) return p;
  const d = x.source.fin - x.source.debut;
  return modifierPlanVideo(p, i, {
    calques: max8([
      ...x.calques,
      { ...c, debut: Math.min(c.debut, d - 100), fin: Math.min(c.fin, d) },
    ]),
  });
}

export function modifierCalque(
  p: PlanMontage,
  i: number,
  k: number,
  champs: Partial<Calque>,
): PlanMontage {
  const x = p.plans[i];
  const c = x?.calques[k];
  if (!x || !c) return p;
  const calques = [...x.calques];
  calques[k] = { ...c, ...champs } as Calque;
  return modifierPlanVideo(p, i, { calques });
}

/** Déplace l'animation `k` pour qu'elle commence à `debut`, sans changer sa durée ni sortir du plan. */
export function deplacerCalque(p: PlanMontage, i: number, k: number, debut: number): PlanMontage {
  const x = p.plans[i];
  const c = x?.calques[k];
  if (!x || !c) return p;
  const d = x.source.fin - x.source.debut;
  const duree = Math.min(c.fin - c.debut, d);
  const a = Math.round(Math.max(0, Math.min(debut, d - duree)));
  return modifierCalque(p, i, k, { debut: a, fin: a + duree });
}

export function supprimerCalque(p: PlanMontage, i: number, k: number): PlanMontage {
  const x = p.plans[i];
  if (!x) return p;
  return modifierPlanVideo(p, i, { calques: x.calques.filter((_, j) => j !== k) });
}

export const TYPES_CALQUE = [
  'texte',
  'compteur',
  'notification',
  'liste',
  'barre',
  'fleche',
  'surlignage',
] as const satisfies readonly Calque['type'][];

export const LIBELLES_CALQUE: Readonly<Record<Calque['type'], string>> = {
  texte: 'Texte',
  compteur: 'Chiffre animé',
  notification: 'Notification',
  liste: 'Liste',
  barre: 'Barre de progression',
  fleche: 'Flèche',
  surlignage: 'Surlignage',
};

/** Animation prête à poser, 2,5 s au début du plan (moins si le plan est court). */
export function calqueParDefaut(type: Calque['type'], dureePlanMs: number): Calque {
  const t = { debut: 0, fin: Math.max(100, Math.min(2_500, dureePlanMs)) };
  switch (type) {
    case 'texte':
      return { type, texte: 'Votre texte', style: 'titre', position: 'haut', ...t };
    case 'compteur':
      return { type, de: 0, a: 10, libelle: 'demandes par mois', position: 'centre', ...t };
    case 'notification':
      return { type, titre: 'Nouvelle demande', texte: 'Rénovation de salle de bains', ...t };
    case 'liste':
      return { type, elements: ['Gratuit', 'Sans engagement'], position: 'centre', ...t };
    case 'barre':
      return { type, libelle: 'Fiche complétée', valeur: 80, position: 'bas', ...t };
    case 'fleche':
      return { type, x: 0.5, y: 0.5, ...t };
    case 'surlignage':
      return { type, x: 0.2, y: 0.4, largeur: 0.6, hauteur: 0.15, ...t };
  }
}

/**
 * Sous-titres sans voix : les mots du texte répartis sur la durée, au prorata de leur longueur
 * (un mot long reste plus longtemps), sans chevauchement.
 */
export function motsDepuisTexte(texte: string, dureeMs: number): MotTranscrit[] {
  const mots = texte.split(/\s+/).filter(Boolean);
  if (!mots.length || dureeMs <= 0) return [];
  const poids = mots.map((m) => m.length + 2);
  const total = poids.reduce((a, b) => a + b, 0);
  let t = 0;
  return mots.map((m, i) => {
    const debut = Math.round(t);
    t += (poids[i]! / total) * dureeMs;
    return { texte: m, debut, fin: i === mots.length - 1 ? dureeMs : Math.round(t) };
  });
}

/**
 * Voix de synthèse : ElevenLabs donne le temps de chaque lettre (en secondes) ; on regroupe les
 * lettres en mots (début de la première, fin de la dernière), en millisecondes entières. Pas
 * besoin de transcrire une voix dont on connaît déjà le texte.
 */
export function motsDepuisAlignement(
  lettres: readonly string[],
  debuts: readonly number[],
  fins: readonly number[],
): MotTranscrit[] {
  const mots: MotTranscrit[] = [];
  let courant: MotTranscrit | null = null;
  lettres.forEach((l, i) => {
    if (/\s/.test(l)) {
      if (courant) mots.push(courant);
      courant = null;
      return;
    }
    const fin = Math.round((fins[i] ?? 0) * 1000);
    if (courant) {
      courant.texte += l;
      courant.fin = fin;
    } else courant = { texte: l, debut: Math.round((debuts[i] ?? 0) * 1000), fin };
  });
  if (courant) mots.push(courant);
  return mots;
}
