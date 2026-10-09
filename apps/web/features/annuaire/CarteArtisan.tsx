import { BUDGETS_ANNUAIRE, LIBELLES_LABELS, libelleDisponibilite } from '@ph/core/annuaire';
import { formatFourchette, formatNombre, formatTel } from '@ph/core/format';
import type { ArtisanAnnuaire } from '@ph/firebase/annuaire';
import { bouton, NoteMoyenne } from '@ph/ui';
import Link from 'next/link';
import { initiales } from '@ph/core/format';
import { routes } from '@/lib/routes';

type Label = keyof typeof LIBELLES_LABELS;

const budget = (a: ArtisanAnnuaire) =>
  a.budgetMin !== undefined && a.budgetMax !== undefined
    ? formatFourchette(a.budgetMin, a.budgetMax)
    : (BUDGETS_ANNUAIRE.find((b) => b.v === a.budgetCle)?.libelle ?? null);

function Logo({ a, taille }: { a: ArtisanAnnuaire; taille: 'grand' | 'petit' }) {
  const classe =
    taille === 'grand'
      ? 'size-[76px] rounded-[14px]'
      : 'aspect-square w-full max-w-[104px] rounded-[10px]';
  return a.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- logos hébergés sur Storage, dimensions fixes
    <img
      src={a.logoUrl}
      alt=""
      width={104}
      height={104}
      loading="lazy"
      className={`${classe} border border-trait object-contain`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${classe} grid flex-none place-items-center bg-accent-100 text-xl font-bold text-accent-700`}
    >
      {initiales(a.nom)}
    </span>
  );
}

/**
 * Carte de l'annuaire (maquette) : Premium signalé (bordure or, bandeau, téléphone : ANN-03 et
 * ANN-06) ou standard compacte. Le téléphone ne vient que de la fiche publique (null sinon).
 */
export function CarteArtisan({ a, nomMetier }: { a: ArtisanAnnuaire; nomMetier: string }) {
  const dispo = libelleDisponibilite(a.delaiJ);
  const devis = routes.simulateurArtisan(a.id);
  const lieu = `${nomMetier} · ${a.ville} · ${formatNombre(a.km, 1)} km`;
  const profil = routes.ficheArtisan(a.slug);

  if (a.premium)
    return (
      <article
        aria-labelledby={`nom-${a.id}`}
        className="overflow-hidden rounded-[16px] border-[1.5px] border-premium bg-blanc shadow-md"
      >
        <p className="m-0 flex items-center gap-2 bg-premium-fond px-4 py-2 text-[12.5px] font-bold tracking-[0.04em] text-premium-texte uppercase">
          <span aria-hidden="true">★</span> Premium · vérifié, répond sous 24 h
        </p>
        <div className="flex flex-wrap items-start gap-4.5 p-4.5">
          <Logo a={a} taille="grand" />
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id={`nom-${a.id}`} className="m-0 mb-1 text-xl">
                  {a.nom}
                </h2>
                <p className="m-0 text-[14.5px] text-neutre-800">{lieu}</p>
              </div>
              <NoteMoyenne note={a.note} nbAvis={a.avis} className="text-[14.5px]" />
            </div>
            <p className="m-0 text-[14.5px] leading-[23px] text-neutre-800">{a.pitch}</p>
            <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-neutre-800">
              {dispo ? <span>{dispo}</span> : null}
              {a.labels.length ? (
                <span>{a.labels.map((l) => LIBELLES_LABELS[l as Label]).join(' · ')}</span>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2.5 pt-0.5">
              <Link href={profil} className={bouton()}>
                Voir le profil<span className="sr-only"> de {a.nom}</span>
              </Link>
              <Link href={devis} prefetch={false} className={bouton({ variant: 'secondaire' })}>
                Demander un devis<span className="sr-only"> à {a.nom}</span>
              </Link>
              {a.telephone ? (
                <a href={`tel:${a.telephone}`} className={bouton({ variant: 'fantome' })}>
                  <span className="sr-only">Appeler {a.nom} au </span>
                  {formatTel(a.telephone)}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    );

  const montant = budget(a);
  return (
    <article
      aria-labelledby={`nom-${a.id}`}
      className="grid grid-cols-[minmax(0,72px)_minmax(0,1fr)] gap-4 rounded-[14px] border border-trait bg-blanc p-4 hover:border-accent-300 sm:grid-cols-[minmax(0,104px)_minmax(0,1fr)]"
    >
      <Logo a={a} taille="petit" />
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id={`nom-${a.id}`} className="m-0 mb-0.5 text-[17.5px]">
              {a.nom}
            </h2>
            <p className="m-0 text-sm text-neutre-800">{lieu}</p>
          </div>
          <NoteMoyenne note={a.note} nbAvis={a.avis} court className="text-sm" />
        </div>
        <p className="m-0 text-sm leading-[22px] text-neutre-800">{a.pitch}</p>
        {a.labels.length ? (
          <ul aria-label="Labels vérifiés" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {a.labels.map((l) => (
              <li
                key={l}
                className="rounded-pill bg-neutre-100 px-2.5 py-1 text-xs font-semibold text-neutre-800"
              >
                {LIBELLES_LABELS[l as Label]}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 flex flex-wrap gap-x-3.5 text-[13px] text-neutre-800">
            {dispo ? <span>{dispo}</span> : null}
            {montant ? <span>{montant}</span> : null}
          </p>
          <span className="flex flex-wrap gap-2">
            <Link href={profil} className={bouton({ variant: 'secondaire' })}>
              Voir le profil<span className="sr-only"> de {a.nom}</span>
            </Link>
            <Link href={devis} prefetch={false} className={bouton()}>
              Devis<span className="sr-only"> : demander à {a.nom}</span>
            </Link>
            {a.telephone ? (
              <a href={`tel:${a.telephone}`} className={bouton({ variant: 'fantome' })}>
                <span className="sr-only">Appeler {a.nom} au </span>
                {formatTel(a.telephone)}
              </a>
            ) : null}
          </span>
        </div>
      </div>
    </article>
  );
}
