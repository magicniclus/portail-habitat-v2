import Anthropic from '@anthropic-ai/sdk';
import type { UsageIa } from '@ph/core/ia';

/**
 * Appel au modèle (IA_ADMIN §3) : un seul appel, sans boucle d'outils. Le prompt système et le
 * contexte forment un préfixe stable mis en cache ; seule la demande varie.
 */
export interface AppelIa {
  modele: string;
  systeme: string;
  contexte: string;
  demande: string;
  schema: Record<string, unknown>;
  maxTokens: number;
}
export interface ReponseIa {
  texte: string;
  usage: UsageIa;
  /** Le modèle a décliné (stop_reason « refusal ») : aucune sortie exploitable. */
  refus: boolean;
}
export type ClientIa = (a: AppelIa) => Promise<ReponseIa>;

/** Client réel : `ANTHROPIC_API_KEY` vient du gestionnaire de secrets, jamais du navigateur. */
export function clientAnthropic(apiKey: string): ClientIa {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
  return async (a) => {
    // Sonnet 5.5 : repli serveur automatique si le modèle décline (fallbacks « default »).
    const repli = a.modele === 'claude-sonnet-5-5';
    const r = await client.beta.messages.create({
      model: a.modele,
      max_tokens: a.maxTokens,
      ...(repli ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
      system: [
        { type: 'text', text: a.systeme },
        { type: 'text', text: a.contexte, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: a.demande }],
      output_config: { format: { type: 'json_schema', schema: a.schema } },
    });
    const texte = r.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    return {
      texte,
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
