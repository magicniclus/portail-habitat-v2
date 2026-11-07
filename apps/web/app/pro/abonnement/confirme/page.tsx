import { droitsDe, FORMULES_PAYANTES, type FormulePayante } from '@ph/core/paiements';
import { appAdmin } from '@ph/firebase/admin';
import { lireCreationIa } from '@ph/firebase/sites';
import { getFirestore } from 'firebase-admin/firestore';
import { Logo } from '@ph/ui';
import type { Metadata } from 'next';
import { AttenteConfirmation } from '@/features/abonnement/AttenteConfirmation';
import { routes } from '@/lib/routes';
import { sessionPro } from '@/server/sessionPro';

export const metadata: Metadata = { title: 'Paiement confirmé', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** Page de retour de Stripe Checkout : attend le webhook (PAY-01). */
export default async function PageConfirmation({
  searchParams,
}: {
  searchParams: Promise<{ produit?: string; mode?: string }>;
}) {
  const q = await searchParams;
  const produit: FormulePayante = FORMULES_PAYANTES.includes(q.produit as FormulePayante)
    ? (q.produit as FormulePayante)
    : 'fiche_pro';
  const descente = q.mode === 'descente';
  const s = await sessionPro(`/pro/abonnement/confirme?produit=${produit}`);
  const a = s.espace.active?.artisan;
  // Création du site commencée en aperçu gratuit : retour direct dans l'éditeur (IA_SITE §4).
  const creation =
    a && droitsDe(produit).iaSite === 'complet'
      ? await lireCreationIa(getFirestore(appAdmin()), s.espace.active!.artisanId)
      : null;
  const zone = a ? [a.ville, a.rayonKm ? `${a.rayonKm} km` : ''].filter(Boolean).join(' · ') : '';
  return (
    <div className="min-h-dvh bg-blanc">
      <header className="border-b border-trait px-4 py-3">
        <Logo variant="pro" />
      </header>
      <main className="mx-auto w-full max-w-[560px] px-4 py-10">
        <AttenteConfirmation
          produit={produit}
          zone={zone}
          descente={descente}
          {...(creation?.statut === 'attente_paiement'
            ? {
                suite: {
                  href: routes.proSiteRepriseIa,
                  libelle: 'Terminer la création de mon site',
                },
              }
            : {})}
        />
      </main>
    </div>
  );
}
