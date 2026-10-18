'use client';

import { Banner, Button, bouton } from '@ph/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';

/** Actions d'un devis envoyé : PDF, décision du client, facturation (acompte, solde), archivage. */
export function ActionsDevis({
  devisId,
  statut,
  aPdf,
  acompte,
  factureId,
  peutFacturer,
  peutGerer,
  objet,
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
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [modele, setModele] = useState(false);
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
          <>
            <Button onClick={() => statutDevis('accepte')} disabled={enCours}>
              Le client a accepté
            </Button>
            <Button variant="secondaire" onClick={() => statutDevis('refuse')} disabled={enCours}>
              Le client a refusé
            </Button>
          </>
        ) : null}
        {peutFacturer && acompte && ['envoye', 'accepte'].includes(statut) ? (
          <Button variant="secondaire" onClick={() => facturer('acompte')} disabled={enCours}>
            Facturer l’acompte
          </Button>
        ) : null}
        {peutFacturer && statut === 'accepte' && !factureId ? (
          <Button onClick={() => facturer('facture')} disabled={enCours}>
            Transformer en facture
          </Button>
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
          <Button
            variant="fantome"
            disabled={enCours}
            onClick={() =>
              void appeler(
                '/api/pro/devis/modeles',
                { action: 'depuisDevis', devisId, titre: (objet || 'Modèle').slice(0, 120) },
                () => setModele(true),
              )
            }
          >
            Enregistrer comme modèle
          </Button>
        ) : null}
        {peutGerer && statut !== 'archive' ? (
          <Button variant="fantome" onClick={() => statutDevis('archive')} disabled={enCours}>
            Archiver
          </Button>
        ) : null}
      </div>
    </div>
  );
}
