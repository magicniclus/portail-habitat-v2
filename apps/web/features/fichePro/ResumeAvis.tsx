import { Button } from '@ph/ui';
import { StarIcon } from '@phosphor-icons/react/ssr';
import { DemanderAvis } from '@/features/avisPro/DemanderAvis';
import { Etoiles } from '@/features/vitrine/Etoiles';
import { CarteFiche } from './CarteFiche';

/**
 * Carte « Avis clients » (maquette Ma fiche) : note moyenne et nombre d'avis ; sans avis, 5 étoiles
 * vides qui ouvrent, comme le bouton, le lien à envoyer au client.
 */
export function ResumeAvis({ note, nombre }: { note: string | null; nombre: number }) {
  return (
    <CarteFiche
      titre="Avis clients"
      sousTitre="Les retours de vos clients, visibles sur votre fiche."
      className="border-accent-200 bg-accent-100"
      action={
        <DemanderAvis declencheur={<Button variant="secondaire">Demander des avis</Button>} />
      }
    >
      {note ? (
        <p className="m-0 flex flex-wrap items-center gap-2">
          <Etoiles />
          <strong>{note}/5</strong>
          <span className="text-neutre-700">({nombre} avis)</span>
        </p>
      ) : (
        <DemanderAvis
          declencheur={
            <button
              type="button"
              className="group flex min-h-11 w-fit cursor-pointer items-center gap-2.5 rounded-control border-0 bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span
                aria-hidden="true"
                className="flex gap-0.5 text-neutre-400 group-hover:text-premium"
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <StarIcon key={i} size={20} weight="regular" />
                ))}
              </span>
              <strong>0 avis</strong>
              <span className="text-sm text-accent-700 underline-offset-2 group-hover:underline">
                Demandez votre premier avis
              </span>
            </button>
          }
        />
      )}
    </CarteFiche>
  );
}
