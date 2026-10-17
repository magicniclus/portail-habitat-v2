import { formatFourchette, formatTel } from '@ph/core/format';
import type { DossierCree } from '@ph/firebase/demandes';
import { bouton, Button } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { libelle, MOTIFS_BIEN, PERIODES_BIEN, TYPES_BIEN, type Bien } from './types';

/** Arrondi d'affichage de la maquette : 5 € près. */
const arrondi5 = (c: number) => Math.round(c / 500) * 500;
const fourchette = (min: number, max: number) => formatFourchette(arrondi5(min), arrondi5(max));

/** Étape 4 : budget et prix par diagnostic renvoyés par `creerDossierDiag` (DIA-04, DIA-06). */
export function ResultatDiag({
  dossier: d,
  bien,
  resumeBien,
  contact,
  onRecommencer,
}: {
  dossier: DossierCree;
  bien: Bien;
  resumeBien: string;
  contact: { nom: string; email: string; telephone: string };
  onRecommencer: () => void;
}) {
  const total = d.aRealiser
    ? fourchette(d.estimation.minCentimes, d.estimation.maxCentimes)
    : 'Aucun diagnostic à réaliser';
  const resume = d.aRealiser
    ? `${d.aRealiser} diagnostic${d.aRealiser > 1 ? 's' : ''} à réaliser` +
      (d.reutilises
        ? `, ${d.reutilises} rapport${d.reutilises > 1 ? 's' : ''} réutilisé${d.reutilises > 1 ? 's' : ''}`
        : '') +
      (d.estimation.remisePack
        ? '. Tarif pack appliqué, une seule visite sur place.'
        : '. Une seule visite sur place.')
    : 'Vos rapports couvrent déjà les obligations pour ce motif.';
  const donnees: [string, string][] = [
    ['Adresse', bien.adresse],
    ['Commune', `${d.communeNom} (${bien.codePostal})`],
    ['Bien', `${libelle(TYPES_BIEN, bien.type)} · ${bien.surface} m²`],
    ['Construction', libelle(PERIODES_BIEN, bien.periode)],
    ['Motif', libelle(MOTIFS_BIEN, bien.motif)],
    ['Diagnostics à réaliser', String(d.aRealiser)],
    ['Rapports réutilisés', String(d.reutilises)],
    ['Budget estimé', total],
    ['Contact', contact.nom],
    ['Téléphone', formatTel(contact.telephone)],
  ];
  return (
    <div className="mx-auto max-w-[720px] rounded-[18px] bg-blanc p-[clamp(24px,4vw,44px)] shadow-md">
      <p className="m-0 mb-1.5 text-[13px] tracking-[0.07em] text-accent-700 uppercase">
        Votre budget diagnostics · {resumeBien}
      </p>
      <h1 className="m-0 mb-2.5 text-[clamp(32px,4.4vw,50px)] leading-[1.05]" data-test="budget">
        {total}
      </h1>
      <p className="m-0 mb-5 max-w-[56ch] text-[15.5px] leading-6 text-neutre-800">{resume}</p>
      <ul className="m-0 mb-6 list-none overflow-hidden rounded-[14px] border border-trait p-0">
        {d.resultat.map((l) => (
          <li
            key={l.diagId}
            className="flex justify-between gap-4 border-t border-trait px-4.5 py-3 text-[15px] leading-[22px] first:border-t-0"
          >
            <span>{l.nom}</span>
            <strong
              className={`whitespace-nowrap ${l.statut === 'deja_valide' ? 'text-neutre-700' : ''}`}
            >
              {l.statut === 'deja_valide'
                ? 'Rapport réutilisé'
                : fourchette(l.prixMinCentimes, l.prixMaxCentimes)}
            </strong>
          </li>
        ))}
      </ul>
      <div
        role="status"
        className="mb-6 flex items-start gap-3 rounded-[12px] border border-accent-300 px-4.5 py-4"
      >
        <span
          aria-hidden="true"
          className="grid size-7 flex-none place-items-center rounded-pill bg-accent font-bold text-blanc"
        >
          ✓
        </span>
        <p className="m-0 text-[15.5px] leading-6">
          Le dossier part sur <strong>{contact.email}</strong>. Trois diagnostiqueurs certifiés
          intervenant à {d.communeNom} peuvent vous rappeler sous 48 h.
        </p>
      </div>
      <div className="mb-6 overflow-hidden rounded-[14px] border border-trait">
        <p className="m-0 bg-accent-100 px-4.5 py-3 text-sm font-bold text-accent-800">
          Données transmises · dossier n° <span data-test="reference">{d.reference}</span>
        </p>
        <dl className="m-0 grid">
          {donnees.map(([l, v]) => (
            <div
              key={l}
              className="flex justify-between gap-4 border-t border-trait px-4.5 py-2.5 text-sm leading-[21px]"
            >
              <dt className="text-neutre-700">{l}</dt>
              <dd className="m-0 min-w-0 text-right font-bold [overflow-wrap:anywhere]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href={routes.demandeParticulier(d.dossierId)} className={bouton({ taille: 'lg' })}>
          Suivre mon dossier
        </Link>
        <Button variant="secondaire" taille="lg" onClick={onRecommencer}>
          Nouveau bien
        </Button>
      </div>
    </div>
  );
}
