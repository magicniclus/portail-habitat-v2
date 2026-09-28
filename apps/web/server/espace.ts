import 'server-only';
import { appAdmin } from '@ph/firebase/admin';
import type { ServicesComptes } from '@ph/firebase/comptes';
import { urlIdentite, type ServicesConnexion, type ServicesEspace } from '@ph/firebase/espace';
import { notifier, planifierCloudTask } from '@ph/firebase/notifications';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { URL_SITE } from '@/features/vitrine/seo';
import { lireCatalogueSimulateur } from './simulateur';

const db = () => getFirestore(appAdmin());

/** Comptes : Admin SDK, envois par `notifier()` puis Cloud Tasks. */
export function servicesComptes(): ServicesComptes & { urlSite: string } {
  const base = db();
  return {
    db: base,
    auth: getAuth(appAdmin()),
    horloge: Date.now,
    notifier: (e) => notifier({ db: base, horloge: Date.now, planifier: planifierCloudTask }, e),
    urlSite: URL_SITE,
  };
}

/** Échange du lien magique : clé d'API Web publique (l'émulateur accepte n'importe quelle valeur). */
export function servicesConnexion(): ServicesConnexion {
  return {
    db: db(),
    auth: getAuth(appAdmin()),
    horloge: Date.now,
    cleApi: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'cle-emulateur',
    urlIdentite: urlIdentite(),
  };
}

export function servicesEspace(): ServicesEspace {
  const noms = new Map(lireCatalogueSimulateur().prestations.map((p) => [p.id, p.nom]));
  return { db: db(), nomPrestation: (id) => noms.get(id) ?? 'Projet de travaux' };
}
