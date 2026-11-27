import { entreeCategorieBlog } from '@ph/core/schemas';
import { gererCategorie } from '@ph/firebase/blog';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

export const POST = routeSite('gererCategorieBlog', entreeCategorieBlog, gererCategorie);
