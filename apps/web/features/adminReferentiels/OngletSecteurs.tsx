import { appAdmin } from '@ph/firebase/admin';
import { listerPagesSecteurAdmin } from '@ph/firebase/pages-secteur';
import { Badge } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Route } from 'next';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { ActionsSecteur } from './ActionsSecteur';

const ETATS = {
  pret: ['succes', 'Texte IA publié'],
  absent: ['neutre', 'Texte des données'],
  echec: ['attention', 'Texte IA refusé'],
} as const;

/**
 * Pages de secteur « métier à une commune » (SEO local) : créées à l'arrivée des artisans,
 * indexées dès un artisan du secteur. L'admin voit l'état de chacune, peut la bloquer (jamais
 * indexée) ou faire réécrire son texte IA ; chaque opération est motivée et journalisée.
 */
export async function OngletSecteurs({ peut }: { peut: boolean }) {
  const pages = await listerPagesSecteurAdmin(getFirestore(appAdmin()));
  const indexees = pages.filter((p) => p.indexable).length;
  return (
    <section aria-label="Pages de secteur" className="grid gap-3">
      <p className="m-0 text-sm text-neutre-800">
        {pages.length} page{pages.length > 1 ? 's' : ''} au registre, {indexees} indexée
        {indexees > 1 ? 's' : ''}. Une page n’est indexée que si au moins un artisan du métier
        intervient à 20 km ; sans artisan, elle reste consultable en « noindex ».
      </p>
      <ul className="m-0 grid list-none gap-0 p-0">
        {pages.map((p) => {
          const [ton, etat] = ETATS[p.texteEtat];
          return (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-trait py-3"
            >
              <span className="grid gap-0.5">
                <Link
                  href={routes.metierVille(p.metier, p.commune.slug) as Route}
                  className="font-semibold"
                >
                  {p.metier} · {p.commune.nom} ({p.commune.codePostal})
                </Link>
                <span className="text-[13px] text-neutre-700">
                  {p.nbArtisans} artisan{p.nbArtisans > 1 ? 's' : ''} · {etat}
                  {p.texteErreur ? ` : ${p.texteErreur}` : ''}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <Badge tone={p.bloquee ? 'danger' : p.indexable ? 'succes' : 'neutre'}>
                  {p.bloquee ? 'Bloquée' : p.indexable ? 'Indexée' : 'Non indexée'}
                </Badge>
                <Badge tone={ton}>{etat}</Badge>
                <ActionsSecteur id={p.id} bloquee={p.bloquee} peut={peut} />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
