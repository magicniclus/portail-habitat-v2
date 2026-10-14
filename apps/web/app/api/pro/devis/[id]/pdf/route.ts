import { appAdmin } from '@ph/firebase/admin';
import { lireDevisComplet } from '@ph/firebase/devis';
import { getFirestore } from 'firebase-admin/firestore';
import { lirePdf } from '@/server/devis';
import { pdfPro } from '@/server/devisPdf';

export const dynamic = 'force-dynamic';

/** « Télécharger le PDF » (DEV-05) : le fichier stocké à l'envoi, jamais un aperçu régénéré. */
export const GET = (_: Request, { params }: { params: Promise<{ id: string }> }) =>
  pdfPro(['devis.gerer'], async (artisanId) => {
    const d = await lireDevisComplet(getFirestore(appAdmin()), artisanId, (await params).id);
    return d?.pdfPath ? { pdf: await lirePdf(d.pdfPath), nom: d.numero } : null;
  });
