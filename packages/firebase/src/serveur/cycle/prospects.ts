import { emailsProspect, preparerDonnees } from '@ph/core/conversion';
import { libelleDelai } from '@ph/core/demandes';
import { ErreurMetier } from '@ph/core/erreurs';
import { encoderGeohash } from '@ph/core/geo';
import { distanceKm } from '@ph/core/matching';
import { TEXTE_CONSENTEMENT_PROSPECT } from '@ph/core/schemas';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { NomModele } from '@ph/core/notifications';
import { chemins, collections } from '../../chemins';
import type { Notifier } from '../comptes/services';
import type { Geocodeur } from '../demandes/geocodage';
import { empreinteEmail } from '../notifications/notifier';
import { lireConfigCycle } from './moteur';
import { PREFIXE_TACHE } from './taches';

const J = 86_400_000;
const RAYON_KM = 20;
const CONSERVATION_MS = 3 * 365 * J;

export interface ServicesProspect {
  db: Firestore;
  horloge: () => number;
  notifier: Notifier;
  geocodeur: Geocodeur;
  /** Demandes estimées sur 30 jours (STATS_DEMANDES), même chiffre que la page. */
  estimerDemandes: (codePostal: string, metier: string) => number | null;
  nomMetier: (id: string) => string | undefined;
  urlSite: string;
}

/** Artisans en ligne du métier dont la zone est à moins de 20 km. */
async function inscritsZone(
  db: Firestore,
  metier: string,
  centre: { latitude: number; longitude: number },
) {
  const r = await db
    .collection(collections.artisans)
    .where('metiers', 'array-contains', metier)
    .limit(500)
    .get();
  return r.docs.filter((a) => {
    const c = a.get('zoneIntervention.centre') as typeof centre | undefined;
    return a.get('enLigne') === true && c && distanceKm(c, centre) <= RAYON_KM;
  }).length;
}

/** Budget moyen des vraies demandes du métier dans le département sur 90 jours, sinon rien. */
async function budgetMoyen(db: Firestore, metier: string, codePostal: string, maintenant: number) {
  const r = await db
    .collection(collections.demandes)
    .where('metierRequis', '==', metier)
    .where('createdAt', '>=', Timestamp.fromMillis(maintenant - 90 * J))
    .limit(300)
    .get();
  const budgets = r.docs
    .filter(
      (d) =>
        String(d.get('adresseChantier.codePostal') ?? '').slice(0, 2) === codePostal.slice(0, 2),
    )
    .map(
      (d) =>
        ((d.get('estimation.minCentimes') as number) +
          (d.get('estimation.maxCentimes') as number)) /
        2,
    );
  return budgets.length
    ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length)
    : undefined;
}

/**
 * « Recevoir l'estimation par email » (CONVERSION §3 S1, §6) : un prospect par adresse, jamais si
 * l'adresse a déjà un compte ; `prospect-estimation` part tout de suite avec les vrais chiffres.
 * Le résultat est le même dans tous les cas pour ne rien révéler des comptes existants.
 */
export async function enregistrerProspect(
  s: ServicesProspect,
  e: { email: string; metier: string; codePostal: string; source?: 'estimation' | 'facebook' },
): Promise<void> {
  const nom = s.nomMetier(e.metier);
  if (!nom) throw new ErreurMetier('ENTREE_INVALIDE', 'Choisissez votre métier dans la liste.');
  const maintenant = s.horloge();
  const id = empreinteEmail(e.email);
  const ref = s.db.collection(collections.prospects).doc(id);
  const [existant, compte] = await Promise.all([
    ref.get(),
    s.db.collection(collections.users).where('email', '==', e.email).limit(1).get(),
  ]);
  if (existant.exists || !compte.empty) return;
  const lieu = await s.geocodeur(e.codePostal);
  if (!lieu) throw new ErreurMetier('ENTREE_INVALIDE', 'Code postal inconnu.');
  const [inscrits, budget] = await Promise.all([
    inscritsZone(s.db, e.metier, lieu.geo),
    budgetMoyen(s.db, e.metier, e.codePostal, maintenant),
  ]);
  const t0 = Timestamp.fromMillis(maintenant);
  try {
    await ref.create({
      schemaVersion: 1,
      email: e.email,
      source: e.source ?? 'estimation',
      metiers: [e.metier],
      commune: lieu.ville,
      geo: lieu.geo,
      geohash: encoderGeohash(lieu.geo.latitude, lieu.geo.longitude),
      rayonKm: RAYON_KM,
      etape: 'prospect',
      consentement: { base: 'interet_legitime_b2b', date: t0, texte: TEXTE_CONSENTEMENT_PROSPECT },
      desabonne: false,
      expireLe: Timestamp.fromMillis(maintenant + CONSERVATION_MS),
      createdAt: t0,
      updatedAt: t0,
    });
  } catch (err) {
    if ((err as { code?: number }).code === 6) return; // deux envois simultanés
    throw err;
  }
  const preparees = preparerDonnees('prospect-estimation', {
    metier: nom.toLowerCase(),
    ville: lieu.ville,
    demandes30j: s.estimerDemandes(e.codePostal, e.metier) ?? 0,
    inscritsZone: inscrits,
    ...(budget ? { budgetMoyenCentimes: budget } : {}),
    lien: `${s.urlSite}/pro?metier=${e.metier}#inscription`,
  });
  if (preparees.ok)
    await s.notifier({
      modele: 'prospect-estimation',
      destinataire: { email: e.email },
      refObjet: `${collections.prospects}/${id}`,
      donnees: preparees.donnees,
    });
}

type DemandeProche = {
  le: number;
  geo: { latitude: number; longitude: number };
  ville: string;
  prestationId: string;
  delai: string;
  min: number;
  max: number;
};

/** Demandes des 30 derniers jours d'un métier (une lecture par métier et par passage). */
async function demandesRecentes(db: Firestore, metier: string, maintenant: number) {
  const r = await db
    .collection(collections.demandes)
    .where('metierRequis', '==', metier)
    .where('createdAt', '>=', Timestamp.fromMillis(maintenant - 30 * J))
    .limit(500)
    .get();
  return r.docs
    .filter((d) => d.get('adresseChantier.geo'))
    .map((d): DemandeProche => ({
      le: (d.get('createdAt') as Timestamp).toMillis(),
      geo: d.get('adresseChantier.geo') as DemandeProche['geo'],
      ville: d.get('adresseChantier.ville') as string,
      prestationId: d.get('prestationId') as string,
      delai: d.get('delaiSouhaite') as string,
      min: d.get('estimation.minCentimes') as number,
      max: d.get('estimation.maxCentimes') as number,
    }));
}

const CLE_ENVOI: Record<string, 'demandeZone' | 'derniere' | 'resume'> = {
  'prospect-demande-zone': 'demandeZone',
  'prospect-derniere': 'derniere',
  'resume-zone-mensuel': 'resume',
};

/**
 * `cycleProspects` (7 h) : suite de la séquence S1. Un email au plus par prospect et par jour,
 * dans l'ordre demande réelle de la zone, « dernière », résumé mensuel ; sans chiffre, rien.
 */
export async function planifierProspects(
  s: Pick<ServicesProspect, 'db' | 'horloge' | 'notifier' | 'nomMetier' | 'urlSite'>,
): Promise<{ examines: number; envoyes: number }> {
  const maintenant = s.horloge();
  const signataire = (await lireConfigCycle(s.db)).signataire.nom;
  const prospects = await s.db
    .collection(collections.prospects)
    .where('etape', '==', 'prospect')
    .limit(500)
    .get();
  const parMetier = new Map<string, Promise<DemandeProche[]>>();
  const noms = new Map<string, string>();
  let envoyes = 0;
  for (const p of prospects.docs) {
    if (p.get('desabonne') === true) continue;
    // Réponse en cours de traitement : pause tant que la tâche est ouverte.
    const pause = p.get('pause.par') as string | undefined;
    if (pause?.startsWith(PREFIXE_TACHE)) {
      const tache = await s.db
        .collection(collections.filesModeration)
        .doc(pause.slice(PREFIXE_TACHE.length))
        .get();
      if (tache.exists && !['traitee', 'rejetee'].includes(tache.get('statut') as string)) continue;
      await p.ref.update({ pause: FieldValue.delete() });
    }
    const metier = (p.get('metiers') as string[])[0]!;
    const nom = s.nomMetier(metier)?.toLowerCase();
    const geo = p.get('geo') as DemandeProche['geo'] | undefined;
    if (!nom || !geo) continue;
    const envois = Object.fromEntries(
      Object.entries((p.get('envois') as Record<string, Timestamp> | undefined) ?? {}).map(
        ([k, v]) => [k, v.toMillis()],
      ),
    );
    const possibles = emailsProspect({
      creeLe: (p.get('createdAt') as Timestamp).toMillis(),
      maintenant,
      envois,
    });
    if (!parMetier.has(metier)) parMetier.set(metier, demandesRecentes(s.db, metier, maintenant));
    const proches = (await parMetier.get(metier)!)
      .map((d) => ({ ...d, km: Math.round(distanceKm(geo, d.geo)) }))
      .filter((d) => d.km <= RAYON_KM);
    const base = {
      metier: nom,
      ville: p.get('commune') as string,
      lien: `${s.urlSite}/pro?metier=${metier}#inscription`,
    };
    const veille = proches
      .filter((d) => d.km <= 15 && maintenant - d.le <= J)
      .sort((a, b) => a.km - b.km)[0];
    const mois = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      month: 'long',
    }).format(maintenant - J);
    const candidats: [string, Record<string, unknown>][] = [];
    if (possibles.includes('prospect-demande-zone') && veille) {
      if (!noms.has(veille.prestationId))
        noms.set(
          veille.prestationId,
          ((await s.db.doc(chemins.prestationItem(veille.prestationId)).get()).get('nom') as
            string | undefined) ?? 'Travaux',
        );
      candidats.push([
        'prospect-demande-zone',
        {
          ...base,
          ville: veille.ville,
          travaux: noms.get(veille.prestationId),
          budgetMinCentimes: veille.min,
          budgetMaxCentimes: veille.max,
          distanceKm: Math.max(1, veille.km),
          delai: libelleDelai(veille.delai),
        },
      ]);
    }
    if (possibles.includes('prospect-derniere'))
      candidats.push(['prospect-derniere', { ...base, signataire }]);
    if (possibles.includes('resume-zone-mensuel') && proches.length)
      candidats.push([
        'resume-zone-mensuel',
        {
          ...base,
          mois: `${mois[0]!.toUpperCase()}${mois.slice(1)}`,
          demandes: proches.length,
          budgetMoyenCentimes: Math.round(
            proches.reduce((n, d) => n + (d.min + d.max) / 2, 0) / proches.length,
          ),
        },
      ]);
    for (const [modele, contexte] of candidats) {
      const preparees = preparerDonnees(modele, contexte);
      if (!preparees.ok) continue;
      await s.notifier({
        modele: modele as NomModele,
        destinataire: { email: p.get('email') as string },
        refObjet: `${collections.prospects}/${p.id}/${modele}/${new Date(maintenant).toISOString().slice(0, 10)}`,
        donnees: preparees.donnees,
      });
      await p.ref.update({
        [`envois.${CLE_ENVOI[modele]}`]: Timestamp.fromMillis(maintenant),
        updatedAt: Timestamp.fromMillis(maintenant),
      });
      envoyes++;
      break;
    }
  }
  return { examines: prospects.size, envoyes };
}

/** Noms des métiers lus dans le référentiel (une lecture par passage de la tâche). */
export async function nomsMetiers(db: Firestore): Promise<(id: string) => string | undefined> {
  const r = await db.collection(chemins.metiersRecherche()).get();
  const noms = new Map(r.docs.map((d) => [d.id, d.get('nom') as string]));
  return (id) => noms.get(id);
}
