import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { appliquerRevetement } from './commandes';
import { facesExterieures, pieceDevant, revetirMursExterieurs } from './mursExterieurs';
import { facesDeLaPiece, revetirMursDeLaPiece } from './revetements';

describe('peindre d’un coup, puis retoucher un seul mur (DES-28)', () => {
  const n = niveauMaquette(contexteTest());
  const piece = n.pieces[0]!;
  const enduit = { famille: 'peinture', couleur: '#d8d2c4' } as const;
  const vert = { famille: 'peinture', couleur: '#b7c4b1' } as const;
  const rouge = { famille: 'peinture', couleur: '#c8775a' } as const;

  it('tous les murs extérieurs : seules les faces qui donnent dehors', () => {
    const faces = facesExterieures(n);
    expect(faces).toHaveLength(4);
    for (const f of faces) expect(pieceDevant(n, f.murId, f.face)).toBeNull();
    const r = ok(revetirMursExterieurs(n, enduit));
    for (const f of faces) {
      const m = r.murs.find((x) => x.id === f.murId)!;
      expect((f.face === 'a' ? m.faceA : m.faceB)?.couleur).toBe('#d8d2c4');
    }
    for (const f of facesDeLaPiece(r, piece.id)) {
      const m = r.murs.find((x) => x.id === f.murId)!;
      expect((f.face === 'a' ? m.faceA : m.faceB)?.couleur).toBeUndefined();
    }
    expect(revetirMursExterieurs({ ...n, murs: [] }, enduit).ok).toBe(false);
  });

  it('une face retouchée seule ne change pas les autres', () => {
    let r = ok(revetirMursExterieurs(n, enduit));
    r = ok(revetirMursDeLaPiece(r, piece.id, vert));
    const [une, ...autres] = facesDeLaPiece(r, piece.id);
    r = ok(appliquerRevetement(r, { genre: 'mur', murId: une!.murId, face: une!.face }, rouge));
    const couleur = (f: { murId: string; face: 'a' | 'b' }) => {
      const m = r.murs.find((x) => x.id === f.murId)!;
      return (f.face === 'a' ? m.faceA : m.faceB)?.couleur;
    };
    expect(couleur(une!)).toBe('#c8775a');
    for (const f of autres) expect(couleur(f)).toBe('#b7c4b1');
    for (const f of facesExterieures(r)) expect(couleur(f)).toBe('#d8d2c4');
    expect(pieceDevant(r, une!.murId, une!.face)?.id).toBe(piece.id);
  });
});
