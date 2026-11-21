import { Banner, bouton } from '@ph/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AccepterDevis } from '@/features/devisClient/AccepterDevis';
import { devisPourClient } from '@/server/devis';

export const metadata: Metadata = {
  title: 'Votre devis',
  robots: { index: false },
  referrer: 'no-referrer',
};
export const dynamic = 'force-dynamic';

/**
 * Lien personnel reçu par email (DATABASE §8 bis) : résumé, PDF à télécharger et, si l'artisan l'a
 * activée, acceptation en ligne. Rien d'autre que ce devis n'est lisible par ce lien.
 */
export default async function PageDevisClient({ params }: { params: Promise<{ lien: string }> }) {
  const { lien } = await params;
  const d = await devisPourClient(lien);
  if (!d) notFound();
  return (
    <main className="mx-auto grid w-full max-w-xl gap-5 px-4 py-10">
      <div>
        <h1 className="m-0 text-[28px] leading-tight font-bold">Devis {d.numero}</h1>
        <p className="m-0 text-base text-neutre-800">{d.entreprise}</p>
      </div>
      <dl className="m-0 grid gap-2 text-[15px] min-[500px]:grid-cols-[160px_1fr]">
        <dt className="font-semibold">Objet</dt>
        <dd className="m-0">{d.objet}</dd>
        <dt className="font-semibold">Montant</dt>
        <dd className="m-0">{d.montant}</dd>
        {d.validite ? (
          <>
            <dt className="font-semibold">Valable jusqu’au</dt>
            <dd className="m-0">{d.validite}</dd>
          </>
        ) : null}
      </dl>
      <div>
        <a href={`/api/devis-client/${lien}`} className={bouton({ variant: 'secondaire' })}>
          Télécharger le devis (PDF)
        </a>
      </div>
      {d.signe ? (
        <Banner tone="succes" titre="Devis accepté">
          Accepté par {d.signe.nom} le {d.signe.le}.
        </Banner>
      ) : d.signature.possible ? (
        <AccepterDevis lien={lien} numero={d.numero} />
      ) : (
        <Banner tone="info">{d.signature.raison}</Banner>
      )}
    </main>
  );
}
