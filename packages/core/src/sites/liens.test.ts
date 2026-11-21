import { describe, expect, it } from 'vitest';
import { lierSelection, motsLies, retirerLien, validerAction } from './actions';

describe('mots liés dans les textes (SITE_INTERNET §4.3)', () => {
  it('la sélection devient [mot](#Ln), avec le premier numéro libre et une action vide', () => {
    const r = lierSelection('Appelez-nous pour un devis', { debut: 21, fin: 26 }, {})!;
    expect(r.texte).toBe('Appelez-nous pour un [devis](#L1)');
    expect(r.lid).toBe('L1');
    expect(r.liens).toEqual({ L1: { type: 'aucun' } });
    const r2 = lierSelection(r.texte, { debut: 0, fin: 12 }, r.liens)!;
    expect(r2.texte).toBe('[Appelez-nous](#L2) pour un [devis](#L1)');
    expect(motsLies(r2.texte)).toEqual([
      { lid: 'L2', mot: 'Appelez-nous' },
      { lid: 'L1', mot: 'devis' },
    ]);
  });

  it('sélection vide, espaces seuls, à cheval sur un lien ou avec un crochet : refusée', () => {
    const t = 'Un [mot](#L1) lié';
    expect(lierSelection(t, { debut: 2, fin: 2 }, {})).toBeNull();
    expect(lierSelection(t, { debut: 2, fin: 3 }, {})).toBeNull();
    expect(lierSelection(t, { debut: 0, fin: 6 }, {})).toBeNull();
    expect(lierSelection('a [b] c', { debut: 2, fin: 5 }, {})).toBeNull();
  });

  it('les espaces autour de la sélection restent hors du lien', () => {
    expect(lierSelection('Un mot ici', { debut: 2, fin: 7 }, {})!.texte).toBe('Un [mot](#L1) ici');
  });

  it('retirer un lien rend le mot et supprime son action', () => {
    const r = retirerLien(
      'Un [mot](#L1) et [autre](#L2)',
      { L1: { type: 'aucun' }, L2: { type: 'tel', tel: '0600000000' } },
      'L1',
    );
    expect(r.texte).toBe('Un mot et [autre](#L2)');
    expect(r.liens).toEqual({ L2: { type: 'tel', tel: '0600000000' } });
  });
});

describe('action « Pop-up »', () => {
  it('valide seulement vers une zone en fenêtre pop-up de la même page', () => {
    const ctx = {
      pages: { accueil: new Set(['offre']) },
      fichiers: new Set<string>(),
      formulaire: false,
      popups: { accueil: new Set(['offre']) },
    };
    expect(validerAction({ type: 'popup', ancre: 'offre' }, ctx, 'accueil')).toBeNull();
    expect(validerAction({ type: 'popup', ancre: 'offre' }, ctx, 'contact')).toMatch(/introuvable/);
    expect(validerAction({ type: 'popup' }, { ...ctx, popups: undefined }, 'accueil')).toMatch(
      /introuvable/,
    );
  });
});
