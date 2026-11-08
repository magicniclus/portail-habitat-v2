import type { PlanMontage, SujetStudio } from '@ph/core/studio';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { collections } from '../src/chemins';
import {
  choisirSujetStudio,
  creerProjetStudio,
  declinerSujetStudio,
  echecStudio,
  genererMontageStudio,
  lireProjetStudio,
  listerProjetsStudio,
  modifierPlanStudio,
  priseEnregistreeStudio,
  voixSyntheseStudio,
  sansPriseStudio,
  relancerStudio,
  creerMontageLibreStudio,
  ajouterMediaStudio,
  enregistrerFriseStudio,
  fabriquerFriseStudio,
  filmerEcransStudio,
  friseActive,
  friseDuProjet,
  supprimerProjetStudio,
  preparerCapturesStudio,
  modifierPreparationStudio,
  ignorerCapturesStudio,
  filmerCapturesStudio,
  capturesTermineesStudio,
  lancerMontageStudio,
  videosEnCoursStudio,
  creerSerieStudio,
  episodeSuivantStudio,
  listerSeriesStudio,
  garderIdeeStudio,
  listerIdeesStudio,
  supprimerIdeeStudio,
  tournerIdeeStudio,
  dureeMp3Ms,
  proposerSujetsStudio,
  renduTermineStudio,
  transcriptionRecueStudio,
  type AppelStudio,
  type ServicesStudio,
  type TravailStudio,
} from '../src/serveur/studio';

/** Studio vidéo (STUDIO.md) : parcours complet avec un faux Claude, un faux YouTube et un faux robot. */
let db: Firestore;
const T = Date.UTC(2026, 10, 5, 9);
const appels: AppelStudio[] = [];
const travaux: { type: TravailStudio; projetId: string }[] = [];
let reponses: unknown[] = [];
let recherches: string[] = [];

const sujet: SujetStudio = {
  titre: '10 demandes gratuites par mois',
  angle: 'Montrer la fiche qui travaille seule',
  pourquoi: 'Les vidéos « combien je gagne » font beaucoup de vues par jour.',
  accroches: ['Artisans : arrêtez de payer vos clients.'],
  dureeCibleS: 30,
  script: [
    { voix: 'Artisans, arrêtez de payer vos clients.', aEcran: 'camera', texteEcran: 'Stop' },
    {
      voix: 'Votre fiche reçoit jusqu’à 10 demandes par mois.',
      aEcran: 'demandes_recues',
      texteEcran: '10 / mois',
    },
  ],
  legende: 'Des clients sans commission.',
  hashtags: ['#artisan'],
  potentielViral: 8,
  vuesVisees: { min: 5_000, max: 40_000 },
  abonnesVises: 250,
  inspirations: ['Vidéo demandes gratuites'],
  miniature: { texte: '10 demandes gratuites', accent: 'gratuites' },
};

const plan = (surcharge: Partial<PlanMontage> = {}): PlanMontage => ({
  format: 'vertical',
  titre: '10 demandes gratuites',
  plans: [
    { id: 'p1', source: { debut: 0, fin: 6_000 }, visuel: 'camera', camera: 'cachee', calques: [] },
    {
      id: 'p2',
      source: { debut: 6_500, fin: 14_000 },
      visuel: 'capture',
      captureId: 'c1',
      camera: 'bas',
      calques: [
        {
          type: 'compteur',
          de: 0,
          a: 10,
          libelle: 'demandes par mois',
          position: 'haut',
          debut: 0,
          fin: 3_000,
        },
      ],
    },
  ],
  captures: [{ id: 'c1', scene: 'demandes_recues' }],
  artisan: { nom: 'Martin Plomberie', metier: 'plombier', ville: 'Bordeaux', demandesParMois: 10 },
  sousTitres: true,
  musique: false,
  ...surcharge,
});

const services = (o: { claude?: boolean; youtube?: boolean } = {}): ServicesStudio => ({
  db,
  horloge: () => T,
  claude:
    o.claude === false
      ? null
      : async (a) => {
          appels.push(a);
          const r = reponses.shift();
          return {
            texte: typeof r === 'string' ? r : JSON.stringify(r),
            refus: false,
            usage: { entree: 10_000, sortie: 4_000, cacheEcrit: 0, cacheLu: 0 },
          };
        },
  youtube:
    o.youtube === false
      ? null
      : async (q) => {
          recherches.push(q);
          return [
            {
              id: `yt-${q.replace(/\W/g, '')}`,
              titre: `Vidéo ${q}`,
              chaine: 'Chaîne',
              vues: 90_000,
              likes: 1_000,
              commentaires: 10,
              dureeS: 40,
              publieeLe: '2026-11-01T00:00:00Z',
              description: '',
              abonnes: 2_000,
            },
          ];
        },
  lancerTravail: async (type, projetId) => void travaux.push({ type, projetId }),
});

const projet = async (camera = true) =>
  creerProjetStudio(services(), {
    auteurUid: 'sa',
    titre: 'Demandes gratuites',
    format: 'vertical',
    camera,
  });

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  appels.length = 0;
  travaux.length = 0;
  reponses = [];
  recherches = [];
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
});

describe('sujets', () => {
  it('analyse YouTube puis propose des sujets avec script', async () => {
    const id = await projet();
    reponses = [{ sujets: [sujet] }];
    const r = await proposerSujetsStudio(services(), { projetId: id, theme: 'demandes gratuites' });
    expect(r).toEqual([sujet]);
    expect(recherches).toContain('demandes gratuites');
    expect(appels[0]!.modele).toBe('claude-opus-5-5');
    expect(appels[0]!.demande).toMatch(/Vidéo demandes gratuites/);
    const p = await lireProjetStudio(db, id);
    expect(p?.sujets).toEqual([sujet]);
    expect(p?.coutCentimes).toBeGreaterThan(0);
  });

  it('les vidéos analysées sont gardées avec leurs indicateurs viraux', async () => {
    const id = await projet();
    reponses = [{ sujets: [sujet] }];
    await proposerSujetsStudio(services(), { projetId: id, theme: 'devis' });
    const t = (await lireProjetStudio(db, id))!.tendances[0]!;
    expect(t).toMatchObject({ vues: 90_000, multiplicateur: 45, engagement: 0.011 });
    expect(t.lien).toBe('https://www.youtube.com/shorts/yt-devis');
    expect(t.scoreViral).toBeGreaterThan(50);
    expect(appels[0]!.demande).toMatch(/×45\.0 abonnés/);
  });

  it('décline un sujet en plusieurs vidéos prêtes à tourner', async () => {
    const id = await projet();
    reponses = [{ sujets: [sujet] }];
    await proposerSujetsStudio(services(), { projetId: id });
    const derive = (titre: string) => ({ ...sujet, titre });
    reponses = [
      { sujets: [derive('Erreur n°1'), derive('Avant / après'), derive('Chiffre choc')] },
    ];
    const ids = await declinerSujetStudio(services(), {
      projetId: id,
      index: 0,
      nombre: 3,
      auteurUid: 'sa',
    });
    expect(ids).toHaveLength(3);
    expect(appels[1]!.demande).toMatch(/Décline-le en 3 vidéos/);
    const p = await lireProjetStudio(db, ids[1]!);
    expect(p).toMatchObject({
      titre: 'Avant / après',
      statut: 'enregistrement',
      format: 'vertical',
    });
    expect(p?.sujet?.titre).toBe('Avant / après');
    expect(await listerProjetsStudio(db)).toHaveLength(4);
  });

  it('les recherches YouTube sont gardées 24 h', async () => {
    const id = await projet();
    reponses = [{ sujets: [sujet] }, { sujets: [sujet] }];
    await proposerSujetsStudio(services(), { projetId: id, theme: 'devis' });
    await proposerSujetsStudio(services(), { projetId: id, theme: 'devis' });
    expect(recherches.filter((q) => q === 'devis')).toHaveLength(1);
  });

  it('sans clé YouTube, Claude propose quand même', async () => {
    const id = await projet();
    reponses = [{ sujets: [sujet] }];
    await proposerSujetsStudio(services({ youtube: false }), { projetId: id });
    expect(appels[0]!.demande).toMatch(/aucune donnée disponible/);
  });

  it('sans clé Claude : message clair', async () => {
    const id = await projet();
    await expect(
      proposerSujetsStudio(services({ claude: false }), { projetId: id }),
    ).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it('sans titre : celui de la vidéo choisie', async () => {
    const id = await creerProjetStudio(services(), {
      auteurUid: 'sa',
      format: 'vertical',
      camera: true,
    });
    expect((await lireProjetStudio(db, id))?.titre).toBe('Nouvelle vidéo');
    reponses = [{ sujets: [sujet] }];
    await proposerSujetsStudio(services(), { projetId: id });
    await choisirSujetStudio(services(), { projetId: id, index: 0 });
    expect((await lireProjetStudio(db, id))?.titre).toBe(sujet.titre);
  });

  it('choisir un sujet ou partir sans', async () => {
    const id = await projet();
    reponses = [{ sujets: [sujet] }];
    await proposerSujetsStudio(services(), { projetId: id });
    await choisirSujetStudio(services(), { projetId: id, index: 0 });
    expect((await lireProjetStudio(db, id))?.sujet?.titre).toBe(sujet.titre);
    expect((await lireProjetStudio(db, id))?.statut).toBe('enregistrement');
    await choisirSujetStudio(services(), { projetId: id, index: null });
    expect((await lireProjetStudio(db, id))?.sujet).toBeNull();
  });
});

describe('prise, transcription et montage', () => {
  const prise = (id: string, camera = true) =>
    priseEnregistreeStudio(services(), {
      projetId: id,
      auteurUid: 'sa',
      priseId: 'pr1',
      fichiers: {
        ecran: 'studio/sa/pr1/ecran.webm',
        ...(camera ? { camera: 'studio/sa/pr1/camera.webm' } : {}),
        voix: 'studio/sa/pr1/voix.webm',
      },
      dureeMs: 20_000,
    });

  it('la prise lance la transcription', async () => {
    const id = await projet();
    await prise(id);
    expect(travaux).toEqual([{ type: 'transcrire', projetId: id }]);
    expect((await lireProjetStudio(db, id))?.statut).toBe('transcription');
  });

  it('refuse un fichier hors de l’espace de l’auteur', async () => {
    const id = await projet();
    await expect(
      priseEnregistreeStudio(services(), {
        projetId: id,
        auteurUid: 'sa',
        priseId: 'pr1',
        fichiers: { voix: 'artisans/a1/logo/logo.png' },
        dureeMs: 20_000,
      }),
    ).rejects.toThrow(/fichier/i);
  });

  it('transcription → plan de Claude validé → captures', async () => {
    const id = await projet();
    await prise(id);
    reponses = [plan()];
    await transcriptionRecueStudio(services(), {
      projetId: id,
      mots: [
        { texte: 'Artisans,', debut: 200, fin: 700 },
        { texte: 'arrêtez', debut: 750, fin: 1_200 },
      ],
    });
    const p = await lireProjetStudio(db, id);
    expect(p?.statut).toBe('captures');
    expect(p?.plan?.plans).toHaveLength(2);
    expect(p?.version).toBe(1);
    expect(appels[0]!.demande).toMatch(/\[200-1200\] Artisans, arrêtez/);
    expect(travaux.at(-1)).toEqual({ type: 'capturer', projetId: id });
  });

  it('un plan refusé est renvoyé une fois à Claude avec les erreurs', async () => {
    const id = await projet();
    await prise(id);
    const tropLong = plan();
    tropLong.plans[1]!.source.fin = 60_000;
    reponses = [tropLong, plan()];
    await transcriptionRecueStudio(services(), { projetId: id, mots: [] });
    expect(appels).toHaveLength(2);
    expect(appels[1]!.demande).toMatch(/dépasse la fin de la prise/);
    expect((await lireProjetStudio(db, id))?.statut).toBe('captures');
  });

  it('deux refus : le projet passe en erreur, lisible', async () => {
    const id = await projet();
    await prise(id);
    reponses = ['pas du json', 'toujours pas'];
    await transcriptionRecueStudio(services(), { projetId: id, mots: [] });
    const p = await lireProjetStudio(db, id);
    expect(p?.statut).toBe('erreur');
    expect(p?.erreur).toMatch(/montage/);
  });

  it('sans capture : rendu direct', async () => {
    const id = await projet();
    await prise(id);
    reponses = [
      plan({
        captures: [],
        artisan: null,
        plans: [
          {
            id: 'p1',
            source: { debut: 0, fin: 12_000 },
            visuel: 'ecran',
            camera: 'coin',
            calques: [],
          },
        ],
      }),
    ];
    await transcriptionRecueStudio(services(), { projetId: id, mots: [] });
    expect(travaux.at(-1)).toEqual({ type: 'rendre', projetId: id });
  });

  it('prise sans caméra : Claude est prévenu et le plan doit s’y tenir', async () => {
    const id = await projet(false);
    await prise(id, false);
    reponses = [
      plan(),
      plan({
        plans: plan().plans.map((x) => ({
          ...x,
          visuel: 'ecran' as const,
          camera: 'cachee' as const,
        })),
      }),
    ];
    await transcriptionRecueStudio(services(), { projetId: id, mots: [] });
    expect(appels[0]!.demande).toMatch(/Caméra enregistrée : non/);
    expect(appels[1]!.demande).toMatch(/sans caméra/);
  });

  it('retouche : Claude reçoit le plan actuel et la demande, nouvelle version', async () => {
    const id = await projet();
    await prise(id);
    reponses = [plan(), plan({ titre: 'Version courte' })];
    await transcriptionRecueStudio(services(), { projetId: id, mots: [] });
    await genererMontageStudio(services(), { projetId: id, retouche: 'raccourcis l’accroche' });
    const p = await lireProjetStudio(db, id);
    expect(p?.version).toBe(2);
    expect(p?.plan?.titre).toBe('Version courte');
    expect(appels[1]!.demande).toMatch(/raccourcis l’accroche/);
    expect((await db.collection(`${collections.studioProjets}/${id}/versions`).get()).size).toBe(2);
  });

  it('modification à la main (format, caméra) : validée puis rendue sans Claude', async () => {
    const id = await projet();
    await prise(id);
    reponses = [plan()];
    await transcriptionRecueStudio(services(), { projetId: id, mots: [] });
    await modifierPlanStudio(services(), { projetId: id, plan: plan({ format: 'horizontal' }) });
    expect((await lireProjetStudio(db, id))?.plan?.format).toBe('horizontal');
    expect(appels).toHaveLength(1);
    await expect(
      modifierPlanStudio(services(), { projetId: id, plan: plan({ plans: [] }) }),
    ).rejects.toThrow();
  });

  it('rendu terminé, puis échec signalé par le robot', async () => {
    const id = await projet();
    await renduTermineStudio(services(), {
      projetId: id,
      fichiers: {
        video: 'studioRendus/x/v.mp4',
        srt: 'studioRendus/x/v.srt',
        miniature: 'studioRendus/x/v.jpg',
      },
      dureeMs: 14_000,
    });
    expect((await lireProjetStudio(db, id))?.statut).toBe('pret');
    await echecStudio(services(), { projetId: id, etape: 'rendre', message: 'ffmpeg : code 1' });
    const p = await lireProjetStudio(db, id);
    expect(p?.statut).toBe('erreur');
    expect(p?.erreur).toMatch(/ffmpeg/);
  });

  it('liste les projets, les plus récents d’abord', async () => {
    await projet();
    await projet();
    expect(await listerProjetsStudio(db)).toHaveLength(2);
  });
});

describe('accès au Studio', () => {
  it('recalcule les permissions de l’équipe après l’ajout du Studio', async () => {
    const { getAuth } = await import('firebase-admin/auth');
    const { recalculerPermissionsEquipe } = await import('../src/serveur/admin');
    const auth = getAuth(appAdmin());
    await auth.deleteUser('sa-studio').catch(() => undefined);
    await auth.createUser({ uid: 'sa-studio', email: 'sa-studio@exemple.fr' });
    await db.doc(`${collections.admins}/sa-studio`).set({
      role: 'superadmin',
      actif: true,
      permissionsEffectives: ['avis.lire'],
    });
    await db.doc(`${collections.admins}/com-studio`).set({
      role: 'commercial',
      actif: true,
      permissionsPlus: ['studio.utiliser'],
      permissionsEffectives: [],
    });
    await auth.deleteUser('com-studio').catch(() => undefined);
    await auth.createUser({ uid: 'com-studio', email: 'com-studio@exemple.fr' });
    const r = await recalculerPermissionsEquipe({ db, auth, horloge: () => T });
    expect(r.modifies.sort()).toEqual(['com-studio', 'sa-studio']);
    expect(
      (await db.doc(`${collections.admins}/sa-studio`).get()).get('permissionsEffectives'),
    ).toContain('studio.utiliser');
    expect((await auth.getUser('com-studio')).customClaims?.staff?.s).toContain('std');
    // Deuxième passage : rien à faire.
    expect((await recalculerPermissionsEquipe({ db, auth, horloge: () => T })).modifies).toEqual(
      [],
    );
  });
});

describe('conservation des prises', () => {
  it('supprime les prises de plus de 30 jours, garde la vidéo finie', async () => {
    const { purgerPrisesStudio } = await import('../src/serveur/studio');
    const id = await projet();
    await priseEnregistreeStudio(services(), {
      projetId: id,
      auteurUid: 'sa',
      priseId: 'pr1',
      fichiers: { ecran: 'studio/sa/pr1/ecran.webm', voix: 'studio/sa/pr1/voix.webm' },
      dureeMs: 20_000,
    });
    await renduTermineStudio(services(), {
      projetId: id,
      fichiers: {
        video: 'studioRendus/x/v.mp4',
        srt: 'studioRendus/x/v.srt',
        miniature: 'studioRendus/x/v.jpg',
      },
      dureeMs: 14_000,
    });
    const supprimes: string[] = [];
    const sup = async (c: string) => void supprimes.push(c);
    expect(await purgerPrisesStudio(db, T + 29 * 86_400_000, sup)).toEqual({ prises: 0 });
    expect(await purgerPrisesStudio(db, T + 31 * 86_400_000, sup)).toEqual({ prises: 1 });
    expect(supprimes.sort()).toEqual(['studio/sa/pr1/ecran.webm', 'studio/sa/pr1/voix.webm']);
    const p = await lireProjetStudio(db, id);
    expect(p?.prise).toBeNull();
    expect(p?.rendu?.video).toBe('studioRendus/x/v.mp4');
  });
});

describe('accès au Studio sans commande', () => {
  it('la session admin signale des permissions périmées, recalculées pour ce seul membre', async () => {
    const { getAuth } = await import('firebase-admin/auth');
    const { recalculerPermissionsMembre, verifierSessionAdmin } =
      await import('../src/serveur/admin');
    const auth = getAuth(appAdmin());
    await auth.deleteUser('sa-perime').catch(() => undefined);
    await auth.createUser({ uid: 'sa-perime', email: 'sa-perime@exemple.fr' });
    await db.doc(`${collections.admins}/sa-perime`).set({
      role: 'superadmin',
      actif: true,
      nom: 'SA',
      email: 'sa-perime@exemple.fr',
      permissionsEffectives: ['avis.lire'],
    });
    const lire = () =>
      verifierSessionAdmin(db, { uid: 'sa-perime', authentifieLe: T, maintenant: T + 1000 });
    const avant = await lire();
    expect(avant.etat === 'ok' && avant.profil.permissionsAJour).toBe(false);
    expect(await recalculerPermissionsMembre({ db, auth, horloge: () => T }, 'sa-perime')).toBe(
      true,
    );
    const apres = await lire();
    expect(apres.etat === 'ok' && apres.profil.permissionsAJour).toBe(true);
    expect(apres.etat === 'ok' && apres.profil.permissions).toContain('studio.utiliser');
  });
});

describe('voix de synthèse ElevenLabs', () => {
  it('sans clé : message clair', async () => {
    const id = await projet(false);
    await expect(
      voixSyntheseStudio(services(), {
        projetId: id,
        auteurUid: 'sa',
        texte: 'Bonjour',
        voixId: 'v1',
      }),
    ).rejects.toThrow(/ELEVENLABS_API_KEY/);
  });

  it('le MP3 devient la voix de la prise, mots horodatés : montage direct, sans transcription', async () => {
    const id = await projet(true);
    const depots: { chemin: string; type: string; taille: number }[] = [];
    const lus: string[] = [];
    const mots = [
      { texte: 'Artisans,', debut: 0, fin: 600 },
      { texte: 'écoutez.', debut: 700, fin: 1_400 },
    ];
    reponses = [
      plan({
        plans: [
          {
            id: 'p1',
            source: { debut: 0, fin: 12_000 },
            visuel: 'carton',
            carton: 'Stop',
            camera: 'cachee',
            calques: [],
          },
        ],
        sousTitres: false,
      }),
    ];
    await voixSyntheseStudio(
      {
        ...services(),
        elevenlabs: {
          voix: async () => [],
          parler: async (texte, voixId) => {
            lus.push(`${voixId}:${texte}`);
            return { audio: new Uint8Array(320_000), mots }; // 20 s à 128 kbit/s
          },
        },
        deposer: async (chemin, octets, type) =>
          void depots.push({ chemin, type, taille: octets.byteLength }),
      },
      {
        projetId: id,
        auteurUid: 'sa',
        texte: 'Artisans, écoutez.',
        voixId: 'v1',
        sousTitres: true,
      },
    );
    expect(lus).toEqual(['v1:Artisans, écoutez.']);
    expect(depots).toHaveLength(1);
    expect(depots[0]).toMatchObject({ type: 'audio/mpeg', taille: 320_000 });
    expect(depots[0]!.chemin).toMatch(/^studio\/sa\/v[a-z0-9]+\/voix\.mp3$/);
    const p = await lireProjetStudio(db, id);
    expect(p?.camera).toBe(false);
    expect(p?.prise?.fichiers).toEqual({ voix: depots[0]!.chemin });
    expect(p?.prise?.dureeMs).toBe(20_000);
    expect(p?.mots).toEqual(mots);
    expect(appels[0]!.demande).toContain('[0');
    // Le choix de l'auteur l'emporte sur celui de Claude.
    expect(p?.plan?.sousTitres).toBe(true);
    expect(travaux.map((t) => t.type)).not.toContain('transcrire');
    expect(dureeMp3Ms(16_000)).toBe(1_000);
  });

  it('ElevenLabs en panne : message lisible', async () => {
    const id = await projet(false);
    await expect(
      voixSyntheseStudio(
        {
          ...services(),
          elevenlabs: {
            voix: async () => [],
            parler: async () => {
              throw new Error('500');
            },
          },
          deposer: async () => undefined,
        },
        { projetId: id, auteurUid: 'sa', texte: 'Bonjour', voixId: 'v1' },
      ),
    ).rejects.toThrow(/Réessayez/);
  });
});

describe('idées gardées', () => {
  it('garder, retrouver sans Claude, tourner, supprimer', async () => {
    const id = await projet();
    reponses = [{ sujets: [sujet] }];
    await proposerSujetsStudio(services(), { projetId: id });
    const p = await lireProjetStudio(db, id);
    const ideeId = await garderIdeeStudio(services(), { projetId: id, index: 0, auteurUid: 'sa' });
    // Deux fois la même idée : une seule fiche.
    expect(await garderIdeeStudio(services(), { projetId: id, index: 0, auteurUid: 'sa' })).toBe(
      ideeId,
    );
    const idees = (await listerIdeesStudio(db)).filter((x) => x.id === ideeId);
    expect(idees).toHaveLength(1);
    expect(idees[0]!.sujet.titre).toBe(p!.sujets[0]!.titre);

    const avant = appels.length;
    const nouveau = await tournerIdeeStudio(services({ claude: false }), {
      ideeId,
      auteurUid: 'sa',
      format: 'carre',
      camera: false,
    });
    expect(appels.length).toBe(avant);
    const v = await lireProjetStudio(db, nouveau);
    expect(v).toMatchObject({ statut: 'enregistrement', format: 'carre', camera: false });
    expect(v?.sujet?.titre).toBe(p!.sujets[0]!.titre);
    expect((await listerIdeesStudio(db)).find((x) => x.id === ideeId)?.utilisations).toBe(1);

    await supprimerIdeeStudio(services(), { ideeId });
    expect((await listerIdeesStudio(db)).some((x) => x.id === ideeId)).toBe(false);
    await expect(
      tournerIdeeStudio(services(), { ideeId, auteurUid: 'sa', format: 'vertical', camera: false }),
    ).rejects.toThrow(/supprimée/);
  });
});

describe('séries d’épisodes', () => {
  it('épisodes numérotés ; Claude connaît la promesse et les épisodes déjà faits', async () => {
    const serieId = await creerSerieStudio(services(), {
      nom: 'Les erreurs de devis',
      promesse: 'Une erreur qui coûte cher par épisode',
      auteurUid: 'sa',
    });
    const e1 = await episodeSuivantStudio(services(), {
      serieId,
      auteurUid: 'sa',
      format: 'vertical',
      camera: false,
    });
    reponses = [{ sujets: [sujet] }];
    await proposerSujetsStudio(services(), { projetId: e1 });
    await choisirSujetStudio(services(), { projetId: e1, index: 0 });
    const e2 = await episodeSuivantStudio(services(), {
      serieId,
      auteurUid: 'sa',
      format: 'vertical',
      camera: false,
    });
    expect(await lireProjetStudio(db, e2)).toMatchObject({
      titre: 'Les erreurs de devis · épisode 2',
      serie: { id: serieId, numero: 2 },
    });
    reponses = [{ sujets: [sujet] }];
    await proposerSujetsStudio(services(), { projetId: e2 });
    const demande = appels.at(-1)!.demande;
    expect(demande).toContain('Série « Les erreurs de devis » : épisode 2');
    expect(demande).toContain(`- ${sujet.titre}`);
    expect((await listerSeriesStudio(db))[0]).toMatchObject({
      nom: 'Les erreurs de devis',
      episodes: 2,
    });
  });
});

describe('tendances Instagram', () => {
  it('Reels des hashtags suivis, gardés 7 jours, donnés à Claude et affichés', async () => {
    const id = await projet();
    const demandes: string[] = [];
    const avecInstagram = (): ServicesStudio => ({
      ...services(),
      instagram: async (h) => {
        demandes.push(h);
        return [
          {
            lien: `https://www.instagram.com/reel/${h}/`,
            legende: `Chantier #${h}`,
            likes: 900,
            commentaires: 30,
            publieeLe: '2026-11-03T09:00:00Z',
            hashtag: h,
          },
        ];
      },
    });
    reponses = [{ sujets: [sujet] }];
    await proposerSujetsStudio(avecInstagram(), { projetId: id });
    expect([...demandes].sort()).toEqual([
      'artisan',
      'artisanfrancais',
      'btp',
      'chantier',
      'renovation',
    ]);
    expect(appels.at(-1)!.demande).toContain('Reels Instagram populaires');
    expect((await lireProjetStudio(db, id))?.reels[0]).toMatchObject({
      likes: 900,
      commentaires: 30,
    });
    reponses = [{ sujets: [sujet] }];
    await proposerSujetsStudio(avecInstagram(), { projetId: id });
    expect(demandes).toHaveLength(5);
  });
});

describe('vidéo sans voix ni image', () => {
  it('pas de transcription : Claude monte directement avec cartons et captures', async () => {
    const id = await projet(false);
    reponses = [
      plan({
        plans: [
          {
            id: 'p1',
            source: { debut: 0, fin: 6_000 },
            visuel: 'carton',
            carton: 'Stop',
            camera: 'cachee',
            calques: [],
          },
          {
            id: 'p2',
            source: { debut: 6_000, fin: 20_000 },
            visuel: 'capture',
            captureId: 'c1',
            camera: 'cachee',
            calques: [],
          },
        ],
        sousTitres: false,
        musique: true,
      }),
    ];
    await sansPriseStudio(services(), { projetId: id, dureeMs: 20_000 });
    expect(appels[0]!.demande).toContain('Voix : aucune');
    // Plan trop gros pour la sortie structurée : décrit dans le contexte, pas imposé.
    expect(appels[0]!.schema).toBeUndefined();
    expect(appels[0]!.contexte).toContain('Réponds uniquement par un objet JSON');
    const p = await lireProjetStudio(db, id);
    expect(p?.prise?.fichiers).toEqual({});
    expect(p?.plan?.plans).toHaveLength(2);
    expect(p?.mots).toEqual([]);
    expect(travaux.map((t) => t.type)).not.toContain('transcrire');
  });

  it('sous-titres : le texte du script défile sur la durée, imposé au plan', async () => {
    const id = await projet(false);
    reponses = [{ sujets: [sujet] }];
    await proposerSujetsStudio(services(), { projetId: id });
    await choisirSujetStudio(services(), { projetId: id, index: 0 });
    reponses = [
      plan({
        plans: [
          {
            id: 'p1',
            source: { debut: 0, fin: 20_000 },
            visuel: 'carton',
            carton: 'Stop',
            camera: 'cachee',
            calques: [],
          },
        ],
        sousTitres: false,
      }),
    ];
    await sansPriseStudio(services(), { projetId: id, dureeMs: 20_000, sousTitres: true });
    expect(appels.at(-1)!.demande).toContain('sousTitres = true');
    const p = await lireProjetStudio(db, id);
    expect(p?.mots[0]).toMatchObject({ texte: 'Artisans,', debut: 0 });
    expect(p?.mots.at(-1)?.fin).toBe(20_000);
    expect(p?.plan?.sousTitres).toBe(true);
  });
});

describe('créativité et apprentissage', () => {
  it('cherche aussi hors bâtiment et retient les idées choisies ou ignorées', async () => {
    const a = await projet();
    reponses = [{ sujets: [sujet, { ...sujet, titre: 'Idée ignorée' }] }];
    recherches = [];
    await proposerSujetsStudio(services(), { projetId: a });
    // 4 recherches du métier + 2 hors bâtiment (puis gardées 24 h).
    expect(recherches).toHaveLength(6);
    await choisirSujetStudio(services(), { projetId: a, index: 0 });
    const b = await projet();
    reponses = [{ sujets: [sujet] }];
    await proposerSujetsStudio(services(), { projetId: b });
    const d = appels.at(-1)!.demande;
    expect(d).toContain('Hors bâtiment');
    expect(d).toContain(`Idées choisies : « ${sujet.titre} »`);
    expect(d).toContain('ignorées : « Idée ignorée »');
    expect(appels.at(-1)!.contexte).toContain('Catalogue de formats viraux');
  });
});

describe('relancer une étape', () => {
  it('refusé tant que l’étape tourne dans les temps, accepté une fois bloquée', async () => {
    const id = await projet(false);
    await db.doc(`studioProjets/${id}`).update({
      prise: { id: 'mx', fichiers: {}, dureeMs: 20_000 },
      statut: 'montage',
      updatedAt: Timestamp.fromMillis(T - 60_000),
    });
    await expect(relancerStudio(services(), { projetId: id })).rejects.toThrow(/encore en cours/);
    await db.doc(`studioProjets/${id}`).update({
      updatedAt: Timestamp.fromMillis(T - 13 * 60_000),
    });
    reponses = [
      plan({
        plans: [
          {
            id: 'p1',
            source: { debut: 0, fin: 12_000 },
            visuel: 'carton',
            carton: 'Stop',
            camera: 'cachee',
            calques: [],
          },
        ],
      }),
    ];
    await relancerStudio(services(), { projetId: id });
    const apres = await lireProjetStudio(db, id);
    expect(apres?.erreur ?? null).toBeNull();
    expect(apres?.plan?.plans).toHaveLength(1);
  });
});

describe('montage en arrière-plan', () => {
  it('l’étape passe à « montage » tout de suite ; une panne de Claude met « À relancer »', async () => {
    const id = await projet(false);
    await db.doc(`studioProjets/${id}`).update({
      prise: { id: 'mx', fichiers: {}, dureeMs: 20_000 },
      statut: 'erreur',
    });
    const taches: (() => Promise<void>)[] = [];
    const s = {
      ...services(),
      enArrierePlan: (t: () => Promise<void>) => void taches.push(t),
      claude: async () => {
        throw new Error('API indisponible');
      },
    };
    await lancerMontageStudio(s, { projetId: id });
    expect((await lireProjetStudio(db, id))?.statut).toBe('montage');
    expect(await videosEnCoursStudio(db, T)).toEqual([
      { id, titre: 'Demandes gratuites', statut: 'montage', depuis: T },
    ]);
    expect(taches).toHaveLength(1);
    await taches[0]!();
    const p = await lireProjetStudio(db, id);
    expect(p?.statut).toBe('erreur');
    // La vraie raison est montrée (ici le message de l'erreur).
    expect(p?.erreur).toBe('Claude n’a pas pu faire le montage : API indisponible');
    expect(await videosEnCoursStudio(db, T)).toEqual([
      expect.objectContaining({ id, statut: 'erreur' }),
    ]);
    // Préalables vérifiés avant de rendre la main : pas de retouche sans montage.
    await expect(lancerMontageStudio(s, { projetId: id, retouche: 'plus court' })).rejects.toThrow(
      /Aucun montage/,
    );
  });
});

describe('captures avant le montage', () => {
  const artisan = {
    nom: 'Martin Plomberie',
    metier: 'plombier',
    ville: 'Bordeaux',
    demandesParMois: 10,
    chiffreAffairesCentimes: 4_500_000,
    devisEnvoyes: 12,
    noteMoyenne: 4.8,
    nombreAvis: 37,
  };

  it('Claude prépare l’artisan et les écrans, l’auteur corrige, le robot filme', async () => {
    const id = await projet(false);
    reponses = [{ sujets: [sujet] }];
    await proposerSujetsStudio(services(), { projetId: id });
    await choisirSujetStudio(services(), { projetId: id, index: 0 });
    reponses = [{ artisan, scenes: ['fiche_publique', 'demandes_recues'] }];
    await preparerCapturesStudio(services(), { projetId: id });
    expect(appels.at(-1)!.demande).toContain(sujet.script[0]!.voix);
    expect(appels.at(-1)!.schema).toBeDefined();
    let p = await lireProjetStudio(db, id);
    expect(p?.preparation).toEqual({ artisan, scenes: ['fiche_publique', 'demandes_recues'] });
    expect(p?.coutCentimes).toBeGreaterThan(0);

    await modifierPreparationStudio(services(), {
      projetId: id,
      preparation: { artisan: { ...artisan, ville: 'Mérignac' }, scenes: ['fiche_publique'] },
    });
    await filmerCapturesStudio(services(), { projetId: id });
    p = await lireProjetStudio(db, id);
    expect(p?.statut).toBe('captures');
    expect(travaux.at(-1)).toMatchObject({ type: 'capturer', projetId: id });
    await expect(filmerCapturesStudio(services(), { projetId: id })).rejects.toThrow(/déjà/);
    await expect(
      modifierPreparationStudio(services(), { projetId: id, preparation: p!.preparation! }),
    ).rejects.toThrow(/filme/);

    // Filmées sans prise : on attend le tournage.
    await capturesTermineesStudio(services(), {
      projetId: id,
      captures: { 'c1:fiche_publique': 'studio/x/c1.webm' },
    });
    p = await lireProjetStudio(db, id);
    expect(p?.statut).toBe('enregistrement');
    expect(p?.captures).toEqual({ 'c1:fiche_publique': 'studio/x/c1.webm' });

    // Refaire une capture : l'ancienne vidéo est oubliée, le robot repart.
    await filmerCapturesStudio(services(), { projetId: id, refaire: 'fiche_publique' });
    expect((await lireProjetStudio(db, id))?.captures).toEqual({});
  });

  it('le montage réutilise la capture filmée et l’artisan préparé', async () => {
    const id = await projet(false);
    await db.doc(`studioProjets/${id}`).update({
      statut: 'captures',
      prise: { id: 'mx', fichiers: {}, dureeMs: 20_000 },
      preparation: { artisan, scenes: ['fiche_publique'] },
    });
    reponses = [
      plan({
        plans: [
          {
            id: 'p1',
            source: { debut: 0, fin: 12_000 },
            visuel: 'capture',
            captureId: 'zz',
            camera: 'cachee',
            calques: [],
          },
        ],
        captures: [{ id: 'zz', scene: 'fiche_publique' }],
        artisan: { nom: 'Autre', metier: 'maçon', ville: 'Lyon' },
      }),
    ];
    // « Claude fait tout » : les captures finies lancent le montage.
    await capturesTermineesStudio(services(), {
      projetId: id,
      captures: { 'c1:fiche_publique': 'studio/x/c1.webm' },
    });
    expect(appels.at(-1)!.demande).toContain('c1 = fiche_publique');
    expect(appels.at(-1)!.demande).toContain('Martin Plomberie');
    const p = await lireProjetStudio(db, id);
    expect(p?.plan?.captures).toEqual([{ id: 'c1', scene: 'fiche_publique' }]);
    expect(p?.plan?.plans[0]!.captureId).toBe('c1');
    expect(p?.plan?.artisan).toEqual(artisan);
    // Rien à refilmer : on passe directement au rendu.
    expect(travaux.at(-1)).toMatchObject({ type: 'rendre' });
  });

  it('monter sans captures, et pas de préparation sans script', async () => {
    const id = await projet(false);
    await expect(preparerCapturesStudio(services(), { projetId: id })).rejects.toThrow(/script/);
    // Tournage des captures raté : s'en passer efface l'erreur.
    await db.doc(`studioProjets/${id}`).update({ statut: 'erreur', erreur: 'robot absent' });
    await ignorerCapturesStudio(services(), { projetId: id });
    const p = await lireProjetStudio(db, id);
    expect(p?.statut).toBe('enregistrement');
    expect(p?.erreur).toBeNull();
    expect(p?.preparation).toMatchObject({ scenes: [], ignoree: true });
    await expect(filmerCapturesStudio(services(), { projetId: id })).rejects.toThrow(/écran/);
  });
});

describe('montage libre et bibliothèque de médias', () => {
  const media = {
    id: 'm1',
    type: 'video' as const,
    chemin: 'studio/sa/medias/m1.mp4',
    nom: 'chantier.mp4',
    dureeMs: 8_000,
    taille: 1,
  };

  it('nouveau montage sans génération, média vérifié par le serveur, frise enregistrée', async () => {
    const fichiers = new Map([
      ['studio/sa/medias/m1.mp4', { taille: 5_000_000, type: 'video/mp4' }],
    ]);
    const supprimes: string[] = [];
    const s = {
      ...services(),
      infoFichier: async (c: string) => fichiers.get(c) ?? null,
      supprimerFichier: async (c: string) => void supprimes.push(c),
    };
    const id = await creerMontageLibreStudio(s, {
      auteurUid: 'sa',
      titre: 'Chantier',
      format: 'carre',
    });
    let p = await lireProjetStudio(db, id);
    expect(p).toMatchObject({ libre: true, sujet: null, format: 'carre' });
    expect(p?.frise?.pistes.map((x) => x.nom)).toEqual(['Effets', 'Vidéo 1', 'Audio 1']);

    // Taille et type relus côté serveur (la taille annoncée par le navigateur est ignorée).
    const lu = await ajouterMediaStudio(s, { projetId: id, auteurUid: 'sa', media });
    expect(lu.taille).toBe(5_000_000);
    await expect(ajouterMediaStudio(s, { projetId: id, auteurUid: 'sa', media })).rejects.toThrow(
      /déjà/,
    );
    await expect(
      ajouterMediaStudio(s, { projetId: id, auteurUid: 'autre', media }),
    ).rejects.toThrow(/invalide/);
    await expect(
      ajouterMediaStudio(s, {
        projetId: id,
        auteurUid: 'sa',
        media: { ...media, id: 'm2', chemin: 'studio/sa/medias/m2.mp4' },
      }),
    ).rejects.toThrow(/pas arrivé/);
    fichiers.set('studio/sa/medias/m3.mp3', { taille: 10, type: 'video/mp4' });
    await expect(
      ajouterMediaStudio(s, {
        projetId: id,
        auteurUid: 'sa',
        media: { ...media, id: 'm3', type: 'audio', chemin: 'studio/sa/medias/m3.mp3' },
      }),
    ).rejects.toThrow(/inattendu/);

    p = await lireProjetStudio(db, id);
    const f = p!.frise!;
    const v1 = f.pistes.find((x) => x.type === 'video')!;
    const frise = {
      ...f,
      pistes: f.pistes.map((x) =>
        x.id === v1.id
          ? {
              ...x,
              clips: [
                {
                  id: 'k1',
                  debut: 0,
                  duree: 4_000,
                  source: { type: 'media', mediaId: 'm1', debutSource: 0 },
                },
              ],
            }
          : x,
      ),
    };
    // Un réglage retiré arrive en `undefined` : il est enlevé avant l'écriture.
    await enregistrerFriseStudio(s, { projetId: id, frise: { ...frise, miniature: undefined } });
    expect(
      (await lireProjetStudio(db, id))?.frise?.pistes.find((x) => x.id === v1.id)?.clips,
    ).toHaveLength(1);
    // Un média inventé ou grossi par le navigateur est refusé ; la taille du serveur est gardée.
    await expect(
      enregistrerFriseStudio(s, {
        projetId: id,
        frise: { ...frise, medias: [{ ...media, chemin: 'studio/sa/medias/x.mp4' }] },
      }),
    ).rejects.toThrow(/inconnu/);
    await enregistrerFriseStudio(s, {
      projetId: id,
      frise: { ...frise, medias: [{ ...lu, taille: 1 }] },
    });
    expect((await lireProjetStudio(db, id))?.frise?.medias[0]?.taille).toBe(5_000_000);
    await expect(enregistrerFriseStudio(s, { projetId: id, frise: { titre: '' } })).rejects.toThrow(
      /invalide/,
    );

    // Fabriquer : frise enregistrée puis rendu ; une capture pas encore filmée passe d'abord
    // par le robot ; une fois filmée, le projet libre enchaîne le rendu.
    travaux.length = 0;
    await fabriquerFriseStudio(s, { projetId: id, frise: { ...frise, medias: [lu] } });
    expect(travaux).toEqual([{ type: 'rendre', projetId: id }]);
    expect((await lireProjetStudio(db, id))?.statut).toBe('rendu');
    await fabriquerFriseStudio(s, {
      projetId: id,
      frise: { ...frise, medias: [lu], captures: [{ id: 'c1', scene: 'fiche_publique' }] },
    });
    expect(travaux.at(-1)).toEqual({ type: 'capturer', projetId: id });
    expect((await lireProjetStudio(db, id))?.statut).toBe('captures');
    await capturesTermineesStudio(s, {
      projetId: id,
      captures: { 'c1:fiche_publique': 'studioRendus/x/c1.mp4' },
    });
    expect(travaux.at(-1)).toEqual({ type: 'rendre', projetId: id });
    // « Filmer maintenant » depuis le Studio : le robot filme, puis on revient à l'état d'avant.
    await db.doc(`${collections.studioProjets}/${id}`).update({ statut: 'enregistrement' });
    travaux.length = 0;
    await filmerEcransStudio(s, {
      projetId: id,
      frise: { ...frise, medias: [lu], captures: [{ id: 'c2', scene: 'demandes_recues' }] },
    });
    expect(travaux).toEqual([{ type: 'capturer', projetId: id }]);
    expect((await lireProjetStudio(db, id))?.statut).toBe('captures');
    await expect(
      filmerEcransStudio(s, { projetId: id, frise: { ...frise, medias: [lu] } }),
    ).rejects.toThrow(/déjà/);
    await capturesTermineesStudio(s, {
      projetId: id,
      captures: { 'c2:demandes_recues': 'studioRendus/x/c2.mp4' },
    });
    expect(travaux).toHaveLength(1);
    expect(await lireProjetStudio(db, id)).toMatchObject({
      statut: 'enregistrement',
      apresCaptures: null,
    });
    await expect(
      filmerEcransStudio(s, {
        projetId: id,
        frise: { ...frise, medias: [lu], captures: [{ id: 'c2', scene: 'demandes_recues' }] },
      }),
    ).rejects.toThrow(/déjà filmés/);
    // « Refilmer tous les écrans » : les vidéos de la frise sont oubliées puis refaites.
    await filmerEcransStudio(s, {
      projetId: id,
      frise: { ...frise, medias: [lu], captures: [{ id: 'c2', scene: 'demandes_recues' }] },
      refaire: true,
    });
    expect(travaux.at(-1)).toEqual({ type: 'capturer', projetId: id });
    expect((await lireProjetStudio(db, id))?.captures['c2:demandes_recues']).toBeUndefined();
    await capturesTermineesStudio(s, {
      projetId: id,
      captures: { 'c2:demandes_recues': 'studioRendus/x/c2b.mp4' },
    });
    const vide = { ...frise, medias: [lu], pistes: frise.pistes.map((x) => ({ ...x, clips: [] })) };
    await expect(fabriquerFriseStudio(s, { projetId: id, frise: vide })).rejects.toThrow(/vide/);

    // Projet monté par Claude : la frise vient du plan tant qu'on ne l'a pas retouchée ; un
    // nouveau plan (nouvelle version) la remplace, les médias importés restent.
    const pp = (await lireProjetStudio(db, id))!;
    const genere = {
      ...pp,
      libre: false,
      plan: plan(),
      version: 2,
      prise: { id: 'pr1', fichiers: { voix: 'studio/sa/v.webm' }, dureeMs: 20_000 },
    };
    expect(friseActive(genere)).toBe(false);
    expect(friseDuProjet(genere).medias).toEqual([lu]);
    expect(friseDuProjet(genere).pistes.some((x) => x.clips.length)).toBe(true);
    expect(friseActive({ ...genere, friseVersion: 2 })).toBe(true);
    expect(friseDuProjet({ ...genere, friseVersion: 2 })).toEqual(genere.frise);
    expect(friseDuProjet({ ...genere, plan: null, frise: null }).pistes).toHaveLength(3);

    // Supprimer le projet supprime ses médias.
    await supprimerProjetStudio(s, { projetId: id });
    expect(await lireProjetStudio(db, id)).toBeNull();
    expect(supprimes).toEqual(['studio/sa/medias/m1.mp4']);
  });
});
