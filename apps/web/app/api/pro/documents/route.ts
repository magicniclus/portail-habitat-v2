import { entreeDocument } from '@ph/core/schemas';
import { bucketFichiers } from '@ph/firebase/admin';
import { enregistrerDocument } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { entrepriseAutorisee, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const enregistrer = action(
  {
    schema: entreeDocument,
    nom: 'enregistrerDocument',
    rateLimit: { cle: 'documents', max: 30, fenetre: '1h' },
  },
  async (e, ctx) =>
    enregistrerDocument(
      { ...servicesDemandesPro(), bucket: bucketFichiers() },
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'documents.televerser'), uid: ctx.uid! },
      e,
    ),
);

/** Document déposé depuis Ma fiche (Kbis, décennale…) : vérifié puis enregistré (ONB-06b). */
export const POST = (requete: Request) => routeJson(requete, enregistrer);
