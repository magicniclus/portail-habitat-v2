'use client';

import { LIBELLES_TYPE_CHAMP, type ChampFormulaire, type TypeChamp } from '@ph/core/sites';
import { Banner, Button, Checkbox, Field, Input, Select } from '@ph/ui';
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
      <ol className="m-0 grid list-none gap-3 p-0">
        {champs.map((c, i) => (
          <li key={c.id} className="grid gap-3 rounded-[12px] border border-trait p-4">
            <div className="flex flex-wrap items-end gap-3">
              <Field
                label={`Champ ${i + 1} · ${LIBELLES_TYPE_CHAMP[c.type]}`}
                className="min-w-[220px] flex-1"
              >
                <Input
                  value={c.libelle}
                  maxLength={80}
                  onChange={(e) => maj(i, { libelle: e.target.value })}
                />
              </Field>
              <Checkbox
                checked={c.requis}
                disabled={FIXES.has(c.id)}
                onChange={(e) => maj(i, { requis: e.target.checked })}
              >
                Obligatoire
              </Checkbox>
            </div>
            {c.type === 'liste' || c.type === 'choix' ? (
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
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="fantome"
                taille="sm"
                disabled={i === 0}
                onClick={() => deplacer(i, -1)}
              >
                Monter
              </Button>
              <Button
                variant="fantome"
                taille="sm"
                disabled={i === champs.length - 1}
                onClick={() => deplacer(i, 1)}
              >
                Descendre
              </Button>
              {FIXES.has(c.id) ? null : (
                <Button
                  variant="fantome"
                  taille="sm"
                  onClick={() => setChamps((x) => x.filter((_, j) => j !== i))}
                >
                  Retirer
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-end gap-3">
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
          Ajouter
        </Button>
      </div>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <div>
        <Button onClick={() => void appeler('formulaire', { champs })} disabled={enCours}>
          Enregistrer le formulaire
        </Button>
      </div>
    </div>
  );
}
