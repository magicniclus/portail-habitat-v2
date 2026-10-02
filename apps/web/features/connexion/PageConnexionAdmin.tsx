import { Banner, Logo } from '@ph/ui';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { EspaceTheme } from '@/features/theme/Theme';
import { ConnexionPro } from './ConnexionPro';

const RAISONS: Record<string, string> = {
  inactivite: 'Vous avez été déconnecté après 30 minutes sans activité.',
  expiree: 'Votre session a dépassé 8 heures : reconnectez-vous.',
};

/** Connexion au back-office : email, mot de passe et second facteur obligatoire (ADMIN §1). */
export function PageConnexionAdmin({
  suite,
  raison,
  smsActif,
}: {
  suite: string;
  raison: string | undefined;
  smsActif: boolean;
}) {
  return (
    <EspaceTheme theme="admin">
      <ConfigFirebase />
      <main className="mx-auto grid min-h-dvh w-full max-w-[440px] content-center gap-6 px-4 py-10">
        <Logo variant="admin" taille={34} />
        <div>
          <h1 className="m-0 mb-2 text-[clamp(26px,3.4vw,34px)] leading-tight">Administration</h1>
          <p className="m-0 text-base text-neutre-800">Accès réservé à l’équipe Portail Habitat.</p>
        </div>
        {raison && RAISONS[raison] ? <Banner tone="info">{RAISONS[raison]}</Banner> : null}
        <ConnexionPro suite={suite} smsActif={smsActif} espace="admin" />
      </main>
    </EspaceTheme>
  );
}
