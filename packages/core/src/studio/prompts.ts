import { CAPTURE_MIN_MS, CAPTURES_MAX } from './montage';
import { RYTHME_MAX_MS } from './rythme';
import { FORMATS_VIRAUX } from './formatsViraux';
import type { ReelInstagram } from './tendances';
import { z } from '../zod';
import {
  ANIMATIONS,
  APPAREILS,
  ENTREES,
  LIBELLES_CAMERA,
  type StyleMontage,
  LIBELLES_VISUEL,
  SCENES_CAPTURE,
} from './catalogue';
import { DUREE_MAX_MS, DUREE_MIN_MS, FORMATS_STUDIO, type FormatStudio } from './formats';
import type { ArtisanFictif, PlanMontage } from './plan';

/**
 * Consignes données à Claude pour le Studio (STUDIO.md §1 et §5). Le préfixe (système + contexte
 * produit) est stable pour profiter du cache ; seule la demande varie.
 */

/** Modèle du Studio : le plus capable, la qualité du script fait les vues. */
export const MODELE_STUDIO = 'claude-opus-5-5';

/** Vidéo courte relevée sur YouTube (API officielle), sans donnée personnelle. */
export interface VideoTendance {
  /** Identifiant YouTube (lien : `lienVideo`) ; absent des anciens caches. */
  id?: string;
  /** Vidéo du bâtiment ou d'ailleurs (concept à transposer) ; absent : bâtiment. */
  niche?: 'batiment' | 'externe';
  titre: string;
  chaine: string;
  vues: number;
  likes: number | null;
  commentaires: number | null;
  dureeS: number;
  publieeLe: string;
  description: string;
  /** Abonnés de la chaîne (masqués par certaines chaînes : `null`). */
  abonnes: number | null;
  /** Vues par jour depuis la publication : la vraie mesure de l'élan. */
  vuesParJour: number;
  /** (j'aime + commentaires) / vues ; `null` sans compteurs publics. */
  engagement: number | null;
  /** Vues / abonnés : au-dessus de 1, la vidéo a dépassé l'audience de la chaîne (elle a « percé »). */
  multiplicateur: number | null;
  /** Potentiel viral de 0 à 100 (élan, engagement, dépassement de l'audience). */
  scoreViral: number;
}

/** Ce qui est vrai sur le produit : rien d'autre ne doit être affirmé sur Portail Travaux. */
export const FAITS_PRODUIT = [
  'Portail Travaux met en relation des particuliers qui ont un projet de travaux avec des artisans de leur secteur.',
  'Pour l’artisan, la fiche est gratuite ; les demandes reçues via sa fiche et son site sont gratuites, jusqu’à 10 par mois, sans commission.',
  'Outils gratuits pour l’artisan : fiche pro, site internet (créé en 2 minutes avec l’IA), devis et factures conformes, suivi des clients.',
  'Inscription gratuite, sans carte bancaire.',
  'Adresse : portailtravaux.fr/pro.',
].join('\n');

export const REGLES_COMMUNES = [
  'Tu écris en français, pour des artisans du bâtiment (plombiers, électriciens, maçons, peintres…).',
  'Vouvoiement. Phrases courtes, concrètes, orales. Jamais le mot « lead » : on dit « demandes », « clients », « chantiers ».',
  'N’affirme rien sur Portail Travaux en dehors des faits fournis. Ne présente jamais Portail Travaux comme nouveau.',
  'Les chiffres d’un artisan d’exemple sont permis : l’auteur précise lui-même à l’oral qu’il s’agit d’un exemple fictif. N’écris jamais « exemple », « fictif » ni « exemple fictif » à l’image (textes, cartons, notifications, miniature) : cela se dit seulement à l’oral. Pas de faux avis, pas de faux témoignage de client.',
].join('\n');

/** Série d'épisodes (STUDIO.md §13) : même promesse, un nouvel angle par épisode. */
export interface SerieVideo {
  nom: string;
  promesse: string;
  numero: number;
  precedents: readonly string[];
}

export function promptSujets(e: {
  videos: readonly VideoTendance[];
  theme?: string | undefined;
  nombre: number;
  /** Résultats réels de vos vidéos publiées (`resumeVosVideos`), s'il y en a. */
  vosVideos?: string | undefined;
  serie?: SerieVideo | null | undefined;
  /** Reels Instagram populaires (sans vues : Instagram ne les donne pas). */
  reels?: readonly (ReelInstagram & { interactionsParJour: number })[] | undefined;
  /** Ce que l'auteur a fait des idées précédentes : il apprend de ses choix. */
  gouts?:
    | { choisis: readonly string[]; gardes: readonly string[]; ignores: readonly string[] }
    | undefined;
  /** Commentaires reçus sous nos vidéos (texte seul, jamais l'auteur). */
  commentaires?: readonly { texte: string; likes: number; video: string }[] | undefined;
}): { systeme: string; contexte: string; demande: string } {
  const systeme = [
    'Tu es directeur de création de vidéos courtes (TikTok, Reels, Shorts), connu pour des idées qui sortent du lot. Tu fais du marketing auprès des artisans du bâtiment.',
    'Ton objectif unique : un maximum de vues et d’inscriptions d’artisans sur Portail Travaux. Une idée banale (« découvrez notre plateforme », « 3 conseils pour… ») est un échec : surprends, fais rire, provoque une émotion, crée une tension.',
    'Va chercher loin : au moins la moitié des idées reprend un concept qui marche HORS du bâtiment (vidéos « hors bâtiment » fournies, ou un format du catalogue) et le transpose au quotidien d’un artisan. Dis lequel dans `concept` : `format` (nom du mécanisme), `source` (titre EXACT d’une vidéo fournie qui l’illustre, sinon chaîne vide), `transposition` (comment il devient une vidéo Portail Travaux, en une ou deux phrases).',
    'Mélange les registres d’une idée à l’autre (humour, défi, émotion, révélation, chiffres) ; pas deux idées sur le même mécanisme.',
    REGLES_COMMUNES,
    'Méthode : repère dans les vidéos fournies ce qui marche (formats, accroches, promesses, durées, vues par jour), puis transpose-le à Portail Travaux. Ne copie aucune vidéo.',
    'Chaque script : une accroche qui arrête le pouce en moins de 2 secondes, une tension (problème vécu par l’artisan), la démonstration à l’écran, un appel à l’action clair. Relance l’attention toutes les 3 à 5 secondes.',
    'Pour chaque phrase du script, indique ce qu’on voit à l’écran : « camera » (l’auteur face caméra), « ecran » (son écran enregistré) ou une scène filmée par le robot parmi celles listées.',
    'Données de chaque vidéo : vues/jour (élan), engagement (j’aime + commentaires / vues ; au-dessus de 4 % c’est fort), ×abonnés (vues / abonnés de la chaîne : au-dessus de 1 la vidéo a percé au-delà de son audience, c’est le meilleur signal viral), score viral sur 100. Appuie-toi d’abord sur les vidéos au plus fort ×abonnés et au plus fort score.',
    'Commentaires : si des commentaires sont donnés, chaque sujet est une réponse en vidéo à une vraie question ou objection (la plus aimée ou la plus fréquente d’abord) ; l’accroche reprend la question telle qu’écrite.',
    'Série : si une série est donnée, chaque sujet est l’épisode suivant (même promesse, nouvel angle, jamais un épisode déjà fait), et le script finit en donnant envie de voir l’épisode suivant et de s’abonner pour ne pas le rater.',
    'Pour chaque sujet : potentiel viral de 1 à 10 (honnête, comparé aux vidéos analysées), vues visées sur 30 jours (fourchette réaliste pour un compte qui démarre), abonnés à gagner, les titres EXACTS (copiés tels quels) des vidéos fournies qui t’inspirent, et la miniature (texte de 2 à 5 mots qui donne envie de cliquer, avec un mot à mettre en avant).',
  ].join('\n');
  const contexte = [
    `Faits sur le produit :\n${FAITS_PRODUIT}`,
    `Catalogue de formats viraux (mécanismes à transposer, jamais de contenu copié) :\n${FORMATS_VIRAUX.map((f) => `- ${f.nom} : ${f.mecanique}`).join('\n')}`,
    `Scènes que le robot sait filmer sur un artisan d’exemple :\n${Object.entries(SCENES_CAPTURE)
      .map(([id, s]) => `- ${id} : ${s.libelle}`)
      .join('\n')}`,
  ].join('\n\n');
  const ligne = (v: VideoTendance, i: number) =>
    `${i + 1}. « ${v.titre} » (${v.chaine}) · score viral ${v.scoreViral}/100 · ${v.vues} vues · ${Math.round(v.vuesParJour)} vues/jour${v.multiplicateur !== null ? ` · ×${v.multiplicateur.toFixed(1)} abonnés` : ''}${v.engagement !== null ? ` · engagement ${(v.engagement * 100).toFixed(1)} %` : ''} · ${v.dureeS} s${v.description ? `\n   ${v.description.slice(0, 200)}` : ''}`;
  const metier = e.videos.filter((v) => v.niche !== 'externe').slice(0, 30);
  const ailleurs = e.videos.filter((v) => v.niche === 'externe').slice(0, 20);
  const videos = [
    metier.length ? `Bâtiment et artisans :\n${metier.map(ligne).join('\n')}` : '',
    ailleurs.length
      ? `Hors bâtiment (concepts à reprendre et transposer) :\n${ailleurs.map(ligne).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  const demande = [
    e.theme
      ? `Thème souhaité par l’auteur : ${e.theme}`
      : 'Thème libre, dans l’intérêt des artisans.',
    `Vidéos courtes qui marchent en ce moment :\n${videos || '(aucune donnée disponible : appuie-toi sur ton expérience des formats courts)'}`,
    ...(e.gouts && (e.gouts.choisis.length || e.gouts.gardes.length || e.gouts.ignores.length)
      ? [
          [
            'Goûts de l’auteur, appris de ses choix précédents (propose dans l’esprit de ce qu’il choisit, évite ce qu’il ignore) :',
            e.gouts.choisis.length
              ? `- Idées choisies : ${e.gouts.choisis.map((t) => `« ${t} »`).join(', ')}`
              : '',
            e.gouts.gardes.length
              ? `- Idées gardées pour plus tard : ${e.gouts.gardes.map((t) => `« ${t} »`).join(', ')}`
              : '',
            e.gouts.ignores.length
              ? `- Idées proposées mais ignorées : ${e.gouts.ignores.map((t) => `« ${t} »`).join(', ')}`
              : '',
          ]
            .filter(Boolean)
            .join('\n'),
        ]
      : []),
    ...(e.commentaires?.length
      ? [
          `Commentaires reçus sous nos vidéos (questions et objections du public) :\n${e.commentaires
            .slice(0, 80)
            .map(
              (c) =>
                `- « ${c.texte.replace(/\s+/g, ' ').slice(0, 300)} » (${c.likes} j’aime, sous « ${c.video} »)`,
            )
            .join('\n')}`,
        ]
      : []),
    ...(e.reels?.length
      ? [
          `Reels Instagram populaires en ce moment (Instagram ne donne pas leurs vues, seulement les interactions) :\n${e.reels
            .slice(0, 20)
            .map(
              (r, i) =>
                `${i + 1}. #${r.hashtag} · ${r.likes ?? '?'} j’aime · ${r.commentaires} commentaires · ${Math.round(r.interactionsParJour)} interactions/jour\n   ${r.legende.replace(/\s+/g, ' ').slice(0, 200)}`,
            )
            .join('\n')}`,
        ]
      : []),
    ...(e.serie
      ? [
          `Série « ${e.serie.nom} » : épisode ${e.serie.numero}. Promesse de la série : ${e.serie.promesse}.\nÉpisodes déjà faits :\n${e.serie.precedents.map((t) => `- ${t}`).join('\n') || '(aucun)'}`,
        ]
      : []),
    ...(e.vosVideos
      ? [
          `Résultats réels de NOS vidéos déjà publiées (le signal le plus fiable : refais ce qui a marché pour notre audience, évite ce qui a échoué, ajuste les vues visées à ces chiffres) :\n${e.vosVideos}`,
        ]
      : []),
    `Propose ${e.nombre} sujets différents, du plus prometteur au moins prometteur. Durée entre 15 et 90 secondes.`,
    ...(e.nombre > 3
      ? [
          `Série de ${e.nombre} vidéos sur le même thème : chacune a une accroche vraiment différente (question, chiffre choc, erreur à éviter, avant / après, témoignage, idée reçue…) et un angle à elle ; aucune accroche ni aucun titre ne se ressemblent.`,
        ]
      : []),
  ].join('\n\n');
  return { systeme, contexte, demande };
}

const miniatureSujet = z.strictObject({
  texte: z.string().trim().min(1).max(40),
  accent: z.string().trim().max(20),
});

const phraseScript = z.strictObject({
  voix: z.string().trim().min(1).max(400),
  aEcran: z.string().trim().min(1).max(40),
  texteEcran: z.string().trim().max(80),
});
export const sujetStudio = z.strictObject({
  titre: z.string().trim().min(1).max(120),
  angle: z.string().trim().min(1).max(400),
  pourquoi: z.string().trim().min(1).max(600),
  accroches: z.array(z.string().trim().min(1).max(160)).min(1).max(5),
  dureeCibleS: z.number().int().min(10).max(180),
  script: z.array(phraseScript).min(2).max(40),
  legende: z.string().trim().min(1).max(600),
  hashtags: z.array(z.string().trim().min(1).max(40)).max(10),
  /** Potentiel viral estimé par Claude, de 1 à 10, au regard des vidéos analysées. */
  potentielViral: z.number().int().min(1).max(10),
  /** Vues visées sur 30 jours (fourchette) et abonnés à gagner : objectifs affichés. */
  vuesVisees: z.strictObject({
    min: z.number().int().min(0).max(100_000_000),
    max: z.number().int().min(0).max(100_000_000),
  }),
  abonnesVises: z.number().int().min(0).max(10_000_000),
  /** Vidéos analysées dont l'idée s'inspire (titres). */
  inspirations: z.array(z.string().trim().min(1).max(160)).max(5),
  /** Texte de la miniature (image de couverture) : court, un mot mis en avant. */
  miniature: miniatureSujet,
  /** Concept repris et transposé (format, vidéo source, adaptation) ; absent des anciennes idées. */
  concept: z
    .strictObject({
      format: z.string().trim().min(1).max(80),
      source: z.string().trim().max(160),
      transposition: z.string().trim().min(1).max(400),
    })
    .optional(),
});
export type SujetStudio = z.infer<typeof sujetStudio>;
export const sortieSujets = z.strictObject({ sujets: z.array(sujetStudio).min(1).max(10) });

const chaine = { type: 'string' };
const entier = { type: 'integer' };
const nombre = { type: 'number' };
const objet = (proprietes: Record<string, unknown>, facultatifs: string[] = []) => ({
  type: 'object',
  properties: proprietes,
  required: Object.keys(proprietes).filter((k) => !facultatifs.includes(k)),
  additionalProperties: false,
});

export const SCHEMA_JSON_SUJETS: Record<string, unknown> = objet({
  sujets: {
    type: 'array',
    items: objet({
      titre: chaine,
      angle: chaine,
      pourquoi: chaine,
      accroches: { type: 'array', items: chaine },
      dureeCibleS: entier,
      script: { type: 'array', items: objet({ voix: chaine, aEcran: chaine, texteEcran: chaine }) },
      legende: chaine,
      hashtags: { type: 'array', items: chaine },
      potentielViral: entier,
      vuesVisees: objet({ min: entier, max: entier }),
      abonnesVises: entier,
      inspirations: { type: 'array', items: chaine },
      miniature: objet({ texte: chaine, accent: chaine }),
      concept: objet({ format: chaine, source: chaine, transposition: chaine }),
    }),
  },
});

const enumeration = (valeurs: readonly string[]) => ({ type: 'string', enum: [...valeurs] });
const position = enumeration(['haut', 'centre', 'bas']);
const temps = { debut: entier, fin: entier };

/** Un calque : ses champs, ses temps et son entrée animée (facultative). */
const calqueJson = (proprietes: Record<string, unknown>, facultatifs: string[] = []) =>
  objet({ ...proprietes, ...temps, entree: enumeration([...ENTREES]) }, [...facultatifs, 'entree']);

/** Schéma JSON du plan de montage (sortie structurée) ; la validation fine reste dans Zod. */
export const SCHEMA_JSON_PLAN: Record<string, unknown> = objet({
  format: enumeration(Object.keys(FORMATS_STUDIO)),
  titre: chaine,
  plans: {
    type: 'array',
    items: objet(
      {
        id: chaine,
        source: objet(temps),
        visuel: enumeration(Object.keys(LIBELLES_VISUEL)),
        captureId: chaine,
        camera: enumeration(Object.keys(LIBELLES_CAMERA)),
        zoom: objet({ x: nombre, y: nombre, largeur: nombre }),
        appareil: enumeration([...APPAREILS]),
        carton: chaine,
        calques: {
          type: 'array',
          items: {
            anyOf: [
              calqueJson({
                type: { const: 'texte' },
                texte: chaine,
                style: enumeration(['accroche', 'titre', 'chiffre', 'note']),
                position,
              }),
              calqueJson(
                {
                  type: { const: 'compteur' },
                  de: entier,
                  a: entier,
                  euros: { type: 'boolean' },
                  libelle: chaine,
                  position,
                },
                ['euros'],
              ),
              calqueJson({ type: { const: 'notification' }, titre: chaine, texte: chaine }),
              calqueJson({
                type: { const: 'liste' },
                elements: { type: 'array', items: chaine },
                position,
              }),
              calqueJson({ type: { const: 'barre' }, libelle: chaine, valeur: entier, position }),
              calqueJson({ type: { const: 'fleche' }, x: nombre, y: nombre }),
              calqueJson({
                type: { const: 'surlignage' },
                x: nombre,
                y: nombre,
                largeur: nombre,
                hauteur: nombre,
              }),
              calqueJson({
                type: { const: 'demandes' },
                elements: { type: 'array', items: objet({ titre: chaine, ville: chaine }) },
                position,
              }),
              calqueJson({
                type: { const: 'outils' },
                elements: { type: 'array', items: chaine },
                position,
              }),
              calqueJson({ type: { const: 'tampon' }, texte: chaine, position }),
              calqueJson({ type: { const: 'comparaison' }, avant: chaine, apres: chaine }),
              calqueJson({ type: { const: 'fin' }, titre: chaine, bouton: chaine }),
            ],
          },
        },
      },
      ['captureId', 'zoom', 'carton', 'appareil'],
    ),
  },
  captures: {
    type: 'array',
    items: objet({ id: chaine, scene: enumeration(Object.keys(SCENES_CAPTURE)) }),
  },
  artisan: {
    anyOf: [
      { type: 'null' },
      objet(
        {
          nom: chaine,
          metier: chaine,
          ville: chaine,
          demandesParMois: entier,
          chiffreAffairesCentimes: entier,
          devisEnvoyes: entier,
          noteMoyenne: nombre,
          nombreAvis: entier,
        },
        ['demandesParMois', 'chiffreAffairesCentimes', 'devisEnvoyes', 'noteMoyenne', 'nombreAvis'],
      ),
    ],
  },
  sousTitres: { type: 'boolean' },
  musique: { type: 'boolean' },
  miniature: objet({ texte: chaine, accent: chaine, tempsMs: entier }),
  variantes: {
    type: 'array',
    items: objet({
      id: chaine,
      accroche: chaine,
      miniature: objet({ texte: chaine, accent: chaine }),
    }),
  },
});

export function promptMontage(e: {
  format: FormatStudio;
  camera: boolean;
  /** Un écran a été enregistré (absent : voix seule ou vidéo face caméra). */
  ecran?: boolean;
  /** Une voix a été enregistrée (false : vidéo sans voix ni image, tout passe par l'écran). */
  voix?: boolean;
  /** Sans voix : l'auteur veut le texte du script en sous-titres (déjà réparti dans `transcription`). */
  sousTitres?: boolean;
  dureePriseMs: number;
  /** Session tournée d'une traite : passage de la prise qui appartient à cette vidéo. */
  plage?: { debut: number; fin: number } | undefined;
  transcription: string;
  segments: readonly { debut: number; fin: number }[];
  sujet: SujetStudio | null;
  /** Notes de Claude sur les images de la caméra (regard, énergie), facultatives. */
  regardCamera?: string | undefined;
  /** Retouche : plan actuel et demande de l'auteur. */
  retouche?: { plan: PlanMontage; demande: string } | undefined;
  /** Erreurs de validation du plan précédent, à corriger. */
  erreurs?: readonly string[] | undefined;
  serie?: SerieVideo | null | undefined;
  /** Captures filmées avant le montage (à réutiliser telles quelles). */
  capturesFilmees?: readonly { id: string; scene: string }[];
  /** Artisan d'exemple déjà visible dans ces captures. */
  artisan?: ArtisanFictif | null;
  /** Style voulu par l'auteur (posé par défaut). */
  style?: StyleMontage;
}): { systeme: string; contexte: string; demande: string } {
  const style = e.style ?? 'ecran';
  const anime = style !== 'ecran';
  const systeme = [
    'Tu es un monteur de vidéos courtes virales. Tu ne produis qu’un plan de montage en JSON, jamais de code.',
    REGLES_COMMUNES,
    'Règles de montage :',
    '- Garde seulement les meilleurs passages de la voix : coupe les silences, hésitations, répétitions et prises ratées (garde la dernière bonne prise d’une phrase répétée).',
    '- Ne coupe jamais au milieu d’un mot : appuie-toi sur les horodatages de la transcription.',
    anime
      ? '- Accroche : un texte « accroche » posé à 0 ms sur le premier plan (visible dès la première image), la promesse dite dans les 2 premières secondes.'
      : '- Accroche : le carton d’intro porte la promesse, dite dans les 2 premières secondes.',
    anime
      ? `- Rythme : un changement visuel (texte, zoom doux ou nouveau plan) au moins toutes les ${RYTHME_MAX_MS / 1000} secondes ; un texte ou un zoom suffit, inutile de changer d’écran.`
      : '- Rythme : c’est l’écran filmé qui fait vivre la vidéo ; un texte de temps en temps (toutes les 4 à 8 s) pour souligner ce qui compte, jamais plus d’un texte à la fois.',
    anime
      ? '- Fin qui reboucle : la dernière phrase gardée doit s’enchaîner naturellement avec la première, pour que la vidéo soit revue en boucle ; pas de « au revoir ».'
      : '- Fin : l’appel à l’action, pas de « au revoir ».',
    anime
      ? '- Les chiffres importants deviennent un « compteur » ou un texte « chiffre ». Une notification « Nouvelle demande » quand on parle de demandes reçues.'
      : '- Les chiffres importants deviennent un texte « chiffre ».',
    '- Les captures montrent le produit : utilise-les quand la voix en parle. L’artisan d’exemple doit être cohérent avec ce que dit la voix.',
    `- Public : des artisans du bâtiment, pas un public de jeux vidéo. Ton clair et concret.`,
    ...(anime
      ? [
          '- Scènes animées (comme un film de présentation soigné) : « demandes » quand la voix parle de clients ou de demandes reçues, « outils » pour les outils gratuits (fiche, site, devis…), « tampon » pour un mot fort (« GRATUIT », « 0 € de commission »), « comparaison » pour un avant / après, « fin » sur les 2 à 3 dernières secondes (phrase d’appel à l’action et bouton « portail-travaux.fr »). Une scène occupe le centre : pas d’autre calque au centre en même temps.',
          style === 'pose'
            ? '- Style POSÉ : montage calme et lisible. Peu de coupes (un plan dure 3 à 8 s), entrées « monte » ou « fondu » sur les textes et les scènes, au moins 3 scènes animées dans la vidéo, captures dans un appareil, aucun effet brusque.'
            : '- Style DYNAMIQUE : plus de rythme. Plans de 2 à 4 s, entrées « zoom », « glisse » ou « tampon », chiffres et tampons fréquents, au moins 3 scènes animées ; reste lisible (jamais deux scènes en même temps).',
        ]
      : [
          '- Style ÉCRAN FILMÉ (le plus important) : la vidéo est l’écran de Portail Travaux filmé comme par une personne, rien de plus. Structure : 1) une intro courte (2 à 3 s) : un plan « carton » avec l’accroche ; 2) l’écran du thème (la fiche, le devis, les demandes…) en capture plein écran, sur un ou plusieurs plans qui se suivent, sans changer d’écran (2 écrans au plus si le thème l’exige) ; 3) une fin (2 à 3 s) : un calque « fin » (phrase d’appel à l’action, bouton « portail-travaux.fr ») sur le dernier plan.',
          '- Style ÉCRAN FILMÉ : seuls calques permis : « texte » (titre, chiffre ou note, position « haut » ou « bas ») pour souligner ce qui compte à l’écran, et le « fin » final. Aucun appareil (pas de champ « appareil »), aucune autre animation, pas de zoom.',
        ]),
    `- Musique : aucune (« musique » = false), la voix et l’écran suffisent.`,
    `- Habillage (styles animés seulement) : pose chaque capture dans un appareil (« appareil » : ${'« telephone » en vertical, « ordinateur » sinon'}) ; elle apparaît alors sur un fond animé aux couleurs de Portail Travaux, plus soigné qu’une capture plein écran. Les textes vont au-dessus ou en dessous de l’appareil (position « haut » ou « bas »).`,
    `- Captures : ${CAPTURES_MAX} écrans de Portail Travaux différents au plus (2 suffisent souvent), chacun à l’image au moins ${CAPTURE_MIN_MS / 1000} secondes d’affilée (idéalement 6 à 10 s) pour qu’on ait le temps de lire ; ne saute pas d’un écran à l’autre. Pour relancer l’attention pendant une capture, ajoute un texte ou un zoom doux plutôt qu’un nouvel écran.`,
    '- Pas d’effet gadget : des coupes nettes, des calques lisibles, au plus 2 calques en même temps.',
    `- Durée totale entre ${DUREE_MIN_MS / 1000} s et ${DUREE_MAX_MS / 1000} s. Temps en millisecondes entières. Les temps des calques sont relatifs au début de leur plan.`,
    '- Identifiants : lettres minuscules, chiffres, « _ » ou « - ».',
    '- Miniature : choisis l’image la plus forte (visage expressif ou écran parlant) avec `tempsMs` dans la vidéo finale, un texte de 2 à 5 mots qui donne envie de cliquer et le mot à mettre en avant.',
    '- Variantes : 2 autres accroches vraiment différentes (angle, promesse ou question), chacune avec sa miniature, pour les tester l’une contre l’autre. Courtes (80 caractères au plus).',
  ].join('\n');
  const contexte = [
    `Faits sur le produit :\n${FAITS_PRODUIT}`,
    `Visuels : ${Object.entries(LIBELLES_VISUEL)
      .map(([k, v]) => `${k} (${v})`)
      .join(', ')}.`,
    `Caméra : ${Object.entries(LIBELLES_CAMERA)
      .map(([k, v]) => `${k} (${v})`)
      .join(', ')}.`,
    `Scènes de capture :\n${Object.entries(SCENES_CAPTURE)
      .map(([id, s]) => `- ${id} : ${s.description}`)
      .join('\n')}`,
    `Calques :\n${Object.entries(ANIMATIONS)
      .map(([id, s]) => `- ${id} : ${s}`)
      .join('\n')}`,
    // Trop gros pour la sortie structurée (grammaire refusée par l'API) : décrit ici, vérifié
    // ensuite par Zod et verifierPlan, avec une correction si besoin.
    `Réponds uniquement par un objet JSON (sans texte autour) conforme à ce schéma JSON :\n${JSON.stringify(SCHEMA_JSON_PLAN)}`,
  ].join('\n\n');
  const lignes = [
    `Format : ${e.format} (${FORMATS_STUDIO[e.format].largeur}×${FORMATS_STUDIO[e.format].hauteur}).`,
    `Prise : ${e.dureePriseMs} ms. Caméra enregistrée : ${e.camera ? 'oui' : 'non (camera « cachee » partout, pas de visuel « camera »)'}. Écran enregistré : ${e.ecran === false ? 'non (aucun visuel « ecran » : montre les captures Portail Travaux, des cartons et des calques sur toute la vidéo)' : 'oui'}.`,
    ...(e.plage
      ? [
          `Session tournée d’une traite : plusieurs vidéos dans la même prise. Celle-ci n’utilise QUE le passage de ${e.plage.debut} à ${e.plage.fin} ms (source.debut et source.fin dans cet intervalle) ; s’il y a plusieurs essais du même script, garde le meilleur et coupe les hésitations.`,
        ]
      : []),
    ...(e.voix === false
      ? [
          `Voix : aucune. La vidéo se comprend sans le son : chaque idée du script devient un carton ou un texte « titre » ou « chiffre » bien lisible, enchaînés sur les captures Portail Travaux ; plans pris dans 0 à ${e.dureePriseMs} ms comme une simple durée (aucune parole à respecter) ; ${
            e.sousTitres
              ? 'sousTitres = true : le texte du script défile en sous-titres selon la transcription ; prends les plans dans l’ordre, de 0 à la fin, sans trou ni retour en arrière, et ne répète pas le sous-titre dans les cartons (cartons très courts : un mot ou un chiffre)'
              : 'sousTitres = false'
          }, musique = false.`,
        ]
      : []),
    ...(e.capturesFilmees?.length
      ? [
          `Captures déjà filmées et validées par l’auteur : ${e.capturesFilmees.map((c) => `${c.id} = ${c.scene}`).join(', ')}. Montre-les en priorité avec exactement ces identifiants ; n’en ajoute une autre que si elle est indispensable.`,
        ]
      : []),
    ...(e.artisan
      ? [
          `Artisan d’exemple (déjà à l’écran dans les captures, recopie-le tel quel dans « artisan ») : ${JSON.stringify(e.artisan)}.`,
        ]
      : []),
    ...(e.serie
      ? [
          `Épisode d’une série : affiche « ${e.serie.nom} · épisode ${e.serie.numero} » en texte « note » en haut pendant les 2 premières secondes, et termine par un texte « Épisode ${e.serie.numero + 1} bientôt : abonne-toi » sur le dernier plan.`,
        ]
      : []),
    ...(e.sujet
      ? [
          `Sujet : ${e.sujet.titre}\nAngle : ${e.sujet.angle}\nScript prévu :\n${e.sujet.script.map((s) => `- ${s.voix} [${s.aEcran}]`).join('\n')}`,
        ]
      : []),
    `Transcription horodatée (ms) :\n${e.transcription || '(vide)'}`,
    `Passages de parole détectés (silences et « euh » retirés) : ${JSON.stringify(e.segments)}`,
    ...(e.regardCamera ? [`Images de la caméra : ${e.regardCamera}`] : []),
    ...(e.retouche
      ? [
          `Plan actuel :\n${JSON.stringify(e.retouche.plan)}`,
          `Retouche demandée par l’auteur : « ${e.retouche.demande} ». Modifie seulement ce qui est demandé, garde le reste.`,
        ]
      : ['Produis le meilleur montage possible.']),
    ...(e.erreurs?.length
      ? [
          `Le plan précédent a été refusé pour ces raisons, corrige-les :\n- ${e.erreurs.join('\n- ')}`,
        ]
      : []),
  ];
  return { systeme, contexte, demande: lignes.join('\n\n') };
}

/**
 * Déclinaisons d'un sujet qui marche : même thème, angles et accroches différents, pour tourner
 * plusieurs vidéos à la suite (séries, tests d'accroches).
 */
export function promptDeclinaisons(e: {
  sujet: SujetStudio;
  nombre: number;
  videos: readonly VideoTendance[];
}): { systeme: string; contexte: string; demande: string } {
  const base = promptSujets({ videos: e.videos, theme: e.sujet.titre, nombre: e.nombre });
  return {
    ...base,
    demande: [
      `Sujet de départ (il plaît à l’auteur) :\n${JSON.stringify({ titre: e.sujet.titre, angle: e.sujet.angle, accroches: e.sujet.accroches })}`,
      `Décline-le en ${e.nombre} vidéos différentes sur le même thème : chacune avec un angle, une accroche, un script et une miniature qui lui sont propres (ex. erreur à éviter, chiffre choc, avant/après, coulisses, réponse à une objection). Pas deux fois la même accroche.`,
      base.demande.split('\n\n').slice(1, 2).join(''),
    ].join('\n\n'),
  };
}

/**
 * JSON d'une réponse de Claude sans sortie structurée : retire un éventuel bloc ```json et le
 * texte autour (du premier « { » au dernier « } »).
 */
export function extraireJson(texte: string): string {
  const debut = texte.indexOf('{');
  const fin = texte.lastIndexOf('}');
  return debut === -1 || fin < debut ? texte.trim() : texte.slice(debut, fin + 1);
}
