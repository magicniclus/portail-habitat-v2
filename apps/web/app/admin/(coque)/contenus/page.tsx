import { formatDate } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { listerAnnoncesAdmin } from '@ph/firebase/admin-serveur';
import { Badge } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { ArreterAnnonce } from '@/features/adminContenus/ArreterAnnonce';
import { FormulaireAnnonce } from '@/features/adminContenus/FormulaireAnnonce';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Contenus' };

const PUBLIC = { pros: 'Artisans', particuliers: 'Particuliers', tous: 'Tous' } as const;

/** Maquette « Admin Contenus » (ADMIN §2.11) : annonces in-app. */
export default async function ContenusAdmin() {
  const s = await pageAdmin('/admin/contenus', 'contenus');
  const annonces = await listerAnnoncesAdmin(getFirestore(appAdmin()));
  const maintenant = maintenantServeur();
  const peut = s.role !== 'lecture' && s.permissions.includes('annonces.gerer');
  return (
    <main className="grid content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <div>
        <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Contenus</h1>
        <p className="m-0 text-sm text-neutre-800">
          Annonces affichées en haut des espaces artisans et particuliers.
        </p>
      </div>
      <FormulaireAnnonce aujourdhui={new Date(maintenant).toISOString().slice(0, 10)} peut={peut} />
      <ul aria-label="Annonces" className="m-0 grid list-none gap-2 p-0">
        {annonces.length ? null : <li className="text-sm text-neutre-700">Aucune annonce.</li>}
        {annonces.map((a) => {
          const enCours =
            a.actif && a.debut <= maintenant && (a.fin === undefined || a.fin > maintenant);
          return (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-trait bg-blanc p-3"
            >
              <span className="grid gap-0.5">
                <strong>{a.titre}</strong>
                <span className="text-[13px] text-neutre-700">
                  {PUBLIC[a.cible]} · du {formatDate(a.debut)}
                  {a.fin ? ` au ${formatDate(a.fin)}` : ''}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Badge tone={enCours ? 'succes' : 'neutre'}>
                  {enCours ? 'En ligne' : a.actif ? 'Programmée ou finie' : 'Arrêtée'}
                </Badge>
                {a.actif ? <ArreterAnnonce id={a.id} titre={a.titre} peut={peut} /> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
