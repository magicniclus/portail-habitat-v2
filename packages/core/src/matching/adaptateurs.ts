import type { ArtisanMatching, DemandeMatching, Point } from './types';

/**
 * Passage des documents Firestore (`demandes/{id}`, `artisans/{id}`) aux données du moteur :
 * fonctions pures, les dates sont en millisecondes.
 */

const JOUR_MS = 86_400_000;
/** « Je me renseigne » : démarrage supposé à 3 mois pour la décennale. */
const DELAIS_JOURS: Record<string, number | null> = {
  asap: 7,
  '1mois': 30,
  '3mois': 90,
  renseignement: null,
};

export const delaiEnJours = (delaiSouhaite: string): number | null =>
  DELAIS_JOURS[delaiSouhaite] ?? null;

/** Une demande « au plus vite » est urgente : délai d'acceptation raccourci (MATCHING [1]). */
export const estUrgente = (delaiSouhaite: string) => delaiSouhaite === 'asap';

/** Empreintes de conflit d'intérêts : email et téléphone normalisés (jamais enregistrées). */
export const empreintesContact = (c: { email?: string; telephone?: string }): string[] =>
  [
    c.email ? `email:${c.email.trim().toLowerCase()}` : null,
    c.telephone ? `tel:${c.telephone.replace(/\s/g, '')}` : null,
  ].filter((x): x is string => x !== null);

/** Métier recherché : celui de l'intention, sinon le métier dont c'est la prestation par défaut. */
export function metierDeDemande(
  d: { intention?: string; prestationId: string },
  ref: {
    intentions: readonly { id: string; metier: string; prestation: string }[];
    metiers: readonly { id: string; prestation?: string }[];
  },
): string | null {
  const parIntention = d.intention ? ref.intentions.find((i) => i.id === d.intention) : undefined;
  if (parIntention) return parIntention.metier;
  return (
    ref.metiers.find((m) => m.prestation === d.prestationId)?.id ??
    ref.intentions.find((i) => i.prestation === d.prestationId)?.metier ??
    null
  );
}

export interface DocDemande {
  intention?: string;
  prestationId: string;
  rgeRequis?: boolean;
  adresseChantier: { geo: Point };
  delaiSouhaite: string;
  estimation: { minCentimes: number; maxCentimes: number };
  reponsesLisibles?: { reponse: string }[];
  contact: { email?: string; telephone?: string };
  artisanCibleId?: string;
}

export function demandePourMatching(
  id: string,
  d: DocDemande,
  metierRequis: string,
  maintenant: number,
): DemandeMatching {
  const delai = delaiEnJours(d.delaiSouhaite);
  return {
    id,
    geo: d.adresseChantier.geo,
    metierRequis,
    ...(d.intention ? { intention: d.intention } : {}),
    exigences: d.rgeRequis ? ['rge'] : [],
    budgetMinCentimes: d.estimation.minCentimes,
    budgetMaxCentimes: d.estimation.maxCentimes,
    delaiSouhaiteJours: delai,
    demarrageLe: maintenant + (delai ?? 90) * JOUR_MS,
    motsReponses: (d.reponsesLisibles ?? []).map((r) => r.reponse),
    empreintesDemandeur: empreintesContact(d.contact),
    ...(d.artisanCibleId ? { artisanCibleId: d.artisanCibleId } : {}),
  };
}

export interface DocArtisan {
  siren: string;
  zoneIntervention: { centre: Point; rayonKm: number };
  metierPrincipal: string;
  metiers: readonly string[];
  intentions?: readonly string[];
  tags?: readonly string[];
  verification: { statut: string; verifieLe?: number };
  /** Fin de la décennale ; `labelsVerifies.decennale` sans date : valable. */
  assuranceDecennale?: { fin: number };
  labelsVerifies?: Record<string, { expireLe?: number }>;
  rge?: { verifie: boolean; expireLe?: number };
  sanctionActive?: boolean;
  enPause?: boolean;
  demandesRecuesMois?: number;
  quotaDemandesMois?: number;
  budgetMin?: number;
  budgetMax?: number;
  plan: string;
  optionVisibilite?: boolean;
  noteMoyenne?: number;
  nbAvis?: number;
  tauxRecommandation?: number;
  tauxReponse?: number;
  tempsReponseMoyenMin?: number;
  delaiDispoJours?: number;
  completude?: number;
  derniereAttributionLe?: number;
}

/** Échéance de la décennale : assurance saisie, sinon label vérifié (sans date = valable). */
function finDecennale(a: DocArtisan): number | undefined {
  if (a.assuranceDecennale) return a.assuranceDecennale.fin;
  const label = a.labelsVerifies?.decennale;
  if (!label) return undefined;
  return label.expireLe ?? Number.MAX_SAFE_INTEGER;
}

export function artisanPourMatching(
  id: string,
  a: DocArtisan,
  contexte: {
    maintenant: number;
    empreintes: readonly string[];
    attributions7j: number;
    tauxRefus30j: number;
  },
): ArtisanMatching {
  const qualifications = [
    ...Object.entries(a.labelsVerifies ?? {})
      .filter(([, v]) => (v.expireLe ?? Infinity) > contexte.maintenant)
      .map(([k]) => k),
    ...(a.rge?.verifie && (a.rge.expireLe ?? Infinity) > contexte.maintenant ? ['rge'] : []),
  ];
  const decennale = finDecennale(a);
  return {
    id,
    siren: a.siren,
    geo: a.zoneIntervention.centre,
    rayonKm: a.zoneIntervention.rayonKm,
    metierPrincipal: a.metierPrincipal,
    metiersSecondaires: a.metiers.filter((m) => m !== a.metierPrincipal),
    intentions: a.intentions ?? [],
    tags: a.tags ?? [],
    verifie: a.verification.statut === 'verifie',
    ...(decennale !== undefined ? { decennaleExpireLe: decennale } : {}),
    qualifications: [...new Set(qualifications)],
    sanctionActive: a.sanctionActive === true,
    enPause: a.enPause === true,
    demandesRecuesMois: a.demandesRecuesMois ?? 0,
    quotaDemandesMois: a.quotaDemandesMois ?? 0,
    empreintes: [...contexte.empreintes, `siren:${a.siren}`],
    ...(a.budgetMin !== undefined ? { budgetMinCentimes: a.budgetMin } : {}),
    ...(a.budgetMax !== undefined ? { budgetMaxCentimes: a.budgetMax } : {}),
    premium: a.plan === 'premium',
    optionVisibilite: a.optionVisibilite === true,
    note: a.noteMoyenne ?? 0,
    nbAvis: a.nbAvis ?? 0,
    tauxRecommandation: a.tauxRecommandation ?? 0,
    tauxReponse: a.tauxReponse ?? 0,
    tempsReponseMoyenMin: a.tempsReponseMoyenMin ?? 1440,
    ...(a.delaiDispoJours !== undefined ? { delaiDispoJours: a.delaiDispoJours } : {}),
    completude: a.completude ?? 0,
    attributions7j: contexte.attributions7j,
    tauxRefus30j: contexte.tauxRefus30j,
    joursDepuisVerification: a.verification.verifieLe
      ? Math.floor((contexte.maintenant - a.verification.verifieLe) / JOUR_MS)
      : 9999,
    ...(a.derniereAttributionLe !== undefined
      ? { derniereAttributionLe: a.derniereAttributionLe }
      : {}),
  };
}

/** Délai d'acceptation d'une proposition (24 h, 4 h si urgente). */
export function expirationProposition(
  c: { delaiAcceptationH: number; delaiAcceptationUrgentH: number },
  urgente: boolean,
  maintenant: number,
): number {
  return maintenant + (urgente ? c.delaiAcceptationUrgentH : c.delaiAcceptationH) * 3_600_000;
}
