import { formatNombre } from '@ph/core/format';
import type { ProjetStudio } from '@ph/firebase/studio';

/** Reels Instagram analysés (sans vues : Instagram ne les donne que pour vos propres vidéos). */
export function ListeReels({ reels }: { reels: ProjetStudio['reels'] }) {
  return (
    <details className="rounded-card bg-neutre-100 px-4 py-1 open:pb-4">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
        Reels Instagram populaires ({reels.length})
      </summary>
      <ul className="m-0 grid list-none gap-2 p-0 text-sm">
        {reels.map((r) => (
          <li key={r.lien} className="border-t border-trait pt-2">
            <a href={r.lien} target="_blank" rel="noopener noreferrer">
              #{r.hashtag} · {r.legende || 'Reel'} ↗
            </a>
            <span className="block text-neutre-700">
              {r.likes !== null ? `${formatNombre(r.likes)} j’aime · ` : ''}
              {formatNombre(r.commentaires)} commentaires
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
