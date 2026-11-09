import { appAdmin } from '@ph/firebase/admin';
import { listerIdeesStudio, listerProjetsStudio, lireThemesStudio } from '@ph/firebase/studio';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { SessionTournage } from '@/features/studio/SessionTournage';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Studio · tournage' };
/** Les idées d'une session viennent de Claude : plusieurs minutes possibles. */
export const maxDuration = 300;

/**
 * Studio › Tournage : préparer une session (idées de Claude d'un coup, ou idées gardées) puis
 * tourner les vidéos à la suite, face caméra, le script en prompteur.
 */
export default async function TournageStudio() {
  const session = await pageAdmin('/admin/studio/tournage', 'studio');
  const db = getFirestore(appAdmin());
  const [projets, idees, themes] = await Promise.all([
    listerProjetsStudio(db),
    listerIdeesStudio(db),
    lireThemesStudio(db, session.uid),
  ]);
  const aTourner = projets
    .filter((p) => p.statut === 'enregistrement' && !p.prise && (p.sujet?.script.length ?? 0) > 0)
    .map((p) => ({ id: p.id, titre: p.titre, script: p.sujet!.script }));
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="m-0 text-xl">Session de tournage</h1>
        <p className="m-0 mt-1 text-neutre-700">
          Tournez plusieurs vidéos d’affilée : Claude les monte pendant que vous enchaînez.
        </p>
      </div>
      <SessionTournage aTourner={aTourner} idees={idees} themes={themes} />
    </div>
  );
}
