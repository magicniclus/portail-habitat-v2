import Anthropic from '@anthropic-ai/sdk';
import type { UsageIa } from '@ph/core/ia';

/**
 * Appel à Claude pour le Studio : Opus 5.5, réflexion adaptative (effort élevé : la qualité du
 * script et du montage fait les vues), sortie JSON imposée, images facultatives (caméra). En
 * flux pour les longues réponses. Repli serveur automatique si le modèle décline.
 */
export interface AppelStudio {
  modele: string;
  systeme: string;
  contexte: string;
  demande: string;
  schema: Record<string, unknown>;
  images?: readonly { type: 'image/jpeg' | 'image/png'; base64: string }[];
  maxTokens?: number;
}
export interface ReponseStudio {
  texte: string;
  usage: UsageIa;
  refus: boolean;
}
export type ClientStudio = (a: AppelStudio) => Promise<ReponseStudio>;

export function clientClaudeStudio(apiKey: string): ClientStudio {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 600_000 });
  return async (a) => {
    const flux = client.beta.messages.stream({
      model: a.modele,
      max_tokens: a.maxTokens ?? 32_000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      system: [
        { type: 'text', text: a.systeme },
        { type: 'text', text: a.contexte, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: [
            ...(a.images ?? []).map((i) => ({
              type: 'image' as const,
              source: { type: 'base64' as const, media_type: i.type, data: i.base64 },
            })),
            { type: 'text' as const, text: a.demande },
          ],
        },
      ],
      output_config: { effort: 'high', format: { type: 'json_schema', schema: a.schema } },
    });
    const r = await flux.finalMessage();
    return {
      texte: r.content.map((b) => (b.type === 'text' ? b.text : '')).join(''),
      refus: r.stop_reason === 'refusal',
      usage: {
        entree: r.usage.input_tokens,
        sortie: r.usage.output_tokens,
        cacheEcrit: r.usage.cache_creation_input_tokens ?? 0,
        cacheLu: r.usage.cache_read_input_tokens ?? 0,
      },
    };
  };
}
