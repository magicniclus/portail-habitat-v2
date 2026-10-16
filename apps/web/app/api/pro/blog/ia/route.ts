import { entreeIaBlog } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { demanderIaBlog, lireClassement } from '@ph/firebase/blog';
import { clientAnthropic } from '@ph/firebase/ia';
import { getFirestore } from 'firebase-admin/firestore';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';
// Une rédaction complète peut demander plusieurs dizaines de secondes au modèle.
export const maxDuration = 120;

/** IA du blog (BLOG §2) : droits, crédits et faits vérifiés côté serveur ; rien n'est enregistré. */
export const POST = routeSite('demanderIaBlog', entreeIaBlog, async (s, ctx, e) => {
  const cle = process.env.ANTHROPIC_API_KEY;
  const { categories } = await lireClassement(getFirestore(appAdmin()), ctx.artisanId);
  const { sujet, type, longueur, chantiers, ...reste } = e;
  return demanderIaBlog({ ...s, client: cle ? clientAnthropic(cle) : null }, ctx, {
    ...reste,
    ...(sujet ? { sujet } : {}),
    ...(type ? { type } : {}),
    ...(longueur ? { longueur } : {}),
    ...(chantiers !== undefined ? { chantiers } : {}),
    categories: categories.map((c) => c.nom),
  });
});
