import type { LABELS } from '../schemas/artisans';
import { filtresAnnuaireUrl, type FiltresAnnuaireUrl } from '../schemas/entreesAnnuaire';
import type { Tri } from './tri';

type Label = (typeof LABELS)[number];

/** Constantes de la maquette Annuaire Artisans (docs/data/annuaire-demo.json). */
export const RAYON_DEFAUT_KM = 20;
export const LIEU_DEFAUT = { nom: 'Bordeaux', latitude: 44.8378, longitude: -0.5792 };
export const NOTES_ANNUAIRE = [
  { v: 0, libelle: 'Toutes' },
  { v: 4, libelle: '4 et +' },
  { v: 4.5, libelle: '4,5 et +' },
  { v: 4.8, libelle: '4,8 et +' },
] as const;
export const DISPOS_ANNUAIRE = [
  { v: 'tous', libelle: 'Peu importe' },
  { v: 'semaine', libelle: 'Cette semaine' },
  { v: 'quinze', libelle: 'Sous 15 jours' },
] as const;
export const BUDGETS_ANNUAIRE = [
  { v: 'tous', libelle: 'Tous' },
  { v: 'petit', libelle: 'Moins de 5 000 €' },
  { v: 'moyen', libelle: '5 000 – 30 000 €' },
  { v: 'grand', libelle: 'Plus de 30 000 €' },
] as const;
export const LIBELLES_LABELS: Record<Label, string> = {
  decennale: 'Décennale vérifiée',
  rge: 'Certifié RGE',
  qualibat: 'Qualibat',
  local: 'Artisan local',
  rapide: 'Répond sous 24 h',
  recommande: '95 % de recommandation',
  photos: 'Réalisations photos',
  devis48: 'Devis sous 48 h',
};
export const LIBELLES_TRIS: Record<Tri, string> = {
  pertinence: 'Pertinence',
  note: 'Mieux notés',
  proximite: 'Plus proches',
  delai: 'Plus disponibles',
  avis: 'Plus d’avis',
};

export const DEFAUTS_ANNUAIRE: FiltresAnnuaireUrl = filtresAnnuaireUrl.parse({});

/** Filtres depuis l'URL (`?metier=plombier,carreleur&rayon=30…`) ; valeurs invalides ignorées. */
export function lireFiltresAnnuaire(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): FiltresAnnuaireUrl {
  const brut: Record<string, string> = {};
  const entrees =
    params instanceof URLSearchParams ? [...params.entries()] : Object.entries(params);
  for (const [k, v] of entrees) {
    if (v === undefined) continue;
    brut[k] = Array.isArray(v) ? v.join(',') : v;
  }
  return filtresAnnuaireUrl.parse(brut);
}

/** Chaîne de requête minimale (valeurs par défaut omises), stable pour le partage et le SEO. */
export function ecrireFiltresAnnuaire(f: FiltresAnnuaireUrl): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.ville) p.set('ville', f.ville);
  if (f.metier.length) p.set('metier', f.metier.join(','));
  if (f.rayon !== DEFAUTS_ANNUAIRE.rayon) p.set('rayon', String(f.rayon));
  if (f.note) p.set('note', String(f.note));
  if (f.labels.length) p.set('labels', f.labels.join(','));
  if (f.dispo !== 'tous') p.set('dispo', f.dispo);
  if (f.budget !== 'tous') p.set('budget', f.budget);
  if (f.tri !== 'pertinence') p.set('tri', f.tri);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export interface ChipFiltre {
  cle: string;
  libelle: string;
  /** Filtres une fois cette chip retirée (ANN-02). */
  sans: FiltresAnnuaireUrl;
}

/** Chips des filtres actifs, dans l'ordre de la maquette (ANN-02). */
export function chipsFiltres(
  f: FiltresAnnuaireUrl,
  nomMetier: (id: string) => string,
): ChipFiltre[] {
  const chips: ChipFiltre[] = [];
  if (f.q) chips.push({ cle: 'q', libelle: `« ${f.q} »`, sans: { ...f, q: '' } });
  for (const m of f.metier)
    chips.push({
      cle: `metier-${m}`,
      libelle: nomMetier(m),
      sans: { ...f, metier: f.metier.filter((x) => x !== m) },
    });
  for (const l of f.labels)
    chips.push({
      cle: `label-${l}`,
      libelle: LIBELLES_LABELS[l as Label],
      sans: { ...f, labels: f.labels.filter((x) => x !== l) },
    });
  if (f.note)
    chips.push({
      cle: 'note',
      libelle: `Note ${String(f.note).replace('.', ',')} et +`,
      sans: { ...f, note: 0 },
    });
  if (f.dispo !== 'tous')
    chips.push({
      cle: 'dispo',
      libelle: DISPOS_ANNUAIRE.find((d) => d.v === f.dispo)!.libelle,
      sans: { ...f, dispo: 'tous' },
    });
  if (f.budget !== 'tous')
    chips.push({
      cle: 'budget',
      libelle: BUDGETS_ANNUAIRE.find((b) => b.v === f.budget)!.libelle,
      sans: { ...f, budget: 'tous' },
    });
  if (f.rayon !== DEFAUTS_ANNUAIRE.rayon)
    chips.push({
      cle: 'rayon',
      libelle: `Rayon ${f.rayon} km`,
      sans: { ...f, rayon: DEFAUTS_ANNUAIRE.rayon },
    });
  return chips;
}

/** « Tout effacer » (ANN-02) : garde la recherche de lieu et le tri, retire les filtres. */
export const sansFiltres = (f: FiltresAnnuaireUrl): FiltresAnnuaireUrl => ({
  ...DEFAUTS_ANNUAIRE,
  ville: f.ville,
  tri: f.tri,
});

/** « Disponible sous 48 h » / « sous 5 jours » ; délai inconnu : rien. */
export function libelleDisponibilite(jours: number | undefined): string | null {
  if (jours === undefined || jours >= 99) return null;
  if (jours <= 2) return 'Disponible sous 48 h';
  return `Disponible sous ${jours} jours`;
}
