import { estRobot } from '@ph/core/comportement';
import { entreeResumeVisite } from '@ph/core/schemas';
import { appAdmin, bucketReplays } from '@ph/firebase/admin';
import {
  enregistrerVisite,
  lireConfigComportement,
  type ConfigComportementLue,
} from '@ph/firebase/comportement';
import { dependancesEnveloppe } from '@ph/firebase/serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { actionMesure } from '@/server/action';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

/** La configuration est relue au plus toutes les 5 minutes par instance (une lecture de moins par visite). */
let config: { valeur: ConfigComportementLue; lueLe: number } | undefined;
async function configuration(db: ReturnType<typeof getFirestore>) {
  const maintenant = Date.now();
  if (!config || maintenant - config.lueLe > 300_000)
    config = { valeur: await lireConfigComportement(db), lueLe: maintenant };
  return config.valeur;
}

const recevoir = actionMesure(
  {
    schema: entreeResumeVisite,
    nom: 'enregistrerVisite',
    rateLimit: { cle: 'comportement', max: 300, fenetre: '1h' },
  },
  async (e) => {
    const db = getFirestore(appAdmin());
    await enregistrerVisite(
      {
        db,
        horloge: Date.now,
        deposerReplay: (chemin, contenu) =>
          bucketReplays()
            .file(chemin)
            .save(contenu, {
              contentType: 'application/json',
              metadata: { contentEncoding: 'gzip' },
            }),
        limiterDebit: dependancesEnveloppe(() => db).limiterDebit!,
      },
      e,
      await configuration(db),
    );
    return null;
  },
);

/**
 * Résumé d'une page vue (COMPORTEMENT §3) : un envoi par page vue, robots écartés, taille bornée
 * (64 Ko, limite de `sendBeacon`), schéma strict, débit limité par IP hachée.
 */
export async function POST(requete: Request) {
  if (estRobot(requete.headers.get('user-agent'))) return new Response(null, { status: 204 });
  return routeJson(requete, recevoir, 64 * 1024);
}
