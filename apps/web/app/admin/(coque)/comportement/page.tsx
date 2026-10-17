import { LARGEURS_REFERENCE, PAGES_COMPORTEMENT } from '@ph/core/comportement';
import { appAdmin } from '@ph/firebase/admin';
import {
  lireAlertesComportement,
  lireVueComportement,
  listerReplays,
} from '@ph/firebase/admin-serveur';
import { EmptyState } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { EcranCartes } from '@/features/adminComportement/EcranCartes';
import { EcranReplays } from '@/features/adminComportement/EcranReplays';
import { EnteteComportement } from '@/features/adminComportement/EnteteComportement';
import { lireFiltres } from '@/features/adminComportement/filtres';
import { PanneauIndicateurs } from '@/features/adminComportement/PanneauIndicateurs';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Comportement' };

type Params = Promise<Record<string, string | string[] | undefined>>;

/** Back-office › Comportement (COMPORTEMENT §6) : un agrégat pré-cumulé lu par affichage. */
export default async function ComportementAdmin({ searchParams }: { searchParams: Params }) {
  const session = await pageAdmin('/admin/comportement', 'comportement');
  const f = lireFiltres(await searchParams);
  const peut = (p: string) => session.permissions.includes(p);
  const replays = peut('comportement.replays');
  const db = getFirestore(appAdmin());
  const { nom, chemin } = PAGES_COMPORTEMENT[f.page];
  const largeur = LARGEURS_REFERENCE[f.appareil];

  let contenu;
  if (f.onglet === 'replays' && replays) {
    contenu = (
      <EcranReplays
        chemin={chemin}
        replays={await listerReplays(db, f.page, f.appareil)}
        maintenant={maintenantServeur()}
      />
    );
  } else {
    const [vue, alertes] = await Promise.all([
      lireVueComportement(db, f),
      lireAlertesComportement(db, f.page),
    ]);
    contenu = vue?.sessions ? (
      <EcranCartes
        chemin={chemin}
        largeur={largeur}
        donnees={{
          sessions: vue.sessions,
          grilleClics: vue.grilleClics,
          grilleAttention: vue.grilleAttention,
          grilleMouvements: vue.grilleMouvements,
          scroll: vue.scroll,
          sections: vue.sections,
          elements: vue.elements,
          sorties: vue.sorties,
        }}
        panneau={
          <PanneauIndicateurs
            vue={vue}
            alertes={alertes}
            nomPage={nom}
            contexte={`${f.appareil}, ${f.periode.replace('j', ' j')}`}
            peutConfigurer={peut('comportement.configurer')}
            peutIa={peut('ia.utiliser')}
          />
        }
      />
    ) : (
      <EmptyState titre="Pas encore de données pour cette page">
        Les cartes apparaissent après la première nuit d’agrégation (3 h), à partir des visiteurs
        qui ont accepté la mesure détaillée.
      </EmptyState>
    );
  }
  return (
    <main className="flex min-w-0 flex-col gap-4">
      <EnteteComportement f={f} replays={replays} />
      {contenu}
    </main>
  );
}
