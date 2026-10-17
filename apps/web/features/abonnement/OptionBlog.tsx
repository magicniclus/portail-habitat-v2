'use client';

import { ARTICLES_IA_MOIS } from '@ph/core/blog';
import { formatEuros } from '@ph/core/format';
import { PRIX_OPTION_BLOG_HT } from '@ph/core/paiements';
import { Banner, Button } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

/**
 * Option Blog active (D71) : affichée seulement quand elle est souscrite (Mon abonnement ne montre
 * jamais de catalogue) ; retirée sans remboursement du mois entamé.
 */
export function OptionBlog({ gerer }: { gerer: boolean }) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const retirer = async () => {
    setEnCours(true);
    const r = await posterJson<null>('/api/pro/abonnement/option-blog', { activer: false });
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    router.refresh();
  };
  return (
    <section
      aria-labelledby="option-blog"
      className="grid gap-2 rounded-[16px] border border-trait bg-blanc p-5"
    >
      <h2 id="option-blog" className="m-0 text-lg">
        Option Blog
      </h2>
      <p className="m-0 text-[15px]">
        +{ARTICLES_IA_MOIS.optionBlog} articles rédigés par l’IA chaque mois ·{' '}
        {formatEuros(PRIX_OPTION_BLOG_HT, { decimales: 'toujours' })} HT / mois
      </p>
      {gerer ? (
        confirmer ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Retirer l’option dès maintenant ?</span>
            <Button variant="danger" taille="sm" disabled={enCours} onClick={retirer}>
              Oui, retirer
            </Button>
            <Button variant="fantome" taille="sm" onClick={() => setConfirmer(false)}>
              Garder l’option
            </Button>
          </div>
        ) : (
          <Button
            variant="fantome"
            className="justify-self-start"
            onClick={() => setConfirmer(true)}
          >
            Retirer l’option
          </Button>
        )
      ) : null}
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </section>
  );
}
