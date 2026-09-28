import 'server-only';
import { appAdmin } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import { COOKIE_SESSION, contexteDepuisJeton, lireSession } from '@ph/firebase/serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { routes } from '@/lib/routes';

export interface SessionPro {
  uid: string;
  nomAffiche: string;
  email: string;
  secondFacteur: boolean;
  /** Entreprise active (sélecteur d'entreprise) et rôle de la personne dans celle-ci. */
  artisanId: string | null;
  role: string | null;
  plan: 'gratuit' | 'visibilite' | 'premium' | null;
  entreprises: string[];
}

/**
 * Session de l'espace pro, vérifiée à chaque page (révocations comprises) ; sans session valide,
 * retour à la connexion pro avec la page demandée en suite.
 */
export const sessionPro = cache(async (suite: string): Promise<SessionPro> => {
  const jeton = await lireSession((await cookies()).get(COOKIE_SESSION)?.value);
  if (!jeton) redirect(routes.connexionProSuite(suite));
  const db = getFirestore(appAdmin());
  const user = (await db.doc(chemins.user(jeton.uid)).get()).data() ?? {};
  const entreprises = (user.entreprises as string[] | undefined) ?? [];
  const artisanId = (user.entrepriseActive as string | undefined) ?? entreprises[0] ?? null;
  const [membre, artisan] = artisanId
    ? await Promise.all([
        db.doc(chemins.membre(artisanId, jeton.uid)).get(),
        db.doc(chemins.artisan(artisanId)).get(),
      ])
    : [null, null];
  const actif = membre?.exists && membre.get('statut') === 'actif';
  return {
    uid: jeton.uid,
    nomAffiche: (user.nomAffiche as string | undefined) ?? jeton.email ?? '',
    email: jeton.email ?? '',
    secondFacteur: contexteDepuisJeton(jeton).secondFacteur ?? false,
    artisanId: actif ? artisanId : null,
    role: actif ? (membre!.get('role') as string) : null,
    plan: actif ? ((artisan?.get('plan') as SessionPro['plan']) ?? null) : null,
    entreprises,
  };
});
