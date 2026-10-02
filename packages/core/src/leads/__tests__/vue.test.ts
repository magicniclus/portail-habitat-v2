import { describe, expect, it } from 'vitest';
import {
  filtresAppelsOffres,
  texteDisponibleDans,
  textePlaces,
  textePrix,
  vueAppelOffres,
  type AppelOffresLu,
} from '..';

const T = Date.UTC(2026, 9, 10, 12);
/** Espaces insécables des montants français → espaces simples. */
const e = (x: string) => x.replace(/[\u00a0\u202f]/g, ' ');
const ao: AppelOffresLu = {
  id: 'ao1',
  titre: 'Peinture intérieure à Floirac',
  resume: 'Séjour de 30 m².',
  metier: 'peintre',
  ville: 'Floirac',
  codePostal: '33270',
  geo: { latitude: 44.8366, longitude: -0.5285 },
  budgetMinCentimes: 150_000,
  budgetMaxCentimes: 250_000,
  urgence: 'normale',
  exigences: [],
  nbDeblocages: 1,
  nbDeblocagesMax: 3,
  statut: 'ouvert',
  acces: 'premium_prioritaire',
  fenetrePremiumMin: 60,
  ouvertLe: T - 20 * 60_000,
  tarification: { mode: 'auto', prixBaseCentimes: 1900, prixPremiumCentimes: 1300, prixCredits: 2 },
};
const ctx = {
  premium: false,
  maintenant: T,
  centre: { latitude: 44.8378, longitude: -0.5792 },
  debloque: false,
  nomMetier: (id: string) => (id === 'peintre' ? 'Peintre' : id),
};

describe('vueAppelOffres', () => {
  it('compte gratuit dans la fenêtre Premium : réservé, disponible dans 40 min, prix de base', () => {
    const v = vueAppelOffres(ao, ctx);
    expect(v).toMatchObject({
      id: 'ao1',
      etat: 'reserve',
      lieu: 'Floirac (33270)',
      distance: 'à 4 km',
      badge: { texte: 'Premium · 1 h d’avance', ton: 'premium' },
      disponibleDans: 'Disponible pour vous dans 40 min',
      places: '2 places restantes sur 3',
      prix: { centimes: 1900, credits: 2 },
      tags: ['Peintre'],
      metier: 'peintre',
    });
    expect(e(v.budget)).toBe('1 500 – 2 500 €');
    expect(v.publie).toBe('il y a 20 minutes');
  });

  it('Premium : ouvert tout de suite au prix Premium ; urgent et RGE affichés', () => {
    const v = vueAppelOffres(
      { ...ao, urgence: 'urgente', exigences: ['rge'] },
      { ...ctx, premium: true, centre: undefined },
    );
    expect(v).toMatchObject({
      etat: 'ouvert',
      distance: null,
      badge: { texte: 'Urgent', ton: 'urgent' },
      prix: { centimes: 1300, credits: 2 },
      tags: ['Peintre', 'RGE requis', 'Au plus vite'],
    });
    expect(v.disponibleDans).toBeNull();
  });

  it('déjà débloqué, puis complet', () => {
    expect(vueAppelOffres(ao, { ...ctx, debloque: true }).etat).toBe('debloque');
    expect(vueAppelOffres({ ...ao, statut: 'complet', nbDeblocages: 3 }, ctx)).toMatchObject({
      etat: 'complet',
      places: 'Complet',
    });
    expect(vueAppelOffres({ ...ao, ouvertLe: T - 2 * 3_600_000 }, ctx).badge).toEqual({
      texte: 'Peintre',
      ton: 'normal',
    });
  });
});

describe('textes', () => {
  it('prix, places, délai', () => {
    expect(e(textePrix({ centimes: 1900, credits: 2, promo: false }))).toBe('19 € HT ou 2 crédits');
    expect(e(textePrix({ centimes: 1250, credits: 1, promo: true }))).toBe(
      '12,50 € HT ou 1 crédit',
    );
    expect(textePrix({ centimes: 0, credits: 0, promo: false })).toBe('Offert');
    expect(textePlaces(2, 3)).toBe('Plus qu’une place');
    expect(textePlaces(0, 3)).toBe('3 places restantes sur 3');
    expect(textePlaces(3, 3)).toBe('Complet');
    expect(texteDisponibleDans(70 * 60_000)).toBe('Disponible pour vous dans 1 h 10');
    expect(texteDisponibleDans(120 * 60_000)).toBe('Disponible pour vous dans 2 h');
    expect(texteDisponibleDans(30_000)).toBe('Disponible pour vous dans 1 min');
  });

  it('filtres : « Tous » puis les métiers présents, sans doublon', () => {
    const cartes = [
      vueAppelOffres(ao, ctx),
      vueAppelOffres({ ...ao, id: 'ao2' }, ctx),
      vueAppelOffres({ ...ao, id: 'ao3', metier: 'plaquiste' }, ctx),
    ];
    expect(filtresAppelsOffres(cartes, ctx.nomMetier)).toEqual([
      { id: 'tous', label: 'Tous' },
      { id: 'peintre', label: 'Peintre' },
      { id: 'plaquiste', label: 'plaquiste' },
    ]);
  });
});
