import 'server-only';
import { appAdmin } from '@ph/firebase/admin';
import { lireEspacePro, type EspacePro } from '@ph/firebase/comptes';
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
  espace: EspacePro;
}

/** Session de l'espace pro, vérifiée une fois par requête (révocations comprises) ; `null` sans session. */
export const lireSessionPro = cache(async (): Promise<SessionPro | null> => {
  const jeton = await lireSession((await cookies()).get(COOKIE_SESSION)?.value);
  if (!jeton) return null;
  const espace = await lireEspacePro(getFirestore(appAdmin()), jeton.uid);
  return {
    uid: jeton.uid,
    nomAffiche: espace.nomAffiche || jeton.email || '',
    email: jeton.email ?? '',
    secondFacteur: contexteDepuisJeton(jeton).secondFacteur ?? false,
    artisanId: espace.active?.artisanId ?? null,
    role: espace.active?.membre.role ?? null,
    plan: espace.active?.artisan.plan ?? null,
    espace,
  };
});

/** Pages de l'espace pro : sans session valide, retour à la connexion avec la page demandée en suite. */
export async function sessionPro(suite: string): Promise<SessionPro> {
  const s = await lireSessionPro();
  if (!s) redirect(routes.connexionProSuite(suite));
  return s;
}
