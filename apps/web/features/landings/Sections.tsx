import { decouperGras, type preuveSociale } from '@ph/core/landings';
import { UserCircleIcon } from '@phosphor-icons/react/ssr';
import { cn, Logo } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { bande, conteneur, titre2 } from './styles';

/** En-tête des landings : bandeau, logo et « Espace pro » ; aucun bouton orange (LAND-02). */
export function EnTeteLanding() {
  return (
    <>
      <p className="m-0 flex items-center justify-center gap-x-4 gap-y-1 border-b border-accent-300 bg-accent-100 px-5 py-[9px] text-center text-[13.5px] font-semibold text-accent-800">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="font-bold text-accent">
            ✓
          </span>
          100 % gratuit
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="font-bold text-accent">
            ✓
          </span>
          Sans carte bancaire
        </span>
      </p>
      <header className="border-b border-trait bg-fond">
        <div className={cn(conteneur, 'flex min-h-14 items-center justify-between py-2')}>
          <Link href={routes.pro} className="flex min-h-11 items-center text-texte no-underline">
            <Logo variant="pro" taille={32} />
          </Link>
          <Link
            href={routes.connexionPro}
            className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-accent-300 bg-accent-100 px-4 text-[15px] font-semibold text-accent-800 no-underline transition-colors hover:border-accent hover:bg-accent-100/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <UserCircleIcon size={20} weight="bold" aria-hidden="true" />
            Espace pro
          </Link>
        </div>
      </header>
    </>
  );
}

export function SousTitre({ texte }: { texte: string }) {
  return (
    <p className="m-0 mb-5 max-w-[58ch] text-lg leading-[29px] text-neutre-800">
      {decouperGras(texte).map((s, i) =>
        s.gras ? (
          <strong key={i} className="text-texte">
            {s.texte}
          </strong>
        ) : (
          <span key={i}>{s.texte}</span>
        ),
      )}
    </p>
  );
}

/** LAND-04 : rendue seulement avec des données réelles (`config/preuveSociale`). */
export function PreuveSociale({ p }: { p: ReturnType<typeof preuveSociale> }) {
  if (!p.visible) return null;
  return (
    <section data-preuve-sociale className={bande}>
      <div className={conteneur}>
        <h2 className={titre2}>Ils utilisent déjà Portail Travaux</h2>
        {p.chiffres.length ? (
          <p className="m-0 mb-8 flex flex-wrap gap-x-10 gap-y-3">
            {p.chiffres.map((c) => (
              <span key={c.libelle} className="grid">
                <strong className="text-[32px] leading-tight">{c.valeur}</strong>
                <span className="text-neutre-800">{c.libelle}</span>
              </span>
            ))}
          </p>
        ) : null}
        <div className="grid gap-4 min-[760px]:grid-cols-3">
          {p.temoignages.map((t) => (
            <figure key={t.nom} className="m-0 rounded-[14px] border border-trait p-5">
              <blockquote className="m-0 mb-3 text-[15.5px] leading-[25px]">
                « {t.texte} »
              </blockquote>
              <figcaption className="text-sm text-neutre-800">
                <strong>{t.nom}</strong> · {t.metier} · {t.ville}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
