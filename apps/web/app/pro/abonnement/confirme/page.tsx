import type { ProduitAbonnement } from '@ph/core/facturation';
import { Logo } from '@ph/ui';
import type { Metadata } from 'next';
import { AttenteConfirmation } from '@/features/abonnement/AttenteConfirmation';
import { sessionPro } from '@/server/sessionPro';

export const metadata: Metadata = { title: 'Paiement confirmé', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** Page de retour de Stripe Checkout : attend le webhook (PAY-01). */
export default async function PageConfirmation({
  searchParams,
}: {
  searchParams: Promise<{ produit?: string }>;
}) {
  const produit: ProduitAbonnement =
    (await searchParams).produit === 'visibilite' ? 'visibilite' : 'premium';
  const s = await sessionPro(`/pro/abonnement/confirme?produit=${produit}`);
  const a = s.espace.active?.artisan;
  const zone = a ? [a.ville, a.rayonKm ? `${a.rayonKm} km` : ''].filter(Boolean).join(' · ') : '';
  return (
    <div className="min-h-dvh bg-blanc">
      <header className="border-b border-trait px-4 py-3">
        <Logo variant="pro" />
      </header>
      <main className="mx-auto w-full max-w-[560px] px-4 py-10">
        <AttenteConfirmation produit={produit} zone={zone} />
      </main>
    </div>
  );
}
