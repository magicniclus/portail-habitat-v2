import { formatDate } from '@ph/core/format';
import { lireValidationPilote } from '@ph/firebase/blog';
import { Banner, bouton } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ValiderArticle } from '@/features/validationBlog/ValiderArticle';
import { routes } from '@/lib/routes';
import { servicesSites } from '@/server/sites';

export const metadata: Metadata = {
  title: 'Valider un article',
  robots: { index: false },
  referrer: 'no-referrer',
};
export const dynamic = 'force-dynamic';

/**
 * Lien de l'email `blog-a-valider` (D70) : l'article préparé par le pilote n'est publié qu'après
 * le clic sur « Valider la publication ». Le simple chargement de la page ne change rien.
 */
export default async function PageValiderArticle({
  params,
}: {
  params: Promise<{ lien: string }>;
}) {
  const { lien } = await params;
  const v = await lireValidationPilote(servicesSites(), lien);
  return (
    <main className="mx-auto grid w-full max-w-xl gap-5 px-4 py-10">
      <h1 className="m-0 text-[28px] leading-tight font-bold">Valider un article du blog</h1>
      {v.etat === 'invalide' ? (
        <Banner tone="attention">
          Ce lien n’est plus valable. Ouvrez votre blog pour retrouver l’article.
        </Banner>
      ) : (
        <>
          <dl className="m-0 grid gap-2 text-[15px] min-[500px]:grid-cols-[160px_1fr]">
            <dt className="font-semibold">Article</dt>
            <dd className="m-0">{v.titre}</dd>
            <dt className="font-semibold">Publication prévue</dt>
            <dd className="m-0">{formatDate(v.publierLe, 'long')}</dd>
          </dl>
          {v.etat === 'valide' ? (
            <Banner tone="succes">Cet article est déjà validé.</Banner>
          ) : v.aCorriger.length ? (
            <Banner tone="attention" titre="À corriger avant de valider">
              {v.aCorriger.join(', ')}.
            </Banner>
          ) : (
            <ValiderArticle lien={lien} date={formatDate(v.publierLe, 'long')} />
          )}
        </>
      )}
      <div>
        <Link href={routes.proSiteOnglet('blog')} className={bouton({ variant: 'secondaire' })}>
          Relire dans mon blog
        </Link>
      </div>
    </main>
  );
}
