import { entreeBanniere, entreeCadrageBanniere, entreeRetraitBanniere } from '@ph/core/schemas';
import { bucketFichiers } from '@ph/firebase/admin';
import { cadrerBanniere, enregistrerBanniere, retirerBanniere } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';
import { ecrireFiche } from '@/server/republierFiche';

export const dynamic = 'force-dynamic';

const enregistrer = action(
  {
    schema: entreeBanniere,
    nom: 'enregistrerBanniere',
    rateLimit: { cle: 'medias', max: 60, fenetre: '1h' },
  },
  async (e, ctx) =>
    ecrireFiche(ctx.uid!, (c) =>
      enregistrerBanniere({ ...servicesDemandesPro(), bucket: bucketFichiers() }, c, e.nomFichier),
    ),
);

const retirer = action(
  {
    schema: entreeRetraitBanniere,
    nom: 'retirerBanniere',
    rateLimit: { cle: 'medias', max: 60, fenetre: '1h' },
  },
  async (e, ctx) =>
    ecrireFiche(ctx.uid!, (c) =>
      retirerBanniere({ ...servicesDemandesPro(), bucket: bucketFichiers() }, c, e.url),
    ),
);

const cadrer = action(
  {
    schema: entreeCadrageBanniere,
    nom: 'cadrerBanniere',
    rateLimit: { cle: 'medias', max: 60, fenetre: '1h' },
  },
  async (e, ctx) =>
    ecrireFiche(ctx.uid!, (c) =>
      cadrerBanniere({ ...servicesDemandesPro(), bucket: bucketFichiers() }, c, e.cadrage),
    ),
);

/** Bannière de la fiche, déposée dans Storage puis vérifiée (Ma fiche). */
export const POST = (requete: Request) => routeJson(requete, enregistrer);

/** Retrait d'une bannière (Ma fiche). */
export const DELETE = (requete: Request) => routeJson(requete, retirer);

/** Cadrage des bannières : haut, centre ou bas (Ma fiche). */
export const PATCH = (requete: Request) => routeJson(requete, cadrer);
