'use client';

import { LIBELLES_MOYEN_PAIEMENT } from '@ph/core/devis';
import { formatEuros, parseEuros } from '@ph/core/format';
import { Banner, Button, ConfirmDialog, Field, Input, Select, bouton } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';

/** PDF, paiement reçu (partiel ou complet) et avoir : une facture émise ne se modifie plus. */
export function ActionsFacture({
  factureId,
  resteCentimes,
  aPdf,
  annulable,
  payable,
  relancable,
  aujourdHui,
}: {
  factureId: string;
  resteCentimes: number;
  aPdf: boolean;
  annulable: boolean;
  payable: boolean;
  /** « Relancer » : en attente de paiement, pas déjà relancée aujourd'hui. */
  relancable: boolean;
  aujourdHui: string;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [avoir, setAvoir] = useState(false);
  const [relancee, setRelancee] = useState(false);
  const relancer = async () => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<unknown>('/api/pro/factures/relancer', { factureId });
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    setRelancee(true);
    router.refresh();
  };
  const payer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const montant = parseEuros(String(f.get('montant') ?? ''));
    if (!montant) return setErreur('Indiquez le montant reçu.');
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<unknown>('/api/pro/factures/paiement', {
      factureId,
      montantCentimes: montant,
      moyen: f.get('moyen'),
      le: f.get('le'),
      ...(String(f.get('ref') ?? '').trim() ? { ref: String(f.get('ref')).trim() } : {}),
    });
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    router.refresh();
  };
  const annuler = async (motif: string | undefined) => {
    if (!motif || motif.trim().length < 3) return setErreur('Indiquez le motif de l’avoir.');
    setEnCours(true);
    const r = await posterJson<{ factureId: string }>('/api/pro/factures/avoir', {
      factureId,
      motif: motif.trim(),
      cleIdempotence: `avoir-${factureId}-${Date.now()}`,
    });
    setEnCours(false);
    setAvoir(false);
    if (!r.ok) return setErreur(r.message);
    router.push(routes.proFactureClient(r.data.factureId));
  };
  return (
    <div className="grid gap-4">
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      {relancee ? <Banner tone="succes">Relance envoyée au client.</Banner> : null}
      <div className="flex flex-wrap gap-3">
        {aPdf ? (
          <a
            href={`/api/pro/factures/${factureId}/pdf`}
            className={bouton({ variant: 'secondaire' })}
          >
            Télécharger le PDF
          </a>
        ) : null}
        {relancable ? (
          <Button variant="secondaire" disabled={enCours} onClick={() => void relancer()}>
            Relancer
          </Button>
        ) : null}
        {annulable ? (
          <Button variant="fantome" onClick={() => setAvoir(true)}>
            Annuler par un avoir
          </Button>
        ) : null}
      </div>
      {payable && resteCentimes > 0 ? (
        <form
          onSubmit={payer}
          className="grid gap-3 rounded-[12px] border border-trait p-4"
          aria-label="Enregistrer un paiement"
        >
          <h2 className="m-0 text-base">
            Enregistrer un paiement · reste {formatEuros(resteCentimes, { decimales: 'toujours' })}
          </h2>
          <div className="grid gap-3 min-[700px]:grid-cols-4">
            <Field label="Montant (€)">
              <Input
                name="montant"
                inputMode="decimal"
                defaultValue={(resteCentimes / 100).toFixed(2).replace('.', ',')}
              />
            </Field>
            <Field label="Moyen">
              <Select name="moyen" defaultValue="virement">
                {Object.entries(LIBELLES_MOYEN_PAIEMENT).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Reçu le">
              <Input name="le" type="date" defaultValue={aujourdHui} />
            </Field>
            <Field label="Référence">
              <Input name="ref" />
            </Field>
          </div>
          <div>
            <Button type="submit" disabled={enCours}>
              Enregistrer le paiement
            </Button>
          </div>
        </form>
      ) : null}
      <ConfirmDialog
        open={avoir}
        onOpenChange={setAvoir}
        titre="Annuler cette facture par un avoir ?"
        libelleConfirmer="Émettre l’avoir"
        danger
        motifObligatoire
        onConfirmer={annuler}
      >
        <p className="m-0">
          La facture reste dans votre suite de numéros ; un avoir de même montant l’annule.
        </p>
      </ConfirmDialog>
    </div>
  );
}
