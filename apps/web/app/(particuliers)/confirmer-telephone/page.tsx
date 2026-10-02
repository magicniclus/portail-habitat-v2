import { Banner, Button } from '@ph/ui';
import type { Metadata } from 'next';
import { confirmerTelephone } from '@/features/partenaires/actions';

export const metadata: Metadata = {
  title: 'Confirmer mon numéro',
  robots: { index: false },
  referrer: 'no-referrer',
};
export const dynamic = 'force-dynamic';

/** Lien du SMS envoyé après une demande faite sur un site partenaire (simulateur d'aides). */
export default async function ConfirmerTelephone({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-10">
      <h1 className="text-[28px] leading-tight font-bold">Confirmer mon numéro</h1>
      {p.etat === 'confirme' ? (
        <Banner tone="succes" titre="Merci, votre numéro est confirmé">
          Des artisans vérifiés de votre secteur vont vous rappeler pour votre projet.
        </Banner>
      ) : p.etat === 'invalide' ? (
        <Banner tone="attention" titre="Ce lien n’est plus valable">
          Votre numéro est peut-être déjà confirmé. Sinon, refaites une demande sur le site où vous
          avez fait votre simulation.
        </Banner>
      ) : (
        <form action={confirmerTelephone} className="flex flex-col gap-4">
          <p className="m-0 text-base">
            Vous avez demandé à être recontacté par des artisans pour votre projet de travaux.
            Confirmez que ce numéro est bien le vôtre.
          </p>
          <input type="hidden" name="jeton" value={p.jeton ?? ''} />
          <Button type="submit">Confirmer mon numéro</Button>
        </form>
      )}
    </main>
  );
}
