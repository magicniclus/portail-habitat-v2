import { ErreurMetier } from '@ph/core/erreurs';
import { documentDepuisConfig, type ConfigMatchingComplete } from '@ph/core/matching';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { classerDemande } from '../matching/attribuer';
import { lireConfigMatching } from '../matching/reglages';
import { auditerAdmin } from './audit';

/** Back-office › Algorithme (ADMIN §2.10, maquette « Admin Algorithme »). */

export interface VersionAlgorithme {
  version: number;
  motif: string;
  par: string;
  le: number;
}

export async function lireAlgorithmeAdmin(
  db: Firestore,
): Promise<{ config: ConfigMatchingComplete; versions: VersionAlgorithme[] }> {
  const [config, versions] = await Promise.all([
    lireConfigMatching(db),
    db.collection(chemins.versionsMatching()).orderBy('version', 'desc').limit(10).get(),
  ]);
  return {
    config,
    versions: versions.docs.map((v) => ({
      version: v.get('version') as number,
      motif: (v.get('motif') as string | undefined) ?? '',
      par: v.get('modifiePar') as string,
      le: (v.get('updatedAt') as Timestamp).toMillis(),
    })),
  };
}

/** `adminMajMatchingConfig` : nouvelle version active, l'ancienne gardée dans `versions`. */
export async function publierConfigMatchingAdmin(
  s: { db: Firestore; horloge: () => number },
  e: { acteurUid: string; config: ConfigMatchingComplete; motif: string },
): Promise<number> {
  const ref = s.db.doc(chemins.configMatching());
  const t0 = Timestamp.fromMillis(s.horloge());
  const actuelle = await lireConfigMatching(s.db);
  return s.db.runTransaction(async (t) => {
    const d = await t.get(ref);
    const version = Math.max((d.get('version') as number | undefined) ?? 0, actuelle.version) + 1;
    const doc = {
      schemaVersion: 1,
      ...documentDepuisConfig({ ...e.config, version }),
      motif: e.motif,
      modifiePar: e.acteurUid,
      updatedAt: t0,
    };
    t.set(ref, doc);
    t.set(s.db.collection(chemins.versionsMatching()).doc(String(version)), doc);
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminMajMatchingConfig',
        cible: ref.path,
        avant: { version: actuelle.version },
        apres: { version },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
    return version;
  });
}

export interface ComparaisonClassement {
  reference: string;
  lignes: {
    artisanId: string;
    nom: string;
    avant: number | null;
    apres: number | null;
    scoreAvant: number;
    scoreApres: number;
  }[];
}

/** Bac à sable : rejoue une demande passée avec la configuration en vigueur et la nouvelle. */
export async function rejouerDemandeAdmin(
  s: { db: Firestore; horloge: () => number },
  e: { reference: string; config: ConfigMatchingComplete },
): Promise<ComparaisonClassement> {
  const r = await s.db
    .collection(collections.demandes)
    .where('reference', '==', e.reference)
    .limit(1)
    .get();
  const demande = r.docs[0];
  if (!demande) throw new ErreurMetier('INTROUVABLE', 'Aucune demande avec cette référence.');
  const sans = async () => undefined;
  const [avant, apres] = await Promise.all([
    classerDemande({ ...s, notifier: sans, config: await lireConfigMatching(s.db) }, demande.id),
    classerDemande({ ...s, notifier: sans, config: e.config }, demande.id),
  ]);
  const rang = (l: typeof avant, id: string) => {
    const i = l.filter((c) => !c.exclu).findIndex((c) => c.artisanId === id);
    return i < 0 ? null : i + 1;
  };
  const ids = [
    ...new Set([...avant, ...apres].filter((c) => !c.exclu).map((c) => c.artisanId)),
  ].slice(0, 10);
  const artisans = ids.length
    ? await s.db.getAll(...ids.map((id) => s.db.doc(chemins.artisan(id))))
    : [];
  const score = (l: typeof avant, id: string) => l.find((c) => c.artisanId === id)?.score ?? 0;
  return {
    reference: e.reference,
    lignes: artisans
      .map((a) => ({
        artisanId: a.id,
        nom: (a.get('nomCommercial') as string | undefined) ?? a.id,
        avant: rang(avant, a.id),
        apres: rang(apres, a.id),
        scoreAvant: score(avant, a.id),
        scoreApres: score(apres, a.id),
      }))
      .sort((x, y) => (x.apres ?? 99) - (y.apres ?? 99)),
  };
}
