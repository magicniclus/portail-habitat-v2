import { definition, MODELES, type NomModele } from '@ph/core/notifications';
import { appAdmin } from '@ph/firebase/admin';
import { listerSequencesAdmin } from '@ph/firebase/admin-serveur';
import { EmptyState } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { CarteSequence } from '@/features/adminConversion/CarteSequence';
import { EditeurSequence } from '@/features/adminConversion/EditeurSequence';
import { CLASSES_PAGE, EnteteConversion } from '@/features/adminConversion/EnteteConversion';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Séquences' };

/** Modèles proposés dans une séquence : offres pro et relances. */
const MODELES_SEQUENCE = (Object.keys(MODELES) as NomModele[]).filter((m) =>
  ['offres_pro', 'relance'].includes(definition(m).categorie),
);

/** Séquences (CONV-05, CONV-06) : stockées dans `sequences/`, versionnées à chaque modification. */
export default async function SequencesConversion() {
  const s = await pageAdmin('/admin/conversion/sequences', 'conversion');
  const sequences = await listerSequencesAdmin(getFirestore(appAdmin()), maintenantServeur());
  const desactive = s.permissions.includes('conversion.configurer')
    ? undefined
    : 'Permission requise : conversion.configurer';
  return (
    <main className={CLASSES_PAGE}>
      <EnteteConversion actif="/admin/conversion/sequences" />
      <div>
        <EditeurSequence
          libelle="+ Nouvelle séquence"
          modeles={MODELES_SEQUENCE}
          desactive={desactive}
        />
      </div>
      {sequences.length ? (
        <div className="grid gap-4">
          {sequences.map((seq) => (
            <CarteSequence
              key={seq.id}
              seq={seq}
              modeles={MODELES_SEQUENCE}
              desactive={desactive}
              autres={sequences.filter((x) => x.id !== seq.id).map(({ id, nom }) => ({ id, nom }))}
            />
          ))}
        </div>
      ) : (
        <EmptyState titre="Aucune séquence">Créez-en une avec « Nouvelle séquence ».</EmptyState>
      )}
      <p className="m-0 text-sm text-neutre-700">
        Chaque séquence est stockée dans sequences/ et versionnée à chaque modification.
      </p>
    </main>
  );
}
