import { describe, expect, it } from 'vitest';
import { etatSla, peutTraiter, permissionsEffectives, trierFile, typeTache } from '.';

const H = 3_600_000;

describe('file de travail (ADMIN §2.2)', () => {
  it('chaque type a une permission ; le modérateur ne voit pas les remboursements carte', () => {
    const moderateur = permissionsEffectives({ role: 'moderateur' });
    expect(peutTraiter('avis', moderateur)).toBe(true);
    expect(peutTraiter('remboursement_carte_lead', moderateur)).toBe(false);
    expect(peutTraiter('remboursement_carte_lead', permissionsEffectives({ role: 'admin' }))).toBe(
      true,
    );
    expect(typeTache('inconnu')).toMatchObject({ libelle: 'inconnu', permission: 'equipe.gerer' });
  });

  it('SLA vert, orange, rouge ; tri priorité puis ancienneté', () => {
    expect(etatSla(0, 'avis', 11 * H)).toBe('ok');
    expect(etatSla(0, 'avis', 13 * H)).toBe('bientot');
    expect(etatSla(0, 'avis', 25 * H)).toBe('depasse');
    expect(
      trierFile([
        { id: 'a', priorite: 3, creeLe: 2 },
        { id: 'b', priorite: 5, creeLe: 9 },
        { id: 'c', priorite: 3, creeLe: 1 },
      ]).map((x) => x.id),
    ).toEqual(['b', 'c', 'a']);
  });
});
