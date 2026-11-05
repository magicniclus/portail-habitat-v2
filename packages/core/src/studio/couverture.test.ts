import { describe, expect, it } from 'vitest';
import {
  basSousTitres,
  couverture,
  dessinerCalques,
  dessinerImage,
  dessinerSousTitre,
  disposition,
  lignesSousTitres,
  motsSortie,
  positionSource,
  promptMontage,
  promptSujets,
  reglagesSousTitres,
  segmentsParoles,
  srt,
  transcriptionHorodatee,
  verifierPlan,
  type Calque,
  type ContexteImage,
  type PlanMontage,
} from './index';

const rien = () => {};
function ctx(largeurCar = 30) {
  const textes: string[] = [];
  const images: unknown[] = [];
  const c = {
    textes,
    images,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: 'miter',
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    globalAlpha: 1,
    shadowColor: '',
    shadowBlur: 0,
    save: rien,
    restore: rien,
    translate: rien,
    scale: rien,
    beginPath: rien,
    moveTo: rien,
    lineTo: rien,
    closePath: rien,
    arc: rien,
    fill: rien,
    stroke: rien,
    fillRect: rien,
    fillText: (t: string) => void textes.push(t),
    strokeText: rien,
    measureText: (t: string) => ({ width: t.length * largeurCar }),
    drawImage: (...a: unknown[]) => void images.push(a[0]),
  };
  return c as typeof c & ContexteImage;
}
const theme = {
  accent: 'a',
  accentTexte: 'b',
  sombre: 'c',
  clair: 'd',
  succes: 'e',
  police: 'p',
  fond: 'f',
};
const zone = { x: 0, y: 0, largeur: 1080, hauteur: 1920 };
const plan = (s: Partial<PlanMontage> = {}): PlanMontage => ({
  format: 'vertical',
  titre: 'T',
  plans: [
    {
      id: 'a',
      source: { debut: 0, fin: 6000 },
      visuel: 'capture',
      captureId: 'c1',
      camera: 'cachee',
      calques: [],
    },
    { id: 'b', source: { debut: 6000, fin: 12000 }, visuel: 'ecran', camera: 'coin', calques: [] },
  ],
  captures: [{ id: 'c1', scene: 'fiche_publique' }],
  artisan: null,
  sousTitres: false,
  musique: false,
  ...s,
});

describe('studio : cas limites', () => {
  it('transcription horodatée : phrases, pauses', () => {
    expect(
      transcriptionHorodatee([
        { texte: 'Bonjour.', debut: 0, fin: 400 },
        { texte: 'Les', debut: 500, fin: 600 },
        { texte: 'artisans', debut: 2000, fin: 2500 },
      ]),
    ).toBe('[0-400] Bonjour.\n[500-600] Les\n[2000-2500] artisans');
    expect(transcriptionHorodatee([])).toBe('');
  });

  it('découpe : valeurs par défaut, « hein » retiré', () => {
    expect(
      segmentsParoles(
        [
          { texte: 'Hein', debut: 0, fin: 100 },
          { texte: 'oui', debut: 200, fin: 400 },
        ],
        {},
      ),
    ).toEqual([{ debut: 150, fin: 550 }]);
  });

  it('sous-titres : réglages par format, mot à cheval coupé, heures en SRT', () => {
    expect(reglagesSousTitres('vertical').motsMax).toBe(3);
    expect(reglagesSousTitres('carre').motsMax).toBe(4);
    expect(reglagesSousTitres('horizontal').motsMax).toBe(5);
    const p = plan();
    expect(motsSortie(p, [{ texte: 'x', debut: 5800, fin: 6300 }])).toEqual([
      { texte: 'x', debut: 6000, fin: 6300 },
    ]);
    const l = lignesSousTitres([
      { texte: 'Fin.', debut: 0, fin: 100 },
      { texte: 'Suite', debut: 150, fin: 300 },
    ]);
    expect(l).toHaveLength(2);
    expect(
      srt([{ debut: 3_600_000, fin: 3_601_000, mots: [{ texte: 'a', debut: 0, fin: 1 }] }]),
    ).toMatch(/^1\n01:00:00,000/);
  });

  it('vérification : identifiant en double, plan trop court, carton sans texte, schéma invalide', () => {
    const p = plan({
      plans: [
        {
          id: 'a',
          source: { debut: 0, fin: 200 },
          visuel: 'carton',
          camera: 'cachee',
          calques: [],
        },
        {
          id: 'a',
          source: { debut: 200, fin: 12000 },
          visuel: 'ecran',
          camera: 'cachee',
          calques: [],
        },
      ],
    });
    const e = verifierPlan(p, { dureePriseMs: 20000, camera: true }).join(' ');
    expect(e).toMatch(/double/);
    expect(e).toMatch(/trop court/);
    expect(e).toMatch(/carton manquant/);
    expect(verifierPlan({ plans: 'x' }, { dureePriseMs: 1, camera: true })[0]).toMatch(/:/);
    expect(verifierPlan(null, { dureePriseMs: 1, camera: true })[0]).toMatch(/plan/);
  });

  it('position, disposition, recadrage : cas limites', () => {
    expect(positionSource(plan(), 3000)).toEqual({ index: 0, tPlan: 3000, tSource: 3000 });
    expect(disposition('horizontal', 'ecran', 'bas').camera?.hauteur).toBe(270);
    expect(disposition('carre', 'ecran', 'plein').principal).toBeNull();
    const c = couverture(
      { largeur: 1000, hauteur: 1000 },
      { largeur: 100, hauteur: 400 },
      { x: 0.9, y: 0.9, largeur: 0.01 },
    );
    expect(c.x).toBeLessThan(1000);
    expect(
      couverture({ largeur: 1000, hauteur: 500 }, { largeur: 100, hauteur: 100 }).largeur,
    ).toBe(500);
  });

  it('calques : positions, styles, barre vide, liste partielle', () => {
    const calques: Calque[] = [
      {
        type: 'texte',
        texte: 'Un titre assez long pour passer à la ligne suivante',
        style: 'titre',
        position: 'bas',
        debut: 0,
        fin: 3000,
      },
      { type: 'texte', texte: '10', style: 'chiffre', position: 'centre', debut: 0, fin: 3000 },
      { type: 'texte', texte: 'note', style: 'note', position: 'haut', debut: 0, fin: 3000 },
      { type: 'barre', libelle: 'Fiche', valeur: 0, position: 'haut', debut: 0, fin: 3000 },
      { type: 'liste', elements: ['a', 'b', 'c'], position: 'bas', debut: 0, fin: 3000 },
      { type: 'compteur', de: 5, a: 5, libelle: 'x', position: 'bas', debut: 0, fin: 3000 },
    ];
    const c = ctx();
    dessinerCalques(c, calques, 10, 'carre', zone, theme);
    expect(c.textes).toContain('10');
    expect(c.textes).toContain('a');
    expect(c.textes).not.toContain('c');
    dessinerCalques(c, calques, 5000, 'carre', zone, theme);
  });

  it('sous-titre trop large : réduit pour tenir', () => {
    const c = ctx(200);
    const ligne = {
      debut: 0,
      fin: 900,
      mots: [
        { texte: 'demandes', debut: 0, fin: 300 },
        { texte: 'gratuites', debut: 300, fin: 900 },
      ],
    };
    dessinerSousTitre(c, ligne, 400, 'vertical', 1500, theme);
    expect(c.textes).toEqual(['DEMANDES', 'GRATUITES']);
    dessinerSousTitre(c, undefined, 400, 'vertical', 1500, theme);
  });

  it('image : capture posée, caméra dans le coin, sous-titres sans caméra en bas', () => {
    const c = ctx();
    const p = plan({ sousTitres: true });
    const src = (n: string) => ({ image: n, largeur: 1280, hauteur: 720 });
    dessinerImage(c, p, 1000, { camera: src('C'), captures: { c1: src('K') } }, [], theme);
    expect(c.images).toEqual(['K']);
    dessinerImage(c, p, 7000, { ecran: src('E'), camera: src('C'), captures: {} }, [], theme);
    expect(c.images.slice(1)).toEqual(['E', 'C']);
    dessinerImage(
      c,
      p,
      7000,
      { ecran: { image: 'V', largeur: 0, hauteur: 0 }, captures: {} },
      [],
      theme,
    );
    expect(basSousTitres(p, 7000)).toBe(Math.round(1920 * 0.82));
  });

  it('consignes : sujet, regard caméra, vidéo sans j’aime, sans thème', () => {
    const s = promptSujets({
      videos: [
        {
          titre: 'v',
          chaine: 'c',
          vues: 1,
          likes: null,
          commentaires: null,
          dureeS: 30,
          publieeLe: '',
          description: 'desc',
          vuesParJour: 1,
        },
      ],
      theme: undefined,
      nombre: 2,
    });
    expect(s.demande).toMatch(/Thème libre/);
    expect(s.demande).toMatch(/desc/);
    const m = promptMontage({
      format: 'horizontal',
      camera: true,
      dureePriseMs: 1000,
      transcription: '',
      segments: [],
      sujet: {
        titre: 'S',
        angle: 'A',
        pourquoi: 'P',
        accroches: ['h'],
        dureeCibleS: 20,
        script: [
          { voix: 'v', aEcran: 'camera', texteEcran: '' },
          { voix: 'w', aEcran: 'ecran', texteEcran: '' },
        ],
        legende: 'l',
        hashtags: [],
      },
      regardCamera: 'regard franc',
    });
    expect(m.demande).toMatch(/Sujet : S/);
    expect(m.demande).toMatch(/regard franc/);
    expect(m.demande).toMatch(/\(vide\)/);
    expect(m.demande).toMatch(/meilleur montage/);
  });
});
