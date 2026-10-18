import { prochaineVerification, type EnregistrementAttendu } from './dns';

/** Statuts d'un domaine personnel (DOMAINES §5). */
export const STATUTS_DOMAINE = {
  recherche: { libelle: 'Recherche', tone: 'neutre' },
  commande: { libelle: 'Commande en cours', tone: 'info' },
  attente_dns: { libelle: 'En attente de vos enregistrements', tone: 'attention' },
  verification: { libelle: 'Vérification en cours', tone: 'info' },
  actif: { libelle: 'Actif, HTTPS', tone: 'succes' },
  echec: { libelle: 'Non vérifié', tone: 'danger' },
  casse: { libelle: 'Ne pointe plus vers votre site', tone: 'danger' },
  resilie: { libelle: 'Retiré (Site Pro arrêté)', tone: 'neutre' },
} as const;
export type StatutDomaine = keyof typeof STATUTS_DOMAINE;

/** États d'une ligne du tableau DNS. */
export const ETATS_ENREGISTREMENT = {
  en_attente: { libelle: 'En attente', tone: 'neutre' },
  ok: { libelle: 'Correct', tone: 'succes' },
  incorrect: { libelle: 'Incorrect', tone: 'danger' },
} as const;

/** Ce que l'hébergeur renvoie à l'ajout d'un domaine (jamais codé en dur, DOMAINES §4). */
export interface ConfigHebergeur {
  apex: string[];
  cname: string;
  verifications: { nom: string; valeur: string }[];
}

/**
 * Enregistrements à créer chez le registrar de l'artisan (cas C) : A et CNAME lus chez
 * l'hébergeur, TXT de preuve sur `_portailtravaux` (sans conflit avec un SPF), vérifications
 * propres à l'hébergeur. Jamais de MX (DOM-08).
 */
export function enregistrementsConnexion(
  jeton: string,
  h: ConfigHebergeur,
): EnregistrementAttendu[] {
  return [
    ...h.apex.map((ip) => ({ type: 'A' as const, nom: '@', valeur: ip })),
    { type: 'CNAME', nom: 'www', valeur: h.cname.replace(/\.$/, '') },
    { type: 'TXT', nom: '_portailtravaux', valeur: `ph-verif=${jeton}` },
    ...h.verifications.map((v) => ({ type: 'TXT' as const, nom: v.nom, valeur: v.valeur })),
  ];
}

/** Nom à interroger pour une ligne (`@` → domaine, `www` → www.domaine). */
export function fqdn(domaine: string, nom: string): string {
  if (nom === '@') return domaine;
  return nom.endsWith(`.${domaine}`) || nom === domaine ? nom : `${nom}.${domaine}`;
}

/** Hôtes servis pour un domaine personnel : nu et www. */
export const hotesDuDomaine = (nom: string) => [nom, `www.${nom}`];

/** Adresse canonique du site : domaine actif (www ou nu), sinon le sous-domaine (DOM-05). */
export function hoteCanonique(
  site: {
    sousDomaine: string;
    domaine?: { nom: string; statut: string; principal: 'www' | 'apex' } | undefined;
  },
  base: string,
): string {
  const d = site.domaine;
  if (d?.statut === 'actif') return d.principal === 'www' ? `www.${d.nom}` : d.nom;
  return `${site.sousDomaine}.${base}`;
}

/** Prochaine vérification planifiée, ou `null` après 72 h (statut `echec`). */
export function suiteVerification(creeLe: number, maintenant: number): number | null {
  const pas = prochaineVerification(maintenant - creeLe);
  return pas === null ? null : maintenant + pas;
}
