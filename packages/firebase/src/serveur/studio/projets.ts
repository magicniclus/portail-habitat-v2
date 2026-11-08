import { dureeMp3Ms, type ClientElevenLabs } from './elevenlabs';
import { commentairesRecents, exigerCommentaires } from './commentaires';
import type { ConfigReseaux } from './comptes';
import type { RechercheInstagram } from './instagram';
import { contexteSerieStudio } from './series';
import { resultatsPourClaudeStudio } from './stats';
import { ErreurMetier } from '@ph/core/erreurs';
import { coutCentimes } from '@ph/core/ia';
import {
  CONSERVATION_PRISES_JOURS,
  classerTendances,
  MODELE_STUDIO,
  planMontage,
  planSelonStyle,
  promptMontage,
  lienVideo,
  alignerCaptures,
  estEtapeSuivie,
  etapesFabrication,
  etapeBloquee,
  motsDepuisTexte,
  promptDeclinaisons,
  promptSujets,
  RECHERCHES_EXTERIEURES,
  RECHERCHES_PAR_DEFAUT,
  classerReels,
  HASHTAGS_INSTAGRAM,
  extraireJson,
  SCHEMA_JSON_SUJETS,
  segmentsParoles,
  sortieSujets,
  transcriptionHorodatee,
  verifierPlan,
  type FormatStudio,
  type StyleMontage,
  type MotTranscrit,
  type PreparationCaptures,
  type Frise,
  planSansMentionFictive,
  type PlanMontage,
  type StatutProjetStudio,
  type ReelInstagram,
  type SujetStudio,
  type VideoBrute,
  type VideoTendance,
} from '@ph/core/studio';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { raisonEchecClaude, type ClientStudio } from './claude';
import type { RechercheYoutube } from './youtube';

/**
 * Studio vidéo (STUDIO.md) : un projet = un sujet, une prise, des versions de montage et un
 * rendu. Étapes : sujet → enregistrement → transcription → montage → captures → rendu → prêt.
 * Les écritures passent ici (Server Actions et robot de rendu), jamais par le client.
 */

export type StatutStudio =
  | 'sujet'
  | 'enregistrement'
  | 'transcription'
  | 'montage'
  | 'captures'
  | 'rendu'
  | 'pret'
  | 'erreur';

/** Travaux confiés au robot de rendu (Cloud Run). */
export type TravailStudio = 'transcrire' | 'capturer' | 'rendre';

export interface FichiersPrise {
  ecran?: string;
  camera?: string;
  /** Absente : vidéo sans voix ni image (cartons, captures, musique). */
  voix?: string;
}

export interface ProjetStudio {
  id: string;
  auteurUid: string;
  titre: string;
  statut: StatutStudio;
  format: FormatStudio;
  camera: boolean;
  theme: string | null;
  /** Épisode d'une série (STUDIO.md §13). */
  serie: { id: string; nom: string; numero: number } | null;
  sujets: SujetStudio[];
  sujet: SujetStudio | null;
  /** Vidéos analysées pour les dernières propositions, de la plus virale à la moins virale. */
  tendances: TendanceAffichee[];
  /** Reels Instagram analysés (sans vues : Instagram ne les donne pas). */
  reels: {
    lien: string;
    legende: string;
    likes: number | null;
    commentaires: number;
    hashtag: string;
  }[];
  prise: { id: string; fichiers: FichiersPrise; dureeMs: number } | null;
  mots: MotTranscrit[];
  plan: PlanMontage | null;
  version: number;
  /** Captures filmées : identifiant de capture → fichier. */
  captures: Record<string, string>;
  /** Artisan d'exemple et écrans à filmer avant le montage (STUDIO.md §4). */
  preparation: PreparationCaptures | null;
  /** Montage libre (sans génération) : ouvert directement dans l'éditeur. */
  libre: boolean;
  /** Style de montage demandé à Claude (écran filmé par défaut). */
  style: StyleMontage;
  /** Frise multipistes (STUDIO.md §5 bis) ; absente : montage encore au format « plan ». */
  frise: Frise | null;
  /** Version du plan sur laquelle la frise a été montée (un nouveau plan de Claude la remplace). */
  friseVersion: number | null;
  /** Écrans filmés depuis le Studio (« Filmer maintenant ») : on revient ensuite à cet état. */
  apresCaptures: StatutProjetStudio | null;
  rendu: {
    video: string;
    srt: string;
    miniature: string;
    dureeMs: number;
    le: number;
    /** Variantes d'accroche rendues en plus (tests A/B), par identifiant. */
    variantes?: Record<string, { video: string; miniature: string; accroche: string }>;
  } | null;
  erreur: string | null;
  coutCentimes: number;
  createdAt: number;
  updatedAt: number;
}

export interface ServicesStudio {
  db: Firestore;
  horloge: () => number;
  claude: ClientStudio | null;
  youtube: RechercheYoutube | null;
  /** Reels Instagram populaires (facultatif : connexion Facebook et validation Meta). */
  instagram?: RechercheInstagram | null;
  lancerTravail: (type: TravailStudio, projetId: string) => Promise<void>;
  /** Voix de synthèse (ELEVENLABS_API_KEY) ; absente : le bouton explique quoi configurer. */
  elevenlabs?: ClientElevenLabs | null;
  /** Dépôt d'un fichier produit côté serveur (voix de synthèse) dans le bucket. */
  deposer?: (chemin: string, octets: Uint8Array, type: string) => Promise<void>;
  /**
   * Fait tourner une tâche longue (montage par Claude) après la réponse, pour que l'auteur
   * continue à naviguer. Absent (tests, robot) : la tâche est attendue.
   */
  enArrierePlan?: (tache: () => Promise<void>) => void;
  /** Taille et type réels d'un fichier du bucket (null s'il n'existe pas). */
  infoFichier?: (chemin: string) => Promise<{ taille: number; type: string } | null>;
  /** Suppression d'un fichier du bucket (médias d'un projet supprimé). */
  supprimerFichier?: (chemin: string) => Promise<void>;
}

const ms = (t: unknown) => (t as Timestamp | undefined)?.toMillis() ?? 0;
const JOUR = 86_400_000;

function versProjet(id: string, d: FirebaseFirestore.DocumentData): ProjetStudio {
  return {
    id,
    auteurUid: d.auteurUid as string,
    titre: d.titre as string,
    statut: d.statut as StatutStudio,
    format: d.format as FormatStudio,
    camera: d.camera === true,
    theme: (d.theme as string | null | undefined) ?? null,
    serie: (d.serie as ProjetStudio['serie'] | undefined) ?? null,
    sujets: (d.sujets as SujetStudio[] | undefined) ?? [],
    sujet: (d.sujet as SujetStudio | null | undefined) ?? null,
    tendances: (d.tendances as TendanceAffichee[] | undefined) ?? [],
    reels: (d.reels as ProjetStudio['reels'] | undefined) ?? [],
    prise: (d.prise as ProjetStudio['prise'] | undefined) ?? null,
    mots: (d.mots as MotTranscrit[] | undefined) ?? [],
    plan: (d.plan as PlanMontage | null | undefined) ?? null,
    version: (d.version as number | undefined) ?? 0,
    captures: (d.captures as Record<string, string> | undefined) ?? {},
    preparation: (d.preparation as PreparationCaptures | null | undefined) ?? null,
    libre: d.libre === true,
    style: d.style === 'dynamique' || d.style === 'pose' ? d.style : 'ecran',
    frise: (d.frise as Frise | null | undefined) ?? null,
    friseVersion: typeof d.friseVersion === 'number' ? d.friseVersion : null,
    apresCaptures: (d.apresCaptures as StatutProjetStudio | null | undefined) ?? null,
    rendu: d.rendu
      ? { ...(d.rendu as Omit<NonNullable<ProjetStudio['rendu']>, 'le'>), le: ms(d.rendu.le) }
      : null,
    erreur: (d.erreur as string | null | undefined) ?? null,
    coutCentimes: (d.coutCentimes as number | undefined) ?? 0,
    createdAt: ms(d.createdAt),
    updatedAt: ms(d.updatedAt),
  };
}

export async function lireProjetStudio(db: Firestore, id: string): Promise<ProjetStudio | null> {
  const d = await db.doc(chemins.projetStudio(id)).get();
  return d.exists ? versProjet(d.id, d.data()!) : null;
}

/** Projets du plus récent au plus ancien (50 derniers), sans la transcription. */
export async function listerProjetsStudio(db: Firestore): Promise<ProjetStudio[]> {
  const r = await db
    .collection(collections.studioProjets)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return r.docs.map((d) => ({ ...versProjet(d.id, d.data()), mots: [] }));
}

export async function exiger(s: ServicesStudio, id: string): Promise<ProjetStudio> {
  const p = await lireProjetStudio(s.db, id);
  if (!p) throw new ErreurMetier('INTROUVABLE', 'Ce projet n’existe plus.');
  return p;
}

export const maj = (s: ServicesStudio, id: string, champs: Record<string, unknown>) =>
  s.db.doc(chemins.projetStudio(id)).update({
    ...champs,
    updatedAt: Timestamp.fromMillis(s.horloge()),
  });

export async function creerProjetStudio(
  s: ServicesStudio,
  e: {
    auteurUid: string;
    titre?: string;
    format: FormatStudio;
    camera: boolean;
    theme?: string;
    serie?: ProjetStudio['serie'];
  },
): Promise<string> {
  const ref = s.db.collection(collections.studioProjets).doc();
  const t = Timestamp.fromMillis(s.horloge());
  await ref.set({
    schemaVersion: 1,
    auteurUid: e.auteurUid,
    // Sans titre : celui de la vidéo choisie parmi les propositions de Claude.
    titre: e.titre ?? (e.theme ? e.theme.slice(0, 100) : 'Nouvelle vidéo'),
    titreAuto: !e.titre,
    statut: 'sujet',
    format: e.format,
    camera: e.camera,
    theme: e.theme ?? null,
    serie: e.serie ?? null,
    sujets: [],
    sujet: null,
    prise: null,
    plan: null,
    version: 0,
    captures: {},
    rendu: null,
    erreur: null,
    coutCentimes: 0,
    createdAt: t,
    updatedAt: t,
  });
  return ref.id;
}

export function exigerClaude(s: ServicesStudio): ClientStudio {
  if (!s.claude)
    throw new ErreurMetier(
      'INDISPONIBLE',
      'Claude n’est pas configuré : ajoutez ANTHROPIC_API_KEY dans les variables d’environnement.',
    );
  return s.claude;
}

const cleRecherche = (q: string) =>
  q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 80);

/** Vidéos d'une recherche, gardées 24 h dans `studioTendances` (quota YouTube, COUTS.md). */
async function videosRecherche(s: ServicesStudio, q: string) {
  const ref = s.db.collection(collections.studioTendances).doc(cleRecherche(q));
  const cache = await ref.get();
  const maintenant = s.horloge();
  if (cache.exists && maintenant - ms(cache.get('le')) < JOUR)
    return cache.get('videos') as VideoBrute[];
  const videos = await s.youtube!(q, maintenant);
  await ref.set({
    schemaVersion: 1,
    recherche: q,
    videos,
    le: Timestamp.fromMillis(maintenant),
    expireLe: Timestamp.fromMillis(maintenant + 7 * JOUR),
  });
  return videos;
}

/**
 * Ce que l'auteur a fait des idées précédentes (40 dernières vidéos) : choisies, ignorées à côté
 * d'une idée choisie, gardées pour plus tard. Claude s'en sert pour viser ses goûts.
 */
async function goutsPourClaude(db: Firestore, sauf: string) {
  const [projets, idees] = await Promise.all([
    db.collection(collections.studioProjets).orderBy('createdAt', 'desc').limit(40).get(),
    db.collection(collections.studioIdees).orderBy('gardeeLe', 'desc').limit(15).get(),
  ]);
  const choisis: string[] = [];
  const ignores: string[] = [];
  for (const d of projets.docs) {
    if (d.id === sauf) continue;
    const choisi = d.get('sujet.titre') as string | undefined;
    if (!choisi) continue;
    choisis.push(choisi);
    for (const x of (d.get('sujets') as { titre: string }[] | undefined) ?? [])
      if (x.titre !== choisi) ignores.push(x.titre);
  }
  return {
    choisis: choisis.slice(0, 15),
    gardes: idees.docs.map((d) => d.get('sujet.titre') as string),
    ignores: ignores.slice(0, 20),
  };
}

/** Reels des hashtags suivis, gardés 7 jours (Instagram limite à 30 hashtags par 7 jours). */
async function reelsInstagram(s: ServicesStudio) {
  if (!s.instagram) return [];
  const maintenant = s.horloge();
  const lots = await Promise.all(
    HASHTAGS_INSTAGRAM.map(async (h) => {
      const ref = s.db.collection(collections.studioTendances).doc(`ig-${h}`);
      const cache = await ref.get();
      if (cache.exists && maintenant - ms(cache.get('le')) < 7 * JOUR)
        return cache.get('reels') as ReelInstagram[];
      try {
        const reels = await s.instagram!(h);
        await ref.set({
          schemaVersion: 1,
          recherche: `#${h}`,
          reels,
          le: Timestamp.fromMillis(maintenant),
          expireLe: Timestamp.fromMillis(maintenant + 14 * JOUR),
        });
        return reels;
      } catch (err) {
        console.warn('studio : recherche Instagram indisponible', err);
        return [];
      }
    }),
  );
  return classerReels(lots.flat(), maintenant);
}

async function tendances(s: ServicesStudio, theme: string | undefined): Promise<VideoTendance[]> {
  if (!s.youtube) return [];
  const recherches = [...(theme ? [theme] : []), ...RECHERCHES_PAR_DEFAUT].slice(0, theme ? 3 : 4);
  // Deux recherches hors bâtiment, qui changent chaque jour (même tirage dans la journée : cache).
  const jour = Math.floor(s.horloge() / JOUR);
  const ailleurs = [0, 1].map(
    (k) => RECHERCHES_EXTERIEURES[(jour * 2 + k) % RECHERCHES_EXTERIEURES.length]!,
  );
  const chercher = (q: string, niche: 'batiment' | 'externe') =>
    videosRecherche(s, q)
      .then((l) => l.map((v) => ({ ...v, niche })))
      .catch((err: unknown) => {
        console.warn('studio : recherche YouTube indisponible', err);
        return [];
      });
  const lots = await Promise.all([
    ...recherches.map((q) => chercher(q, 'batiment' as const)),
    ...ailleurs.map((q) => chercher(q, 'externe' as const)),
  ]);
  const vus = new Set<string>();
  const uniques = lots.flat().filter((v) => !vus.has(v.titre) && vus.add(v.titre));
  return classerTendances(uniques, s.horloge());
}

/** Ce qu'on garde d'une vidéo analysée pour l'afficher (sans la description). */
export interface TendanceAffichee {
  /** Lien pour regarder la vidéo ; `null` si l'identifiant manque (ancien cache). */
  lien: string | null;
  /** Vidéo hors bâtiment : concept à transposer. */
  externe?: boolean;
  titre: string;
  chaine: string;
  vues: number;
  likes: number | null;
  vuesParJour: number;
  engagement: number | null;
  multiplicateur: number | null;
  scoreViral: number;
}
const resumeTendance = (v: VideoTendance): TendanceAffichee => ({
  lien: v.id ? lienVideo(v.id) : null,
  ...(v.niche === 'externe' ? { externe: true } : {}),
  titre: v.titre,
  chaine: v.chaine,
  vues: v.vues,
  likes: v.likes,
  vuesParJour: Math.round(v.vuesParJour),
  engagement: v.engagement === null ? null : Math.round(v.engagement * 1000) / 1000,
  multiplicateur: v.multiplicateur === null ? null : Math.round(v.multiplicateur * 10) / 10,
  scoreViral: v.scoreViral,
});

export const cout = (usage: Parameters<typeof coutCentimes>[1]) =>
  FieldValue.increment(coutCentimes(MODELE_STUDIO, usage));

/** Étape 1 : analyse des vidéos qui marchent, puis sujets proposés par Claude avec leur script. */
export async function proposerSujetsStudio(
  s: ServicesStudio,
  e: {
    projetId: string;
    theme?: string;
    nombre?: number;
    commentaires?: readonly { texte: string; likes: number; video: string }[];
  },
): Promise<SujetStudio[]> {
  const claude = exigerClaude(s);
  const p = await exiger(s, e.projetId);
  const theme = e.theme ?? p.theme ?? undefined;
  const videos = await tendances(s, theme);
  const vosVideos = await resultatsPourClaudeStudio(s.db, s.horloge()).catch(() => '');
  const serie = await contexteSerieStudio(s.db, p);
  const reels = await reelsInstagram(s);
  const gouts = await goutsPourClaude(s.db, e.projetId).catch(() => undefined);
  const prompt = promptSujets({
    videos,
    theme,
    nombre: e.nombre ?? 3,
    vosVideos,
    serie,
    reels,
    commentaires: e.commentaires,
    gouts,
  });
  const r = await claude({
    modele: MODELE_STUDIO,
    ...prompt,
    schema: SCHEMA_JSON_SUJETS,
    maxTokens: 32_000,
  });
  if (r.refus)
    throw new ErreurMetier('INDISPONIBLE', 'Claude n’a pas proposé de sujet. Reformulez le thème.');
  let sujets: SujetStudio[];
  try {
    sujets = sortieSujets.parse(JSON.parse(r.texte)).sujets;
  } catch {
    throw new ErreurMetier('INDISPONIBLE', 'La proposition de Claude était illisible. Réessayez.');
  }
  await maj(s, e.projetId, {
    sujets,
    theme: theme ?? null,
    tendances: videos.slice(0, 20).map(resumeTendance),
    reels: reels.slice(0, 8).map((x) => ({
      lien: x.lien,
      legende: x.legende.slice(0, 120),
      likes: x.likes,
      commentaires: x.commentaires,
      hashtag: x.hashtag,
    })),
    coutCentimes: cout(r.usage),
  });
  return sujets;
}

/** Étape 2 : sujet retenu (ou aucun : l'auteur improvise), place à l'enregistrement. */
export async function choisirSujetStudio(
  s: ServicesStudio,
  e: { projetId: string; index: number | null },
): Promise<void> {
  const p = await exiger(s, e.projetId);
  const sujet = e.index === null ? null : p.sujets[e.index];
  if (sujet === undefined) throw new ErreurMetier('INTROUVABLE', 'Ce sujet n’existe plus.');
  const auto = (await s.db.doc(chemins.projetStudio(e.projetId)).get()).get('titreAuto') === true;
  await maj(s, e.projetId, {
    sujet,
    ...(auto && sujet ? { titre: sujet.titre.slice(0, 100) } : {}),
    ...(p.statut === 'sujet' ? { statut: 'enregistrement' } : {}),
  });
}

/**
 * Session de tournage : Claude propose `nombre` idées d'un coup (un seul appel), chacune devient
 * une vidéo prête à tourner (script en prompteur). Renvoie les vidéos créées, dans l'ordre.
 */
export async function ideesSessionStudio(
  s: ServicesStudio,
  e: { auteurUid: string; nombre: number; format: FormatStudio; theme?: string },
): Promise<string[]> {
  exigerClaude(s);
  const premier = await creerProjetStudio(s, {
    auteurUid: e.auteurUid,
    format: e.format,
    camera: true,
    ...(e.theme ? { theme: e.theme } : {}),
  });
  const sujets = await proposerSujetsStudio(s, {
    projetId: premier,
    nombre: e.nombre,
    ...(e.theme ? { theme: e.theme } : {}),
  });
  await choisirSujetStudio(s, { projetId: premier, index: 0 });
  const autres: string[] = [];
  for (const sujet of sujets.slice(1))
    autres.push(
      await projetAvecSujetStudio(s, {
        auteurUid: e.auteurUid,
        sujet,
        format: e.format,
        camera: true,
        theme: e.theme ?? null,
        origine: { sessionDe: premier },
      }),
    );
  return [premier, ...autres];
}

/**
 * Plusieurs vidéos d'un coup à partir d'un sujet qui plaît : Claude le décline (angles, accroches,
 * miniatures différents) et chaque déclinaison devient une vidéo prête à tourner.
 */
export async function declinerSujetStudio(
  s: ServicesStudio,
  e: { projetId: string; index: number; nombre: number; auteurUid: string },
): Promise<string[]> {
  const claude = exigerClaude(s);
  const p = await exiger(s, e.projetId);
  const sujet = p.sujets[e.index];
  if (!sujet) throw new ErreurMetier('INTROUVABLE', 'Ce sujet n’existe plus.');
  const videos = await tendances(s, sujet.titre);
  const r = await claude({
    modele: MODELE_STUDIO,
    ...promptDeclinaisons({ sujet, nombre: e.nombre, videos }),
    schema: SCHEMA_JSON_SUJETS,
    maxTokens: 48_000,
  });
  await maj(s, p.id, { coutCentimes: cout(r.usage) });
  if (r.refus)
    throw new ErreurMetier('INDISPONIBLE', 'Claude n’a pas décliné ce sujet. Réessayez.');
  let derives: SujetStudio[];
  try {
    derives = sortieSujets.parse(JSON.parse(r.texte)).sujets.slice(0, e.nombre);
  } catch {
    throw new ErreurMetier('INDISPONIBLE', 'La proposition de Claude était illisible. Réessayez.');
  }
  const ids: string[] = [];
  for (const d of derives)
    ids.push(
      await projetAvecSujetStudio(s, {
        auteurUid: e.auteurUid,
        sujet: d,
        format: p.format,
        camera: p.camera,
        theme: p.theme,
        origine: { declineDe: p.id },
      }),
    );
  return ids;
}

/** Une vidéo dont le sujet est déjà choisi (déclinaison, idée gardée) : prête à tourner. */
export async function projetAvecSujetStudio(
  s: ServicesStudio,
  e: {
    auteurUid: string;
    sujet: SujetStudio;
    format: FormatStudio;
    camera: boolean;
    theme: string | null;
    origine: Record<string, string>;
  },
): Promise<string> {
  const id = await creerProjetStudio(s, {
    auteurUid: e.auteurUid,
    titre: e.sujet.titre.slice(0, 100),
    format: e.format,
    camera: e.camera,
    ...(e.theme ? { theme: e.theme } : {}),
  });
  await maj(s, id, { sujets: [e.sujet], sujet: e.sujet, statut: 'enregistrement', ...e.origine });
  return id;
}

/** Étape 3 : la prise est envoyée (Storage), le robot la transcrit (Whisper). */
export async function priseEnregistreeStudio(
  s: ServicesStudio,
  e: {
    projetId: string;
    auteurUid: string;
    priseId: string;
    fichiers: FichiersPrise;
    dureeMs: number;
  },
): Promise<void> {
  await exiger(s, e.projetId);
  const prefixe = `studio/${e.auteurUid}/${e.priseId}/`;
  const chemins = Object.values(e.fichiers).filter((x): x is string => Boolean(x));
  if (!chemins.every((c) => c.startsWith(prefixe) && !c.includes('..')))
    throw new ErreurMetier('ENTREE_INVALIDE', 'Fichier de prise invalide.');
  const maintenant = s.horloge();
  await maj(s, e.projetId, {
    prise: { id: e.priseId, fichiers: e.fichiers, dureeMs: e.dureeMs },
    // Claude monte : son plan remplacera les pistes (vidéo partie du Studio vide).
    libre: false,
    camera: Boolean(e.fichiers.camera),
    statut: 'transcription',
    mots: [],
    erreur: null,
    // Les prises brutes partent après 30 jours (règle de cycle de vie du bucket + ce repère).
    prisesExpirentLe: Timestamp.fromMillis(maintenant + CONSERVATION_PRISES_JOURS * JOUR),
  });
  await s.lancerTravail('transcrire', e.projetId);
}

/**
 * Voix de synthèse : ElevenLabs lit le texte (le script par défaut), le MP3 devient la voix de la
 * prise, sans écran ni caméra. Les mots arrivent horodatés avec le son : pas de transcription,
 * Claude monte tout de suite. `sousTitres` impose le choix de l'auteur au montage.
 */
export async function voixSyntheseStudio(
  s: ServicesStudio,
  e: { projetId: string; auteurUid: string; texte: string; voixId: string; sousTitres?: boolean },
): Promise<void> {
  if (!s.elevenlabs || !s.deposer)
    throw new ErreurMetier(
      'INDISPONIBLE',
      'ElevenLabs n’est pas configuré : ajoutez ELEVENLABS_API_KEY dans .env.local.',
    );
  exigerClaude(s);
  await exiger(s, e.projetId);
  let voix: { audio: Uint8Array; mots: MotTranscrit[] };
  try {
    voix = await s.elevenlabs.parler(e.texte, e.voixId);
  } catch {
    throw new ErreurMetier(
      'INDISPONIBLE',
      'ElevenLabs n’a pas répondu. Réessayez dans un instant.',
    );
  }
  const dureeMs = dureeMp3Ms(voix.audio.byteLength);
  if (dureeMs < 1_000)
    throw new ErreurMetier('ENTREE_INVALIDE', 'Texte trop court pour une vidéo.');
  const priseId = `v${s.horloge().toString(36)}`;
  const chemin = `studio/${e.auteurUid}/${priseId}/voix.mp3`;
  await s.deposer(chemin, voix.audio, 'audio/mpeg');
  await maj(s, e.projetId, {
    prise: { id: priseId, fichiers: { voix: chemin }, dureeMs },
    // Claude monte : son plan remplacera les pistes (vidéo partie du Studio vide).
    libre: false,
    camera: false,
    statut: 'montage',
    // Sans horodatage (ancienne réponse), le texte est réparti sur la durée.
    mots: voix.mots.length ? voix.mots : motsDepuisTexte(e.texte, dureeMs),
    erreur: null,
    prisesExpirentLe: Timestamp.fromMillis(s.horloge() + CONSERVATION_PRISES_JOURS * JOUR),
  });
  await lancerMontageStudio(s, {
    projetId: e.projetId,
    ...(e.sousTitres === undefined ? {} : { sousTitres: e.sousTitres }),
  });
}

/** Voix proposées par ElevenLabs (liste vide si non configuré ou injoignable). */
export async function voixDisponiblesStudio(s: ServicesStudio) {
  if (!s.elevenlabs) return [];
  try {
    return await s.elevenlabs.voix();
  } catch {
    return [];
  }
}

/**
 * Vidéo sans voix ni image : pas de prise à enregistrer ni à transcrire, Claude monte directement
 * une vidéo de `dureeMs` avec les captures, des cartons, des textes et la musique.
 */
export async function sansPriseStudio(
  s: ServicesStudio,
  e: { projetId: string; dureeMs: number; sousTitres?: boolean },
): Promise<void> {
  exigerClaude(s);
  const p = await exiger(s, e.projetId);
  // Sous-titres sans voix : le texte du script réparti sur la durée.
  const script = (p.sujet?.script ?? []).map((x) => x.voix).join(' ');
  const mots = e.sousTitres ? motsDepuisTexte(script, e.dureeMs) : [];
  await maj(s, e.projetId, {
    prise: { id: `m${s.horloge().toString(36)}`, fichiers: {}, dureeMs: e.dureeMs },
    // Claude monte : son plan remplacera les pistes (vidéo partie du Studio vide).
    libre: false,
    camera: false,
    statut: 'montage',
    mots,
    erreur: null,
  });
  await lancerMontageStudio(s, { projetId: e.projetId, sousTitres: mots.length > 0 });
}

/** Style de montage voulu pour les prochains montages de Claude. */
export async function choisirStyleStudio(
  s: ServicesStudio,
  e: { projetId: string; style: StyleMontage },
): Promise<void> {
  await exiger(s, e.projetId);
  await maj(s, e.projetId, { style: e.style });
}

/** Retour du robot : transcription mot à mot, puis montage par Claude. */
export async function transcriptionRecueStudio(
  s: ServicesStudio,
  e: {
    projetId: string;
    mots: MotTranscrit[];
    images?: readonly { type: 'image/jpeg'; base64: string }[];
  },
): Promise<void> {
  await maj(s, e.projetId, { mots: e.mots, statut: 'montage' });
  await genererMontageStudio(s, {
    projetId: e.projetId,
    ...(e.images ? { images: e.images } : {}),
  });
}

/** Plan accepté : nouvelle version, puis captures manquantes ou rendu direct. */
async function enregistrerPlan(
  s: ServicesStudio,
  p: ProjetStudio,
  brut: PlanMontage,
  auteur: string,
) {
  // Jamais « exemple fictif » à l'image : cela se dit à l'oral.
  const plan = planSansMentionFictive(brut);
  const version = p.version + 1;
  const t = Timestamp.fromMillis(s.horloge());
  await s.db
    .doc(chemins.versionStudio(p.id, version))
    .set({ schemaVersion: 1, n: version, plan, auteur, le: t });
  const manquantes = plan.captures.some((c) => !p.captures[`${c.id}:${c.scene}`]);
  const suite: TravailStudio = manquantes ? 'capturer' : 'rendre';
  await maj(s, p.id, {
    plan,
    version,
    format: plan.format,
    statut: manquantes ? 'captures' : 'rendu',
    erreur: null,
  });
  await s.lancerTravail(suite, p.id);
}

/**
 * Lance le montage par Claude : l'étape passe à « montage » tout de suite (visible partout), les
 * préalables sont vérifiés, puis Claude travaille en arrière-plan si le site le permet. Une panne
 * de Claude met le projet « À relancer » au lieu de le laisser bloqué.
 */
export async function lancerMontageStudio(
  s: ServicesStudio,
  e: Parameters<typeof genererMontageStudio>[1],
): Promise<void> {
  exigerClaude(s);
  const p = await exiger(s, e.projetId);
  if (!p.prise) throw new ErreurMetier('PRECONDITION', 'Enregistrez d’abord une prise.');
  if (e.retouche && !p.plan) throw new ErreurMetier('PRECONDITION', 'Aucun montage à retoucher.');
  await maj(s, e.projetId, { statut: 'montage', erreur: null });
  if (!s.enArrierePlan) return genererMontageStudio(s, e);
  s.enArrierePlan(() =>
    genererMontageStudio(s, e).catch(async (err: unknown) => {
      const raison = err instanceof ErreurMetier ? err.message : raisonEchecClaude(err);
      console.error(`[studio] montage ${e.projetId} : ${raison}`);
      await maj(s, e.projetId, {
        statut: 'erreur',
        erreur:
          err instanceof ErreurMetier ? raison : `Claude n’a pas pu faire le montage : ${raison}`,
      });
    }),
  );
}

/**
 * Montage par Claude (premier montage ou retouche « revois ça ») : plan JSON validé ; s'il est
 * refusé, Claude le corrige une fois avec les erreurs. Deux refus : le projet passe en erreur.
 */
export async function genererMontageStudio(
  s: ServicesStudio,
  e: {
    projetId: string;
    retouche?: string;
    images?: readonly { type: 'image/jpeg'; base64: string }[];
    /** Choix de l'auteur, imposé au plan (sinon Claude décide, ou garde celui du plan actuel). */
    sousTitres?: boolean;
  },
): Promise<void> {
  const claude = exigerClaude(s);
  const p = await exiger(s, e.projetId);
  if (!p.prise) throw new ErreurMetier('PRECONDITION', 'Enregistrez d’abord une prise.');
  if (e.retouche && !p.plan) throw new ErreurMetier('PRECONDITION', 'Aucun montage à retoucher.');
  const contexte = {
    dureePriseMs: p.prise.dureeMs,
    camera: p.camera,
    ecran: Boolean(p.prise.fichiers.ecran),
  };
  let erreurs: string[] = [];
  for (let essai = 0; essai < 2; essai++) {
    const prompt = promptMontage({
      format: p.format,
      camera: p.camera,
      ecran: contexte.ecran,
      voix: Boolean(p.prise.fichiers.voix),
      sousTitres: (e.sousTitres ?? p.plan?.sousTitres ?? false) && p.mots.length > 0,
      dureePriseMs: p.prise.dureeMs,
      transcription: transcriptionHorodatee(p.mots),
      segments: segmentsParoles(p.mots, {}),
      sujet: p.sujet,
      serie: await contexteSerieStudio(s.db, p),
      capturesFilmees: Object.keys(p.captures).map((cle) => {
        const [id, scene] = cle.split(':');
        return { id: id!, scene: scene! };
      }),
      artisan: p.preparation && !p.preparation.ignoree ? p.preparation.artisan : null,
      style: p.style,
      ...(e.retouche && p.plan ? { retouche: { plan: p.plan, demande: e.retouche } } : {}),
      erreurs,
    });
    const r = await claude({
      modele: MODELE_STUDIO,
      ...prompt,
      ...(e.images?.length && essai === 0 ? { images: e.images } : {}),
      maxTokens: 64_000,
    });
    await maj(s, p.id, { coutCentimes: cout(r.usage) });
    let brut: unknown = null;
    try {
      brut = JSON.parse(extraireJson(r.texte));
    } catch {
      erreurs = ['La réponse n’était pas un JSON valide : réponds uniquement par l’objet JSON.'];
      continue;
    }
    erreurs = r.refus ? ['Réponse déclinée.'] : verifierPlan(brut, contexte);
    if (!erreurs.length) {
      // Captures déjà filmées réutilisées, artisan de la préparation imposé (il est à l'écran).
      // Style voulu imposé quoi que Claude ait répondu (jamais de musique, écran filmé simple).
      const lu = alignerCaptures(planSelonStyle(planMontage.parse(brut), p.style), p.captures);
      const plan =
        p.preparation && !p.preparation.ignoree ? { ...lu, artisan: p.preparation.artisan } : lu;
      await enregistrerPlan(
        s,
        p,
        e.sousTitres === undefined
          ? plan
          : { ...plan, sousTitres: e.sousTitres && p.mots.length > 0 },
        e.retouche ? 'claude-retouche' : 'claude',
      );
      return;
    }
  }
  await maj(s, p.id, {
    statut: 'erreur',
    erreur: `Le montage proposé par Claude a été refusé : ${erreurs.slice(0, 3).join(' ')}`,
  });
}

/** Modification à la main (format, caméra, textes…) : même validation, rendu sans Claude. */
export async function modifierPlanStudio(
  s: ServicesStudio,
  e: { projetId: string; plan: unknown },
): Promise<void> {
  const p = await exiger(s, e.projetId);
  if (!p.prise) throw new ErreurMetier('PRECONDITION', 'Enregistrez d’abord une prise.');
  const erreurs = verifierPlan(e.plan, {
    dureePriseMs: p.prise.dureeMs,
    camera: p.camera,
    ecran: Boolean(p.prise.fichiers.ecran),
  });
  if (erreurs.length) throw new ErreurMetier('ENTREE_INVALIDE', erreurs.slice(0, 3).join(' '));
  await enregistrerPlan(s, p, planMontage.parse(e.plan), 'manuel');
}

/** Retour du robot : captures filmées (clé `id:scene` → fichier), puis rendu. */
export async function capturesTermineesStudio(
  s: ServicesStudio,
  e: { projetId: string; captures: Record<string, string> },
): Promise<void> {
  const p = await exiger(s, e.projetId);
  const captures = { ...p.captures, ...e.captures };
  // Filmés depuis le Studio sans fabriquer : on garde le montage en cours tel quel.
  if (p.apresCaptures) {
    await maj(s, e.projetId, {
      captures,
      statut: p.apresCaptures,
      apresCaptures: null,
      erreur: null,
    });
    return;
  }
  if (p.plan || p.libre) {
    await maj(s, e.projetId, { captures, statut: 'rendu' });
    return s.lancerTravail('rendre', e.projetId);
  }
  // Filmées avant le montage : on monte si la prise est prête, sinon on attend le tournage.
  if (!p.prise) {
    await maj(s, e.projetId, { captures, statut: 'enregistrement', erreur: null });
    return;
  }
  await maj(s, e.projetId, { captures });
  // Voix enregistrée pas encore transcrite : la transcription lancera le montage.
  const transcrire = etapesFabrication(p.prise.id).includes('transcription');
  if (!transcrire || p.mots.length) await lancerMontageStudio(s, { projetId: e.projetId });
}

export async function renduTermineStudio(
  s: ServicesStudio,
  e: {
    projetId: string;
    fichiers: { video: string; srt: string; miniature: string };
    dureeMs: number;
    variantes?: Record<string, { video: string; miniature: string; accroche: string }>;
  },
): Promise<void> {
  await maj(s, e.projetId, {
    statut: 'pret',
    rendu: {
      ...e.fichiers,
      dureeMs: e.dureeMs,
      le: Timestamp.fromMillis(s.horloge()),
      variantes: e.variantes ?? {},
    },
    erreur: null,
  });
}

export async function echecStudio(
  s: ServicesStudio,
  e: { projetId: string; etape: TravailStudio; message: string },
): Promise<void> {
  const etapes: Record<TravailStudio, string> = {
    transcrire: 'La transcription',
    capturer: 'Les captures',
    rendre: 'Le rendu',
  };
  await maj(s, e.projetId, {
    statut: 'erreur',
    erreur: `${etapes[e.etape]} a échoué : ${e.message.slice(0, 300)}`,
  });
}

/** Relance de l'étape en échec (même travail). */
export async function relancerStudio(s: ServicesStudio, e: { projetId: string }): Promise<void> {
  const p = await exiger(s, e.projetId);
  if (!p.prise) throw new ErreurMetier('PRECONDITION', 'Enregistrez d’abord une prise.');
  // Une étape qui tourne encore dans les temps n'est pas relancée (pas de double appel à Claude).
  if (estEtapeSuivie(p.statut) && !etapeBloquee(p.statut, p.updatedAt, s.horloge()))
    throw new ErreurMetier(
      'PRECONDITION',
      'Cette étape est encore en cours : attendez qu’elle finisse ou qu’elle dépasse sa durée habituelle.',
    );
  // Seule une voix enregistrée se transcrit ; voix IA et « Claude fait tout » ont déjà leurs mots.
  if (!p.mots.length && !p.plan && etapesFabrication(p.prise.id).includes('transcription')) {
    await maj(s, p.id, { statut: 'transcription', erreur: null });
    return s.lancerTravail('transcrire', p.id);
  }
  if (!p.plan) return lancerMontageStudio(s, { projetId: p.id });
  return enregistrerPlan(s, p, p.plan, 'relance');
}

/** Vidéo signalée par l'indicateur de la coque admin. */
export interface VideoEnCours {
  id: string;
  titre: string;
  statut: StatutStudio;
  depuis: number;
}

/**
 * Indicateur « Vidéo en création » de la coque admin : les projets en fabrication, puis ceux
 * finis (prêts ou à relancer) depuis moins de 2 minutes, pour l'annoncer en naviguant.
 */
export async function videosEnCoursStudio(
  db: Firestore,
  maintenant: number = Date.now(),
): Promise<VideoEnCours[]> {
  const col = db.collection(collections.studioProjets);
  const [enCours, recents] = await Promise.all([
    col.where('statut', 'in', ['transcription', 'montage', 'captures', 'rendu']).limit(5).get(),
    col
      .where('updatedAt', '>=', Timestamp.fromMillis(maintenant - 2 * 60_000))
      .limit(10)
      .get(),
  ]);
  const vers = (d: FirebaseFirestore.QueryDocumentSnapshot): VideoEnCours => ({
    id: d.id,
    titre: d.get('titre') as string,
    statut: d.get('statut') as StatutStudio,
    depuis: ms(d.get('updatedAt')),
  });
  return [
    ...enCours.docs.map(vers),
    ...recents.docs.map(vers).filter((v) => v.statut === 'pret' || v.statut === 'erreur'),
  ];
}

/**
 * Chaque nuit : prises brutes (écran, caméra, voix) de plus de 30 jours supprimées (STUDIO.md §7).
 * Les vidéos finies restent ; sans prise, une nouvelle retouche demande une nouvelle prise.
 */
export async function purgerPrisesStudio(
  db: Firestore,
  maintenant: number,
  supprimer: (chemin: string) => Promise<void>,
): Promise<{ prises: number }> {
  let prises = 0;
  for (;;) {
    const r = await db
      .collection(collections.studioProjets)
      .where('prisesExpirentLe', '<=', Timestamp.fromMillis(maintenant))
      .limit(100)
      .get();
    if (r.empty) break;
    for (const d of r.docs) {
      const f = (d.get('prise') as { fichiers?: FichiersPrise } | null)?.fichiers ?? {};
      await Promise.all(
        Object.values(f)
          .filter(Boolean)
          .map((c) => supprimer(c as string)),
      );
      await d.ref.update({
        prise: null,
        mots: [],
        prisesExpirentLe: FieldValue.delete(),
        prisesSupprimeesLe: Timestamp.fromMillis(maintenant),
      });
      prises++;
    }
  }
  return { prises };
}

/**
 * Vidéos « réponse aux commentaires » : les vraies questions de votre public deviennent des
 * sujets (un nouveau projet, à garder ou tourner comme les autres).
 */
export async function sujetsDepuisCommentairesStudio(
  s: ServicesStudio & { reseaux: ConfigReseaux | null; fetch: typeof fetch },
  e: { auteurUid: string },
): Promise<string> {
  exigerClaude(s);
  if (!s.reseaux) throw new ErreurMetier('INDISPONIBLE', 'STUDIO_CHIFFREMENT_CLE manquante.');
  const commentaires = exigerCommentaires(
    await commentairesRecents(s.db, s.reseaux, s.fetch, s.horloge()),
  );
  const id = await creerProjetStudio(s, {
    auteurUid: e.auteurUid,
    format: 'vertical',
    camera: false,
    theme: 'Répondre aux questions de nos commentaires',
  });
  await proposerSujetsStudio(s, { projetId: id, nombre: 5, commentaires });
  return id;
}
