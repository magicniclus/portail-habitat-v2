import type { Metadata } from 'next';
import { chiffresVitrine } from '@/features/accueil/vitrine';
import { Traceur } from '@/features/comportement/Traceur';
import { Zone } from '@/features/comportement/Zone';
import { FAQ_PRO } from '@/features/pro/contenu';
import { FormulaireInscription } from '@/features/pro/FormulaireInscription';
import { BandeauMetier } from '@/features/pro/BandeauMetier';
import { chantiersParMetier, groupesMetiers } from '@/features/pro/metiers';
import { enTetePro, piedPro } from '@/features/pro/navigation';
import { AccrochePro, PhotoHeroPro } from '@/features/pro/HeroPro';
import {
  AppelFinalPro,
  ApplicationPro,
  conteneurPro,
  EspaceArtisan,
  EtapesPro,
  ExemplesDemandes,
  FaqPro,
  FichePro,
} from '@/features/pro/Sections';
import { EnTetePublic } from '@/features/vitrine/EnTetePublic';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { faqPage } from '@/features/vitrine/seo';
import { lireStatsPublic } from '@/server/vitrine';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: {
    absolute: 'Artisans : recevez les demandes de travaux de votre secteur · Portail Travaux Pro',
  },
  description:
    'Inscription gratuite, 0 % de commission : créez votre fiche, choisissez vos métiers et vos communes, et répondez aux demandes des particuliers près de chez vous.',
  alternates: { canonical: '/pro' },
};

export default async function AcquisitionArtisans() {
  const stats = await lireStatsPublic();
  const chiffres = chiffresVitrine(stats);
  const groupes = groupesMetiers();
  return (
    <>
      <JsonLd donnees={faqPage(FAQ_PRO)} />
      <EnTetePublic {...enTetePro} />
      <main>
        <section
          data-ph-section="hero"
          className={`${conteneurPro} grid items-start gap-x-[clamp(28px,4vw,64px)] gap-y-9 pt-[clamp(24px,4vw,48px)] pb-[clamp(48px,6vw,80px)] min-[900px]:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] min-[900px]:grid-rows-[auto_1fr]`}
        >
          <AccrochePro chiffres={chiffres} bandeau={<BandeauMetier groupes={groupes} />} />
          {/* Ordre mobile : texte, formulaire, photo ; dès 900 px le formulaire occupe la colonne droite. */}
          <div className="min-[900px]:sticky min-[900px]:top-24 min-[900px]:col-start-2 min-[900px]:row-span-2 min-[900px]:row-start-1">
            <FormulaireInscription
              groupes={groupes}
              chantiers={chantiersParMetier()}
              demandesMois={chiffres?.demandes ?? null}
            />
          </div>
          <PhotoHeroPro className="min-[900px]:col-start-1 min-[900px]:row-start-2" />
        </section>
        <Zone id="exemples">
          <ExemplesDemandes />
        </Zone>
        <Zone id="etapes">
          <EtapesPro />
        </Zone>
        <Zone id="espace">
          <EspaceArtisan />
        </Zone>
        <Zone id="fiche">
          <FichePro />
        </Zone>
        <Zone id="application">
          <ApplicationPro />
        </Zone>
        <Zone id="faq">
          <FaqPro />
        </Zone>
        <Zone id="appel-final">
          <AppelFinalPro />
        </Zone>
      </main>
      <Traceur page="acquisition-artisans" />
      <PiedPublic {...piedPro} variantLogo="pro" />
    </>
  );
}
