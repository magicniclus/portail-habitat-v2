import 'server-only';
import { appAdmin } from '@ph/firebase/admin';
import { geocodeurApiGeo, type ServicesDemandes } from '@ph/firebase/demandes';
import { notifier, servicesNotifications } from '@ph/firebase/notifications';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { VERSION_LEGALE } from '@/features/legal/documents';
import { URL_SITE } from '@/features/vitrine/seo';

/** Services réels de `creerDemande` (Admin SDK, envois par `notifier()` puis Cloud Tasks). */
export function servicesDemandes(): ServicesDemandes {
  const db = getFirestore(appAdmin());
  return {
    db,
    auth: getAuth(appAdmin()),
    horloge: Date.now,
    notifier: (e) => notifier(servicesNotifications(db), e),
    urlSite: URL_SITE,
    geocoder: geocodeurApiGeo(),
    versionLegale: VERSION_LEGALE,
  };
}
