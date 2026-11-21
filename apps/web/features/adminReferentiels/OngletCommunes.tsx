import { appAdmin } from '@ph/firebase/admin';
import { lireTexteCommune } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import type { Route } from 'next';
import Link from 'next/link';
import { COMMUNES } from '@/features/diagnostic/communes';
import { routes } from '@/lib/routes';
import { EditeurCommune } from './EditeurCommune';

/** Référentiels › Pages communes (ADMIN §2.9) : textes SEO des 11 pages diagnostic. */
export async function OngletCommunes({ slug, peut }: { slug: string | undefined; peut: boolean }) {
  const choisie = COMMUNES.find((c) => c.slug === slug) ?? COMMUNES[0]!;
  const texte = await lireTexteCommune(getFirestore(appAdmin()), choisie.slug);
  const source = texte ?? choisie;
  // Seuls les champs éditables : l'entrée du serveur est stricte.
  const initial = {
    intro: source.intro,
    bati: source.bati,
    secteurs: source.secteurs,
    risques: source.risques,
    frequents: source.frequents,
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
      <ul aria-label="Communes" className="m-0 grid list-none content-start gap-1 p-0">
        {COMMUNES.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/admin/referentiels?onglet=communes&commune=${c.slug}` as Route}
              aria-current={c.slug === choisie.slug ? 'page' : undefined}
              className="flex min-h-11 items-center rounded-md px-3 text-texte no-underline hover:bg-neutre-100 aria-[current=page]:bg-neutre-100 aria-[current=page]:font-bold"
            >
              {c.nom} ({c.cp})
            </Link>
          </li>
        ))}
      </ul>
      <section
        aria-labelledby="commune-titre"
        className="grid content-start gap-3 rounded-card border border-trait bg-blanc p-4"
      >
        <h2 id="commune-titre" className="m-0 text-lg">
          {choisie.nom}{' '}
          <Link href={routes.diagnosticCommune(choisie.slug)} className="text-sm font-normal">
            Voir la page
          </Link>
        </h2>
        <EditeurCommune
          key={`${choisie.slug}-${texte?.version ?? 0}`}
          slug={choisie.slug}
          nom={choisie.nom}
          version={texte?.version ?? 0}
          initial={initial}
          peut={peut}
        />
      </section>
    </div>
  );
}
