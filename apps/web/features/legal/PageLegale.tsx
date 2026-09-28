import { formatDate } from '@ph/core/format';
import { bouton, cn, Logo } from '@ph/ui';
import Link from 'next/link';
import { LienGererCookies } from '@/features/cookies/BandeauCookies';
import { routes } from '@/lib/routes';
import {
  sommaire,
  VERSION_LEGALE,
  type DocumentLegal,
  type EntreeSommaire,
  type PublicLegal,
} from './documents';

const conteneur = 'mx-auto w-full max-w-[1220px] px-[clamp(18px,4vw,40px)]';

function Icone({ d }: { d: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-none"
    >
      <path d={d} />
    </svg>
  );
}

/** Maquette Pages Legales : sélecteur de public, sommaire latéral, document, précédent / suivant. */
export function PageLegale({
  public: pub,
  slug,
  doc,
  precedent,
  suivant,
}: {
  public: PublicLegal;
  slug: string;
  doc: DocumentLegal;
  precedent: EntreeSommaire | null;
  suivant: EntreeSommaire | null;
}) {
  const date = formatDate(VERSION_LEGALE, 'long');
  const pro = pub === 'pro';
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-trait bg-fond">
        <div className={`${conteneur} flex min-h-14 flex-wrap items-center gap-x-6 gap-y-1 py-2`}>
          <Link
            href={routes.accueil}
            className="flex min-h-11 items-center text-texte no-underline"
          >
            <Logo taille={32} variant={pro ? 'pro' : 'particulier'} />
          </Link>
          <span className="hidden text-[15px] text-neutre-800 sm:inline">Informations légales</span>
          <nav aria-label="Espaces" className="ml-auto flex gap-3 text-sm">
            <Link
              href={routes.accueil}
              className="inline-flex min-h-11 items-center text-neutre-800 no-underline"
            >
              Espace particuliers
            </Link>
            <Link
              href={routes.pro}
              className="inline-flex min-h-11 items-center text-neutre-800 no-underline"
            >
              Espace artisans
            </Link>
          </nav>
        </div>
      </header>

      <div className="border-b border-trait bg-accent-100 py-[clamp(24px,3.5vw,40px)]">
        <div className={conteneur}>
          <p className="m-0 mb-2.5 text-[clamp(25px,3.2vw,36px)] leading-[1.1] font-bold">
            Informations légales et sécurité
          </p>
          <p className="m-0 mb-[18px] max-w-[80ch] text-[16.5px] leading-[26px] text-neutre-800">
            Portail Habitat est une plateforme de mise en relation. Ces documents précisent le rôle
            exact de l&apos;éditeur, les responsabilités de chacun, le traitement de vos données et
            les mesures de sécurité en place. Version en vigueur au {date}.
          </p>
          <nav aria-label="Public" className="flex flex-wrap gap-2.5">
            {(['particuliers', 'pro'] as const).map((p) => (
              <Link
                key={p}
                href={routes.legal(p, sommaire(p)[0]!.slug)}
                aria-current={p === pub ? 'page' : undefined}
                className={bouton({
                  variant: p === pub ? 'primaire' : 'secondaire',
                  className: 'text-[15px]',
                })}
              >
                {p === 'pro' ? 'Artisans et professionnels' : 'Particuliers'}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <main className={`${conteneur} flex-1 py-[clamp(24px,3.5vw,44px)]`}>
        <div className="grid items-start gap-x-[clamp(24px,3.5vw,44px)] gap-y-7 lg:grid-cols-[minmax(0,268px)_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4 lg:sticky lg:top-[18px]">
            <nav
              aria-labelledby="sommaire-legal"
              className="rounded-card border border-trait bg-blanc p-4"
            >
              <p
                id="sommaire-legal"
                className="m-0 mb-3 text-[13px] tracking-[0.07em] text-neutre-700 uppercase"
              >
                {pro ? 'Documents professionnels' : 'Documents particuliers'}
              </p>
              <ul className="m-0 grid list-none gap-1.5 p-0">
                {sommaire(pub).map((d) => {
                  const actif = d.slug === slug;
                  return (
                    <li key={d.slug}>
                      <Link
                        href={routes.legal(pub, d.slug)}
                        aria-current={actif ? 'page' : undefined}
                        className={cn(
                          'flex min-h-11 items-center gap-2.5 rounded-control border px-3 text-[14.5px] no-underline',
                          actif
                            ? 'border-accent bg-accent-100 font-semibold text-accent-800'
                            : 'border-trait bg-blanc text-neutre-800 hover:bg-neutre-100',
                        )}
                      >
                        <Icone d={d.icone} />
                        {d.titre}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="rounded-card bg-accent-100 p-4">
              <p className="m-0 mb-1.5 text-[14.5px] font-bold">Une question juridique ?</p>
              <p className="m-0 mb-3 text-[13.5px] leading-[21px] text-neutre-800">
                Réclamation, exercice de vos droits, signalement d&apos;un contenu : une seule
                adresse.
              </p>
              <Link
                href={routes.aideSujet('juridique')}
                className={bouton({ variant: 'secondaire', taille: 'sm' })}
              >
                Nous écrire
              </Link>
            </div>
          </aside>

          <article className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span className="rounded-pill bg-accent-100 px-2.5 py-1 text-xs font-semibold text-accent-800">
                {pro ? 'Professionnels' : 'Particuliers'}
              </span>
              <span className="text-[13.5px] text-neutre-700">Dernière mise à jour : {date}</span>
            </div>
            <h1 className="m-0 mb-3 text-[clamp(24px,3vw,33px)] leading-[1.12]">{doc.titre}</h1>
            <p className="m-0 mb-7 max-w-[72ch] text-[16.5px] leading-[27px] text-neutre-800">
              {doc.chapeau}
            </p>
            {doc.encadre ? (
              <div className="mb-7 flex max-w-[72ch] gap-3 rounded-card bg-attention-fond p-4">
                <p className="m-0 text-[14.5px] leading-[23px] text-attention">
                  <strong>{doc.encadre[0]}</strong> {doc.encadre[1]}
                </p>
              </div>
            ) : null}
            <div className="grid max-w-[72ch] gap-[30px]">
              {doc.sections.map((s) => (
                <section key={s.titre}>
                  <h2 className="m-0 mb-3 text-[19.5px] leading-[1.2]">{s.titre}</h2>
                  {s.paragraphes.map((p) => (
                    <p key={p} className="m-0 mb-3 text-[15.5px] leading-[26px] text-neutre-800">
                      {p}
                    </p>
                  ))}
                  {s.liste ? (
                    <ul className="m-0 mt-1 grid gap-1.5 pl-5">
                      {s.liste.map((l) => (
                        <li key={l} className="text-[15.5px] leading-[25px] text-neutre-800">
                          {l}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {s.tableau ? (
                    <div className="mt-1.5 overflow-x-auto">
                      <table className="w-full min-w-[480px] border-collapse text-left text-[14.5px]">
                        <thead>
                          <tr className="border-b-2 border-trait">
                            {s.tableau.entetes.map((e) => (
                              <th key={e} scope="col" className="px-2.5 py-2.5 font-semibold">
                                {e}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {s.tableau.lignes.map((l) => (
                            <tr key={l.join('|')} className="border-b border-trait align-top">
                              {l.map((c, i) => (
                                <td key={i} className="px-2.5 py-2.5">
                                  {c}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
            <nav
              aria-label="Documents"
              className="mt-9 flex flex-wrap gap-3 border-t border-trait pt-6"
            >
              {precedent ? (
                <Link
                  href={routes.legal(pub, precedent.slug)}
                  className={bouton({ variant: 'fantome' })}
                >
                  ← {precedent.titre}
                </Link>
              ) : null}
              {suivant ? (
                <Link
                  href={routes.legal(pub, suivant.slug)}
                  className={bouton({ variant: 'secondaire', className: 'ml-auto' })}
                >
                  {suivant.titre} →
                </Link>
              ) : null}
            </nav>
          </article>
        </div>
      </main>

      <footer className="bg-accent-900 text-sm text-accent-200">
        <div
          className={`${conteneur} flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-4`}
        >
          <span>© {new Date().getFullYear()} Portail Habitat · Plateforme de mise en relation</span>
          <span className="flex flex-wrap items-center gap-x-[18px]">
            <Link
              href={routes.accueil}
              className="inline-flex min-h-11 items-center text-accent-200"
            >
              Particuliers
            </Link>
            <Link href={routes.pro} className="inline-flex min-h-11 items-center text-accent-200">
              Artisans
            </Link>
            <Link href={routes.aide} className="inline-flex min-h-11 items-center text-accent-200">
              Aide et contact
            </Link>
            <LienGererCookies className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm text-accent-200 underline" />
          </span>
        </div>
      </footer>
    </div>
  );
}
