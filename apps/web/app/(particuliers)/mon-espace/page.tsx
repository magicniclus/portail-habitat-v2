import { EspaceParticulier } from '@/features/espace/EspaceParticulier';
import { flagActif } from '@/server/flags';

export default async function PageMonEspace() {
  return <EspaceParticulier onglet="projets" avecPlans={await flagActif('dessin')} />;
}
