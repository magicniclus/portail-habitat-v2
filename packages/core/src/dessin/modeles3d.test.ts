import { describe, expect, it } from 'vitest';
import { objetDuCatalogue } from './catalogue';
import { MATERIAUX_AVEC_TEXTURE, modele3D, OBJETS_AVEC_MODELE, texturePhoto } from './modeles3d';

describe('modèles 3D des meubles (D88)', () => {
  it('chaque modèle est relié à un objet du catalogue ; sans modèle : forme simple', () => {
    expect(OBJETS_AVEC_MODELE.length).toBeGreaterThanOrEqual(17);
    for (const id of OBJETS_AVEC_MODELE) expect(objetDuCatalogue(id)).toBeDefined();
    expect(modele3D('canape-3')).toBe('/dessin/modeles/sofa_02.glb');
    expect(modele3D('prise')).toBeNull();
  });

  it('textures photo : trois cartes WebP et la taille réelle ; sinon motif dessiné', () => {
    expect(MATERIAUX_AVEC_TEXTURE.length).toBeGreaterThanOrEqual(11);
    expect(texturePhoto('pa-chene-clair')).toEqual({
      couleur: '/dessin/textures/laminate_floor_02-couleur.webp',
      relief: '/dessin/textures/laminate_floor_02-relief.webp',
      rugosite: '/dessin/textures/laminate_floor_02-rugosite.webp',
      taille: 1700,
    });
    expect(texturePhoto('pp-rayures')).toBeNull();
    expect(texturePhoto(undefined)).toBeNull();
  });
});
