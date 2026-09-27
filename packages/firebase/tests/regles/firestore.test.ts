import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { contexte, creerEnvironnement } from './environnement';
import { semer } from './graine';
import { PROFILS, membresA1, staffAvec, type Profil } from './profils';

type Operation =
  | { get: string }
  | { liste: string; filtre?: [string, string] }
  | { groupe: string; filtre: [string, string] }
  | { creer: string; donnees: Record<string, unknown> }
  | { maj: string; donnees: Record<string, unknown> }
  | { supprimer: string };

interface Cas {
  nom: string;
  op: Operation;
  autorises: Profil[];
}

const TOUS = PROFILS;
const CONNECTES = PROFILS.filter((p) => p !== 'anonyme');
const AVEC_ROLE_ARTISAN: Profil[] = [...membresA1('p', 'g', 'c', 'x'), 'autreArtisan'];
const t = Timestamp.fromDate(new Date('2026-09-01T10:00:00Z'));

const documentValide = (id: string) => ({
  schemaVersion: 1,
  type: 'kbis',
  statut: 'en_attente',
  storagePath: `artisans/a1/documents/${id}/kbis.pdf`,
  tailleOctets: 1000,
});

const CAS: Cas[] = [
  // ----- utilisateurs -----
  {
    nom: 'lire son profil (ou staff avec droit aux données personnelles)',
    op: { get: 'users/part1' },
    autorises: ['particulier', ...staffAvec('art', true)],
  },
  {
    nom: 'modifier son prénom',
    op: { maj: 'users/part1', donnees: { prenom: 'Camille' } },
    autorises: ['particulier'],
  },
  {
    nom: 'modifier son téléphone (réservé à une Function)',
    op: { maj: 'users/part1', donnees: { telephone: '+33700000000' } },
    autorises: [],
  },
  {
    nom: 'modifier ses rôles',
    op: { maj: 'users/part1', donnees: { roles: ['particulier', 'artisan'] } },
    autorises: [],
  },
  {
    nom: 'choisir une entreprise dont on est membre',
    op: { maj: 'users/prop', donnees: { entrepriseActive: 'a1' } },
    autorises: ['proprietaire'],
  },
  {
    nom: 'choisir une entreprise dont on n’est pas membre',
    op: { maj: 'users/prop', donnees: { entrepriseActive: 'a2' } },
    autorises: [],
  },
  {
    nom: 'créer un profil',
    op: { creer: 'users/nouveau-{p}', donnees: { roles: ['particulier'] } },
    autorises: [],
  },
  {
    nom: 'lire ses consentements',
    op: { get: 'users/part1/consentements/c1' },
    autorises: ['particulier', ...staffAvec('art', true)],
  },
  {
    nom: 'enregistrer un consentement (horodatage serveur)',
    op: {
      creer: 'users/part1/consentements/nouveau-{p}',
      donnees: {
        schemaVersion: 1,
        type: 'marketing_email',
        valeur: false,
        version: '2026-09',
        source: '/mon-espace',
        createdAt: serverTimestamp(),
      },
    },
    autorises: ['particulier'],
  },
  {
    nom: 'enregistrer un consentement antidaté',
    op: {
      creer: 'users/part1/consentements/antidate-{p}',
      donnees: {
        schemaVersion: 1,
        type: 'cgu',
        valeur: true,
        version: '2026-09',
        source: '/',
        createdAt: t,
      },
    },
    autorises: [],
  },
  {
    nom: 'modifier un consentement (journal en ajout seul)',
    op: { maj: 'users/part1/consentements/c1', donnees: { valeur: false } },
    autorises: [],
  },
  {
    nom: 'marquer une notification comme lue',
    op: { maj: 'users/part1/notifications/n1', donnees: { lu: true } },
    autorises: ['particulier'],
  },
  {
    nom: 'modifier le texte d’une notification',
    op: { maj: 'users/part1/notifications/n1', donnees: { titre: 'x' } },
    autorises: [],
  },

  // ----- artisans -----
  { nom: 'lire la fiche publique', op: { get: 'artisansPublic/a1' }, autorises: TOUS },
  {
    nom: 'écrire la fiche publique',
    op: { maj: 'artisansPublic/a1', donnees: { enLigne: false } },
    autorises: [],
  },
  {
    nom: 'lire l’entreprise',
    op: { get: 'artisans/a1' },
    autorises: [...membresA1('p', 'g', 'c', 'x'), ...staffAvec('art')],
  },
  {
    nom: 'modifier le pitch',
    op: { maj: 'artisans/a1', donnees: { pitch: 'Plombier chauffagiste' } },
    autorises: ['proprietaire', 'gerant'],
  },
  {
    nom: 'modifier son plan (webhook Stripe uniquement)',
    op: { maj: 'artisans/a1', donnees: { plan: 'premium' } },
    autorises: [],
  },
  {
    nom: 'rayon d’intervention de 50 km',
    op: {
      maj: 'artisans/a1',
      donnees: { zoneIntervention: { rayonKm: 50, rayonAccepteLe: t, communes: [] } },
    },
    autorises: ['proprietaire', 'gerant'],
  },
  {
    nom: 'rayon d’intervention de 120 km',
    op: {
      maj: 'artisans/a1',
      donnees: { zoneIntervention: { rayonKm: 120, rayonAccepteLe: t, communes: [] } },
    },
    autorises: [],
  },
  {
    nom: 'pitch de plus de 280 caractères',
    op: { maj: 'artisans/a1', donnees: { pitch: 'x'.repeat(281) } },
    autorises: [],
  },
  {
    nom: 'créer une entreprise',
    op: { creer: 'artisans/nouvelle-{p}', donnees: { nomCommercial: 'x' } },
    autorises: [],
  },
  {
    nom: 'lire les membres',
    op: { get: 'artisans/a1/membres/prop' },
    autorises: [...membresA1('p', 'g', 'c', 'x'), ...staffAvec('art')],
  },
  {
    nom: 'se nommer gérant',
    op: { maj: 'artisans/a1/membres/collab', donnees: { role: 'gerant' } },
    autorises: [],
  },
  {
    nom: 'lire un document privé',
    op: { get: 'artisans/a1/documents/d1' },
    autorises: [
      ...membresA1('p', 'g', 'c'),
      ...staffAvec('art'),
      ...staffAvec('avi'),
      ...staffAvec('file'),
    ],
  },
  {
    nom: 'déposer un document',
    op: { creer: 'artisans/a1/documents/doc-{p}', donnees: documentValide('doc-{p}') },
    autorises: ['proprietaire', 'gerant', 'collaborateur'],
  },
  {
    nom: 'déposer un document déjà validé',
    op: {
      creer: 'artisans/a1/documents/valide-{p}',
      donnees: { ...documentValide('valide-{p}'), statut: 'valide' },
    },
    autorises: [],
  },
  {
    nom: 'déposer un document ailleurs que dans son dossier',
    op: { creer: 'artisans/a1/documents/ailleurs-{p}', donnees: documentValide('autre') },
    autorises: [],
  },
  {
    nom: 'valider un document',
    op: { maj: 'artisans/a1/documents/d1', donnees: { statut: 'valide' } },
    autorises: [],
  },
  {
    nom: 'lire une réalisation publiée',
    op: { get: 'artisans/a1/realisations/publiee' },
    autorises: TOUS,
  },
  {
    nom: 'lire une réalisation en préparation',
    op: { get: 'artisans/a1/realisations/brouillon' },
    autorises: [...membresA1('p', 'g', 'c', 'x'), ...staffAvec('art')],
  },
  {
    nom: 'publier une réalisation sans l’autorisation du propriétaire du chantier',
    op: {
      creer: 'artisans/a1/realisations/sans-{p}',
      donnees: { titre: 'x', publie: true, autorisationProprietaire: false },
    },
    autorises: [],
  },
  {
    nom: 'publier une réalisation autorisée',
    op: {
      creer: 'artisans/a1/realisations/avec-{p}',
      donnees: { titre: 'x', publie: true, autorisationProprietaire: true },
    },
    autorises: ['proprietaire', 'gerant', 'collaborateur'],
  },
  {
    nom: 'supprimer une réalisation',
    op: { supprimer: 'artisans/a1/realisations/a-supprimer-{p}' },
    autorises: ['proprietaire', 'gerant', 'collaborateur'],
  },
  {
    nom: 'lire les statistiques',
    op: { get: 'artisans/a1/statsJour/2026-09-01' },
    autorises: [...membresA1('p', 'g', 'c'), ...staffAvec('art')],
  },
  {
    nom: 'lire la facturation privée',
    op: { get: 'artisans/a1/prive/facturation' },
    autorises: [...membresA1('p', 'g', 'x'), ...staffAvec('fin')],
  },
  {
    nom: 'écrire la facturation privée',
    op: { maj: 'artisans/a1/prive/facturation', donnees: { stripeCustomerId: 'cus_2' } },
    autorises: [],
  },
  {
    nom: 'lire les scores de nuit',
    op: { get: 'artisanScores/a1' },
    autorises: [...membresA1('p', 'g'), ...staffAvec('mat')],
  },

  // ----- demandes -----
  {
    nom: 'lire sa demande',
    op: { get: 'demandes/dem1' },
    autorises: ['particulier', ...staffAvec('dem')],
  },
  {
    nom: 'créer une demande (Server Action uniquement)',
    op: { creer: 'demandes/nouvelle-{p}', donnees: { particulierUid: 'part1' } },
    autorises: [],
  },
  {
    nom: 'lire une attribution de son entreprise',
    op: { get: 'demandes/dem1/attributions/a1' },
    autorises: [...membresA1('p', 'g', 'c'), ...staffAvec('dem')],
  },
  {
    nom: 'accepter une attribution directement',
    op: { maj: 'demandes/dem1/attributions/a1', donnees: { statut: 'acceptee' } },
    autorises: [],
  },
  {
    nom: '« mes attributions » (collection group)',
    op: { groupe: 'attributions', filtre: ['artisanId', 'a1'] },
    autorises: [...membresA1('p', 'g', 'c'), ...staffAvec('dem')],
  },
  {
    nom: 'lire les messages d’une demande',
    op: { get: 'demandes/dem1/messages/m1' },
    autorises: ['particulier', ...membresA1('p', 'g', 'c'), ...staffAvec('dem')],
  },
  {
    nom: 'écrire un message directement',
    op: { creer: 'demandes/dem1/messages/m-{p}', donnees: { artisanId: 'a1', texte: 'x' } },
    autorises: [],
  },
  {
    nom: 'lire son dossier diagnostic',
    op: { get: 'dossiersDiag/diag1' },
    autorises: ['particulier', ...staffAvec('dem')],
  },
  {
    nom: 'lire une attribution diagnostic',
    op: { get: 'dossiersDiag/diag1/attributions/a1' },
    autorises: [...membresA1('p', 'g', 'c'), ...staffAvec('dem')],
  },
  { nom: 'lire la trace du matching', op: { get: 'matching/dem1' }, autorises: staffAvec('mat') },
  {
    nom: 'lire la configuration du matching',
    op: { get: 'matchingConfig/actif' },
    autorises: staffAvec('mat'),
  },

  // ----- appels d'offres et crédits -----
  {
    nom: 'lire un appel d’offres (anonymisé)',
    op: { get: 'appelsOffres/ao1' },
    autorises: [...AVEC_ROLE_ARTISAN, ...staffAvec('ao')],
  },
  {
    nom: 'lire sa réponse',
    op: { get: 'appelsOffres/ao1/reponses/a1' },
    autorises: [...membresA1('p', 'g', 'c'), ...staffAvec('ao')],
  },
  {
    nom: 'se débloquer un appel d’offres sans payer',
    op: { creer: 'appelsOffres/ao1/deblocages/a1', donnees: { moyen: 'offert_admin' } },
    autorises: [],
  },
  {
    nom: 'lire son déblocage',
    op: { get: 'appelsOffres/ao1/deblocages/a1' },
    autorises: [...membresA1('p', 'g', 'c'), ...staffAvec('ao')],
  },
  {
    nom: 'lire l’historique des prix',
    op: { get: 'appelsOffres/ao1/historiquePrix/h1' },
    autorises: staffAvec('ao'),
  },
  {
    nom: 'lire ses achats',
    op: { get: 'achatsLeads/al1' },
    autorises: [...membresA1('p', 'g', 'c', 'x'), ...staffAvec('ao'), ...staffAvec('fin')],
  },
  {
    nom: 'lire son portefeuille',
    op: { get: 'portefeuilles/a1' },
    autorises: [...membresA1('p', 'g', 'c', 'x'), ...staffAvec('ao'), ...staffAvec('fin')],
  },
  {
    nom: 's’ajouter des crédits',
    op: { maj: 'portefeuilles/a1', donnees: { soldeCredits: 999 } },
    autorises: [],
  },
  {
    nom: 'lire les mouvements de crédits',
    op: { get: 'portefeuilles/a1/mouvements/mv1' },
    autorises: [...membresA1('p', 'g', 'c', 'x'), ...staffAvec('ao'), ...staffAvec('fin')],
  },
  { nom: 'lire les packs de crédits', op: { get: 'packsCredits/p10' }, autorises: CONNECTES },
  {
    nom: 'lire une contestation',
    op: { get: 'remboursementsLeads/r1' },
    autorises: [...membresA1('p', 'g', 'c'), ...staffAvec('ao')],
  },
  { nom: 'lire le barème', op: { get: 'grillesTarifaires/g1' }, autorises: staffAvec('ao') },

  // ----- équipes -----
  {
    nom: 'lire une invitation',
    op: { get: 'invitations/i1' },
    autorises: [...membresA1('p', 'g'), ...staffAvec('art')],
  },
  {
    nom: 's’inviter',
    op: { creer: 'invitations/i-{p}', donnees: { artisanId: 'a1', email: 'moi@exemple.fr' } },
    autorises: [],
  },
  {
    nom: 'lire sa revendication',
    op: { get: 'revendications/rv1' },
    autorises: ['particulier', ...staffAvec('art'), ...staffAvec('avi'), ...staffAvec('file')],
  },
  {
    nom: 'lire une demande d’accès',
    op: { get: 'demandesAcces/da1' },
    autorises: ['particulier', ...membresA1('p', 'g'), ...staffAvec('art')],
  },

  // ----- back-office -----
  {
    nom: 'lire une fiche d’équipe interne',
    op: { get: 'admins/modo' },
    autorises: ['superadmin', 'admin', 'moderateur'],
  },
  {
    nom: 's’attribuer des droits',
    op: { maj: 'admins/modo', donnees: { role: 'superadmin' } },
    autorises: [],
  },
  {
    nom: 'lire les rôles personnalisés',
    op: { get: 'rolesAdmin/r1' },
    autorises: [...new Set<Profil>([...staffAvec('aud'), 'superadmin', 'admin'])],
  },
  {
    nom: 'lire la file de modération',
    op: { get: 'filesModeration/f1' },
    autorises: staffAvec('file'),
  },
  {
    nom: 'lire une sanction',
    op: { get: 'sanctions/s1' },
    autorises: [...membresA1('p', 'g'), ...staffAvec('art')],
  },
  {
    nom: 'lire une note interne',
    op: { get: 'notesInternes/n1' },
    autorises: ['superadmin', 'admin', 'moderateur', 'commercial', 'finance'],
  },
  { nom: 'lire le journal d’audit', op: { get: 'auditLog/l1' }, autorises: staffAvec('aud') },
  {
    nom: 'écrire dans le journal d’audit',
    op: { creer: 'auditLog/l-{p}', donnees: { action: 'x' } },
    autorises: [],
  },
  { nom: 'lire une demande RGPD', op: { get: 'rgpdDemandes/g1' }, autorises: staffAvec('rgpd') },
  { nom: 'lire les annonces', op: { get: 'annonces/an1' }, autorises: TOUS },
  {
    nom: 'lire le cycle de vie d’un artisan',
    op: { get: 'cycleEtat/a1' },
    autorises: staffAvec('cnv'),
  },
  {
    nom: 'lire les traces de conversion',
    op: { get: 'cycleTraces/t1' },
    autorises: staffAvec('cnv'),
  },
  { nom: 'lire une séquence', op: { get: 'sequences/s1' }, autorises: staffAvec('cnv') },
  {
    nom: 'lire un prospect (données personnelles)',
    op: { get: 'prospects/pr1' },
    autorises: staffAvec('cnv', true),
  },
  {
    nom: 'lire les réglages de conversion',
    op: { get: 'config/cycle' },
    autorises: staffAvec('cnv'),
  },
  {
    nom: 'lire une source partenaire',
    op: { get: 'sourcesDemandes/src1' },
    autorises: staffAvec('dem'),
  },
  {
    nom: 'lire le journal d’import',
    op: { get: 'importsDemandes/imp1' },
    autorises: staffAvec('dem'),
  },
  {
    nom: 'lire une preuve de consentement',
    op: { get: 'preuvesConsentement/pc1' },
    autorises: [...new Set<Profil>([...staffAvec('rgpd'), ...staffAvec('dem', true)])],
  },
  {
    nom: 'lire les agrégats de comportement',
    op: { get: 'comportementAgregats/accueil_2026-09-01_particulier' },
    autorises: staffAvec('cmp'),
  },
  { nom: 'lire une page suivie', op: { get: 'pagesSuivies/accueil' }, autorises: staffAvec('cmp') },
  {
    nom: 'lire une alerte de comportement',
    op: { get: 'comportementAlertes/al1' },
    autorises: staffAvec('cmp'),
  },
  { nom: 'lire un test A/B', op: { get: 'abTests/ab1' }, autorises: staffAvec('cmp') },
  {
    nom: 'lire les réglages de comportement',
    op: { get: 'config/comportement' },
    autorises: staffAvec('cmp'),
  },
  { nom: 'lire une analyse IA', op: { get: 'iaAnalyses/ia1' }, autorises: staffAvec('ia') },
  {
    nom: 'lire une recommandation IA',
    op: { get: 'iaRecommandations/rec1' },
    autorises: staffAvec('ia'),
  },
  { nom: 'lire les réglages IA', op: { get: 'config/ia' }, autorises: staffAvec('ia') },

  // ----- avis -----
  { nom: 'lire un avis publié', op: { get: 'avis/publie' }, autorises: TOUS },
  {
    nom: 'lire un avis en attente',
    op: { get: 'avis/attente' },
    autorises: [
      ...membresA1('p', 'g', 'c', 'x'),
      ...new Set<Profil>([...staffAvec('avi'), ...staffAvec('file')]),
    ],
  },
  {
    nom: 'lire l’auteur d’un avis (données personnelles)',
    op: { get: 'avis/publie/prive/auteur' },
    autorises: [...new Set<Profil>([...staffAvec('avi', true), ...staffAvec('file', true)])],
  },
  {
    nom: 'publier un avis directement',
    op: { creer: 'avis/a-{p}', donnees: { artisanId: 'a1', statut: 'publie', note: 5 } },
    autorises: [],
  },
  {
    nom: 'répondre à un avis directement',
    op: { maj: 'avis/publie', donnees: { reponse: { texte: 'Merci' } } },
    autorises: [],
  },
  {
    nom: 'lire un signalement',
    op: { get: 'avis/publie/signalements/sg1' },
    autorises: [...new Set<Profil>([...staffAvec('avi'), ...staffAvec('file')])],
  },

  // ----- facturation -----
  {
    nom: 'lire son abonnement',
    op: { get: 'abonnements/sub1' },
    autorises: [...membresA1('p', 'g'), ...staffAvec('fin')],
  },
  {
    nom: 'lire une facture',
    op: { get: 'factures/f1' },
    autorises: [...membresA1('p', 'g', 'x'), ...staffAvec('fin')],
  },
  {
    nom: 'lire un paiement',
    op: { get: 'paiements/pi1' },
    autorises: [...membresA1('p', 'g'), ...staffAvec('fin')],
  },
  {
    nom: 'lire un code promo',
    op: { get: 'codesPromo/BIENVENUE' },
    autorises: [...new Set<Profil>([...staffAvec('fin'), ...staffAvec('cnv')])],
  },
  {
    nom: 'marquer sa facture payée',
    op: { maj: 'factures/f1', donnees: { statut: 'paid' } },
    autorises: [],
  },

  // ----- référentiels -----
  {
    nom: 'lire les champs d’une prestation',
    op: { get: 'referentiel/prestations/items/peinture' },
    autorises: TOUS,
  },
  {
    nom: 'lire les PRIX d’une prestation (révélation côté serveur uniquement)',
    op: { get: 'referentiel/prestations/prix/peinture' },
    autorises: [],
  },
  {
    nom: 'lister les prix des prestations',
    op: { liste: 'referentiel/prestations/prix' },
    autorises: [],
  },
  {
    nom: 'modifier une prestation',
    op: { maj: 'referentiel/prestations/items/peinture', donnees: { nom: 'x' } },
    autorises: [],
  },
  {
    nom: 'lire une intention de recherche',
    op: { get: 'referentiel/recherche/intentions/sdb' },
    autorises: TOUS,
  },
  {
    nom: 'lire les synonymes',
    op: { get: 'referentiel/recherche/synonymes/global' },
    autorises: TOUS,
  },
  { nom: 'lire une commune', op: { get: 'communes/cenon' }, autorises: TOUS },
  { nom: 'lire les chiffres publics', op: { get: 'stats/public' }, autorises: TOUS },
  { nom: 'lire la configuration publique', op: { get: 'config/app' }, autorises: TOUS },
  {
    nom: 'activer la maintenance',
    op: { maj: 'config/app', donnees: { maintenance: true } },
    autorises: [],
  },
  { nom: 'lire les surcharges de feature flags', op: { get: 'config/flags' }, autorises: [] },

  // ----- Admin SDK uniquement -----
  ...[
    'brouillons/b1',
    'emails/e1',
    'suppressions/h1',
    'rateLimits/x',
    'idempotence/x',
    'sirenIndex/732829320',
    'contacts/ct1',
    'litiges/li1',
    'stripeEvents/evt1',
    'comportementSessions/cs1',
    'iaContexte/global',
  ].map((chemin): Cas => ({
    nom: `lire ${chemin.split('/')[0]} (Admin SDK uniquement)`,
    op: { get: chemin },
    autorises: [],
  })),
  {
    nom: 'écrire un brouillon (Server Action uniquement)',
    op: { creer: 'brouillons/b-{p}', donnees: { parcours: 'simulateur' } },
    autorises: [],
  },
  {
    nom: 'se réserver un SIREN',
    op: { creer: 'sirenIndex/{p}', donnees: { artisanId: 'a1' } },
    autorises: [],
  },
];

function executer(db: Firestore, op: Operation, profil: Profil): Promise<unknown> {
  const p = (s: string) => s.replaceAll('{p}', profil);
  const donnees = (d: Record<string, unknown>) =>
    JSON.parse(JSON.stringify(d).replaceAll('{p}', profil), (_, v) => v) as Record<string, unknown>;
  if ('get' in op) return getDoc(doc(db, p(op.get)));
  if ('liste' in op)
    return getDocs(
      op.filtre
        ? query(collection(db, op.liste), where(op.filtre[0], '==', op.filtre[1]))
        : collection(db, op.liste),
    );
  if ('groupe' in op)
    return getDocs(query(collectionGroup(db, op.groupe), where(op.filtre[0], '==', op.filtre[1])));
  if ('creer' in op) return setDoc(doc(db, p(op.creer)), avecValeursSpeciales(op.donnees, donnees));
  if ('maj' in op) return updateDoc(doc(db, p(op.maj)), avecValeursSpeciales(op.donnees, donnees));
  return deleteDoc(doc(db, p(op.supprimer)));
}

/** Remplace {p} sans casser les valeurs spéciales (Timestamp, serverTimestamp). */
function avecValeursSpeciales(
  d: Record<string, unknown>,
  remplacer: (x: Record<string, unknown>) => Record<string, unknown>,
) {
  const simples = Object.fromEntries(
    Object.entries(d).filter(
      ([, v]) =>
        typeof v !== 'object' || v === null || Array.isArray(v) || v.constructor === Object,
    ),
  );
  const speciales = Object.fromEntries(Object.entries(d).filter(([k]) => !(k in simples)));
  const resultat = { ...remplacer(simples), ...speciales };
  // Les objets imbriqués contenant un Timestamp sont repris tels quels.
  for (const [k, v] of Object.entries(d))
    if (v && typeof v === 'object' && JSON.stringify(v).includes('seconds')) resultat[k] = v;
  return resultat;
}

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await creerEnvironnement();
  await semer(env);
});

afterAll(async () => {
  await env?.cleanup();
});

describe.each(CAS)('$nom', ({ op, autorises }) => {
  it.each(PROFILS)('%s', async (profil) => {
    const db = contexte(env, profil).firestore() as unknown as Firestore;
    const promesse = executer(db, op, profil);
    await (autorises.includes(profil) ? assertSucceeds(promesse) : assertFails(promesse));
  });
});
