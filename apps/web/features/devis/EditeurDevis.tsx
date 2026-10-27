'use client';

import {
  calculerTotaux,
  verifierMentionsDevis,
  type ParametresFacturation,
  type TauxTva,
} from '@ph/core/devis';
import type { ClientCarnet, PrestationBiblio } from '@ph/firebase/devis';
import { Button } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';
import type { EntrepriseFeuille } from '@/server/pageDevis';
import { lignesCentimes, versEntree, type EtatDevis } from './etat';
import { enregistrerClientSiDemande } from './clients/enregistrerClient';
import { useBlocs } from './feuille/blocs';
import { useRegimeTva } from './feuille/useRegimeTva';
import { CadreEditeur } from './feuille/CadreEditeur';
import { FeuilleA4 } from './feuille/FeuilleA4';
import { PanneauOptions } from './feuille/PanneauOptions';

const date = (j: string) => (j ? new Date(`${j}T12:00:00Z`) : undefined);
const nombre = (s: string) => Number(s.replace(',', '.')) || 0;

/**
 * Éditeur de devis pleine page « feuille A4 » (captures du propriétaire, à nos couleurs) : la
 * feuille au centre, le panneau Options (cases qui font apparaître les blocs) à droite.
 * Totaux et mentions recalculés à chaque saisie avec les fonctions du serveur ; « Envoyer »
 * refusé tant qu'une mention manque (DEV-01). Le PDF est produit à l'envoi (DEV-05).
 */
export function EditeurDevis({
  initial,
  parametres,
  tvaDefaut,
  bibliotheque,
  clients,
  entreprise,
  aujourdHui,
  bandeau,
}: {
  initial: EtatDevis;
  parametres: ParametresFacturation;
  tvaDefaut: TauxTva;
  bibliotheque: PrestationBiblio[];
  clients: ClientCarnet[];
  entreprise: EntrepriseFeuille;
  aujourdHui: number;
  /** Bandeau au-dessus de la feuille (« En réponse à la demande… »). */
  bandeau?: ReactNode;
}) {
  const router = useRouter();
  const [e, setE] = useState(initial);
  const [enCours, setEnCours] = useState<null | 'enregistrer' | 'envoyer'>(null);
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const maj = (patch: Partial<EtatDevis>) => setE((x) => ({ ...x, ...patch }));
  const regime = useRegimeTva(parametres.franchiseTva, setMessage);
  const p = { ...parametres, franchiseTva: regime.franchiseTva };
  const { blocs, basculer } = useBlocs(e, maj);
  const lignes = lignesCentimes(e.lignes);
  const totaux = calculerTotaux(
    { lignes, remisePct: nombre(e.remisePct), acomptePct: nombre(e.acomptePct) },
    { franchiseTva: p.franchiseTva },
  );
  const mentions = verifierMentionsDevis(
    {
      ...e,
      validiteLe: date(e.validiteLe),
      debutTravauxLe: date(e.debutTravauxLe),
      lignes,
    },
    p,
  );

  const enregistrer = async (): Promise<string | null> => {
    const fiche = await enregistrerClientSiDemande(e);
    if ('erreur' in fiche) {
      setMessage({ ton: 'danger', texte: fiche.erreur });
      return null;
    }
    if (fiche.clientId && fiche.clientId !== e.clientId)
      maj({ clientId: fiche.clientId, enregistrerClient: false });
    const r = await posterJson<{ devisId: string; numero: string }>(
      '/api/pro/devis',
      versEntree({ ...e, ...fiche }),
    );
    if (!r.ok) {
      setMessage({ ton: 'danger', texte: r.message });
      return null;
    }
    if (!e.devisId) maj({ devisId: r.data.devisId, numero: r.data.numero });
    return r.data.devisId;
  };
  const surEnregistrer = async () => {
    setEnCours('enregistrer');
    setMessage(null);
    const id = await enregistrer();
    setEnCours(null);
    if (!id) return;
    setMessage({ ton: 'succes', texte: 'Devis enregistré.' });
    if (!initial.devisId) router.replace(routes.proModifierDevis(id));
  };
  const surEnvoyer = async () => {
    if (!mentions.ok) {
      const manquantes = mentions.liste.filter((m) => !m.ok).map((m) => m.libelle);
      return setMessage({
        ton: 'danger',
        texte: `Envoi impossible, il manque : ${manquantes.join(', ')}.`,
      });
    }
    if (!e.client.email.trim())
      return setMessage({
        ton: 'danger',
        texte: 'Indiquez l’email du client pour lui envoyer le devis.',
      });
    setEnCours('envoyer');
    setMessage(null);
    const id = await enregistrer();
    if (!id) return setEnCours(null);
    const r = await posterJson<null>('/api/pro/devis/envoyer', { devisId: id });
    setEnCours(null);
    if (!r.ok) return setMessage({ ton: 'danger', texte: r.message });
    router.push(routes.proUnDevis(id));
    router.refresh();
  };

  const manquantes = mentions.liste.length - mentions.liste.filter((m) => m.ok).length;

  return (
    <CadreEditeur
      titre={e.numero ? `Devis ${e.numero}` : 'Nouveau devis'}
      message={message}
      avant={bandeau}
      feuille={
        <FeuilleA4
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
          totaux={totaux}
          mentions={mentions}
        />
      }
      actions={
        <>
          <span
            className={`px-2 text-sm font-semibold ${mentions.ok ? 'text-succes' : 'text-danger'}`}
            role="status"
          >
            {mentions.ok
              ? 'Mentions complètes'
              : `${manquantes} mention${manquantes > 1 ? 's' : ''} à compléter`}
          </span>
          <Button variant="secondaire" onClick={surEnregistrer} disabled={enCours !== null}>
            {enCours === 'enregistrer'
              ? 'Enregistrement…'
              : e.devisId
                ? 'Enregistrer'
                : 'Créer le devis'}
          </Button>
          <Button onClick={surEnvoyer} disabled={enCours !== null}>
            {enCours === 'envoyer' ? 'Envoi…' : 'Envoyer au client'}
          </Button>
        </>
      }
    />
  );
}
