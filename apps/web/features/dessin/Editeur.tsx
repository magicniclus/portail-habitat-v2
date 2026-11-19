'use client';

import type { Scene } from '@ph/core/dessin';
import { Banner, Button, Skeleton } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { routes } from '@/lib/routes';
import { lirePlan, type EspaceDessin } from './api';
import { lireBrouillon, type Brouillon } from './brouillons';
import { EspaceDeTravail } from './EspaceDeTravail';

type Chargement =
  | { etat: 'chargement' }
  | { etat: 'erreur'; message: string }
  | {
      etat: 'pret';
      titre: string;
      versionCourante: number;
      scene: Scene;
      brouillon: Brouillon | null;
    };

/**
 * Éditeur Dessin (DESSIN.md §7) : charge le plan par `/api/dessin/lire` (session vérifiée),
 * propose de reprendre un brouillon hors ligne plus récent, puis ouvre l'espace de travail.
 */
export function Editeur({ espace, planId }: { espace: EspaceDessin; planId: string }) {
  const router = useRouter();
  const [c, setC] = useState<Chargement>({ etat: 'chargement' });
  const [cle, setCle] = useState(0);
  const retour = espace === 'particulier' ? routes.monEspacePlans : routes.proPlans;

  useEffect(() => {
    let actif = true;
    void Promise.all([lirePlan(espace, planId), lireBrouillon(planId)]).then(([r, b]) => {
      if (!actif) return;
      if (r.ok)
        setC({
          etat: 'pret',
          ...r.data,
          brouillon: b && b.revision === r.data.versionCourante ? b : null,
        });
      else if (r.code === 'NON_AUTHENTIFIE')
        router.replace(routes.connexionSuite(window.location.pathname));
      else setC({ etat: 'erreur', message: r.message });
    });
    return () => {
      actif = false;
    };
  }, [espace, planId, router, cle]);

  if (c.etat === 'chargement')
    return (
      <div aria-busy="true" aria-label="Ouverture du plan" className="grid flex-1 gap-3 p-6">
        <Skeleton className="h-14" />
        <Skeleton className="h-[60vh]" />
      </div>
    );
  if (c.etat === 'erreur')
    return (
      <div className="p-6">
        <Banner
          tone="danger"
          action={<Button onClick={() => setCle((x) => x + 1)}>Réessayer</Button>}
        >
          {c.message}
        </Banner>
      </div>
    );
  if (c.brouillon)
    return (
      <div className="mx-auto grid max-w-xl gap-4 p-6">
        <Banner tone="attention" titre="Des modifications n’ont pas été enregistrées">
          Ce plan a été modifié sur cet appareil sans connexion. Voulez-vous reprendre ces
          modifications ?
        </Banner>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setC({ ...c, scene: c.brouillon!.scene, brouillon: null })}>
            Reprendre mes modifications
          </Button>
          <Button variant="secondaire" onClick={() => setC({ ...c, brouillon: null })}>
            Ouvrir la version enregistrée
          </Button>
        </div>
      </div>
    );
  return (
    <EspaceDeTravail
      espace={espace}
      planId={planId}
      titre={c.titre}
      scene={c.scene}
      revision={c.versionCourante}
      retour={retour}
    />
  );
}
