import { libelleDelai } from '@ph/core/demandes';
import { textePublicationFacebook } from '@ph/core/conversion';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { auditerAdmin } from './audit';

/** Back-office › Appels d'offres › Facebook et invendues (CONVERSION §3 bis et ter, CONV-08). */

const J = 86_400_000;

async function nomsPrestations(db: Firestore, ids: string[]) {
  const uniques = [...new Set(ids)];
  if (!uniques.length) return new Map<string, string>();
  const docs = await db.getAll(...uniques.map((id) => db.doc(chemins.prestationItem(id))));
  return new Map(docs.map((d) => [d.id, (d.get('nom') as string | undefined) ?? 'Travaux']));
}

export interface PublicationFacebook {
  departements: { code: string; demandes: number }[];
  departement: string | null;
  texte: string | null;
  derniere: number | null;
}

/** Texte du jour : demandes des dernières 24 h du département choisi (le plus fourni par défaut). */
export async function lirePublicationFacebook(
  db: Firestore,
  maintenant: number,
  departement?: string,
): Promise<PublicationFacebook> {
  const [r, publications] = await Promise.all([
    db
      .collection(collections.demandes)
      .where('createdAt', '>=', Timestamp.fromMillis(maintenant - J))
      .limit(300)
      .get(),
    db.collection(collections.auditLog).where('action', '==', 'adminPublicationFacebook').get(),
  ]);
  const demandes = r.docs.filter(
    (d) => d.get('douteux') !== true && d.get('adresseChantier.codePostal'),
  );
  const parDep = new Map<string, number>();
  for (const d of demandes) {
    const code = String(d.get('adresseChantier.codePostal')).slice(0, 2);
    parDep.set(code, (parDep.get(code) ?? 0) + 1);
  }
  const departements = [...parDep]
    .map(([code, n]) => ({ code, demandes: n }))
    .sort((a, b) => b.demandes - a.demandes || a.code.localeCompare(b.code));
  const choisi =
    departement && parDep.has(departement) ? departement : (departements[0]?.code ?? null);
  const retenues = demandes.filter(
    (d) => String(d.get('adresseChantier.codePostal')).slice(0, 2) === choisi,
  );
  const noms = await nomsPrestations(
    db,
    retenues.map((d) => d.get('prestationId') as string),
  );
  const texte = choisi
    ? textePublicationFacebook(
        retenues.map((d) => ({
          travaux: noms.get(d.get('prestationId') as string) ?? 'Travaux',
          ville: d.get('adresseChantier.ville') as string,
          minCentimes: d.get('estimation.minCentimes') as number,
          maxCentimes: d.get('estimation.maxCentimes') as number,
          delai: libelleDelai(d.get('delaiSouhaite') as string),
        })),
        { zone: `département ${choisi}`, date: maintenant },
      )
    : null;
  const dates = publications.docs.map((d) => (d.get('createdAt') as Timestamp).toMillis());
  return {
    departements,
    departement: choisi,
    texte,
    derniere: dates.length ? Math.max(...dates) : null,
  };
}

/** « Marquer comme publiée » : trace d'audit, les inscriptions du jour lui sont rattachées. */
export async function marquerPublicationFacebook(
  s: { db: Firestore; horloge: () => number },
  e: { acteurUid: string; departement: string },
): Promise<void> {
  const jour = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(s.horloge());
  await auditerAdmin(
    s.db,
    {
      acteurUid: e.acteurUid,
      action: 'adminPublicationFacebook',
      cible: `facebook/${jour}`,
      apres: { departement: e.departement },
    },
    s.horloge(),
  );
}

export interface ResultatsFacebook {
  prospects: number;
  demandesOffertes: number;
  demandesOffertesRecues: number;
  offertes: {
    appelOffresId: string;
    projet: string;
    lieu: string;
    proposees: number;
    recues: number;
  }[];
}

/** Résultats sur 30 jours et demandes invendues offertes de la semaine. */
export async function lireResultatsFacebook(
  db: Firestore,
  maintenant: number,
): Promise<ResultatsFacebook> {
  const depuis = Timestamp.fromMillis(maintenant - 30 * J);
  const traces = (type: string) =>
    db
      .collection(collections.cycleTraces)
      .where('type', '==', type)
      .where('createdAt', '>=', depuis)
      .count()
      .get();
  const [prospects, offertes, recues, aos] = await Promise.all([
    db
      .collection(collections.prospects)
      .where('source', '==', 'facebook')
      .where('createdAt', '>=', depuis)
      .count()
      .get(),
    traces('demande_offerte'),
    traces('demande_offerte_convertie'),
    db
      .collection(collections.appelsOffres)
      .where('offerteLe', '>=', Timestamp.fromMillis(maintenant - 7 * J))
      .get(),
  ]);
  const demandes = aos.empty
    ? []
    : await db.getAll(
        ...aos.docs.map((a) => db.doc(chemins.demande(a.get('demandeId') as string))),
      );
  const noms = await nomsPrestations(
    db,
    demandes.filter((d) => d.exists).map((d) => d.get('prestationId') as string),
  );
  return {
    prospects: prospects.data().count,
    demandesOffertes: offertes.data().count,
    demandesOffertesRecues: recues.data().count,
    offertes: aos.docs.map((a, i) => ({
      appelOffresId: a.id,
      projet: noms.get(demandes[i]?.get('prestationId') as string) ?? 'Travaux',
      lieu: (demandes[i]?.get('adresseChantier.ville') as string | undefined) ?? '—',
      proposees: ((a.get('offerteA') as string[] | undefined) ?? []).length,
      recues: (a.get('nbDeblocages') as number | undefined) ?? 0,
    })),
  };
}
