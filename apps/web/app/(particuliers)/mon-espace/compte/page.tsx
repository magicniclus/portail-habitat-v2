import { EspaceParticulier } from '@/features/espace/EspaceParticulier';
import { flagActif } from '@/server/flags';

export default async function PageMonCompte() {
  return <EspaceParticulier onglet="compte" avecPlans={await flagActif('dessin')} />;
}
