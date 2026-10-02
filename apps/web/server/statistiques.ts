import 'server-only';
import { statistiquesPro, type PeriodeStats } from '@ph/core/espace-pro';
import { jourIso } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { lireStatsJours } from '@ph/firebase/pro';
import { getFirestore } from 'firebase-admin/firestore';

const JOUR_MS = 86_400_000;

/** Statistiques de la fiche sur la période (un an de `statsJour` au plus). */
export async function statistiquesFiche(artisanId: string, periode: PeriodeStats) {
  const maintenant = Date.now();
  const jours = await lireStatsJours(
    getFirestore(appAdmin()),
    artisanId,
    jourIso(maintenant - 366 * JOUR_MS),
  );
  return statistiquesPro(jours, periode, jourIso(maintenant));
}
