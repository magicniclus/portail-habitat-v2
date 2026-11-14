import { BellRingingIcon, CheckCircleIcon, MapPinIcon } from '@phosphor-icons/react/ssr';
import { cn } from '@ph/ui';

/** Écrans réels de l'histoire (`public/landing/captures/{nom}-{desktop|mobile}`). */
export const HISTOIRE = [
  {
    titre: 'Vous complétez votre fiche',
    texte:
      'Logo, photos de chantiers, description, métiers et zone : votre fiche est prête en quelques minutes, et l’IA peut la rédiger pour vous.',
    ecrans: ['histoire-fiche'],
    url: 'portailtravaux.fr/pro/fiche',
  },
  {
    titre: 'Les clients vous trouvent sur le portail',
    texte:
      'Quand un particulier cherche votre métier près de chez lui, votre fiche apparaît, avec vos avis, vos photos et votre zone.',
    ecrans: ['histoire-portail', 'histoire-fiche-publique'],
    url: 'portailtravaux.fr/artisans',
  },
  {
    titre: 'Ils vous envoient leur demande',
    texte:
      'Le client laisse ses coordonnées et son projet sur votre fiche : la demande arrive chez vous, avec son nom et son téléphone. Jusqu’à 10 demandes par mois, gratuites.',
    ecrans: ['histoire-client'],
    url: 'portailtravaux.fr/artisans/bertrand-renovation',
  },
] as const;

const CAPTURES = '/landing/captures';

/** Capture réelle : version téléphone sous 768 px, ordinateur au-dessus. */
export function Ecran({ nom, visible }: { nom: string; visible: boolean }) {
  return (
    <picture>
      <source
        media="(max-width: 767px)"
        srcSet={`${CAPTURES}/${nom}-mobile.avif`}
        type="image/avif"
      />
      <source media="(max-width: 767px)" srcSet={`${CAPTURES}/${nom}-mobile.webp`} />
      <source srcSet={`${CAPTURES}/${nom}-desktop.avif`} type="image/avif" />
      <img
        src={`${CAPTURES}/${nom}-desktop.webp`}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn(
          'absolute inset-0 size-full object-cover object-top transition-[opacity,transform] duration-700 ease-out',
          visible ? 'scale-100 opacity-100' : 'scale-[1.02] opacity-0',
        )}
      />
    </picture>
  );
}

const carte =
  'absolute z-[2] rounded-[14px] border border-trait bg-blanc/95 shadow-lg backdrop-blur transition-[opacity,transform] duration-500 ease-out';
const apparait = (on: boolean, depuis = 'translate-y-3') =>
  on ? 'translate-y-0 translate-x-0 opacity-100' : `${depuis} opacity-0`;

/** Encarts animés posés sur l'écran de chaque étape. */
export function Encarts({ etape }: { etape: number }) {
  return (
    <>
      <div
        className={cn(
          carte,
          'bottom-4 left-4 grid w-[min(280px,70%)] gap-2 p-3.5',
          apparait(etape === 0),
        )}
      >
        <span className="flex items-center justify-between text-[13px] font-bold">
          Fiche complétée <span className="text-succes">100 %</span>
        </span>
        <span className="h-1.5 overflow-hidden rounded-pill bg-neutre-200">
          <span className="block h-full w-full rounded-pill bg-succes" />
        </span>
        <span className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-neutre-800">
          {['Logo', 'Photos', 'Description', 'Avis'].map((x) => (
            <span key={x} className="inline-flex items-center gap-1">
              <CheckCircleIcon size={14} weight="fill" className="text-succes" /> {x}
            </span>
          ))}
        </span>
      </div>
      <div
        className={cn(
          carte,
          'right-4 bottom-4 flex items-center gap-3 px-4 py-3',
          apparait(etape === 1),
        )}
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-accent-100 text-accent-700">
          <MapPinIcon size={20} weight="fill" />
        </span>
        <span className="grid text-[13px] leading-tight">
          <b>Visible près de chez vos clients</b>
          <span className="text-neutre-700">Plombier · Bordeaux et alentours</span>
        </span>
      </div>
      <div
        className={cn(
          carte,
          'top-4 right-4 flex max-w-[78%] items-center gap-3 px-4 py-3',
          apparait(etape === 2, '-translate-y-3'),
        )}
      >
        <span className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-accent text-blanc">
          <BellRingingIcon size={20} weight="fill" />
        </span>
        <span className="grid text-[13px] leading-tight">
          <b>Nouvelle demande · Claire M.</b>
          <span className="text-neutre-700">Salle de bain · Mérignac (33700)</span>
        </span>
      </div>
      <div
        className={cn(
          carte,
          'bottom-4 left-4 grid w-[min(250px,66%)] gap-1.5 p-3.5',
          apparait(etape === 2),
        )}
      >
        <span className="text-[12px] font-bold tracking-[0.04em] text-neutre-700 uppercase">
          Demandes gratuites ce mois
        </span>
        <span className="flex items-baseline gap-1.5">
          <b className="text-[30px] leading-none text-accent-700">1</b>
          <span className="text-[15px] font-semibold text-neutre-800">/ 10</span>
        </span>
        <span className="h-1.5 overflow-hidden rounded-pill bg-neutre-200">
          <span className="block h-full w-[10%] rounded-pill bg-accent" />
        </span>
      </div>
    </>
  );
}
