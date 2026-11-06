import { decrochage, diagnosticVideo, RESEAUX } from '@ph/core/studio';
import { formatNombre } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { resultatsStudio } from '@ph/firebase/studio';
import { EmptyState } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { CourbeRetention } from '@/features/studio/CourbeRetention';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Studio · résultats' };

const pourcent = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)} %`);
const n = (x: number | null) => (x === null ? '—' : formatNombre(x));

/** Studio › Résultats (STUDIO.md §12) : vos vidéos, ce qui a marché, où les gens décrochent. */
export default async function ResultatsStudio() {
  await pageAdmin('/admin/studio/resultats', 'studio');
  const l = await resultatsStudio(getFirestore(appAdmin()), maintenantServeur());
  return (
    <main className="grid min-w-0 content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <header>
        <Link href={'/admin/studio' as Route} className="text-sm">
          ← Studio
        </Link>
        <h1 className="m-0 mt-1 text-[clamp(24px,3vw,30px)]">Résultats</h1>
        <p className="m-0 mt-1 text-neutre-700">
          Relevés toutes les 6 heures pendant 30 jours (comptes connectés) ou notés à la main («
          J’ai publié moi-même »). Claude s’en sert pour ses prochaines propositions.
        </p>
      </header>
      {l.length === 0 ? (
        <EmptyState titre="Pas encore de résultats">
          Publiez une vidéo depuis le Studio, ou notez-la dans « 6. Publier › J’ai publié moi-même
          ».
        </EmptyState>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {l.map((p) => {
            const s = p.stats!;
            const conseils = diagnosticVideo({ ...s, dureeS: p.dureeS, vues: s.vues });
            const chute = decrochage(s.courbe, p.dureeS);
            return (
              <li
                key={p.id}
                className="grid gap-3 rounded-card border border-trait bg-blanc p-4 md:grid-cols-[1fr_280px]"
              >
                <div className="grid content-start gap-2">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <Link href={`/admin/studio/${p.projetId}` as Route} className="font-bold">
                      {p.titre}
                    </Link>
                    <span className="text-sm text-neutre-700">{RESEAUX[p.reseau].libelle}</span>
                    {p.lien ? (
                      <a
                        href={p.lien}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm"
                      >
                        Voir ↗
                      </a>
                    ) : null}
                  </div>
                  <dl className="m-0 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
                    {[
                      ['Vues', n(s.vues)],
                      ['Regardé', pourcent(s.retention)],
                      [
                        'Abonnés',
                        s.abonnesGagnes === null ? '—' : `+${formatNombre(s.abonnesGagnes)}`,
                      ],
                      ['J’aime', n(s.likes)],
                      ['Commentaires', n(s.commentaires)],
                      ['Partages', n(s.partages)],
                    ].map(([l2, v]) => (
                      <div key={l2} className="rounded-control bg-neutre-100 px-2 py-1.5">
                        <dt className="text-xs text-neutre-700">{l2}</dt>
                        <dd className="m-0 font-bold tabular-nums">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {conseils.length ? (
                    <ul className="m-0 pl-5 text-sm">
                      {conseils.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {s.courbe ? (
                  <CourbeRetention
                    courbe={s.courbe}
                    dureeS={p.dureeS}
                    chuteS={chute?.seconde ?? null}
                  />
                ) : (
                  <p className="m-0 self-center text-sm text-neutre-700">
                    Courbe de rétention : YouTube seulement (Instagram et TikTok ne la donnent pas).
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
