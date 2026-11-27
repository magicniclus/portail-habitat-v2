import { pdfDuLienClient, reponsePdf } from '@/server/devisPdf';

export const dynamic = 'force-dynamic';

/** Lien reçu par email par le client de l'artisan : la facture relancée, rien d'autre. */
export async function GET(_: Request, { params }: { params: Promise<{ lien: string }> }) {
  const r = await pdfDuLienClient((await params).lien, 'facture');
  if (!r) return new Response('Lien invalide ou expiré.', { status: 404 });
  const rep = reponsePdf(r.pdf, r.numero);
  // Le lien ne doit pas fuiter par l'en-tête Referer.
  rep.headers.set('Referrer-Policy', 'no-referrer');
  return rep;
}
