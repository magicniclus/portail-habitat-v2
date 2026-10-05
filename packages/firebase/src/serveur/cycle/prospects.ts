import { preparerDonnees } from '@ph/core/conversion';
import { ErreurMetier } from '@ph/core/erreurs';
import { encoderGeohash } from '@ph/core/geo';
import { distanceKm } from '@ph/core/matching';
import { TEXTE_CONSENTEMENT_PROSPECT } from '@ph/core/schemas';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import type { Notifier } from '../comptes/services';
import type { Geocodeur } from '../demandes/geocodage';
import { empreinteEmail } from '../notifications/notifier';

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
  e: { email: string; metier: string; codePostal: string },
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
      source: 'estimation',
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
