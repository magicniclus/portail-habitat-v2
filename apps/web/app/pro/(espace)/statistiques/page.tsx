import { PERIODES_STATS, type PeriodeStats } from '@ph/core/espace-pro';
import { peut } from '@ph/core/equipe';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OffreStatistiques } from '@/features/statistiques/OffreStatistiques';
import { Statistiques } from '@/features/statistiques/Statistiques';
import { routes } from '@/lib/routes';
import { sessionPro } from '@/server/sessionPro';
import { statistiquesFiche } from '@/server/statistiques';

export const metadata: Metadata = { title: 'Statistiques', robots: { index: false } };

/** Maquette Statistiques ; réservée aux Premium (PRO-07). */
export default async function PageStatistiques({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const s = await sessionPro(routes.proStatistiques);
  const active = s.espace.active;
  if (!active || !peut(active.membre, 'statistiques.voir')) redirect(routes.proTableauDeBord);
  const premium = active.artisan.plan === 'premium';
  const p = (await searchParams).periode;
  const periode: PeriodeStats = PERIODES_STATS.includes(p as PeriodeStats)
    ? (p as PeriodeStats)
    : '30j';
  const stats = premium ? await statistiquesFiche(active.artisanId, periode) : null;
  return (
    <main className="grid gap-6 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <div>
        <h1 className="m-0 mb-1.5 text-[clamp(26px,3vw,34px)] leading-[1.1]">
          Statistiques de votre fiche
        </h1>
        <p className="m-0 text-base text-neutre-800">
          Qui consulte votre fiche, et ce que ces visites vous rapportent.
        </p>
      </div>
      {stats ? (
        <Statistiques s={stats} periode={periode} />
      ) : (
        <OffreStatistiques peutSouscrire={peut(active.membre, 'abonnement.gerer')} />
      )}
    </main>
  );
}
