import 'server-only';
import { appAdmin, bucketFichiers } from '@ph/firebase/admin';
import {
  clientClaudeStudio,
  clientElevenLabs,
  echecStudio,
  rechercheYoutube,
  type ServicesStudio,
  type TravailStudio,
} from '@ph/firebase/studio';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Services du Studio côté site : Claude (ANTHROPIC_API_KEY), YouTube (YOUTUBE_API_KEY), ElevenLabs
 * (ELEVENLABS_API_KEY, voix de synthèse) et le robot de rendu (STUDIO_RENDU_URL + STUDIO_RENDU_CLE). Clés côté serveur uniquement.
 */
export function servicesStudio(env: NodeJS.ProcessEnv = process.env): ServicesStudio {
  const db = getFirestore(appAdmin());
  const s: ServicesStudio = {
    db,
    horloge: Date.now,
    claude: env.ANTHROPIC_API_KEY ? clientClaudeStudio(env.ANTHROPIC_API_KEY) : null,
    youtube: env.YOUTUBE_API_KEY ? rechercheYoutube(env.YOUTUBE_API_KEY) : null,
    elevenlabs: env.ELEVENLABS_API_KEY ? clientElevenLabs(env.ELEVENLABS_API_KEY) : null,
    deposer: async (chemin, octets, type) =>
      bucketFichiers(env).file(chemin).save(Buffer.from(octets), { contentType: type }),
    lancerTravail: async (type, projetId) => {
      const echec = (message: string) => echecStudio(s, { projetId, etape: type, message });
      if (!env.STUDIO_RENDU_URL || !env.STUDIO_RENDU_CLE)
        return echec(
          'le robot de rendu n’est pas configuré (STUDIO_RENDU_URL et STUDIO_RENDU_CLE manquants).',
        );
      try {
        const r = await fetch(new URL('/travail', env.STUDIO_RENDU_URL), {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-studio-cle': env.STUDIO_RENDU_CLE },
          body: JSON.stringify({ type, projetId } satisfies {
            type: TravailStudio;
            projetId: string;
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!r.ok) await echec(`le robot de rendu a répondu ${r.status}.`);
      } catch {
        await echec('le robot de rendu ne répond pas.');
      }
    },
  };
  return s;
}
