import { describe, expect, it } from 'vitest';
import { objetDuCatalogue } from './catalogue';
import { modele3D, OBJETS_AVEC_MODELE } from './modeles3d';

describe('modèles 3D des meubles (D88)', () => {
  it('chaque modèle est relié à un objet du catalogue ; sans modèle : forme simple', () => {
    expect(OBJETS_AVEC_MODELE.length).toBeGreaterThanOrEqual(17);
    for (const id of OBJETS_AVEC_MODELE) expect(objetDuCatalogue(id)).toBeDefined();
    expect(modele3D('canape-3')).toBe('/dessin/modeles/sofa_02.glb');
    expect(modele3D('prise')).toBeNull();
  });
});
