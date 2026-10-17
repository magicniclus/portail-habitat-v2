'use client';

import {
  calculerTotaux,
  verifierMentionsDevis,
  type ParametresFacturation,
  type TauxTva,
} from '@ph/core/devis';
import type { PrestationBiblio } from '@ph/firebase/devis';
import { Banner, Button } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';
import { ChampsClient } from './ChampsClient';
import { ConditionsDevis } from './ConditionsDevis';
import { lignesCentimes, versEntree, type EtatDevis } from './etat';
import { LignesDevis } from './LignesDevis';
import { PanneauMentions } from './PanneauMentions';

const date = (j: string) => (j ? new Date(`${j}T12:00:00Z`) : undefined);

/**
 * Éditeur de devis (maquette Devis et Factures) : totaux et mentions recalculés à chaque saisie,
 * avec les fonctions du serveur ; « Envoyer » refusé tant qu'une mention manque (DEV-01). Pas
 * d'aperçu du PDF : il est produit à l'envoi (DEV-05).
 */
export function EditeurDevis({
  initial,
  parametres,
  tvaDefaut,
  bibliotheque,
}: {
  initial: EtatDevis;
  parametres: ParametresFacturation;
  tvaDefaut: TauxTva;
  /** Prestations reprises d'un clic (« + Depuis la bibliothèque… »). */
  bibliotheque: PrestationBiblio[];
}) {
  const router = useRouter();
  const [e, setE] = useState(initial);
  const [enCours, setEnCours] = useState<null | 'enregistrer' | 'envoyer'>(null);
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const maj = (patch: Partial<EtatDevis>) => setE((x) => ({ ...x, ...patch }));
  const lignes = lignesCentimes(e.lignes);
  const totaux = calculerTotaux(
    {
      lignes,
      remisePct: Number(e.remisePct.replace(',', '.')) || 0,
      acomptePct: Number(e.acomptePct.replace(',', '.')) || 0,
    },
    { franchiseTva: parametres.franchiseTva },
  );
  const mentions = verifierMentionsDevis(
    {
      typeClient: e.typeClient,
      sirenClient: e.sirenClient,
      client: e.client,
      validiteLe: date(e.validiteLe),
      debutTravauxLe: date(e.debutTravauxLe),
      dureeEstimee: e.dureeEstimee,
      fraisDeplacement: e.fraisDeplacement,
      horsEtablissement: e.horsEtablissement,
      lignes,
    },
    parametres,
  );

  const enregistrer = async (): Promise<string | null> => {
    const r = await posterJson<{ devisId: string; numero: string }>(
      '/api/pro/devis',
      versEntree(e),
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
    if (!initial.devisId) router.replace(routes.proUnDevis(id));
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

  return (
    <div className="grid gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-6">
        {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
        <ChampsClient e={e} maj={maj} />
        <ConditionsDevis e={e} maj={maj} />
        <LignesDevis
          lignes={e.lignes}
          tvaDefaut={tvaDefaut}
          bibliotheque={bibliotheque}
          onChange={(l) => maj({ lignes: l })}
        />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondaire" onClick={surEnregistrer} disabled={enCours !== null}>
            {enCours === 'enregistrer' ? 'Enregistrement…' : 'Enregistrer le brouillon'}
          </Button>
          <Button onClick={surEnvoyer} disabled={enCours !== null}>
            {enCours === 'envoyer' ? 'Envoi…' : 'Envoyer au client'}
          </Button>
        </div>
      </div>
      <PanneauMentions totaux={totaux} mentions={mentions} />
    </div>
  );
}
