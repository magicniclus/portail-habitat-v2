import { describe, expect, it } from 'vitest';
import {
  PERMISSIONS_ADMIN,
  ROLES_ADMIN_SYSTEME,
  permissionsEffectives,
  sectionsLecture,
} from './permissions';

describe('permissions admin (ADMIN.md §1)', () => {
  it('superadmin a tout, admin tout sauf l’équipe', () => {
    expect(permissionsEffectives({ role: 'superadmin' })).toEqual([...PERMISSIONS_ADMIN].sort());
    const admin = permissionsEffectives({ role: 'admin' });
    expect(admin).not.toContain('equipe.gerer');
    expect(admin).not.toContain('artisans.supprimer');
    expect(admin).toContain('leads.prix_illimite');
  });
  it('lecture : aucune écriture', () => {
    for (const p of permissionsEffectives({ role: 'lecture' })) expect(p).toMatch(/\.lire$/);
  });
  it('rôle + plus − moins', () => {
    const p = permissionsEffectives({
      role: 'moderateur',
      permissionsPlus: ['promos.gerer'],
      permissionsMoins: ['avis.supprimer'],
    });
    expect(p).toContain('promos.gerer');
    expect(p).not.toContain('avis.supprimer');
    expect(p).toContain('avis.moderer');
  });
  it('rôle personnalisé et permissions inconnues ignorées', () => {
    expect(
      permissionsEffectives({ role: 'custom_x', permissionsRole: ['avis.lire', 'inventee'] }),
    ).toEqual(['avis.lire']);
  });
  it('codes de section du claim `staff.s`', () => {
    expect(sectionsLecture(['avis.lire', 'leads.lire', 'finances.lire'])).toEqual([
      'ao',
      'avi',
      'fin',
    ]);
    expect(sectionsLecture(permissionsEffectives({ role: 'superadmin' }))).toHaveLength(14);
  });
  it('6 rôles système', () => {
    expect(ROLES_ADMIN_SYSTEME).toHaveLength(6);
  });
});
