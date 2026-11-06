import { ErreurMetier } from '@ph/core/erreurs';
import { coutCentimes } from '@ph/core/ia';
import {
  CONSERVATION_PRISES_JOURS,
  classerTendances,
  MODELE_STUDIO,
  planMontage,
  promptMontage,
  promptDeclinaisons,
  promptSujets,
  RECHERCHES_PAR_DEFAUT,
  SCHEMA_JSON_PLAN,
  SCHEMA_JSON_SUJETS,
  segmentsParoles,
  sortieSujets,
  transcriptionHorodatee,
  verifierPlan,
  type FormatStudio,
  type MotTranscrit,
  type PlanMontage,
  type SujetStudio,
  type VideoBrute,
  type VideoTendance,
} from '@ph/core/studio';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { ClientStudio } from './claude';
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
  voix: string;
}

export interface ProjetStudio {
  id: string;
  auteurUid: string;
  titre: string;
  statut: StatutStudio;
  format: FormatStudio;
  camera: boolean;
  theme: string | null;
  sujets: SujetStudio[];
  sujet: SujetStudio | null;
  /** Vidéos analysées pour les dernières propositions, de la plus virale à la moins virale. */
  tendances: TendanceAffichee[];
  prise: { id: string; fichiers: FichiersPrise; dureeMs: number } | null;
  mots: MotTranscrit[];
  plan: PlanMontage | null;
  version: number;
  /** Captures filmées : identifiant de capture → fichier. */
  captures: Record<string, string>;
  rendu: { video: string; srt: string; miniature: string; dureeMs: number; le: number } | null;
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
  lancerTravail: (type: TravailStudio, projetId: string) => Promise<void>;
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
    sujets: (d.sujets as SujetStudio[] | undefined) ?? [],
    sujet: (d.sujet as SujetStudio | null | undefined) ?? null,
    tendances: (d.tendances as TendanceAffichee[] | undefined) ?? [],
    prise: (d.prise as ProjetStudio['prise'] | undefined) ?? null,
    mots: (d.mots as MotTranscrit[] | undefined) ?? [],
    plan: (d.plan as PlanMontage | null | undefined) ?? null,
    version: (d.version as number | undefined) ?? 0,
    captures: (d.captures as Record<string, string> | undefined) ?? {},
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

async function exiger(s: ServicesStudio, id: string): Promise<ProjetStudio> {
  const p = await lireProjetStudio(s.db, id);
  if (!p) throw new ErreurMetier('INTROUVABLE', 'Ce projet n’existe plus.');
  return p;
}

const maj = (s: ServicesStudio, id: string, champs: Record<string, unknown>) =>
  s.db.doc(chemins.projetStudio(id)).update({
    ...champs,
    updatedAt: Timestamp.fromMillis(s.horloge()),
  });

export async function creerProjetStudio(
  s: ServicesStudio,
  e: { auteurUid: string; titre?: string; format: FormatStudio; camera: boolean; theme?: string },
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

function exigerClaude(s: ServicesStudio): ClientStudio {
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

async function tendances(s: ServicesStudio, theme: string | undefined): Promise<VideoTendance[]> {
  if (!s.youtube) return [];
  const recherches = [...(theme ? [theme] : []), ...RECHERCHES_PAR_DEFAUT].slice(0, theme ? 3 : 5);
  const lots = await Promise.all(
    recherches.map((q) =>
      videosRecherche(s, q).catch((err: unknown) => {
        console.warn('studio : recherche YouTube indisponible', err);
        return [];
      }),
    ),
  );
  const vus = new Set<string>();
  const uniques = lots.flat().filter((v) => !vus.has(v.titre) && vus.add(v.titre));
  return classerTendances(uniques, s.horloge());
}

/** Ce qu'on garde d'une vidéo analysée pour l'afficher (sans la description). */
export interface TendanceAffichee {
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
  titre: v.titre,
  chaine: v.chaine,
  vues: v.vues,
  likes: v.likes,
  vuesParJour: Math.round(v.vuesParJour),
  engagement: v.engagement === null ? null : Math.round(v.engagement * 1000) / 1000,
  multiplicateur: v.multiplicateur === null ? null : Math.round(v.multiplicateur * 10) / 10,
  scoreViral: v.scoreViral,
});

const cout = (usage: Parameters<typeof coutCentimes>[1]) =>
  FieldValue.increment(coutCentimes(MODELE_STUDIO, usage));

/** Étape 1 : analyse des vidéos qui marchent, puis sujets proposés par Claude avec leur script. */
export async function proposerSujetsStudio(
  s: ServicesStudio,
  e: { projetId: string; theme?: string; nombre?: number },
): Promise<SujetStudio[]> {
  const claude = exigerClaude(s);
  const p = await exiger(s, e.projetId);
  const theme = e.theme ?? p.theme ?? undefined;
  const videos = await tendances(s, theme);
  const prompt = promptSujets({ videos, theme, nombre: e.nombre ?? 3 });
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
    tendances: videos.slice(0, 12).map(resumeTendance),
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
  for (const d of derives) {
    const id = await creerProjetStudio(s, {
      auteurUid: e.auteurUid,
      titre: d.titre.slice(0, 100),
      format: p.format,
      camera: p.camera,
      ...(p.theme ? { theme: p.theme } : {}),
    });
    await maj(s, id, { sujets: [d], sujet: d, statut: 'enregistrement', declineDe: p.id });
    ids.push(id);
  }
  return ids;
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
    camera: Boolean(e.fichiers.camera),
    statut: 'transcription',
    mots: [],
    erreur: null,
    // Les prises brutes partent après 30 jours (règle de cycle de vie du bucket + ce repère).
    prisesExpirentLe: Timestamp.fromMillis(maintenant + CONSERVATION_PRISES_JOURS * JOUR),
  });
  await s.lancerTravail('transcrire', e.projetId);
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
  plan: PlanMontage,
  auteur: string,
) {
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
 * Montage par Claude (premier montage ou retouche « revois ça ») : plan JSON validé ; s'il est
 * refusé, Claude le corrige une fois avec les erreurs. Deux refus : le projet passe en erreur.
 */
export async function genererMontageStudio(
  s: ServicesStudio,
  e: {
    projetId: string;
    retouche?: string;
    images?: readonly { type: 'image/jpeg'; base64: string }[];
  },
): Promise<void> {
  const claude = exigerClaude(s);
  const p = await exiger(s, e.projetId);
  if (!p.prise) throw new ErreurMetier('PRECONDITION', 'Enregistrez d’abord une prise.');
  if (e.retouche && !p.plan) throw new ErreurMetier('PRECONDITION', 'Aucun montage à retoucher.');
  const contexte = { dureePriseMs: p.prise.dureeMs, camera: p.camera };
  let erreurs: string[] = [];
  for (let essai = 0; essai < 2; essai++) {
    const prompt = promptMontage({
      format: p.format,
      camera: p.camera,
      dureePriseMs: p.prise.dureeMs,
      transcription: transcriptionHorodatee(p.mots),
      segments: segmentsParoles(p.mots, {}),
      sujet: p.sujet,
      ...(e.retouche && p.plan ? { retouche: { plan: p.plan, demande: e.retouche } } : {}),
      erreurs,
    });
    const r = await claude({
      modele: MODELE_STUDIO,
      ...prompt,
      schema: SCHEMA_JSON_PLAN,
      ...(e.images?.length && essai === 0 ? { images: e.images } : {}),
      maxTokens: 64_000,
    });
    await maj(s, p.id, { coutCentimes: cout(r.usage) });
    let brut: unknown = null;
    try {
      brut = JSON.parse(r.texte);
    } catch {
      erreurs = ['La réponse n’était pas un JSON valide.'];
      continue;
    }
    erreurs = r.refus ? ['Réponse déclinée.'] : verifierPlan(brut, contexte);
    if (!erreurs.length) {
      await enregistrerPlan(
        s,
        p,
        planMontage.parse(brut),
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
  const erreurs = verifierPlan(e.plan, { dureePriseMs: p.prise.dureeMs, camera: p.camera });
  if (erreurs.length) throw new ErreurMetier('ENTREE_INVALIDE', erreurs.slice(0, 3).join(' '));
  await enregistrerPlan(s, p, planMontage.parse(e.plan), 'manuel');
}

/** Retour du robot : captures filmées (clé `id:scene` → fichier), puis rendu. */
export async function capturesTermineesStudio(
  s: ServicesStudio,
  e: { projetId: string; captures: Record<string, string> },
): Promise<void> {
  const p = await exiger(s, e.projetId);
  await maj(s, e.projetId, { captures: { ...p.captures, ...e.captures }, statut: 'rendu' });
  await s.lancerTravail('rendre', e.projetId);
}

export async function renduTermineStudio(
  s: ServicesStudio,
  e: {
    projetId: string;
    fichiers: { video: string; srt: string; miniature: string };
    dureeMs: number;
  },
): Promise<void> {
  await maj(s, e.projetId, {
    statut: 'pret',
    rendu: { ...e.fichiers, dureeMs: e.dureeMs, le: Timestamp.fromMillis(s.horloge()) },
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
  if (!p.mots.length && !p.plan) {
    await maj(s, p.id, { statut: 'transcription', erreur: null });
    return s.lancerTravail('transcrire', p.id);
  }
  if (!p.plan) {
    await maj(s, p.id, { statut: 'montage', erreur: null });
    return genererMontageStudio(s, { projetId: p.id });
  }
  return enregistrerPlan(s, p, p.plan, 'relance');
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
