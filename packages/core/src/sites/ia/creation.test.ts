import { describe, expect, it } from 'vitest';
import { planCreation, questionsCreation, reponsesCreation, type FicheCreation } from './creation';

const fiche: FicheCreation = {
  metierPrincipal: 'plombier',
  metierNom: 'Plombier',
  ville: 'Pessac',
  prestations: ['Dépannage fuite', 'Chauffe-eau', 'Salle de bain', 'WC'],
  nbPhotos: 6,
  nbAvis: 12,
  labels: ['rge', 'decennale'],
  rayonKm: 20,
  communesProches: ['Mérignac', 'Talence', 'Bègles'],
  pitch: 'Dépannage rapide',
};

describe('questionnaire de création (IA_SITE §3.1, SITE-IA-07)', () => {
  it('6 questions au plus, adaptatives, sans redemander la fiche', () => {
    const q = questionsCreation(fiche);
    expect(q.questions.filter((x) => x.id !== 'locales').length).toBeLessThanOrEqual(6);
    expect(q.questions.map((x) => x.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'locales']);
    expect(q.questions[0]!.options).toEqual(fiche.prestations);
    expect(q.questions.find((x) => x.id === 'q5')!.options).toContain('Les aides (MaPrimeRénov’)');
    expect(q.questions.find((x) => x.id === 'locales')!.preselection).toEqual([
      'Mérignac',
      'Talence',
      'Bègles',
    ]);
    expect(q.repris).toEqual(
      expect.arrayContaining([
        'Métier : Plombier',
        'Ville : Pessac',
        '12 avis',
        '6 photos de chantier',
      ]),
    );
    // Toutes les questions se passent ou acceptent « Je ne sais pas ».
    expect(q.questions.every((x) => x.passable)).toBe(true);
  });

  it('pas d’urgence hors métiers de dépannage, rien à montrer sans photos ni avis, pas de pages locales en petit rayon', () => {
    const q = questionsCreation({
      ...fiche,
      metierPrincipal: 'peintre',
      metierNom: 'Peintre',
      nbPhotos: 0,
      nbAvis: 0,
      labels: [],
      rayonKm: 5,
    });
    expect(q.questions.map((x) => x.id)).toEqual(['q1', 'q2', 'q3', 'q6']);
  });

  it('réponses validées ; plan de pages selon les réponses et la fiche', () => {
    const r = reponsesCreation.parse({
      q1: ['Chauffe-eau'],
      q2: 'Particuliers',
      q3: ['Devis rapide'],
      q6: 'Chaleureux',
      locales: ['Mérignac'],
    });
    const plan = planCreation(r, fiche);
    expect(plan.map((p) => p.cle)).toEqual([
      'accueil',
      'prestations',
      'realisations',
      'avis',
      'contact',
      'locale-merignac',
    ]);
    expect(plan[0]!.consigne).toContain('Chauffe-eau');
    expect(planCreation(r, { ...fiche, nbPhotos: 0, nbAvis: 0 }).map((p) => p.cle)).not.toContain(
      'avis',
    );
    expect(reponsesCreation.safeParse({ q1: ['a', 'b', 'c', 'd'] }).success).toBe(false);
  });
});
