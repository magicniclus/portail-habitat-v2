import { configFirebaseClient } from '@/server/configFirebase';

/** Transmet la configuration du SDK au navigateur (`window.__PH_FIREBASE__`), sans recompiler. */
export function ConfigFirebase() {
  return (
    <script
      id="config-firebase"
      dangerouslySetInnerHTML={{
        __html: `window.__PH_FIREBASE__=${JSON.stringify(configFirebaseClient()).replace(/</g, '\\u003c')}`,
      }}
    />
  );
}
