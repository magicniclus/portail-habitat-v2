import { configFirebaseClient } from '@/server/configFirebase';

/**
 * Transmet la configuration du SDK au navigateur, sans recompiler. Bloc JSON (non exécuté) lu à la
 * demande par `lib/firebaseClient` : un `<script>` exécutable ne tournerait pas après une navigation
 * côté client (étape 2 → étape 3 de l'inscription).
 */
export function ConfigFirebase() {
  return (
    <script
      id="config-firebase"
      type="application/json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(configFirebaseClient()).replace(/</g, '\\u003c'),
      }}
    />
  );
}
