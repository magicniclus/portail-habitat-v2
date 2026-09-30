import { calculerPrixLead, trancheBudget, type Bareme } from '@ph/core/leads';
import { encoderGeohash } from '@ph/core/geo';
import { reponseLisible, valeursParDefaut } from '@ph/core/parcours';
import { STATUTS_DEMANDE } from '@ph/core/schemas';
import { champsDuTarif, estimer, type Champ, type Referentiel } from '@ph/core/simulateur';
import { createHash } from 'node:crypto';
import { chemins } from '../chemins';
import {
  ajouterUtilisateur,
  COMPTES_FIXES,
  type ContexteSeed,
  type EntrepriseSeed,
} from './entreprises';
import { NOMS, PRENOMS, VILLES } from './villes';

const NB_DEMANDES = 200;
const NB_APPELS_OFFRES = 40;
const NB_AVIS = 300;
const JOUR = 86_400_000;
const empreinte = (t: string) => createHash('sha256').update(t).digest('hex');

interface PrestationSeed {
  id: string;
  nom: string;
  champs: Champ[];
}

function prestations(c: ContexteSeed): PrestationSeed[] {
  return [
    ...c.f.prestations.prestations.map((p) => ({ id: p.id, nom: p.nom, champs: p.champs })),
    ...c.f.catalogue.prestations.map((p) => ({
      id: p.id,
      nom: p.nom,
      champs: champsDuTarif(p.tarif),
    })),
  ];
}

/** 40 particuliers de démonstration, plus le compte fixe. */
function particuliers(c: ContexteSeed) {
  const liste = [COMPTES_FIXES.particulier];
  ajouterUtilisateur(c, COMPTES_FIXES.particulier, ['particulier'], 'inscription');
  for (let i = 0; i < 40; i++) {
    const compte = {
      uid: `seed-part-${String(i).padStart(2, '0')}`,
      email: `particulier${i}@test.local`,
      nomAffiche: `${c.h.choisir(PRENOMS)} ${c.h.choisir(NOMS)}`,
    };
    ajouterUtilisateur(c, compte, ['particulier'], 'demande');
    liste.push(compte as never);
  }
  return liste;
}

/**
 * 200 demandes à tous les statuts (dont 40 converties en appels d'offres), estimation recalculée
 * avec les prix du référentiel, consentement de mise en relation, attributions.
 */
export function genererDemandes(c: ContexteSeed, entreprises: EntrepriseSeed[], ref: Referentiel) {
  const { h } = c;
  const liste = prestations(c);
  const gens = particuliers(c);
  const enLigne = entreprises.filter((e) => e.enLigne);
  const autres = STATUTS_DEMANDE.filter((s) => s !== 'appel_offres');
  const demandes: {
    id: string;
    prestation: PrestationSeed;
    metier: string;
    ville: (typeof VILLES)[number];
    estimation: ReturnType<typeof estimer>;
    delai: string;
    createdAt: Date;
    resume: string;
  }[] = [];

  for (let i = 0; i < NB_DEMANDES; i++) {
    const id = `seed-d-${String(i).padStart(3, '0')}`;
    const p = h.choisir(liste);
    const intention = c.f.recherche.intentions.find((x) => x.prestation === p.id);
    const metier =
      intention?.metier ??
      Object.values(c.f.recherche.metiers).find((m) => m.prestation === p.id)?.id ??
      'multiservice';
    const personne = i < 5 ? gens[0]! : h.choisir(gens);
    const ville = h.choisir(VILLES);
    const acces = h.choisir(['facile', 'etage', 'difficile'] as const);
    const reponses = valeursParDefaut(p.champs);
    const estimation = estimer(
      { prestationId: p.id, reponses, codePostal: ville.codePostal, acces },
      ref,
    );
    const statut = i < NB_APPELS_OFFRES ? 'appel_offres' : autres[i % autres.length]!;
    const createdAt = new Date(c.maintenant.getTime() - h.entier(0, 120) * JOUR);
    const delai = h.choisir(['asap', '1mois', '3mois', 'renseignement'] as const);
    const lisibles = p.champs
      .slice(0, 3)
      .map((ch) => ({ question: ch.label, reponse: reponseLisible(ch, reponses[ch.id]) }));
    const consentementId = `seed-consentement-${id}`;
    const [prenom, ...nom] = personne.nomAffiche.split(' ');
    const attribuee = ['attribuee', 'devis_recus', 'signee', 'close'].includes(statut);
    const artisan = attribuee ? h.choisir(enLigne) : undefined;

    c.docs.set(`${chemins.consentements(personne.uid)}/${consentementId}`, {
      schemaVersion: 1,
      type: 'mise_en_relation',
      valeur: true,
      version: '2026-09',
      source: 'simulateur',
      createdAt,
    });
    c.docs.set(chemins.demande(id), {
      schemaVersion: 1,
      createdAt,
      updatedAt: createdAt,
      reference: `PH-${h
        .identifiant(6)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, 'X')}`,
      source: h.choisir(['simulateur', 'hero', 'fiche_artisan', 'annuaire'] as const),
      rgeRequis: false,
      particulierUid: personne.uid,
      contact: {
        prenom: prenom!,
        nom: nom.join(' '),
        email: personne.email,
        telephone: `+336${String(h.entier(10000000, 99999999))}`,
      },
      ...(intention ? { intention: intention.id } : {}),
      prestationId: p.id,
      reponses,
      reponsesLisibles: lisibles,
      adresseChantier: {
        codePostal: ville.codePostal,
        ville: ville.nom,
        geo: ville.geo,
        geohash: encoderGeohash(ville.geo.latitude, ville.geo.longitude),
      },
      acces,
      delaiSouhaite: delai,
      ...(c.f.demandes.demandes[i] ? { precisions: c.f.demandes.demandes[i]!.message } : {}),
      photos: [],
      estimation: {
        minCentimes: estimation.minCentimes,
        maxCentimes: estimation.maxCentimes,
        coefRegion: estimation.coefRegion,
        coefAcces: estimation.coefAcces,
        aidesCentimes: estimation.aidesCentimes,
        postes: estimation.postes.map((x) => ({
          label: x.label,
          min: x.minCentimes,
          max: x.maxCentimes,
        })),
        versionReferentiel: estimation.versionReferentiel,
      },
      miseEnRelation: true,
      statut,
      nbAttributions: artisan ? 1 : 0,
      consentementId,
      expireLe: new Date(createdAt.getTime() + 3 * 365 * JOUR),
    });
    if (artisan)
      c.docs.set(chemins.attribution(id, artisan.id), {
        schemaVersion: 1,
        artisanId: artisan.id,
        demandeId: id,
        statut:
          statut === 'attribuee'
            ? 'acceptee'
            : statut === 'signee'
              ? 'devis_accepte'
              : 'devis_envoye',
        exclusive: true,
        proposeeLe: createdAt,
        reponduLe: new Date(createdAt.getTime() + 3_600_000),
        coordonneesDebloquees: true,
        scoreMatching: h.entier(40, 95),
      });
    demandes.push({
      id,
      prestation: p,
      metier,
      ville,
      estimation,
      delai,
      createdAt,
      resume: lisibles.map((l) => `${l.question} : ${l.reponse}`).join(' · '),
    });
  }
  return demandes.slice(0, NB_APPELS_OFFRES);
}

/** 40 appels d'offres : prix automatique, manuel, gratuit et promo (DATABASE §5). */
export function genererAppelsOffres(
  c: ContexteSeed,
  sources: ReturnType<typeof genererDemandes>,
  bareme: Bareme,
) {
  const { h } = c;
  sources.forEach((d, i) => {
    const mode = i < 25 ? 'auto' : i < 32 ? 'manuel' : i < 36 ? 'gratuit' : 'promo';
    const tranche = trancheBudget(d.estimation.minCentimes, d.estimation.maxCentimes);
    const urgence = d.delai === 'asap' ? 'urgente' : 'normale';
    const qualiteLead = h.entier(30, 95);
    const auto = calculerPrixLead(
      {
        metier: d.metier,
        trancheBudget: tranche,
        urgence,
        qualiteLead,
        nbEligibles: h.entier(0, 12),
      },
      bareme,
    );
    const prix =
      mode === 'gratuit'
        ? { prixBaseCentimes: 0, prixPremiumCentimes: 0, prixCredits: 0 }
        : mode === 'manuel'
          ? { prixBaseCentimes: 2500, prixPremiumCentimes: 1800, prixCredits: 3 }
          : {
              prixBaseCentimes: auto.prixBaseCentimes,
              prixPremiumCentimes: auto.prixPremiumCentimes,
              prixCredits: auto.prixCredits,
            };
    const statut = i % 10 === 9 ? 'complet' : i % 10 === 8 ? 'clos' : 'ouvert';
    const nbDeblocages = statut === 'complet' ? 3 : statut === 'clos' ? 1 : h.entier(0, 2);
    c.docs.set(chemins.appelOffres(`seed-ao-${String(i).padStart(2, '0')}`), {
      schemaVersion: 1,
      createdAt: d.createdAt,
      demandeId: d.id,
      titre: `${d.prestation.nom} à ${d.ville.nom}`,
      resume: d.resume.slice(0, 1000),
      metier: d.metier,
      metiersSecondaires: [],
      ville: d.ville.nom,
      codePostal: d.ville.codePostal,
      geo: d.ville.geo,
      geohash: encoderGeohash(d.ville.geo.latitude, d.ville.geo.longitude, 6),
      budgetMinCentimes: d.estimation.minCentimes,
      budgetMaxCentimes: d.estimation.maxCentimes,
      trancheBudget: tranche,
      urgence,
      exigences: [],
      qualiteLead,
      tarification: {
        mode: mode === 'promo' ? 'auto' : mode,
        ...prix,
        ...(mode === 'auto' || mode === 'promo'
          ? { grilleId: 'gironde-2026', detailCalcul: { ...auto.detailCalcul } }
          : {}),
        ...(mode === 'manuel' ? { fixePar: COMPTES_FIXES.admin.uid } : {}),
        fixeLe: d.createdAt,
        prixPlancherCentimes: bareme.plancher,
        prixPlafondCentimes: bareme.plafond,
        ...(mode === 'promo'
          ? { promo: { pourcentage: 50, jusquau: new Date(c.maintenant.getTime() + 7 * JOUR) } }
          : {}),
        historique: [],
      },
      nbDeblocagesMax: 3,
      nbDeblocages,
      acces: 'premium_prioritaire',
      fenetrePremiumMin: 60,
      ouvertLe: d.createdAt,
      ouvertJusquau: new Date(d.createdAt.getTime() + 7 * JOUR),
      statut,
      publiePar: mode === 'manuel' ? COMPTES_FIXES.admin.uid : 'algo',
    });
  });
}

const TEXTES = [
  'Travail soigné, chantier propre et délais tenus. Je recommande sans hésiter.',
  'Très bon contact, devis clair et respecté. Quelques jours de retard mais prévenus à l’avance.',
  'Intervention rapide et efficace, prix conforme au devis.',
  'Équipe sérieuse et ponctuelle, finitions impeccables.',
  'Résultat correct, communication à améliorer.',
];
const STATUTS_AVIS = [
  'publie',
  'publie',
  'publie',
  'publie',
  'publie',
  'publie',
  'publie',
  'publie',
  'en_attente',
  'refuse',
  'retire',
  'suspendu',
] as const;

/** 300 avis, dont en attente, refusés et signalés ; notes des fiches recalculées sur les avis publiés. */
export function genererAvis(c: ContexteSeed, entreprises: EntrepriseSeed[]) {
  const { h } = c;
  const enLigne = entreprises.filter((e) => e.enLigne);
  const publies = new Map<string, number[]>();
  for (let i = 0; i < NB_AVIS; i++) {
    const id = `seed-avis-${String(i).padStart(3, '0')}`;
    const e = enLigne[i % enLigne.length]!;
    const statut = STATUTS_AVIS[i % STATUTS_AVIS.length]!;
    const note = h.choisir([3, 4, 4, 5, 5, 5]);
    const createdAt = new Date(c.maintenant.getTime() - h.entier(5, 400) * JOUR);
    const fin = new Date(createdAt.getTime() - h.entier(5, 60) * JOUR);
    const auteur = `${h.choisir(PRENOMS)} ${h.choisir(NOMS)}`;
    if (statut === 'publie') publies.set(e.id, [...(publies.get(e.id) ?? []), note]);
    c.docs.set(chemins.avis(id), {
      schemaVersion: 1,
      createdAt,
      artisanId: e.id,
      nomAffiche: `${auteur.split(' ')[0]} ${auteur.split(' ')[1]![0]}.`,
      note,
      criteres: {
        qualite: note,
        delais: Math.max(1, note - h.entier(0, 1)),
        proprete: note,
        rapportQP: note,
      },
      pointsPositifs: h.suivant() < 0.5 ? ['Ponctuel', 'Propre'] : [],
      texte: h.choisir(TEXTES),
      photos: [],
      typeTravaux: e.metierPrincipal,
      finChantier: fin.toISOString().slice(0, 7),
      certificationAcceptee: true,
      preuve: { type: h.choisir(['facture', 'devis', 'mise_en_relation', 'aucune'] as const) },
      statut,
      ...(statut === 'publie' ? { publieLe: new Date(createdAt.getTime() + 2 * JOUR) } : {}),
      ...(['refuse', 'retire', 'suspendu'].includes(statut)
        ? {
            moderation: {
              parUid: COMPTES_FIXES.admin.uid,
              le: createdAt,
              motif: 'Contenu non conforme à la charte',
            },
          }
        : {}),
      ...(statut === 'publie' && i % 7 === 0
        ? {
            reponse: {
              texte: 'Merci pour votre confiance !',
              le: createdAt,
              parUid: `seed-art-${e.id.slice(-2)}`,
            },
          }
        : {}),
    });
    c.docs.set(chemins.auteurAvis(id), {
      schemaVersion: 1,
      auteurEmail: `auteur${i}@test.local`,
      ipHash: empreinte(`ip-${i}`).slice(0, 32),
    });
    if (statut === 'publie' && i % 40 === 0)
      c.docs.set(`${chemins.signalements(id)}/seed-signalement`, {
        schemaVersion: 1,
        parRole: 'artisan',
        motif: 'Avis mensonger',
        details: 'Je ne connais pas ce client.',
        statut: 'ouvert',
        createdAt: c.maintenant,
      });
  }
  return publies;
}
