'use client';

import {
  calculerTotaux,
  texteAdresse,
  verifierMentionsFacture,
  type ParametresFacturation,
  type TauxTva,
} from '@ph/core/devis';
import type { ClientCarnet, PrestationBiblio } from '@ph/firebase/devis';
import { Button, ConfirmDialog } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';
import type { EntrepriseFeuille } from '@/server/pageDevis';
import { lignesCentimes, versEntreeFacture, type EtatDevis } from './etat';
import { enregistrerClientSiDemande } from './clients/enregistrerClient';
import { useBlocs } from './feuille/blocs';
import { useRegimeTva } from './feuille/useRegimeTva';
import { CadreEditeur } from './feuille/CadreEditeur';
import { FeuilleA4 } from './feuille/FeuilleA4';
import { PanneauOptions } from './feuille/PanneauOptions';

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
  clients,
  entreprise,
  aujourdHui,
}: {
  initial: EtatDevis;
  parametres: ParametresFacturation;
  tvaDefaut: TauxTva;
  bibliotheque: PrestationBiblio[];
  clients: ClientCarnet[];
  entreprise: EntrepriseFeuille;
  aujourdHui: number;
}) {
  const router = useRouter();
  const [e, setE] = useState(initial);
  const [cle] = useState(() => crypto.randomUUID());
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const maj = (patch: Partial<EtatDevis>) => setE((x) => ({ ...x, ...patch }));
  const regime = useRegimeTva(parametres.franchiseTva, setMessage);
  const p = { ...parametres, franchiseTva: regime.franchiseTva };
  const { blocs, basculer } = useBlocs(e, maj);
  const lignes = lignesCentimes(e.lignes);
  const totaux = calculerTotaux(
    { lignes, remisePct: Number(e.remisePct.replace(',', '.')) || 0, acomptePct: 0 },
    { franchiseTva: p.franchiseTva },
  );
  const mentions = verifierMentionsFacture(
    {
      typeClient: e.typeClient,
      sirenClient: e.sirenClient,
      client: e.client,
      lieuExecution: e.livraison ? texteAdresse(e.livraison) || undefined : undefined,
      emiseLe: new Date(aujourdHui),
      datePrestationLe: e.datePrestationLe
        ? new Date(`${e.datePrestationLe}T12:00:00Z`)
        : undefined,
      echeanceLe: new Date(aujourdHui + parametres.delaiPaiementJours * JOUR_MS),
      lignes,
    },
    p,
  );

  const emettre = async () => {
    setEnCours(true);
    setMessage(null);
    const fiche = await enregistrerClientSiDemande(e);
    if ('erreur' in fiche) {
      setEnCours(false);
      return setMessage({ ton: 'danger', texte: fiche.erreur });
    }
    const r = await posterJson<{ factureId: string }>(
      '/api/pro/factures',
      versEntreeFacture({ ...e, ...fiche }, cle),
    );
    setEnCours(false);
    if (!r.ok) return setMessage({ ton: 'danger', texte: r.message });
    router.push(routes.proFactureClient(r.data.factureId));
  };

  const manquantes = mentions.liste.filter((m) => !m.ok).map((m) => m.libelle);

  return (
    <CadreEditeur
      titre="Nouvelle facture"
      message={message}
      feuille={
        <FeuilleA4
          typeDocument="facture"
          e={e}
          maj={maj}
          blocs={blocs}
          totaux={totaux}
          entreprise={entreprise}
          franchiseTva={p.franchiseTva}
          onRegimeTva={(x) => void regime.changer(x)}
          tvaDefaut={tvaDefaut}
          bibliotheque={bibliotheque}
          clients={clients}
          aujourdHui={aujourdHui}
          onMessage={setMessage}
        />
      }
      options={
        <PanneauOptions
          e={e}
          maj={maj}
          blocs={blocs}
          basculer={basculer}
          facture
          totaux={totaux}
          mentions={mentions}
        />
      }
      actions={
        <>
          <span
            className={`max-w-[60ch] px-2 text-sm font-semibold ${mentions.ok ? 'text-succes' : 'text-danger'}`}
          >
            {mentions.ok ? 'Mentions complètes' : `Il manque : ${manquantes.join(', ')}`}
          </span>
          <ConfirmDialog
            titre="Émettre la facture ?"
            libelleConfirmer="Émettre la facture"
            onConfirmer={emettre}
            declencheur={
              <Button disabled={!mentions.ok || enCours}>
                {enCours ? 'Émission…' : 'Émettre la facture'}
              </Button>
            }
          >
            Elle reçoit son numéro et ne se modifie plus : toute correction passera par un avoir.
            Échéance à {parametres.delaiPaiementJours} jours (réglée dans Paramètres). Le PDF est
            prêt juste après.
          </ConfirmDialog>
        </>
      }
    />
  );
}
