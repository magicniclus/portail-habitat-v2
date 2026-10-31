import {
  appliquerFeuilles,
  feuillesNumeriques,
  versionSuivante,
  type Feuille,
} from '@ph/core/admin';
import { ErreurMetier } from '@ph/core/erreurs';
import { FLAGS, type NomFlag } from '@ph/core/flags';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { auditerAdmin } from './audit';

/** Back-office › Référentiels (ADMIN §2.9, maquette « Admin Referentiels »). */

export interface PrestationAdmin {
  id: string;
  nom: string;
  famille: string;
  actif: boolean;
}

export async function listerPrestationsAdmin(db: Firestore): Promise<PrestationAdmin[]> {
  const r = await db.doc(chemins.prestationItem('_')).parent.orderBy('ordre').get();
  return r.docs.map((d) => ({
    id: d.id,
    nom: d.get('nom') as string,
    famille: (d.get('famille') as string | undefined) ?? '',
    actif: d.get('actif') === true,
  }));
}

export async function lirePrixPrestationAdmin(
  db: Firestore,
  id: string,
): Promise<{ version: string; feuilles: Feuille[] } | null> {
  const d = await db.doc(chemins.prestationPrix(id)).get();
  if (!d.exists) return null;
  return {
    version: d.get('version') as string,
    feuilles: feuillesNumeriques(d.get('parametres')),
  };
}

type Services = { db: Firestore; horloge: () => number };
const jour = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Prix privés d'une prestation : nombres modifiés sans changer leur forme, nouvelle version
 * (prix et fiche publique), ancienne valeur gardée dans `versions` ; seules les nouvelles
 * estimations sont concernées.
 */
export async function modifierPrixPrestationAdmin(
  s: Services,
  e: { acteurUid: string; id: string; modifs: Record<string, number>; motif: string },
): Promise<string> {
  const refPrix = s.db.doc(chemins.prestationPrix(e.id));
  const refItem = s.db.doc(chemins.prestationItem(e.id));
  const t0 = Timestamp.fromMillis(s.horloge());
  return s.db.runTransaction(async (t) => {
    const [prix, item] = await Promise.all([t.get(refPrix), t.get(refItem)]);
    if (!prix.exists || !item.exists) throw new ErreurMetier('INTROUVABLE');
    let parametres: Record<string, unknown>;
    try {
      parametres = appliquerFeuilles(prix.get('parametres') as Record<string, unknown>, e.modifs);
    } catch (err) {
      throw new ErreurMetier('ENTREE_INVALIDE', (err as Error).message);
    }
    const avant = prix.get('version') as string;
    const version = versionSuivante(avant, jour(s.horloge()));
    t.create(refPrix.collection('versions').doc(avant), { ...prix.data(), archiveeLe: t0 });
    t.update(refPrix, { parametres, version, updatedAt: t0 });
    t.update(refItem, { version, updatedAt: t0 });
    const anciens = Object.fromEntries(
      feuillesNumeriques(prix.get('parametres'))
        .filter((f) => f.chemin in e.modifs)
        .map((f) => [f.chemin, f.valeur]),
    );
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminMajReferentiel',
        cible: refPrix.path,
        avant: { version: avant, ...anciens },
        apres: { version, ...e.modifs },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
    return version;
  });
}

/** Retire une prestation du simulateur, ou la remet en ligne. */
export async function activerPrestationAdmin(
  s: Services,
  e: { acteurUid: string; id: string; actif: boolean; motif: string },
): Promise<void> {
  const ref = s.db.doc(chemins.prestationItem(e.id));
  const t0 = Timestamp.fromMillis(s.horloge());
  await s.db.runTransaction(async (t) => {
    const d = await t.get(ref);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE');
    t.update(ref, { actif: e.actif, updatedAt: t0 });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminMajReferentiel',
        cible: ref.path,
        avant: { actif: d.get('actif') },
        apres: { actif: e.actif },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
  });
}

/** Feature flags globaux (`config/flags`, EXPLOITATION §4) : valeur forcée ou défaut. */
export async function lireFlagsAdmin(db: Firestore) {
  const d = await db.doc(chemins.configFlags()).get();
  const valeurs = (d.get('valeurs') as Record<string, boolean> | undefined) ?? {};
  return (Object.keys(FLAGS) as NomFlag[]).map((nom) => ({
    nom,
    description: FLAGS[nom].description,
    defaut: FLAGS[nom].defaut,
    valeur: valeurs[nom] ?? FLAGS[nom].defaut,
  }));
}

export async function changerFlagAdmin(
  s: Services,
  e: { acteurUid: string; nom: NomFlag; valeur: boolean; motif: string },
): Promise<void> {
  const ref = s.db.doc(chemins.configFlags());
  const t0 = Timestamp.fromMillis(s.horloge());
  await s.db.runTransaction(async (t) => {
    const d = await t.get(ref);
    const valeurs = {
      ...((d.get('valeurs') as Record<string, boolean> | undefined) ?? {}),
      [e.nom]: e.valeur,
    };
    t.set(ref, { schemaVersion: 1, valeurs, updatedAt: t0 }, { merge: true });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminChangerFlag',
        cible: ref.path,
        avant: {
          [e.nom]: (d.get(`valeurs.${e.nom}`) as boolean | undefined) ?? FLAGS[e.nom].defaut,
        },
        apres: { [e.nom]: e.valeur },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
  });
}
