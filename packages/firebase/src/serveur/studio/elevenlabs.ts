/**
 * Voix de synthèse ElevenLabs (clé `ELEVENLABS_API_KEY`, côté serveur uniquement) : lit le script
 * quand l'auteur ne veut pas enregistrer sa voix. Sortie MP3 44,1 kHz à 128 kbit/s constants, ce
 * qui donne la durée sans décoder le fichier.
 */
export interface VoixElevenLabs {
  id: string;
  nom: string;
}

export interface ClientElevenLabs {
  voix: () => Promise<VoixElevenLabs[]>;
  parler: (texte: string, voixId: string) => Promise<Uint8Array>;
}

const API = 'https://api.elevenlabs.io/v1';
/** Modèle multilingue : bon français, intonation naturelle. */
const MODELE = 'eleven_multilingual_v2';
const DEBIT_KBPS = 128;

/** Durée d'un MP3 à débit constant de 128 kbit/s, en millisecondes. */
export const dureeMp3Ms = (octets: number) => Math.round((octets * 8) / DEBIT_KBPS);

export function clientElevenLabs(cle: string, f: typeof fetch = fetch): ClientElevenLabs {
  const entetes = { 'xi-api-key': cle };
  return {
    voix: async () => {
      const r = await f(`${API}/voices`, {
        headers: entetes,
        signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) throw new Error(`ElevenLabs : liste des voix refusée (${r.status}).`);
      const d = (await r.json()) as { voices?: { voice_id?: string; name?: string }[] };
      return (d.voices ?? [])
        .filter((v): v is { voice_id: string; name: string } => Boolean(v.voice_id && v.name))
        .map((v) => ({ id: v.voice_id, nom: v.name }));
    },
    parler: async (texte, voixId) => {
      const r = await f(
        `${API}/text-to-speech/${encodeURIComponent(voixId)}?output_format=mp3_44100_${DEBIT_KBPS}`,
        {
          method: 'POST',
          headers: { ...entetes, 'content-type': 'application/json', accept: 'audio/mpeg' },
          body: JSON.stringify({ text: texte, model_id: MODELE }),
          signal: AbortSignal.timeout(120_000),
        },
      );
      if (!r.ok) throw new Error(`ElevenLabs : voix refusée (${r.status}).`);
      return new Uint8Array(await r.arrayBuffer());
    },
  };
}
