import { entreeTampon } from '@ph/core/schemas';
import { bucketFichiers } from '@ph/firebase/admin';
import { enregistrerTampon } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const enregistrer = action(
  {
    schema: entreeTampon,
    nom: 'enregistrerTampon',
    rateLimit: { cle: 'medias', max: 60, fenetre: '1h' },
  },
  async (e, ctx) => {
    await enregistrerTampon(
      { ...servicesDevis(), bucket: bucketFichiers() },
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'factures.emettre'), uid: ctx.uid! },
      e,
    );
    return null;
  },
);

/** Cachet de l'entreprise (déposé dans Storage, vérifié ici), ou retrait. */
export const POST = (requete: Request) => routeJson(requete, enregistrer);
