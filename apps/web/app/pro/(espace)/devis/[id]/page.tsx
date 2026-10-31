import { libelleStatutDevis, tonStatut } from '@ph/core/devis';
import { formatDate, formatEuros } from '@ph/core/format';
import { lireDevisComplet } from '@ph/firebase/devis';
import { Badge } from '@ph/ui';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ActionsDevis } from '@/features/devis/ActionsDevis';
import { routes } from '@/lib/routes';
import { accesDevis, dbDevis } from '@/server/pageDevis';

export const metadata: Metadata = { title: 'Devis', robots: { index: false } };

const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });

/** Brouillon : vers l'éditeur pleine page. Envoyé : récapitulatif figé, PDF et suite (décision, facturation). */
export default async function PageUnDevis({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acces = await accesDevis(routes.proUnDevis(id));
  const d = await lireDevisComplet(dbDevis(), acces.artisanId, id);
  if (!d) notFound();
  const titre = (
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">Devis {d.numero}</h1>
      <Badge tone={tonStatut(d.statut)}>{libelleStatutDevis(d.statut, Boolean(d.envoiLe))}</Badge>
    </div>
  );
  // Brouillon : éditeur pleine page.
  if (d.statut === 'brouillon' && acces.gerer) redirect(routes.proModifierDevis(id));
  return (
    <main className="grid gap-6 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      {titre}
      <dl className="m-0 grid max-w-[720px] gap-2 text-[15px] min-[700px]:grid-cols-[200px_1fr]">
        <dt className="font-semibold">Client</dt>
        <dd className="m-0">
          {d.client.nom} · {d.client.adresse}
        </dd>
        <dt className="font-semibold">Objet</dt>
        <dd className="m-0">{d.objet}</dd>
        <dt className="font-semibold">Total TTC</dt>
        <dd className="m-0">{eur(d.totaux.ttcCentimes)}</dd>
        <dt className="font-semibold">Marge HT (privée)</dt>
        <dd className="m-0">{eur(d.margeHtCentimes)}</dd>
        {d.envoiLe ? (
          <>
            <dt className="font-semibold">Envoyé le</dt>
            <dd className="m-0">{formatDate(d.envoiLe)}</dd>
          </>
        ) : null}
      </dl>
      <ActionsDevis
        devisId={d.id}
        statut={d.statut}
        aPdf={Boolean(d.pdfPath)}
        acompte={d.acomptePct > 0}
        factureId={d.factureId}
        peutFacturer={acces.facturer}
        peutGerer={acces.gerer}
        objet={d.objet}
        envoye={Boolean(d.envoiLe)}
      />
    </main>
  );
}
