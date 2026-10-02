import { formatDate, formatEuros, formatNombre, formatRelatif } from '@ph/core/format';
import { bouton } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BarresDemandes } from '@/features/admin/BarresDemandes';
import { routes } from '@/lib/routes';
import { lireTableauEtFile } from '@/server/adminLectures';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Tableau de bord' };

function Indicateur({ l, v, s }: { l: string; v: string; s: string }) {
  return (
    <li className="grid gap-1 rounded-[14px] border border-trait bg-blanc p-4">
      <span className="text-sm font-semibold text-neutre-800">{l}</span>
      <span className="text-[28px] leading-none font-bold">{v}</span>
      <span className="text-[13px] text-neutre-700">{s}</span>
    </li>
  );
}

/** Maquette « Admin Tableau de bord » (ADMIN §2.1) : indicateurs, demandes, urgences, santé. */
export default async function TableauDeBordAdmin() {
  const s = await pageAdmin('/admin', 'tableau');
  const { maintenant, tableau: t, file } = await lireTableauEtFile(s.permissions);
  const parType = new Map<string, { n: number; depasses: number }>();
  for (const x of file) {
    const c = parType.get(x.libelle) ?? { n: 0, depasses: 0 };
    parType.set(x.libelle, { n: c.n + 1, depasses: c.depasses + (x.sla === 'depasse' ? 1 : 0) });
  }
  return (
    <main className="grid gap-6 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <div>
        <p className="m-0 text-sm text-neutre-700">{formatDate(maintenant, 'long')}</p>
        <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Tableau de bord</h1>
      </div>
      <ul
        aria-label="Indicateurs"
        className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-5"
      >
        <Indicateur
          l="Demandes reçues"
          v={formatNombre(t.demandes30j)}
          s={`30 jours · ${t.demandesAujourdhui} aujourd’hui`}
        />
        <Indicateur
          l="Artisans en ligne"
          v={formatNombre(t.artisansEnLigne)}
          s="fiches visibles dans l’annuaire"
        />
        <Indicateur
          l="Appels d’offres sans preneur"
          v={formatNombre(t.appelsOffresSansPreneur)}
          s="depuis plus de 48 h"
        />
        <Indicateur l="À traiter" v={formatNombre(file.length)} s="tâches de votre file" />
        {t.chiffreAffairesHt30j !== null ? (
          <Indicateur
            l="Chiffre d’affaires HT"
            v={formatEuros(t.chiffreAffairesHt30j, { decimales: 'jamais' })}
            s="30 jours · abonnements et appels d’offres"
          />
        ) : null}
      </ul>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="rounded-[14px] border border-trait bg-blanc p-4">
          <BarresDemandes jours={t.demandesParJour} />
        </section>
        <section
          aria-labelledby="urgences"
          className="grid content-start gap-3 rounded-[14px] border border-trait bg-blanc p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="urgences" className="m-0 text-lg">
              À traiter maintenant
            </h2>
            <Link
              href={routes.adminSection('file')}
              className={bouton({ variant: 'secondaire', taille: 'sm' })}
            >
              Ouvrir la file
            </Link>
          </div>
          {parType.size ? (
            <ul className="m-0 grid list-none gap-2 p-0">
              {[...parType].map(([libelle, c]) => (
                <li key={libelle} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {libelle}
                    {c.depasses ? (
                      <span className="text-danger"> · {c.depasses} hors délai</span>
                    ) : null}
                  </span>
                  <strong>{c.n}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-neutre-700">Rien à traiter pour votre rôle.</p>
          )}
        </section>
      </div>
      <section
        aria-labelledby="sante"
        className="grid gap-2 rounded-[14px] border border-trait bg-blanc p-4"
      >
        <h2 id="sante" className="m-0 text-lg">
          Santé technique
        </h2>
        <p className="m-0 text-sm">
          Webhooks Stripe :{' '}
          {t.sante.dernierEvenementStripe
            ? `dernier traité ${formatRelatif(t.sante.dernierEvenementStripe, maintenant)}`
            : 'aucun événement reçu'}
          {t.sante.evenementsStripeEnEchec
            ? ` · ${t.sante.evenementsStripeEnEchec} en échec`
            : ' · aucun échec'}
        </p>
        <p className="m-0 text-sm">
          Emails et SMS (7 jours) : {formatNombre(t.sante.envois7j)} envois ·{' '}
          {t.sante.envoisEnEchec7j} en échec
        </p>
      </section>
    </main>
  );
}
