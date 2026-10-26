'use client';

import {
  calculerTotaux,
  verifierMentionsFacture,
  type ParametresFacturation,
  type TauxTva,
} from '@ph/core/devis';
import type { PrestationBiblio } from '@ph/firebase/devis';
import { Banner, Button, ConfirmDialog, Feuille, StickyActionBar } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';
import { useMediaQuery } from '@/lib/useMediaQuery';
import type { EntrepriseFeuille } from '@/server/pageDevis';
import { lignesCentimes, versEntreeFacture, type EtatDevis } from './etat';
import { BarreEditeur } from './feuille/BarreEditeur';
import { FeuilleA4 } from './feuille/FeuilleA4';
import { OptionsDocument } from './feuille/OptionsDocument';
import { OptionsFacture } from './feuille/OptionsFacture';
import { PanneauMentions } from './PanneauMentions';

const JOUR_MS = 86_400_000;

/**
 * « Nouvelle facture » sans devis : la même feuille A4 et le même panneau Options que le devis.
 * Émise d'un coup après confirmation (numéro sans trou, figée : correction par avoir).
 */
export function EditeurFacture({
  initial,
  parametres,
  tvaDefaut,
  bibliotheque,
  entreprise,
  aujourdHui,
}: {
  initial: EtatDevis;
  parametres: ParametresFacturation;
  tvaDefaut: TauxTva;
  bibliotheque: PrestationBiblio[];
  entreprise: EntrepriseFeuille;
  aujourdHui: number;
}) {
  const router = useRouter();
  const large = useMediaQuery('(min-width: 1100px)');
  const [e, setE] = useState(initial);
  const [cle] = useState(() => crypto.randomUUID());
  const [options, setOptions] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const maj = (patch: Partial<EtatDevis>) => setE((x) => ({ ...x, ...patch }));
  const lignes = lignesCentimes(e.lignes);
  const totaux = calculerTotaux(
    { lignes, remisePct: Number(e.remisePct.replace(',', '.')) || 0, acomptePct: 0 },
    { franchiseTva: parametres.franchiseTva },
  );
  const mentions = verifierMentionsFacture(
    {
      typeClient: e.typeClient,
      sirenClient: e.sirenClient,
      client: e.client,
      lieuExecution: e.adresseChantier,
      emiseLe: new Date(aujourdHui),
      datePrestationLe: e.datePrestationLe
        ? new Date(`${e.datePrestationLe}T12:00:00Z`)
        : undefined,
      echeanceLe: new Date(aujourdHui + parametres.delaiPaiementJours * JOUR_MS),
      lignes,
    },
    parametres,
  );

  const emettre = async () => {
    setEnCours(true);
    setMessage(null);
    const r = await posterJson<{ factureId: string }>(
      '/api/pro/factures',
      versEntreeFacture(e, cle),
    );
    setEnCours(false);
    if (!r.ok) return setMessage({ ton: 'danger', texte: r.message });
    router.push(routes.proFactureClient(r.data.factureId));
  };

  const panneau = (
    <div className="grid gap-6">
      <OptionsDocument e={e} maj={maj} facture />
      <OptionsFacture e={e} maj={maj} delaiPaiementJours={parametres.delaiPaiementJours} />
      <PanneauMentions totaux={totaux} mentions={mentions} />
    </div>
  );
  const manquantes = mentions.liste.filter((m) => !m.ok).map((m) => m.libelle);

  return (
    <div className="grid min-h-[calc(100dvh-90px)] grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr_auto] bg-neutre-100">
      <BarreEditeur titre="Nouvelle facture" onOptions={large ? null : () => setOptions(true)} />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 px-[clamp(8px,3vw,32px)] py-6 min-[1100px]:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-4">
          {message ? (
            <div role="alert">
              <Banner tone={message.ton}>{message.texte}</Banner>
            </div>
          ) : null}
          <FeuilleA4
            typeDocument="facture"
            e={e}
            maj={maj}
            totaux={totaux}
            entreprise={entreprise}
            franchiseTva={parametres.franchiseTva}
            tvaDefaut={tvaDefaut}
            bibliotheque={bibliotheque}
            avecCout={false}
            aujourdHui={aujourdHui}
            onMessage={setMessage}
          />
        </div>
        {large ? (
          <aside
            aria-label="Options"
            className="sticky top-24 grid max-h-[calc(100dvh-200px)] gap-4 overflow-y-auto rounded-[14px] border border-trait bg-blanc p-4"
          >
            <h2 className="m-0 text-lg">Options</h2>
            {panneau}
          </aside>
        ) : (
          <Feuille open={options} onOpenChange={setOptions} titre="Options" mode="bas">
            {panneau}
          </Feuille>
        )}
      </div>
      <StickyActionBar className="bottom-[calc(3.5rem+env(safe-area-inset-bottom))] flex-wrap justify-end lg:bottom-0">
        <p
          className={`m-0 basis-full text-sm font-semibold sm:mr-auto sm:basis-auto ${mentions.ok ? 'text-succes' : 'text-danger'}`}
        >
          {mentions.ok ? 'Mentions obligatoires complètes' : `Il manque : ${manquantes.join(', ')}`}
        </p>
        <ConfirmDialog
          titre="Émettre la facture ?"
          libelleConfirmer="Émettre la facture"
          onConfirmer={emettre}
          declencheur={
            <Button disabled={!mentions.ok || enCours} className="flex-1 sm:flex-none">
              {enCours ? 'Émission…' : 'Émettre la facture'}
            </Button>
          }
        >
          Elle reçoit son numéro et ne se modifie plus : toute correction passera par un avoir. Le
          PDF est prêt juste après.
        </ConfirmDialog>
      </StickyActionBar>
    </div>
  );
}
