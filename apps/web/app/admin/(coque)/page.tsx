import type { Metadata } from 'next';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Tableau de bord' };

/** Tableau de bord (ADMIN §2.1) : indicateurs au lot 13b. */
export default async function TableauDeBordAdmin() {
  const s = await pageAdmin('/admin', 'tableau');
  return (
    <main className="grid gap-4 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Bonjour {s.nom.split(' ')[0]}</h1>
      <p className="m-0 text-base text-neutre-800">
        Les indicateurs du jour arrivent avec la file de travail.
      </p>
    </main>
  );
}
