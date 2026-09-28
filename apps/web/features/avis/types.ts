/** Artisan proposé à l'étape « Choisir l'artisan » de `/avis` : champs publics seulement. */
export interface ArtisanAvis {
  id: string;
  nom: string;
  ville: string;
  metier: string;
  note: number;
  nbAvis: number;
}

export const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? '')
    .join('');

/** « 4,8 (24 avis) » ; fiche sans avis : « nouvel artisan ». */
export const resumeNote = (a: Pick<ArtisanAvis, 'note' | 'nbAvis'>) =>
  a.nbAvis > 0 ? `${a.note.toFixed(1).replace('.', ',')} (${a.nbAvis} avis)` : 'aucun avis';
