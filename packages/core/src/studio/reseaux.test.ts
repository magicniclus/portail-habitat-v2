import { describe, expect, it } from 'vitest';
import { legendeReseau, NOMS_RESEAUX, RESEAUX, urlAutorisation } from './index';

describe('réseaux', () => {
  it('trois réseaux, chacun avec ses variables et ses droits', () => {
    expect(NOMS_RESEAUX).toEqual(['youtube', 'instagram', 'tiktok']);
    for (const r of NOMS_RESEAUX) expect(RESEAUX[r].droits.length).toBeGreaterThan(0);
  });

  it('YouTube : accès hors ligne (jeton de rafraîchissement) et droits séparés par des espaces', () => {
    const u = new URL(
      urlAutorisation('youtube', { clientId: 'id', redirection: 'https://x/retour', etat: 'e1' }),
    );
    expect(u.origin + u.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(u.searchParams.get('access_type')).toBe('offline');
    expect(u.searchParams.get('scope')).toContain('youtube.upload https:');
    expect(u.searchParams.get('state')).toBe('e1');
  });

  it('TikTok : client_key et droits séparés par des virgules', () => {
    const u = new URL(urlAutorisation('tiktok', { clientId: 'k', redirection: 'r', etat: 'e' }));
    expect(u.searchParams.get('client_key')).toBe('k');
    expect(u.searchParams.get('client_id')).toBeNull();
    expect(u.searchParams.get('scope')).toBe(
      'user.info.basic,video.publish,video.upload,video.list',
    );
  });

  it('légende : hashtags à la fin, 3 au plus sur YouTube', () => {
    expect(legendeReseau('youtube', { texte: 'Salut', hashtags: ['a', '#b', 'c d', 'e'] })).toBe(
      'Salut\n\n#a #b #cd',
    );
    expect(legendeReseau('tiktok', { texte: 'Salut', hashtags: [] })).toBe('Salut');
  });

  it('légende trop longue : coupée avant les hashtags', () => {
    const l = legendeReseau('instagram', { texte: 'x'.repeat(3_000), hashtags: ['artisan'] });
    expect(l.length).toBeLessThanOrEqual(2_200);
    expect(l.endsWith('…\n\n#artisan')).toBe(true);
    expect(legendeReseau('instagram', { texte: 'y'.repeat(3_000), hashtags: [] }).length).toBe(
      2_200,
    );
  });
});
