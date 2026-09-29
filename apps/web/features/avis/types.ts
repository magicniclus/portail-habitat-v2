/** Artisan proposé à l'étape « Choisir l'artisan » de `/avis` : champs publics seulement. */
export interface ArtisanAvis {
  id: string;
  nom: string;
  ville: string;
  metier: string;
  note: number;
  nbAvis: number;
}

/** « 4,8 (24 avis) » ; fiche sans avis : « nouvel artisan ». */
export const resumeNote = (a: Pick<ArtisanAvis, 'note' | 'nbAvis'>) =>
  a.nbAvis > 0 ? `${a.note.toFixed(1).replace('.', ',')} (${a.nbAvis} avis)` : 'aucun avis';
