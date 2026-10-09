import 'server-only';
import { flag, FLAGS, type NomFlag, type ValeursFlags } from '@ph/core/flags';
import { appAdmin } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import { getFirestore } from 'firebase-admin/firestore';
import { cache } from 'react';
import { lire } from './lecture';

/**
 * Flags globaux (`config/flags`, modifiables en un clic depuis l'administration, D8) ; valeurs par
 * défaut de `@ph/core/flags` si Firestore est indisponible.
 */
async function lireGlobales(): Promise<ValeursFlags> {
  const brut = (await lire('config/flags', async () =>
    (await getFirestore(appAdmin()).doc(chemins.configFlags()).get()).get('valeurs'),
  )) as Record<string, unknown> | null | undefined;
  return Object.fromEntries(
    Object.keys(FLAGS)
      .filter((n) => typeof brut?.[n] === 'boolean')
      .map((n) => [n, brut![n] as boolean]),
  ) as ValeursFlags;
}

const globales = cache(lireGlobales);

let maintenance: { valeur: boolean; lueLe: number } | undefined;
/** 30 s en production ; 2 s sur émulateurs, pour que les tests ne gardent pas la maintenance. */
const RELECTURE_MS = process.env.FIRESTORE_EMULATOR_HOST ? 2000 : 30_000;
/**
 * Interrupteur « maintenance » de l'admin, pour `proxy.ts` : relu au plus toutes les 30 s par
 * instance (une lecture Firestore par requête serait trop chère). La variable `MAINTENANCE=1`
 * reste le recours si Firestore est indisponible.
 */
export async function maintenanceActive(maintenant = Date.now()): Promise<boolean> {
  if (process.env.MAINTENANCE === '1') return true;
  if (!maintenance || maintenant - maintenance.lueLe > RELECTURE_MS)
    maintenance = {
      valeur: flag('maintenance', { globales: await lireGlobales() }),
      lueLe: maintenant,
    };
  return maintenance.valeur;
}

export async function flagActif(nom: NomFlag): Promise<boolean> {
  return flag(nom, { globales: await globales() });
}
