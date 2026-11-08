// Lancé par le robot dans la copie de démonstration (variables des émulateurs uniquement) :
// donne au compte de démonstration le nom et les chiffres de l'artisan d'exemple, une fiche complète
// (logo, bannière, réalisations), renvoie son slug.
import { artisanFictif } from '@ph/core/studio';
import { appAdmin, estEmulateur } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import { couleurs, demoStudio, neutres, rampes } from '@ph/ui/tokens';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const svg = (corps: string, l: number, h: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${l}" height="${h}" viewBox="0 0 ${l} ${h}">${corps}</svg>`,
  )}`;

/** Logo : initiales sur un carré arrondi aux couleurs du métier. */
function logo(nom: string) {
  const initiales = nom
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? '')
    .join('');
  return svg(
    `<rect width="240" height="240" rx="48" fill="${couleurs.nuit}"/><path d="M50 118 120 60l70 58" fill="none" stroke="${rampes.pro.base}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><text x="120" y="190" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="64" fill="${couleurs.blanc}">${initiales}</text>`,
    240,
    240,
  );
}

/** Bannière : dégradé chaud et motif de carreaux (salle de bain), sans texte. */
function banniere() {
  return svg(
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${demoStudio.banniere[0]}"/><stop offset="1" stop-color="${demoStudio.banniere[1]}"/></linearGradient><pattern id="c" width="80" height="80" patternUnits="userSpaceOnUse"><rect width="78" height="78" fill="${couleurs.blanc}" fill-opacity=".35"/></pattern></defs><rect width="1600" height="500" fill="url(#g)"/><rect width="1600" height="500" fill="url(#c)"/>`,
    1600,
    500,
  );
}

/** Photo de réalisation : carrelage et lumière, teinte propre à chaque chantier. */
function photo(teinte: string, k: number) {
  const pas = 90 + k * 30;
  return svg(
    `<defs><linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${couleurs.blanc}" stop-opacity=".55"/><stop offset="1" stop-color="${neutres[900]}" stop-opacity=".15"/></linearGradient><pattern id="t" width="${pas}" height="${pas}" patternUnits="userSpaceOnUse"><rect width="${pas - 4}" height="${pas - 4}" fill="${teinte}"/></pattern></defs><rect width="1200" height="900" fill="${demoStudio.joint}"/><rect width="1200" height="900" fill="url(#t)"/><rect width="1200" height="900" fill="url(#l)"/>`,
    1200,
    900,
  );
}

const REALISATIONS = [
  {
    titre: 'Salle de bain complète, douche à l’italienne',
    description: 'Dépose de la baignoire, receveur extra-plat, faïence grand format.',
    teintes: demoStudio.realisations[0],
  },
  {
    titre: 'Rénovation d’une cuisine',
    description: 'Évier, arrivées d’eau et crédence carrelée.',
    teintes: demoStudio.realisations[1],
  },
  {
    titre: 'Remplacement d’un chauffe-eau',
    description: 'Chauffe-eau thermodynamique 200 L, mise aux normes.',
    teintes: demoStudio.realisations[2],
  },
];

async function main() {
  if (!estEmulateur()) throw new Error('préparation refusée hors émulateur');
  const a = artisanFictif.parse(JSON.parse(process.argv[2] ?? '{}'));
  const db = getFirestore(appAdmin());
  const user = (await db.doc(chemins.user('seed-proprio')).get()).data() as
    { entrepriseActive?: string; entreprises?: string[] } | undefined;
  const id = user?.entrepriseActive ?? user?.entreprises?.[0];
  if (!id) throw new Error('compte de démonstration introuvable');
  const pub = (await db.doc(chemins.artisanPublic(id)).get()).data() as
    { metierPrincipal?: string; ville?: string } | undefined;
  // Fiche complète à l'écran (logo, bannière, réalisations) : images dessinées ici, copie isolée.
  const champs = {
    nomCommercial: a.nom,
    logoUrl: logo(a.nom),
    bannieres: [banniere()],
    ...(a.noteMoyenne !== undefined ? { noteMoyenne: a.noteMoyenne } : {}),
    ...(a.nombreAvis !== undefined ? { nbAvis: a.nombreAvis } : {}),
  };
  await db.doc(chemins.artisan(id)).set(champs, { merge: true });
  await db.doc(chemins.artisanPublic(id)).set(champs, { merge: true });
  const maintenant = Timestamp.now();
  for (const [i, r] of REALISATIONS.entries())
    await db.doc(`${chemins.realisations(id)}/demo-${i}`).set({
      schemaVersion: 1,
      createdAt: maintenant,
      titre: r.titre,
      description: r.description,
      metier: pub?.metierPrincipal ?? 'plombier',
      ville: pub?.ville ?? a.ville,
      photos: r.teintes.map((t, k) => ({
        url: photo(t, k),
        storagePath: `demo/realisations/${i}-${k}.svg`,
        largeur: 1200,
        hauteur: 900,
      })),
      autorisationProprietaire: true,
      publie: true,
      ordre: i,
    });
  // Mentions des devis de l'entreprise d'exemple (copie isolée : coordonnées fictives).
  await db.doc(chemins.parametresFacturation(id)).set({
    schemaVersion: 1,
    raisonSociale: a.nom,
    formeJuridique: 'SARL',
    adresseSiege: `14 rue des Faures, 33800 ${a.ville}`,
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
    updatedAt: Timestamp.now(),
  });
  const slug = (await db.doc(chemins.artisanPublic(id)).get()).get('slug') as string;
  process.stdout.write(JSON.stringify({ id, slug }));
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
