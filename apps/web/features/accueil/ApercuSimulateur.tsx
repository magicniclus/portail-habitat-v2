import { bouton } from '@ph/ui';
import { formatEuros } from '@ph/core/format';
import Link from 'next/link';
import { Section } from '@/features/vitrine/Section';
import { routes } from '@/lib/routes';

const ATOUTS = [
  {
    titre: 'Résultat immédiat',
    texte: 'Une fourchette de budget en quelques secondes, sans créer de compte.',
    icone: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5v4.8l3 2" />
      </>
    ),
  },
  {
    titre: 'Détail poste par poste',
    texte: "Fournitures, main-d'œuvre, options : vous savez ce que vous payez.",
    icone: <path d="M4 19V9M9.3 19V5M14.7 19v-7M20 19v-4" />,
  },
  {
    titre: 'Gratuit et sans engagement',
    texte: "Vous contactez les artisans seulement si l'estimation vous convient.",
    icone: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
  },
];

/** Exemple illustratif d'estimation (maquette), en centimes. */
const EXEMPLE = [
  { poste: 'Plomberie & évacuations', montant: 145_000, part: 38 },
  { poste: 'Carrelage sol et murs', montant: 230_000, part: 62 },
  { poste: 'Sanitaires & douche', montant: 190_000, part: 52 },
];

export function ApercuSimulateur() {
  return (
    <Section
      id="simulateur"
      className="grid items-center gap-x-[clamp(28px,4vw,60px)] gap-y-9 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
    >
      <div>
        <p className="m-0 mb-3 text-[13px] tracking-[0.08em] text-accent-700 uppercase">
          Simulateur de devis
        </p>
        <h2 className="m-0 mb-4 text-[clamp(26px,3.2vw,36px)] leading-[1.12]">
          Connaissez le prix avant d&apos;appeler un artisan
        </h2>
        <p className="m-0 mb-6 max-w-[50ch] text-[17px] leading-[27px] text-neutre-800">
          Vous renseignez votre projet, la surface et vos finitions : le simulateur calcule une
          fourchette réaliste, poste par poste, à partir des chantiers réellement réalisés près de
          chez vous.
        </p>
        <ul className="m-0 mb-[26px] grid list-none gap-[18px] p-0">
          {ATOUTS.map((a) => (
            <li key={a.titre} className="flex items-start gap-3.5">
              <span className="flex size-10 flex-none items-center justify-center rounded-[11px] bg-accent-100">
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent-700)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  {a.icone}
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
        <Link
          href={routes.simulateur}
          prefetch={false}
          className={bouton({ className: 'min-h-12 px-[22px] text-[16.5px]' })}
        >
          Essayer le simulateur
        </Link>
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
            <span className="ml-2.5 text-xs text-neutre-700">portailhabitat.fr/simulateur</span>
          </div>
          <div className="grid gap-3.5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <strong className="text-[17px]">Rénovation salle de bain · 6 m²</strong>
              <span className="rounded-pill bg-accent-100 px-2.5 py-1 text-xs font-semibold text-accent-800">
                Bordeaux (33000)
              </span>
            </div>
            <div className="rounded-[12px] bg-accent-100 px-[18px] py-4">
              <p className="m-0 mb-1 text-[12.5px] tracking-[0.06em] text-accent-700 uppercase">
                Budget estimé
              </p>
              <p className="m-0 text-[30px] leading-[1.1] font-bold">
                {formatEuros(640_000)} – {formatEuros(890_000)}
              </p>
              <p className="m-0 mt-1.5 text-[13.5px] text-neutre-800">
                Fourchette basée sur 340 chantiers comparables en Gironde.
              </p>
            </div>
            <div className="grid gap-[9px] text-sm">
              {EXEMPLE.map((l) => (
                <div key={l.poste} className="grid gap-[9px]">
                  <div className="flex justify-between gap-3">
                    <span>{l.poste}</span>
                    <strong>{formatEuros(l.montant)}</strong>
                  </div>
                  <div className="h-1.5 rounded-[3px] bg-accent-200">
                    <span
                      className="block h-full rounded-[3px] bg-accent"
                      style={{ width: `${l.part}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2.5">
              <span className="rounded-control bg-accent-action px-4 py-2.5 text-[13.5px] font-semibold text-blanc">
                Recevoir 3 devis
              </span>
              <span className="rounded-control border border-trait px-4 py-2.5 text-[13.5px] font-semibold">
                Télécharger l&apos;estimation
              </span>
            </div>
          </div>
        </div>
        <figcaption className="mt-2.5 text-[13px] text-neutre-800">
          Exemple d&apos;estimation générée en 2 minutes, sans création de compte.
        </figcaption>
      </figure>
    </Section>
  );
}
