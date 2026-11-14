import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { EditeurArticle } from '@/features/editeurBlog/EditeurArticle';
import { routes } from '@/lib/routes';
import { editeurArticle } from './blog';
import { accesSite } from './sites';
import { sessionPro } from './sessionPro';

/** Page de l'éditeur d'article : Site Pro seulement, sinon retour à l'onglet Blog (BLOG-01). */
export async function PageArticle({ articleId }: { articleId?: string }) {
  const suite = articleId ? routes.proBlogArticle(articleId) : routes.proBlogNouvelArticle;
  const acces = await accesSite(suite);
  if (!acces.sitePro) redirect(routes.proSiteOnglet('blog'));
  const [d, s] = await Promise.all([editeurArticle(acces.artisanId, articleId), sessionPro(suite)]);
  if (articleId && !d.article) notFound();
  return <EditeurArticle d={d} moi={s.uid} />;
}
