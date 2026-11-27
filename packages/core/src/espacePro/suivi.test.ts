import { describe, expect, it } from 'vitest';
import { aRelancer, compterEtapes, etapeSuivi, ETAPES_CHOISIES } from './suivi';

describe('etapeSuivi (suivi façon CRM de « Mes demandes »)', () => {
  it('sans choix de l’artisan : déduite du statut', () => {
    expect(etapeSuivi('proposee')).toBe('nouvelle');
    expect(etapeSuivi('vue')).toBe('nouvelle');
    expect(etapeSuivi('acceptee')).toBe('a_appeler');
    expect(etapeSuivi('devis_envoye')).toBe('devis_envoye');
    expect(etapeSuivi('devis_accepte')).toBe('gagne');
    expect(etapeSuivi('devis_refuse')).toBe('perdu');
    expect(etapeSuivi('refusee')).toBe('perdu');
    expect(etapeSuivi('expiree')).toBe('perdu');
  });

  it('étape choisie : prioritaire une fois la demande acceptée, ignorée avant', () => {
    expect(etapeSuivi('acceptee', 'rdv')).toBe('rdv');
    expect(etapeSuivi('devis_envoye', 'gagne')).toBe('gagne');
    expect(etapeSuivi('proposee', 'appele')).toBe('nouvelle');
    expect(etapeSuivi('refusee', 'appele')).toBe('perdu');
  });

  it('« nouvelle » ne se choisit pas : elle précède l’acceptation', () => {
    expect(ETAPES_CHOISIES).not.toContain('nouvelle');
  });

  it('compte par étape et demandes à relancer (date passée ou du jour, hors gagné et perdu)', () => {
    const jour = Date.UTC(2026, 10, 2, 9);
    const liste = [
      { suivi: { etape: 'a_appeler' as const, relanceLe: jour - 86_400_000 } },
      { suivi: { etape: 'rdv' as const, relanceLe: jour + 3 * 3_600_000 } },
      { suivi: { etape: 'gagne' as const, relanceLe: jour - 1 } },
      { suivi: { etape: 'appele' as const, relanceLe: jour + 3 * 86_400_000 } },
      { suivi: { etape: 'nouvelle' as const } },
    ];
    expect(liste.map((d) => aRelancer(d, jour))).toEqual([true, true, false, false, false]);
    expect(compterEtapes(liste, jour)).toMatchObject({
      a_appeler: 1,
      rdv: 1,
      gagne: 1,
      appele: 1,
      nouvelle: 1,
      perdu: 0,
      relance: 2,
    });
  });
});
