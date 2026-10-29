'use client';

import { ARTICLES_IA_MOIS } from '@ph/core/blog';
import { recapPaiement } from '@ph/core/facturation';
import { formatEuros } from '@ph/core/format';
import { Banner, Button, Checkbox, Modal } from '@ph/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';

const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });

/**
 * Fenêtre de l'option Blog (`?offre=blog`, D71) : récapitulatif HT, TVA, TTC et CGV. L'option
 * s'ajoute à l'abonnement en cours avec la carte déjà enregistrée chez Stripe (aucune saisie ici,
 * règle 7) ; `droits.optionBlog` suit par le webhook.
 */
export function FenetreOptionBlog() {
  const router = useRouter();
  const [ouverte, setOuverte] = useState(true);
  const [cgv, setCgv] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  const r = recapPaiement('option_blog');
  const fermer = (o: boolean) => {
    setOuverte(o);
    if (!o) router.replace(routes.proAbonnement, { scroll: false });
  };
  const ajouter = async () => {
    setEnCours(true);
    setErreur(null);
    const res = await posterJson<null>('/api/pro/abonnement/option-blog', { activer: true });
    setEnCours(false);
    if (!res.ok) return setErreur(res.message);
    setFait(true);
    router.refresh();
  };
  return (
    <Modal
      open={ouverte}
      onOpenChange={fermer}
      titre="Ajouter l’option Blog"
      actions={
        fait ? (
          <Button onClick={() => fermer(false)}>Fermer</Button>
        ) : (
          <>
            <Button variant="fantome" onClick={() => fermer(false)}>
              Annuler
            </Button>
            <Button chargement={enCours} onClick={ajouter} disabled={!cgv || enCours}>
              {enCours ? 'Un instant…' : 'Ajouter l’option'}
            </Button>
          </>
        )
      }
    >
      <div className="grid gap-4">
        <p className="m-0 text-[15px]">
          {ARTICLES_IA_MOIS.optionBlog} articles rédigés par l’IA en plus chaque mois, soit{' '}
          {ARTICLES_IA_MOIS.sitePro + ARTICLES_IA_MOIS.optionBlog} au total.
        </p>
        <dl className="m-0 grid gap-1 text-[15px]">
          <div className="flex justify-between gap-3">
            <dt>Option Blog · mensuel</dt>
            <dd className="m-0">{eur(r.montantHt)} HT</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>TVA 20 %</dt>
            <dd className="m-0">{eur(r.tva)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-trait pt-1.5 font-bold">
            <dt>Total TTC</dt>
            <dd className="m-0" data-testid="total-ttc">
              {eur(r.montantTtc)}
            </dd>
          </div>
        </dl>
        <p className="m-0 text-sm text-neutre-700">
          Ajoutée à votre abonnement : vous payez aujourd’hui le prorata du mois en cours, puis{' '}
          {eur(r.montantTtc)} TTC chaque mois avec votre carte enregistrée. Sans engagement.
        </p>
        {fait ? (
          <Banner tone="succes">
            Option ajoutée. Vos articles supplémentaires sont disponibles dans quelques instants.
          </Banner>
        ) : (
          <Checkbox checked={cgv} onChange={(e) => setCgv(e.target.checked)}>
            J’accepte les{' '}
            <Link href={routes.legal('pro', 'cgv')} target="_blank">
              conditions générales de vente
            </Link>
            .
          </Checkbox>
        )}
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      </div>
    </Modal>
  );
}
