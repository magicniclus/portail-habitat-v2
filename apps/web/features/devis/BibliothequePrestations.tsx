'use client';

import { TAUX_TVA, type TauxTva } from '@ph/core/devis';
import { formatEuros, parseEuros } from '@ph/core/format';
import type { PrestationBiblio } from '@ph/firebase/devis';
import { BoutonAction, Button, Field, Input, Select } from '@ph/ui';
import { useState, type FormEvent } from 'react';
import { useAppelDevis } from './appelDevis';

const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });
const pct = (t: number) => `${String(t).replace('.', ',')} %`;
const cellule = 'px-3 py-2.5';

/**
 * Bibliothèque de prestations (maquette, onglet Modèles) : désignation, unité, prix HT, TVA et coût
 * (privé, pour la marge). Reprise d'un clic dans l'éditeur de devis.
 */
export function BibliothequePrestations({
  prestations,
  peutGerer,
  tvaDefaut,
}: {
  prestations: PrestationBiblio[];
  peutGerer: boolean;
  tvaDefaut: TauxTva;
}) {
  const { appeler, enCours, erreur } = useAppelDevis();
  const [ajout, setAjout] = useState(false);
  const [invalide, setInvalide] = useState<string | null>(null);
  const ajouter = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const form = ev.currentTarget;
    const f = new FormData(form);
    const pu = parseEuros(String(f.get('pu') ?? ''));
    const cout = String(f.get('cout') ?? '').trim();
    if (!pu) return setInvalide('Indiquez le prix HT.');
    setInvalide(null);
    const ok = await appeler('/api/pro/devis/bibliotheque', {
      action: 'creer',
      designation: String(f.get('designation') ?? '').trim(),
      unite: String(f.get('unite') ?? '').trim() || 'u',
      puHtCentimes: pu,
      tva: Number(f.get('tva')),
      ...(cout ? { coutHtCentimes: parseEuros(cout) ?? 0 } : {}),
    });
    if (ok) {
      form.reset();
      setAjout(false);
    }
  };
  return (
    <section aria-labelledby="biblio-devis" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="biblio-devis" className="m-0 text-lg">
          Bibliothèque de prestations
        </h2>
        {peutGerer && !ajout ? (
          <Button variant="secondaire" onClick={() => setAjout(true)}>
            + Ajouter une prestation
          </Button>
        ) : null}
      </div>
      {erreur}
      {ajout ? (
        <form
          onSubmit={(e) => void ajouter(e)}
          aria-label="Nouvelle prestation"
          className="grid gap-3 rounded-[12px] border border-trait p-4 min-[900px]:grid-cols-[minmax(0,3fr)_90px_120px_100px_120px] min-[900px]:items-end"
        >
          <Field label="Désignation">
            <Input name="designation" required maxLength={300} />
          </Field>
          <Field label="Unité">
            <Input name="unite" defaultValue="u" maxLength={20} />
          </Field>
          <Field label="Prix HT (€)">
            <Input name="pu" inputMode="decimal" required />
          </Field>
          <Field label="TVA">
            <Select name="tva" defaultValue={String(tvaDefaut)}>
              {TAUX_TVA.map((t) => (
                <option key={t} value={t}>
                  {pct(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Coût HT (privé)">
            <Input name="cout" inputMode="decimal" />
          </Field>
          {invalide ? <p className="m-0 text-sm text-danger">{invalide}</p> : null}
          <div className="flex gap-2 min-[900px]:col-span-5">
            <Button chargement={enCours} type="submit" disabled={enCours}>
              Ajouter
            </Button>
            <Button variant="fantome" onClick={() => setAjout(false)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : null}
      {prestations.length ? (
        <div className="overflow-x-auto rounded-[14px] border border-trait">
          <table className="w-full min-w-[600px] border-collapse text-[15px]">
            <thead>
              <tr className="bg-neutre-100 text-left">
                <th className={cellule}>Prestation</th>
                <th className={cellule}>Unité</th>
                <th className={`${cellule} text-right`}>Prix HT</th>
                <th className={`${cellule} text-right`}>TVA</th>
                <th className={`${cellule} text-right`}>Coût (privé)</th>
                {peutGerer ? (
                  <th className={cellule}>
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {prestations.map((p) => (
                <tr key={p.id} className="border-t border-trait">
                  <td className={cellule}>{p.designation}</td>
                  <td className={cellule}>{p.unite}</td>
                  <td className={`${cellule} text-right`}>{eur(p.puHtCentimes)}</td>
                  <td className={`${cellule} text-right`}>{pct(p.tva)}</td>
                  <td className={`${cellule} text-right text-neutre-700`}>
                    {p.coutHtCentimes !== undefined ? eur(p.coutHtCentimes) : '—'}
                  </td>
                  {peutGerer ? (
                    <td className={cellule}>
                      <BoutonAction
                        variant="fantome"
                        disabled={enCours}
                        aria-label={`Supprimer ${p.designation}`}
                        onClick={() =>
                          appeler('/api/pro/devis/bibliotheque', {
                            action: 'supprimer',
                            id: p.id,
                          })
                        }
                      >
                        Supprimer
                      </BoutonAction>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="m-0 text-[15px] text-neutre-800">
          Ajoutez vos prestations courantes : elles se reprennent d’un clic dans vos devis.
        </p>
      )}
    </section>
  );
}
