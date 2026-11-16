import { contenuLanding, preuveHeroPro } from '@ph/core/landings';
import type { Metadata } from 'next';
import { chiffresVitrine } from '@/features/accueil/vitrine';
import { Traceur } from '@/features/comportement/Traceur';
import { Zone } from '@/features/comportement/Zone';
import { AvisDefilants } from '@/features/landings/AvisDefilants';
import { ETAPES_PRO, FAQ_PRO } from '@/features/pro/contenu';
import { CommentCaMarche } from '@/features/landings/CommentCaMarche';
import { FormulaireInscription } from '@/features/pro/FormulaireInscription';
import { BandeauMetier } from '@/features/pro/BandeauMetier';
import { chantiersParMetier, groupesMetiers } from '@/features/pro/metiers';
import { enTetePro, piedPro } from '@/features/pro/navigation';
import { AccrochePro, PhotoHeroPro } from '@/features/pro/HeroPro';
import { VSL_CHANTIERS } from '@/features/landings/videosOutils';
import { VslPro } from '@/features/pro/VslPro';
import { ApplicationPro } from '@/features/pro/SectionApplication';
import { conteneurPro, EspaceArtisan, FaqPro } from '@/features/pro/Sections';
import { FilDemandes } from '@/features/pro/FilDemandes';
import { CalculPro } from '@/features/pro/CalculPro';
import { FichePro } from '@/features/pro/FichePro';
import { AppelFinal } from '@/features/landings/AppelFinal';
import { EnTetePublic } from '@/features/vitrine/EnTetePublic';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { faqPage } from '@/features/vitrine/seo';
import { styleSerifTitres } from '@/features/vitrine/serifTitres';
import { preuvesMarketingActives } from '@/server/flags';
import { lirePreuveSociale, lireStatsPublic } from '@/server/vitrine';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: {
    absolute: 'Artisans : recevez les demandes de travaux de votre secteur · Portail Travaux Pro',
  },
  description:
    'Inscription gratuite, 0 % de commission : jusqu’à 10 demandes gratuites et exclusives par mois depuis votre fiche, et tous les outils pour gérer vos chantiers offerts.',
  alternates: { canonical: '/pro' },
};

export default async function AcquisitionArtisans() {
  const [stats, preuveSociale, preuves] = await Promise.all([
    lireStatsPublic(),
    lirePreuveSociale(),
    preuvesMarketingActives(),
  ]);
  // Avis de la maquette (fictifs) : en démonstration (dev, aperçus) ; en production, seulement avec le flag.
  const avis = contenuLanding('chantiers', { preuves }).avis;
  const chiffres = chiffresVitrine(stats);
  const groupes = groupesMetiers();
  return (
    <>
      <JsonLd donnees={faqPage(FAQ_PRO)} />
      <EnTetePublic {...enTetePro} />
      <main style={styleSerifTitres}>
        <section
          data-ph-section="hero"
          className={`${conteneurPro} grid items-start gap-x-[clamp(28px,4vw,64px)] gap-y-9 pt-[clamp(24px,4vw,48px)] pb-[clamp(48px,6vw,80px)] min-[900px]:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] min-[900px]:grid-rows-[auto_1fr]`}
        >
          <AccrochePro
            preuve={preuveHeroPro(preuveSociale)}
            bandeau={<BandeauMetier groupes={groupes} />}
          />
          {/* Ordre mobile : texte, formulaire, photo ; dès 900 px le formulaire occupe la colonne droite. */}
          <div className="min-[900px]:sticky min-[900px]:top-24 min-[900px]:col-start-2 min-[900px]:row-span-2 min-[900px]:row-start-1">
            <FormulaireInscription
              groupes={groupes}
              chantiers={chantiersParMetier()}
              demandesMois={chiffres?.demandes ?? null}
            />
          </div>
          {/* VSL en démonstration (dev, aperçus, flag) : elle cite un chiffre à prouver (LANDINGS §7). */}
          {preuves ? (
            <VslPro
              className="min-[900px]:col-start-1 min-[900px]:row-start-2"
              video={VSL_CHANTIERS}
            />
          ) : (
            <PhotoHeroPro className="min-[900px]:col-start-1 min-[900px]:row-start-2" />
          )}
        </section>
        <Zone id="exemples">
          <FilDemandes />
        </Zone>
        <Zone id="etapes">
          <CommentCaMarche
            etapes={ETAPES_PRO.map(({ titre, texte, ecran }) => ({ titre, texte, ecran }))}
          />
        </Zone>
        <Zone id="espace">
          <EspaceArtisan />
        </Zone>
        <Zone id="fiche">
          <FichePro />
        </Zone>
        <Zone id="calcul">
          <CalculPro />
        </Zone>
        <Zone id="application">
          <ApplicationPro />
        </Zone>
        <Zone id="faq">
          <FaqPro />
        </Zone>
        <AvisDefilants avis={avis} />
        <Zone id="appel-final">
          <AppelFinal
            titre="Des clients vous contactent gratuitement. Mais pas que."
            texte="Les particuliers vous envoient leurs demandes sans que vous payiez rien. Et tous les outils pour en faire des chantiers sont gratuits, eux aussi :"
            cta="Créer mon compte gratuit"
            outil="pro"
            rassurance="Sans engagement · Sans carte bancaire"
          />
        </Zone>
      </main>
      <Traceur page="acquisition-artisans" />
      <PiedPublic {...piedPro} variantLogo="pro" clair />
    </>
  );
}
