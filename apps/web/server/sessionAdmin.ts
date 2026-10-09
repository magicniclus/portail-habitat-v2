import 'server-only';
import { peutLireSection, SECTIONS_ADMIN } from '@ph/core/admin';
import { appAdmin } from '@ph/firebase/admin';
import { verifierSessionAdmin, type ProfilAdminSession } from '@ph/firebase/admin-serveur';
import { COOKIE_SESSION, contexteDepuisJeton, lireSession } from '@ph/firebase/serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { forbidden, redirect } from 'next/navigation';
import { cache } from 'react';
import { routes } from '@/lib/routes';

export interface SessionAdmin extends ProfilAdminSession {
  secondFacteur: boolean;
}

/**
 * Double authentification exigée pour l'admin (ADMIN §1). Les émulateurs n'ont pas de TOTP :
 * `ADMIN_MFA=desactive` pour les tests de bout en bout seulement, interdit en production.
 */
export function mfaAdminDesactivee(env = process.env): boolean {
  const desactive = env.ADMIN_MFA === 'desactive';
  if (desactive && env.VERCEL_ENV === 'production')
    throw new Error('ADMIN_MFA=desactive est interdit en production.');
  return desactive;
}

type Lecture =
  | { etat: 'ok'; session: SessionAdmin }
  | { etat: 'sans_session' | 'pas_admin' | 'expiree' | 'inactivite' };

/** Session admin vérifiée une fois par requête (révocations, 8 h, 30 min d'inactivité). */
export const lireSessionAdmin = cache(async (): Promise<Lecture> => {
  const jeton = await lireSession((await cookies()).get(COOKIE_SESSION)?.value);
  if (!jeton) return { etat: 'sans_session' };
  const ctx = contexteDepuisJeton(jeton);
  if (ctx.impersonation) return { etat: 'pas_admin' };
  const r = await verifierSessionAdmin(getFirestore(appAdmin()), {
    uid: jeton.uid,
    authentifieLe: ctx.authentifieLe ?? 0,
    maintenant: Date.now(),
  });
  if (r.etat !== 'ok') return { etat: r.etat };
  return {
    etat: 'ok',
    session: { ...r.profil, secondFacteur: ctx.secondFacteur ?? false },
  };
});

/**
 * Page admin : session valide, double authentification activée, puis section autorisée
 * (sinon 403, ADM-01). `section` : identifiant de `SECTIONS_ADMIN`.
 */
export async function pageAdmin(chemin: string, section?: string): Promise<SessionAdmin> {
  const r = await lireSessionAdmin();
  if (r.etat !== 'ok')
    redirect(
      routes.connexionAdminSuite(
        chemin,
        r.etat === 'expiree' || r.etat === 'inactivite' ? r.etat : undefined,
      ),
    );
  const s = r.session;
  if (!s.secondFacteur && !mfaAdminDesactivee()) redirect(routes.adminSecurite);
  const def = section ? SECTIONS_ADMIN.find((x) => x.id === section) : undefined;
  if (section && (!def || !peutLireSection(def, s.permissions))) forbidden();
  return s;
}
