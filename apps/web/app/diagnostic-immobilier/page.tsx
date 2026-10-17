import type { Metadata } from 'next';
import { Traceur } from '@/features/comportement/Traceur';
import { Zone } from '@/features/comportement/Zone';
import { chiffresVitrine } from '@/features/accueil/vitrine';
import { FAQ_DIAG } from '@/features/diagnostic/contenu';
import { enTeteDiag, piedDiag } from '@/features/diagnostic/navigation';
import {
  AppelFinalDiag,
  Deroule,
  Diagnostics,
  FaqDiag,
  HeroDiag,
  LiensCommunes,
  Reperes,
  Tarifs,
} from '@/features/diagnostic/Sections';
import { EnTetePublic } from '@/features/vitrine/EnTetePublic';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { faqPage, filAriane } from '@/features/vitrine/seo';
import { lireStatsPublic } from '@/server/vitrine';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: 'Diagnostic immobilier Bordeaux et Gironde · Portail Habitat Diag' },
  description:
    'Diagnostic immobilier à Bordeaux et en Gironde : DPE, amiante, plomb, termites, gaz, électricité, ERP. Savez en 2 minutes quels diagnostics sont obligatoires et recevez 3 devis de diagnostiqueurs certifiés.',
  alternates: { canonical: '/diagnostic-immobilier' },
};

export default async function DiagnosticImmobilier() {
  const stats = await lireStatsPublic();
  return (
    <>
      <JsonLd donnees={faqPage(FAQ_DIAG)} />
      <JsonLd
        donnees={filAriane([
          { nom: 'Accueil', chemin: '/' },
          { nom: 'Diagnostic immobilier', chemin: '/diagnostic-immobilier' },
        ])}
      />
      <EnTetePublic {...enTeteDiag} />
      <main>
        <Zone id="hero">
          <HeroDiag chiffres={chiffresVitrine(stats)} />
        </Zone>
        <Zone id="diagnostics">
          <Diagnostics />
        </Zone>
        <Zone id="reperes">
          <Reperes />
        </Zone>
        <Zone id="deroule">
          <Deroule />
        </Zone>
        <Zone id="tarifs">
          <Tarifs />
        </Zone>
        <Zone id="faq">
          <FaqDiag />
        </Zone>
        <Zone id="appel-final">
          <AppelFinalDiag />
        </Zone>
        <Zone id="communes">
          <LiensCommunes />
        </Zone>
      </main>
      <Traceur page="diagnostic" />
      <PiedPublic
        {...piedDiag}
        variantLogo="diag"
        mention="Prix indicatifs, hors frais de déplacement hors métropole"
      />
    </>
  );
}
