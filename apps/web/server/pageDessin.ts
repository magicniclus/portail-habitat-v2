import 'server-only';
import { peut } from '@ph/core/equipe';
import { notFound, redirect } from 'next/navigation';
import { routes } from '@/lib/routes';
import { flagActif } from './flags';
import { sessionPro } from './sessionPro';

/** Pages Dessin : introuvables tant que le flag `dessin` est inactif (DESSIN.md §1). */
export async function exigerDessin(): Promise<void> {
  if (!(await flagActif('dessin'))) notFound();
}

/** Espace pro : session, entreprise active et permission `dessin.gerer`. */
export async function accesDessinPro(suite: string): Promise<void> {
  await exigerDessin();
  const s = await sessionPro(suite);
  const active = s.espace.active;
  if (!active || !peut(active.membre, 'dessin.gerer')) redirect(routes.proTableauDeBord);
}
