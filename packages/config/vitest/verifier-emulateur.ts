/** Refuse tout environnement qui n'est pas un émulateur local sur un projet « demo- ». */
export function verifierEmulateur(env: Record<string, string | undefined>): void {
  const hote = env.FIRESTORE_EMULATOR_HOST;
  const projet = env.GCLOUD_PROJECT ?? env.GOOGLE_CLOUD_PROJECT;
  if (!hote) {
    throw new Error(
      'Tests Firebase hors émulateur refusés : FIRESTORE_EMULATOR_HOST absent. Lancez `pnpm test`.',
    );
  }
  if (!/^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(hote)) {
    throw new Error(`Tests Firebase refusés : l'émulateur doit être local (reçu « ${hote} »).`);
  }
  if (!projet?.startsWith('demo-')) {
    throw new Error(
      `Tests Firebase refusés : le projet doit commencer par « demo- » (reçu « ${projet ?? 'aucun'} »).`,
    );
  }
}
