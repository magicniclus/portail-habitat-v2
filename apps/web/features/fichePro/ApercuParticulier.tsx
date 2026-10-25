import type { ReactNode } from 'react';

const champ =
  'min-h-11 w-full rounded-control border border-neutre-400 bg-blanc px-3 text-base text-neutre-700';

/**
 * « Aperçu côté particulier » (maquette Ma fiche) : le formulaire de demande tel que les
 * particuliers le voient sur la fiche, inactif ici. Collé sous l'en-tête (et la barre de
 * progression, `--barre-fiche`) au défilement. `encart` : offre du numéro masqué, s'il y a lieu.
 */
export function ApercuParticulier({ encart }: { encart: ReactNode }) {
  return (
    <aside
      id="apercu"
      aria-label="Aperçu côté particulier"
      className="grid content-start gap-3 rounded-[16px] border border-trait bg-blanc p-5 lg:sticky lg:top-[calc(var(--entete-pro,65px)+var(--barre-fiche,0px)+20px)]"
    >
      <p className="m-0 text-xs font-bold tracking-[0.08em] text-accent-700 uppercase">
        Aperçu côté particulier
      </p>
      <h2 className="m-0 text-xl">Demander un devis</h2>
      <div aria-hidden="true" className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <span className={`${champ} flex items-center`}>Prénom *</span>
          <span className={`${champ} flex items-center`}>Nom *</span>
        </div>
        {['Email *', 'Téléphone *', 'Code postal *'].map((t) => (
          <span key={t} className={`${champ} flex items-center`}>
            {t}
          </span>
        ))}
        <span className={`${champ} block h-[88px] py-2.5`}>Description du projet (optionnel)</span>
        <span className="flex min-h-12 items-center justify-center rounded-control bg-accent-action font-semibold text-blanc">
          Envoyer ma demande
        </span>
        <span className="flex min-h-11 items-center justify-center rounded-control border border-trait font-semibold">
          Voir le numéro de téléphone
        </span>
      </div>
      <p className="m-0 text-[13px] leading-5 text-neutre-800">
        C&apos;est le formulaire que voient les particuliers sur votre fiche.
      </p>
      {encart}
    </aside>
  );
}
