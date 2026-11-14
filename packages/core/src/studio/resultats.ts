import { formatNombre } from '../format';

/**
 * Lecture des résultats de vos vidéos (STUDIO.md §12) : où les gens décrochent, ce qu'il faut
 * changer, et le résumé donné à Claude pour les prochains sujets. Que des chiffres réels.
 */

const virgule = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

/**
 * Plus forte chute de la courbe de rétention (100 points de 0 à 1) sur 3 % de la vidéo.
 * `null` sans courbe exploitable.
 */
export function decrochage(
  courbe: readonly number[] | null,
  dureeS: number,
): { seconde: number; perte: number } | null {
  if (!courbe || courbe.length < 10) return null;
  let meilleure = { i: 0, perte: 0 };
  for (let i = 0; i + 3 < courbe.length; i++) {
    const perte = courbe[i]! - courbe[i + 3]!;
    if (perte > meilleure.perte) meilleure = { i, perte };
  }
  if (meilleure.perte <= 0) return null;
  return {
    seconde: Math.round(((meilleure.i + 1.5) / courbe.length) * dureeS * 10) / 10,
    perte: Math.round(meilleure.perte * 100) / 100,
  };
}

export function diagnosticVideo(o: {
  retention: number | null;
  dureeS: number;
  courbe: readonly number[] | null;
  vues: number;
  abonnesGagnes: number | null;
}): string[] {
  const r: string[] = [];
  const d = decrochage(o.courbe, o.dureeS);
  if (d && d.perte >= 0.2 && d.seconde <= 3)
    r.push(
      `Beaucoup décrochent à ${virgule(d.seconde)} s : l’accroche ne retient pas, changez la première phrase et le premier texte.`,
    );
  else if (d && d.perte >= 0.2)
    r.push(`Grosse chute à ${virgule(d.seconde)} s : coupez ou resserrez ce passage.`);
  if (o.retention !== null && o.retention < 0.4)
    r.push(
      `Les gens regardent ${Math.round(o.retention * 100)} % de la vidéo : raccourcissez ou resserrez le milieu.`,
    );
  if (o.retention !== null && o.retention >= 0.7 && o.abonnesGagnes === 0 && o.vues >= 500)
    r.push(
      `Très bien regardée (${Math.round(o.retention * 100)} %) mais aucun abonné : finissez par une raison de s’abonner.`,
    );
  return r;
}

export interface ResultatVideo {
  titre: string;
  reseau: string;
  vues: number;
  retention: number | null;
  abonnesGagnes: number | null;
  accroche: string | null;
}

/** Résumé pour Claude : les 6 meilleures puis les 4 moins bonnes, chiffres réels uniquement. */
export function resumeVosVideos(videos: readonly ResultatVideo[]): string {
  const tries = [...videos].sort((a, b) => b.vues - a.vues);
  const choix = tries.length <= 10 ? tries : [...tries.slice(0, 6), ...tries.slice(-4)];
  return choix
    .map((v) =>
      [
        `- « ${v.titre} » (${v.reseau}) : ${formatNombre(v.vues)} vues`,
        v.retention !== null ? `${Math.round(v.retention * 100)} % regardé` : null,
        v.abonnesGagnes !== null ? `+${formatNombre(v.abonnesGagnes)} abonnés` : null,
        v.accroche ? `accroche « ${v.accroche} »` : null,
      ]
        .filter(Boolean)
        .join(', '),
    )
    .join('\n');
}
