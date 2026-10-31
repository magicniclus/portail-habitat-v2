import 'server-only';
import { peut, type ActionEquipe } from '@ph/core/equipe';
import { lireSessionPro } from './sessionPro';

export { pdfDuLienClient } from './devis';

/** Réponse PDF : téléchargement, jamais mis en cache par un intermédiaire. */
export function reponsePdf(pdf: Buffer, nom: string): Response {
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nom.replace(/[^\w.-]/g, '_')}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** PDF de l'entreprise active, pour un membre qui a l'une des permissions. */
export async function pdfPro(
  actions: ActionEquipe[],
  lire: (artisanId: string) => Promise<{ pdf: Buffer; nom: string } | null>,
): Promise<Response> {
  const s = await lireSessionPro();
  const active = s?.espace.active;
  if (!active || !actions.some((a) => peut(active.membre, a)))
    return new Response('Accès refusé.', { status: 403 });
  const r = await lire(active.artisanId);
  if (!r) return new Response('Le PDF est créé à l’envoi du document.', { status: 404 });
  return reponsePdf(r.pdf, r.nom);
}
