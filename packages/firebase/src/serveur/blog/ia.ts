import {
  creditsArticlesMois,
  lireSortieBlog,
  messageIaBlog,
  MODELE_IA_BLOG,
  PROMPT_SYSTEME_IA_BLOG,
  SCHEMAS_IA_BLOG,
  VERSION_PROMPT_IA_BLOG,
  type DemandeIaBlog,
  type SortieIaBlog,
} from '@ph/core/blog';
import { ErreurMetier } from '@ph/core/erreurs';
import { coutCentimes } from '@ph/core/ia';
import type { Formule } from '@ph/core/paiements';
import { modererDemandeIa } from '@ph/core/sites';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import type { ClientIa } from '../ia/client';
import type { ContexteSite } from '../sites/edition';
import { sourcesFiche } from '../sites/ia';
import { exigerBlog, moisParis, sitePro, type ServicesBlog } from './acces';

export interface ServicesIaBlog extends ServicesBlog {
  /** `null` sans clé Anthropic : refus propre, aucun crédit consommé. */
  client: ClientIa | null;
}

export type PropositionIaBlog = SortieIaBlog & {
  avertissements: string[];
  /** Rédactions restantes ce mois-ci. */
  restant: number;
};

/**
 * Demande à l'IA du blog (BLOG §2) : filtre de modération, droits revérifiés ; la rédaction
 * complète réserve un crédit du mois (5 ou 15, BLOG-02) rendu en cas d'échec ; les retouches ne
 * décomptent rien (BLOG-03). Faits non sourcés remplacés ; rien n'est écrit dans l'article.
 */
export async function demanderIaBlog(
  s: ServicesIaBlog,
  ctx: ContexteSite,
  e: DemandeIaBlog,
): Promise<PropositionIaBlog> {
  const moderation = modererDemandeIa(`${e.sujet ?? ''}\n${e.article.titre}`);
  if (!moderation.ok) throw new ErreurMetier('ENTREE_INVALIDE', moderation.message);
  if (!s.client)
    throw new ErreurMetier('INDISPONIBLE', 'L’assistant du blog n’est pas encore disponible.');
  const client = s.client;
  const ref = s.db.doc(chemins.compteurIaSite(ctx.artisanId, moisParis(s.horloge())));
  const redaction = e.action === 'rediger';
  const { utilises, max } = await s.db.runTransaction(async (t) => {
    await exigerBlog(s, t, ctx);
    const [artisan, c] = await Promise.all([
      t.get(s.db.doc(chemins.artisan(ctx.artisanId))),
      t.get(ref),
    ]);
    const d = artisan.get('droits') as { formule?: Formule; sitePro?: boolean } | undefined;
    const max = creditsArticlesMois({ formule: d?.formule ?? 'gratuit', sitePro: sitePro(d) });
    const n = (c.get('blogArticles') as number | undefined) ?? 0;
    if (redaction && n >= max)
      throw new ErreurMetier(
        'TROP_DE_REQUETES',
        `Vous avez utilisé vos ${max} articles rédigés par l’IA ce mois-ci. Vous pouvez toujours écrire vous-même ; titres, descriptions et tags restent disponibles.`,
      );
    if (redaction)
      t.set(ref, { schemaVersion: 1, blogArticles: FieldValue.increment(1) }, { merge: true });
    return { utilises: redaction ? n + 1 : n, max };
  });
  const rendre = () =>
    redaction ? ref.set({ blogArticles: FieldValue.increment(-1) }, { merge: true }) : null;
  try {
    const fiche = await sourcesFiche({ ...s, domaineBase: '' }, ctx.artisanId);
    const sources = `${fiche}\n${e.sujet ?? ''}\n${e.article.titre}\n${e.article.meta}\n${e.article.corps}`;
    const modele = MODELE_IA_BLOG[e.action];
    let demande = messageIaBlog(e);
    let cout = 0;
    for (let essai = 0; essai < 2; essai++) {
      const r = await client({
        modele,
        systeme: PROMPT_SYSTEME_IA_BLOG,
        contexte: `Fiche vérifiée de l'artisan :\n${fiche}`,
        demande,
        schema: SCHEMAS_IA_BLOG[e.action],
        maxTokens: redaction ? 12_000 : 2_000,
      });
      cout += coutCentimes(modele, r.usage);
      if (r.refus) break;
      const lu = lireSortieBlog(e.action, r.texte, sources);
      if (lu.ok) {
        await s.db.collection(chemins.sessionsIaSite(ctx.artisanId)).add({
          schemaVersion: 1,
          uid: ctx.uid,
          mode: `blog.${e.action}`,
          portee: 'blog',
          demande: (e.sujet ?? '').slice(0, 2000),
          resume: e.action,
          question: '',
          operations: [],
          avertissements: lu.avertissements,
          modele,
          versionPrompt: VERSION_PROMPT_IA_BLOG,
          coutCentimes: cout,
          createdAt: Timestamp.fromMillis(s.horloge()),
        });
        const { ok: _ok, ...p } = lu;
        return { ...p, restant: Math.max(0, max - utilises) } as PropositionIaBlog;
      }
      demande = `${messageIaBlog(e)}\n\nTa réponse précédente a été refusée : ${lu.erreur} Respecte exactement le format.`;
    }
    throw new ErreurMetier('INDISPONIBLE', 'L’IA n’a pas pu répondre. Réessayez.');
  } catch (err) {
    await rendre();
    throw err;
  }
}
