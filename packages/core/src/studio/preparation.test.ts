import { describe, expect, it } from 'vitest';
import {
  alignerCaptures,
  capturesAFilmer,
  etatCaptures,
  preparationCaptures,
  promptPreparation,
  SCHEMA_JSON_PREPARATION,
  type PlanMontage,
  type SujetStudio,
} from './index';

const artisan = {
  nom: 'Martin Plomberie',
  metier: 'plombier',
  ville: 'Bordeaux',
  demandesParMois: 10,
  chiffreAffairesCentimes: 450_000_00,
  devisEnvoyes: 12,
  noteMoyenne: 4.8,
  nombreAvis: 37,
};
const prep = { artisan, scenes: ['fiche_publique', 'demandes_recues'] as const };
const sujet = {
  titre: '10 demandes gratuites',
  angle: 'La fiche travaille seule',
  script: [
    {
      voix: 'Votre fiche reçoit 10 demandes par mois.',
      aEcran: 'demandes_recues',
      texteEcran: '10 / mois',
    },
    { voix: 'Gratuitement.', aEcran: 'camera', texteEcran: '' },
  ],
} as unknown as SujetStudio;
const plan = (captures: PlanMontage['captures'], captureId = 'x9'): PlanMontage =>
  ({
    format: 'vertical',
    titre: 'T',
    plans: [
      {
        id: 'p1',
        source: { debut: 0, fin: 4_000 },
        visuel: 'capture',
        captureId,
        camera: 'cachee',
        calques: [],
      },
    ],
    captures,
    artisan: null,
    sousTitres: false,
    musique: true,
  }) as PlanMontage;

describe('captures avant le montage', () => {
  it('préparation : artisan fictif et écrans à filmer, validés par Zod', () => {
    expect(preparationCaptures.parse({ ...prep, scenes: [...prep.scenes] })).toMatchObject(prep);
    expect(() => preparationCaptures.parse({ artisan, scenes: ['inconnue'] })).toThrow();
    expect((SCHEMA_JSON_PREPARATION as { required: string[] }).required).toEqual([
      'artisan',
      'scenes',
    ]);
  });

  it('Claude part du script : écran prévu par phrase, chiffres cohérents, nom fictif', () => {
    const p = promptPreparation({ sujet, format: 'vertical' });
    expect(p.demande).toContain('demandes_recues');
    expect(p.demande).toContain('Votre fiche reçoit 10 demandes par mois.');
    expect(p.systeme).toMatch(/fictif/);
    expect(p.contexte).toContain('fiche_publique');
  });

  it('à filmer : la préparation avant le montage, le montage ensuite', () => {
    expect(
      capturesAFilmer({
        format: 'carre',
        plan: null,
        preparation: { ...prep, scenes: [...prep.scenes] },
      }),
    ).toEqual({
      format: 'carre',
      artisan,
      captures: [
        { id: 'c1', scene: 'fiche_publique' },
        { id: 'c2', scene: 'demandes_recues' },
      ],
    });
    const p = plan([{ id: 'x9', scene: 'devis_creation' }]);
    expect(
      capturesAFilmer({
        format: 'carre',
        plan: p,
        preparation: { ...prep, scenes: [...prep.scenes] },
      }),
    ).toEqual({
      format: 'vertical',
      artisan,
      captures: [{ id: 'x9', scene: 'devis_creation' }],
    });
    expect(capturesAFilmer({ format: 'vertical', plan: null, preparation: null }).captures).toEqual(
      [],
    );
    // Frise de l'éditeur multipistes : ses captures et son artisan priment sur le plan.
    expect(
      capturesAFilmer({
        format: 'carre',
        plan: p,
        preparation: null,
        frise: { format: 'horizontal', artisan, captures: [{ id: 'f1', scene: 'fiche_publique' }] },
      }),
    ).toEqual({ format: 'horizontal', artisan, captures: [{ id: 'f1', scene: 'fiche_publique' }] });
  });

  it('le montage réutilise les captures déjà filmées (pas de double tournage)', () => {
    const filmees = { 'c2:demandes_recues': 'studio/a/c2.webm' };
    const p = alignerCaptures(plan([{ id: 'x9', scene: 'demandes_recues' }]), filmees);
    expect(p.captures).toEqual([{ id: 'c2', scene: 'demandes_recues' }]);
    expect(p.plans[0]!.captureId).toBe('c2');
    // Scène pas encore filmée : rien ne change.
    const q = plan([{ id: 'x9', scene: 'devis_creation' }]);
    expect(alignerCaptures(q, filmees)).toEqual(q);
  });

  it('état des captures, pour la barre d’étapes', () => {
    expect(etatCaptures({ preparation: null, captures: {} })).toBe('a_preparer');
    expect(etatCaptures({ preparation: { ...prep, scenes: [...prep.scenes] }, captures: {} })).toBe(
      'preparee',
    );
    expect(
      etatCaptures({
        preparation: { ...prep, scenes: [...prep.scenes] },
        captures: { 'c1:fiche_publique': 'a', 'c2:demandes_recues': 'b' },
      }),
    ).toBe('filmee');
    expect(
      etatCaptures({ preparation: { ...prep, scenes: [], ignoree: true }, captures: {} }),
    ).toBe('ignoree');
  });
});
