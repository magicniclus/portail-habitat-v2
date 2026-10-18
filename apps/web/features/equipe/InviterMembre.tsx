'use client';

import { LIBELLES_ROLE, peut, POUVOIRS_ROLE, type Membre } from '@ph/core/equipe';
import { Banner, Button, Feuille, Field, Input, Select, bouton } from '@ph/ui';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { routes } from '@/lib/routes';
import { useActionEquipe } from './useActionEquipe';

const ROLES = ['collaborateur', 'gerant', 'comptable'] as const;

/**
 * EQU-01 / EQU-02 : invitation (email, rôle) ; sièges pleins → bouton inactif et proposition
 * d'ajouter un siège (facturation, lot 11).
 */
export function InviterMembre({
  artisanId,
  moi,
  disponibles,
}: {
  artisanId: string;
  moi: Membre;
  disponibles: number;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [email, setEmail] = useState('');
  const roles = ROLES.filter((r) => peut(moi, 'membres.gerer', { roleCible: r }));
  const [role, setRole] = useState<(typeof ROLES)[number]>(roles[0] ?? 'collaborateur');
  const { appeler, erreur, enCours } = useActionEquipe();

  const envoyer = async (ev: FormEvent) => {
    ev.preventDefault();
    const ok = await appeler('inviter', {
      cleIdempotence: crypto.randomUUID(),
      artisanId,
      email: email.trim(),
      role,
    });
    if (ok) {
      setOuvert(false);
      setEmail('');
    }
  };

  if (disponibles < 1)
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled>Inviter</Button>
        <span className="text-sm text-neutre-800">Tous les sièges sont occupés.</span>
        <Link
          href={routes.proFacturation}
          className={bouton({ variant: 'secondaire', taille: 'sm' })}
        >
          Ajouter un siège
        </Link>
      </div>
    );

  return (
    <Feuille
      open={ouvert}
      onOpenChange={setOuvert}
      titre="Inviter un membre"
      declencheur={<Button>Inviter</Button>}
      actions={
        <Button type="submit" form="form-invitation" disabled={enCours || !email.includes('@')}>
          {enCours ? 'Envoi…' : "Envoyer l'invitation"}
        </Button>
      }
    >
      <form id="form-invitation" onSubmit={envoyer} className="grid gap-4">
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
        <Field label="Email" requis aide="L'invitation est valable 7 jours.">
          <Input champ="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Rôle" aide={POUVOIRS_ROLE[role]}>
          <Select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {LIBELLES_ROLE[r]}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Feuille>
  );
}
