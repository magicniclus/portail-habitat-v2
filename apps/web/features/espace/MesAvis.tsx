import { bouton } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';

/** Onglet « Mes avis » : dépôt d'un avis. La liste des avis déposés arrive avec leur modération (lot 13). */
export function MesAvis() {
  return (
    <div className="grid max-w-[760px] gap-3">
      <div className="flex flex-wrap items-center gap-3.5 rounded-[14px] border border-accent-300 bg-accent-100 p-4">
        <span className="flex flex-[1_1_260px] flex-col">
          <span className="text-base font-bold">Vos travaux sont terminés ?</span>
          <span className="text-[14.5px] text-neutre-800">
            Votre avis aide le prochain particulier à bien choisir. Deux minutes suffisent.
          </span>
        </span>
        <Link href={routes.avis} className={bouton()}>
          Laisser un avis
        </Link>
      </div>
    </div>
  );
}
