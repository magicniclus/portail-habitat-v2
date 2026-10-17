'use client';

import { analyser, lignesPubliques, resumeDossier } from '@ph/core/diagnostic';
import type { DossierCree } from '@ph/firebase/demandes';
import { Stepper } from '@ph/ui';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { EtapeBien } from './EtapeBien';
import { EtapeExistants, type Existants } from './EtapeExistants';
import {
  BIEN_DEFAUT,
  libelle,
  MOTIFS_BIEN,
  PERIODES_BIEN,
  TYPES_BIEN,
  type Bien,
  type DonneesParcoursDiag,
} from './types';

// Validation (Zod) et résultat chargés à la demande.
const EtapeDossier = dynamic(() => import('./EtapeDossier').then((m) => m.EtapeDossier));
const ResultatDiag = dynamic(() => import('./ResultatDiag').then((m) => m.ResultatDiag));

const dans = <T extends { v: string }>(liste: readonly T[], v: string | null) =>
  liste.find((x) => x.v === v)?.v;

/** Préremplissage `?motif&type&periode&ville` (DIA-01, pages communes et accueil diagnostic). */
function bienDepuisUrl(p: URLSearchParams, communes: DonneesParcoursDiag['communes']): Bien {
  const c = communes.find((x) => x.id === p.get('ville'));
  return {
    ...BIEN_DEFAUT,
    ...(c ? { communeSlug: c.id, codePostal: c.cp ?? '' } : {}),
    motif: (dans(MOTIFS_BIEN, p.get('motif')) ?? BIEN_DEFAUT.motif) as Bien['motif'],
    type: (dans(TYPES_BIEN, p.get('type')) ?? BIEN_DEFAUT.type) as Bien['type'],
    periode: (dans(PERIODES_BIEN, p.get('periode')) ?? BIEN_DEFAUT.periode) as Bien['periode'],
  };
}

/**
 * Parcours diagnostic (maquette Parcours Diagnostic) : la liste des diagnostics obligatoires est
 * calculée ici (gratuite), sans aucun prix ; le budget vient de la réponse du serveur (DIA-06).
 */
export function ParcoursDiag({ donnees }: { donnees: DonneesParcoursDiag }) {
  const params = useSearchParams();
  const [bien, setBien] = useState<Bien>(() => bienDepuisUrl(params, donnees.communes));
  const [etape, setEtape] = useState(1);
  const [existants, setExistants] = useState<Existants>({});
  const [envoi, setEnvoi] = useState<{
    dossier: DossierCree;
    contact: { nom: string; email: string; telephone: string };
  } | null>(null);

  const commune = donnees.communes.find((c) => c.id === bien.communeSlug);
  const contexte = { ...bien, presquile: commune?.presquile ?? false };
  const actifs = Object.entries(existants)
    .filter(([, x]) => x.actif)
    .map(([diagId, x]) => ({ diagId, annee: x.annee }));
  const obligatoires = analyser(contexte, [], donnees.referentiel).resultat.filter(
    (l) => l.statut !== 'conseille',
  );
  const dossier = analyser(contexte, actifs, donnees.referentiel).resultat;
  const resumeBien = `${libelle(TYPES_BIEN, bien.type)} · ${libelle(PERIODES_BIEN, bien.periode)} · ${bien.surface} m² · ${commune?.nom ?? ''}`;
  const aller = (n: number) => {
    setEtape(n);
    window.scrollTo(0, 0);
  };

  if (envoi)
    return (
      <ResultatDiag
        dossier={envoi.dossier}
        bien={bien}
        resumeBien={resumeBien}
        contact={envoi.contact}
        onRecommencer={() => {
          setEnvoi(null);
          setExistants({});
          setBien({ ...bien, adresse: '' });
          aller(1);
        }}
      />
    );

  return (
    <>
      <Stepper
        etapes={['Le bien', 'Existants', 'Mon dossier']}
        courante={etape - 1}
        className="mb-6"
      />
      {etape === 1 ? (
        <EtapeBien
          bien={bien}
          communes={donnees.communes}
          onChange={setBien}
          onSuivant={() => aller(2)}
        />
      ) : etape === 2 ? (
        <EtapeExistants
          bien={bien}
          obligatoires={obligatoires.map((l) => ({
            diagId: l.diagId,
            nom: donnees.textes[l.diagId]?.nom ?? l.diagId,
          }))}
          existants={existants}
          onBien={setBien}
          onExistants={setExistants}
          onSuivant={() => aller(3)}
          onPrecedent={() => aller(1)}
        />
      ) : (
        <EtapeDossier
          bien={bien}
          lignes={lignesPubliques(dossier, donnees.textes, actifs)}
          titre={resumeDossier(dossier).titre}
          resumeBien={resumeBien}
          existants={actifs.filter((a) => obligatoires.some((o) => o.diagId === a.diagId))}
          onEnvoye={(d, contact) => {
            setEnvoi({ dossier: d, contact });
            window.scrollTo(0, 0);
          }}
          onPrecedent={() => aller(2)}
        />
      )}
    </>
  );
}
