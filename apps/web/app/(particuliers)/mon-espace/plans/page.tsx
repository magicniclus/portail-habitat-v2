import type { Metadata } from 'next';
import { MesPlans } from '@/features/dessin/MesPlans';
import { Onglets } from '@/features/espace/Onglets';
import { exigerDessin } from '@/server/pageDessin';

export const metadata: Metadata = { title: 'Mes plans', robots: { index: false } };

/** Mes plans (Dessin) : la session est vérifiée par chaque appel à `/api/dessin/*`. */
export default async function PageMesPlans() {
  await exigerDessin();
  return (
    <main className="mx-auto box-border grid w-full max-w-[1280px] gap-5.5 px-[clamp(18px,4vw,44px)] pt-[clamp(20px,3vw,36px)] pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="m-0 text-[clamp(28px,3.4vw,38px)] leading-[1.08]">Mes plans</h1>
        <Onglets actif="plans" avecPlans />
      </div>
      <MesPlans espace="particulier" />
    </main>
  );
}
