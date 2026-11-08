import {
  finClip,
  nouvelIdFrise,
  type Clip,
  type Frise,
  type Piste,
  type PointAutomation,
  type TypePiste,
  ajouterPiste,
} from './frise';

/**
 * Opérations de montage sur la frise multipistes (pures) : poser, déplacer, couper, rogner,
 * dupliquer, supprimer, régler un clip et ses automations. Les pistes verrouillées ne bougent pas.
 */

const CLIP_MIN_MS = 100;
const tousLesIds = (f: Frise) => f.pistes.flatMap((p) => p.clips.map((c) => c.id));
const libre = (p: Piste, c: Pick<Clip, 'id' | 'debut' | 'duree'>) =>
  p.clips.every((x) => x.id === c.id || finClip(x) <= c.debut || x.debut >= finClip(c));

/** Type de piste qui peut accueillir ce clip. */
export function typePisteDuClip(c: Clip, f: Pick<Frise, 'medias'>): TypePiste {
  const s = c.source;
  if (s.type === 'effet') return 'texte';
  if (s.type === 'prise') return s.fichier === 'voix' ? 'audio' : 'video';
  if (s.type === 'media')
    return f.medias.find((m) => m.id === s.mediaId)?.type === 'audio' ? 'audio' : 'video';
  return 'video';
}

function trouver(f: Frise, clipId: string) {
  for (const p of f.pistes) {
    const c = p.clips.find((x) => x.id === clipId);
    if (c) return { piste: p, clip: c };
  }
  return null;
}
const avecPiste = (f: Frise, p: Piste): Frise => ({
  ...f,
  pistes: f.pistes.map((x) => (x.id === p.id ? p : x)),
});
const trier = (clips: Clip[]) => [...clips].sort((a, b) => a.debut - b.debut);

/**
 * Pose un clip sur la piste visée ; si la place est prise (ou la piste verrouillée), sur la
 * première piste libre du même type, créée au besoin.
 */
export function poserClip(f: Frise, pisteId: string, c: Clip): Frise {
  const type = typePisteDuClip(c, f);
  const cible = f.pistes.find(
    (p) => p.id === pisteId && p.type === type && !p.verrou && libre(p, c),
  );
  const autre = cible ?? f.pistes.find((p) => p.type === type && !p.verrou && libre(p, c));
  if (autre) return avecPiste(f, { ...autre, clips: trier([...autre.clips, c]) });
  const g = ajouterPiste(f, type);
  if (g === f) return f;
  const neuve = g.pistes.find((p) => !f.pistes.some((x) => x.id === p.id))!;
  return avecPiste(g, { ...neuve, clips: [c] });
}

export function supprimerClip(f: Frise, clipId: string): Frise {
  const t = trouver(f, clipId);
  if (!t || t.piste.verrou) return f;
  return avecPiste(f, { ...t.piste, clips: t.piste.clips.filter((c) => c.id !== clipId) });
}

/** Déplace un clip à `debut` sur la piste `pisteId` (même type ; sinon piste libre). */
export function deplacerClip(f: Frise, clipId: string, pisteId: string, debut: number): Frise {
  const t = trouver(f, clipId);
  if (!t || t.piste.verrou) return f;
  const sans = avecPiste(f, { ...t.piste, clips: t.piste.clips.filter((c) => c.id !== clipId) });
  return poserClip(sans, pisteId, { ...t.clip, debut: Math.max(0, Math.round(debut)) });
}

export function modifierClip(f: Frise, clipId: string, champs: Partial<Omit<Clip, 'id'>>): Frise {
  const t = trouver(f, clipId);
  if (!t || t.piste.verrou) return f;
  return avecPiste(f, {
    ...t.piste,
    clips: t.piste.clips.map((c) => (c.id === clipId ? ({ ...c, ...champs } as Clip) : c)),
  });
}

const decalerSource = (c: Clip, dt: number): Clip['source'] =>
  'debutSource' in c.source
    ? {
        ...c.source,
        debutSource: Math.max(0, Math.round(c.source.debutSource + dt * (c.vitesse ?? 1))),
      }
    : c.source;
const decalerPoints = (pts: PointAutomation[] | undefined, dt: number, duree: number) =>
  pts?.flatMap((p) => (p.t - dt >= 0 && p.t - dt <= duree ? [{ ...p, t: p.t - dt }] : []));
function automationsDecalees(c: Clip, dt: number, duree: number): Clip['automations'] {
  if (!c.automations) return undefined;
  const volume = decalerPoints(c.automations.volume, dt, duree);
  const opacite = decalerPoints(c.automations.opacite, dt, duree);
  return { ...(volume?.length ? { volume } : {}), ...(opacite?.length ? { opacite } : {}) };
}

/** Coupe un clip à `t` (temps de la frise) en deux clips qui se suivent. */
export function couperClip(f: Frise, clipId: string, t: number): Frise {
  const r = trouver(f, clipId);
  if (!r || r.piste.verrou) return f;
  const c = r.clip;
  const dt = Math.round(t - c.debut);
  if (dt < CLIP_MIN_MS || c.duree - dt < CLIP_MIN_MS) return f;
  const gauche: Clip = { ...c, duree: dt };
  const droite: Clip = {
    ...c,
    id: nouvelIdFrise(`${c.id.slice(0, 20)}-`, tousLesIds(f)),
    debut: c.debut + dt,
    duree: c.duree - dt,
    source: decalerSource(c, dt),
  };
  if (c.fondus) {
    gauche.fondus = { entree: c.fondus.entree, sortie: 0 };
    droite.fondus = { entree: 0, sortie: c.fondus.sortie };
  }
  if (c.automations) {
    gauche.automations = automationsDecalees(c, 0, dt);
    droite.automations = automationsDecalees(c, dt, c.duree - dt);
  }
  return avecPiste(f, {
    ...r.piste,
    clips: trier([...r.piste.clips.filter((x) => x.id !== clipId), gauche, droite]),
  });
}

/** Durée maximale du clip selon ce que contient sa source (vidéo, son, prise). */
function dureeMax(f: Frise, c: Clip): number {
  const s = c.source;
  const v = c.vitesse ?? 1;
  if (s.type === 'media') {
    const m = f.medias.find((x) => x.id === s.mediaId);
    if (m && m.type !== 'image') return Math.floor((m.dureeMs - s.debutSource) / v);
  }
  if (s.type === 'prise' && f.dureePriseMs !== undefined)
    return Math.floor((f.dureePriseMs - s.debutSource) / v);
  return 3_600_000;
}

/** Tire le bord gauche (`debut`) ou droit (`fin`) d'un clip (temps de la frise). */
export function rognerClip(
  f: Frise,
  clipId: string,
  bords: { debut?: number; fin?: number },
): Frise {
  const r = trouver(f, clipId);
  if (!r || r.piste.verrou) return f;
  let c = r.clip;
  if (bords.debut !== undefined) {
    const fin = finClip(c);
    let debut = Math.round(Math.min(Math.max(0, bords.debut), fin - CLIP_MIN_MS));
    // On ne recule pas avant le début de la source.
    if ('debutSource' in c.source)
      debut = Math.max(debut, c.debut - Math.floor(c.source.debutSource / (c.vitesse ?? 1)));
    const dt = debut - c.debut;
    c = { ...c, debut, duree: fin - debut, source: decalerSource(c, dt) };
  }
  if (bords.fin !== undefined) {
    const duree = Math.round(Math.min(Math.max(CLIP_MIN_MS, bords.fin - c.debut), dureeMax(f, c)));
    c = { ...c, duree };
  }
  if (!libre(r.piste, c)) return f;
  return avecPiste(f, {
    ...r.piste,
    clips: trier(r.piste.clips.map((x) => (x.id === clipId ? c : x))),
  });
}

/** Copie juste après l'original (ou sur une piste libre). */
export function dupliquerClip(f: Frise, clipId: string): Frise {
  const r = trouver(f, clipId);
  if (!r) return f;
  const copie = {
    ...r.clip,
    id: nouvelIdFrise(`${clipId.slice(0, 20)}-`, tousLesIds(f)),
    debut: finClip(r.clip),
  };
  return poserClip(f, r.piste.id, copie);
}

/** Ajoute (ou remplace au même instant) un point d'automation. */
export function ajouterPoint(
  f: Frise,
  clipId: string,
  param: 'volume' | 'opacite',
  p: PointAutomation,
): Frise {
  const r = trouver(f, clipId);
  if (!r) return f;
  const t = Math.round(Math.min(Math.max(0, p.t), r.clip.duree));
  const pts = (r.clip.automations?.[param] ?? []).filter((x) => x.t !== t);
  const suite = [...pts, { t, v: p.v }].sort((a, b) => a.t - b.t).slice(0, 64);
  return modifierClip(f, clipId, { automations: { ...r.clip.automations, [param]: suite } });
}

export function supprimerPoint(
  f: Frise,
  clipId: string,
  param: 'volume' | 'opacite',
  t: number,
): Frise {
  const r = trouver(f, clipId);
  if (!r?.clip.automations?.[param]) return f;
  return modifierClip(f, clipId, {
    automations: {
      ...r.clip.automations,
      [param]: r.clip.automations[param]!.filter((x) => x.t !== t),
    },
  });
}

/** Retrouve un clip et sa piste. */
export const clipParId = trouver;

/**
 * Écran de Portail Travaux demandé dans la frise : la capture existante de cette scène est
 * réutilisée, sinon une nouvelle est ajoutée (12 au plus ; `null` au-delà).
 */
export function captureDeScene(
  f: Frise,
  scene: Frise['captures'][number]['scene'],
): { frise: Frise; captureId: string } | null {
  const deja = f.captures.find((c) => c.scene === scene);
  if (deja) return { frise: f, captureId: deja.id };
  if (f.captures.length >= 12) return null;
  const captureId = nouvelIdFrise(
    'c',
    f.captures.map((c) => c.id),
  );
  return { frise: { ...f, captures: [...f.captures, { id: captureId, scene }] }, captureId };
}
