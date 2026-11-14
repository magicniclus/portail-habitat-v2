import type { Metadata } from 'next';
import { LaisserAvis } from '@/features/avis/LaisserAvis';
import type { ArtisanAvis } from '@/features/avis/types';
import { PageParcours } from '@/features/parcours/PageParcours';
import { lireFiche } from '@/server/annuaire';

export const metadata: Metadata = {
  title: 'Laisser un avis sur un artisan',
  description:
    'Donnez votre avis sur l’artisan qui a réalisé vos travaux : chaque avis est vérifié avant publication.',
  alternates: { canonical: '/avis' },
};

/** Entreprise du lien envoyé par l'artisan (`?entreprise=slug`) : fiche en ligne seulement. */
async function entrepriseDuLien(slug: string | undefined): Promise<ArtisanAvis | null> {
  if (!slug || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const f = await lireFiche(slug);
  return f
    ? {
        id: f.id,
        nom: f.fiche.nomCommercial,
        ville: f.fiche.ville,
        metier: f.fiche.metierPrincipal,
        note: f.fiche.noteMoyenne,
        nbAvis: f.fiche.nbAvis,
      }
    : null;
}

/**
 * Maquette Laisser un Avis : choix de l'artisan, avis, publication. Lien envoyé par l'artisan :
 * le formulaire s'ouvre directement sur son entreprise.
 */
export default async function PageAvis({
  searchParams,
}: {
  searchParams: Promise<{ entreprise?: string }>;
}) {
  const artisan = await entrepriseDuLien((await searchParams).entreprise);
  return (
    <PageParcours titre={artisan ? `Votre avis sur ${artisan.nom}` : 'Laisser un avis'}>
      <LaisserAvis {...(artisan ? { artisan } : {})} />
    </PageParcours>
  );
}
