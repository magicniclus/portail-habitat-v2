import { LIBELLES_STATUT_STUDIO } from '@ph/core/studio';
import { formatEuros, formatRelatif } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { listerProjetsStudio } from '@ph/firebase/studio';
import { Badge, Banner, EmptyState } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { NouveauProjet } from '@/features/studio/NouveauProjet';
import { TONS_STATUT } from '@/features/studio/tons';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Studio' };

/** Back-office › Studio (STUDIO.md) : produire des vidéos courtes pour les réseaux sociaux. */
export default async function Studio() {
  await pageAdmin('/admin/studio', 'studio');
  const projets = await listerProjetsStudio(getFirestore(appAdmin()));
  const maintenant = maintenantServeur();
  const manque = [
    ...(process.env.ANTHROPIC_API_KEY ? [] : ['ANTHROPIC_API_KEY (Claude)']),
    ...(process.env.YOUTUBE_API_KEY ? [] : ['YOUTUBE_API_KEY (tendances)']),
    ...(process.env.STUDIO_RENDU_URL
      ? []
      : ['STUDIO_RENDU_URL et STUDIO_RENDU_CLE (robot de rendu)']),
  ];
  return (
    <main className="grid min-w-0 gap-4">
      <header>
        <h1 className="m-0 text-[clamp(26px,3vw,30px)]">Studio</h1>
        <p className="m-0 mt-1 max-w-[70ch] text-neutre-800">
          Des vidéos courtes qui font des vues : Claude analyse ce qui marche, vous propose un sujet
          et son script, vous enregistrez votre écran et votre voix, il monte la vidéo avec les
          captures de Portail Travaux. Vous téléchargez le résultat.
        </p>
      </header>
      {manque.length ? (
        <Banner tone="attention" titre="Configuration à compléter">
          À ajouter dans les variables d’environnement : {manque.join(', ')}.
        </Banner>
      ) : null}
      <NouveauProjet />
      <section aria-labelledby="projets-studio" className="grid gap-2">
        <h2 id="projets-studio" className="m-0 text-lg">
          Vos vidéos
        </h2>
        {projets.length === 0 ? (
          <EmptyState titre="Aucune vidéo pour l’instant">
            Créez votre première vidéo ci-dessus.
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
                    {p.sujet?.titre ?? 'Sans sujet choisi'} · {p.format} ·{' '}
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
