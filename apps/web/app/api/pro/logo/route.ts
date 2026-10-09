import { entreeLogo } from '@ph/core/schemas';
import { bucketFichiers } from '@ph/firebase/admin';
import { enregistrerLogo } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { entrepriseAutorisee, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const enregistrer = action(
  {
    schema: entreeLogo,
    nom: 'enregistrerLogo',
    rateLimit: { cle: 'medias', max: 60, fenetre: '1h' },
  },
  async (e, ctx) =>
    enregistrerLogo(
      { ...servicesDemandesPro(), bucket: bucketFichiers() },
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'fiche.modifier'), uid: ctx.uid! },
      e.nomFichier,
    ),
);

/** Logo de l'entreprise, déposé dans Storage puis vérifié (Ma fiche). */
export const POST = (requete: Request) => routeJson(requete, enregistrer);
