import { formatEuros, formatFourchette } from '@ph/core/format';
import { bouton } from '@ph/ui';
import type { ReactNode } from 'react';
import type { ChiffresVitrine } from '@/features/accueil/vitrine';
import { Etoiles } from '@/features/vitrine/Etoiles';
import { ListeFaq } from '@/features/vitrine/Section';
import { Visuel } from '@/features/vitrine/Visuel';
import { ATOUTS_ESPACE, ETAPES_PRO, EXEMPLES_DEMANDES, FAQ_PRO } from './contenu';

export const conteneurPro = 'mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,44px)]';
const titre2 = 'm-0 mb-3 text-[clamp(28px,3.4vw,38px)] leading-[1.12]';
const bande = 'py-[clamp(48px,6vw,80px)]';

const ARGUMENTS = [
  "0 € à l'inscription",
  '0 % de commission',
  'Sans engagement',
  'Visible en 3 minutes',
];

/** Colonne gauche du hero ; le formulaire est placé à droite (dessous sur mobile, directement après le titre). */
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
      <h1 className="m-0 mb-[18px] text-[clamp(34px,4.6vw,56px)] leading-[1.08]">
        Recevez les <span className="accent-editorial">demandes</span> de travaux de{' '}
        <span className="accent-editorial">votre secteur</span>. Inscription{' '}
        <span className="accent-editorial">gratuite</span>.
      </h1>
      <p className="m-0 mb-[22px] max-w-[56ch] text-lg leading-[29px] text-neutre-800">
        Des particuliers déposent chaque jour leur projet près de chez vous. Créez votre fiche,
        choisissez vos métiers et vos communes, et répondez aux demandes qui vous intéressent. Pas
        de commission, pas d&apos;engagement.
      </p>
      <ul className="m-0 mb-6 flex list-none flex-wrap gap-x-3 gap-y-2.5 p-0">
        {ARGUMENTS.map((a) => (
          <li
            key={a}
            className="rounded-pill border border-accent-200 bg-accent-100 px-3 py-1.5 text-[13px] font-semibold text-accent-800"
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
      <div className="mt-9 hidden aspect-[21/9] overflow-hidden rounded-[16px] min-[900px]:block">
        <Visuel />
      </div>
    </div>
  );
}

export function ExemplesDemandes() {
  return (
    <section id="demandes" className={`bg-neutre-100 ${bande}`}>
      <div className={conteneurPro}>
        <h2 className={titre2}>Voilà le type de demandes que vous recevrez</h2>
        <p className="m-0 mb-7 max-w-[60ch] text-[17px] leading-[27px] text-neutre-800">
          Chaque demande indique le chantier, la ville, le budget annoncé et le délai. Vous répondez
          à celles qui vous vont, vous ignorez les autres.
        </p>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-[18px] p-0">
          {EXEMPLES_DEMANDES.map((d) => (
            <li key={d.titre} className="overflow-hidden rounded-card bg-blanc shadow-sm">
              <div className="aspect-[4/3]">
                <Visuel />
              </div>
              <div className="flex flex-col gap-2 px-[18px] pt-4 pb-[18px]">
                <span
                  className={`self-start rounded-pill px-2.5 py-1 text-xs font-semibold ${d.vif ? 'bg-accent-100 text-accent-800' : 'bg-neutre-200 text-neutre-800'}`}
                >
                  {d.etiquette}
                </span>
                <h3 className="m-0 text-[19px]">{d.titre}</h3>
                <p className="m-0 text-sm leading-[22px] text-neutre-800">
                  {d.ville} · Budget {formatFourchette(d.budget[0], d.budget[1])} · {d.delai}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="m-0 mt-4 text-sm text-neutre-800">
          Exemples de demandes, à titre d&apos;illustration.
        </p>
      </div>
    </section>
  );
}

export function EtapesPro() {
  return (
    <section className={`bg-neutre-100 pb-[clamp(48px,6vw,80px)]`}>
      <div className={conteneurPro}>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="m-0 mb-2 text-[13px] tracking-[0.08em] text-accent-700 uppercase">
              En 3 minutes chrono
            </p>
            <h2 className="m-0 text-[clamp(28px,3.4vw,38px)] leading-[1.12]">Comment ça marche</h2>
          </div>
          <a href="#inscription" className={bouton({ className: 'text-base' })}>
            Je commence maintenant
          </a>
        </div>
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-[18px] p-0">
          {ETAPES_PRO.map((e, i) => (
            <li key={e.titre} className="rounded-card border border-trait bg-blanc p-6">
              <span
                aria-hidden="true"
                className="mb-4 flex size-11 items-center justify-center rounded-full bg-accent-action text-lg font-bold text-blanc"
              >
                {i + 1}
              </span>
              <h3 className="m-0 mb-2 text-[21px]">{e.titre}</h3>
              <p className="m-0 mb-3 text-[15.5px] leading-[25px] text-neutre-800">{e.texte}</p>
              <p className="m-0 text-[13px] font-semibold text-accent-700">{e.delai}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function EspaceArtisan() {
  return (
    <section id="espace" className={`scroll-mt-20 ${bande}`}>
      <div
        className={`${conteneurPro} grid items-center gap-x-[clamp(28px,4vw,60px)] gap-y-9 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]`}
      >
        <div>
          <h2 className={titre2}>Votre espace artisan : tout est au même endroit</h2>
          <p className="m-0 mb-6 text-[17px] leading-[27px] text-neutre-800">
            Pas besoin d&apos;un logiciel de plus. Vos demandes, vos relances, vos devis et vos avis
            clients sont dans le même espace, accessible depuis l&apos;ordinateur ou le téléphone.
          </p>
          <ul className="m-0 grid list-none gap-[18px] p-0">
            {ATOUTS_ESPACE.map((a) => (
              <li key={a.titre} className="flex items-start gap-3.5">
                <span className="flex size-10 flex-none items-center justify-center rounded-control bg-accent-100">
                  <svg
                    width="21"
                    height="21"
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
                <span>
                  <strong className="text-base">{a.titre}</strong>
                  <br />
                  <span className="text-[15px] leading-6 text-neutre-800">{a.texte}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <figure className="m-0">
          <div
            aria-hidden="true"
            className="overflow-hidden rounded-[16px] border border-trait bg-blanc shadow-lg"
          >
            <div className="flex items-center gap-2 border-b border-trait bg-surface px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-2.5 rounded-full bg-neutre-400" />
              ))}
              <span className="ml-2.5 text-xs text-neutre-700">
                portailhabitat.fr/pro/appels-d-offres
              </span>
            </div>
            <div className="grid gap-3.5 p-[18px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-[17px]">Appels d&apos;offres · Gironde</strong>
                <span className="rounded-pill bg-accent-100 px-2.5 py-1 text-xs font-semibold text-accent-800">
                  Premium : 24 h d&apos;avance
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {['Tous (12)', 'Couverture', 'Isolation', 'Moins de 30 km'].map((c, i) => (
                  <span
                    key={c}
                    className={`rounded-pill px-2.5 py-[5px] ${i === 0 ? 'bg-accent-action text-blanc' : 'bg-neutre-100'}`}
                  >
                    {c}
                  </span>
                ))}
              </div>
              <div className="rounded-[12px] border border-accent bg-accent-100 p-3.5 text-[13px]">
                <div className="flex justify-between gap-2.5">
                  <strong className="text-[15px]">Réfection toiture 90 m² · Pessac</strong>
                  <span className="text-xs font-semibold whitespace-nowrap text-accent-700">
                    Visible 24 h avant
                  </span>
                </div>
                <div className="mt-1 flex justify-between gap-2.5">
                  <span>{formatFourchette(900_000, 1_400_000)} · démarrage urgent</span>
                  <span>3 réponses max</span>
                </div>
              </div>
              {[
                [
                  'Isolation combles perdus · Mérignac',
                  'Ouvre dans 6 h',
                  formatFourchette(400_000, 650_000) + ' · sous 2 mois',
                ],
                [
                  'Bardage bois maison · Talence',
                  'Ouvre demain',
                  formatFourchette(700_000, 1_000_000) + ' · 1 à 3 mois',
                ],
              ].map(([t, o, d]) => (
                <div key={t} className="rounded-[12px] border border-trait p-3.5 text-[13px]">
                  <div className="flex justify-between gap-2.5">
                    <strong className="text-[15px]">{t}</strong>
                    <span className="text-xs whitespace-nowrap text-neutre-700">{o}</span>
                  </div>
                  <div className="mt-1 text-neutre-800">{d}</div>
                </div>
              ))}
            </div>
          </div>
          <figcaption className="mt-2.5 text-[13px] text-neutre-800">
            L&apos;espace appels d&apos;offres : les projets de votre zone, ouverts 24 h avant pour
            les comptes Premium.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

export function FichePro() {
  return (
    <section
      className={`${conteneurPro} grid items-center gap-x-[clamp(28px,4vw,60px)] gap-y-8 pb-[clamp(48px,6vw,80px)] min-[900px]:grid-cols-2`}
    >
      <figure className="m-0 aspect-[4/3] overflow-hidden rounded-[16px]">
        <Visuel />
      </figure>
      <div>
        <h2 className="m-0 mb-3.5 text-[clamp(26px,3vw,34px)] leading-[1.14]">
          Votre fiche travaille pendant que vous êtes sur le chantier
        </h2>
        <p className="m-0 mb-6 text-base leading-[27px] text-neutre-800">
          Photos de vos réalisations, description de votre savoir-faire, zone d&apos;intervention,
          garanties et avis clients. Un particulier qui a vu votre travail appelle avec un projet
          sérieux.
        </p>
        <a href="#inscription" className={bouton({ className: 'text-base' })}>
          Créer ma fiche gratuitement
        </a>
      </div>
    </section>
  );
}

/** Application : PWA installable (D33), sans badge de store (D49). */
export function ApplicationPro() {
  return (
    <section className={`bg-accent-100 ${bande}`}>
      <div
        className={`${conteneurPro} grid items-center gap-x-[clamp(28px,4vw,60px)] gap-y-10 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]`}
      >
        <div>
          <p className="m-0 mb-3 text-[13px] tracking-[0.08em] text-accent-700 uppercase">
            Application mobile
          </p>
          <h2 className={titre2}>Une notification dès qu&apos;une demande tombe près de vous</h2>
          <p className="m-0 mb-6 max-w-[50ch] text-[17px] leading-[27px] text-neutre-800">
            Vous voyez la demande, vous appelez le client, vous envoyez le devis — sans redescendre
            de l&apos;échafaudage. L&apos;appli est incluse, gratuite comme le reste, et
            s&apos;installe depuis votre navigateur.
          </p>
          <a href="#inscription" className={bouton({ className: 'min-h-12' })}>
            Créer mon compte gratuit
          </a>
        </div>
        <div
          aria-hidden="true"
          className="w-full max-w-[320px] justify-self-center rounded-[44px] bg-texte p-[9px] shadow-lg"
        >
          <div className="overflow-hidden rounded-[36px] bg-blanc pb-3 text-texte">
            <div className="relative flex items-center justify-between px-[22px] pt-3 pb-1.5 text-[13px] font-semibold">
              <span>9:41</span>
              <span className="absolute top-2 left-1/2 h-[21px] w-[92px] -translate-x-1/2 rounded-[12px] bg-texte" />
              <span className="block h-[9px] w-4 rounded-[2px] border border-neutre-700" />
            </div>
            <div className="flex items-center justify-between px-[18px] pt-3.5 pb-2.5">
              <div>
                <p className="m-0 text-xs text-neutre-700">Bonjour Julien</p>
                <p className="m-0 text-[17px] font-bold">Mes demandes</p>
              </div>
              <span className="flex size-[34px] items-center justify-center rounded-full bg-accent-action text-sm font-bold text-blanc">
                JB
              </span>
            </div>
            <div className="mx-3.5 mt-1 rounded-card bg-accent-action p-3.5 text-blanc">
              <p className="m-0 mb-1 text-[11px] tracking-[0.06em] uppercase">
                Nouvelle demande · il y a 4 min
              </p>
              <p className="m-0 mb-0.5 text-base font-bold">Réfection toiture, 90 m²</p>
              <p className="m-0 text-[13px]">
                Pessac (33600) · {formatFourchette(900_000, 1_400_000)} · Urgent
              </p>
              <div className="mt-3 flex gap-2">
                <span className="flex-1 rounded-[9px] bg-blanc py-2 text-center text-[13px] font-semibold text-accent-700">
                  Répondre
                </span>
                <span className="flex-1 rounded-[9px] border border-blanc/70 py-2 text-center text-[13px] font-semibold">
                  Ignorer
                </span>
              </div>
            </div>
            <div className="flex gap-2.5 px-3.5 pt-3.5">
              {[
                ['12', 'Demandes ce mois'],
                ['4', 'Devis en attente'],
              ].map(([n, l]) => (
                <div key={l} className="flex-1 rounded-[12px] border border-trait p-3">
                  <p className="m-0 text-xl font-bold">{n}</p>
                  <p className="m-0 text-[11px] text-neutre-700">{l}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-2 px-3.5 pt-2.5 text-[13px]">
              <div className="flex justify-between rounded-[12px] border border-trait px-3 py-2.5">
                <span>Isolation combles · Mérignac</span>
                <span className="font-semibold text-accent-700">À rappeler</span>
              </div>
              <div className="flex justify-between rounded-[12px] border border-trait px-3 py-2.5">
                <span>Salle de bain · Bordeaux</span>
                <span className="text-neutre-700">Devis envoyé</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

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

export function AppelFinalPro() {
  return (
    <section aria-labelledby="appel-final-pro" className={`bg-surface ${bande}`}>
      <div className={conteneurPro}>
        <div className="max-w-[640px]">
          <h2 id="appel-final-pro" className="m-0 mb-3.5 text-[clamp(30px,4vw,46px)] leading-[1.1]">
            Votre prochain client cherche un artisan aujourd&apos;hui.
          </h2>
          <p className="m-0 mb-6 max-w-[52ch] text-[17px] leading-[27px] text-neutre-800">
            3 minutes pour créer votre fiche. {formatEuros(0)}, sans engagement, et votre fiche en
            ligne dès la première connexion.
          </p>
          <div className="flex flex-wrap items-center gap-3.5">
            <a
              href="#inscription"
              className={bouton({ taille: 'lg', className: 'min-h-[50px] px-[26px]' })}
            >
              Créer mon compte gratuit
            </a>
            <a
              href="#offres"
              className={bouton({ variant: 'fantome', taille: 'lg', className: 'min-h-[50px]' })}
            >
              Voir les tarifs Premium
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
