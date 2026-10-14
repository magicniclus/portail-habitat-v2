import { FORMULE_ETAPE, formuleDeOffre, offreUrlDe } from '@ph/core/paiements';
import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

/**
 * Anciennes pages de paiement (`/pro/abonnement/premium|visibilite`, liens des emails déjà
 * envoyés) : redirigées vers la fenêtre de paiement de la formule qui les remplace (D60), code
 * personnel conservé.
 */
export default async function AncienPaiement({
  params,
  searchParams,
}: {
  params: Promise<{ produit: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { produit } = await params;
  const { code } = await searchParams;
  const formule =
    produit === 'premium' || produit === 'visibilite'
      ? FORMULE_ETAPE[produit]
      : formuleDeOffre(produit);
  const valide = code && /^[A-Z0-9]{4,24}$/.test(code) ? code : undefined;
  redirect(formule ? routes.proOffre(offreUrlDe(formule), valide) : routes.proAbonnement);
}
