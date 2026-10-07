import {
  FILTRES_ARTISANS,
  lireArtisanAdmin,
  listerArtisansAdmin,
  type FiltreArtisans,
} from '@ph/firebase/admin-serveur';
import { appAdmin } from '@ph/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { FicheArtisanAdmin } from '@/features/adminArtisans/FicheArtisanAdmin';
import { CreerEntreprise } from '@/features/adminArtisans/CreerEntreprise';
import { ListeArtisansAdmin } from '@/features/adminArtisans/ListeArtisansAdmin';
import { groupesMetiers } from '@/features/pro/metiers';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Artisans' };

type Params = Promise<Record<string, string | undefined>>;

/** Maquette « Admin Artisans » : liste filtrée à gauche, fiche 360° à droite (ADMIN §2.3). */
export default async function ArtisansAdmin({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const s = await pageAdmin('/admin/artisans', 'artisans');
  const filtre = (FILTRES_ARTISANS as readonly string[]).includes(p.f ?? '')
    ? (p.f as FiltreArtisans)
    : 'tous';
  const db = getFirestore(appAdmin());
  const [lignes, fiche] = await Promise.all([
    listerArtisansAdmin(db, { filtre, ...(p.q ? { q: p.q } : {}) }),
    p.id ? lireArtisanAdmin(db, p.id) : null,
  ]);
  return (
    <main className="grid gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)] lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Artisans</h1>
          {s.role !== 'lecture' ? (
            <CreerEntreprise
              metiers={groupesMetiers().flatMap((g) => g.metiers)}
              autorise={s.permissions.includes('artisans.creer')}
            />
          ) : null}
        </div>
        <ListeArtisansAdmin
          lignes={lignes}
          filtre={filtre}
          q={p.q ?? ''}
          selection={p.id ?? null}
        />
      </div>
      {fiche ? (
        <FicheArtisanAdmin fiche={fiche} session={s} onglet={p.onglet ?? 'identite'} />
      ) : null}
    </main>
  );
}
