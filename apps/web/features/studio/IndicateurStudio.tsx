'use client';

import { estEtapeSuivie, LIBELLES_STATUT_STUDIO, type StatutProjetStudio } from '@ph/core/studio';
import { requeteProjetsStudioRecents } from '@ph/firebase/client';
import type { VideoEnCours } from '@ph/firebase/studio';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authClient, firestoreClient } from '@/lib/firebaseClient';
import { routes } from '@/lib/routes';

const idsEnCours = (l: readonly VideoEnCours[]) =>
  l.filter((v) => estEtapeSuivie(v.statut)).map((v) => v.id);

/**
 * Pastille « Vidéo en création » en bas à droite de tout le back-office : on peut naviguer
 * pendant le montage. Écoute en direct des projets Studio (sans session Firebase dans le
 * navigateur : page relue toutes les 30 s tant qu'une vidéo est en fabrication). Quand une
 * vidéo se termine sous nos yeux, la pastille l'annonce (« prête » ou « à relancer »).
 */
export function IndicateurStudio({ initial }: { initial: VideoEnCours[] }) {
  const router = useRouter();
  const chemin = usePathname();
  // En direct : la liste écoutée ; sinon celle du serveur (relue avec la page).
  const [ecoutees, setEcoutees] = useState<VideoEnCours[] | null>(null);
  const videos = ecoutees ?? initial;
  const direct = ecoutees !== null;
  const [ecartees, setEcartees] = useState<string[]>([]);
  // Vidéos vues en fabrication : seules celles-là sont annoncées une fois finies.
  const [suivies, setSuivies] = useState(() => idsEnCours(initial));
  // Le SDK Firebase n'est chargé que s'il y a une vidéo à suivre (budget JavaScript).
  const aSuivre = suivies.length > 0 || idsEnCours(initial).length > 0;
  useEffect(() => {
    if (!aSuivre) return;
    let actif = true;
    let arreter: (() => void) | undefined;
    void (async () => {
      const auth = await authClient();
      await auth.authStateReady();
      if (!actif || !auth.currentUser) return;
      const [db, m] = await Promise.all([firestoreClient(), import('firebase/firestore')]);
      if (!actif) return;
      arreter = m.onSnapshot(
        requeteProjetsStudioRecents(m, db),
        (r) => {
          const liste = r.docs.map((d) => ({
            id: d.id,
            titre: d.get('titre') as string,
            statut: d.get('statut') as StatutProjetStudio,
            depuis: (d.get('updatedAt') as { toMillis(): number } | undefined)?.toMillis() ?? 0,
          }));
          setEcoutees(liste);
          setSuivies((s) => [...new Set([...s, ...idsEnCours(liste)])]);
        },
        () => setEcoutees(null),
      );
    })();
    return () => {
      actif = false;
      arreter?.();
    };
  }, [aSuivre]);

  const enCours = videos.filter((v) => estEtapeSuivie(v.statut));
  const finies = videos.filter(
    (v) =>
      (v.statut === 'pret' || v.statut === 'erreur') &&
      suivies.includes(v.id) &&
      !ecartees.includes(v.id),
  );

  useEffect(() => {
    if (direct || !enCours.length) return;
    const t = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [direct, enCours.length, router]);

  const visibles = [...enCours.slice(0, 2), ...finies.slice(0, 2)].filter(
    (v) => chemin !== routes.adminSection(`studio/${v.id}`),
  );
  if (!visibles.length) return null;
  return (
    <div
      aria-live="polite"
      className="fixed right-4 bottom-4 z-40 grid max-w-[calc(100vw-32px)] justify-items-end gap-2"
    >
      {visibles.map((v) => {
        const fini = !estEtapeSuivie(v.statut);
        return (
          <div
            key={v.id}
            className={`flex min-h-11 max-w-[380px] items-center gap-2 rounded-full border py-1 pr-1 pl-4 text-sm shadow-lg ${v.statut === 'pret' ? 'border-succes bg-succes-fond' : v.statut === 'erreur' ? 'border-danger bg-danger-fond' : 'border-trait bg-blanc'}`}
          >
            {fini ? null : (
              <span
                aria-hidden="true"
                className="size-2.5 flex-none rounded-full bg-accent motion-safe:animate-pulse"
              />
            )}
            <Link
              href={routes.adminSection(`studio/${v.id}`)}
              className="min-w-0 truncate py-2 font-semibold text-texte no-underline hover:underline"
            >
              {v.statut === 'pret'
                ? `Vidéo prête : ${v.titre}`
                : v.statut === 'erreur'
                  ? `Vidéo à relancer : ${v.titre}`
                  : `Vidéo en création · ${LIBELLES_STATUT_STUDIO[v.statut]}`}
            </Link>
            {fini ? (
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setEcartees((e) => [...e, v.id])}
                className="flex size-11 flex-none items-center justify-center rounded-full hover:bg-neutre-100"
              >
                ×
              </button>
            ) : (
              <span className="pr-3" />
            )}
          </div>
        );
      })}
    </div>
  );
}
