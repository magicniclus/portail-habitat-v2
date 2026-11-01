import 'server-only';
import { publierFiche } from '@ph/firebase/annuaire';
import { revalidatePath } from 'next/cache';
import { entrepriseAutorisee, servicesDemandesPro } from './demandesPro';

/**
 * Fiche publique `artisansPublic/{id}` recalculée aussitôt par le serveur après une modification
 * de Ma fiche (même règle que le déclencheur `projeterArtisan`, idempotente) : la fiche apparaît
 * dans l'annuaire même quand les Functions ne tournent pas (développement, déploiement en retard).
 */
export async function republierFiche(artisanId: string): Promise<void> {
  try {
    const r = await publierFiche(servicesDemandesPro(), artisanId);
    if (r.statut === 'invalide')
      console.error(
        `Fiche publique de ${artisanId} non mise à jour (données invalides) : ${r.erreur}`,
      );
    if (r.statut === 'publiee') revalidatePath(`/artisans/${r.fiche.slug}`);
  } catch (e) {
    console.error(`Fiche publique de ${artisanId} non mise à jour`, e);
  }
}

/** Écriture de Ma fiche (droit `fiche.modifier`), puis fiche publique recalculée. */
export async function ecrireFiche<R>(
  uid: string,
  ecrire: (ctx: { artisanId: string; uid: string }) => Promise<R>,
): Promise<R> {
  const ctx = { artisanId: await entrepriseAutorisee(uid, 'fiche.modifier'), uid };
  const r = await ecrire(ctx);
  await republierFiche(ctx.artisanId);
  return r;
}
