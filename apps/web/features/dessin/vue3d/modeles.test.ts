import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { modele3D, OBJETS_AVEC_MODELE } from '@ph/core/dessin';
import { describe, expect, it } from 'vitest';

const racine = join(__dirname, '../../../../..');
const licences = JSON.parse(
  readFileSync(join(racine, 'docs/data/dessin-licences.json'), 'utf8'),
) as { fichiers: { fichier: string; catalogueId: string; licence: string }[] };

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
});
