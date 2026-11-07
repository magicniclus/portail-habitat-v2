'use client';

import type { DemandeEspace } from '@ph/firebase/espace';
import { Banner, Skeleton } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { routes } from '@/lib/routes';
import { chargerEspace, type ProfilEspace } from './api';
import { MesAvis } from './MesAvis';
import { MesProjets } from './MesProjets';
import { MonCompte } from './MonCompte';
import { Onglets, type Onglet } from './Onglets';

type Etat =
  | { etat: 'chargement' }
  | { etat: 'erreur'; message: string }
  | { etat: 'pret'; profil: ProfilEspace; demandes: DemandeEspace[] };

/**
 * Maquette Mon Espace Particulier : les données viennent des routes `/api/mon-espace/*`, qui
 * vérifient la session à chaque appel ; une session expirée renvoie vers la connexion.
 */
export function EspaceParticulier({ onglet, demandeId }: { onglet: Onglet; demandeId?: string }) {
  const router = useRouter();
  const [e, setE] = useState<Etat>({ etat: 'chargement' });

  useEffect(() => {
    let actif = true;
    void chargerEspace().then((r) => {
      if (!actif) return;
      if (r.ok) setE({ etat: 'pret', ...r.data });
      else if (r.code === 'NON_AUTHENTIFIE')
        router.replace(routes.connexionSuite(window.location.pathname));
      else setE({ etat: 'erreur', message: r.message });
    });
    return () => {
      actif = false;
    };
  }, [router]);

  const prenom = e.etat === 'pret' ? e.profil.prenom : null;
  return (
    <main className="mx-auto box-border grid w-full max-w-[1280px] gap-5.5 px-[clamp(18px,4vw,44px)] pt-[clamp(20px,3vw,36px)] pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 mb-1.5 text-[clamp(28px,3.4vw,38px)] leading-[1.08]">
            {prenom ? `Bonjour ${prenom}` : 'Mon espace'}
          </h1>
          <p className="m-0 text-[16.5px] leading-normal text-neutre-800">
            Suivez vos projets, comparez les devis et échangez avec les artisans.
          </p>
        </div>
        <Onglets actif={onglet} />
      </div>
      {e.etat === 'chargement' ? (
        <div aria-busy="true" aria-label="Chargement de votre espace" className="grid gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : e.etat === 'erreur' ? (
        <Banner tone="danger">{e.message}</Banner>
      ) : onglet === 'projets' ? (
        <MesProjets demandes={e.demandes} demandeId={demandeId} />
      ) : onglet === 'avis' ? (
        <MesAvis />
      ) : (
        <MonCompte profil={e.profil} />
      )}
    </main>
  );
}
