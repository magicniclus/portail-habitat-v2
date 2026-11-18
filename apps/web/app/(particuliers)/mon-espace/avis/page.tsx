import { EspaceParticulier } from '@/features/espace/EspaceParticulier';
import { flagActif } from '@/server/flags';

export default async function PageMesAvis() {
  return <EspaceParticulier onglet="avis" avecPlans={await flagActif('dessin')} />;
}
