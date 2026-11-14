import { describe, expect, it } from 'vitest';
import { classerReels, promptSujets, type ReelInstagram } from './index';

const T = Date.UTC(2026, 10, 6);
const reel = (
  lien: string,
  likes: number | null,
  commentaires: number,
  joursAvant: number,
): ReelInstagram => ({
  lien,
  legende: `Reel ${lien}`,
  likes,
  commentaires,
  publieeLe: new Date(T - joursAvant * 86_400_000).toISOString(),
  hashtag: 'artisan',
});

describe('Reels Instagram', () => {
  it('classés par interactions par jour, sans doublon', () => {
    const r = classerReels(
      [
        reel('a', 1_000, 0, 10),
        reel('b', 300, 100, 2),
        reel('b', 300, 100, 2),
        reel('c', null, 5, 0),
      ],
      T,
    );
    expect(r.map((x) => [x.lien, x.interactionsParJour])).toEqual([
      ['b', 300],
      ['a', 100],
      ['c', 15],
    ]);
  });

  it('passent dans la demande à Claude, avec leurs chiffres réels', () => {
    const p = promptSujets({
      videos: [],
      nombre: 3,
      reels: classerReels([reel('x', 500, 20, 5)], T),
    });
    expect(p.demande).toContain('Reels Instagram populaires');
    expect(p.demande).toContain('#artisan');
    expect(p.demande).toContain('500 j’aime · 20 commentaires');
  });
});
