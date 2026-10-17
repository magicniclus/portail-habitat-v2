import { joursRestants, LIBELLES_TYPE_RGPD } from '@ph/core/admin';
import { formatDate } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { listerRgpdAdmin } from '@ph/firebase/admin-serveur';
import { Badge } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { NouvelleDemandeRgpd } from '@/features/adminRgpd/NouvelleDemandeRgpd';
import { TraiterRgpd } from '@/features/adminRgpd/TraiterRgpd';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'RGPD' };

const fichier = (chemin: string) => `/admin/rgpd/fichier?chemin=${encodeURIComponent(chemin)}`;

/** Maquette « Admin RGPD » (ADMIN §2.13) : délai d'un mois, export, anonymisation, preuve. */
export default async function RgpdAdmin() {
  await pageAdmin('/admin/rgpd', 'rgpd');
  const demandes = await listerRgpdAdmin(getFirestore(appAdmin()));
  const maintenant = maintenantServeur();
  return (
    <main className="grid content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <div>
        <h1 className="m-0 text-[clamp(26px,3vw,32px)]">RGPD</h1>
        <p className="m-0 text-sm text-neutre-800">
          Délai légal : un mois à compter de la réception.
        </p>
      </div>
      <NouvelleDemandeRgpd aujourdhui={new Date(maintenant).toISOString().slice(0, 10)} />
      <ul aria-label="Demandes RGPD" className="m-0 grid list-none gap-2 p-0">
        {demandes.length ? null : <li className="text-sm text-neutre-700">Aucune demande.</li>}
        {demandes.map((d) => {
          const reste = joursRestants(d.echeance, maintenant);
          return (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-trait bg-blanc p-3"
            >
              <span className="grid gap-0.5">
                <strong>{LIBELLES_TYPE_RGPD[d.type]}</strong>
                <span className="text-[13px] text-neutre-700">
                  {d.emailMasque} · reçue le {formatDate(d.recueLe)} · échéance{' '}
                  {formatDate(d.echeance)}
                  {d.aUnCompte ? '' : ' · aucun compte'}
                </span>
              </span>
              {d.statut === 'traite' ? (
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge tone="succes">Traitée</Badge>
                  {d.preuve ? <a href={fichier(d.preuve)}>Preuve</a> : null}
                  {d.type === 'acces' || d.type === 'portabilite' ? (
                    <a href={fichier(`rgpd/${d.id}/export.json`)}>Export</a>
                  ) : null}
                </span>
              ) : (
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone={reste < 10 ? 'danger' : 'attention'}>
                    {reste >= 0 ? `Reste ${reste} jours` : `En retard de ${-reste} jours`}
                  </Badge>
                  <TraiterRgpd id={d.id} type={d.type} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
