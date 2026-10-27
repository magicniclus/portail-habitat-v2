import { appAdmin } from '@ph/firebase/admin';
import { lireDevisComplet } from '@ph/firebase/devis';
import { getFirestore } from 'firebase-admin/firestore';
import { lirePdf, pdfBrouillonDevis } from '@/server/devis';
import { pdfPro } from '@/server/devisPdf';

export const dynamic = 'force-dynamic';

/**
 * « Télécharger le PDF » (DEV-05) : le fichier stocké à la validation, jamais régénéré ; pour un
 * brouillon, un PDF de travail marqué « Brouillon », produit à la demande.
 */
export const GET = (_: Request, { params }: { params: Promise<{ id: string }> }) =>
  pdfPro(['devis.gerer'], async (artisanId) => {
    const id = (await params).id;
    const d = await lireDevisComplet(getFirestore(appAdmin()), artisanId, id);
    if (!d) return null;
    if (d.pdfPath) return { pdf: await lirePdf(d.pdfPath), nom: d.numero };
    const brouillon = await pdfBrouillonDevis(artisanId, id);
    return brouillon ? { pdf: brouillon, nom: `${d.numero}-brouillon` } : null;
  });
