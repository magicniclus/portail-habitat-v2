'use client';

import type { ParametresFacturation, TauxTva } from '@ph/core/devis';
import type { ClientCarnet, PrestationBiblio } from '@ph/firebase/devis';
import { Button, ConfirmDialog } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';
import type { EntrepriseFeuille } from '@/server/pageDevis';
import { calculsFacture } from './calculsFacture';
import { versEntreeBrouillonFacture, versEntreeFacture, type EtatDevis } from './etat';
import { enregistrerClientSiDemande } from './clients/enregistrerClient';
import { useBlocs } from './feuille/blocs';
import { useRegimeTva } from './feuille/useRegimeTva';
import { CadreEditeur } from './feuille/CadreEditeur';
import { FeuilleA4 } from './feuille/FeuilleA4';
import { PanneauOptions } from './feuille/PanneauOptions';

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
  const [modifie, setModifie] = useState(false);
  const maj = (patch: Partial<EtatDevis>) => {
    setE((x) => ({ ...x, ...patch }));
    setModifie(true);
  };
  const regime = useRegimeTva(parametres.franchiseTva, setMessage);
  const p = { ...parametres, franchiseTva: regime.franchiseTva };
  const { blocs, basculer } = useBlocs(e, maj);
  const { totaux, mentions } = calculsFacture(e, p, aujourdHui);

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

  /** Brouillon sans numéro (légal) ; renvoie son identifiant, ou null en cas d'erreur. */
  const enregistrerBrouillon = async (): Promise<string | null> => {
    setEnCours(true);
    setMessage(null);
    const fiche = await enregistrerClientSiDemande(e);
    if ('erreur' in fiche) {
      setEnCours(false);
      setMessage({ ton: 'danger', texte: fiche.erreur });
      return null;
    }
    const r = await posterJson<{ factureId: string }>(
      '/api/pro/factures/brouillon',
      versEntreeBrouillonFacture({ ...e, ...fiche }),
    );
    setEnCours(false);
    if (!r.ok) {
      setMessage({ ton: 'danger', texte: r.message });
      return null;
    }
    setE((x) => ({ ...x, factureId: r.data.factureId, ...fiche, enregistrerClient: false }));
    setModifie(false);
    return r.data.factureId;
  };
  const brouillon = async () => {
    const id = await enregistrerBrouillon();
    if (!id) return;
    setMessage({ ton: 'succes', texte: 'Brouillon enregistré.' });
    if (!e.factureId) router.replace(routes.proModifierFacture(id));
  };

  const manquantes = mentions.liste.filter((m) => !m.ok).map((m) => m.libelle);

  return (
    <CadreEditeur
      modifie={modifie}
      document="la facture"
      retour={`${routes.proDevis}?onglet=factures`}
      onBrouillon={async () => (await enregistrerBrouillon()) !== null}
      titre={e.factureId ? 'Brouillon de facture' : 'Nouvelle facture'}
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
            {mentions.ok
              ? 'Mentions complètes'
              : `${manquantes.length} mention${manquantes.length > 1 ? 's' : ''} à compléter`}
          </span>
          <Button variant="secondaire" onClick={brouillon} disabled={enCours}>
            Enregistrer le brouillon
          </Button>
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
