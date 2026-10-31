'use client';

import { LIBELLES_ROLE_ADMIN, ROLES_ADMIN_SYSTEME, type RoleAdminSysteme } from '@ph/core/admin';
import { Banner, Button, Field, Input, Select } from '@ph/ui';
import { useState } from 'react';
import { inviterMembre } from './actions';

/** Invitation d'un membre de l'équipe interne (email, nom, rôle). */
export function InvitationEquipe() {
  const [email, setEmail] = useState('');
  const [nom, setNom] = useState('');
  const [role, setRole] = useState<RoleAdminSysteme>('lecture');
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const envoyer = async () => {
    const e = await inviterMembre({ email, nom, role });
    setMessage(e ? { ok: false, texte: e } : { ok: true, texte: `Invitation envoyée à ${email}.` });
    if (!e) {
      setEmail('');
      setNom('');
    }
  };
  return (
    <fieldset
      aria-label="Inviter un membre"
      className="grid gap-3 rounded-[12px] border border-trait bg-blanc p-4"
    >
      <legend className="font-bold">Inviter un membre</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Prénom et nom">
          <Input value={nom} onChange={(e) => setNom(e.target.value)} />
        </Field>
        <Field label="Rôle">
          <Select value={role} onChange={(e) => setRole(e.target.value as RoleAdminSysteme)}>
            {ROLES_ADMIN_SYSTEME.map((r) => (
              <option key={r} value={r}>
                {LIBELLES_ROLE_ADMIN[r] ?? r}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {message ? <Banner tone={message.ok ? 'succes' : 'danger'}>{message.texte}</Banner> : null}
      <Button onClick={envoyer} disabled={!email.includes('@') || nom.trim().length < 2}>
        Envoyer l’invitation
      </Button>
    </fieldset>
  );
}
