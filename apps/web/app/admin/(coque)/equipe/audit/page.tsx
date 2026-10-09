import { formatDate } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { FILTRES_AUDIT, lireJournalAdmin, type FiltreAudit } from '@ph/firebase/admin-serveur';
import { Button, Field, Input, Select, bouton } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { forbidden } from 'next/navigation';
import { NavEquipe } from '@/features/adminEquipe/NavEquipe';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Journal d’audit' };

type Params = Promise<Record<string, string | undefined>>;
const CHAMPS: Record<FiltreAudit, string> = {
  action: 'Action',
  acteurUid: 'Acteur (uid)',
  cible: 'Cible',
};

/** Journal d'audit (ADMIN §2.12) : lecture seule, filtre par acteur, cible ou action, export. */
export default async function AuditAdmin({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const s = await pageAdmin('/admin/equipe/audit', 'equipe');
  if (!s.permissions.includes('audit.lire')) forbidden();
  const champ = (FILTRES_AUDIT as readonly string[]).includes(p.champ ?? '')
    ? (p.champ as FiltreAudit)
    : 'action';
  const valeur = p.valeur?.trim() ?? '';
  const journal = await lireJournalAdmin(
    getFirestore(appAdmin()),
    valeur ? { champ, valeur } : undefined,
  );
  const exporter = `/admin/equipe/audit/export?${new URLSearchParams(valeur ? { champ, valeur } : {})}`;
  return (
    <main className="grid content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Journal d’audit</h1>
      <NavEquipe actif="/admin/equipe/audit" permissions={s.permissions} />
      <form action="/admin/equipe/audit" className="flex flex-wrap items-end gap-2">
        <Field label="Filtrer par">
          <Select name="champ" defaultValue={champ}>
            {Object.entries(CHAMPS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valeur">
          <Input name="valeur" defaultValue={valeur} placeholder="adminModererAvis, avis/…" />
        </Field>
        <Button type="submit" variant="secondaire">
          Filtrer
        </Button>
        <a href={exporter} className={bouton({ variant: 'fantome' })}>
          Exporter en CSV
        </a>
      </form>
      <ul aria-label="Journal" className="m-0 grid list-none gap-0 p-0">
        {journal.length ? null : <li className="text-sm text-neutre-700">Aucune entrée.</li>}
        {journal.map((x) => (
          <li key={x.id} className="grid gap-0.5 border-t border-trait py-2.5 text-sm">
            <span>
              <strong>{x.action}</strong> · {x.acteur} · {formatDate(x.le, 'long')}
            </span>
            <span className="text-neutre-700">
              {x.cible}
              {x.motif ? ` · « ${x.motif} »` : ''}
            </span>
            {x.detail ? (
              <span className="break-all text-[13px] text-neutre-700">{x.detail}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
