import type { PlanMontage, SujetStudio } from '@ph/core/studio';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
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

  it('le MP3 devient la voix de la prise, sans écran ni caméra, puis transcription', async () => {
    const id = await projet(true);
    const depots: { chemin: string; type: string; taille: number }[] = [];
    const lus: string[] = [];
    await voixSyntheseStudio(
      {
        ...services(),
        elevenlabs: {
          voix: async () => [],
          parler: async (texte, voixId) => {
            lus.push(`${voixId}:${texte}`);
            return new Uint8Array(320_000); // 20 s à 128 kbit/s
          },
        },
        deposer: async (chemin, octets, type) =>
          void depots.push({ chemin, type, taille: octets.byteLength }),
      },
      { projetId: id, auteurUid: 'sa', texte: 'Artisans, écoutez.', voixId: 'v1' },
    );
    expect(lus).toEqual(['v1:Artisans, écoutez.']);
    expect(depots).toHaveLength(1);
    expect(depots[0]).toMatchObject({ type: 'audio/mpeg', taille: 320_000 });
    expect(depots[0]!.chemin).toMatch(/^studio\/sa\/v[a-z0-9]+\/voix\.mp3$/);
    const p = await lireProjetStudio(db, id);
    expect(p?.statut).toBe('transcription');
    expect(p?.camera).toBe(false);
    expect(p?.prise?.fichiers).toEqual({ voix: depots[0]!.chemin });
    expect(p?.prise?.dureeMs).toBe(20_000);
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
