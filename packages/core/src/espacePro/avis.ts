/** « Mes avis » côté artisan (maquette Mes Avis) : résumé et filtres des avis publiés. */

export const FILTRES_AVIS_PRO = ['tous', 'positifs', 'sans_reponse'] as const;
export type FiltreAvisPro = (typeof FILTRES_AVIS_PRO)[number];
export const LIBELLES_FILTRE_AVIS: Record<FiltreAvisPro, string> = {
  tous: 'Tous',
  positifs: 'Positifs',
  sans_reponse: 'Sans réponse',
};

const RECENT_MS = 30 * 86_400_000;
/** Un avis est positif à partir de 4 étoiles (maquette : ton « Positif »). */
export const estPositif = (note: number) => note >= 4;

export function resumeAvisPro(
  avis: readonly { note: number; publieLe: number }[],
  maintenant: number,
) {
  const total = avis.length;
  return {
    moyenne: total ? avis.reduce((t, a) => t + a.note, 0) / total : 0,
    total,
    partPositifs: total ? avis.filter((a) => estPositif(a.note)).length / total : 0,
    recents: avis.filter((a) => maintenant - a.publieLe <= RECENT_MS).length,
    repartition: [5, 4, 3, 2, 1].map((note) => ({
      note,
      nombre: avis.filter((a) => a.note === note).length,
    })),
  };
}

export function filtrerAvisPro<T extends { note: number; reponse?: unknown }>(
  avis: readonly T[],
  filtre: FiltreAvisPro,
): T[] {
  if (filtre === 'positifs') return avis.filter((a) => estPositif(a.note));
  if (filtre === 'sans_reponse') return avis.filter((a) => !a.reponse);
  return [...avis];
}
