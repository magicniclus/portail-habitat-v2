import { entreeTagBlog } from '@ph/core/schemas';
import { gererTag } from '@ph/firebase/blog';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

export const POST = routeSite('gererTagBlog', entreeTagBlog, gererTag);
