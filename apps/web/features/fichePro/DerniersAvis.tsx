import { formatDate } from '@ph/core/format';
import type { AvisPro } from '@ph/firebase/pro';
import { bouton } from '@ph/ui';
import Link from 'next/link';
import { Etoiles } from '@/features/vitrine/Etoiles';
import { routes } from '@/lib/routes';
import { CarteFiche } from './CarteFiche';

/** « Derniers avis » (maquette Ma fiche) : les 4 plus récents, lien vers Mes avis ; « 0 avis » sinon. */
export function DerniersAvis({ avis, note }: { avis: AvisPro[]; note: string | null }) {
  if (!avis.length)
    return (
      <CarteFiche
        titre="Derniers avis"
        action={<span className="text-sm whitespace-nowrap text-neutre-700">0 avis</span>}
      >
        <p className="m-0 text-[15px] leading-[24px] text-neutre-800">
          Aucun avis pour l&apos;instant. Les avis de vos clients s&apos;afficheront ici et sur
          votre fiche publique.
        </p>
        <Link
          href={routes.proAvis}
          className={bouton({ variant: 'secondaire', className: 'justify-self-start' })}
        >
          Demander des avis
        </Link>
      </CarteFiche>
    );
  return (
    <CarteFiche
      titre="Derniers avis"
      action={
        <span className="text-sm whitespace-nowrap text-neutre-700">
          {note ? `${note}/5 · ` : ''}
          {avis.length} avis
        </span>
      }
    >
      <ul className="m-0 grid list-none gap-3 p-0">
        {avis.slice(0, 4).map((a) => (
          <li key={a.id} className="grid gap-2 rounded-[12px] border border-trait p-4">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex size-9 flex-none items-center justify-center rounded-full bg-accent-200 text-sm font-bold text-accent-800"
              >
                {a.nomAffiche.charAt(0).toUpperCase()}
              </span>
              <span className="grid min-w-0 flex-1">
                <strong className="truncate">{a.nomAffiche}</strong>
                <span className="text-sm">
                  <Etoiles />
                  <span className="sr-only">{a.note} sur 5</span>
                </span>
              </span>
              <span className="text-sm whitespace-nowrap text-neutre-700">
                {formatDate(a.publieLe, 'long')}
              </span>
            </div>
            {a.texte ? <p className="m-0 text-[15px] leading-[24px]">{a.texte}</p> : null}
          </li>
        ))}
      </ul>
      <Link
        href={routes.proAvis}
        className={bouton({ variant: 'secondaire', className: 'justify-self-center' })}
      >
        Voir tous les avis ({avis.length})
      </Link>
    </CarteFiche>
  );
}
