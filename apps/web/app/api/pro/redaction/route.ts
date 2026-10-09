import { entreeRedactionIa } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { clientAnthropic, redigerIa } from '@ph/firebase/ia';
import { getFirestore } from 'firebase-admin/firestore';
import { nomMetier } from '@/features/pro/metiers';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const rediger = action(
  {
    schema: entreeRedactionIa,
    nom: 'redigerIa',
    rateLimit: { cle: 'redaction', max: 40, fenetre: '1h' },
  },
  async (e, ctx) => {
    const cle = process.env.ANTHROPIC_API_KEY;
    return redigerIa(
      {
        db: getFirestore(appAdmin()),
        horloge: Date.now,
        client: cle ? clientAnthropic(cle) : null,
        nomMetier,
      },
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'fiche.modifier') },
      e,
    );
  },
);

/** Assistant de rédaction de Ma Fiche (IA_ADMIN §8) : une proposition, rien n'est enregistré. */
export const POST = (requete: Request) => routeJson(requete, rediger);
