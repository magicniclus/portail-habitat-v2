import { formatNombre, nombreArrondi } from '@ph/core/format';

/** Avis publié, réduit à ce que la vitrine affiche (aucune donnée personnelle). */
export interface AvisVitrine {
  id: string;
  nomAffiche: string;
  note: number;
  texte: string;
  typeTravaux: string;
  photos: { url: string }[];
  /** Ville de l'artisan (fiche publique). */
  ville?: string;
}

export interface StatsVitrine {
  nbDemandesMois: number;
  nbArtisans: number;
  nbVilles: number;
  noteMoyenneGlobale: number;
  nbAvisTotal: number;
}

const TEXTE_MIN = 40;
const AVIS_MIN_POUR_NOTE = 10;

/** Premier et dernier mot : « Camille M. » → CM, « jean-pierre dupont » → JD. */
export function initiales(nom: string): string {
  const mots = nom.split(/\s+/).filter((m) => /\p{L}/u.test(m[0] ?? ''));
  const extremes = mots.length > 1 ? [mots[0]!, mots.at(-1)!] : mots;
  return extremes.map((m) => m[0]!.toUpperCase()).join('');
}

const projet = (a: AvisVitrine) => [a.typeTravaux, a.ville].filter(Boolean).join(' · ');

/** D49 (2) : 3 avis réels notés 4 ou 5, texte d'au moins 40 caractères ; sinon section masquée. */
export function choisirTemoignages(avis: readonly AvisVitrine[]) {
  const retenus = avis.filter((a) => a.note >= 4 && a.texte.trim().length >= TEXTE_MIN).slice(0, 3);
  if (retenus.length < 3) return [];
  return retenus.map((a) => ({
    id: a.id,
    texte: `« ${a.texte.trim()} »`,
    initiales: initiales(a.nomAffiche),
    nom: a.nomAffiche,
    projet: projet(a),
  }));
}

/** D49 (3) : 4 réalisations photographiées, sans budget ; sinon section masquée. */
export function choisirInspirations(avis: readonly AvisVitrine[]) {
  const retenus = avis.filter((a) => a.photos.length > 0).slice(0, 4);
  if (retenus.length < 4) return [];
  return retenus.map((a) => ({
    id: a.id,
    titre: a.typeTravaux,
    detail: a.ville ?? '',
    photo: a.photos[0]!.url,
  }));
}

export type ChiffresVitrine = ReturnType<typeof chiffresVitrine>;

/** Libellés de preuve sociale lus dans `stats/public` (ACC-01) ; `null` sans document. */
export function chiffresVitrine(s: StatsVitrine | null) {
  if (!s) return null;
  const noteFiable = s.nbAvisTotal >= AVIS_MIN_POUR_NOTE;
  return {
    demandes: formatNombre(s.nbDemandesMois),
    artisans: formatNombre(s.nbArtisans),
    villes: formatNombre(s.nbVilles),
    note: noteFiable ? formatNombre(s.noteMoyenneGlobale, 1) : null,
    avis: nombreArrondi(s.nbAvisTotal),
    avisExact: formatNombre(s.nbAvisTotal),
  };
}
