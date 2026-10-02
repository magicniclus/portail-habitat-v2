import type { Metadata } from 'next';
import { ApercuSimulateur } from '@/features/accueil/ApercuSimulateur';
import { Application } from '@/features/accueil/Application';
import { ArtisansVedette } from '@/features/accueil/ArtisansVedette';
import { Avis } from '@/features/accueil/Avis';
import { CommentCaMarche } from '@/features/accueil/CommentCaMarche';
import { FAQ_ACCUEIL } from '@/features/accueil/contenu';
import { AppelFinal, BandeauArtisan, FaqAccueil, Villes } from '@/features/accueil/FinDePage';
import { Hero } from '@/features/accueil/Hero';
import { Inspirations } from '@/features/accueil/Inspirations';
import { Metiers } from '@/features/accueil/Metiers';
import {
  chiffresVitrine,
  choisirInspirations,
  choisirTemoignages,
} from '@/features/accueil/vitrine';
import { EnTetePublic } from '@/features/vitrine/EnTetePublic';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { enTeteParticuliers, piedParticuliers } from '@/features/vitrine/navigation';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { faqPage, organisation } from '@/features/vitrine/seo';
import { lireArtisansVedette, lireAvisRecents, lireStatsPublic } from '@/server/vitrine';

// Chiffres et avis régénérés toutes les heures (ISR) : stats/public n'est recalculé que la nuit.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: 'Portail Habitat · Trouvez le bon artisan pour vos travaux' },
  description:
    "Estimez votre budget travaux en 2 minutes et recevez jusqu'à 3 devis d'artisans vérifiés près de chez vous. Gratuit et sans engagement.",
  alternates: { canonical: '/' },
};

export default async function Accueil() {
  const [stats, artisans, avis] = await Promise.all([
    lireStatsPublic(),
    lireArtisansVedette(),
    lireAvisRecents(),
  ]);
  const chiffres = chiffresVitrine(stats);
  return (
    <>
      <JsonLd donnees={organisation()} />
      <JsonLd donnees={faqPage(FAQ_ACCUEIL)} />
      <EnTetePublic {...enTeteParticuliers} />
      <main>
        <Hero chiffres={chiffres} />
        <Metiers />
        <CommentCaMarche />
        <ApercuSimulateur />
        <ArtisansVedette fiches={artisans ?? []} />
        <Avis chiffres={chiffres} temoignages={choisirTemoignages(avis ?? [])} />
        <Inspirations liste={choisirInspirations(avis ?? [])} />
        <Application />
        <Villes chiffres={chiffres} />
        <BandeauArtisan />
        <FaqAccueil />
        <AppelFinal />
      </main>
      <PiedPublic {...piedParticuliers} />
    </>
  );
}
