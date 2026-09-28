import { describe, expect, it } from 'vitest';
import { grilleTarifs, PRIX_AFFICHES } from './tarifs';

describe('grille des tarifs pro (D24, D25, D26b)', () => {
  it('prix par défaut conformes aux décisions', () => {
    expect(PRIX_AFFICHES).toEqual({
      premiumMensuelHt: 9990,
      premiumAnnuelHtMois: 7990,
      visibiliteAnnuelHt: 7990,
      visibiliteMensuelHt: 1290,
    });
  });
  it('annuel : prix barré, équivalent mensuel, total et économie', () => {
    const g = grilleTarifs(PRIX_AFFICHES, 'annuel');
    expect(g.visibilite).toEqual({ parMois: 666, barre: 1290, totalAnnuel: 7990, economie: 7490 });
    expect(g.premium).toEqual({
      parMois: 7990,
      barre: 9990,
      totalAnnuel: 95_880,
      economie: 24_000,
    });
  });
  it('mensuel : pas de prix barré ni d’économie', () => {
    const g = grilleTarifs(PRIX_AFFICHES, 'mensuel');
    expect(g.visibilite).toEqual({ parMois: 1290, barre: null, totalAnnuel: null, economie: null });
    expect(g.premium.parMois).toBe(9990);
  });
  it('remise maximale affichée arrondie vers le bas (« jusqu’à −48 % »)', () => {
    expect(grilleTarifs(PRIX_AFFICHES, 'annuel').remiseMaxPourcent).toBe(48);
  });
  it('montants toujours entiers', () => {
    const g = grilleTarifs({ ...PRIX_AFFICHES, visibiliteAnnuelHt: 1001 }, 'annuel');
    expect(Number.isInteger(g.visibilite.parMois)).toBe(true);
  });
});
