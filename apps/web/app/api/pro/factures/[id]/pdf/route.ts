import { appAdmin } from '@ph/firebase/admin';
import { lireFactureComplete } from '@ph/firebase/devis';
import { getFirestore } from 'firebase-admin/firestore';
import { lirePdf, pdfBrouillonFacture } from '@/server/devis';
import { pdfPro } from '@/server/devisPdf';

export const dynamic = 'force-dynamic';

/**
 * PDF d'une facture ou d'un avoir, produit une fois à l'émission ; brouillon : PDF de travail
 * marqué « Brouillon », produit à la demande.
 */
export const GET = (_: Request, { params }: { params: Promise<{ id: string }> }) =>
  pdfPro(['factures.emettre', 'factures.voir'], async (artisanId) => {
    const id = (await params).id;
    const f = await lireFactureComplete(getFirestore(appAdmin()), artisanId, id);
    if (!f) return null;
    if (f.pdfPath) return { pdf: await lirePdf(f.pdfPath), nom: f.numero };
    const brouillon = await pdfBrouillonFacture(artisanId, id);
    return brouillon ? { pdf: brouillon, nom: 'facture-brouillon' } : null;
  });
