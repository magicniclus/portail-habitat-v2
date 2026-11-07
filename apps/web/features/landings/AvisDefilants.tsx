import type { AvisLanding } from '@ph/core/landings';
import { initiales } from '@ph/core/format';
import { cn } from '@ph/ui';
import { bande, conteneur, titre2 } from './styles';

const FONDS = ['bg-accent-700', 'bg-info', 'bg-succes', 'bg-premium-texte', 'bg-neutre-800'];

function CarteAvis({ a, i }: { a: AvisLanding; i: number }) {
  return (
    <div className="relative grid h-[214px] w-[clamp(290px,calc((100vw-96px)/5),340px)] flex-none grid-rows-[auto_minmax(0,1fr)_auto] gap-2 overflow-hidden rounded-[16px] border border-trait bg-blanc px-[18px] py-4">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-1.5 right-3.5 text-[84px] leading-none font-bold text-accent-100"
      >
        ”
      </span>
      <div className="relative flex items-center gap-2">
        <span role="img" aria-label="5 étoiles sur 5" className="text-sm leading-none text-accent">
          ★★★★★
        </span>
        <span className="rounded-pill bg-accent-100 px-2 py-[3px] text-xs font-bold text-accent-800">
          5,0
        </span>
      </div>
      <p className="relative m-0 line-clamp-4 self-start text-[15px] leading-[22px]">{a.texte}</p>
      <div className="relative flex items-center gap-2.5 border-t border-trait pt-3">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-9 flex-none items-center justify-center rounded-full text-[13px] font-bold text-blanc',
            FONDS[i % FONDS.length],
          )}
        >
          {initiales(a.nom)}
        </span>
        <span className="grid min-w-0">
          <span className="text-sm leading-[18px] font-bold">{a.nom}</span>
          <span className="text-[12.5px] leading-[17px] text-neutre-700">{a.metier}</span>
        </span>
      </div>
    </div>
  );
}

const bord =
  'pointer-events-none absolute inset-y-0 w-[clamp(48px,12vw,200px)] backdrop-blur-[4px] from-blanc via-blanc/70 to-transparent';

/** Bandeau défilant (LANDINGS §3.10) : seulement avec `preuvesMarketing` (avis à remplacer, §7). */
export function AvisDefilants({ avis }: { avis: AvisLanding[] }) {
  if (!avis.length) return null;
  const bas = [...avis.slice(10), ...avis.slice(0, 10)];
  const ligne = (liste: AvisLanding[], sens: 'gauche' | 'droite') => (
    <div
      className="flex w-max gap-4 hover:[animation-play-state:paused] motion-reduce:!animate-none"
      style={{ animation: `defiler-${sens} 80s linear infinite` }}
    >
      {[...liste, ...liste].map((a, i) => (
        <CarteAvis key={`${a.nom}-${i}`} a={a} i={i} />
      ))}
    </div>
  );
  return (
    <section aria-label="Avis d’artisans" className={cn(bande, 'overflow-hidden bg-blanc')}>
      <div className={cn(conteneur, 'mb-[clamp(24px,3vw,40px)]')}>
        <h2 className={cn(titre2, 'm-0 max-w-[22ch] text-[clamp(28px,3.6vw,42px)] leading-[1.1]')}>
          Ce qu’en disent les artisans
        </h2>
      </div>
      <div className="relative grid gap-4">
        {ligne(avis, 'gauche')}
        {ligne(bas, 'droite')}
        <div
          aria-hidden="true"
          className={cn(
            bord,
            'left-0 bg-gradient-to-r [mask-image:linear-gradient(90deg,#000_40%,transparent)]',
          )}
        />
        <div
          aria-hidden="true"
          className={cn(
            bord,
            'right-0 bg-gradient-to-l [mask-image:linear-gradient(270deg,#000_40%,transparent)]',
          )}
        />
      </div>
    </section>
  );
}
