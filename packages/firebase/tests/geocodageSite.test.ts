import { describe, expect, it } from 'vitest';
import { geocoderAdresse } from '../src/serveur/sites/geocodage';

const reponse = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { 'content-type': 'application/json' } });

describe('géocodage de la carte du site', () => {
  it('premier résultat : position et libellé ; rien trouvé : null ; panne : INDISPONIBLE', async () => {
    const ok = async () =>
      reponse({
        features: [
          {
            geometry: { coordinates: [-0.57, 44.84] },
            properties: { label: '3 Rue X 33000 Bordeaux' },
          },
        ],
      });
    expect(await geocoderAdresse('3 rue X Bordeaux', ok as never)).toEqual({
      latitude: 44.84,
      longitude: -0.57,
      libelle: '3 Rue X 33000 Bordeaux',
    });
    expect(
      await geocoderAdresse('zzz', (async () => reponse({ features: [] })) as never),
    ).toBeNull();
    await expect(
      geocoderAdresse('x', (async () => reponse({}, 502)) as never),
    ).rejects.toMatchObject({ code: 'INDISPONIBLE' });
  });
});
