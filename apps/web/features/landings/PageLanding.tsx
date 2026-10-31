import { contenuLanding, LANDINGS, preuveSociale, type OutilLanding } from '@ph/core/landings';
import { cn } from '@ph/ui';
import { chiffresVitrine } from '@/features/accueil/vitrine';
import { Traceur } from '@/features/comportement/Traceur';
import { Zone } from '@/features/comportement/Zone';
import { FormulaireInscription } from '@/features/pro/FormulaireInscription';
import { chantiersParMetier, groupesMetiers } from '@/features/pro/metiers';
import { piedPro } from '@/features/pro/navigation';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { faqPage } from '@/features/vitrine/seo';
import { preuvesMarketingActives } from '@/server/flags';
import { lirePreuveSociale, lireStatsPublic } from '@/server/vitrine';
import { BarreMobile } from './BarreMobile';
import { EtapesDefilement } from './EtapesDefilement';
import { FaqLanding } from './FaqLanding';
import {
  AppelFinal,
  AvisDefilants,
  bande,
  CommentCaMarche,
  conteneur,
  EnTeteLanding,
  OutilsInclus,
  PreuveSociale,
  SousTitre,
  titre2,
  Vitrine,
} from './Sections';
import { SuiviLanding } from './SuiviLanding';

/**
 * Gabarit unique des landings par outil (maquette `Landing Outil`, LANDINGS §3) : seuls les textes,
 * captures, étapes et FAQ changent d'un outil à l'autre (`contenuLanding`).
 */
export async function PageLanding({ outil }: { outil: OutilLanding }) {
  const [preuves, stats, donneesPreuve] = await Promise.all([
    preuvesMarketingActives(),
    lireStatsPublic(),
    lirePreuveSociale(),
  ]);
  const c = contenuLanding(outil, { preuves });
  const chiffres = outil === 'chantiers' ? chiffresVitrine(stats) : null;
  return (
    <>
      <JsonLd donnees={faqPage(c.faq)} />
      <Traceur page={`landing-${outil}`} />
      <EnTeteLanding />
      <main className="pb-[76px] md:pb-0">
        <section
          className={cn(
            conteneur,
            'grid items-start gap-x-[clamp(28px,4vw,60px)] gap-y-8 py-[clamp(24px,4vw,56px)] min-[900px]:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]',
          )}
        >
          <div>
            <p className="m-0 mb-3 text-[14px] font-bold uppercase tracking-wide text-accent-700">
              {c.surtitre}
            </p>
            <h1 className="m-0 mb-[18px] text-[clamp(34px,4.6vw,56px)] leading-[1.08]">
              {c.h1a} <span className="accent-editorial">{c.h1b}</span>
            </h1>
            <SousTitre texte={c.sousTitre} />
            {c.points.length ? (
              <ul className="m-0 mb-5 grid list-none gap-2 p-0 text-[16px]">
                {c.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span aria-hidden="true" className="font-bold text-accent-700">
                      ✓
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            ) : null}
            <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-2.5 p-0">
              {c.badges.map((b) => (
                <li
                  key={b}
                  className="rounded-pill border border-accent-200 bg-accent-100 px-3 py-1.5 text-[13px] font-semibold text-accent-800"
                >
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div data-formulaire-landing>
            <FormulaireInscription
              groupes={groupesMetiers()}
              chantiers={chantiersParMetier()}
              demandesMois={chiffres?.demandes ?? null}
              titre={c.titreFormulaire}
              cta={c.cta}
              source={LANDINGS[outil].source}
              landing={outil}
            />
          </div>
        </section>
        <Zone id="benefices">
          <section className={bande}>
            <div className={conteneur}>
              <span className="mb-2 block text-[13px] font-bold uppercase tracking-wide text-accent-700">
                {c.outilNom} · gratuit
              </span>
              <h2 className={titre2}>{c.beneficesTitre}</h2>
              <p className="m-0 mb-8 max-w-[60ch] text-[17px] leading-[27px] text-neutre-800">
                {c.beneficesIntro}
              </p>
              <EtapesDefilement benefices={c.benefices} />
            </div>
          </section>
        </Zone>
        <Vitrine v={c.vitrine} />
        <CommentCaMarche etapes={c.etapes} />
        <OutilsInclus eco={c.eco} />
        <PreuveSociale p={preuveSociale(donneesPreuve)} />
        <Zone id="faq">
          <section id="faq" className={bande}>
            <div className={cn(conteneur, 'max-w-[880px]')}>
              <h2 className={titre2}>Les questions qu’on nous pose avant de s’inscrire</h2>
              <FaqLanding outil={outil} faq={c.faq} />
            </div>
          </section>
        </Zone>
        <AvisDefilants avis={c.avis} />
        <AppelFinal titre={c.ctaTitre} cta={c.barreMobile} />
      </main>
      <PiedPublic {...piedPro} variantLogo="pro" />
      <BarreMobile outil={outil} libelle={c.barreMobile} />
      <SuiviLanding outil={outil} />
    </>
  );
}
