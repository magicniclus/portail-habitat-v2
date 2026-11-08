import { FORMATS_STUDIO } from './formats';
import { creerFrise, type Clip, type Frise } from './frise';
import { debutsPlans, disposition, type Rectangle } from './montage';
import type { PlanMontage } from './plan';

/**
 * Montage produit par Claude (plan) → frise multipistes, pour l'éditer comme dans un logiciel de
 * montage : les plans sur « Vidéo 1 », la caméra en incrustation sur « Vidéo 2 », la voix (qui
 * suit les coupes) sur « Audio 1 », les effets animés sur la piste du haut.
 */
export function friseDepuisPlan(
  plan: PlanMontage,
  prise: { voix: boolean; dureePriseMs: number },
): Frise {
  const { largeur: L, hauteur: H } = FORMATS_STUDIO[plan.format];
  const fraction = (r: Rectangle) => ({
    x: r.x / L,
    y: r.y / H,
    largeur: r.largeur / L,
    hauteur: r.hauteur / H,
    opacite: 1,
  });
  const plein = (r: Rectangle | null) =>
    !r || (r.x === 0 && r.y === 0 && r.largeur === L && r.hauteur === H);
  const debuts = debutsPlans(plan);
  const video: Clip[] = [];
  const camera: Clip[] = [];
  const voix: Clip[] = [];
  const effets: Clip[] = [];
  plan.plans.forEach((x, i) => {
    const debut = debuts[i]!;
    const duree = x.source.fin - x.source.debut;
    const d = disposition(plan.format, x.visuel, x.camera);
    const base = { debut, duree };
    const principal: Clip['source'] | null =
      x.visuel === 'carton'
        ? { type: 'carton', texte: x.carton ?? ' ' }
        : x.visuel === 'capture' && x.captureId
          ? { type: 'capture', captureId: x.captureId, debutSource: 0 }
          : x.visuel === 'ecran'
            ? { type: 'prise', fichier: 'ecran', debutSource: x.source.debut }
            : null;
    if (principal && d.principal)
      video.push({
        id: `${x.id}-v`,
        ...base,
        source: principal,
        ...(plein(d.principal) ? {} : { cadre: fraction(d.principal) }),
      });
    if (d.camera) {
      const clip: Clip = {
        id: `${x.id}-c`,
        ...base,
        source: { type: 'prise', fichier: 'camera', debutSource: x.source.debut },
        ...(plein(d.camera) ? {} : { cadre: fraction(d.camera) }),
      };
      // Plein cadre : la caméra est l'image principale ; sinon, incrustée au-dessus.
      (d.principal ? camera : video).push(clip);
    }
    if (prise.voix)
      voix.push({
        id: `${x.id}-a`,
        ...base,
        source: { type: 'prise', fichier: 'voix', debutSource: x.source.debut },
      });
    x.calques.forEach((c, k) =>
      effets.push({
        id: `${x.id}-e${k}`,
        debut: debut + c.debut,
        duree: Math.max(100, c.fin - c.debut),
        source: { type: 'effet', calque: { ...c, debut: 0, fin: c.fin - c.debut } },
      }),
    );
  });
  const vide = creerFrise(plan.format, plan.titre);
  const piste = (type: 'texte' | 'video' | 'audio') => vide.pistes.find((p) => p.type === type)!;
  const pistes = [
    { ...piste('texte'), clips: effets },
    ...(camera.length ? [{ ...piste('video'), id: 'v2', nom: 'Vidéo 2', clips: camera }] : []),
    { ...piste('video'), clips: video },
    { ...piste('audio'), clips: voix },
  ];
  return {
    ...vide,
    pistes,
    captures: plan.captures,
    artisan: plan.artisan,
    sousTitres: plan.sousTitres,
    musique: plan.musique,
    dureePriseMs: prise.dureePriseMs,
  };
}
