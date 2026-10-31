import { describe, expect, it } from 'vitest';
import { permissionsEffectives, SECTIONS_ADMIN, sectionDuChemin, sectionsVisibles } from '.';

const ids = (role: string) => sectionsVisibles(permissionsEffectives({ role })).map((s) => s.id);

describe('menu de l’admin (maquette, ADMIN §1)', () => {
  it('superadmin : tout ; finance : finances et artisans ; modérateur : sans finances ni équipe', () => {
    expect(ids('superadmin')).toHaveLength(SECTIONS_ADMIN.length);
    expect(ids('finance')).toEqual(['tableau', 'artisans', 'appels-offres', 'finances']);
    const moderateur = ids('moderateur');
    expect(moderateur).toEqual(
      expect.arrayContaining(['tableau', 'file', 'artisans', 'demandes', 'avis', 'litiges']),
    );
    expect(moderateur).not.toContain('finances');
    expect(moderateur).not.toContain('equipe');
    expect(ids('lecture')).not.toContain('file');
  });

  it('section d’un chemin', () => {
    expect(sectionDuChemin('/admin')?.id).toBe('tableau');
    expect(sectionDuChemin('/admin/finances/export?mois=9')?.id).toBe('finances');
    expect(sectionDuChemin('/admin/inconnue')).toBeNull();
  });
});
