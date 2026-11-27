import { Banner } from '@ph/ui';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { ReconnexionAdmin } from '@/features/admin/ReconnexionAdmin';
import { ActivationTotp } from '@/features/comptePro/ActivationTotp';
import { routes } from '@/lib/routes';
import { lireSessionAdmin, mfaAdminDesactivee } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Double authentification' };

/** Première connexion admin : la double authentification est obligatoire (ADMIN §1). */
export default async function SecuriteAdmin() {
  const r = await lireSessionAdmin();
  if (r.etat !== 'ok') redirect(routes.connexionAdminSuite('/admin'));
  if (r.session.secondFacteur || mfaAdminDesactivee()) redirect(routes.admin);
  return (
    <main className="mx-auto grid max-w-xl gap-5 px-4 py-12">
      <ConfigFirebase />
      <h1 className="m-0 text-[28px] leading-tight">Activez la double authentification</h1>
      <Banner tone="attention" titre="Obligatoire pour l’administration">
        Installez une application d’authentification (Google Authenticator, Authy…), ajoutez votre
        compte avec le QR code, puis reconnectez-vous avec le code à 6 chiffres.
      </Banner>
      <ActivationTotp deuxFacteurs={false} />
      <ReconnexionAdmin />
    </main>
  );
}
