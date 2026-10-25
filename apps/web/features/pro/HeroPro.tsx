import type { ReactNode } from 'react';
import type { ChiffresVitrine } from '@/features/accueil/vitrine';
import { Etoiles } from '@/features/vitrine/Etoiles';

const ARGUMENTS = [
  "0 € à l'inscription",
  '0 % de commission',
  'Sans engagement',
  'Visible en 3 minutes',
];

/**
 * Photo du hero (maquette Acquisition Artisans v2, emplacement `v2-hero`) : fichier
 * `public/landing/photos/hero-acquisition.webp` (README), détecté au build (next.config).
 * Tant qu'il manque, seul l'aplat teinté s'affiche.
 */
const PHOTO_HERO = process.env.PHOTO_HERO_PRO;

/** Colonne gauche du hero ; le formulaire est à droite (dessous sur mobile, juste après le texte). */
export function AccrochePro({
  chiffres,
  bandeau,
}: {
  chiffres: ChiffresVitrine;
  bandeau: ReactNode;
}) {
  return (
    <div>
      {bandeau}
      <h1 className="m-0 mb-5 text-[clamp(34px,4.6vw,56px)] leading-[1.08] tracking-[-0.02em]">
        Recevez les <span className="accent-editorial">demandes</span> de travaux de{' '}
        <span className="accent-editorial">votre secteur</span>. Inscription{' '}
        <span className="accent-editorial">gratuite</span>.
      </h1>
      <p className="m-0 mb-6 max-w-[56ch] text-lg leading-[29px] text-texte">
        Des particuliers déposent chaque jour leur projet près de chez vous. Créez votre fiche,
        choisissez vos métiers et vos communes, et répondez aux demandes qui vous intéressent. Pas
        de commission, pas d&apos;engagement.
      </p>
      <ul className="m-0 mb-6 flex list-none flex-wrap gap-x-3 gap-y-2.5 p-0">
        {ARGUMENTS.map((a) => (
          <li
            key={a}
            className="rounded-pill border border-accent-300 bg-accent-100 px-3 py-1.5 text-[13px] font-semibold text-accent-800"
          >
            {a}
          </li>
        ))}
      </ul>
      {chiffres ? (
        <p className="m-0 flex flex-col gap-0.5 text-[15px] leading-[22px] text-neutre-800">
          {chiffres.note ? (
            <span className="flex flex-wrap items-center gap-2">
              <Etoiles />
              <strong>{chiffres.note}/5</strong>
              <span className="text-neutre-700">sur {chiffres.avis} avis</span>
            </span>
          ) : null}
          <span>
            <strong>{chiffres.artisans} artisans</strong> développent déjà leur activité avec nous
          </span>
        </p>
      ) : null}
    </div>
  );
}

/** Photo 21:9 aux coins arrondis, sous l'accroche (sous le formulaire sur mobile). */
export function PhotoHeroPro({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`aspect-[21/9] w-full rounded-[16px] bg-cover bg-center ${className ?? ''}`}
      style={{
        backgroundImage: `${PHOTO_HERO ? `url(${PHOTO_HERO}), ` : ''}linear-gradient(135deg, var(--accent-100), var(--accent-200))`,
      }}
    />
  );
}
