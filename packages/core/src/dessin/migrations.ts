import { echec, succes, type Resultat } from '../resultat';
import { scene, SCENE_VERSION, type Scene } from '../schemas/dessinScene';

/**
 * Lecture d'une scène enregistrée (DESSIN.md §3) : migration vers la version courante,
 * puis validation complète. Une migration par version : `MIGRATIONS[v]` passe de v à v + 1.
 */
const MIGRATIONS: Record<number, (s: Record<string, unknown>) => Record<string, unknown>> = {};

export function migrerScene(brut: unknown): Resultat<Scene> {
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut))
    return echec('ENTREE_INVALIDE', { message: 'Plan illisible.' });
  let s = brut as Record<string, unknown>;
  const version = s.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
    return echec('ENTREE_INVALIDE', { message: 'Version du plan inconnue.' });
  if (version > SCENE_VERSION)
    return echec('PRECONDITION', {
      message: 'Ce plan a été créé avec une version plus récente. Rechargez la page.',
    });
  for (let v = version; v < SCENE_VERSION; v++) s = MIGRATIONS[v]!(s);
  const r = scene.safeParse(s);
  if (!r.success)
    return echec('ENTREE_INVALIDE', { message: r.error.issues[0]?.message ?? 'Plan invalide.' });
  return succes(r.data);
}

/** Scène vide : un rez-de-chaussée de 2,50 m sous plafond. */
export const nouvelleScene = (nouvelId: (prefixe: string) => string): Scene =>
  scene.parse({
    version: SCENE_VERSION,
    niveaux: [{ id: nouvelId('n'), nom: 'Rez-de-chaussée', type: 'rdc', altitude: 0 }],
  });
