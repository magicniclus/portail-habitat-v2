import 'server-only';
import { VERSION_LEGALE } from '@/features/legal/documents';
import { servicesComptes } from './espace';

/** Mon compte : services des comptes + version des textes pour le journal des consentements. */
export const servicesCompte = () => ({ ...servicesComptes(), versionLegale: VERSION_LEGALE });
