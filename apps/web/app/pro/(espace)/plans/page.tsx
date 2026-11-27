import type { Metadata } from 'next';
import { MesPlans } from '@/features/dessin/MesPlans';
import { routes } from '@/lib/routes';
import { accesDessinPro } from '@/server/pageDessin';

export const metadata: Metadata = { title: 'Mes plans', robots: { index: false } };

/** Plans de l'entreprise : partagés par l'équipe (propriétaire, gérant, collaborateur). */
export default async function PagePlansPro() {
  await accesDessinPro(routes.proPlans);
  return (
    <main className="grid gap-6 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">Mes plans</h1>
      <MesPlans espace="entreprise" />
    </main>
  );
}
