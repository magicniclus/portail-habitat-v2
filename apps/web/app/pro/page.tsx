import type { Metadata } from 'next';
import { chiffresVitrine } from '@/features/accueil/vitrine';
import { FAQ_PRO } from '@/features/pro/contenu';
import { FormulaireInscription } from '@/features/pro/FormulaireInscription';
import { BandeauMetier } from '@/features/pro/BandeauMetier';
import { groupesMetiers } from '@/features/pro/metiers';
import { enTetePro, piedPro } from '@/features/pro/navigation';
import {
  AccrochePro,
  AppelFinalPro,
  ApplicationPro,
  conteneurPro,
  EspaceArtisan,
  EtapesPro,
  ExemplesDemandes,
  FaqPro,
  FichePro,
} from '@/features/pro/Sections';
import { Tarifs } from '@/features/pro/Tarifs';
import { EnTetePublic } from '@/features/vitrine/EnTetePublic';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { faqPage } from '@/features/vitrine/seo';
import { lirePrixAffiches, lireStatsPublic } from '@/server/vitrine';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: {
    absolute: 'Artisans : recevez les demandes de travaux de votre secteur · Portail Habitat Pro',
  },
  description:
    'Inscription gratuite, 0 % de commission : créez votre fiche, choisissez vos métiers et vos communes, et répondez aux demandes des particuliers près de chez vous.',
  alternates: { canonical: '/pro' },
};

export default async function AcquisitionArtisans() {
  const [stats, prix] = await Promise.all([lireStatsPublic(), lirePrixAffiches()]);
  const chiffres = chiffresVitrine(stats);
  const groupes = groupesMetiers();
  return (
    <>
      <JsonLd donnees={faqPage(FAQ_PRO)} />
      <EnTetePublic {...enTetePro} />
      <main>
        <section
          className={`${conteneurPro} grid items-start gap-x-[clamp(28px,4vw,60px)] gap-y-8 py-[clamp(24px,4vw,56px)] min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]`}
        >
          <AccrochePro chiffres={chiffres} bandeau={<BandeauMetier groupes={groupes} />} />
          <FormulaireInscription groupes={groupes} demandesMois={chiffres?.demandes ?? null} />
        </section>
        <ExemplesDemandes />
        <EtapesPro />
        <EspaceArtisan />
        <FichePro />
        <ApplicationPro />
        <Tarifs prix={prix} />
        <FaqPro />
        <AppelFinalPro />
      </main>
      <PiedPublic {...piedPro} variantLogo="pro" />
    </>
  );
}
