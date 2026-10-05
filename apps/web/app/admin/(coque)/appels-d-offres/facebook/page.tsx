import { formatDate, formatNombre } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { lirePublicationFacebook, lireResultatsFacebook } from '@ph/firebase/admin-serveur';
import { Button, Card, CardBody, CardHeader, CardTitle, Field, Select } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { NavAppelsOffres } from '@/features/adminAppelsOffres/NavAppelsOffres';
import { PublicationFacebook } from '@/features/adminAppelsOffres/PublicationFacebook';
import { maintenantServeur } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Facebook et invendues' };

/** Publication du groupe « Trouver chantier » et demandes invendues offertes (CONV-07, CONV-08). */
export default async function FacebookInvendues({
  searchParams,
}: {
  searchParams: Promise<{ dep?: string }>;
}) {
  const s = await pageAdmin('/admin/appels-d-offres/facebook', 'appels-offres');
  const db = getFirestore(appAdmin());
  const maintenant = maintenantServeur();
  const [p, r] = await Promise.all([
    lirePublicationFacebook(db, maintenant, (await searchParams).dep),
    lireResultatsFacebook(db, maintenant),
  ]);
  return (
    <main className="grid content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Facebook et invendues</h1>
      <NavAppelsOffres actif="/admin/appels-d-offres/facebook" />
      <Card>
        <CardHeader>
          <CardTitle>Publication du jour · groupe « Trouver chantier »</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3">
          {p.departements.length > 1 ? (
            <form method="get" className="flex flex-wrap items-end gap-2">
              <Field label="Département">
                <Select name="dep" defaultValue={p.departement ?? ''}>
                  {p.departements.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} · {d.demandes} demande{d.demandes > 1 ? 's' : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button type="submit" variant="secondaire">
                Afficher
              </Button>
            </form>
          ) : null}
          {p.texte && p.departement ? (
            <PublicationFacebook
              texte={p.texte}
              departement={p.departement}
              desactive={
                s.permissions.includes('leads.publier')
                  ? undefined
                  : 'Permission requise : leads.publier'
              }
            />
          ) : (
            <p className="m-0 text-sm">
              Moins de 5 demandes ces dernières 24 heures dans ce département : pas de publication
              aujourd’hui.
            </p>
          )}
          <p className="m-0 text-[13px] text-neutre-700">
            Demandes anonymisées (commune, budget, délai), aucune donnée personnelle. Facebook ne
            permet plus la publication automatique dans les groupes.
            {p.derniere
              ? ` Dernière publication marquée : ${formatDate(p.derniere, 'dateHeure')}.`
              : ''}
          </p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Résultats (30 j)</CardTitle>
        </CardHeader>
        <CardBody>
          <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            {(
              [
                ['Prospects venus du groupe', r.prospects],
                ['Demandes invendues offertes', r.demandesOffertes],
                ['Demandes offertes reçues (Visibilité activée)', r.demandesOffertesRecues],
              ] as const
            ).map(([l, v]) => (
              <div key={l} className="contents">
                <dt>{l}</dt>
                <dd className="m-0 text-right font-semibold">{formatNombre(v)}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>
      <section aria-label="Demandes invendues offertes" className="grid gap-2">
        <h2 className="m-0 text-lg">Demandes invendues offertes (7 j)</h2>
        {r.offertes.length ? (
          <ul className="m-0 grid list-none gap-2 p-0 text-sm">
            {r.offertes.map((o) => (
              <li key={o.appelOffresId} className="rounded-lg border border-trait p-3">
                <strong>{o.projet}</strong> · {o.lieu} · proposée à {o.proposees} artisan
                {o.proposees > 1 ? 's' : ''} · reçue par {o.recues}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm">Aucune demande offerte cette semaine.</p>
        )}
        <p className="m-0 text-[13px] text-neutre-700">
          Règle : sans déblocage après 24 h, offerte à 5 artisans gratuits du secteur ; les 3
          premiers qui activent Visibilité la reçoivent.
        </p>
      </section>
    </main>
  );
}
