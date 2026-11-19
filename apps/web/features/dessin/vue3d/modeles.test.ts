import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MATERIAUX_AVEC_TEXTURE,
  modele3D,
  OBJETS_AVEC_MODELE,
  texturePhoto,
} from '@ph/core/dessin';
import { MATERIAUX_DESSIN } from '@ph/ui/tokens';
import { describe, expect, it } from 'vitest';

const racine = join(__dirname, '../../../../..');
const licences = JSON.parse(
  readFileSync(join(racine, 'docs/data/dessin-licences.json'), 'utf8'),
) as {
  fichiers: { fichier: string; catalogueId?: string; materiauId?: string; licence: string }[];
};

describe('fichiers des modèles 3D (D88)', () => {
  it('chaque modèle existe dans public/ et a sa licence CC0 notée', () => {
    for (const id of OBJETS_AVEC_MODELE) {
      const url = modele3D(id)!;
      const fichier = `apps/web/public${url}`;
      expect(existsSync(join(racine, fichier)), fichier).toBe(true);
      const l = licences.fichiers.find((x) => x.fichier === fichier);
      expect(l, fichier).toMatchObject({ catalogueId: id, licence: 'CC0 1.0' });
    }
  });

  it('chaque texture photo existe, a sa licence, et vise un matériau du catalogue', () => {
    for (const id of MATERIAUX_AVEC_TEXTURE) {
      expect(
        MATERIAUX_DESSIN.some((m) => m.id === id),
        id,
      ).toBe(true);
      const t = texturePhoto(id)!;
      for (const url of [t.couleur, t.relief, t.rugosite]) {
        const fichier = `apps/web/public${url}`;
        expect(existsSync(join(racine, fichier)), fichier).toBe(true);
        const l = licences.fichiers.find((x) => x.fichier === fichier);
        expect(l, fichier).toMatchObject({ materiauId: id, licence: 'CC0 1.0' });
      }
    }
  });
});
