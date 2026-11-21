import { formatEuros } from '@ph/core/format';
import { bouton } from '@ph/ui';
import Link from 'next/link';
import { Section } from '@/features/vitrine/Section';
import { routes } from '@/lib/routes';

const POINTS = [
  {
    titre: 'Comparez les devis côte à côte',
    texte: 'Même projet, mêmes postes : les écarts de prix sautent aux yeux.',
  },
  {
    titre: 'Messagerie directe',
    texte: "Posez vos questions à l'artisan, envoyez photos et plans.",
  },
  {
    titre: 'Suivi de chantier',
    texte: 'Étapes, rendez-vous et documents conservés après les travaux.',
  },
];

/** Section « Application mobile » : PWA (D33), sans badge de store (D49). */
export function Application() {
  return (
    <Section
      id="application"
      fond="mt-[clamp(44px,5.5vw,80px)] bg-accent-900 text-blanc"
      className="grid items-center gap-x-[clamp(28px,4vw,60px)] gap-y-10 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(260px,330px)]"
    >
      <div>
        <p className="m-0 mb-3 text-[13px] tracking-[0.08em] text-accent-300 uppercase">
          Application mobile
        </p>
        <h2 className="m-0 mb-4 max-w-[24ch] text-[clamp(27px,3.4vw,38px)] leading-[1.12] text-blanc">
          Suivez vos devis et vos chantiers depuis votre téléphone
        </h2>
        <p className="m-0 mb-[26px] max-w-[48ch] text-[17px] leading-[27px] text-accent-200">
          Les réponses des artisans, les devis à comparer, les rendez-vous de visite et les messages
          : tout arrive au même endroit, installable depuis votre navigateur.
        </p>
        <ul className="m-0 mb-7 grid list-none gap-4 p-0">
          {POINTS.map((p) => (
            <li key={p.titre} className="flex items-start gap-[13px]">
              <span aria-hidden="true" className="font-bold text-accent-300">
                ✓
              </span>
              <span>
                <strong className="text-base">{p.titre}</strong>
                <br />
                <span className="text-[15px] leading-[23px] text-accent-200">{p.texte}</span>
              </span>
            </li>
          ))}
        </ul>
        <Link
          href={routes.monEspace}
          className={bouton({
            variant: 'secondaire',
            className: 'min-h-12 border-blanc px-[18px] text-accent-900 hover:text-accent-900',
          })}
        >
          Ouvrir mon espace
        </Link>
      </div>
      <Telephone />
    </Section>
  );
}

/** Maquette de téléphone décorative (écran « Mes devis »). */
function Telephone() {
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-[310px] justify-self-center rounded-[42px] bg-texte p-[9px] shadow-lg"
    >
      <div className="flex flex-col overflow-hidden rounded-[34px] bg-blanc text-texte">
        <div className="relative flex items-center justify-between px-[22px] pt-3 pb-1.5 text-[13px] font-semibold">
          <span>9:41</span>
          <span className="absolute top-2 left-1/2 h-[21px] w-[92px] -translate-x-1/2 rounded-[12px] bg-texte" />
          <span className="block h-[9px] w-4 rounded-[2px] border border-neutre-700" />
        </div>
        <div className="flex items-center justify-between gap-2.5 px-[18px] pt-3.5 pb-2.5">
          <div>
            <p className="m-0 text-xs text-neutre-700">Bonjour Camille</p>
            <p className="m-0 text-[17px] font-bold">Mes devis</p>
          </div>
          <span className="flex size-[34px] items-center justify-center rounded-full bg-accent-action text-sm font-bold text-blanc">
            CM
          </span>
        </div>
        <div className="mx-3.5 mt-1 rounded-card bg-accent-action p-3.5 text-blanc">
          <p className="m-0 mb-1 text-[11px] tracking-[0.06em] uppercase">
            Nouveau devis · il y a 12 min
          </p>
          <p className="m-0 mb-0.5 text-base font-bold">Salle de bain · {formatEuros(720_000)}</p>
          <p className="m-0 text-[13px]">Artisan partenaire · 4,9 ★</p>
          <div className="mt-3 flex gap-2">
            <span className="flex-1 rounded-[9px] bg-blanc py-2 text-center text-[13px] font-semibold text-accent-700">
              Comparer
            </span>
            <span className="flex-1 rounded-[9px] border border-blanc/70 py-2 text-center text-[13px] font-semibold">
              Message
            </span>
          </div>
        </div>
        <div className="grid gap-2 px-3.5 pt-3.5 pb-1">
          <div className="flex items-center justify-between rounded-[12px] border border-trait px-3 py-[11px] text-[13px]">
            <span>Peinture séjour · 2 devis</span>
            <span className="font-semibold text-accent-700">À comparer</span>
          </div>
          <div className="flex items-center justify-between rounded-[12px] border border-trait px-3 py-[11px] text-[13px]">
            <span>Isolation combles</span>
            <span className="text-neutre-700">Visite mardi</span>
          </div>
        </div>
        <div className="mt-3.5 flex justify-between border-t border-trait px-[22px] pt-2.5 pb-3 text-[11px] text-neutre-700">
          <span className="font-semibold text-accent-700">Mes devis</span>
          <span>Artisans</span>
          <span>Messages</span>
          <span>Profil</span>
        </div>
      </div>
    </div>
  );
}
