import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  artisanPourMatching,
  CONFIG_MATCHING_DEFAUT,
  demandePourMatching,
  evaluer,
  expirationProposition,
  metierDeDemande,
  type DocArtisan,
  type DocDemande,
} from '..';

const T = Date.UTC(2026, 9, 1);
const JOUR = 86_400_000;
const BORDEAUX = { latitude: 44.8378, longitude: -0.5792 };
const FLOIRAC = { latitude: 44.8366, longitude: -0.5285 };

describe('configuration par défaut', () => {
  it('identique à docs/data/matching-config.json', () => {
    const f = JSON.parse(
      readFileSync(resolve(__dirname, '../../../../../docs/data/matching-config.json'), 'utf8'),
    );
    expect(CONFIG_MATCHING_DEFAUT).toEqual(f.config);
  });
});

describe('metierDeDemande', () => {
  const ref = {
    intentions: [
      { id: 'douche-italienne', metier: 'sdb', prestation: 'sdb-douche' },
      { id: 'repeindre', metier: 'peintre', prestation: 'peinture' },
    ],
    metiers: [{ id: 'peintre', prestation: 'peinture' }, { id: 'sdb' }],
  };
  it('intention, puis prestation par défaut du métier, puis intention de la prestation', () => {
    expect(metierDeDemande({ intention: 'douche-italienne', prestationId: 'x' }, ref)).toBe('sdb');
    expect(metierDeDemande({ prestationId: 'peinture' }, ref)).toBe('peintre');
    expect(metierDeDemande({ prestationId: 'sdb-douche' }, ref)).toBe('sdb');
    expect(metierDeDemande({ prestationId: 'inconnue' }, ref)).toBeNull();
  });
});

const demande: DocDemande = {
  prestationId: 'peinture',
  adresseChantier: { geo: FLOIRAC },
  delaiSouhaite: '1mois',
  estimation: { minCentimes: 150_000, maxCentimes: 250_000 },
  reponsesLisibles: [{ reponse: 'Séjour' }],
  contact: { email: 'Helene@Test.local', telephone: '+33612345678' },
};
const artisan: DocArtisan = {
  siren: '552100554',
  zoneIntervention: { centre: BORDEAUX, rayonKm: 30 },
  metierPrincipal: 'peintre',
  metiers: ['peintre', 'plaquiste'],
  intentions: ['repeindre'],
  verification: { statut: 'verifie', verifieLe: T - 100 * JOUR },
  labelsVerifies: { decennale: {}, qualibat: { expireLe: T - JOUR } },
  plan: 'premium',
  optionVisibilite: true,
  quotaDemandesMois: 4,
  demandesRecuesMois: 1,
  noteMoyenne: 4.8,
  nbAvis: 12,
  tauxRecommandation: 0.95,
  tauxReponse: 0.9,
  tempsReponseMoyenMin: 60,
  completude: 90,
};

describe('adaptateurs demande et artisan', () => {
  it('demande : délai, démarrage, empreintes normalisées', () => {
    const d = demandePourMatching('d1', demande, 'peintre', T);
    expect(d).toMatchObject({ metierRequis: 'peintre', delaiSouhaiteJours: 30, exigences: [] });
    expect(d.demarrageLe).toBe(T + 30 * JOUR);
    expect(d.empreintesDemandeur).toEqual(['email:helene@test.local', 'tel:+33612345678']);
    expect(
      demandePourMatching('d1', { ...demande, rgeRequis: true }, 'peintre', T).exigences,
    ).toEqual(['rge']);
  });

  it('artisan : décennale vérifiée sans date = valable, label expiré ignoré, SIREN en empreinte', () => {
    const a = artisanPourMatching('a1', artisan, {
      maintenant: T,
      empreintes: [],
      attributions7j: 0,
      tauxRefus30j: 0,
    });
    expect(a.qualifications).toEqual(['decennale']);
    expect(a.decennaleExpireLe).toBe(Number.MAX_SAFE_INTEGER);
    expect(a.metiersSecondaires).toEqual(['plaquiste']);
    expect(a.empreintes).toEqual(['siren:552100554']);
    expect(a.joursDepuisVerification).toBe(100);
  });

  it('bout à bout : l’artisan est retenu avec un score', () => {
    const d = demandePourMatching('d1', demande, 'peintre', T);
    const a = artisanPourMatching('a1', artisan, {
      maintenant: T,
      empreintes: [],
      attributions7j: 0,
      tauxRefus30j: 0,
    });
    const [c] = evaluer([a], d, CONFIG_MATCHING_DEFAUT);
    expect(c!.raisonExclusion).toBeUndefined();
    expect(c!.score).toBeGreaterThan(CONFIG_MATCHING_DEFAUT.scoreMin);
    const sansDecennale = artisanPourMatching(
      'a2',
      { ...artisan, labelsVerifies: {} },
      { maintenant: T, empreintes: [], attributions7j: 0, tauxRefus30j: 0 },
    );
    expect(evaluer([sansDecennale], d, CONFIG_MATCHING_DEFAUT)[0]!.raisonExclusion).toBe(
      'assurance',
    );
  });

  it('délai d’acceptation : 24 h, 4 h si urgente', () => {
    expect(expirationProposition(CONFIG_MATCHING_DEFAUT, false, T)).toBe(T + 24 * 3_600_000);
    expect(expirationProposition(CONFIG_MATCHING_DEFAUT, true, T)).toBe(T + 4 * 3_600_000);
  });
});
