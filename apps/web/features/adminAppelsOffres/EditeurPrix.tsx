'use client';

import { LIBELLES_ACCES_APPEL_OFFRES, LIBELLES_MODE_PRIX } from '@ph/core/admin';
import { Field, Input, Select } from '@ph/ui';
import { useState } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { changerParametres, changerPromo, fixerPrix } from './actions';

type Mode = keyof typeof LIBELLES_MODE_PRIX;
type Acces = keyof typeof LIBELLES_ACCES_APPEL_OFFRES;

const requise = (ok: boolean, p: string) => (ok ? undefined : `Permission requise : ${p}`);
const entier = (v: string) => Number.parseInt(v || '0', 10);

/** Éditeur de prix d'un appel d'offres (ADMIN §2.5) : chaque changement avec motif et confirmation. */
export function EditeurPrix({
  id,
  titre,
  actuel,
  droits,
}: {
  id: string;
  titre: string;
  actuel: {
    mode: Mode;
    prixEuros: number;
    prixPremiumEuros: number;
    credits: number;
    nbDeblocagesMax: number;
    acces: Acces;
    plafondEuros: number;
  };
  droits: { prix: boolean; illimite: boolean; publier: boolean };
}) {
  const [mode, setMode] = useState<Mode>(actuel.mode);
  const [prix, setPrix] = useState(String(actuel.prixEuros));
  const [premium, setPremium] = useState(String(actuel.prixPremiumEuros));
  const [credits, setCredits] = useState(String(actuel.credits));
  const [pourcentage, setPourcentage] = useState('');
  const [jusquau, setJusquau] = useState('');
  const [max, setMax] = useState(String(actuel.nbDeblocagesMax));
  const [acces, setAcces] = useState<Acces>(actuel.acces);

  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmationAdmin
        libelle="Modifier le prix"
        titre={`Prix : ${titre}`}
        description={
          droits.illimite
            ? 'Le nouveau prix s’applique aux déblocages suivants.'
            : `Prix manuel jusqu’à ${actuel.plafondEuros} € HT ; au-delà, permission leads.prix_illimite.`
        }
        desactive={requise(droits.prix, 'leads.prix')}
        onConfirmer={(motif) =>
          fixerPrix(
            mode === 'manuel'
              ? {
                  appelOffresId: id,
                  mode,
                  prixEuros: entier(prix),
                  prixPremiumEuros: entier(premium),
                  credits: entier(credits),
                  motif,
                }
              : { appelOffresId: id, mode, motif },
          )
        }
      >
        <Field label="Mode">
          <Select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            {Object.entries(LIBELLES_MODE_PRIX).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        {mode === 'manuel' ? (
          <>
            <Field label="Prix HT (€)">
              <Input inputMode="numeric" value={prix} onChange={(e) => setPrix(e.target.value)} />
            </Field>
            <Field label="Prix Premium HT (€)">
              <Input
                inputMode="numeric"
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
              />
            </Field>
            <Field label="Prix en crédits">
              <Input
                inputMode="numeric"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
              />
            </Field>
          </>
        ) : null}
      </ConfirmationAdmin>
      <ConfirmationAdmin
        libelle="Promo"
        titre={`Promo : ${titre}`}
        description="Sans pourcentage, la promo en cours est retirée."
        desactive={requise(droits.prix, 'leads.prix')}
        onConfirmer={(motif) =>
          changerPromo({
            appelOffresId: id,
            motif,
            ...(pourcentage ? { pourcentage: entier(pourcentage), jusquau } : {}),
          })
        }
      >
        <Field label="Réduction (%)">
          <Input
            inputMode="numeric"
            value={pourcentage}
            onChange={(e) => setPourcentage(e.target.value)}
          />
        </Field>
        <Field label="Jusqu’au">
          <Input type="date" value={jusquau} onChange={(e) => setJusquau(e.target.value)} />
        </Field>
      </ConfirmationAdmin>
      <ConfirmationAdmin
        libelle="Déblocages et accès"
        titre={`Déblocages et accès : ${titre}`}
        description="Le maximum ne descend jamais sous les déblocages déjà faits."
        desactive={requise(droits.publier, 'leads.publier')}
        onConfirmer={(motif) =>
          changerParametres({ appelOffresId: id, nbDeblocagesMax: entier(max), acces, motif })
        }
      >
        <Field label="Déblocages maximum">
          <Select value={max} onChange={(e) => setMax(e.target.value)}>
            {['1', '2', '3'].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </Select>
        </Field>
        <Field label="Accès">
          <Select value={acces} onChange={(e) => setAcces(e.target.value as Acces)}>
            {Object.entries(LIBELLES_ACCES_APPEL_OFFRES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </ConfirmationAdmin>
    </div>
  );
}
