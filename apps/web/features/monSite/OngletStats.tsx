import { formatNombre } from '@ph/core/format';
import { FenetreOffre } from '@/features/offres/FenetreOffre';
import type { LignePage, StatsDuSite } from '@/server/sites';
import { BarresVisites } from './BarresVisites';

const jour = (cle: string) =>
  cle
    ? new Date(`${cle}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : '';
const mois = (cle: string) =>
  cle
    ? new Date(`${cle}-15T12:00:00Z`).toLocaleDateString('fr-FR', {
        month: 'short',
        year: 'numeric',
      })
    : '';

function Chiffre({ libelle, valeur, note }: { libelle: string; valeur: string; note: string }) {
  return (
    <div className="grid gap-1 rounded-[12px] border border-trait bg-blanc p-4">
      <span className="text-sm text-neutre-800">{libelle}</span>
      <strong className="text-[28px] leading-none tabular-nums">{valeur}</strong>
      <span className="text-sm text-neutre-800">{note}</span>
    </div>
  );
}

/** Onglet Statistiques (SITE_INTERNET §3) : mesure sans cookie, 30 jours ; 12 mois avec Site Pro. */
export function OngletStats({
  stats,
  pages,
  sitePro,
}: {
  stats: StatsDuSite;
  pages: LignePage[];
  sitePro: boolean;
}) {
  const t = stats.jours.totaux;
  const nom = new Map(pages.map((p) => [p.id, p.nom]));
  return (
    <section aria-labelledby="stats-site" className="grid gap-5">
      <div>
        <h2 id="stats-site" className="m-0 text-xl">
          Statistiques du site
        </h2>
        <p className="m-0 text-[15px] text-neutre-800">
          Mesure sans cookie : aucun bandeau à afficher à vos visiteurs. 30 derniers jours.
        </p>
      </div>
      <div className="grid gap-3 min-[640px]:grid-cols-3">
        <Chiffre libelle="Visites" valeur={formatNombre(t.vues)} note="pages vues" />
        <Chiffre libelle="Demandes" valeur={formatNombre(t.demandes)} note="formulaires envoyés" />
        <Chiffre
          libelle="Taux de demande"
          valeur={`${formatNombre(t.taux * 100, 1)} %`}
          note="demandes / visites"
        />
      </div>
      <BarresVisites titre="Visites par jour" serie={stats.jours.serie} libelle={jour} />
      {stats.jours.pages.length ? (
        <div className="grid gap-2">
          <h3 className="m-0 text-lg">Pages les plus vues</h3>
          <ol className="m-0 grid list-none gap-1 p-0">
            {stats.jours.pages.map((p) => (
              <li
                key={p.pageId}
                className="flex justify-between gap-3 border-b border-trait py-2 text-[15px]"
              >
                <span>{nom.get(p.pageId) ?? 'Page supprimée'}</span>
                <span className="tabular-nums">{formatNombre(p.vues)}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {stats.mois ? (
        <BarresVisites titre="Visites par mois (12 mois)" serie={stats.mois.serie} libelle={mois} />
      ) : sitePro ? null : (
        <div className="grid gap-3 rounded-2xl border border-accent-300 bg-accent-100 p-5">
          <p className="m-0 text-[15px]">
            Avec Site Pro, suivez vos visites sur 12 mois et recevez un SMS à chaque demande.
          </p>
          <div>
            <FenetreOffre
              formule="site_pro"
              raison="Les statistiques sur 12 mois sont incluses dans Site Pro."
            >
              Voir 12 mois de statistiques
            </FenetreOffre>
          </div>
        </div>
      )}
    </section>
  );
}
