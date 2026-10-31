import { SEQUENCES_DEFAUT, type EtapeSequence } from '@ph/core/conversion';
import { ErreurMetier } from '@ph/core/erreurs';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { lireConfigCycle, tracer, type ConfigCycleLue } from '../cycle/moteur';
import { auditerAdmin } from './audit';

/**
 * Back-office › Conversion (ADMIN §2.8b, CONVERSION §9) : séquences créées, modifiées, mises en
 * pause et supprimées sans déploiement ; chaque enregistrement crée une version et un audit.
 */

type Services = { db: Firestore; horloge: () => number };

export interface SaisieSequence {
  id?: string;
  nom: string;
  etapeEntree: string;
  objectif: string;
  actif: boolean;
  etapes: EtapeSequence[];
}

/** Identifiant libre suivant (S10, S11…). */
async function nouvelIdSequence(db: Firestore): Promise<string> {
  const pris = new Set([
    ...Object.keys(SEQUENCES_DEFAUT),
    ...(await db.collection(collections.sequences).select().get()).docs.map((d) => d.id),
  ]);
  let n = 1;
  while (pris.has(`S${n}`)) n++;
  return `S${n}`;
}

/** `adminSequenceCreer` / `adminSequenceModifier` : nouvelle version, l'ancienne archivée. */
export async function enregistrerSequenceAdmin(
  s: Services,
  e: { acteurUid: string; sequence: SaisieSequence; motif: string },
): Promise<{ id: string; version: number }> {
  const id = e.sequence.id ?? (await nouvelIdSequence(s.db));
  const ref = s.db.collection(collections.sequences).doc(id);
  const t0 = Timestamp.fromMillis(s.horloge());
  return s.db.runTransaction(async (t) => {
    const avant = await t.get(ref);
    if (avant.get('supprimee') === true) throw new ErreurMetier('INTROUVABLE');
    if (!e.sequence.id && avant.exists) throw new ErreurMetier('CONFLIT');
    const version = ((avant.get('version') as number | undefined) ?? 0) + 1;
    const doc = {
      schemaVersion: 1,
      nom: e.sequence.nom,
      etapeEntree: e.sequence.etapeEntree,
      objectif: e.sequence.objectif,
      actif: e.sequence.actif,
      etapes: e.sequence.etapes.map((x) => ({
        modele: x.modele,
        declencheur: x.declencheur,
        ...(x.valeur !== undefined ? { valeur: x.valeur } : {}),
        ...(x.ab?.length ? { ab: x.ab } : {}),
      })),
      version,
      modifiePar: e.acteurUid,
      supprimee: false,
      createdAt: avant.exists ? avant.get('createdAt') : t0,
      updatedAt: t0,
    };
    t.set(ref, doc);
    t.set(s.db.collection(chemins.versionsSequence(id)).doc(String(version)), {
      ...doc,
      motif: e.motif,
    });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action:
          avant.exists || SEQUENCES_DEFAUT[id] ? 'adminSequenceModifier' : 'adminSequenceCreer',
        cible: ref.path,
        avant: avant.exists ? { version: avant.get('version'), actif: avant.get('actif') } : null,
        apres: { version, actif: e.sequence.actif, etapes: doc.etapes.length },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
    return { id, version };
  });
}

/** Séquence telle que l'admin la voit : document, ou séquence par défaut. */
async function lireSaisie(db: Firestore, id: string): Promise<SaisieSequence> {
  const d = await db.collection(collections.sequences).doc(id).get();
  if (d.exists && d.get('supprimee') !== true)
    return {
      id,
      nom: d.get('nom') as string,
      etapeEntree: d.get('etapeEntree') as string,
      objectif: d.get('objectif') as string,
      actif: d.get('actif') === true,
      etapes: d.get('etapes') as EtapeSequence[],
    };
  const defaut = SEQUENCES_DEFAUT[id];
  if (!defaut || d.exists) throw new ErreurMetier('INTROUVABLE');
  return { id, ...defaut, actif: true };
}

/** Pause ou reprise : les entreprises en cours repassent chaque jour, rien n'est perdu. */
export async function basculerSequenceAdmin(
  s: Services,
  e: { acteurUid: string; id: string; actif: boolean; motif: string },
) {
  const saisie = await lireSaisie(s.db, e.id);
  return enregistrerSequenceAdmin(s, {
    acteurUid: e.acteurUid,
    sequence: { ...saisie, actif: e.actif },
    motif: e.motif,
  });
}

/** Copie en pause, sous un nouvel identifiant. */
export async function dupliquerSequenceAdmin(
  s: Services,
  e: { acteurUid: string; id: string; motif: string },
) {
  const { id: _, ...saisie } = await lireSaisie(s.db, e.id);
  return enregistrerSequenceAdmin(s, {
    acteurUid: e.acteurUid,
    sequence: { ...saisie, nom: `${saisie.nom} (copie)`, actif: false },
    motif: e.motif,
  });
}

/**
 * `adminSequenceSupprimer` : séquence marquée supprimée (versions et traces gardées) ; les
 * entreprises en cours s'arrêtent ou basculent vers une autre séquence.
 */
export async function supprimerSequenceAdmin(
  s: Services,
  e: {
    acteurUid: string;
    id: string;
    devenir: 'arret' | 'bascule';
    versSequence?: string;
    motif: string;
  },
): Promise<{ deplacees: number }> {
  const saisie = await lireSaisie(s.db, e.id);
  if (e.devenir === 'bascule') await lireSaisie(s.db, e.versSequence!);
  const maintenant = s.horloge();
  const t0 = Timestamp.fromMillis(maintenant);
  const ref = s.db.collection(collections.sequences).doc(e.id);
  await s.db.runTransaction(async (t) => {
    const avant = await t.get(ref);
    t.set(
      ref,
      {
        schemaVersion: 1,
        ...saisie,
        actif: false,
        supprimee: true,
        motifSuppression: e.motif,
        version: ((avant.get('version') as number | undefined) ?? 0) + 1,
        modifiePar: e.acteurUid,
        createdAt: avant.exists ? avant.get('createdAt') : t0,
        updatedAt: t0,
      },
      { merge: false },
    );
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminSequenceSupprimer',
        cible: ref.path,
        avant: { actif: saisie.actif },
        apres: { supprimee: true, devenir: e.devenir, versSequence: e.versSequence ?? null },
        motif: e.motif,
      },
      maintenant,
      t,
    );
  });
  const enCours = await s.db
    .collection(collections.cycleEtat)
    .where('sequence.id', '==', e.id)
    .get();
  for (let i = 0; i < enCours.size; i += 400) {
    const lot = s.db.batch();
    for (const d of enCours.docs.slice(i, i + 400))
      lot.update(d.ref, {
        sequence:
          e.devenir === 'bascule' ? { id: e.versSequence, etape: 0, prochainEnvoi: t0 } : null,
        depuis: t0,
        updatedAt: t0,
      });
    await lot.commit();
  }
  return { deplacees: enCours.size };
}

export type ActionCycle =
  | { action: 'pause' | 'reprendre' | 'exclure' | 'inclure' }
  | { action: 'forcer'; sequenceId: string };

/** Fiche cycle : pause de la séquence, exclusion des emails commerciaux, ou étape forcée. */
export async function agirSurCycleAdmin(
  s: Services,
  e: { acteurUid: string; artisanId: string; motif: string } & ActionCycle,
): Promise<void> {
  const maintenant = s.horloge();
  const t0 = Timestamp.fromMillis(maintenant);
  const sequenceId = e.action === 'forcer' ? e.sequenceId : undefined;
  if (sequenceId) await lireSaisie(s.db, sequenceId);
  const ref = s.db.collection(collections.cycleEtat).doc(e.artisanId);
  await s.db.runTransaction(async (t) => {
    const etat = await t.get(ref);
    if (!etat.exists) throw new ErreurMetier('INTROUVABLE');
    const maj =
      e.action === 'pause'
        ? { pause: { par: e.acteurUid, depuis: t0, motif: e.motif } }
        : e.action === 'reprendre'
          ? { pause: FieldValue.delete() }
          : e.action === 'exclure'
            ? { exclu: true }
            : e.action === 'inclure'
              ? { exclu: false }
              : { sequence: { id: sequenceId, etape: 0, prochainEnvoi: t0 }, depuis: t0 };
    t.update(ref, { ...maj, updatedAt: t0 });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminCycleAction',
        cible: ref.path,
        avant: {
          pause: etat.get('pause') ? true : false,
          exclu: etat.get('exclu') === true,
          sequence: (etat.get('sequence.id') as string | undefined) ?? null,
        },
        apres: { action: e.action, ...(sequenceId ? { sequence: sequenceId } : {}) },
        motif: e.motif,
      },
      maintenant,
      t,
    );
  });
  await tracer(s.db, maintenant, {
    artisanId: e.artisanId,
    type: 'action_admin',
    fonction: 'adminCycleAction',
    details: { action: e.action, ...(sequenceId ? { sequence: sequenceId } : {}) },
  });
}

/** Réglages (`config/cycle`) : interrupteur, pression, seuil Premium, témoin, signataire. */
export async function enregistrerReglagesCycleAdmin(
  s: Services,
  e: { acteurUid: string; reglages: ConfigCycleLue; motif: string },
): Promise<void> {
  const ref = s.db.doc(chemins.configCycle());
  const avant = await lireConfigCycle(s.db);
  const t0 = Timestamp.fromMillis(s.horloge());
  await s.db.runTransaction(async (t) => {
    t.set(ref, { schemaVersion: 1, ...e.reglages, updatedAt: t0 }, { merge: true });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminReglagesCycle',
        cible: ref.path,
        avant,
        apres: e.reglages,
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
  });
}
