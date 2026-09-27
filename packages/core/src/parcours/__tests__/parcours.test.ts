import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { champsDuTarif, type Champ, type TarifChamps } from '../../simulateur/champs';
import {
  arrivee,
  brouillonAJour,
  cleBrouillon,
  DUREE_BROUILLON_MS,
  etapeDeReprise,
  lireBrouillon,
  migrerReponses,
  plusRecent,
  reponseLisible,
  repriseSimulateur,
  valeursParDefaut,
  type BrouillonParcours,
} from '..';

const lire = (f: string) => JSON.parse(readFileSync(resolve(__dirname, f), 'utf8'));
const DATA = '../../../../../docs/data/';
const detaillees = lire(`${DATA}prestations.json`).prestations as {
  id: string;
  nom: string;
  champs: Champ[];
}[];
const catalogue = lire(`${DATA}prestations-catalogue.json`).prestations as {
  id: string;
  nom: string;
  tarif: TarifChamps;
}[];
const oracle = lire('parcours.cases.json') as {
  champs: Record<string, { nom: string; defaut: Record<string, unknown>; champs: Champ[] }>;
  cas: {
    prestationId: string;
    reponses: Record<string, unknown>;
    attendu: { reponses: Record<string, unknown>; nbRetirees: number; resume: string };
  }[];
};

const PRESTATIONS = new Map<string, { nom: string; champs: Champ[] }>([
  ...detaillees.map((p) => [p.id, { nom: p.nom, champs: p.champs }] as const),
  ...catalogue.map((p) => [p.id, { nom: p.nom, champs: champsDuTarif(p.tarif) }] as const),
]);
const sansIndefinis = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe('champs des 112 prestations (maquette chargerCatalogue)', () => {
  it('mêmes prestations que la maquette', () => {
    expect([...PRESTATIONS.keys()].sort()).toEqual(Object.keys(oracle.champs).sort());
    expect(PRESTATIONS.size).toBe(112);
  });
  it.each(Object.entries(oracle.champs))('%s : champs et valeurs par défaut', (id, attendu) => {
    const p = PRESTATIONS.get(id)!;
    expect(sansIndefinis(p.champs)).toEqual(attendu.champs);
    expect(valeursParDefaut(p.champs)).toEqual(attendu.defaut);
  });
});

describe('migration et résumé (maquette migrer, lisible)', () => {
  it('au moins 30 cas', () => expect(oracle.cas.length).toBeGreaterThanOrEqual(30));
  it.each(oracle.cas.map((c, i) => [i, c] as const))('cas %i', (_, c) => {
    const p = PRESTATIONS.get(c.prestationId)!;
    const m = migrerReponses(p.champs, c.reponses);
    expect(m.reponses).toEqual(c.attendu.reponses);
    expect(m.retirees.length).toBe(c.attendu.nbRetirees);
    const b = brouillon({ prestationId: c.prestationId, reponses: {}, etape: 2 });
    expect(repriseSimulateur({ ...b, reponses: c.reponses as never }, p).resume).toBe(
      c.attendu.resume,
    );
  });
});

const MAINTENANT = Date.UTC(2026, 8, 27, 12);
const JOUR = 86_400_000;
function brouillon(x: Partial<BrouillonParcours> = {}): BrouillonParcours {
  return {
    v: 1,
    id: 'abcdefgh12',
    parcours: 'simulateur',
    versionReferentiel: '2026-09',
    prestationId: 'peinture',
    etape: 3,
    reponses: valeursParDefaut(PRESTATIONS.get('peinture')!.champs),
    chantier: { codePostal: '33000', acces: 'facile' },
    creeLe: MAINTENANT - 2 * JOUR,
    majLe: MAINTENANT - JOUR,
    ...x,
  };
}
const existe = (id: string) => PRESTATIONS.has(id);
const options = {
  parcours: 'simulateur' as const,
  maintenant: MAINTENANT,
  prestationExiste: existe,
  etapeMinimale: 2,
};

describe('lecture d’un brouillon (REPRISE_PARCOURS §2 et §4)', () => {
  it('clé localStorage par parcours', () => {
    expect(cleBrouillon('simulateur')).toBe('ph:parcours:simulateur');
  });
  it('brouillon valide', () => {
    expect(lireBrouillon(brouillon(), options)).toEqual(brouillon());
  });
  it.each([
    ['absent', null],
    ['illisible', 'texte'],
    ['version inconnue', { ...brouillon(), v: 2 }],
    ['autre parcours', brouillon({ parcours: 'avis' })],
    ['email glissé dans le brouillon', { ...brouillon(), email: 'a@b.fr' }],
    [
      'téléphone glissé dans le chantier',
      brouillon({ chantier: { telephone: '0600000000' } as never }),
    ],
    ['adresse précise au lieu du code postal', brouillon({ chantier: { codePostal: '12 rue X' } })],
    ['réponse objet', brouillon({ reponses: { surface: { a: 1 } } as never })],
    ['réponse trop longue', brouillon({ reponses: { note: 'x'.repeat(61) } })],
    ['étape non entière', brouillon({ etape: 2.5 })],
    ['plus de 30 jours', brouillon({ creeLe: 0, majLe: MAINTENANT - DUREE_BROUILLON_MS - 1 })],
    ['daté du futur', brouillon({ majLe: MAINTENANT + 10 * 60_000 })],
    ['création après modification', brouillon({ creeLe: MAINTENANT, majLe: MAINTENANT - JOUR })],
    ['prestation disparue', brouillon({ prestationId: 'disparue' })],
    ['sans prestation', brouillon({ prestationId: undefined })],
    ['encore à l’étape 1', brouillon({ etape: 1 })],
  ])('rejeté : %s', (_, brut) => {
    expect(lireBrouillon(brut, options)).toBeNull();
  });
  it('à 30 jours pile : encore valable', () => {
    const b = brouillon({ creeLe: 0, majLe: MAINTENANT - DUREE_BROUILLON_MS });
    expect(lireBrouillon(b, options)).not.toBeNull();
  });
  it('sans contrôle de prestation ni d’étape (parcours avis)', () => {
    const b = brouillon({ parcours: 'avis', prestationId: undefined, etape: 1 });
    expect(lireBrouillon(b, { parcours: 'avis', maintenant: MAINTENANT })).toEqual(b);
  });
});

describe('local ou serveur : le plus récent l’emporte', () => {
  const ancien = brouillon({ majLe: MAINTENANT - 2 * JOUR });
  const recent = brouillon({ majLe: MAINTENANT - JOUR, etape: 4 });
  it.each([
    [ancien, recent, recent],
    [recent, ancien, recent],
    [null, recent, recent],
    [ancien, null, ancien],
    [null, null, null],
  ])('%#', (a, b, attendu) => expect(plusRecent(a, b)).toBe(attendu));
});

describe('écriture du brouillon', () => {
  const d = {
    parcours: 'simulateur' as const,
    versionReferentiel: '2026-09',
    prestationId: 'peinture',
    etape: 3,
    reponses: { surface: 40 },
  };
  it('nouveau brouillon', () => {
    const b = brouillonAJour(null, d, MAINTENANT, () => 'nouvelId01');
    expect(b).toMatchObject({ v: 1, id: 'nouvelId01', creeLe: MAINTENANT, majLe: MAINTENANT });
  });
  it('même prestation : date de début et identifiant conservés', () => {
    const b = brouillonAJour(brouillon(), d, MAINTENANT, () => 'nouvelId01');
    expect(b).toMatchObject({ id: 'abcdefgh12', creeLe: MAINTENANT - 2 * JOUR, majLe: MAINTENANT });
  });
  it('autre prestation : nouveau brouillon', () => {
    const b = brouillonAJour(brouillon({ prestationId: 'sdb' }), d, MAINTENANT, () => 'nouvelId01');
    expect(b).toMatchObject({ id: 'nouvelId01', creeLe: MAINTENANT });
  });
  it('refuse une donnée de contact', () => {
    expect(() =>
      brouillonAJour(null, { ...d, email: 'a@b.fr' } as never, MAINTENANT, () => 'nouvelId01'),
    ).toThrow();
  });
});

describe('étape de reprise (§3) et SIM-06e', () => {
  const p = PRESTATIONS.get('peinture')!;
  const champ2 = p.champs.find((c) => c.e === 2)!.id;
  const champ3 = p.champs.find((c) => c.e === 3)!.id;
  it('générique : première étape incomplète', () => {
    expect(etapeDeReprise(4, (e) => e !== 3)).toBe(3);
    expect(etapeDeReprise(4, () => true)).toBe(4);
    expect(etapeDeReprise(4, (e) => e !== 4)).toBe(4);
  });
  it('rien n’a changé : étape enregistrée', () => {
    expect(repriseSimulateur(brouillon({ etape: 3 }), p).etape).toBe(3);
    expect(repriseSimulateur(brouillon({ etape: 5 }), p).etape).toBe(5);
  });
  it('étape au-delà de 5 ramenée à 5', () => {
    expect(repriseSimulateur(brouillon({ etape: 9 }), p).etape).toBe(5);
  });
  it('réponse de l’étape 2 devenue invalide : reprise à l’étape 2', () => {
    const b = brouillon({ etape: 4, reponses: { ...brouillon().reponses, [champ2]: 99_999 } });
    const r = repriseSimulateur(b, p);
    expect(r.etape).toBe(2);
    expect(r.retirees).toEqual([champ2]);
  });
  it('champ de l’étape 3 ajouté depuis : reprise à l’étape 3', () => {
    const reponses = { ...brouillon().reponses };
    delete reponses[champ3];
    expect(repriseSimulateur(brouillon({ etape: 5, reponses }), p).etape).toBe(3);
  });
  it('code postal incomplet : reprise à l’étape 4', () => {
    const b = brouillon({ etape: 5, chantier: { codePostal: '330' } });
    expect(repriseSimulateur(b, p).etape).toBe(4);
    expect(repriseSimulateur(brouillon({ etape: 5, chantier: undefined }), p).etape).toBe(4);
  });
  it('résumé sans montant', () => {
    const r = repriseSimulateur(brouillon(), p);
    expect(r.resume).toBe('Peinture · 45 m² · 2 pièce(s)');
    expect(r.resume).not.toMatch(/€/);
  });
});

describe('arrivée avec des paramètres (§4)', () => {
  const b = brouillon();
  it('sans brouillon', () =>
    expect(arrivee(null, { prestationId: 'sdb' })).toEqual({ mode: 'aucun' }));
  it('sans paramètre : encart', () =>
    expect(arrivee(b, {})).toEqual({ mode: 'encart', brouillon: b }));
  it('autre prestation : lien vers l’ancienne estimation (SIM-06j)', () => {
    expect(arrivee(b, { prestationId: 'sdb' })).toEqual({ mode: 'autre', brouillon: b });
  });
  it('même prestation : fusion, le code postal de l’URL gagne', () => {
    const r = arrivee(b, { prestationId: 'peinture', codePostal: '75 011' });
    expect(r).toEqual({
      mode: 'fusion',
      brouillon: { ...b, chantier: { codePostal: '75011', acces: 'facile' } },
    });
  });
  it('même prestation sans code postal : brouillon inchangé', () => {
    expect(arrivee(b, { prestationId: 'peinture', codePostal: 'abc' })).toEqual({
      mode: 'fusion',
      brouillon: b,
    });
  });
});

describe('réponses lisibles', () => {
  const [num, opt] = [
    { id: 'h', kind: 'slider', label: '', aide: '', min: 0, max: 5, def: 1, unite: 'm', e: 2 },
    { id: 'o', kind: 'chips', label: '', aide: '', options: [{ v: 'a', label: 'A' }], e: 3 },
  ] as const;
  it('décimale à la française', () => expect(reponseLisible(num, 2.5)).toBe('2,5 m'));
  it('liste vide ou invalide', () => {
    expect(reponseLisible(opt, 'a')).toBe('');
    expect(reponseLisible(opt, ['a', 'z'])).toBe('A');
  });
});
