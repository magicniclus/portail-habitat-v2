import { formatRelatif } from '@ph/core/format';
import type { TacheAdmin } from '@ph/firebase/admin-serveur';
import { Badge, EmptyState, type Tone } from '@ph/ui';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { ActionsTache } from '@/features/adminFile/ActionsTache';
import { lireFile } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'File de travail' };

type Params = Promise<Record<string, string | undefined>>;

const SLA: Record<TacheAdmin['sla'], { tone: Tone; texte: string }> = {
  ok: { tone: 'succes', texte: 'dans les délais' },
  bientot: { tone: 'attention', texte: 'bientôt' },
  depasse: { tone: 'danger', texte: 'dépassé' },
};

/** Lien vers l'élément à traiter dans sa section (fiche artisan, demande…). */
function lienTache(t: TacheAdmin): Route {
  const id = t.refs.artisanId ?? t.refs.demandeId ?? t.refs.appelOffresId;
  return `/admin/${t.section}${id ? `?id=${id}` : ''}` as Route;
}

/**
 * Maquette « Admin File » (ADMIN §2.2) : tout ce qui attend une action humaine, trié par priorité
 * puis ancienneté ; seuls les types autorisés pour le rôle apparaissent.
 */
export default async function FileAdmin({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const s = await pageAdmin('/admin/file', 'file');
  const { maintenant, file } = await lireFile(s.permissions);
  const types = [...new Set(file.map((t) => t.libelle))];
  const affichees = file.filter(
    (t) => (!p.type || t.libelle === p.type) && (p.mes !== '1' || t.assigneA === s.uid),
  );
  const filtre = (type?: string, mes = p.mes) =>
    `/admin/file?${new URLSearchParams({ ...(type ? { type } : {}), ...(mes === '1' ? { mes } : {}) })}` as Route;
  const puce =
    'flex min-h-11 items-center rounded-pill border border-trait px-4 text-sm font-semibold text-texte no-underline aria-[current=true]:border-accent-700 aria-[current=true]:bg-accent-700 aria-[current=true]:text-blanc';
  return (
    <main className="grid gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <div>
        <h1 className="m-0 text-[clamp(26px,3vw,32px)]">File de travail</h1>
        <p className="m-0 text-base text-neutre-800">
          Tout ce qui attend une action humaine, trié par priorité puis ancienneté. Seuls les types
          autorisés pour votre rôle apparaissent.
        </p>
      </div>
      <nav aria-label="Filtres de la file" className="flex flex-wrap gap-2">
        <Link href={filtre()} aria-current={!p.type ? 'true' : undefined} className={puce}>
          Tous ({file.length})
        </Link>
        {types.map((t) => (
          <Link
            key={t}
            href={filtre(t)}
            aria-current={p.type === t ? 'true' : undefined}
            className={puce}
          >
            {t} ({file.filter((x) => x.libelle === t).length})
          </Link>
        ))}
        <Link
          href={filtre(p.type, p.mes === '1' ? '0' : '1')}
          aria-current={p.mes === '1' ? 'true' : undefined}
          className={puce}
        >
          Seulement mes tâches
        </Link>
      </nav>
      {affichees.length ? (
        <ul aria-label="Tâches" className="m-0 grid list-none gap-3 p-0">
          {affichees.map((t) => (
            <li key={t.id} className="grid gap-2 rounded-[14px] border border-trait bg-blanc p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info">{t.libelle}</Badge>
                <strong>{t.titre}</strong>
                <Badge tone={t.priorite >= 4 ? 'danger' : 'neutre'}>P{t.priorite}</Badge>
              </div>
              <p className="m-0 flex flex-wrap items-center gap-2 text-[13px] text-neutre-700">
                {formatRelatif(t.creeLe, maintenant)} · SLA{' '}
                <Badge tone={SLA[t.sla].tone}>{SLA[t.sla].texte}</Badge> ·{' '}
                {t.assigneA
                  ? t.assigneA === s.uid
                    ? 'à vous'
                    : 'prise par un collègue'
                  : 'non assignée'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={lienTache(t)}
                  className="flex min-h-11 items-center text-sm font-semibold"
                >
                  Ouvrir
                </Link>
                {s.role !== 'lecture' ? (
                  <ActionsTache id={t.id} aMoi={t.assigneA === s.uid} titre={t.titre} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState titre="Rien à traiter pour ce filtre" />
      )}
    </main>
  );
}
