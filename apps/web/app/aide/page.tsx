import { Logo } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FormulaireContact } from '@/features/aide/FormulaireContact';
import { LienGererCookies } from '@/features/cookies/BandeauCookies';
import { EspaceTheme } from '@/features/theme/Theme';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { ListeFaq } from '@/features/vitrine/Section';
import { faqPage } from '@/features/vitrine/seo';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Aide et contact',
  description:
    'Une question sur un projet, un diagnostic ou votre demande ? Notre équipe répond sous 24 h ouvrées.',
  alternates: { canonical: '/aide' },
};

const FAQ = [
  {
    q: 'Le service est-il gratuit ?',
    r: 'Oui. Le simulateur, le diagnostic et la mise en relation sont gratuits pour les particuliers, sans engagement.',
  },
  {
    q: "Combien d'artisans vont me contacter ?",
    r: 'Trois professionnels au plus, choisis près de chez vous selon votre projet.',
  },
  {
    q: 'Les prix du simulateur sont-ils fiables ?',
    r: "Ce sont des fourchettes indicatives. Seul le devis de l'artisan, après visite, fait foi.",
  },
  {
    q: 'Comment modifier ou annuler ma demande ?',
    r: 'Depuis le lien reçu par email, ou en nous écrivant avec la référence de la demande.',
  },
  {
    q: "Un artisan ne m'a jamais rappelé",
    r: "Choisissez « Le suivi de ma demande » ci-contre : nous relançons l'artisan ou en proposons un autre.",
  },
];

const conteneur = 'mx-auto w-full max-w-[1220px] px-[clamp(18px,4vw,40px)]';

export default function Aide() {
  return (
    <EspaceTheme theme="particulier">
      <JsonLd donnees={faqPage(FAQ)} />
      <div className="flex min-h-dvh flex-col">
        <header className="border-b border-trait bg-fond">
          <div className={`${conteneur} flex min-h-14 flex-wrap items-center gap-x-6 gap-y-1 py-2`}>
            <Link
              href={routes.accueil}
              className="flex min-h-11 items-center text-texte no-underline"
            >
              <Logo taille={32} />
            </Link>
            <span className="hidden text-[15px] text-neutre-800 sm:inline">Aide et contact</span>
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
        <main
          className={`${conteneur} grid flex-1 items-start gap-x-[clamp(28px,4vw,64px)] gap-y-10 py-[clamp(28px,4vw,56px)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]`}
        >
          <section>
            <h1 className="m-0 mb-2.5 text-[clamp(28px,3.6vw,40px)] leading-[1.1]">
              Une question ? Écrivez-nous.
            </h1>
            <p className="m-0 mb-7 text-[17px] leading-[27px] text-neutre-800">
              Notre équipe répond sous 24 h ouvrées, du lundi au vendredi, 9 h – 18 h.
            </p>
            <FormulaireContact />
          </section>
          <aside className="grid gap-8">
            <div className="grid gap-1.5">
              <h2 className="m-0 text-[19px]">Autres moyens</h2>
              <p className="m-0 text-[15.5px] leading-[25px] text-neutre-800">
                Email : <a href="mailto:contact@portail-habitat.fr">contact@portail-habitat.fr</a>
                <br />
                Du lundi au vendredi, 9 h – 18 h
              </p>
            </div>
            <div className="grid gap-2.5">
              <h2 className="m-0 text-[19px]">Questions fréquentes</h2>
              <ListeFaq faq={FAQ} />
            </div>
            <p className="m-0 text-[15px] leading-6 text-neutre-800">
              Vous êtes artisan ? <Link href={routes.pro}>Découvrir l&apos;espace pro</Link>. Déjà
              inscrit : l&apos;aide se trouve dans votre espace.
            </p>
          </aside>
        </main>
        <footer className="bg-accent-900 text-sm text-accent-200">
          <div
            className={`${conteneur} flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-4`}
          >
            <span>
              © {new Date().getFullYear()} Portail Habitat · Plateforme de mise en relation
            </span>
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
              <Link
                href={routes.mentionsParticuliers}
                className="inline-flex min-h-11 items-center text-accent-200"
              >
                Mentions légales
              </Link>
              <LienGererCookies className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm text-accent-200 underline" />
            </span>
          </div>
        </footer>
      </div>
    </EspaceTheme>
  );
}
