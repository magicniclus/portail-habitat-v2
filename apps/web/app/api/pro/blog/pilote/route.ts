import { entreePiloteBlog } from '@ph/core/schemas';
import { reglerPilote, remplacerSujetPilote } from '@ph/firebase/blog';
import { clientAnthropic } from '@ph/firebase/ia';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Pilote automatique (D70) : réglage (2 par semaine en Tout inclus seulement) ou « Autre sujet ». */
export const POST = routeSite('piloteBlog', entreePiloteBlog, async (s, ctx, e) => {
  const cle = process.env.ANTHROPIC_API_KEY;
  const si = { ...s, client: cle ? clientAnthropic(cle) : null };
  return e.action === 'regler'
    ? reglerPilote(si, ctx, { actif: e.actif, rythme: e.rythme })
    : remplacerSujetPilote(si, ctx, { index: e.index });
});
