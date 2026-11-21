import { ErreurMetier } from '@ph/core/erreurs';
import { slugifier } from '@ph/core/format';
import { FieldValue } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import type { ContexteSite } from '../sites/edition';
import { exigerBlog, type ServicesBlog } from './acces';

export type ActionCategorie =
  | { action: 'creer'; nom: string }
  | { action: 'renommer'; id: string; nom: string }
  | { action: 'ordonner'; ids: string[] }
  | { action: 'supprimer'; id: string };

/**
 * Catégories (BLOG §5) : l'article garde l'identifiant, un renommage s'applique donc partout
 * sans copie ; l'ordre est celui des onglets du blog ; suppression refusée si la catégorie sert.
 */
export async function gererCategorie(
  s: ServicesBlog,
  ctx: ContexteSite,
  e: ActionCategorie,
): Promise<{ id?: string }> {
  const col = s.db.collection(chemins.categoriesBlog(ctx.artisanId));
  return s.db.runTransaction(async (t) => {
    await exigerBlog(s, t, ctx);
    const toutes = await t.get(col);
    const slugPris = (slug: string, sauf?: string) =>
      toutes.docs.some((d) => d.id !== sauf && d.get('slug') === slug);
    if (e.action === 'creer' || e.action === 'renommer') {
      const slug = slugifier(e.nom) || 'categorie';
      if (slugPris(slug, e.action === 'renommer' ? e.id : undefined))
        throw new ErreurMetier('CONFLIT', 'Une catégorie porte déjà ce nom.');
      if (e.action === 'creer') {
        if (toutes.size >= 50) throw new ErreurMetier('ENTREE_INVALIDE', '50 catégories au plus.');
        const ref = col.doc();
        t.create(ref, { schemaVersion: 1, nom: e.nom, slug, ordre: toutes.size });
        return { id: ref.id };
      }
      const d = toutes.docs.find((x) => x.id === e.id);
      if (!d) throw new ErreurMetier('INTROUVABLE');
      t.update(d.ref, { nom: e.nom, slug });
      return { id: e.id };
    }
    if (e.action === 'ordonner') {
      const ids = toutes.docs.map((d) => d.id);
      if (e.ids.length !== ids.length || !ids.every((x) => e.ids.includes(x)))
        throw new ErreurMetier('CONFLIT', 'La liste des catégories a changé. Rechargez la page.');
      e.ids.forEach((id, ordre) => t.update(col.doc(id), { ordre }));
      return {};
    }
    const d = toutes.docs.find((x) => x.id === e.id);
    if (!d) throw new ErreurMetier('INTROUVABLE');
    const utilisee = await t.get(
      s.db
        .collection(chemins.articlesBlog(ctx.artisanId))
        .where('categorieId', '==', e.id)
        .limit(1),
    );
    if (!utilisee.empty)
      throw new ErreurMetier(
        'PRECONDITION',
        'Cette catégorie contient des articles : déplacez-les avant de la supprimer.',
      );
    t.delete(d.ref);
    return {};
  });
}

export type ActionTag = { action: 'creer'; nom: string } | { action: 'supprimer'; id: string };

/** Tags (BLOG §5) : supprimer un tag le retire de tous les articles. */
export async function gererTag(
  s: ServicesBlog,
  ctx: ContexteSite,
  e: ActionTag,
): Promise<{ id?: string }> {
  const col = s.db.collection(chemins.tagsBlog(ctx.artisanId));
  return s.db.runTransaction(async (t) => {
    await exigerBlog(s, t, ctx);
    if (e.action === 'creer') {
      const slug = slugifier(e.nom) || 'tag';
      const tous = await t.get(col);
      const existant = tous.docs.find((d) => d.get('slug') === slug);
      if (existant) return { id: existant.id };
      if (tous.size >= 200) throw new ErreurMetier('ENTREE_INVALIDE', '200 tags au plus.');
      const ref = col.doc();
      t.create(ref, { schemaVersion: 1, nom: e.nom, slug });
      return { id: ref.id };
    }
    const avec = await t.get(
      s.db.collection(chemins.articlesBlog(ctx.artisanId)).where('tags', 'array-contains', e.id),
    );
    for (const a of avec.docs) t.update(a.ref, { tags: FieldValue.arrayRemove(e.id) });
    t.delete(col.doc(e.id));
    return {};
  });
}
