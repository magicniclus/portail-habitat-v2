import 'server-only';
import { normaliser } from '@ph/core/recherche';
import { artisanPublic, avis as schemaAvis } from '@ph/core/schemas';
import { carteAnnuaire, type FichePublique } from '@ph/firebase/annuaire';
import { genererJeu, VILLES } from '@ph/firebase/seed';
import annuaire from '../../../docs/data/annuaire-demo.json';
import bareme from '../../../docs/data/bareme-appels-offres.json';
import catalogue from '../../../docs/data/prestations-catalogue.json';
import communes from '../../../docs/data/communes.json';
import demandes from '../../../docs/data/demandes-demo.json';
import prixDetailles from '../../../docs/data/prestations-prix-detaillees.json';
import prestations from '../../../docs/data/prestations.json';
import recherche from '../../../docs/data/recherche-intentions.json';

/** Jeu de test déterministe (graine et date fixes), généré une fois par processus. */
let jeu: Map<string, Record<string, unknown>> | null = null;
function documents() {
  jeu ??= genererJeu(
    {
      prestations,
      catalogue,
      prixDetailles,
      recherche,
      communes,
      annuaire,
      demandes,
      bareme,
    } as unknown as Parameters<typeof genererJeu>[0],
    42,
    new Date(Date.UTC(2026, 8, 28)),
  ).documents as Map<string, Record<string, unknown>>;
  return jeu;
}

const fiches = () =>
  [...documents()]
    .filter(([p]) => p.startsWith('artisansPublic/'))
    .map(([p, d]) => ({ id: p.split('/')[1]!, fiche: artisanPublic.parse(d) }));

/** Source de l'annuaire en mode démonstration (tests de bout en bout, `ANNUAIRE_DEMO=1`). */
export const sourceDemo = {
  async autour(lieu: { latitude: number; longitude: number }, rayonKm: number) {
    return fiches().flatMap(({ id, fiche }) => {
      const c = carteAnnuaire(id, fiche, lieu, rayonKm);
      return c ? [c] : [];
    });
  },
  async fiche(slug: string): Promise<FichePublique | null> {
    const f = fiches().find((x) => x.fiche.slug === slug);
    if (!f) return null;
    const avis = [...documents()]
      .filter(
        ([p, d]) => p.startsWith('avis/') && p.split('/').length === 2 && d.artisanId === f.id,
      )
      .map(([p, d]) => ({ id: p.split('/')[1]!, a: schemaAvis.parse(d) }))
      .filter(({ a }) => a.statut === 'publie')
      .sort((x, y) => (y.a.publieLe?.getTime() ?? 0) - (x.a.publieLe?.getTime() ?? 0))
      .slice(0, 6)
      .map(({ id, a }) => ({
        id,
        nomAffiche: a.nomAffiche,
        note: a.note,
        texte: a.texte,
        typeTravaux: a.typeTravaux,
        publieLe: a.publieLe?.getTime() ?? a.createdAt.getTime(),
      }));
    return { id: f.id, fiche: f.fiche, avis, realisations: [] };
  },
  async slugs() {
    return fiches()
      .map((f) => f.fiche.slug)
      .sort();
  },
  async lieu(ville: string) {
    const v = VILLES.find((x) => normaliser(x.nom) === normaliser(ville) || x.codePostal === ville);
    return v ? { nom: v.nom, ...v.geo } : null;
  },
};
