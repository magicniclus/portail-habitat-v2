import { entreeLogo } from '@ph/core/schemas';
import { bucketFichiers } from '@ph/firebase/admin';
import { enregistrerLogo } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';
import { ecrireFiche } from '@/server/republierFiche';

export const dynamic = 'force-dynamic';

const enregistrer = action(
  {
    schema: entreeLogo,
    nom: 'enregistrerLogo',
    rateLimit: { cle: 'medias', max: 60, fenetre: '1h' },
  },
  async (e, ctx) =>
    ecrireFiche(ctx.uid!, (c) =>
      enregistrerLogo({ ...servicesDemandesPro(), bucket: bucketFichiers() }, c, e.nomFichier),
    ),
);

/** Logo de l'entreprise, déposé dans Storage puis vérifié (Ma fiche). */
export const POST = (requete: Request) => routeJson(requete, enregistrer);
