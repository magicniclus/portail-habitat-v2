import { entreeRedactionAcceptee } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { marquerRedactionAcceptee } from '@ph/firebase/ia';
import { getFirestore } from 'firebase-admin/firestore';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const accepter = action(
  {
    schema: entreeRedactionAcceptee,
    nom: 'redactionAcceptee',
    rateLimit: { cle: 'redaction', max: 40, fenetre: '1h' },
  },
  async (e, ctx) =>
    marquerRedactionAcceptee(
      getFirestore(appAdmin()),
      await entrepriseAutorisee(ctx.uid!, 'fiche.modifier'),
      e.redactionId,
    ),
);

/** « Remplacer mon texte » : mesure du taux d'acceptation de l'assistant. */
export const POST = (requete: Request) => routeJson(requete, accepter);
