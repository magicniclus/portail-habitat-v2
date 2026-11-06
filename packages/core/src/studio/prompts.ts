import { RYTHME_MAX_MS } from './rythme';
import { z } from '../zod';
import { ANIMATIONS, LIBELLES_CAMERA, LIBELLES_VISUEL, SCENES_CAPTURE } from './catalogue';
import { DUREE_MAX_MS, DUREE_MIN_MS, FORMATS_STUDIO, type FormatStudio } from './formats';
import type { PlanMontage } from './plan';

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
const FAITS_PRODUIT = [
  'Portail Travaux met en relation des particuliers qui ont un projet de travaux avec des artisans de leur secteur.',
  'Pour l’artisan, la fiche est gratuite ; les demandes reçues via sa fiche et son site sont gratuites, jusqu’à 10 par mois, sans commission.',
  'Outils gratuits pour l’artisan : fiche pro, site internet (créé en 2 minutes avec l’IA), devis et factures conformes, suivi des clients.',
  'Inscription gratuite, sans carte bancaire.',
  'Adresse : portailtravaux.fr/pro.',
].join('\n');

const REGLES_COMMUNES = [
  'Tu écris en français, pour des artisans du bâtiment (plombiers, électriciens, maçons, peintres…).',
  'Vouvoiement. Phrases courtes, concrètes, orales. Jamais le mot « lead » : on dit « demandes », « clients », « chantiers ».',
  'N’affirme rien sur Portail Travaux en dehors des faits fournis. Ne présente jamais Portail Travaux comme nouveau.',
  'Les chiffres d’un artisan d’exemple sont permis : l’auteur précise lui-même à l’oral qu’il s’agit d’un exemple fictif. Pas de faux avis, pas de faux témoignage de client.',
].join('\n');

export function promptSujets(e: {
  videos: readonly VideoTendance[];
  theme?: string | undefined;
  nombre: number;
  /** Résultats réels de vos vidéos publiées (`resumeVosVideos`), s'il y en a. */
  vosVideos?: string | undefined;
}): { systeme: string; contexte: string; demande: string } {
  const systeme = [
    'Tu es le meilleur scénariste de vidéos courtes (TikTok, Reels, Shorts) pour le marketing B2B auprès des artisans.',
    'Ton objectif unique : un maximum de vues et d’inscriptions d’artisans sur Portail Travaux.',
    REGLES_COMMUNES,
    'Méthode : repère dans les vidéos fournies ce qui marche (formats, accroches, promesses, durées, vues par jour), puis transpose-le à Portail Travaux. Ne copie aucune vidéo.',
    'Chaque script : une accroche qui arrête le pouce en moins de 2 secondes, une tension (problème vécu par l’artisan), la démonstration à l’écran, un appel à l’action clair. Relance l’attention toutes les 3 à 5 secondes.',
    'Pour chaque phrase du script, indique ce qu’on voit à l’écran : « camera » (l’auteur face caméra), « ecran » (son écran enregistré) ou une scène filmée par le robot parmi celles listées.',
    'Données de chaque vidéo : vues/jour (élan), engagement (j’aime + commentaires / vues ; au-dessus de 4 % c’est fort), ×abonnés (vues / abonnés de la chaîne : au-dessus de 1 la vidéo a percé au-delà de son audience, c’est le meilleur signal viral), score viral sur 100. Appuie-toi d’abord sur les vidéos au plus fort ×abonnés et au plus fort score.',
    'Pour chaque sujet : potentiel viral de 1 à 10 (honnête, comparé aux vidéos analysées), vues visées sur 30 jours (fourchette réaliste pour un compte qui démarre), abonnés à gagner, les titres des vidéos qui t’inspirent, et la miniature (texte de 2 à 5 mots qui donne envie de cliquer, avec un mot à mettre en avant).',
  ].join('\n');
  const contexte = [
    `Faits sur le produit :\n${FAITS_PRODUIT}`,
    `Scènes que le robot sait filmer sur un artisan d’exemple :\n${Object.entries(SCENES_CAPTURE)
      .map(([id, s]) => `- ${id} : ${s.libelle}`)
      .join('\n')}`,
  ].join('\n\n');
  const videos = e.videos
    .slice(0, 40)
    .map(
      (v, i) =>
        `${i + 1}. « ${v.titre} » (${v.chaine}) · score viral ${v.scoreViral}/100 · ${v.vues} vues · ${Math.round(v.vuesParJour)} vues/jour${v.multiplicateur !== null ? ` · ×${v.multiplicateur.toFixed(1)} abonnés` : ''}${v.engagement !== null ? ` · engagement ${(v.engagement * 100).toFixed(1)} %` : ''} · ${v.dureeS} s${v.description ? `\n   ${v.description.slice(0, 200)}` : ''}`,
    )
    .join('\n');
  const demande = [
    e.theme
      ? `Thème souhaité par l’auteur : ${e.theme}`
      : 'Thème libre, dans l’intérêt des artisans.',
    `Vidéos courtes qui marchent en ce moment :\n${videos || '(aucune donnée disponible : appuie-toi sur ton expérience des formats courts)'}`,
    ...(e.vosVideos
      ? [
          `Résultats réels de NOS vidéos déjà publiées (le signal le plus fiable : refais ce qui a marché pour notre audience, évite ce qui a échoué, ajuste les vues visées à ces chiffres) :\n${e.vosVideos}`,
        ]
      : []),
    `Propose ${e.nombre} sujets différents, du plus prometteur au moins prometteur. Durée entre 15 et 90 secondes.`,
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
});
export type SujetStudio = z.infer<typeof sujetStudio>;
export const sortieSujets = z.strictObject({ sujets: z.array(sujetStudio).min(1).max(8) });

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
    }),
  },
});

const enumeration = (valeurs: readonly string[]) => ({ type: 'string', enum: [...valeurs] });
const position = enumeration(['haut', 'centre', 'bas']);
const temps = { debut: entier, fin: entier };

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
        carton: chaine,
        calques: {
          type: 'array',
          items: {
            anyOf: [
              objet({
                type: { const: 'texte' },
                texte: chaine,
                style: enumeration(['accroche', 'titre', 'chiffre', 'note']),
                position,
                ...temps,
              }),
              objet(
                {
                  type: { const: 'compteur' },
                  de: entier,
                  a: entier,
                  euros: { type: 'boolean' },
                  libelle: chaine,
                  position,
                  ...temps,
                },
                ['euros'],
              ),
              objet({ type: { const: 'notification' }, titre: chaine, texte: chaine, ...temps }),
              objet({
                type: { const: 'liste' },
                elements: { type: 'array', items: chaine },
                position,
                ...temps,
              }),
              objet({
                type: { const: 'barre' },
                libelle: chaine,
                valeur: entier,
                position,
                ...temps,
              }),
              objet({ type: { const: 'fleche' }, x: nombre, y: nombre, ...temps }),
              objet({
                type: { const: 'surlignage' },
                x: nombre,
                y: nombre,
                largeur: nombre,
                hauteur: nombre,
                ...temps,
              }),
            ],
          },
        },
      },
      ['captureId', 'zoom', 'carton'],
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
});

export function promptMontage(e: {
  format: FormatStudio;
  camera: boolean;
  /** Un écran a été enregistré (absent : voix seule ou vidéo face caméra). */
  ecran?: boolean;
  dureePriseMs: number;
  transcription: string;
  segments: readonly { debut: number; fin: number }[];
  sujet: SujetStudio | null;
  /** Notes de Claude sur les images de la caméra (regard, énergie), facultatives. */
  regardCamera?: string | undefined;
  /** Retouche : plan actuel et demande de l'auteur. */
  retouche?: { plan: PlanMontage; demande: string } | undefined;
  /** Erreurs de validation du plan précédent, à corriger. */
  erreurs?: readonly string[] | undefined;
}): { systeme: string; contexte: string; demande: string } {
  const systeme = [
    'Tu es un monteur de vidéos courtes virales. Tu ne produis qu’un plan de montage en JSON, jamais de code.',
    REGLES_COMMUNES,
    'Règles de montage :',
    '- Garde seulement les meilleurs passages de la voix : coupe les silences, hésitations, répétitions et prises ratées (garde la dernière bonne prise d’une phrase répétée).',
    '- Ne coupe jamais au milieu d’un mot : appuie-toi sur les horodatages de la transcription.',
    '- Accroche : un texte « accroche » posé à 0 ms sur le premier plan (visible dès la première image), la promesse dite dans les 2 premières secondes.',
    `- Rythme : un changement visuel (nouveau plan, calque ou zoom) au moins toutes les ${RYTHME_MAX_MS / 1000} secondes, idéalement toutes les 2 secondes.`,
    '- Fin qui reboucle : la dernière phrase gardée doit s’enchaîner naturellement avec la première, pour que la vidéo soit revue en boucle ; pas de « au revoir ».',
    '- Les chiffres importants deviennent un « compteur » ou un texte « chiffre ». Une notification « Nouvelle demande » quand on parle de demandes reçues.',
    '- Les captures montrent le produit : utilise-les quand la voix en parle. L’artisan d’exemple doit être cohérent avec ce que dit la voix.',
    '- Pas d’effet gadget : des coupes nettes, des calques lisibles, au plus 2 calques en même temps.',
    `- Durée totale entre ${DUREE_MIN_MS / 1000} s et ${DUREE_MAX_MS / 1000} s. Temps en millisecondes entières. Les temps des calques sont relatifs au début de leur plan.`,
    '- Identifiants : lettres minuscules, chiffres, « _ » ou « - ».',
    '- Miniature : choisis l’image la plus forte (visage expressif ou écran parlant) avec `tempsMs` dans la vidéo finale, un texte de 2 à 5 mots qui donne envie de cliquer et le mot à mettre en avant.',
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
  ].join('\n\n');
  const lignes = [
    `Format : ${e.format} (${FORMATS_STUDIO[e.format].largeur}×${FORMATS_STUDIO[e.format].hauteur}).`,
    `Prise : ${e.dureePriseMs} ms. Caméra enregistrée : ${e.camera ? 'oui' : 'non (camera « cachee » partout, pas de visuel « camera »)'}. Écran enregistré : ${e.ecran === false ? 'non (aucun visuel « ecran » : montre les captures Portail Travaux, des cartons et des calques sur toute la vidéo)' : 'oui'}.`,
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
