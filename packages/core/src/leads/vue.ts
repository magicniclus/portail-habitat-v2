import { formatEuros, formatFourchette, formatRelatif } from '../format';
import { distanceKm } from '../matching';
import type { Point } from '../matching';
import { accesAppelOffres, type AccesAppelOffres } from './deblocage';
import { prixDeblocage, type PrixDeblocage, type TarificationLead, type Urgence } from './prix';

/**
 * Écran Appels d'offres (maquette « Appels d Offres ») : cartes anonymisées, fenêtre Premium (D50),
 * places restantes et prix pour l'entreprise connectée. Fonctions pures, dates en millisecondes.
 */

export interface AppelOffresLu {
  id: string;
  titre: string;
  resume: string;
  metier: string;
  ville: string;
  codePostal: string;
  geo: Point;
  budgetMinCentimes: number;
  budgetMaxCentimes: number;
  urgence: Urgence;
  exigences: readonly string[];
  nbDeblocages: number;
  nbDeblocagesMax: number;
  statut: string;
  acces: AccesAppelOffres;
  fenetrePremiumMin: number;
  ouvertLe: number;
  tarification: TarificationLead;
}

export type EtatCarteAppelOffres = 'ouvert' | 'reserve' | 'debloque' | 'complet';

export interface CarteAppelOffres {
  id: string;
  metier: string;
  titre: string;
  resume: string;
  lieu: string;
  distance: string | null;
  publie: string;
  budget: string;
  tags: string[];
  badge: { texte: string; ton: 'urgent' | 'premium' | 'normal' };
  etat: EtatCarteAppelOffres;
  disponibleDans: string | null;
  places: string;
  prix: PrixDeblocage;
  textePrix: string;
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export function textePrix(p: PrixDeblocage): string {
  if (p.centimes === 0 && p.credits === 0) return 'Offert';
  return `${formatEuros(p.centimes)} HT ou ${pluriel(p.credits, 'crédit')}`;
}

export function textePlaces(nb: number, max: number): string {
  const reste = max - nb;
  if (reste <= 0) return 'Complet';
  if (reste === 1) return 'Plus qu’une place';
  return `${reste} places restantes sur ${max}`;
}

export function texteDisponibleDans(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(min / 60);
  const reste = min % 60;
  const duree = h ? `${h} h${reste ? ` ${String(reste).padStart(2, '0')}` : ''}` : `${min} min`;
  return `Disponible pour vous dans ${duree}`;
}

export function vueAppelOffres(
  ao: AppelOffresLu,
  ctx: {
    premium: boolean;
    maintenant: number;
    centre?: Point;
    debloque: boolean;
    nomMetier: (id: string) => string;
  },
): CarteAppelOffres {
  const acces = accesAppelOffres(ao, ctx.premium, ctx.maintenant);
  const complet = ao.statut !== 'ouvert' || ao.nbDeblocages >= ao.nbDeblocagesMax;
  const etat: EtatCarteAppelOffres = ctx.debloque
    ? 'debloque'
    : complet
      ? 'complet'
      : acces === 'ok'
        ? 'ouvert'
        : 'reserve';
  const prix = prixDeblocage(ao.tarification, {
    premium: ctx.premium,
    maintenant: new Date(ctx.maintenant),
  });
  const urgente = ao.urgence === 'urgente';
  const libre = ao.ouvertLe + ao.fenetrePremiumMin * 60_000;
  return {
    id: ao.id,
    metier: ao.metier,
    titre: ao.titre,
    resume: ao.resume,
    lieu: `${ao.ville} (${ao.codePostal})`,
    distance: ctx.centre ? `à ${Math.round(distanceKm(ctx.centre, ao.geo))} km` : null,
    publie: formatRelatif(ao.ouvertLe, ctx.maintenant),
    budget: formatFourchette(ao.budgetMinCentimes, ao.budgetMaxCentimes),
    tags: [
      ctx.nomMetier(ao.metier),
      ...(ao.exigences.includes('rge') ? ['RGE requis'] : []),
      ...(urgente ? ['Au plus vite'] : []),
    ],
    badge:
      etat === 'reserve'
        ? { texte: `Premium · ${ao.fenetrePremiumMin / 60} h d’avance`, ton: 'premium' }
        : urgente
          ? { texte: 'Urgent', ton: 'urgent' }
          : { texte: ctx.nomMetier(ao.metier), ton: 'normal' },
    etat,
    disponibleDans:
      etat === 'reserve' && ao.acces === 'premium_prioritaire'
        ? texteDisponibleDans(libre - ctx.maintenant)
        : null,
    places: textePlaces(ao.nbDeblocages, ao.nbDeblocagesMax),
    prix,
    textePrix: textePrix(prix),
  };
}

/** Puces de filtre : « Tous » puis chaque métier présent dans la liste. */
export function filtresAppelsOffres(
  cartes: readonly { metier: string }[],
  nomMetier: (id: string) => string,
): { id: string; label: string }[] {
  const metiers = [...new Set(cartes.map((c) => c.metier))];
  return [{ id: 'tous', label: 'Tous' }, ...metiers.map((m) => ({ id: m, label: nomMetier(m) }))];
}
