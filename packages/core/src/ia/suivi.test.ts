import { describe, expect, it } from 'vitest';
import {
  controlerEffet,
  controlerSuivi,
  demandeEffet,
  demandeSuivi,
  effetDu,
  sortieEffetIa,
  sortieSuiviIa,
} from './suivi';

const J = 86_400_000;
const contexte = 'accueil : conversion 2,6 % · sorties hero 41 %';

describe('questions de suivi (IA_ADMIN §4)', () => {
  it('chaque valeur citée doit exister dans le contexte', () => {
    const ok = sortieSuiviIa.parse({
      reponse: 'Le hero fait partir 41 % des visiteurs.',
      preuves: [{ source: 'landings', ref: 'accueil · hero', valeur: '41 %' }],
    });
    expect(controlerSuivi(ok, contexte)).toEqual([]);
    expect(
      controlerSuivi({ ...ok, preuves: [{ source: 'x', ref: 'y', valeur: '57 %' }] }, contexte),
    ).toEqual(['valeur absente du contexte : « 57 % »']);
  });
  it('la demande rappelle l’analyse, les échanges précédents et la question', () => {
    const d = demandeSuivi(
      { resume: 'Résumé.', recommandations: ['Raccourcir le hero'] },
      [{ question: 'Et sur mobile ?', reponse: 'Pareil.' }],
      'Quel gain ?',
    );
    expect(d).toContain('Résumé.');
    expect(d).toContain('Raccourcir le hero');
    expect(d).toContain('Et sur mobile ?');
    expect(d.trim().endsWith('Quel gain ?')).toBe(true);
  });
});

describe('effet mesuré à 30 jours (IA_ADMIN §5)', () => {
  const preuves = [{ source: 'landings', ref: 'accueil · conversion', valeur: '2,1 %' }];
  it('due 30 jours après « faite », une seule fois', () => {
    expect(effetDu({ statut: 'faite', faiteLe: 0 }, 30 * J)).toBe(true);
    expect(effetDu({ statut: 'faite', faiteLe: 0 }, 29 * J)).toBe(false);
    expect(effetDu({ statut: 'faite', faiteLe: 0, effet: true }, 40 * J)).toBe(false);
    expect(effetDu({ statut: 'nouvelle', faiteLe: 0 }, 40 * J)).toBe(false);
  });
  it('« avant » = une preuve d’origine, « après » = une valeur du contexte actuel', () => {
    const s = sortieEffetIa.parse({
      verdict: 'amelioration',
      resume: 'La conversion de l’accueil passe de 2,1 % à 2,6 %.',
      mesures: [{ ref: 'accueil · conversion', avant: '2,1 %', apres: '2,6 %' }],
    });
    expect(controlerEffet(s, preuves, contexte)).toEqual([]);
    expect(
      controlerEffet(
        { ...s, mesures: [{ ref: 'r', avant: '1,9 %', apres: '3 %' }] },
        preuves,
        contexte,
      ),
    ).toEqual([
      'valeur « avant » absente des preuves d’origine : « 1,9 % »',
      'valeur « après » absente du contexte actuel : « 3 % »',
    ]);
  });
  it('sans mesure, seul « indéterminé » est accepté', () => {
    const s = sortieEffetIa.parse({ verdict: 'stable', resume: 'Rien.', mesures: [] });
    expect(controlerEffet(s, preuves, contexte)).toEqual(['aucune mesure pour ce verdict']);
    expect(controlerEffet({ ...s, verdict: 'indetermine' }, preuves, contexte)).toEqual([]);
  });
  it('la demande donne les preuves d’origine et la date', () => {
    const d = demandeEffet(
      { titre: 'Raccourcir le hero', constat: 'Trop long.', preuves },
      Date.UTC(2026, 8, 1),
    );
    expect(d).toContain('2,1 %');
    expect(d).toContain('Raccourcir le hero');
    expect(d).toContain('2026-09-01');
  });
});
