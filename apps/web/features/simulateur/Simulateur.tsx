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
import { useEffect, useRef, useState } from 'react';
import { AffichageReprise } from './AffichageReprise';
import type { Contact } from './EtapeCoordonnees';
import { EtapePrestation } from './EtapePrestation';
import { EtapeQuestions } from './EtapeQuestions';
import { brouillonAJour, type BrouillonParcours } from '@ph/core/parcours';
import { demanderLienReprise } from './envoi';
import { useLienReprise, useRepriseSimulateur, type RepriseProposee } from './reprise';
import type { CatalogueSimulateur, Chantier, PrestationSimulateur, Reponses } from './types';

// Validation (Zod) et résultat chargés à la demande : la page, préchargée depuis l'accueil, reste
// légère (budget D46).
const EtapeCoordonnees = dynamic(() =>
  import('./EtapeCoordonnees').then((m) => m.EtapeCoordonnees),
);
const Resultat = dynamic(() => import('./Resultat').then((m) => m.Resultat));

const DELAIS = new Set(['asap', '1mois', '3mois', 'renseignement']);
const DUREE_ANNULATION_MS = 8000;

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
    prestationId: params.get('prestation') ?? undefined,
    codePostal: params.get('cp') ?? undefined,
    jeton: params.get('reprise') ?? undefined,
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

  // Reprise (REPRISE_PARCOURS) : l'encart disparaît dès que la personne agit ; rien n'est écrit tant
  // qu'elle n'a pas répondu (un simple passage ne doit pas écraser un brouillon existant).
  const reprise = useRepriseSimulateur(catalogue, {
    prestationId: arrivee.prestationId,
    codePostal: arrivee.codePostal,
  });
  const [decide, setDecide] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [annulation, setAnnulation] = useState<string | null>(null);
  const minuterieAnnulation = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const actif = useRef(false);
  const agir = () => {
    actif.current = true;
    setDecide(true);
  };

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
    // Choisir une prestation alors qu'une estimation attendait vaut « Recommencer » (§3).
    if (encartVisible && reprise.encart?.prestation.id !== p.id) recommencer();
    agir();
    aller(p, 2);
  };

  const encartVisible = !decide && !envoi && reprise.encart !== null;

  /** Restaure un brouillon (encart ou lien reçu par email) et va à l'étape de reprise. */
  const appliquer = (r: RepriseProposee) => {
    const b = r.brouillon;
    setReponses((x) => ({ ...x, [r.prestation.id]: r.reponses }));
    setChantier({
      codePostal: b.chantier?.codePostal ?? '',
      acces: b.chantier?.acces ?? 'facile',
    });
    setNote(
      r.retirees.length
        ? 'Certaines réponses ont été retirées car le simulateur a évolué : vérifiez-les.'
        : 'Vos réponses sont restaurées.',
    );
    agir();
    const q = new URLSearchParams({ prestation: r.prestation.id, etape: String(r.etape) });
    router.replace(`?${q}` as Route, { scroll: true });
  };

  const reprendre = () => {
    if (reprise.encart) appliquer(reprise.encart);
  };

  // Lien reçu par email : reprise directe, sans encart (le choix est fait en cliquant, §4).
  const lienExpire = useLienReprise(arrivee.jeton, (b: BrouillonParcours) => {
    const r = reprise.preparerBrouillon(b);
    if (r) {
      reprise.restaurer(b);
      appliquer(r);
    }
  });

  // « M'envoyer un lien pour reprendre plus tard » : brouillon courant, sans coordonnées.
  const [brouillonId, setBrouillonId] = useState<string>();
  const lienReprise = async (email: string) => {
    if (!prestation) return null;
    const b = brouillonAJour(
      null,
      {
        parcours: 'simulateur',
        versionReferentiel: catalogue.version,
        prestationId: prestation.id,
        etape,
        reponses: { ...valeursParDefaut(prestation.champs), ...reponses[prestation.id] },
        chantier: { codePostal: chantier.codePostal, acces: chantier.acces },
      },
      Date.now(),
      () => crypto.randomUUID().replace(/-/g, ''),
    );
    const r = await demanderLienReprise(b, email);
    if (!r.ok) return r.message;
    setBrouillonId(r.data.brouillonId);
    return null;
  };

  const recommencer = () => {
    const e = reprise.encart;
    reprise.effacer();
    setDecide(true);
    clearTimeout(minuterieAnnulation.current);
    if (!e) return;
    setAnnulation(`Estimation ${e.prestation.nom.toLowerCase()} effacée`);
    minuterieAnnulation.current = setTimeout(() => setAnnulation(null), DUREE_ANNULATION_MS);
  };

  const annulerRecommencer = () => {
    const e = reprise.encart;
    clearTimeout(minuterieAnnulation.current);
    setAnnulation(null);
    if (!e) return;
    reprise.restaurer(e.brouillon);
    actif.current = false;
    setDecide(false);
    aller(null, 1);
  };

  // Brouillon local à chaque changement, sans aucune coordonnée (§2).
  const { ecrire } = reprise;
  const reponsesPrestation = prestation ? reponses[prestation.id] : undefined;
  useEffect(() => {
    if (!actif.current || !prestation || envoi || etape < 2) return;
    ecrire({
      versionReferentiel: catalogue.version,
      prestationId: prestation.id,
      etape,
      reponses: { ...valeursParDefaut(prestation.champs), ...reponsesPrestation },
      chantier: {
        codePostal: chantier.codePostal,
        acces: chantier.acces,
        ...(arrivee.delai ? { delai: arrivee.delai } : {}),
      },
    });
  }, [
    ecrire,
    catalogue.version,
    prestation,
    etape,
    reponsesPrestation,
    chantier,
    envoi,
    arrivee.delai,
  ]);

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
      <AffichageReprise
        encart={encartVisible ? reprise.encart : null}
        note={prestation ? note : null}
        annulation={annulation}
        lienExpire={prestation ? null : lienExpire}
        autreOnglet={reprise.autreOnglet}
        onReprendre={reprendre}
        onRecommencer={recommencer}
        onAnnuler={annulerRecommencer}
      />
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
          onLienReprise={lienReprise}
          brouillonId={brouillonId}
          onEnvoye={(demande, contact, miseEnRelation) => {
            // Demande envoyée : brouillon supprimé, plus d'encart au retour (SIM-06f).
            reprise.effacer();
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
          onReponse={(id, v) => {
            agir();
            setReponses((r) => ({ ...r, [prestation.id]: { ...courantes, [id]: v } }));
          }}
          onChantier={(c) => {
            agir();
            setChantier(c);
          }}
          onSuivant={() => {
            agir();
            aller(prestation, etapeSuivante(etape, prestation.champs));
          }}
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
