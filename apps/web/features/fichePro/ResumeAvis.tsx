import { bouton } from '@ph/ui';
import Link from 'next/link';
import { Etoiles } from '@/features/vitrine/Etoiles';
import { routes } from '@/lib/routes';
import { CarteFiche } from './CarteFiche';

/** Carte « Avis clients » (maquette Ma fiche) : note moyenne, nombre d'avis, lien vers Mes avis. */
export function ResumeAvis({ note, nombre }: { note: string | null; nombre: number }) {
  return (
    <CarteFiche
      titre="Avis clients"
      sousTitre="Les retours de vos clients, visibles sur votre fiche."
      className="border-accent-200 bg-accent-100"
      action={
        <Link href={routes.proAvis} className={bouton({ variant: 'secondaire' })}>
          Demander des avis
        </Link>
      }
    >
      {note ? (
        <p className="m-0 flex flex-wrap items-center gap-2">
          <Etoiles />
          <strong>{note}/5</strong>
          <span className="text-neutre-700">({nombre} avis)</span>
        </p>
      ) : (
        <p className="m-0 text-sm text-neutre-800">Pas encore d&apos;avis publié.</p>
      )}
    </CarteFiche>
  );
}
