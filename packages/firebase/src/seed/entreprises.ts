import { permissionsEffectives } from '@ph/core/admin';
import { slugifier } from '@ph/core/format';
import { encoderGeohash } from '@ph/core/geo';
import type { RoleMembre } from '@ph/core/equipe';
import { chemins, collections } from '../chemins';
import { nouveauMembre } from '../serveur/comptes/membres-outils';
import { nouvelUtilisateur } from '../serveur/comptes/utilisateurs';
import type { Hasard } from './hasard';
import type { Documents, FichiersSeed } from './referentiel';
import {
  ENSEIGNES,
  METIER_DEMO,
  NOMS,
  PRENOMS,
  VILLES,
  villeParNom,
  type VilleSeed,
} from './villes';

export interface CompteSeed {
  uid: string;
  email: string;
  nomAffiche: string;
}

export interface EntrepriseSeed {
  id: string;
  nomCommercial: string;
  metierPrincipal: string;
  ville: VilleSeed;
  plan: 'gratuit' | 'visibilite' | 'premium';
  enLigne: boolean;
  revendiquee: boolean;
  siren: string;
}

interface Appartenance {
  uid: string;
  artisanId: string;
  role: RoleMembre;
  statut: 'actif' | 'suspendu';
}

/** Comptes de test fixes (COMPTES §6.4) ; mot de passe commun en variable d'environnement. */
export const COMPTES_FIXES = {
  particulier: {
    uid: 'seed-particulier',
    email: 'particulier@test.local',
    nomAffiche: 'Camille Particulier',
  },
  proprio: { uid: 'seed-proprio', email: 'proprio@test.local', nomAffiche: 'Paul Proprio' },
  collab: { uid: 'seed-collab', email: 'collab@test.local', nomAffiche: 'Chloé Collab' },
  compta: { uid: 'seed-compta', email: 'compta@test.local', nomAffiche: 'Hugo Compta' },
  admin: { uid: 'seed-admin', email: 'admin@test.local', nomAffiche: 'Anne Admin' },
} as const satisfies Record<string, CompteSeed>;

const NB_ARTISANS = 60;
const VERIFICATIONS = ['a_faire', 'en_cours', 'refuse', 'expire'] as const;
const pad = (i: number) => String(i).padStart(2, '0');

export interface ContexteSeed {
  h: Hasard;
  f: FichiersSeed;
  maintenant: Date;
  docs: Documents;
  comptes: CompteSeed[];
  appartenances: Appartenance[];
}

export function ajouterUtilisateur(
  c: ContexteSeed,
  compte: CompteSeed,
  roles: ('particulier' | 'artisan')[],
  origine: 'inscription' | 'demande' | 'onboarding_pro' | 'invitation' | 'admin',
) {
  c.comptes.push(compte);
  const [prenom, ...nom] = compte.nomAffiche.split(' ');
  c.docs.set(chemins.user(compte.uid), {
    ...nouvelUtilisateur({
      email: compte.email,
      roles,
      origine,
      fournisseurs: ['password'],
      emailVerifie: true,
      maintenant: c.maintenant,
    }),
    prenom,
    nom: nom.join(' '),
    nomAffiche: compte.nomAffiche,
  });
}

/** Équipe interne : un superadmin. */
export function genererAdmin(c: ContexteSeed) {
  const a = COMPTES_FIXES.admin;
  ajouterUtilisateur(c, a, [], 'admin');
  c.docs.set(chemins.admin(a.uid), {
    schemaVersion: 1,
    createdAt: c.maintenant,
    nom: a.nomAffiche,
    email: a.email,
    role: 'superadmin',
    permissionsPlus: [],
    permissionsMoins: [],
    permissionsEffectives: permissionsEffectives({ role: 'superadmin' }),
    mfaObligatoire: true,
    actif: true,
  });
}

/** Rôle de chaque membre des 5 entreprises multi-membres (dont une personne dans 2 entreprises). */
function equipes(): Record<number, [string, RoleMembre][]> {
  const f = COMPTES_FIXES;
  return {
    0: [
      [f.proprio.uid, 'proprietaire'],
      [f.collab.uid, 'collaborateur'],
      [f.compta.uid, 'comptable'],
      ['seed-membre-01', 'gerant'],
    ],
    1: [
      ['seed-art-01', 'proprietaire'],
      [f.proprio.uid, 'gerant'],
      ['seed-membre-02', 'collaborateur'],
    ],
    2: [
      ['seed-art-02', 'proprietaire'],
      ['seed-membre-03', 'gerant'],
    ],
    3: [
      ['seed-art-03', 'proprietaire'],
      ['seed-membre-04', 'collaborateur'],
      ['seed-membre-05', 'comptable'],
    ],
    4: [
      ['seed-art-04', 'proprietaire'],
      ['seed-membre-06', 'collaborateur'],
    ],
  };
}

/** 60 entreprises sur les communes de Gironde, tous plans et statuts de vérification. */
export function genererEntreprises(c: ContexteSeed): EntrepriseSeed[] {
  const { h, f } = c;
  const metiers = Object.keys(f.recherche.metiers);
  const intentionsDe = (ids: string[]) =>
    f.recherche.intentions.filter((i) => ids.includes(i.metier)).map((i) => i.id);
  const eq = equipes();
  const sirens: string[] = [];
  const res: EntrepriseSeed[] = [];

  for (let i = 0; i < NB_ARTISANS; i++) {
    const demo = f.annuaire.artisans[i];
    const id = `seed-a-${pad(i)}`;
    const principal = demo ? METIER_DEMO[demo.metiers[0]!]! : h.choisir(metiers);
    const secondaire = demo?.metiers[1]
      ? METIER_DEMO[demo.metiers[1]]
      : h.suivant() < 0.3
        ? h.choisir(metiers)
        : undefined;
    const liste = [...new Set([principal, ...(secondaire ? [secondaire] : [])])];
    const ville = demo ? villeParNom(demo.ville) : VILLES[i % VILLES.length]!;
    const nomCommercial = demo?.nom ?? `${h.choisir(ENSEIGNES)} ${h.choisir(NOMS)} ${pad(i)}`;
    const plan =
      i < 5 || demo?.premium || i % 6 === 0 ? 'premium' : i % 6 === 1 ? 'visibilite' : 'gratuit';
    const verification = i >= 53 && i <= 56 ? VERIFICATIONS[i - 53]! : 'verifie';
    const statut = i === 52 ? 'suspendu' : 'actif';
    // 57 : fiche importée portant le SIREN de la n° 0 (doublon) ; 59 : fiche créée par l'admin, non revendiquée.
    const doublon = i === 57;
    const nonRevendiquee = doublon || i === 59;
    const siren = doublon ? sirens[0]! : h.siren();
    sirens.push(siren);
    const membres = nonRevendiquee
      ? []
      : (eq[i] ?? [[`seed-art-${pad(i)}`, 'proprietaire'] as [string, RoleMembre]]);
    const enLigne = !nonRevendiquee && verification === 'verifie' && statut === 'actif';
    const note = demo?.note ?? Math.round((3.8 + h.suivant() * 1.2) * 10) / 10;

    c.docs.set(chemins.artisan(id), {
      schemaVersion: 1,
      createdAt: new Date(c.maintenant.getTime() - h.entier(30, 900) * 86_400_000),
      updatedAt: c.maintenant,
      raisonSociale: nomCommercial.toUpperCase(),
      nomCommercial,
      slug: slugifier(nomCommercial, ville.nom),
      siren,
      siret: h.siret(siren),
      adresseSiege: {
        ligne1: `${h.entier(1, 120)} rue ${h.choisir(NOMS)}`,
        codePostal: ville.codePostal,
        ville: ville.nom,
        geo: ville.geo,
      },
      telephonePublic: `+335560${String(h.entier(10000, 99999))}`,
      metiers: liste,
      metierPrincipal: principal,
      intentions: intentionsDe(liste),
      tags: demo?.tags ?? [],
      pitch: demo?.pitch ?? `${nomCommercial} intervient à ${ville.nom} et alentours.`,
      description: '',
      labels: demo?.labels ?? ['decennale'],
      labelsVerifies: {},
      zoneIntervention: {
        centre: ville.geo,
        geohash: encoderGeohash(ville.geo.latitude, ville.geo.longitude),
        rayonKm: h.choisir([20, 30, 30, 50]),
        communes: [],
        rayonAccepteLe: c.maintenant,
      },
      source: nonRevendiquee ? 'admin' : 'direct',
      demandeOfferteUtilisee: false,
      budgetCle: demo?.budgetCle ?? h.choisir(['petit', 'moyen', 'grand'] as const),
      delaiDispoJours: demo?.delaiJ ?? h.entier(2, 30),
      plan,
      optionVisibilite: plan !== 'gratuit',
      verification: {
        statut: verification,
        ...(verification === 'verifie'
          ? { verifieLe: c.maintenant, verifiePar: COMPTES_FIXES.admin.uid }
          : {}),
      },
      noteMoyenne: note,
      nbAvis: 0,
      notesCriteres: {},
      tauxRecommandation: 0.9,
      tempsReponseMoyenMin: h.entier(30, 1440),
      tauxReponse: Math.round(h.suivant() * 100) / 100,
      quotaDemandesMois: plan === 'premium' ? 4 : 0,
      demandesRecuesMois: plan === 'premium' ? h.entier(0, 4) : 0,
      completude: h.entier(40, 100),
      enLigne,
      avertissements: 0,
      statut,
      onboarding: { etape: 3, termineLe: c.maintenant },
      nbMembres: membres.length,
      siegesMax: plan === 'premium' ? Math.max(3, membres.length) : 1,
      ...(membres[0] ? { proprietaireUid: membres[0][0] } : {}),
      origine: doublon ? 'import' : nonRevendiquee ? 'admin' : 'onboarding',
      revendiquee: !nonRevendiquee,
    });
    if (!doublon)
      c.docs.set(`${collections.sirenIndex}/${siren}`, {
        schemaVersion: 1,
        artisanId: id,
        createdAt: c.maintenant,
      });
    if (!nonRevendiquee)
      c.docs.set(chemins.portefeuille(id), {
        schemaVersion: 1,
        soldeCredits: plan === 'premium' ? 5 : 0,
        creditsInclusMois: plan === 'premium' ? 5 : 0,
        creditsInclusRestants: plan === 'premium' ? h.entier(0, 5) : 0,
        updatedAt: c.maintenant,
      });
    for (const [uid, role] of membres) {
      c.docs.set(
        chemins.membre(id, uid),
        nouveauMembre({ role, ajoutePar: membres[0]![0], maintenant: c.maintenant }),
      );
      c.appartenances.push({ uid, artisanId: id, role, statut: 'actif' });
    }
    res.push({
      id,
      nomCommercial,
      metierPrincipal: principal,
      ville,
      plan,
      enLigne,
      revendiquee: !nonRevendiquee,
      siren,
    });
  }
  genererPersonnesDesEquipes(c);
  return res;
}

/** Un profil par personne membre d'au moins une équipe. */
function genererPersonnesDesEquipes(c: ContexteSeed) {
  const vus = new Set<string>();
  for (const a of c.appartenances) {
    if (vus.has(a.uid)) continue;
    vus.add(a.uid);
    const fixe = Object.values(COMPTES_FIXES).find((x) => x.uid === a.uid);
    const compte = fixe ?? {
      uid: a.uid,
      email: `${a.uid.replace('seed-', '')}@test.local`,
      nomAffiche: `${c.h.choisir(PRENOMS)} ${c.h.choisir(NOMS)}`,
    };
    ajouterUtilisateur(
      c,
      compte,
      fixe === COMPTES_FIXES.proprio ? ['particulier', 'artisan'] : ['artisan'],
      a.role === 'proprietaire' ? 'onboarding_pro' : 'invitation',
    );
  }
}

/** Cas limites : invitation expirée, revendication en cours (COMPTES §6.4). */
export function genererCasLimites(c: ContexteSeed) {
  const passe = new Date(c.maintenant.getTime() - 10 * 86_400_000);
  c.docs.set(`${collections.invitations}/seed-invitation-expiree`, {
    schemaVersion: 1,
    createdAt: passe,
    artisanId: 'seed-a-00',
    email: 'ancien.salarie@test.local',
    role: 'collaborateur',
    invitePar: COMPTES_FIXES.proprio.uid,
    jetonHash: '0'.repeat(64),
    statut: 'expiree',
    expireLe: new Date(passe.getTime() + 7 * 86_400_000),
  });
  const demandeur = {
    uid: 'seed-revendication',
    email: 'dirigeant@test.local',
    nomAffiche: 'Louis Dirigeant',
  };
  ajouterUtilisateur(c, demandeur, ['particulier'], 'inscription');
  c.docs.set(`${collections.revendications}/seed-revendication`, {
    schemaVersion: 1,
    createdAt: c.maintenant,
    artisanId: 'seed-a-59',
    demandeurUid: demandeur.uid,
    siren: c.docs.get(chemins.artisan('seed-a-59'))!.siren as string,
    preuve: 'kbis',
    statut: 'ouverte',
  });
}
