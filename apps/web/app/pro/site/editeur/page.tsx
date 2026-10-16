import { lireSiteEdition } from '@ph/firebase/sites';
import { appAdmin } from '@ph/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EditeurSite } from '@/features/editeurSite/EditeurSite';
import { routes } from '@/lib/routes';
import { accesSite, DOMAINE_BASE, mediasDuSite, tableauSite } from '@/server/sites';

export const metadata: Metadata = { title: 'Éditeur du site', robots: { index: false } };

/** Éditeur plein écran (SITE_INTERNET §4), hors du menu de l'espace pro. */
export default async function PageEditeur({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; panneau?: string }>;
}) {
  const acces = await accesSite(routes.proSiteEditeur());
  const [site, medias, tableau] = await Promise.all([
    lireSiteEdition(getFirestore(appAdmin()), acces.artisanId),
    mediasDuSite(acces.artisanId),
    tableauSite(acces.artisanId),
  ]);
  if (!site.existe || !site.theme || !site.navigation) redirect(routes.proSite);
  const { page, panneau } = await searchParams;
  const panneauInitial = panneau === 'seo' || panneau === 'ia' ? panneau : 'calques';
  return (
    <EditeurSite
      initial={{ pages: site.pages, navigation: site.navigation, theme: site.theme }}
      pageInitiale={page && site.pages[page] ? page : 'accueil'}
      panneauInitial={panneauInitial}
      medias={medias}
      hote={`${site.sousDomaine}.${DOMAINE_BASE}`}
      offre={site.offre ?? 'gratuit'}
      iaComplete={acces.sitePro}
      {...(tableau.champs ? { champs: tableau.champs } : {})}
      {...(tableau.ville ? { ville: tableau.ville } : {})}
    />
  );
}
