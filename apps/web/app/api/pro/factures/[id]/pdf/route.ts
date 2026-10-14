import { appAdmin } from '@ph/firebase/admin';
import { lireFactureComplete } from '@ph/firebase/devis';
import { getFirestore } from 'firebase-admin/firestore';
import { lirePdf } from '@/server/devis';
import { pdfPro } from '@/server/devisPdf';

export const dynamic = 'force-dynamic';

/** PDF d'une facture ou d'un avoir, produit une fois à l'émission. */
export const GET = (_: Request, { params }: { params: Promise<{ id: string }> }) =>
  pdfPro(['factures.emettre', 'factures.voir'], async (artisanId) => {
    const f = await lireFactureComplete(getFirestore(appAdmin()), artisanId, (await params).id);
    return f?.pdfPath ? { pdf: await lirePdf(f.pdfPath), nom: f.numero } : null;
  });
