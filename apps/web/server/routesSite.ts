import 'server-only';
import type { ContexteSite, ServicesSites } from '@ph/firebase/sites';
import type { z } from '@ph/core/zod';
import { action } from './action';
import { entrepriseAutorisee } from './demandesPro';
import { routeJson } from './json';
import { servicesSites } from './sites';

/**
 * Route JSON d'une action d'édition du site : schéma, débit limité, entreprise active avec
 * `site.gerer` (revérifié dans la transaction par `exigerSite`).
 */
export function routeSite<S extends z.ZodType, R>(
  nom: string,
  schema: S,
  traitement: (s: ServicesSites, ctx: ContexteSite, e: z.output<S>) => Promise<R>,
  tailleMax?: number,
) {
  const executer = action(
    { schema, nom, rateLimit: { cle: 'site-edition', max: 600, fenetre: '1h' } },
    async (e, ctx) =>
      traitement(
        servicesSites(),
        { artisanId: await entrepriseAutorisee(ctx.uid!, 'site.gerer'), uid: ctx.uid! },
        e as z.output<S>,
      ),
  );
  return (requete: Request) => routeJson(requete, executer, tailleMax);
}
