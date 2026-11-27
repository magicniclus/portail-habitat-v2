import { appAdmin } from '@ph/firebase/admin';
import { listerComptesStudio, publicationsProjetStudio } from '@ph/firebase/studio';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EtapeExport } from '@/features/studio/EtapeExport';
import { EtapePublication } from '@/features/studio/EtapePublication';
import { projetStudioPage } from '@/features/studio/projetPage';

export const metadata: Metadata = { title: 'Studio · publication' };

export default async function PublicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getFirestore(appAdmin());
  const [p, comptes, publications] = await Promise.all([
    projetStudioPage(id, 'publication'),
    listerComptesStudio(db),
    publicationsProjetStudio(db, id),
  ]);
  if (!p.rendu) notFound();
  return (
    <div className="grid gap-4">
      <EtapeExport rendu={p.rendu} sujet={p.sujet} />
      <EtapePublication
        projetId={p.id}
        sujet={p.sujet}
        titre={p.titre}
        comptes={comptes}
        publications={publications}
        variantes={Object.entries(p.rendu.variantes ?? {}).map(([vid, v]) => ({
          id: vid,
          accroche: v.accroche,
        }))}
      />
    </div>
  );
}
