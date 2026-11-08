import { FORMATS_STUDIO, LIBELLES_STATUT_STUDIO } from '@ph/core/studio';
import { formatEuros, formatRelatif } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import {
  listerComptesStudio,
  listerIdeesStudio,
  listerProjetsStudio,
  listerSeriesStudio,
} from '@ph/firebase/studio';
import { Badge, Banner, EmptyState } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { BoutonCommentaires } from '@/features/studio/BoutonCommentaires';
import { IdeesGardees } from '@/features/studio/IdeesGardees';
import { NouveauMontageLibre } from '@/features/studio/NouveauMontageLibre';
import { NouveauProjet } from '@/features/studio/NouveauProjet';
import { Series } from '@/features/studio/Series';
import { TONS_STATUT } from '@/features/studio/tons';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Studio' };
/** Idées tirées des commentaires ou épisode suivant : un appel à Claude peut durer plusieurs minutes. */
export const maxDuration = 300;

/** Back-office › Studio (STUDIO.md) : produire des vidéos courtes pour les réseaux sociaux. */
export default async function Studio() {
  await pageAdmin('/admin/studio', 'studio');
  const db = getFirestore(appAdmin());
  const [projets, idees, series, comptes] = await Promise.all([
    listerProjetsStudio(db),
    listerIdeesStudio(db),
    listerSeriesStudio(db),
    listerComptesStudio(db),
  ]);
  const maintenant = maintenantServeur();
  const manque = [
    ...(process.env.ANTHROPIC_API_KEY ? [] : [['Claude', 'ANTHROPIC_API_KEY']]),
    ...(process.env.YOUTUBE_API_KEY ? [] : [['les tendances YouTube', 'YOUTUBE_API_KEY']]),
    ...(process.env.STUDIO_RENDU_URL && process.env.STUDIO_RENDU_CLE
      ? []
      : [['le robot de rendu', 'STUDIO_RENDU_URL, STUDIO_RENDU_CLE']]),
  ];
  return (
    <main className="grid min-w-0 content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-[clamp(26px,3vw,30px)]">Studio</h1>
          <p className="m-0 mt-1 text-neutre-700">
            Idées, tournage, montage : des vidéos courtes prêtes à publier.
          </p>
        </div>
        <nav aria-label="Studio" className="flex flex-wrap gap-2 text-sm">
          {(
            [
              ['/admin/studio/calendrier', 'Calendrier'],
              ['/admin/studio/resultats', 'Résultats'],
              ['/admin/studio/reseaux', 'Réseaux'],
            ] as const
          ).map(([href, l]) => (
            <Link
              key={href}
              href={href as Route}
              className="inline-flex min-h-11 items-center rounded-control border border-trait bg-blanc px-3 font-semibold no-underline"
            >
              {l}
            </Link>
          ))}
        </nav>
        <ol className="m-0 flex list-none flex-wrap gap-2 p-0 text-sm" aria-label="Étapes">
          {['Idées', 'Tournage', 'Montage', 'Export'].map((x, i) => (
            <li key={x} className="rounded-full bg-neutre-100 px-3 py-1.5 text-neutre-800">
              {i + 1}. {x}
            </li>
          ))}
        </ol>
      </header>
      {manque.length ? (
        <Banner tone="attention" titre="À brancher pour fabriquer les vidéos">
          Il manque {manque.map(([nom]) => nom).join(', ')}. Variables à ajouter dans{' '}
          <code>.env.local</code> : {manque.map(([, v]) => v).join(', ')}.
        </Banner>
      ) : null}
      <NouveauProjet />
      <NouveauMontageLibre />
      {/* Les commentaires se lisent par les comptes connectés (Studio › Réseaux). */}
      {comptes.some((c) => c.reseau !== 'tiktok') ? <BoutonCommentaires /> : null}
      <Series series={series} />
      {idees.length ? <IdeesGardees idees={idees} /> : null}
      <section aria-labelledby="projets-studio" className="grid gap-2">
        <h2 id="projets-studio" className="m-0 text-lg">
          Vos vidéos
        </h2>
        {projets.length === 0 ? (
          <EmptyState titre="Aucune vidéo pour l’instant">
            Cliquez sur « Trouver les meilleures vidéos à faire » : Claude s’occupe du reste.
          </EmptyState>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {projets.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/studio/${p.id}` as Route}
                  className="flex min-h-11 flex-col gap-1 rounded-card border border-trait bg-blanc p-3.5 no-underline hover:border-neutre-500"
                >
                  <span className="flex items-start justify-between gap-2">
                    <strong className="text-texte">{p.titre}</strong>
                    <Badge tone={TONS_STATUT[p.statut]}>{LIBELLES_STATUT_STUDIO[p.statut]}</Badge>
                  </span>
                  <span className="text-sm text-neutre-700">
                    {FORMATS_STUDIO[p.format].libelle.split(' (')[0]} ·{' '}
                    {formatRelatif(p.createdAt, maintenant)} ·{' '}
                    {formatEuros(p.coutCentimes, { decimales: 'toujours' })} de Claude
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
