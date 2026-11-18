import { EspaceParticulier } from '@/features/espace/EspaceParticulier';
import { flagActif } from '@/server/flags';

/** Lien « Suivre ma demande » des emails (`routes.demandeParticulier`). */
export default async function PageDemande({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <EspaceParticulier onglet="projets" demandeId={id} avecPlans={await flagActif('dessin')} />
  );
}
