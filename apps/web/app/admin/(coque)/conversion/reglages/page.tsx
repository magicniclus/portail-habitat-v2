import { appAdmin } from '@ph/firebase/admin';
import { lireReglagesCycle } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { CLASSES_PAGE, EnteteConversion } from '@/features/adminConversion/EnteteConversion';
import { FormulaireReglages } from '@/features/adminConversion/FormulaireReglages';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Réglages de conversion' };

/** Réglages du moteur de conversion (`config/cycle`, permission conversion.configurer). */
export default async function ReglagesConversion() {
  const s = await pageAdmin('/admin/conversion/reglages', 'conversion');
  const actuel = await lireReglagesCycle(getFirestore(appAdmin()));
  return (
    <main className={CLASSES_PAGE}>
      <EnteteConversion actif="/admin/conversion/reglages" />
      <FormulaireReglages
        actuel={actuel}
        peutConfigurer={s.permissions.includes('conversion.configurer')}
      />
    </main>
  );
}
