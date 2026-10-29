import { describe, expect, it } from 'vitest';
import { idYoutube } from './video';

describe('liens YouTube', () => {
  it('toutes les formes courantes donnent l’identifiant', () => {
    for (const l of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=30',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ?si=abc',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/live/dQw4w9WgXcQ?feature=share',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      ' https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ ',
    ])
      expect(idYoutube(l)).toBe('dQw4w9WgXcQ');
  });

  it('autre site, lien invalide ou vide : null', () => {
    for (const l of [
      'https://vimeo.com/123456',
      'pas un lien',
      '',
      undefined,
      'javascript:alert(1)',
    ])
      expect(idYoutube(l)).toBeNull();
  });
});
