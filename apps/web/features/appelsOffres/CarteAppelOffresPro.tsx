import type { CarteAppelOffres } from '@ph/core/leads';
import { Badge, Button, bouton, type Tone } from '@ph/ui';
import { LockSimpleIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { routes } from '@/lib/routes';

const TONS: Record<CarteAppelOffres['badge']['ton'], Tone> = {
  urgent: 'danger',
  premium: 'premium',
  normal: 'accent',
};

/** Un appel d'offres anonymisé (maquette « Appels d Offres ») : coordonnées après déblocage. */
export function CarteAppelOffresPro({
  c,
  peutDebloquer,
  ouvrir,
}: {
  c: CarteAppelOffres;
  /** PRO-04 : sans droit de dépense, pas de bouton « Débloquer ». */
  peutDebloquer: boolean;
  ouvrir: () => void;
}) {
  const reserve = c.etat === 'reserve';
  return (
    <li
      className="grid gap-3.5 rounded-[16px] border border-trait bg-blanc p-5 data-[reserve=true]:border-neutre-400 data-[reserve=true]:bg-neutre-100"
      data-reserve={reserve}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-[17px] leading-snug">{c.titre}</h3>
            <Badge tone={TONS[c.badge.ton]}>{c.badge.texte}</Badge>
          </div>
          <p className="m-0 text-[13px] text-neutre-700">
            {c.lieu}
            {c.distance ? ` · ${c.distance}` : ''} · publié {c.publie}
          </p>
        </div>
        <p className="m-0 grid text-right">
          <strong className="text-[17px]">{c.budget}</strong>
          <span className="text-[13px] text-neutre-700">budget estimé</span>
        </p>
      </div>
      <p className="m-0 text-sm text-neutre-800">{c.resume}</p>
      <ul aria-label="Caractéristiques" className="m-0 flex list-none flex-wrap gap-2 p-0">
        {c.tags.map((t) => (
          <li key={t}>
            <Badge tone="neutre">{t}</Badge>
          </li>
        ))}
      </ul>
      <p className="m-0 text-[13px] font-semibold text-neutre-800">{c.places}</p>
      <div className="flex flex-wrap items-center gap-2">
        {c.etat === 'debloque' ? (
          <Link href={routes.proDemandes} className={bouton({ variant: 'secondaire' })}>
            Voir les coordonnées dans Mes demandes
          </Link>
        ) : null}
        {c.etat === 'complet' ? (
          <p className="m-0 text-sm text-neutre-700">Toutes les places ont été prises.</p>
        ) : null}
        {reserve ? (
          <>
            <Link href={routes.proAbonnementPremium} className={bouton({})}>
              <LockSimpleIcon aria-hidden="true" /> Débloquer avec Premium
            </Link>
            {c.disponibleDans ? (
              <span className="text-[13px] text-neutre-700">{c.disponibleDans}</span>
            ) : null}
          </>
        ) : null}
        {c.etat === 'ouvert' && peutDebloquer ? (
          <Button onClick={ouvrir}>Répondre à cet appel d’offres · {c.textePrix}</Button>
        ) : null}
        {c.etat === 'ouvert' && !peutDebloquer ? (
          <p className="m-0 text-sm text-neutre-700">
            Demandez à un responsable de l’entreprise de débloquer ce chantier.
          </p>
        ) : null}
      </div>
    </li>
  );
}
