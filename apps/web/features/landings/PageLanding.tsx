import { contenuLanding, LANDINGS, preuveSociale, type OutilLanding } from '@ph/core/landings';
import { cn } from '@ph/ui';
import { chiffresVitrine } from '@/features/accueil/vitrine';
import { Traceur } from '@/features/comportement/Traceur';
import { Zone } from '@/features/comportement/Zone';
import { FormulaireInscription } from '@/features/pro/FormulaireInscription';
import { chantiersParMetier, groupesMetiers } from '@/features/pro/metiers';
import { piedPro } from '@/features/pro/navigation';
import { ApplicationPro } from '@/features/pro/SectionApplication';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { VslPro, type VideoVsl } from '@/features/pro/VslPro';
import { cheminVideoOutil, VIDEOS_OUTILS } from './videosOutils';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { faqPage } from '@/features/vitrine/seo';
import { preuvesMarketingActives } from '@/server/flags';
import { lirePreuveSociale, lireStatsPublic } from '@/server/vitrine';
import { BarreMobile } from './BarreMobile';
import { EtapesDefilement } from './EtapesDefilement';
import { FaqLanding } from './FaqLanding';
import { AppelFinal } from './AppelFinal';
import { AvisDefilants } from './AvisDefilants';
import { ChiffresReseau } from './ChiffresReseau';
import { CommentCaMarche } from './CommentCaMarche';
import { EnTeteLanding, PreuveSociale, SousTitre } from './Sections';
import { AtoutsSite, DemoCreation } from './SectionsSite';
import { bande, coche, conteneur, titre2 } from './styles';
import { Vitrine } from './Vitrine';
import { SuiviLanding } from './SuiviLanding';
import { styleSerifTitres } from '@/features/vitrine/serifTitres';

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
      <main style={styleSerifTitres}>
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
              <ul className="m-0 mb-5 flex list-none flex-col flex-wrap gap-x-[22px] gap-y-2.5 p-0 text-base leading-[22px] font-semibold min-[761px]:flex-row">
                {c.points.map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <span aria-hidden="true" className={coche}>
                      ✓
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            ) : null}
            {/* VSL en démonstration (dev, aperçus, flag) : elle cite un chiffre à prouver (LANDINGS §7). */}
            {preuves ? (
              <VslPro
                className="mt-[clamp(24px,3vw,36px)]"
                page={`landing-${outil}`}
                video={videoHero(outil)}
              />
            ) : null}
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
        <ChiffresReseau chiffres={c.chiffres} />
        {outil === 'site' ? <DemoCreation /> : null}
        {/* Site : le déroulé est déjà dans les 4 vidéos ; pas de deuxième récit. */}
        {outil === 'site' ? null : (
          <Zone id="benefices">
            <EtapesDefilement
              benefices={c.benefices}
              surtitre={`${c.outilNom} · gratuit`}
              titre={c.beneficesTitre}
              intro={c.beneficesIntro}
            />
          </Zone>
        )}
        <Vitrine v={c.vitrine} apres={outil === 'site' ? <AtoutsSite /> : undefined} />
        {outil === 'site' ? null : <CommentCaMarche etapes={c.etapes} />}
        {/* L'app (même section que /pro) : tous les outils au même endroit, une seule fois. */}
        <div data-section-gratuit>
          <ApplicationPro />
        </div>
        <PreuveSociale p={preuveSociale(donneesPreuve)} />
        <Zone id="faq">
          <section id="faq" className={bande}>
            <div className={conteneur}>
              <h2 className={cn(titre2, 'mb-6 text-[clamp(26px,3vw,34px)] leading-[1.14]')}>
                Les questions qu’on nous pose avant de s’inscrire
              </h2>
              <FaqLanding outil={outil} faq={c.faq} />
            </div>
          </section>
        </Zone>
        <AvisDefilants avis={c.avis} />
        <AppelFinal titre={c.ctaTitre} cta={c.barreMobile} outil={outil} />
      </main>
      <PiedPublic {...piedPro} variantLogo="pro" clair />
      {/* Place de la barre mobile fixe : le bas du pied de page reste visible. */}
      <div aria-hidden="true" className="h-[76px] md:hidden" />
      <BarreMobile outil={outil} libelle={c.barreMobile} />
      <SuiviLanding outil={outil} />
    </>
  );
}

/** Site et devis : le film de l'outil (sous-titres incrustés) ; chantiers : la vidéo générale. */
function videoHero(outil: OutilLanding): VideoVsl | undefined {
  if (outil === 'chantiers') return undefined;
  return {
    base: cheminVideoOutil(outil),
    duree: VIDEOS_OUTILS[outil]?.duree ?? 0,
    accroche:
      outil === 'site'
        ? 'Votre site internet d’artisan, gratuit'
        : 'Vos devis et factures, gratuits',
  };
}
