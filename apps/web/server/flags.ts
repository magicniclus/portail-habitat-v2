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
let relecture: Promise<void> | undefined;
/** 30 s en production ; 2 s sur émulateurs, pour que les tests ne gardent pas la maintenance. */
const RELECTURE_MS = process.env.FIRESTORE_EMULATOR_HOST ? 2000 : 30_000;
/** Première lecture d'une instance : jamais plus de 300 ms d'attente pour une page. */
const ATTENTE_MAX_MS = 300;

function relire(maintenant: number): Promise<void> {
  relecture ??= lireGlobales()
    .then((g) => {
      maintenance = { valeur: flag('maintenance', { globales: g }), lueLe: maintenant };
    })
    .finally(() => {
      relecture = undefined;
    });
  return relecture;
}

/**
 * Interrupteur « maintenance » de l'admin, pour `proxy.ts`. La page n'attend jamais la base : la
 * dernière valeur connue sert tout de suite et la relecture (toutes les 30 s) se fait en
 * arrière-plan. La variable `MAINTENANCE=1` reste le recours si Firestore est indisponible.
 */
export async function maintenanceActive(maintenant = Date.now()): Promise<boolean> {
  if (process.env.MAINTENANCE === '1') return true;
  if (!maintenance || maintenant - maintenance.lueLe > RELECTURE_MS) {
    const r = relire(maintenant);
    if (!maintenance) await Promise.race([r, new Promise((ok) => setTimeout(ok, ATTENTE_MAX_MS))]);
  }
  return maintenance?.valeur ?? false;
}

export async function flagActif(nom: NomFlag): Promise<boolean> {
  return flag(nom, { globales: await globales() });
}
