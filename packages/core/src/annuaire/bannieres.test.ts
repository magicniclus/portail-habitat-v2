import { describe, expect, it } from 'vitest';
import { droitsDe } from '../paiements';
import { ajouterBanniere, bannieresMax, BANNIERES_MAX_VISIBILITE } from './bannieres';

describe('bannières de la fiche', () => {
  it('1 bannière sans visibilité payante, 5 avec (Fiche Pro, Fiche + Site, Tout inclus)', () => {
    expect(bannieresMax(droitsDe('gratuit'))).toBe(1);
    expect(bannieresMax(droitsDe('site_pro'))).toBe(1);
    expect(bannieresMax(droitsDe('fiche_pro'))).toBe(BANNIERES_MAX_VISIBILITE);
    expect(bannieresMax(droitsDe('pack_fiche_site'))).toBe(5);
    expect(bannieresMax(droitsDe('tout_inclus'))).toBe(5);
  });

  it('avec une seule bannière permise, la nouvelle remplace l’ancienne', () => {
    expect(ajouterBanniere(['a'], 'b', 1)).toEqual(['b']);
    expect(ajouterBanniere([], 'b', 1)).toEqual(['b']);
  });

  it('au-delà d’une, la nouvelle s’ajoute en fin de liste, sans doublon', () => {
    expect(ajouterBanniere(['a'], 'b', 5)).toEqual(['a', 'b']);
    expect(ajouterBanniere(['a', 'b'], 'a', 5)).toEqual(['a', 'b']);
  });

  it('liste pleine : null (offre ou retrait d’une bannière d’abord)', () => {
    expect(ajouterBanniere(['a', 'b', 'c', 'd', 'e'], 'f', 5)).toBeNull();
  });

  it('après une résiliation, une liste trop longue garde ses premières bannières', () => {
    expect(ajouterBanniere(['a', 'b', 'c'], 'd', 1)).toEqual(['d']);
  });
});
