import { gunzipSync } from 'node:zlib';
import type { Agregat, AppareilAgrege } from '@ph/core/comportement';
import { ErreurMetier } from '@ph/core/erreurs';
import type { Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { auditerAdmin } from './audit';

/** Back-office › Comportement (COMPORTEMENT §6) : une lecture d'agrégat par affichage. */
export type PeriodeComportement = '7j' | '30j' | '90j';

export interface VueComportement extends Agregat {
  jusquAu: string;
  sorties: { section: string; part: number }[];
}

/** Cumul prêt à afficher (`{page}_{période}_{appareil}`) : une seule lecture Firestore (CMP-03). */
export async function lireVueComportement(
  db: Firestore,
  f: { page: string; appareil: AppareilAgrege; periode: PeriodeComportement },
): Promise<VueComportement | null> {
  const d = (
    await db
      .collection(collections.comportementAgregats)
      .doc(`${f.page}_${f.periode}_${f.appareil}`)
      .get()
  ).data();
  if (!d) return null;
  const carte = (v: unknown) =>
    JSON.parse(typeof v === 'string' ? v : '{}') as Record<string, number>;
  return {
    ...(d as VueComportement),
    grilleClics: carte(d.grilleClics),
    grilleAttention: carte(d.grilleAttention),
    grilleMouvements: carte(d.grilleMouvements),
  };
}

export interface AlerteLue {
  id: string;
  type: string;
  element?: string;
  gravite: number;
  valeur: number;
  reference: number;
}

/** Alertes ouvertes d'une page, de la plus grave à la moins grave. */
export async function lireAlertesComportement(db: Firestore, page: string): Promise<AlerteLue[]> {
  const r = await db
    .collection(collections.comportementAlertes)
    .where('page', '==', page)
    .where('statut', '==', 'ouverte')
    .orderBy('gravite', 'desc')
    .limit(20)
    .get();
  return r.docs.map((d) => ({
    id: d.id,
    type: d.get('type') as string,
    ...(d.get('element') ? { element: d.get('element') as string } : {}),
    gravite: d.get('gravite') as number,
    valeur: d.get('valeur') as number,
    reference: d.get('reference') as number,
  }));
}

export interface ReplayListe {
  vueId: string;
  appareil: string;
  duree: number;
  source: string;
  issue: 'conversion' | 'rage' | 'abandon' | 'sortie';
  createdAt: number;
}

/** 30 derniers replays d'une page pour un appareil (rien du contenu : la lecture est à part). */
export async function listerReplays(
  db: Firestore,
  page: string,
  appareil: AppareilAgrege,
): Promise<ReplayListe[]> {
  const r = await db
    .collection(collections.comportementSessions)
    .where('page', '==', page)
    .where('aReplay', '==', true)
    .orderBy('createdAt', 'desc')
    .limit(60)
    .get();
  return r.docs
    .filter((d) => appareil === 'tous' || d.get('appareil') === appareil)
    .slice(0, 30)
    .map((d) => ({
      vueId: d.id,
      appareil: d.get('appareil') as string,
      duree: d.get('duree') as number,
      source: d.get('source') as string,
      issue: d.get('conversion')
        ? 'conversion'
        : (d.get('rages') as string[]).length
          ? 'rage'
          : d.get('abandon')
            ? 'abandon'
            : 'sortie',
      createdAt: (d.get('createdAt') as { toMillis(): number }).toMillis(),
    }));
}

export interface ReplayLu {
  appareil: string;
  largeur: number;
  hauteur: number;
  evenements: [number, number, number, number][];
}

/** Lecture d'un replay : permission `comportement.replays`, chaque lecture est journalisée. */
export async function lireReplay(
  s: { db: Firestore; horloge: () => number; telecharger: (chemin: string) => Promise<Buffer> },
  e: { acteurUid: string; vueId: string },
): Promise<ReplayLu> {
  const chemin = (await s.db.collection(collections.comportementSessions).doc(e.vueId).get()).get(
    'replayPath',
  ) as string | undefined;
  if (!chemin) throw new ErreurMetier('INTROUVABLE');
  const contenu = JSON.parse(gunzipSync(await s.telecharger(chemin)).toString()) as ReplayLu;
  await auditerAdmin(
    s.db,
    {
      acteurUid: e.acteurUid,
      action: 'adminLectureReplay',
      cible: `${collections.comportementSessions}/${e.vueId}`,
    },
    s.horloge(),
  );
  return {
    appareil: contenu.appareil,
    largeur: contenu.largeur,
    hauteur: contenu.hauteur,
    evenements: contenu.evenements,
  };
}

/** Alerte traitée, ignorée ou rouverte (audit avant / après). */
export async function changerStatutAlerte(
  s: { db: Firestore; horloge: () => number },
  e: { acteurUid: string; alerteId: string; statut: 'ouverte' | 'traitee' | 'ignoree' },
): Promise<void> {
  const ref = s.db.collection(collections.comportementAlertes).doc(e.alerteId);
  await s.db.runTransaction(async (t) => {
    const avant = await t.get(ref);
    if (!avant.exists) throw new ErreurMetier('INTROUVABLE');
    t.update(ref, { statut: e.statut });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminStatutAlerteComportement',
        cible: `${collections.comportementAlertes}/${e.alerteId}`,
        avant: { statut: avant.get('statut') as string },
        apres: { statut: e.statut },
      },
      s.horloge(),
      t,
    );
  });
}
