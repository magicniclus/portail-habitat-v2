import { bouton } from '@ph/ui';
import { CaptureEcran } from '@/features/landings/CaptureEcran';
import { ListeFaq } from '@/features/vitrine/Section';
import { ATOUTS_ESPACE, FAQ_PRO } from './contenu';

export const conteneurPro = 'mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,44px)]';
const titre2 = 'm-0 mb-3 text-[clamp(28px,3.4vw,38px)] leading-[1.12]';
const bande = 'py-[clamp(48px,6vw,80px)]';

const ECRAN_DEMANDES = { image: 'mes-demandes', url: '', legende: 'Mes demandes, sur téléphone.' };

/**
 * « Votre espace artisan » : le vrai tableau de bord dans un navigateur, « Mes demandes » sur un
 * téléphone posé devant, puis les 4 atouts en cartes. Aucune mention des appels d'offres : /pro
 * parle des demandes gratuites reçues depuis la fiche.
 */
export function EspaceArtisan() {
  return (
    <section
      id="espace"
      className={`scroll-mt-20 overflow-hidden bg-[linear-gradient(180deg,var(--color-blanc)_0%,var(--color-neutre-100)_100%)] ${bande}`}
    >
      <div className={`${conteneurPro} grid gap-[clamp(32px,5vw,56px)]`}>
        <div className="mx-auto grid max-w-[680px] justify-items-center text-center">
          <p className="m-0 mb-3 text-[13px] font-bold tracking-[0.08em] text-accent-700 uppercase">
            Votre espace artisan
          </p>
          <h2 className={titre2}>Tout est au même endroit, et c’est gratuit</h2>
          <p className="m-0 max-w-[54ch] text-[17px] leading-[27px] text-neutre-800">
            Pas besoin d&apos;un logiciel de plus. Vos demandes, vos devis, vos factures et vos avis
            clients sont dans le même espace, sur l&apos;ordinateur comme sur le téléphone.
          </p>
        </div>
        <div
          aria-hidden="true"
          className="relative mx-auto w-full max-w-[1000px] pr-[12%] max-md:pr-0"
        >
          <div className="overflow-hidden rounded-[14px] border border-trait bg-blanc shadow-2xl">
            <div className="flex items-center gap-3 border-b border-trait bg-neutre-100/70 px-3.5 py-2">
              <span className="flex flex-none gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-2.5 rounded-full bg-neutre-200" />
                ))}
              </span>
              <span className="min-w-0 flex-1 truncate rounded-[8px] bg-blanc px-3 py-1 text-[13px] text-neutre-700">
                portailtravaux.fr/pro/tableau-de-bord
              </span>
            </div>
            <picture>
              <source
                srcSet="/landing/captures/espace-artisan-dashboard-desktop.avif"
                type="image/avif"
              />
              <img
                src="/landing/captures/espace-artisan-dashboard-desktop.webp"
                alt=""
                loading="lazy"
                decoding="async"
                className="block aspect-[16/10] w-full object-cover object-top"
              />
            </picture>
          </div>
          <CaptureEcran
            capture={ECRAN_DEMANDES}
            cadre="telephone"
            legende={false}
            className="absolute right-0 -bottom-[6%] w-[24%] drop-shadow-2xl max-md:hidden"
          />
        </div>
        <ul className="m-0 grid list-none gap-[18px] p-0 sm:grid-cols-2 lg:grid-cols-4">
          {ATOUTS_ESPACE.map((a) => (
            <li
              key={a.titre}
              className="grid content-start gap-2.5 rounded-card border border-trait bg-blanc p-5 shadow-sm"
            >
              <span className="flex size-11 items-center justify-center rounded-[12px] bg-accent-100">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent-700)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={a.icone} />
                </svg>
              </span>
              <strong className="text-[17px]">{a.titre}</strong>
              <span className="text-[15px] leading-6 text-neutre-800">{a.texte}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function FichePro() {
  return (
    <section
      className={`${conteneurPro} grid items-center gap-x-[clamp(28px,4vw,60px)] gap-y-8 pb-[clamp(48px,6vw,80px)] min-[900px]:grid-cols-2`}
    >
      <figure className="m-0 overflow-hidden rounded-[16px] border border-trait bg-blanc shadow-lg">
        <div className="flex items-center gap-3 border-b border-trait bg-neutre-100/60 px-3.5 py-2">
          <span aria-hidden="true" className="flex flex-none gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-2.5 rounded-full bg-neutre-200" />
            ))}
          </span>
          <span className="min-w-0 flex-1 truncate rounded-[8px] bg-blanc px-3 py-1 text-[13px] text-neutre-700">
            portailtravaux.fr/artisans/bertrand-renovation
          </span>
        </div>
        <picture>
          <source srcSet="/landing/captures/histoire-client-desktop.avif" type="image/avif" />
          <img
            src="/landing/captures/histoire-client-desktop.webp"
            alt="Fiche d’un artisan sur Portail Travaux, avec le formulaire de demande du client"
            loading="lazy"
            decoding="async"
            className="block aspect-[16/10] w-full object-cover object-top"
          />
        </picture>
      </figure>
      <div>
        <h2 className="m-0 mb-3.5 text-[clamp(26px,3vw,34px)] leading-[1.14]">
          Votre fiche travaille pendant que vous êtes sur le chantier
        </h2>
        <p className="m-0 mb-6 text-base leading-[27px] text-neutre-800">
          Photos de vos réalisations, description de votre savoir-faire, zone d&apos;intervention,
          garanties et avis clients. Un particulier qui a vu votre travail vous écrit avec un projet
          sérieux, depuis votre fiche : cette demande est pour vous seul, et elle ne vous coûte
          rien.
        </p>
        <a href="#inscription" className={bouton({ className: 'text-base' })}>
          Créer ma fiche gratuitement
        </a>
      </div>
    </section>
  );
}

/** Application : PWA installable (D33), sans badge de store (D49). */
export function FaqPro() {
  return (
    <section id="faq" className={`${conteneurPro} scroll-mt-20 ${bande}`}>
      <h2 className="m-0 mb-5 text-[clamp(26px,3vw,34px)] leading-[1.14]">
        Les questions qu&apos;on nous pose avant de s&apos;inscrire
      </h2>
      <div className="max-w-[74ch]">
        <ListeFaq faq={FAQ_PRO} />
      </div>
    </section>
  );
}
