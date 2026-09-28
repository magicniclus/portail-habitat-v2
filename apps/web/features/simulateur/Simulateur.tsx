'use client';

import type { DemandeCreee } from '@ph/core/demandes';
import { valeursParDefaut } from '@ph/core/parcours/reponses';
import {
  etapeDepuisUrl,
  etapePrecedente,
  etapeSuivante,
  JALONS_SIMULATEUR,
} from '@ph/core/simulateur';
import { Stepper } from '@ph/ui';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { Contact } from './EtapeCoordonnees';
import { EtapePrestation } from './EtapePrestation';
import { EtapeQuestions } from './EtapeQuestions';
import type { CatalogueSimulateur, Chantier, PrestationSimulateur, Reponses } from './types';

// Validation (Zod) et résultat chargés à la demande : la page, préchargée depuis l'accueil, reste
// légère (budget D46).
const EtapeCoordonnees = dynamic(() =>
  import('./EtapeCoordonnees').then((m) => m.EtapeCoordonnees),
);
const Resultat = dynamic(() => import('./Resultat').then((m) => m.Resultat));

const DELAIS = new Set(['asap', '1mois', '3mois', 'renseignement']);

/**
 * Simulateur (COMPTES §6.1) : l'étape et la prestation sont dans l'URL (`?prestation=&etape=`,
 * SIM-02), le bouton précédent du navigateur revient donc à l'étape précédente. Aucun prix n'est
 * connu du navigateur avant l'envoi : l'estimation arrive dans la réponse de `creerDemande`.
 */
export function Simulateur({ catalogue }: { catalogue: CatalogueSimulateur }) {
  const router = useRouter();
  const params = useSearchParams();
  const prestation = catalogue.prestations.find((p) => p.id === params.get('prestation')) ?? null;
  const etape = etapeDepuisUrl(params.get('etape'), prestation?.champs ?? null);

  // Contexte d'arrivée (hero de l'accueil, RECHERCHE §3), lu une fois.
  const [arrivee] = useState(() => ({
    intention: params.get('intention') ?? undefined,
    delai: DELAIS.has(params.get('delai') ?? '') ? (params.get('delai') ?? undefined) : undefined,
    projet: params.get('projet') ?? '',
    source:
      params.get('intention') || params.get('projet') ? ('hero' as const) : ('simulateur' as const),
  }));
  const [intention, setIntention] = useState(arrivee.intention);
  const [reponses, setReponses] = useState<Record<string, Reponses>>({});
  const [chantier, setChantier] = useState<Chantier>(() => ({
    codePostal: (params.get('cp') ?? '').replace(/\D/g, '').slice(0, 5),
    acces: 'facile',
  }));
  const [envoi, setEnvoi] = useState<{
    demande: DemandeCreee;
    contact: Contact;
    miseEnRelation: boolean;
  } | null>(null);

  const aller = (p: PrestationSimulateur | null, n: number) => {
    const q = new URLSearchParams(params.toString());
    q.delete('etape');
    if (p) {
      q.set('prestation', p.id);
      q.set('etape', String(n));
    } else q.delete('prestation');
    router.push(`?${q}` as Route, { scroll: true });
  };

  const choisir = (p: PrestationSimulateur) => {
    if (p.lien) {
      router.push(p.lien as Route);
      return;
    }
    // Changer de prestation : l'intention d'arrivée ne s'applique plus.
    if (p.id !== params.get('prestation')) setIntention(undefined);
    aller(p, 2);
  };

  if (envoi && prestation)
    return (
      <Resultat
        demande={envoi.demande}
        contact={envoi.contact}
        chantier={chantier}
        miseEnRelation={envoi.miseEnRelation}
        onRecommencer={() => {
          setEnvoi(null);
          setReponses({});
          aller(null, 1);
        }}
      />
    );

  const courantes = prestation
    ? { ...valeursParDefaut(prestation.champs), ...reponses[prestation.id] }
    : {};

  return (
    <>
      <Stepper etapes={JALONS_SIMULATEUR} courante={etape - 1} className="mb-6" />
      {!prestation ? (
        <EtapePrestation
          catalogue={catalogue}
          rechercheInitiale={arrivee.projet}
          choisie={null}
          onChoisir={choisir}
        />
      ) : etape === 5 ? (
        <EtapeCoordonnees
          prestation={prestation}
          reponses={courantes}
          chantier={chantier}
          contexte={{ ...arrivee, intention }}
          onEnvoye={(demande, contact, miseEnRelation) => {
            setEnvoi({ demande, contact, miseEnRelation });
            window.scrollTo(0, 0);
          }}
          onPrecedent={() => aller(prestation, etapePrecedente(5, prestation.champs))}
          onChanger={() => aller(null, 1)}
        />
      ) : (
        <EtapeQuestions
          etape={etape as 2 | 3 | 4}
          prestation={prestation}
          reponses={courantes}
          chantier={chantier}
          onReponse={(id, v) =>
            setReponses((r) => ({ ...r, [prestation.id]: { ...courantes, [id]: v } }))
          }
          onChantier={setChantier}
          onSuivant={() => aller(prestation, etapeSuivante(etape, prestation.champs))}
          onPrecedent={() =>
            etape === 2
              ? aller(null, 1)
              : aller(prestation, etapePrecedente(etape, prestation.champs))
          }
          onChanger={() => aller(null, 1)}
        />
      )}
    </>
  );
}
