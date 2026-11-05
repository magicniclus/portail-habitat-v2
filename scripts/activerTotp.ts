// Active la double authentification par application (TOTP) sur le projet Firebase : pnpm admin:totp
// Prérequis : projet passé à Identity Platform (Console Firebase → Authentication → Paramètres).
// La console ne propose pas TOTP : seuls l'Admin SDK ou l'API REST l'activent. Le SMS n'est pas touché.
// Projet cible : celui des identifiants Admin SDK (FIREBASE_ADMIN_* dans .env.local).
import './env';
import { appAdmin } from '@ph/firebase/admin';
import { getAuth } from 'firebase-admin/auth';

async function main() {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST)
    throw new Error(
      "L'émulateur Firebase n'a pas de TOTP : lancez la commande sans les émulateurs.",
    );
  const projet = getAuth(appAdmin()).projectConfigManager();
  await projet.updateProjectConfig({
    multiFactorConfig: {
      providerConfigs: [{ state: 'ENABLED', totpProviderConfig: { adjacentIntervals: 5 } }],
    },
  });
  const c = await projet.getProjectConfig();
  const actif = c.multiFactorConfig?.providerConfigs?.some(
    (p) => p.state === 'ENABLED' && p.totpProviderConfig,
  );
  console.log(
    actif
      ? 'Double authentification par application (TOTP) activée sur le projet.'
      : 'TOTP non activé : vérifiez que le projet est passé à Identity Platform.',
  );
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
