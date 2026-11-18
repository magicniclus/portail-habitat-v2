import type { Metadata } from 'next';
import { MesPlans } from '@/features/dessin/MesPlans';
import { routes } from '@/lib/routes';
import { accesDessinPro } from '@/server/pageDessin';

export const metadata: Metadata = { title: 'Dessin', robots: { index: false } };

/** Plans de l'entreprise : partagés par l'équipe (propriétaire, gérant, collaborateur). */
export default async function PageDessinPro() {
  await accesDessinPro(routes.proDessin);
  return (
    <main className="grid gap-6 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">Dessin</h1>
      <MesPlans espace="entreprise" />
    </main>
  );
}
