import { creneauxDuJour } from '@ph/core/studio';
import { formatDate } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { listerPublicationsStudio, meilleuresHeuresStudio } from '@ph/firebase/studio';
import { EmptyState } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { ListePublications } from '@/features/studio/ListePublications';
import { ObjectifJour } from '@/features/studio/ObjectifJour';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Studio · calendrier' };

const JOUR = 86_400_000;
/** Heure de Paris d'un instant, en minutes depuis minuit. */
const minutesParis = (ms: number) => {
  const [h, m] = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(ms)
    .split(':')
    .map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const jourParis = (ms: number) =>
  new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(ms);
const heure = (min: number) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;

/** Studio › Calendrier (STUDIO.md §11) : 14 jours de publications, objectif par jour, créneaux conseillés. */
export default async function CalendrierStudio({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await pageAdmin('/admin/studio/calendrier', 'studio');
  const q = await searchParams;
  const parJour = Math.min(30, Math.max(1, Number(q.parJour) || 1));
  const maintenant = maintenantServeur();
  const db = getFirestore(appAdmin());
  const depuis = maintenant - 2 * JOUR;
  const [publications, heures] = await Promise.all([
    listerPublicationsStudio(db, { depuis, jusqua: maintenant + 14 * JOUR }),
    meilleuresHeuresStudio(db, maintenant),
  ]);
  const creneaux = creneauxDuJour(parJour, undefined, heures);
  const jours = Array.from({ length: 16 }, (_, i) => jourParis(depuis + i * JOUR));
  const actives = publications.filter((p) => p.statut !== 'annulee');
  return (
    <div className="grid min-w-0 content-start gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-xl">Calendrier</h1>
          <p className="m-0 mt-1 text-neutre-700">
            Créneaux conseillés : {creneaux.map(heure).join(', ')}
            {heures.length
              ? ' (vos meilleures heures d’abord)'
              : ' (répartis dans la journée ; vos meilleures heures passeront devant dès que vos vidéos auront des résultats)'}
            .
          </p>
        </div>
        <ObjectifJour valeur={parJour} />
      </header>
      {actives.length === 0 ? (
        <EmptyState titre="Rien de programmé">
          Ouvrez une vidéo prête, puis « 6. Publier » pour la programmer.
        </EmptyState>
      ) : null}
      <ol className="m-0 grid list-none gap-3 p-0">
        {jours.map((j) => {
          const du = actives.filter((p) => jourParis(p.programmeeLe) === j);
          const videos = new Set(du.map((p) => p.projetId)).size;
          if (!du.length && j < jourParis(maintenant)) return null;
          return (
            <li key={j} className="grid gap-2 rounded-card border border-trait bg-blanc p-3">
              <div className="flex items-center justify-between gap-2">
                <strong>{formatDate(new Date(`${j}T12:00:00Z`), 'long')}</strong>
                <span
                  className={`text-sm ${videos >= parJour ? 'text-succes' : 'text-neutre-700'}`}
                >
                  {videos} / {parJour} vidéo{parJour > 1 ? 's' : ''}
                </span>
              </div>
              {du.length ? (
                <ListePublications publications={du} avecTitre />
              ) : (
                <p className="m-0 text-sm text-neutre-700">
                  Libre. Prochain créneau conseillé :{' '}
                  {heure(
                    creneaux.find(
                      (c) => j !== jourParis(maintenant) || c > minutesParis(maintenant),
                    ) ?? creneaux[0]!,
                  )}
                  .
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
