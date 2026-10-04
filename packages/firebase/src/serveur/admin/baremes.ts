import { simulerBareme, type LeadSimule, type SimulationBareme } from '@ph/core/admin';
import { GRILLE_DEFAUT, type Bareme, type CaracteristiquesLead } from '@ph/core/leads';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { lireBaremeActif, type BaremeLu } from '../matching/bareme';
import { lireReferentielMetiers } from '../matching/lecture';
import { auditerAdmin } from './audit';

/** Back-office › Barèmes (ADMIN §2.5) : versions, simulation sur les 50 derniers leads (ADM-05). */

export interface VersionBareme {
  id: string;
  version: number;
  actif: boolean;
  modifiePar: string;
  le: number;
}

export async function lireBaremesAdmin(
  db: Firestore,
): Promise<{ actif: BaremeLu; versions: VersionBareme[] }> {
  const [actif, r] = await Promise.all([
    lireBaremeActif(db),
    db.collection(collections.grillesTarifaires).orderBy('version', 'desc').limit(20).get(),
  ]);
  return {
    actif,
    versions: r.docs.map((d) => ({
      id: d.id,
      version: d.get('version') as number,
      actif: d.get('actif') === true,
      modifiePar: d.get('modifiePar') as string,
      le: (d.get('createdAt') as Timestamp).toMillis(),
    })),
  };
}

const NB_LEADS_SIMULES = 50;

/** Caractéristiques des 50 derniers appels d'offres, prix recalculé avec l'ancien et le nouveau barème. */
export async function simulerBaremeAdmin(
  db: Firestore,
  nouveau: Bareme,
  maintenant: number,
): Promise<SimulationBareme> {
  const [actif, ref, r] = await Promise.all([
    lireBaremeActif(db),
    lireReferentielMetiers(db, maintenant),
    db
      .collection(collections.appelsOffres)
      .orderBy('ouvertLe', 'desc')
      .limit(NB_LEADS_SIMULES)
      .get(),
  ]);
  const demandes = r.size
    ? await db.getAll(...r.docs.map((a) => db.doc(chemins.demande(a.get('demandeId') as string))))
    : [];
  const leads: LeadSimule[] = r.docs.map((a, i) => {
    const d = demandes[i];
    const metier = a.get('metier') as string;
    const famille = ref.metiers.find((m) => m.id === metier)?.famille;
    const niveau = d?.get('qualification.niveau') as CaracteristiquesLead['niveau'] | undefined;
    const aides = d?.get('aides.eligibilite') as
      CaracteristiquesLead['eligibiliteAides'] | undefined;
    return {
      id: a.id,
      titre: a.get('titre') as string,
      caracteristiques: {
        metier,
        ...(famille ? { famille } : {}),
        trancheBudget: a.get('trancheBudget') as CaracteristiquesLead['trancheBudget'],
        urgence: a.get('urgence') as CaracteristiquesLead['urgence'],
        qualiteLead: a.get('qualiteLead') as number,
        nbEligibles: ((a.get('artisansInvites') as string[] | undefined) ?? []).length,
        ...(niveau ? { niveau } : {}),
        ...(aides ? { eligibiliteAides: aides } : {}),
      },
    };
  });
  // Appels d'offres sans caractéristiques complètes (créés à la main) : écartés de la simulation.
  const complets = leads.filter(
    (l) =>
      l.caracteristiques.trancheBudget in actif.bareme.coefBudget &&
      l.caracteristiques.urgence in actif.bareme.coefUrgence &&
      typeof l.caracteristiques.qualiteLead === 'number',
  );
  return simulerBareme(complets, actif.bareme, nouveau);
}

/**
 * `adminMajBareme` : nouvelle version active (`grillesTarifaires/{grille}-vN`), l'ancienne reste
 * consultable et inactive. Les appels d'offres déjà publiés gardent leur prix.
 */
export async function publierBaremeAdmin(
  s: { db: Firestore; horloge: () => number },
  e: { acteurUid: string; bareme: Bareme; motif: string },
): Promise<string> {
  const t0 = Timestamp.fromMillis(s.horloge());
  return s.db.runTransaction(async (t) => {
    const actifs = await t.get(
      s.db.collection(collections.grillesTarifaires).where('actif', '==', true),
    );
    const derniere = await t.get(
      s.db.collection(collections.grillesTarifaires).orderBy('version', 'desc').limit(1),
    );
    const version = ((derniere.docs[0]?.get('version') as number | undefined) ?? 0) + 1;
    const id = `${GRILLE_DEFAUT}-v${version}`;
    for (const a of actifs.docs) t.update(a.ref, { actif: false, updatedAt: t0 });
    t.create(s.db.doc(chemins.grilleTarifaire(id)), {
      schemaVersion: 1,
      createdAt: t0,
      updatedAt: t0,
      nom: `Barème Gironde, version ${version}`,
      actif: true,
      zone: { departements: ['33'] },
      ...e.bareme,
      version,
      modifiePar: e.acteurUid,
    });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminMajBareme',
        cible: chemins.grilleTarifaire(id),
        avant: { actif: actifs.docs.map((a) => a.id) },
        apres: { id, version },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
    return id;
  });
}
