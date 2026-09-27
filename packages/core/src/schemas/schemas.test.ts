import { describe, expect, it } from 'vitest';
import {
  SCHEMAS,
  appelOffres,
  artisan,
  artisanPublic,
  avis,
  centimes,
  demande,
  email,
  facture,
  invitation,
  mouvementCredits,
  realisation,
  redactionIa,
  utilisateur,
} from './index';

const maintenant = new Date('2026-09-27T12:00:00Z');
const geo = { latitude: 44.86, longitude: -0.53 };

const artisanValide = {
  schemaVersion: 1,
  createdAt: maintenant,
  raisonSociale: 'Dupont Rénovation SARL',
  nomCommercial: 'Dupont Rénovation',
  slug: 'dupont-renovation-lormont',
  siren: '732829320',
  siret: '73282932000074',
  adresseSiege: { ligne1: '1 rue du Port', codePostal: '33310', ville: 'Lormont' },
  metiers: ['plombier'],
  metierPrincipal: 'plombier',
  zoneIntervention: { centre: geo, geohash: 'ezzx7', rayonKm: 30, rayonAccepteLe: maintenant },
  source: 'direct',
  plan: 'gratuit',
  optionVisibilite: false,
  verification: { statut: 'a_faire' },
  quotaDemandesMois: 5,
  enLigne: false,
  statut: 'actif',
  onboarding: { etape: 3 },
  nbMembres: 1,
  siegesMax: 1,
  proprietaireUid: 'u1',
  origine: 'onboarding',
};

describe('registre des schémas (DATABASE §16)', () => {
  it('couvre chaque collection de la liste de contrôle', () => {
    const attendues = [
      'users',
      'admins',
      'rolesAdmin',
      'invitations',
      'revendications',
      'demandesAcces',
      'sirenIndex',
      'artisans',
      'artisansPublic',
      'artisanScores',
      'sanctions',
      'notesInternes',
      'demandes',
      'dossiersDiag',
      'matching',
      'matchingConfig',
      'sourcesDemandes',
      'importsDemandes',
      'preuvesConsentement',
      'appelsOffres',
      'grillesTarifaires',
      'achatsLeads',
      'portefeuilles',
      'packsCredits',
      'remboursementsLeads',
      'avis',
      'abonnements',
      'factures',
      'paiements',
      'codesPromo',
      'stripeEvents',
      'referentiel',
      'communes',
      'stats',
      'config',
      'annonces',
      'contacts',
      'litiges',
      'emails',
      'suppressions',
      'evenements',
      'auditLog',
      'rateLimits',
      'rgpdDemandes',
      'filesModeration',
      'prospects',
      'cycleEtat',
      'cycleTraces',
      'cycleStats',
      'sequences',
      'pagesSuivies',
      'comportementSessions',
      'comportementAgregats',
      'comportementAlertes',
      'abTests',
      'iaContexte',
      'iaAnalyses',
      'iaRecommandations',
      'iaQuotas',
      'iaRedactions',
      'brouillons',
      'brouillonsOnboarding',
      'simulations',
    ];
    const racines = new Set(Object.keys(SCHEMAS).map((m) => m.split('/')[0]));
    for (const c of attendues) expect(racines, c).toContain(c);
    for (const sous of [
      'prive/facturation',
      'membres',
      'etablissements',
      'documents',
      'realisations',
      'statsJour',
    ]) {
      expect(
        Object.keys(SCHEMAS).some((m) => m.startsWith(`artisans/{}/${sous}`)),
        sous,
      ).toBe(true);
    }
  });
});

describe('invariants', () => {
  it('montants : centimes entiers uniquement', () => {
    expect(centimes.safeParse(7990).success).toBe(true);
    expect(centimes.safeParse(79.9).success).toBe(false);
  });
  it('emails normalisés en minuscules', () => {
    expect(email.parse('Camille.M@Exemple.FR')).toBe('camille.m@exemple.fr');
  });
  it('artisan : rayon de 10 à 100 km, SIREN valide, budget cohérent', () => {
    expect(artisan.safeParse(artisanValide).success).toBe(true);
    const rayon = (r: number) =>
      artisan.safeParse({
        ...artisanValide,
        zoneIntervention: { ...artisanValide.zoneIntervention, rayonKm: r },
      }).success;
    expect(rayon(10)).toBe(true);
    expect(rayon(100)).toBe(true);
    expect(rayon(9)).toBe(false);
    expect(rayon(101)).toBe(false);
    expect(artisan.safeParse({ ...artisanValide, siren: '123456789' }).success).toBe(false);
    expect(
      artisan.safeParse({ ...artisanValide, budgetMin: 500000, budgetMax: 100000 }).success,
    ).toBe(false);
  });
  it('artisan : Visibilité incluse dès que le plan est payant', () => {
    expect(
      artisan.safeParse({ ...artisanValide, plan: 'premium', optionVisibilite: false }).success,
    ).toBe(false);
    expect(
      artisan.safeParse({ ...artisanValide, plan: 'premium', optionVisibilite: true }).success,
    ).toBe(true);
  });
  it('artisansPublic refuse toute donnée privée (règle n° 8)', () => {
    const publique = {
      schemaVersion: 1,
      slug: 'dupont',
      nomCommercial: 'Dupont',
      metiers: ['plombier'],
      metierPrincipal: 'plombier',
      tags: [],
      pitch: '',
      description: '',
      ville: 'Lormont',
      geo,
      geohash: 'ezzx7',
      rayonKm: 30,
      labels: [],
      noteMoyenne: 4.8,
      nbAvis: 12,
      notesCriteres: {},
      premium: false,
      telephone: null,
      scoreClassement: 10,
      enLigne: true,
      updatedAt: maintenant,
    };
    expect(artisanPublic.safeParse(publique).success).toBe(true);
    expect(artisanPublic.safeParse({ ...publique, emailContact: 'x@y.fr' }).success).toBe(false);
    expect(artisanPublic.safeParse({ ...publique, siren: '732829320' }).success).toBe(false);
  });
  it('avis public : aucun champ sur l’auteur', () => {
    const a = {
      schemaVersion: 1,
      createdAt: maintenant,
      artisanId: 'a1',
      nomAffiche: 'Camille M.',
      note: 5,
      typeTravaux: 'Salle de bain',
      finChantier: '2026-08',
      certificationAcceptee: true,
      preuve: { type: 'aucune' },
      statut: 'en_attente',
    };
    expect(avis.safeParse(a).success).toBe(true);
    expect(avis.safeParse({ ...a, auteurEmail: 'c@m.fr' }).success).toBe(false);
    expect(avis.safeParse({ ...a, note: 6 }).success).toBe(false);
    expect(avis.safeParse({ ...a, texte: 'x'.repeat(1201) }).success).toBe(false);
  });
  it('réalisation publiée seulement avec l’autorisation du propriétaire', () => {
    const r = {
      schemaVersion: 1,
      createdAt: maintenant,
      titre: 'Salle de bain',
      metier: 'plombier',
      ville: 'Cenon',
      photos: [],
      publie: true,
      ordre: 1,
    };
    expect(realisation.safeParse({ ...r, autorisationProprietaire: false }).success).toBe(false);
    expect(realisation.safeParse({ ...r, autorisationProprietaire: true }).success).toBe(true);
  });
  it('invitation : jamais au rôle de propriétaire', () => {
    const i = {
      schemaVersion: 1,
      createdAt: maintenant,
      artisanId: 'a1',
      email: 'c@m.fr',
      invitePar: 'u1',
      jetonHash: 'a'.repeat(64),
      statut: 'envoyee',
      expireLe: maintenant,
    };
    expect(invitation.safeParse({ ...i, role: 'collaborateur' }).success).toBe(true);
    expect(invitation.safeParse({ ...i, role: 'proprietaire' }).success).toBe(false);
  });
  it('facture : HT + TVA = TTC', () => {
    const f = {
      schemaVersion: 1,
      artisanId: 'a1',
      numero: 'F-1',
      devise: 'eur',
      statut: 'paid',
      periodeDebut: maintenant,
      periodeFin: maintenant,
      createdAt: maintenant,
    };
    expect(
      facture.safeParse({
        ...f,
        montantHtCentimes: 7990,
        tvaCentimes: 1598,
        montantTtcCentimes: 9588,
      }).success,
    ).toBe(true);
    expect(
      facture.safeParse({
        ...f,
        montantHtCentimes: 7990,
        tvaCentimes: 1598,
        montantTtcCentimes: 9590,
      }).success,
    ).toBe(false);
  });
  it('crédits : solde jamais négatif, mouvement non nul', () => {
    const m = { schemaVersion: 1, type: 'debit_lead', par: 'system', createdAt: maintenant };
    expect(mouvementCredits.safeParse({ ...m, credits: -2, soldeApres: 3 }).success).toBe(true);
    expect(mouvementCredits.safeParse({ ...m, credits: -2, soldeApres: -1 }).success).toBe(false);
    expect(mouvementCredits.safeParse({ ...m, credits: 0, soldeApres: 3 }).success).toBe(false);
  });
  it('appel d’offres : 3 déblocages au plus', () => {
    const base = {
      schemaVersion: 1,
      createdAt: maintenant,
      demandeId: 'd1',
      titre: 'Salle de bain',
      resume: 'Rénovation complète',
      metier: 'plombier',
      ville: 'Cenon',
      codePostal: '33150',
      geo,
      geohash: 'ezzx7',
      budgetMinCentimes: 500000,
      budgetMaxCentimes: 900000,
      trancheBudget: 'M',
      urgence: 'normale',
      qualiteLead: 70,
      tarification: {
        mode: 'auto',
        prixBaseCentimes: 1900,
        prixPremiumCentimes: 1300,
        prixCredits: 2,
        fixeLe: maintenant,
        prixPlancherCentimes: 500,
        prixPlafondCentimes: 9900,
      },
      nbDeblocagesMax: 3,
      acces: 'tous',
      fenetrePremiumMin: 60,
      ouvertLe: maintenant,
      ouvertJusquau: maintenant,
      statut: 'ouvert',
      publiePar: 'algo',
    };
    expect(appelOffres.safeParse({ ...base, nbDeblocages: 3 }).success).toBe(true);
    expect(appelOffres.safeParse({ ...base, nbDeblocages: 4 }).success).toBe(false);
    expect(appelOffres.safeParse({ ...base, nbDeblocages: 0, nbDeblocagesMax: 4 }).success).toBe(
      false,
    );
  });
  it('demande : bloc partenaire si et seulement si la source est partenaire, fourchette ordonnée', () => {
    const d = {
      schemaVersion: 1,
      createdAt: maintenant,
      reference: 'PH-A1B2C3',
      source: 'simulateur',
      particulierUid: null,
      contact: { prenom: 'Camille', nom: 'M', email: 'c@m.fr', telephone: '+33612345678' },
      prestationId: 'sdb',
      reponses: {},
      reponsesLisibles: [],
      adresseChantier: { codePostal: '33150', ville: 'Cenon', geo, geohash: 'ezzx7' },
      acces: 'facile',
      delaiSouhaite: 'asap',
      estimation: {
        minCentimes: 500000,
        maxCentimes: 800000,
        coefRegion: 1.03,
        coefAcces: 1,
        aidesCentimes: 0,
        postes: [],
        versionReferentiel: '1',
      },
      miseEnRelation: true,
      statut: 'nouvelle',
      nbAttributions: 0,
      consentementId: 'c1',
      expireLe: maintenant,
    };
    expect(demande.safeParse(d).success).toBe(true);
    expect(demande.safeParse({ ...d, source: 'partenaire' }).success).toBe(false);
    expect(
      demande.safeParse({ ...d, estimation: { ...d.estimation, minCentimes: 900000 } }).success,
    ).toBe(false);
    expect(demande.safeParse({ ...d, nbAttributions: 4 }).success).toBe(false);
  });
  it('utilisateur : 10 entreprises au plus (taille des claims)', () => {
    const u = {
      schemaVersion: 1,
      createdAt: maintenant,
      roles: ['artisan'],
      email: 'a@b.fr',
      emailVerifie: true,
      fournisseurs: ['lien'],
      origine: 'onboarding_pro',
      statut: 'actif',
      preferences: {
        langue: 'fr',
        notifs: Object.fromEntries(
          ['activite', 'relance', 'offres_pro', 'marketing'].map((k) => [
            k,
            { email: true, sms: false, inapp: true },
          ]),
        ),
      },
    };
    expect(
      utilisateur.safeParse({ ...u, entreprises: Array.from({ length: 10 }, (_, i) => `a${i}`) })
        .success,
    ).toBe(true);
    expect(
      utilisateur.safeParse({ ...u, entreprises: Array.from({ length: 11 }, (_, i) => `a${i}`) })
        .success,
    ).toBe(false);
  });
  it('journal de rédaction IA : jamais de texte', () => {
    const r = {
      schemaVersion: 1,
      artisanId: 'a1',
      type: 'presentation',
      action: 'ameliorer',
      accepte: true,
      tokens: 300,
      coutCentimes: 1,
      createdAt: maintenant,
      expireLe: maintenant,
    };
    expect(redactionIa.safeParse(r).success).toBe(true);
    expect(redactionIa.safeParse({ ...r, texte: 'Bonjour' }).success).toBe(false);
  });
});
