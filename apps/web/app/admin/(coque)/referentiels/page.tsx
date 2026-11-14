import { appAdmin } from '@ph/firebase/admin';
import {
  lireFlagsAdmin,
  lirePrixPrestationAdmin,
  listerPrestationsAdmin,
} from '@ph/firebase/admin-serveur';
import { Badge } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { EditeurPrixPrestation } from '@/features/adminReferentiels/EditeurPrixPrestation';
import { FlagsAdmin } from '@/features/adminReferentiels/FlagsAdmin';
import { OngletCommunes } from '@/features/adminReferentiels/OngletCommunes';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Référentiels' };

type Params = Promise<Record<string, string | undefined>>;
const ONGLETS = [
  ['prestations', 'Prestations du simulateur'],
  ['communes', 'Pages communes'],
  ['configuration', 'Configuration'],
] as const;

/** Maquette « Admin Referentiels » (ADMIN §2.9) : prix des prestations, fonctionnalités. */
export default async function ReferentielsAdmin({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const s = await pageAdmin('/admin/referentiels', 'referentiels');
  const db = getFirestore(appAdmin());
  const onglet = p.onglet === 'configuration' || p.onglet === 'communes' ? p.onglet : 'prestations';
  const peut = s.role !== 'lecture' && s.permissions.includes('referentiels.modifier');
  const [prestations, prix, flags] = await Promise.all([
    onglet === 'prestations' ? listerPrestationsAdmin(db) : [],
    onglet === 'prestations' && p.id ? lirePrixPrestationAdmin(db, p.id) : null,
    onglet === 'configuration' ? lireFlagsAdmin(db) : [],
  ]);
  const choisie = prestations.find((x) => x.id === p.id);
  return (
    <main className="grid content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Référentiels</h1>
      <nav aria-label="Onglets" className="flex flex-wrap gap-1 border-b border-trait">
        {ONGLETS.map(([id, nom]) => (
          <Link
            key={id}
            href={`/admin/referentiels?onglet=${id}` as Route}
            aria-current={id === onglet ? 'page' : undefined}
            className="flex min-h-11 items-center border-b-2 border-transparent px-3 text-sm text-neutre-700 no-underline aria-[current=page]:border-accent-600 aria-[current=page]:font-bold aria-[current=page]:text-texte"
          >
            {nom}
          </Link>
        ))}
      </nav>
      {onglet === 'communes' ? (
        <OngletCommunes
          slug={p.commune}
          peut={s.role !== 'lecture' && s.permissions.includes('communes.modifier')}
        />
      ) : onglet === 'configuration' ? (
        <FlagsAdmin flags={flags} peut={peut} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <ul
            aria-label="Prestations"
            className="m-0 grid max-h-[70vh] list-none content-start gap-1 overflow-y-auto p-0"
          >
            {prestations.map((x) => (
              <li key={x.id}>
                <Link
                  href={`/admin/referentiels?onglet=prestations&id=${x.id}` as Route}
                  aria-current={x.id === p.id ? 'true' : undefined}
                  className="flex min-h-11 items-center justify-between gap-2 rounded-[10px] px-3 text-sm text-texte no-underline aria-[current=true]:bg-accent-100"
                >
                  {x.nom}
                  {x.actif ? null : <Badge tone="neutre">Retirée</Badge>}
                </Link>
              </li>
            ))}
          </ul>
          {choisie && prix ? (
            <section
              aria-label={`Prix : ${choisie.nom}`}
              className="grid content-start gap-3 rounded-[16px] border border-trait bg-blanc p-5"
            >
              <h2 className="m-0 text-[20px]">{choisie.nom}</h2>
              <p className="m-0 text-sm text-neutre-700">
                Version {prix.version} · montants en centimes HT, coefficients sans unité
              </p>
              <EditeurPrixPrestation
                key={prix.version}
                id={choisie.id}
                nom={choisie.nom}
                actif={choisie.actif}
                feuilles={prix.feuilles}
                peut={peut}
              />
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
