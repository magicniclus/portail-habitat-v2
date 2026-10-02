import { formatFourchette } from '@ph/core/format';
import { bouton } from '@ph/ui';
import Link from 'next/link';
import { ListeFaq } from '@/features/vitrine/Section';
import { routes } from '@/lib/routes';
import { COMMUNES, faqCommune, risquesCourts, type CommuneDiag } from './communes';
import { PACKS_COMMUNE } from './contenu';
import { TableauAdaptatif } from './TableauAdaptatif';

const conteneur = 'mx-auto w-full max-w-[1180px] px-[clamp(18px,4vw,44px)]';
const bloc = `${conteneur} pt-[clamp(36px,4.5vw,64px)]`;
const titre2 = 'm-0 mb-3.5 text-[clamp(23px,2.8vw,32px)] leading-[1.12]';

function Coche() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent-700)"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="mt-0.5 flex-none"
    >
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </svg>
  );
}

/** Page d'une commune de la rive droite (maquette Diagnostic Immobilier Rive Droite, DIA-05). */
export function PageCommune({ c }: { c: CommuneDiag }) {
  const parcours = routes.diagnosticEstimationCommune(c.slug);
  const chiffres = [
    { valeur: c.pop, label: 'habitants (Insee, population légale 2023)' },
    { valeur: c.superficie, label: 'de superficie communale' },
    { valeur: '100 %', label: 'du territoire en zone termites (arrêté du 12 février 2001)' },
    { valeur: '48 h', label: "pour recevoir jusqu'à 3 devis de diagnostiqueurs certifiés" },
  ];
  return (
    <main>
      <section className="bg-accent-100 py-[clamp(24px,3.5vw,48px)]">
        <div className={conteneur}>
          <nav aria-label="Fil d'Ariane" className="mb-4 text-[13.5px] text-neutre-700">
            <ol className="m-0 flex list-none flex-wrap items-center gap-x-1.5 p-0">
              <li>
                <Link
                  href={routes.diagnostic}
                  className="inline-flex min-h-11 items-center text-neutre-800"
                >
                  Diagnostic immobilier
                </Link>
              </li>
              <li aria-hidden="true" className="text-neutre-400">
                ›
              </li>
              <li>Rive droite de Bordeaux</li>
              <li aria-hidden="true" className="text-neutre-400">
                ›
              </li>
              <li aria-current="page">
                <strong className="text-accent-800">{c.nom}</strong>
              </li>
            </ol>
          </nav>
          <div className="grid items-start gap-x-[clamp(24px,3.5vw,48px)] gap-y-7 min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div>
              <h1 className="m-0 mb-4 text-[clamp(28px,3.8vw,44px)] leading-[1.07]">
                Diagnostic immobilier à {c.nom}{' '}
                <span className="font-normal text-neutre-700">({c.cp})</span>
              </h1>
              <p className="m-0 mb-[22px] max-w-[60ch] text-[17.5px] leading-7 text-neutre-800">
                {c.intro}
              </p>
              <div className="mb-5 flex flex-wrap gap-3">
                <Link href={parcours} className={bouton({ className: 'min-h-[50px] px-[22px]' })}>
                  Mes diagnostics à {c.nom}
                </Link>
                <a
                  href="#communes"
                  className={bouton({
                    variant: 'fantome',
                    className: 'min-h-[50px] text-[15.5px]',
                  })}
                >
                  Autre commune
                </a>
              </div>
              <p className="m-0 text-[13.5px] leading-[21px] text-neutre-700">
                Population {c.pop} habitants (Insee, population légale 2023) · superficie{' '}
                {c.superficie} · code Insee {c.insee}
                {c.prix ? ` · prix immobilier constaté : ${c.prix}` : ''}
              </p>
            </div>
            <div className="rounded-[16px] bg-blanc p-[22px] shadow-sm">
              <h2 className="m-0 mb-3.5 text-[15px]">
                Obligatoire à {c.nom}, quoi qu&apos;il arrive
              </h2>
              <ul className="m-0 grid list-none gap-[13px] p-0 text-[14.5px] leading-[22px]">
                <li className="flex gap-[11px]">
                  <Coche />
                  <span>
                    <strong>Termites</strong> — tout le département est en zone de surveillance et
                    de lutte (arrêté du 12 février 2001). Valable 6 mois.
                  </span>
                </li>
                <li className="flex gap-[11px]">
                  <Coche />
                  <span>
                    <strong>DPE</strong> — vente et location. Les DPE d&apos;avant juillet 2021 sont
                    à refaire.
                  </span>
                </li>
                <li className="flex gap-[11px]">
                  <Coche />
                  <span>
                    <strong>ERP</strong> — {risquesCourts(c.slug)}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section aria-label={`${c.nom} en chiffres`} className={bloc}>
        <ul className="m-0 grid list-none grid-cols-2 gap-3.5 p-0 md:grid-cols-4">
          {chiffres.map((x) => (
            <li key={x.label} className="rounded-[13px] border border-trait p-[18px]">
              <p className="m-0 mb-1 text-[clamp(20px,2.2vw,25px)] font-bold text-accent-700">
                {x.valeur}
              </p>
              <p className="m-0 text-[13.5px] leading-5 text-neutre-700">{x.label}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        className={`${bloc} grid items-start gap-x-[clamp(24px,3.5vw,48px)] gap-y-6 min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]`}
      >
        <div>
          <h2 className={titre2}>Le bâti de {c.nom} et ce qu&apos;il implique</h2>
          <p className="m-0 mb-5 text-[16.5px] leading-[27px] text-neutre-800">{c.bati}</p>
          <ul className="m-0 grid list-none gap-[11px] p-0">
            {c.frequents.map((f) => (
              <li key={f.titre} className="rounded-[12px] bg-accent-100 px-[18px] py-4">
                <h3 className="m-0 mb-1 text-[15.5px]">{f.titre}</h3>
                <p className="m-0 text-[14.5px] leading-[22px] text-neutre-800">{f.texte}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-3.5">
          <div className="rounded-card border border-trait p-5">
            <h3 className="m-0 mb-2.5 text-[15.5px]">Secteurs couverts</h3>
            <p className="m-0 text-[14.5px] leading-6 text-neutre-800">{c.secteurs}</p>
          </div>
          <div className="rounded-card bg-attention-fond p-5">
            <h3 className="m-0 mb-2 text-[15.5px] text-attention">
              Risques à déclarer dans l&apos;ERP
            </h3>
            <p className="m-0 text-[14.5px] leading-[23px] text-neutre-800">{c.risques}</p>
          </div>
        </div>
      </section>

      <section className={bloc}>
        <h2 className={titre2}>Prix des diagnostics à {c.nom}</h2>
        <p className="m-0 mb-[22px] max-w-[60ch] text-[16.5px] leading-[26px] text-neutre-800">
          Fourchettes constatées auprès des diagnostiqueurs certifiés intervenant sur la commune,
          déplacement compris.
        </p>
        <TableauAdaptatif
          legende={`Prix des diagnostics à ${c.nom}`}
          colonnes={['Cas de figure', 'Diagnostics inclus', 'Budget']}
          lignes={PACKS_COMMUNE.map((p) => [
            p.cas,
            p.inclus,
            formatFourchette(p.prix[0], p.prix[1]),
          ])}
        />
        <div className="mt-[22px] flex flex-wrap items-center gap-3">
          <Link href={parcours} className={bouton({ className: 'min-h-[50px] px-[22px]' })}>
            Estimer mon cas précis
          </Link>
          <span className="text-[13.5px] text-neutre-700">
            Vos rapports encore valables sont déduits automatiquement.
          </span>
        </div>
      </section>

      <section className={bloc}>
        <h2 className={titre2}>Questions fréquentes à {c.nom}</h2>
        <div className="max-w-[760px]">
          <ListeFaq faq={faqCommune(c.nom)} />
        </div>
      </section>

      <section id="communes" className={`${bloc} scroll-mt-20 pb-[clamp(36px,4.5vw,64px)]`}>
        <h2 className="m-0 mb-2.5 text-[clamp(21px,2.4vw,27px)] leading-[1.14]">
          Les autres communes de la rive droite
        </h2>
        <p className="m-0 mb-5 max-w-[56ch] text-[15.5px] leading-[25px] text-neutre-800">
          Onze communes de Bordeaux Métropole, chacune avec son bâti et ses risques.
        </p>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(210px,100%),1fr))] gap-2.5 p-0">
          {COMMUNES.filter((x) => x.slug !== c.slug).map((x) => (
            <li key={x.slug}>
              <Link
                href={routes.diagnosticCommune(x.slug)}
                className="flex min-h-11 flex-col gap-0.5 rounded-[12px] border border-trait px-4 py-3 text-texte no-underline hover:border-accent hover:bg-accent-100"
              >
                <span className="text-[15.5px] font-semibold">{x.nom}</span>
                <span className="text-[13px] text-neutre-700">
                  {x.cp} · {x.pop} hab.
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
