import {
  LIBELLES_MOYEN_PAIEMENT,
  LIBELLES_RELANCE_FACTURE,
  relanceManuellePossible,
  LIBELLES_STATUT_FACTURE,
  LIBELLES_TYPE_FACTURE,
  tonStatut,
} from '@ph/core/devis';
import { formatDate, formatEuros } from '@ph/core/format';
import { lireFactureComplete } from '@ph/firebase/devis';
import { Badge } from '@ph/ui';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ActionsFacture } from '@/features/devis/ActionsFacture';
import { routes } from '@/lib/routes';
import { accesDevis, dbDevis } from '@/server/pageDevis';
import { maintenant } from '@/server/temps';

export const metadata: Metadata = { title: 'Facture', robots: { index: false } };

const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });

/** Facture émise : figée ; paiements reçus et avoir. */
export default async function PageFacture({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acces = await accesDevis(routes.proFactureClient(id));
  const f = await lireFactureComplete(dbDevis(), acces.artisanId, id);
  if (!f) notFound();
  if (f.statut === 'brouillon') redirect(routes.proModifierFacture(id));
  const relancable =
    acces.facturer &&
    f.aEmailClient &&
    Boolean(f.pdfPath) &&
    relanceManuellePossible(
      {
        ...f,
        echeanceLe: f.echeanceLe ? new Date(f.echeanceLe) : undefined,
        avoirId: f.avoirId,
        relances: f.relances.map((r) => ({ ...r, le: new Date(r.le) })),
      },
      maintenant(),
    );
  return (
    <main className="grid gap-6 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">
          {LIBELLES_TYPE_FACTURE[f.type]} {f.numero}
        </h1>
        <Badge tone={f.annulee ? 'neutre' : tonStatut(f.statut)}>
          {f.annulee
            ? 'Annulée par avoir'
            : (LIBELLES_STATUT_FACTURE[f.statut as keyof typeof LIBELLES_STATUT_FACTURE] ??
              f.statut)}
        </Badge>
      </div>
      <dl className="m-0 grid max-w-[720px] gap-2 text-[15px] min-[700px]:grid-cols-[200px_1fr]">
        <dt className="font-semibold">Client</dt>
        <dd className="m-0">{f.client}</dd>
        {f.devisNumero ? (
          <>
            <dt className="font-semibold">Devis</dt>
            <dd className="m-0">{f.devisNumero}</dd>
          </>
        ) : null}
        <dt className="font-semibold">Total TTC</dt>
        <dd className="m-0">{eur(f.ttcCentimes)}</dd>
        {f.acomptesDeduits.map((a) => (
          <div key={a.numero} className="contents">
            <dt className="font-semibold">Acompte {a.numero}</dt>
            <dd className="m-0">− {eur(a.ttcCentimes)}</dd>
          </div>
        ))}
        {f.type !== 'avoir' ? (
          <>
            <dt className="font-semibold">Reste à payer</dt>
            <dd className="m-0" data-testid="reste-a-payer">
              {eur(f.resteCentimes)}
            </dd>
          </>
        ) : null}
        {f.echeanceLe && f.type !== 'avoir' ? (
          <>
            <dt className="font-semibold">Échéance</dt>
            <dd className="m-0">{formatDate(f.echeanceLe)}</dd>
          </>
        ) : null}
        {f.motifAvoir ? (
          <>
            <dt className="font-semibold">Motif</dt>
            <dd className="m-0">{f.motifAvoir}</dd>
          </>
        ) : null}
      </dl>
      {f.paiements.length ? (
        <section aria-labelledby="paiements">
          <h2 id="paiements" className="m-0 mb-2 text-lg">
            Paiements reçus
          </h2>
          <ul className="m-0 grid list-none gap-1 p-0">
            {f.paiements.map((p, i) => (
              <li key={i}>
                {formatDate(p.le)} ·{' '}
                {LIBELLES_MOYEN_PAIEMENT[p.moyen as keyof typeof LIBELLES_MOYEN_PAIEMENT] ??
                  p.moyen}{' '}
                · {eur(p.montantCentimes)}
                {p.ref ? ` · ${p.ref}` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {f.type !== 'avoir' && !f.annulee ? (
        <section aria-labelledby="relances" className="grid gap-2">
          <h2 id="relances" className="m-0 text-lg">
            Relances
          </h2>
          <p className="m-0 text-sm text-neutre-700">
            {f.aEmailClient
              ? 'Relances automatiques du client à J−3, J+1 et J+15 autour de l’échéance, tant qu’un reste est dû.'
              : 'L’email du client n’est pas connu : il ne peut pas être relancé automatiquement.'}
          </p>
          {f.relances.length ? (
            <ul className="m-0 grid list-none gap-1 p-0">
              {f.relances.map((r, i) => (
                <li key={i}>
                  {formatDate(r.le)} ·{' '}
                  {LIBELLES_RELANCE_FACTURE[r.type as keyof typeof LIBELLES_RELANCE_FACTURE] ??
                    r.type}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
      <ActionsFacture
        factureId={f.id}
        resteCentimes={f.resteCentimes}
        aPdf={Boolean(f.pdfPath)}
        annulable={acces.facturer && f.type !== 'avoir' && !f.annulee}
        payable={acces.facturer && f.type !== 'avoir' && !f.annulee}
        relancable={relancable}
        aujourdHui={new Date(maintenant()).toISOString().slice(0, 10)}
      />
    </main>
  );
}
