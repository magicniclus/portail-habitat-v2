/**
 * Texte des pages de l'annuaire vers lesquelles mènent les liens du bas de fiche (métier × ville,
 * travaux × ville), affiché avec la liste des artisans. Rédigé depuis des données réelles :
 * nombre d'artisans trouvés, prestations du métier, prix repère du simulateur. Aucune IA, aucun
 * chiffre inventé.
 */
export interface EntreeArticle {
  ville: string;
  rayonKm: number;
  nbArtisans: number;
  metier?: { nom: string; prestations: string[] };
  prestation?: { nom: string; pitch: string; repere: string };
}

const FEMININS = /^(entreprise|société|agence)/i;
const minuscule = (s: string) => `${s.charAt(0).toLowerCase()}${s.slice(1)}`;
const avecArticle = (m: string) => `${FEMININS.test(m) ? 'une' : 'un'} ${minuscule(m)}`;
const enumerer = (l: string[]) =>
  l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l.at(-1)}` : (l[0] ?? '');
const artisans = (n: number) => `${n} artisan${n > 1 ? 's' : ''}`;

const CONSEILS =
  'Avant de choisir, comparez au moins deux devis détaillés, vérifiez l’assurance de l’artisan (décennale ou responsabilité civile professionnelle selon les travaux) et lisez les avis : sur Portail Travaux, chaque avis est vérifié avant publication.';

export function articleAnnuaire(e: EntreeArticle): { titre: string; paragraphes: string[] } | null {
  if (!e.ville || (!e.metier && !e.prestation)) return null;
  const trouves =
    e.nbArtisans > 0
      ? `${artisans(e.nbArtisans)} vérifié${e.nbArtisans > 1 ? 's' : ''} intervien${e.nbArtisans > 1 ? 'nent' : 't'} à ${e.ville} ou dans un rayon de ${e.rayonKm} km : comparez leurs fiches, leurs réalisations et leurs avis, puis contactez-les gratuitement.`
      : `Aucun artisan inscrit n’intervient encore à ${e.ville} dans un rayon de ${e.rayonKm} km. Élargissez le rayon, ou déposez votre projet : nous le transmettons aux artisans du secteur.`;
  if (e.prestation)
    return {
      titre: `${e.prestation.nom} à ${e.ville}`,
      paragraphes: [
        `${e.prestation.pitch}. ${trouves}`,
        `Prix repère : ${e.prestation.repere}, selon notre simulateur (estimation indicative, à confirmer par un devis). Estimez votre projet en deux minutes pour obtenir une fourchette adaptée à votre logement.`,
        CONSEILS,
      ],
    };
  const m = e.metier!;
  return {
    titre: `Trouver ${avecArticle(m.nom)} à ${e.ville}`,
    paragraphes: [
      trouves,
      ...(m.prestations.length
        ? [
            `Travaux souvent confiés à ${avecArticle(m.nom)} : ${enumerer(m.prestations.slice(0, 6).map(minuscule))}. Décrivez précisément votre besoin pour recevoir des devis comparables.`,
          ]
        : []),
      CONSEILS,
    ],
  };
}

/**
 * Questions fréquentes d'une page « métier à une ville » ou « travaux à une ville » (affichées et
 * déclarées en FAQPage). Seul chiffre cité : le prix repère du simulateur, présenté comme estimation.
 */
export function faqAnnuaire(
  e: Pick<EntreeArticle, 'ville' | 'metier' | 'prestation'>,
): { q: string; r: string }[] {
  const sujet = e.prestation
    ? `des travaux « ${minuscule(e.prestation.nom)} »`
    : avecArticle(e.metier?.nom ?? 'artisan');
  const gratuit = {
    q: `Contacter ${e.prestation ? 'un artisan' : avecArticle(e.metier?.nom ?? 'artisan')} sur Portail Travaux est-il gratuit ?`,
    r: 'Oui. Laisser vos coordonnées sur la fiche d’un artisan, lui demander un devis ou utiliser le simulateur est gratuit et sans engagement ; vous choisissez ensuite librement.',
  };
  const aucun = {
    q: 'Que faire si aucun artisan ne correspond à mon projet ?',
    r: `Élargissez le rayon de recherche ou déposez votre projet : il est transmis aux artisans vérifiés qui interviennent autour de ${e.ville}.`,
  };
  if (e.prestation)
    return [
      {
        q: `Combien coûte « ${minuscule(e.prestation.nom)} » à ${e.ville} ?`,
        r: `Notre simulateur donne un prix repère ${e.prestation.repere} pour ${sujet}. C’est une estimation indicative : le prix réel dépend de votre logement et se confirme par un devis détaillé.`,
      },
      gratuit,
      aucun,
    ];
  return [
    {
      q: `Comment choisir ${sujet} à ${e.ville} ?`,
      r: CONSEILS,
    },
    gratuit,
    aucun,
  ];
}
