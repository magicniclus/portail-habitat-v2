import 'server-only';
import type { OptionsEnveloppe } from '@ph/core/enveloppe';
import type { ServicesComptes } from '@ph/firebase/comptes';
import type { z } from '@ph/core/zod';
import { action } from './action';
import { servicesComptes } from './espace';
import { routeJson } from './json';

/**
 * Route JSON d'une opération d'équipe (COMPTES §4) : le service vérifie lui-même le droit
 * (`membres.gerer`, rôle cible) dans sa transaction ; limite de débit commune.
 */
export function routeEquipe<S extends z.ZodType>(
  options: Omit<OptionsEnveloppe<S>, 'rateLimit'>,
  executer: (s: ServicesComptes, uid: string, e: z.output<S>) => Promise<unknown>,
) {
  const a = action(
    { ...options, rateLimit: { cle: 'equipe', max: 60, fenetre: '1h' } },
    async (e, ctx) => {
      const r = await executer(servicesComptes(), ctx.uid!, e);
      return r ?? null;
    },
  );
  return (requete: Request) => routeJson(requete, a);
}
