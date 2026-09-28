import { formatFourchette } from '@ph/core/format';
import { bouton } from '@ph/ui';
import Link from 'next/link';
import type { ChiffresVitrine } from '@/features/accueil/vitrine';
import { Etoiles } from '@/features/vitrine/Etoiles';
import { conteneur, ListeFaq, Section } from '@/features/vitrine/Section';
import { Visuel } from '@/features/vitrine/Visuel';
import { routes } from '@/lib/routes';
import { COMMUNES } from './communes';
import { CARTES, ETAPES_DIAG, FAQ_DIAG, PACKS, REPERES, TABLEAU } from './contenu';
import { FormulaireDiag } from './FormulaireDiag';
import { Icone } from './Icone';
import { TableauAdaptatif } from './TableauAdaptatif';

const fourchette = (p: readonly [number, number]) => formatFourchette(p[0], p[1]);
const titre2 = 'm-0 mb-3 text-[clamp(26px,3.2vw,36px)] leading-[1.12]';
const chapeau = 'm-0 mb-7 max-w-[60ch] text-[17px] leading-[27px] text-neutre-800';

export function HeroDiag({ chiffres }: { chiffres: ChiffresVitrine }) {
  return (
    <section id="hero" className="scroll-mt-20 bg-accent-100 py-[clamp(32px,4.5vw,66px)]">
      <div
        className={`${conteneur} grid items-center gap-x-[clamp(28px,4vw,60px)] gap-y-9 min-[900px]:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]`}
      >
        <div>
          <p className="m-0 mb-5 inline-flex items-center gap-[9px] rounded-pill bg-blanc px-3.5 py-[7px] text-[13.5px] font-semibold text-accent-700">
            <Icone nom="bouclier" taille={16} />
            Certification COFRAC · assurance RC pro vérifiée
          </p>
          <h1 className="m-0 mb-[18px] max-w-[23ch] text-[clamp(32px,4.3vw,52px)] leading-[1.05]">
            Le dossier de diagnostics de votre bien,{' '}
            <span className="accent-editorial">sans mauvaise surprise</span>
          </h1>
          <p className="m-0 mb-[26px] max-w-[52ch] text-lg leading-[29px] text-neutre-800">
            DPE, amiante, plomb, termites, gaz, électricité : l&apos;âge de votre logement décide de
            presque tout. Répondez à trois questions, obtenez la liste exacte, le budget, et
            jusqu&apos;à 3 devis de diagnostiqueurs certifiés.
          </p>
          <FormulaireDiag />
          <ul className="m-0 mt-5 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[15px] text-neutre-800">
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="font-bold text-accent">
                ✓
              </span>
              Vos rapports encore valables sont réutilisés
            </li>
            {chiffres?.note && chiffres.dossiers ? (
              <li className="flex items-center gap-2">
                <Etoiles />
                <span>
                  <strong>{chiffres.note}/5</strong> · {chiffres.dossiers} dossiers
                </span>
              </li>
            ) : null}
          </ul>
        </div>
        <figure className="relative m-0 hidden min-[900px]:block">
          <div className="aspect-[4/5] overflow-hidden rounded-[18px] shadow-lg">
            <Visuel />
          </div>
          <div className="absolute bottom-[26px] -left-3 max-w-[300px] rounded-card bg-blanc px-[18px] py-4 shadow-md">
            <p className="m-0 mb-[9px] text-[12.5px] tracking-[0.06em] text-accent-700 uppercase">
              Exemple · maison 1968, Cenon
            </p>
            <p className="m-0 mb-1 text-[21px] leading-[1.1] font-bold">
              {formatFourchette(51_500, 81_000)}
            </p>
            <p className="m-0 text-[13.5px] leading-5 text-neutre-800">
              DPE, ERP, termites, amiante, gaz, électricité — une seule visite.
            </p>
          </div>
        </figure>
      </div>
    </section>
  );
}

export function Diagnostics() {
  return (
    <Section id="diagnostics">
      <h2 className={titre2}>Les diagnostics immobiliers obligatoires</h2>
      <p className={chapeau}>
        Ce que la loi exige pour une vente ou une location en Gironde, la durée de validité de
        chaque rapport et le prix constaté chez les diagnostiqueurs du secteur.
      </p>
      <ul className="m-0 mb-8 grid list-none grid-cols-[repeat(auto-fit,minmax(min(245px,100%),1fr))] gap-4 p-0">
        {CARTES.map((c) => (
          <li
            key={c.nom}
            className="flex flex-col gap-2.5 rounded-card border border-trait bg-blanc p-5"
          >
            <span className="flex size-11 items-center justify-center rounded-[12px] bg-accent-100">
              <Icone nom={c.icone} />
            </span>
            <h3 className="m-0 text-[17.5px]">{c.nom}</h3>
            <p className="m-0 text-[14.5px] leading-[23px] text-neutre-800">{c.texte}</p>
            <p className="m-0 mt-auto text-[13px] font-semibold text-accent-700">
              {c.validite} · {fourchette(c.prix)}
              {'suffixe' in c ? c.suffixe : ''}
            </p>
          </li>
        ))}
      </ul>
      <TableauAdaptatif
        legende="Diagnostics obligatoires, validité et prix constaté"
        colonnes={['Diagnostic', 'Quand est-il obligatoire ?', 'Validité', 'Prix constaté']}
        lignes={TABLEAU.map((t) => [t.nom, t.quand, t.validite, fourchette(t.prix)])}
      />
      <p className="m-0 mt-3.5 text-[13.5px] leading-[21px] text-neutre-700">
        Le diagnostic termites est obligatoire pour toute vente dans le département : l&apos;arrêté
        préfectoral du 12 février 2001 a institué une zone de surveillance et de lutte contre les
        termites sur l&apos;ensemble de la Gironde. Il n&apos;existe en revanche pas d&apos;arrêté
        mérule dans le département.
      </p>
    </Section>
  );
}

export function Reperes() {
  return (
    <Section id="age">
      <h2 className={titre2}>Ce que l&apos;âge de votre bien change</h2>
      <p className={chapeau}>
        Quatre dates commandent presque tout le dossier. Entre un appartement de 2015 et une échoppe
        de 1930, l&apos;écart de budget dépasse souvent 300 €.
      </p>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(225px,100%),1fr))] gap-[18px] p-0">
        {REPERES.map((r) => (
          <li key={r.titre} className="rounded-card bg-accent-100 p-[22px]">
            <span className="mb-3.5 flex items-center gap-[11px]">
              <span className="flex size-10 items-center justify-center rounded-[11px] bg-blanc">
                <Icone nom={r.icone} taille={20} />
              </span>
              <span className="text-[clamp(21px,2.3vw,26px)] leading-none font-bold text-accent-700">
                {r.date}
              </span>
            </span>
            <h3 className="m-0 mb-2 text-[17px]">{r.titre}</h3>
            <p className="m-0 text-[14.5px] leading-[23px] text-neutre-800">{r.texte}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Deroule() {
  return (
    <Section id="deroule">
      <h2 className="m-0 mb-7 text-[clamp(26px,3.2vw,36px)] leading-[1.12]">Comment ça marche</h2>
      <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(235px,100%),1fr))] gap-5 p-0">
        {ETAPES_DIAG.map((e, i) => (
          <li key={e.titre} className="flex flex-col gap-3">
            <span className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-[42px] flex-none items-center justify-center rounded-full bg-accent-action text-lg font-bold text-blanc"
              >
                {i + 1}
              </span>
              <span className="h-px flex-1 bg-trait" />
            </span>
            <h3 className="m-0 text-[19px]">{e.titre}</h3>
            <p className="m-0 text-[15px] leading-6 text-neutre-800">{e.texte}</p>
            <p className="m-0 text-[13px] font-semibold text-accent-700">{e.delai}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function Tarifs() {
  return (
    <Section id="tarifs" fond="mt-[clamp(44px,5.5vw,80px)] bg-neutre-100">
      <h2 className={titre2}>Prix d&apos;un pack de diagnostics</h2>
      <p className={chapeau}>
        Fourchettes constatées en Gironde, déplacement compris dans la métropole bordelaise.
      </p>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] gap-[18px] p-0">
        {PACKS.map((p) => (
          <li key={p.titre} className="flex flex-col gap-2.5 rounded-card bg-blanc p-6 shadow-sm">
            <h3 className="m-0 text-lg">{p.titre}</h3>
            <p className="m-0 text-[clamp(22px,2.4vw,27px)] font-bold text-accent-700">
              {fourchette(p.prix)}
            </p>
            <p className="m-0 text-[14.5px] leading-[23px] text-neutre-800">{p.contenu}</p>
            <Link
              href={routes.diagnosticEstimation}
              className={bouton({ variant: 'secondaire', className: 'mt-auto text-[15px]' })}
            >
              Estimer mon cas<span className="sr-only"> : {p.titre.toLowerCase()}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function FaqDiag() {
  return (
    <Section
      id="faq"
      className="grid items-start gap-x-[clamp(28px,4vw,60px)] gap-y-[30px] min-[900px]:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
    >
      <div>
        <h2 className="m-0 mb-3 text-[clamp(25px,3vw,34px)] leading-[1.12]">
          Questions fréquentes
        </h2>
        <p className="m-0 mb-5 text-[16.5px] leading-[26px] text-neutre-800">
          Copropriété, succession, bien loué, monopropriété classée F : notre équipe répond en une
          demi-journée.
        </p>
        <Link
          href={routes.aideSujet('diagnostic')}
          className={bouton({ variant: 'secondaire', className: 'text-[15.5px]' })}
        >
          Poser ma question
        </Link>
      </div>
      <ListeFaq faq={FAQ_DIAG} />
    </Section>
  );
}

export function AppelFinalDiag() {
  return (
    <Section fond="mt-[clamp(44px,5.5vw,80px)] bg-accent-100" etiquette="Lancer mon diagnostic">
      <h2 className="m-0 mb-3 max-w-[24ch] text-[clamp(26px,3.6vw,40px)] leading-[1.1]">
        Votre dossier complet, au bon prix.
      </h2>
      <p className="m-0 mb-6 max-w-[50ch] text-[17px] leading-[27px] text-neutre-800">
        Deux minutes pour savoir ce que la loi exige chez vous, 48 h pour recevoir trois devis de
        diagnostiqueurs certifiés.
      </p>
      <div className="flex flex-wrap gap-[13px]">
        <Link
          href={routes.diagnosticEstimation}
          className={bouton({ taille: 'lg', className: 'min-h-[52px] px-[26px]' })}
        >
          Lancer mon diagnostic
        </Link>
        <Link
          href={routes.accueil}
          className={bouton({ variant: 'fantome', taille: 'lg', className: 'min-h-[52px]' })}
        >
          J&apos;ai aussi des travaux à faire
        </Link>
      </div>
    </Section>
  );
}

/** Maillage interne vers les 11 pages communes (SEO). */
export function LiensCommunes() {
  return (
    <nav aria-labelledby="interventions" className={`${conteneur} py-[clamp(30px,3.5vw,46px)]`}>
      <p
        id="interventions"
        className="m-0 mb-2.5 text-[13px] tracking-[0.07em] text-neutre-700 uppercase"
      >
        Nos interventions en Gironde
      </p>
      <ul className="m-0 flex list-none flex-wrap gap-x-4 p-0 text-[13.5px]">
        {COMMUNES.map((c) => (
          <li key={c.slug}>
            <Link
              href={routes.diagnosticCommune(c.slug)}
              className="inline-flex min-h-11 items-center text-neutre-800 hover:text-accent-500"
            >
              Diagnostic immobilier {c.nom}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
