import { gzipSync } from 'node:zlib';
import {
  DUREE_SESSION_JOURS,
  PAGES_SUIVIES,
  REPLAYS_MAX_JOUR,
  visiteRetenue,
} from '@ph/core/comportement';
import type { RegleDebit } from '@ph/core/enveloppe';
import { jourIso } from '@ph/core/format';
import type { ResumeVisite } from '@ph/core/schemas';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections, fichiers } from '../../chemins';

/** Enregistrement des résumés de visite reçus par `/api/t` (COMPORTEMENT §3). */
export interface ServicesComportement {
  db: Firestore;
  horloge: () => number;
  /** Dépose un replay compressé (bucket `REPLAYS_BUCKET`, cycle de vie 30 jours). */
  deposerReplay: (chemin: string, contenu: Buffer) => Promise<void>;
  limiterDebit: (regle: RegleDebit, identifiant: string) => Promise<boolean>;
}

export interface ConfigComportementLue {
  actif: boolean;
  echantillon: number;
}

const J = 86_400_000;
const REGLE_REPLAYS: RegleDebit = { cle: 'replays', max: REPLAYS_MAX_JOUR, fenetre: '1j' };

/** `config/comportement` : absente, la mesure est active sur toutes les visites consenties. */
export async function lireConfigComportement(db: Firestore): Promise<ConfigComportementLue> {
  const d = (await db.doc(chemins.configComportement()).get()).data() as
    Partial<ConfigComportementLue> | undefined;
  return { actif: d?.actif ?? true, echantillon: d?.echantillon ?? 1 };
}

export type IssueVisite = 'enregistree' | 'ignoree';

export async function enregistrerVisite(
  s: ServicesComportement,
  e: ResumeVisite,
  config: ConfigComportementLue,
): Promise<IssueVisite> {
  if (PAGES_SUIVIES[e.page as keyof typeof PAGES_SUIVIES] !== e.app) return 'ignoree';
  if (!config.actif || !visiteRetenue(e.sessionId, config.echantillon)) return 'ignoree';
  const maintenant = s.horloge();
  const jour = jourIso(maintenant);
  const ref = s.db.collection(collections.comportementSessions).doc(e.vueId);
  const { v: _v, vueId: _id, replay, ...resume } = e;

  let replayPath: string | undefined;
  if (replay) {
    // Un envoi de secours puis l'envoi final : le replay garde son emplacement et son quota.
    const existant = (await ref.get()).data() as { replayPath?: string } | undefined;
    replayPath = existant?.replayPath;
    if (!replayPath && (await s.limiterDebit(REGLE_REPLAYS, 'global')))
      replayPath = fichiers.replay(e.page, jour, e.vueId);
    if (replayPath) {
      const contenu = {
        v: 1,
        appareil: e.appareil,
        largeur: e.largeur,
        hauteur: e.hauteur,
        evenements: replay,
      };
      await s.deposerReplay(replayPath, gzipSync(JSON.stringify(contenu)));
    }
  }

  await ref.set({
    schemaVersion: 1,
    ...resume,
    ...(replayPath ? { replayPath, aReplay: true } : {}),
    jour,
    createdAt: Timestamp.fromMillis(maintenant),
    expireLe: Timestamp.fromMillis(maintenant + DUREE_SESSION_JOURS * J),
  });
  return 'enregistree';
}
