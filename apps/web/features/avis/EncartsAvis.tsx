import { bouton } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { initiales } from '@ph/core/format';
import { resumeNote, type ArtisanAvis } from './types';

const puce = 'font-bold text-accent-400';

/** Colonne de droite du formulaire : l'artisan, la protection des avis, la médiation. */
export function EncartsAvis({ artisan }: { artisan: ArtisanAvis }) {
  return (
    <aside className="grid gap-4 lg:sticky lg:top-5">
      <div className="flex items-center gap-3.5 rounded-[16px] bg-blanc p-5.5 shadow-sm">
        <span
          aria-hidden="true"
          className="grid size-[52px] flex-none place-items-center rounded-[14px] bg-accent-100 text-lg font-bold text-accent-700"
        >
          {initiales(artisan.nom)}
        </span>
        <span>
          <strong className="block text-[17px]">{artisan.nom}</strong>
          <span className="text-sm text-neutre-800">Note actuelle : {resumeNote(artisan)}</span>
        </span>
      </div>

      <div className="rounded-[16px] bg-accent-900 p-5.5 text-accent-200">
        <p className="m-0 mb-3.5 text-base font-bold text-blanc">Comment on protège les avis</p>
        <ul className="m-0 grid list-none gap-3 p-0 text-sm leading-[22px]">
          {[
            'Chaque avis est relu sous 48 h avant publication.',
            'L’artisan peut répondre publiquement, sans jamais modifier ni supprimer votre avis.',
            'Votre email reste privé ; seul le nom affiché est visible.',
          ].map((t) => (
            <li key={t} className="flex gap-2.5">
              <span aria-hidden="true" className={puce}>
                ✓
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[16px] bg-accent-2-100 p-5">
        <p className="m-0 mb-2 text-[15.5px] font-bold">Un litige plutôt qu&apos;un avis ?</p>
        <p className="m-0 mb-2 text-sm leading-[22px] text-neutre-800">
          Si le chantier s&apos;est mal terminé, notre équipe peut intervenir en médiation avant que
          vous publiiez.
        </p>
        <Link
          href={routes.aideSujet('mediation')}
          className="inline-flex min-h-11 items-center text-[14.5px] font-semibold text-accent-2-700"
        >
          Demander une médiation →
        </Link>
      </div>
    </aside>
  );
}

/** Vue « Publication » (AVI-03) : l'avis part en modération, rien n'est publié tout de suite. */
export function ConfirmationAvis({
  artisan,
  note,
  onRecommencer,
}: {
  artisan: ArtisanAvis;
  note: number;
  onRecommencer: () => void;
}) {
  return (
    <div className="mx-auto max-w-[620px] rounded-[18px] bg-blanc p-[clamp(26px,4vw,44px)] text-center shadow-md">
      <span className="mb-5 inline-grid size-16 place-items-center rounded-full bg-accent-100">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-accent"
        >
          <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
        </svg>
      </span>
      <h1 className="m-0 mb-3 text-[clamp(25px,3vw,33px)] leading-[1.14]">
        Merci, votre avis est envoyé
      </h1>
      <p className="m-0 mb-5.5 text-[16.5px] leading-[27px] text-neutre-800">
        Vous avez attribué <strong>{note}/5</strong> à {artisan.nom}. Notre équipe le relit sous 48
        h, puis il apparaît sur sa fiche et vous recevez un email de confirmation.
      </p>
      <div className="mb-6 rounded-[12px] bg-accent-100 p-4.5 text-left">
        <p className="m-0 mb-2.5 text-sm font-bold">Et ensuite ?</p>
        <ol className="m-0 grid list-none gap-2 p-0 text-[14.5px] leading-[23px] text-neutre-800">
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="font-bold text-accent">
              1
            </span>
            L&apos;artisan est informé et peut vous répondre publiquement.
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="font-bold text-accent">
              2
            </span>
            Vous pouvez modifier ou retirer votre avis depuis votre espace.
          </li>
        </ol>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href={routes.accueil} className={bouton({ taille: 'lg' })}>
          Retour à l&apos;accueil
        </Link>
        <button
          type="button"
          onClick={onRecommencer}
          className={bouton({ variant: 'secondaire', taille: 'lg' })}
        >
          Noter un autre artisan
        </button>
      </div>
    </div>
  );
}
