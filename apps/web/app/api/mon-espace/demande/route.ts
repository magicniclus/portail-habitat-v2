import { entreeLireDemande } from '@ph/core/schemas';
import { lireMaDemande } from '@ph/firebase/espace';
import { action } from '@/server/action';
import { servicesEspace } from '@/server/espace';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const lire = action(
  { schema: entreeLireDemande, nom: 'lireMaDemande', lectureSeule: true },
  async (e, ctx) => lireMaDemande(servicesEspace(), ctx.uid!, e.demandeId),
);

/** Détail d'une demande : 404 si elle appartient à un autre particulier (ESP-02). */
export const POST = (requete: Request) => routeJson(requete, lire);
