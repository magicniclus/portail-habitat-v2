// Décor du tournage de la VSL : habille le compte de démonstration du jeu de test (émulateurs
// seulement) — « Bertrand Rénovation », Julien Bertrand, Bordeaux — avec une fiche complète, trois
// demandes récentes et les mentions de devis. Données fictives, images dessinées ici.
// Usage : tsx scripts/vsl/decor.ts (émulateurs lancés, après `pnpm seed`).
import { appAdmin, estEmulateur } from '@ph/firebase/admin';
import { droitsInitiaux } from '@ph/core/paiements';
import { chemins } from '@ph/firebase/chemins';
import { couleurs, demoStudio, neutres, rampes } from '@ph/ui/tokens';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const svg = (corps: string, l: number, h: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${l}" height="${h}" viewBox="0 0 ${l} ${h}">${corps}</svg>`,
  )}`;

const LOGO = svg(
  `<rect width="240" height="240" rx="48" fill="${couleurs.nuit}"/><path d="M50 118 120 60l70 58" fill="none" stroke="${rampes.pro.base}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><text x="120" y="190" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="64" fill="${couleurs.blanc}">BR</text>`,
  240,
  240,
);

const BANNIERE = svg(
  `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${demoStudio.banniere[0]}"/><stop offset="1" stop-color="${demoStudio.banniere[1]}"/></linearGradient><pattern id="c" width="80" height="80" patternUnits="userSpaceOnUse"><rect width="78" height="78" fill="${couleurs.blanc}" fill-opacity=".35"/></pattern></defs><rect width="1600" height="500" fill="url(#g)"/><rect width="1600" height="500" fill="url(#c)"/>`,
  1600,
  500,
);

function photo(teinte: string, k: number) {
  const pas = 90 + k * 30;
  return svg(
    `<defs><linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${couleurs.blanc}" stop-opacity=".55"/><stop offset="1" stop-color="${neutres[900]}" stop-opacity=".15"/></linearGradient><pattern id="t" width="${pas}" height="${pas}" patternUnits="userSpaceOnUse"><rect width="${pas - 4}" height="${pas - 4}" fill="${teinte}"/></pattern></defs><rect width="1200" height="900" fill="${demoStudio.joint}"/><rect width="1200" height="900" fill="url(#t)"/><rect width="1200" height="900" fill="url(#l)"/>`,
    1200,
    900,
  );
}

const REALISATIONS = [
  ['Salle de bain complète, douche à l’italienne', 'Receveur extra-plat, faïence grand format.'],
  ['Rénovation d’une cuisine', 'Évier, arrivées d’eau et crédence carrelée.'],
  ['Remplacement d’un chauffe-eau', 'Chauffe-eau thermodynamique, mise aux normes.'],
] as const;

/** Les trois demandes du film (plans 1 et 2), de la plus récente à la plus ancienne. */
const DEMANDES = [
  {
    id: 'vsl-demande-1',
    reference: 'PT-SDB33M',
    minutes: 2,
    prestationId: 'sdb',
    contact: { prenom: 'Claire', nom: 'Martin' },
    ville: 'Mérignac',
    codePostal: '33700',
    precisions: 'Remplacer la baignoire par une douche à l’italienne, refaire la faïence.',
    delai: 'Démarrage sous 1 mois',
    surface: '6 m²',
    estimation: [600_000, 800_000],
  },
  {
    id: 'vsl-demande-2',
    reference: 'PT-ISO33P',
    minutes: 9,
    prestationId: 'isolation',
    contact: { prenom: 'Thomas', nom: 'Garcia' },
    ville: 'Pessac',
    codePostal: '33600',
    precisions: 'Isolation des combles perdus, maison de plain-pied.',
    delai: 'Sous 2 mois',
    surface: '85 m²',
    estimation: [400_000, 650_000],
  },
  {
    id: 'vsl-demande-3',
    reference: 'PT-TOI33T',
    minutes: 21,
    prestationId: 'toiture',
    contact: { prenom: 'Sophie', nom: 'Laurent' },
    ville: 'Talence',
    codePostal: '33400',
    precisions: 'Réfection de la toiture après une fuite, tuiles à remplacer.',
    delai: 'Dès que possible',
    surface: '110 m²',
    estimation: [900_000, 1_400_000],
  },
] as const;

async function main() {
  if (!estEmulateur()) throw new Error('Décor refusé hors émulateur.');
  const app = appAdmin();
  const db = getFirestore(app);
  const uid = 'seed-proprio';
  await getAuth(app).updateUser(uid, { displayName: 'Julien Bertrand' });
  await db
    .doc(chemins.user(uid))
    .set({ prenom: 'Julien', nom: 'Bertrand', nomAffiche: 'Julien Bertrand' }, { merge: true });
  const user = (await db.doc(chemins.user(uid)).get()).data() as { entrepriseActive?: string };
  const id = user.entrepriseActive;
  if (!id) throw new Error('Compte de démonstration introuvable : lancez `pnpm seed`.');

  const fiche = {
    nomCommercial: 'Bertrand Rénovation',
    logoUrl: LOGO,
    bannieres: [BANNIERE],
    description:
      'Bertrand Rénovation refait votre salle de bain de A à Z à Bordeaux et alentours : douche à l’italienne, faïence grand format, carrelage et plomberie. Chantiers tenus en 5 à 10 jours.',
    completude: 100,
    // Un seul métier au départ : la capture C4 ajoute le second. Note et avis du jeu de test.
    metiers: ['plombier'],
    noteMoyenne: 4.8,
    nbAvis: 4,
  };
  await db.doc(chemins.artisan(id)).set(fiche, { merge: true });
  await db.doc(chemins.artisanPublic(id)).set({ ...fiche, rayonKm: 20 }, { merge: true });
  // Compte gratuit (le film ne montre aucune option payante) et rayon de départ de 20 km.
  await db.doc(chemins.artisan(id)).update({
    'zoneIntervention.rayonKm': 20,
    droits: droitsInitiaux('gratuit', new Date()),
  });
  await db
    .doc(chemins.artisanPublic(id))
    .set({ misEnAvant: false, badgeRecommande: false }, { merge: true });
  // Avis du jeu de test : notes accordées à la moyenne affichée (4,8 sur 4 avis publiés).
  const avis = await db.doc(chemins.avis('_')).parent.where('artisanId', '==', id).get();
  let rang = 0;
  for (const a of avis.docs)
    if (a.get('statut') === 'publie') await a.ref.update({ note: rang++ === 3 ? 4 : 5 });

  const maintenant = Timestamp.now();
  for (const [i, [titre, description]] of REALISATIONS.entries())
    await db.doc(`${chemins.realisations(id)}/vsl-${i}`).set({
      schemaVersion: 1,
      createdAt: maintenant,
      titre,
      description,
      metier: 'plombier',
      ville: 'Bordeaux',
      photos: demoStudio.realisations[i]!.map((t, k) => ({
        url: photo(t, k),
        storagePath: `demo/realisations/${i}-${k}.svg`,
        largeur: 1200,
        hauteur: 900,
      })),
      autorisationProprietaire: true,
      publie: true,
      ordre: i,
    });

  await db.doc(chemins.parametresFacturation(id)).set({
    schemaVersion: 1,
    raisonSociale: 'Bertrand Rénovation',
    formeJuridique: 'SARL',
    adresseSiege: '14 rue des Faures, 33800 Bordeaux',
    siret: '81234567800021',
    franchiseTva: false,
    tvaSurDebits: false,
    assuranceDecennale: { assureur: 'MAAF', contrat: '0045821', zone: 'France métropolitaine' },
    mediateur: { nom: 'CM2C', adresse: '14 rue Saint-Jean, 75017 Paris' },
    delaiPaiementJours: 30,
    acompteDefautPct: 30,
    validiteDevisJours: 30,
    tvaDefaut: 10,
    tauxPenalitesAnnuel: 12.15,
    updatedAt: maintenant,
  });

  for (const d of DEMANDES) {
    const le = Timestamp.fromMillis(Date.now() - d.minutes * 60_000);
    await db.doc(chemins.demande(d.id)).set({
      reference: d.reference,
      statut: 'en_attribution',
      createdAt: le,
      prestationId: d.prestationId,
      contact: {
        ...d.contact,
        email: `${d.contact.prenom.toLowerCase()}@exemple.fr`,
        telephone: '+33600000000',
      },
      adresseChantier: { ville: d.ville, codePostal: d.codePostal },
      precisions: d.precisions,
      reponsesLisibles: [
        { question: 'Surface', reponse: d.surface },
        { question: 'Délai souhaité', reponse: d.delai },
      ],
      estimation: { minCentimes: d.estimation[0], maxCentimes: d.estimation[1] },
    });
    await db.doc(chemins.attribution(d.id, id)).set({
      schemaVersion: 1,
      artisanId: id,
      demandeId: d.id,
      statut: 'proposee',
      exclusive: false,
      proposeeLe: le,
      coordonneesDebloquees: false,
      scoreMatching: 80,
    });
  }
  console.log(`Décor posé sur l’entreprise ${id}.`);
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
