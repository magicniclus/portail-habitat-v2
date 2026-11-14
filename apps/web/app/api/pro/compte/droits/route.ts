import { z } from '@ph/core/zod';
import { synchroniserClaims } from '@ph/firebase/comptes';
import { action } from '@/server/action';
import { servicesComptes } from '@/server/espace';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const recalculer = action(
  {
    schema: z.strictObject({}),
    nom: 'recalculerDroits',
    rateLimit: { cle: 'droits', max: 30, fenetre: '1h' },
  },
  async (_e, ctx) => synchroniserClaims(servicesComptes(), ctx.uid!).then(() => null),
);

/**
 * Droits de la session (claims) recalculés depuis les membres en base (COMPTES §7) : appelé
 * quand un envoi de fichier est refusé, avant un nouvel essai avec une session renouvelée.
 * Ne donne aucun droit : il recopie seulement ceux que la base accorde déjà.
 */
export const POST = (requete: Request) => routeJson(requete, recalculer);
