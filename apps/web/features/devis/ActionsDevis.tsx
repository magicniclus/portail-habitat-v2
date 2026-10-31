'use client';

import { Banner, bouton, BoutonAction } from '@ph/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';

/** Actions d'un devis validé : PDF, envoi au client, décision, facturation (acompte, solde), archivage. */
export function ActionsDevis({
  devisId,
  statut,
  aPdf,
  acompte,
  factureId,
  peutFacturer,
  peutGerer,
  objet,
  envoye,
}: {
  devisId: string;
  statut: string;
  aPdf: boolean;
  acompte: boolean;
  factureId?: string;
  peutFacturer: boolean;
  peutGerer: boolean;
  /** Titre proposé pour « Enregistrer comme modèle ». */
  objet: string;
  /** L'email au client est déjà parti (sinon le devis est seulement validé). */
  envoye: boolean;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [modele, setModele] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const appeler = async (url: string, corps: object, ensuite?: (d: unknown) => void) => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<unknown>(url, corps);
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    ensuite?.(r.data);
    router.refresh();
  };
  const statutDevis = (s: 'accepte' | 'refuse' | 'archive') =>
    appeler('/api/pro/devis/statut', { devisId, statut: s });
  const facturer = (type: 'facture' | 'acompte') =>
    appeler(
      '/api/pro/devis/facturer',
      { devisId, type, cleIdempotence: `${type}-${devisId}-${Date.now()}` },
      (d) => router.push(routes.proFactureClient((d as { factureId: string }).factureId)),
    );
  return (
    <div className="grid gap-3">
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      {envoi ? <Banner tone="succes">Devis envoyé au client par email.</Banner> : null}
      {modele ? (
        <Banner tone="succes">Modèle enregistré : retrouvez-le dans l’onglet Modèles.</Banner>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {aPdf ? (
          <a href={`/api/pro/devis/${devisId}/pdf`} className={bouton({ variant: 'secondaire' })}>
            Télécharger le PDF
          </a>
        ) : null}
        {peutGerer && statut === 'envoye' ? (
          <BoutonAction
            variant={envoye ? 'secondaire' : 'primaire'}
            disabled={enCours}
            onClick={() =>
              appeler('/api/pro/devis/action', { action: 'envoyer', devisId }, () => setEnvoi(true))
            }
          >
            {envoye ? 'Renvoyer au client' : 'Envoyer au client'}
          </BoutonAction>
        ) : null}
        {peutGerer && statut === 'envoye' ? (
          <>
            <BoutonAction onClick={() => statutDevis('accepte')} disabled={enCours}>
              Le client a accepté
            </BoutonAction>
            <BoutonAction
              variant="secondaire"
              onClick={() => statutDevis('refuse')}
              disabled={enCours}
            >
              Le client a refusé
            </BoutonAction>
          </>
        ) : null}
        {peutFacturer && acompte && ['envoye', 'accepte'].includes(statut) ? (
          <BoutonAction variant="secondaire" onClick={() => facturer('acompte')} disabled={enCours}>
            Facturer l’acompte
          </BoutonAction>
        ) : null}
        {peutFacturer && statut === 'accepte' && !factureId ? (
          <BoutonAction onClick={() => facturer('facture')} disabled={enCours}>
            Transformer en facture
          </BoutonAction>
        ) : null}
        {factureId ? (
          <Link
            href={routes.proFactureClient(factureId)}
            className={bouton({ variant: 'fantome' })}
          >
            Voir la facture
          </Link>
        ) : null}
        {peutGerer && !modele ? (
          <BoutonAction
            variant="fantome"
            disabled={enCours}
            onClick={() =>
              appeler(
                '/api/pro/devis/modeles',
                { action: 'depuisDevis', devisId, titre: (objet || 'Modèle').slice(0, 120) },
                () => setModele(true),
              )
            }
          >
            Enregistrer comme modèle
          </BoutonAction>
        ) : null}
        {peutGerer && statut !== 'archive' ? (
          <BoutonAction variant="fantome" onClick={() => statutDevis('archive')} disabled={enCours}>
            Archiver
          </BoutonAction>
        ) : null}
      </div>
    </div>
  );
}
