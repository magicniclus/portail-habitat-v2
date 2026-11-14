'use client';

import { LIBELLES_TYPE_CHAMP, type ChampFormulaire, type TypeChamp } from '@ph/core/sites';
import { Banner, Button, Field, IconButton, Input, Interrupteur, Select } from '@ph/ui';
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useAppelSite } from './appelSite';

/** Champs proposés à l'ajout (les photos arriveront avec l'import de fichiers du formulaire). */
const AJOUTABLES: TypeChamp[] = ['texte', 'zone', 'liste', 'choix', 'date', 'budget', 'cp'];
const FIXES = new Set(['nom', 'telephone', 'email']);

/** Constructeur de champs (Site Pro) : nom, téléphone et email restent obligatoires. */
export function ConstructeurFormulaire({ initial }: { initial: ChampFormulaire[] }) {
  const [champs, setChamps] = useState(initial);
  const [type, setType] = useState<TypeChamp>('texte');
  const { appeler, erreur, enCours } = useAppelSite();
  const maj = (i: number, p: Partial<ChampFormulaire>) =>
    setChamps((c) => c.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const deplacer = (i: number, d: -1 | 1) =>
    setChamps((c) => {
      const n = [...c];
      const [x] = n.splice(i, 1);
      n.splice(i + d, 0, x!);
      return n;
    });
  return (
    <div className="grid gap-4">
      <ol
        aria-label="Champs du formulaire"
        className="m-0 grid list-none overflow-hidden rounded-[14px] border border-trait bg-blanc p-0"
      >
        {champs.map((c, i) => (
          <li key={c.id} className="grid gap-2 border-t border-trait px-4 py-3 first:border-t-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="w-5 flex-none text-sm font-semibold text-neutre-600 tabular-nums">
                {i + 1}
              </span>
              <label className="sr-only" htmlFor={`champ-${c.id}`}>
                {`Champ ${i + 1} · ${LIBELLES_TYPE_CHAMP[c.type]}`}
              </label>
              <input
                id={`champ-${c.id}`}
                value={c.libelle}
                maxLength={80}
                onChange={(e) => maj(i, { libelle: e.target.value })}
                className="min-h-11 min-w-[180px] flex-1 rounded-[8px] border border-trait bg-blanc px-3 text-base"
              />
              <span className="rounded-full bg-neutre-100 px-2.5 py-1 text-xs font-semibold text-neutre-700">
                {LIBELLES_TYPE_CHAMP[c.type]}
              </span>
              <span className="flex items-center gap-1 text-sm text-neutre-800">
                <Interrupteur
                  aria-label={`${c.libelle} : obligatoire`}
                  checked={c.requis}
                  disabled={FIXES.has(c.id)}
                  onCheckedChange={(requis) => maj(i, { requis })}
                />
                Obligatoire
              </span>
              <span className="ml-auto flex">
                <IconButton
                  icone={<ArrowUpIcon size={18} />}
                  aria-label={`Monter « ${c.libelle} »`}
                  disabled={i === 0}
                  onClick={() => deplacer(i, -1)}
                />
                <IconButton
                  icone={<ArrowDownIcon size={18} />}
                  aria-label={`Descendre « ${c.libelle} »`}
                  disabled={i === champs.length - 1}
                  onClick={() => deplacer(i, 1)}
                />
                <IconButton
                  icone={<TrashIcon size={18} />}
                  aria-label={`Retirer « ${c.libelle} »`}
                  title={FIXES.has(c.id) ? 'Champ obligatoire : il reste' : 'Retirer'}
                  disabled={FIXES.has(c.id)}
                  onClick={() => setChamps((x) => x.filter((_, j) => j !== i))}
                />
              </span>
            </div>
            {c.type === 'liste' || c.type === 'choix' ? (
              <div className="pl-8">
                <Field label="Options" aide="Séparées par des virgules.">
                  <Input
                    value={(c.options ?? []).join(', ')}
                    onChange={(e) =>
                      maj(i, {
                        options: e.target.value
                          .split(',')
                          .map((o) => o.trim())
                          .filter(Boolean)
                          .slice(0, 20),
                      })
                    }
                  />
                </Field>
              </div>
            ) : null}
          </li>
        ))}
        <li className="flex flex-wrap items-end gap-3 border-t border-trait bg-neutre-100 px-4 py-3">
          <Field label="Ajouter un champ" className="min-w-[200px]">
            <Select value={type} onChange={(e) => setType(e.target.value as TypeChamp)}>
              {AJOUTABLES.map((t) => (
                <option key={t} value={t}>
                  {LIBELLES_TYPE_CHAMP[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            variant="secondaire"
            disabled={champs.length >= 30}
            onClick={() =>
              setChamps((c) => [
                ...c,
                {
                  id: `q${Date.now().toString(36)}`,
                  type,
                  libelle: LIBELLES_TYPE_CHAMP[type],
                  requis: false,
                  ...(type === 'liste' || type === 'choix'
                    ? { options: ['Option 1', 'Option 2'] }
                    : {}),
                },
              ])
            }
          >
            + Ajouter
          </Button>
        </li>
      </ol>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <div className="sticky bottom-0 border-t border-trait bg-blanc py-3 max-[899px]:bottom-[72px]">
        <Button
          chargement={enCours}
          onClick={() => void appeler('formulaire', { champs })}
          disabled={enCours}
        >
          {enCours ? 'Enregistrement…' : 'Enregistrer le formulaire'}
        </Button>
      </div>
    </div>
  );
}
