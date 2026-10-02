import { describe, expect, it } from 'vitest';
import {
  cleDoublon,
  controlerConsentement,
  dansZoneCouverte,
  delaiDepuisHorizon,
  departementDe,
  qualifierPartenaire,
  rgeRequisPartenaire,
  telephonePartenaireValide,
  texteAides,
} from '..';
import { entreeDemandePartenaire } from '../../schemas';

const TEXTE =
  'J’accepte que mes coordonnées soient transmises à Portail Habitat et à des professionnels partenaires afin d’être recontacté pour mon projet.';
const exemple = {
  idExterne: 'SIM-2026-0918-004512',
  recueLe: '2026-09-27T09:42:11+02:00',
  contact: {
    prenom: 'Claire',
    nom: 'Martin',
    email: 'Claire.Martin@email.fr',
    telephone: '+33631420045',
    telephoneVerifie: true,
  },
  chantier: {
    codePostal: '33600',
    ville: 'Pessac',
    typeTravaux: 'isolation_combles',
    description: 'Combles perdus d’environ 80 m².',
    surfaceM2: 80,
  },
  qualification: { statutOccupation: 'proprietaire_occupant', horizon: 'moins_3_mois' },
  aides: {
    eligibilite: 'eligible',
    trancheRevenus: 'jaune',
    montantEstimeCentimes: 180_000,
    dispositifs: ['MaPrimeRenov', 'CEE'],
  },
  consentement: {
    coche: true,
    texteAffiche: TEXTE,
    versionTexte: 'v3-2026-06',
    horodatage: '2026-09-27T09:41:58+02:00',
    urlPage: 'https://simulateur-aides.fr/resultat',
    ip: '92.184.12.40',
    userAgent: 'Mozilla/5.0',
    finalites: ['transmission_portail_habitat', 'mise_en_relation_professionnels'],
  },
};

describe('entrée du webhook (IMPORT_LEADS §2)', () => {
  it('le corps d’exemple passe ; un champ inconnu ou une date sans fuseau est refusé', () => {
    const r = entreeDemandePartenaire.parse(exemple);
    expect(r.contact.email).toBe('claire.martin@email.fr');
    expect(entreeDemandePartenaire.safeParse({ ...exemple, inconnu: 1 }).success).toBe(false);
    expect(
      entreeDemandePartenaire.safeParse({ ...exemple, recueLe: '2026-09-27T09:42:11' }).success,
    ).toBe(false);
  });
});

describe('contrôles', () => {
  const attendu = { versionTexte: 'v3-2026-06', texte: TEXTE };
  const c = exemple.consentement;
  it('consentement : case, version, texte exact (espaces tolérés), finalités', () => {
    expect(controlerConsentement(c, attendu)).toEqual({ ok: true });
    expect(controlerConsentement({ ...c, texteAffiche: `  ${TEXTE}\n` }, attendu).ok).toBe(true);
    expect(controlerConsentement({ ...c, coche: false }, attendu)).toEqual({
      ok: false,
      details: 'consentement.coche',
    });
    expect(controlerConsentement({ ...c, versionTexte: 'v2' }, attendu).ok).toBe(false);
    expect(controlerConsentement({ ...c, texteAffiche: 'Autre texte' }, attendu)).toEqual({
      ok: false,
      details: 'consentement.texteAffiche ne correspond pas à v3-2026-06',
    });
    expect(
      controlerConsentement({ ...c, finalites: ['transmission_portail_habitat'] }, attendu),
    ).toEqual({
      ok: false,
      details: 'consentement.finalites sans mise_en_relation_professionnels',
    });
  });

  it('téléphone français, zone couverte, doublon', () => {
    expect(telephonePartenaireValide('+33 6 31 42 00 45')).toBe('+33631420045');
    expect(telephonePartenaireValide('+447700900123')).toBeNull();
    expect(telephonePartenaireValide('+33031420045')).toBeNull();
    expect(departementDe('33600')).toBe('33');
    expect(departementDe('20000')).toBe('2A');
    expect(departementDe('20200')).toBe('2B');
    expect(departementDe('97100')).toBe('971');
    expect(dansZoneCouverte('33600', ['33', '24'])).toBe(true);
    expect(dansZoneCouverte('75001', ['33'])).toBe(false);
    expect(dansZoneCouverte('75001', [])).toBe(true);
    expect(cleDoublon('+33631420045', 'isolation-combles')).toBe('+33631420045|isolation-combles');
  });
});

describe('qualification A/B/C (MATCHING « Demandes partenaires »)', () => {
  const q = (p: Partial<Parameters<typeof qualifierPartenaire>[0]>, eligibilite = 'eligible') =>
    qualifierPartenaire(
      {
        telephoneVerifie: true,
        statutOccupation: 'proprietaire_occupant',
        horizon: 'moins_3_mois',
        ...p,
      },
      { eligibilite: eligibilite as 'eligible' },
    );
  it('A : tout est réuni ; B : un critère manque ; C : renseignement, locataire ou deux manques', () => {
    expect(q({})).toEqual({ niveau: 'A', score: 100 });
    expect(q({ telephoneVerifie: false }).niveau).toBe('B');
    expect(q({ statutOccupation: 'inconnu' }).niveau).toBe('B');
    expect(q({ horizon: '3_6_mois' }).niveau).toBe('B');
    expect(q({ statutOccupation: 'bailleur' }).niveau).toBe('A');
    expect(q({ horizon: 'renseignement' }).niveau).toBe('C');
    expect(q({ statutOccupation: 'locataire' }).niveau).toBe('C');
    expect(q({ telephoneVerifie: false, horizon: 'plus_6_mois' })).toEqual({
      niveau: 'C',
      score: 45,
    });
    expect(q({}, 'non_eligible').score).toBe(85);
    expect(q({}, 'ampleur_seulement').score).toBe(95);
  });

  it('délai, RGE requis, texte des aides', () => {
    expect(delaiDepuisHorizon('moins_3_mois')).toBe('3mois');
    expect(delaiDepuisHorizon('plus_6_mois')).toBe('renseignement');
    expect(rgeRequisPartenaire({ eligibilite: 'ampleur_seulement' })).toBe(true);
    expect(rgeRequisPartenaire({ eligibilite: 'non_eligible' })).toBe(false);
    const espaces = (t: string | null) => t?.replace(/[  ]/g, ' ');
    expect(
      espaces(
        texteAides({
          eligibilite: 'eligible',
          montantEstimeCentimes: 180_000,
          dispositifs: ['MaPrimeRenov', 'CEE'],
        }),
      ),
    ).toBe('1 800 € d’aides estimées (MaPrimeRenov, CEE), montant indicatif');
    expect(
      texteAides({ eligibilite: 'ampleur_seulement', montantEstimeCentimes: 0, dispositifs: [] }),
    ).toBe('Éligible aux aides, montant indicatif');
    expect(
      texteAides({ eligibilite: 'non_eligible', montantEstimeCentimes: 0, dispositifs: [] }),
    ).toBeNull();
  });
});
