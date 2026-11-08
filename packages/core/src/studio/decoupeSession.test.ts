import { describe, expect, it } from 'vitest';
import { decouperSession, motSimple, type MotTranscrit } from './index';

/** Transcription factice : chaque mot dure 400 ms, 100 ms d'écart. */
function transcrire(texte: string, depart = 0): MotTranscrit[] {
  return texte
    .split(/\s+/)
    .filter(Boolean)
    .map((t, i) => ({ texte: t, debut: depart + i * 500, fin: depart + i * 500 + 400 }));
}

const scripts = [
  'Artisans, vos clients vous cherchent sur internet. Votre fiche est gratuite.',
  'Un devis propre en deux minutes, avec les mentions obligatoires vérifiées.',
  'Recevez dix demandes de travaux par mois près de chez vous, sans commission.',
];

describe('découpe d’une session tournée d’une traite', () => {
  it('mot simple : minuscules, sans accents ni ponctuation', () => {
    expect(motSimple('Vérifiées,')).toBe('verifiees');
  });

  it('retrouve chaque script dans l’ordre, bavardages et reprises compris', () => {
    const parle = [
      'bon on y va',
      scripts[0],
      'euh attends je reprends',
      'Un devis propre en deux… pardon',
      scripts[1],
      'ok la dernière',
      scripts[2],
      'voilà c’est fini',
    ].join(' ');
    const mots = transcrire(parle);
    const m = decouperSession(mots, scripts)!;
    expect(m).toHaveLength(3);
    const texte = (k: number) => m[k]!.mots.map((x) => x.texte).join(' ');
    expect(texte(0)).toContain('Votre fiche est gratuite.');
    expect(texte(0)).not.toContain('devis');
    expect(texte(1)).toContain('mentions obligatoires vérifiées.');
    expect(texte(1)).not.toContain('commission');
    expect(texte(2)).toContain('sans commission.');
    // Morceaux dans l'ordre, sans chevauchement.
    expect(m[0]!.fin).toBeLessThanOrEqual(m[1]!.debut);
    expect(m[1]!.fin).toBeLessThanOrEqual(m[2]!.debut);
    expect(m[0]!.debut).toBe(0);
  });

  it('pas assez de mots ou aucun script : rien', () => {
    expect(decouperSession(transcrire('bonjour'), scripts)).toBeNull();
    expect(decouperSession(transcrire('bonjour à tous'), [])).toBeNull();
  });
});
