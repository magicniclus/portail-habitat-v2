import { questionsCreation } from '@ph/core/sites';
import { lireCreationIa, lireRestantsIaSite, lireSiteEdition } from '@ph/firebase/sites';
import { appAdmin } from '@ph/firebase/admin';
import { blogPublic } from '@ph/firebase/blog';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { EditeurSite } from '@/features/editeurSite/EditeurSite';
import { routes } from '@/lib/routes';
import {
  accesSite,
  DOMAINE_BASE,
  ficheCreation,
  mediathequeDuSite,
  tableauSite,
} from '@/server/sites';

export const metadata: Metadata = { title: 'Éditeur du site', robots: { index: false } };

/** Éditeur plein écran (SITE_INTERNET §4), hors du menu de l'espace pro. */
export default async function PageEditeur({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; panneau?: string; creation?: string; ia?: string }>;
}) {
  const acces = await accesSite(routes.proSiteEditeur());
  const db = getFirestore(appAdmin());
  const q = await searchParams;
  const [site, mediatheque, tableau, creation, fiche, restantsIa, blog] = await Promise.all([
    lireSiteEdition(db, acces.artisanId),
    mediathequeDuSite(acces.artisanId),
    tableauSite(acces.artisanId),
    lireCreationIa(db, acces.artisanId),
    q.creation === '1' ? ficheCreation(acces.artisanId) : null,
    lireRestantsIaSite({ db, horloge: Date.now }, acces.artisanId),
    blogPublic(db, acces.artisanId, 12),
  ]);
  if (!site.existe || !site.theme || !site.navigation) redirect(routes.proSite);
  const { page, panneau } = q;
  const panneauInitial =
    panneau === 'seo' ||
    panneau === 'ia' ||
    panneau === 'modeles' ||
    panneau === 'ajouter' ||
    panneau === 'pages' ||
    panneau === 'styles' ||
    panneau === 'versions'
      ? panneau
      : 'structure';
  // Création en attente de Site Pro (IA_SITE §4) : aperçu non publiable, ou reprise sans question.
  const enAttente = creation?.statut === 'attente_paiement';
  return (
    <>
      {/* SDK du navigateur : import d'images dans la médiathèque (dépôt direct dans Storage). */}
      <ConfigFirebase />
      <EditeurSite
        initial={{ pages: site.pages, navigation: site.navigation, theme: site.theme }}
        pageInitiale={page && site.pages[page] ? page : 'accueil'}
        panneauInitial={panneauInitial}
        medias={mediatheque.medias}
        fichiers={mediatheque.fichiers}
        artisanId={acces.artisanId}
        hote={`${site.sousDomaine}.${DOMAINE_BASE}`}
        offre={site.offre ?? 'gratuit'}
        iaComplete={acces.sitePro}
        restantsIa={restantsIa}
        blog={blog}
        versions={site.versions}
        {...(site.versionPubliee ? { versionPubliee: site.versionPubliee } : {})}
        {...(fiche ? { questionnaire: questionsCreation(fiche) } : {})}
        apercuInitial={enAttente && !acces.sitePro ? (creation.apercu ?? null) : null}
        reprise={!enAttente || !acces.sitePro ? 'non' : q.ia === 'reprendre' ? 'auto' : 'proposee'}
        {...(tableau.champs ? { champs: tableau.champs } : {})}
        {...(tableau.ville ? { ville: tableau.ville } : {})}
      />
    </>
  );
}
