import type { DemandeCreee } from '@ph/core/demandes';
import { formatEuros, formatFourchette, formatTel } from '@ph/core/format';
import { arrondiAffichage } from '@ph/core/simulateur';
import { bouton, Button } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import type { Contact } from './EtapeCoordonnees';
import { LIBELLES_ACCES, type Chantier } from './types';

const TVA: Record<string, string> = {
  '5.5': '5,5 % (rénovation énergétique)',
  '20': '20 %',
};

/** Écran de résultat : l'estimation renvoyée par `creerDemande`, calculée côté serveur (SIM-01, SIM-08). */
export function Resultat({
  demande: d,
  contact,
  chantier,
  miseEnRelation,
  onRecommencer,
}: {
  demande: DemandeCreee;
  contact: Contact;
  chantier: Chantier;
  miseEnRelation: boolean;
  onRecommencer: () => void;
}) {
  const e = d.estimation;
  const fourchette = formatFourchette(
    arrondiAffichage(e.minCentimes),
    arrondiAffichage(e.maxCentimes),
  );
  const maxPoste = Math.max(1, ...e.postes.map((p) => p.maxCentimes));
  const postes = [
    ...e.postes.map((p) => ({
      label: p.label,
      montant: formatFourchette(arrondiAffichage(p.minCentimes), arrondiAffichage(p.maxCentimes)),
      largeur: Math.max(6, Math.round((p.maxCentimes / maxPoste) * 100)),
      aide: false,
    })),
    // Aides en négatif, plafonnées côté serveur (SIM-05).
    ...(e.aidesCentimes > 0
      ? [
          {
            label: "Aides estimées (MaPrimeRénov' + CEE)",
            montant: `− ${formatEuros(arrondiAffichage(e.aidesCentimes), { decimales: 'jamais' })}`,
            largeur: Math.max(6, Math.round((e.aidesCentimes / maxPoste) * 100)),
            aide: true,
          },
        ]
      : []),
  ];
  const donnees: [string, string][] = [
    ['Prestation', d.prestation.nom],
    ...d.reponsesLisibles.map((r) => [r.question, r.reponse] as [string, string]),
    ['Code postal', `${chantier.codePostal} ${d.ville}`],
    ['Accès', LIBELLES_ACCES[chantier.acces]],
    ['Estimation transmise', fourchette],
    ['Contact', `${contact.prenom} ${contact.nom}`],
    ['Email', contact.email],
    ['Téléphone', formatTel(contact.telephone)],
  ];

  return (
    <div className="mx-auto max-w-[760px] rounded-[18px] bg-blanc p-[clamp(24px,4vw,44px)] shadow-md">
      <p className="m-0 mb-1.5 text-[13px] tracking-[0.07em] text-accent-700 uppercase">
        Votre estimation · {d.prestation.nom}
      </p>
      <h1
        className="m-0 mb-2.5 text-[clamp(32px,4.4vw,50px)] leading-[1.05]"
        data-test="fourchette"
      >
        {fourchette}
      </h1>
      <p className="m-0 mb-6 max-w-[56ch] text-[15.5px] leading-6 text-neutre-800">
        Fourchette indicative pour {d.prestation.nom.toLowerCase()} dans le{' '}
        {chantier.codePostal.slice(0, 2)}. Fourniture et main-d&apos;œuvre comprises, TVA{' '}
        {TVA[String(e.tvaPourcent)] ?? '10 % (logement de plus de 2 ans)'}.
      </p>
      <ul className="m-0 mb-6 grid list-none gap-3 p-0">
        {postes.map((p) => (
          <li key={p.label}>
            <div
              className={`mb-1 flex justify-between gap-3.5 text-[15px] ${p.aide ? 'text-succes' : ''}`}
            >
              <span>{p.label}</span>
              <strong className="whitespace-nowrap">{p.montant}</strong>
            </div>
            <div aria-hidden="true" className="h-1.5 rounded-[3px] bg-accent-200">
              <span
                className={`block h-full rounded-[3px] ${p.aide ? 'bg-succes' : 'bg-accent'}`}
                style={{ width: `${p.largeur}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="mb-6 rounded-[12px] bg-accent-100 px-4.5 py-4">
        <p className="m-0 mb-2 text-[14.5px] font-bold">Ce qui fait varier le prix chez vous</p>
        <ul className="m-0 grid gap-1.5 pl-4.5 text-sm leading-[22px] text-neutre-800">
          <li>L&apos;état réel découvert à la dépose peut faire varier le devis de 10 à 15 %.</li>
          <li>{e.noteRegion}</li>
          <li>La disponibilité des artisans en haute saison (printemps, automne) tend les prix.</li>
        </ul>
      </div>
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
          Merci {contact.prenom}. Le détail part à l&apos;instant sur{' '}
          <strong>{contact.email}</strong>.{' '}
          {miseEnRelation
            ? "Jusqu'à 3 artisans vérifiés vous répondent sous 48 h."
            : 'Aucun artisan ne reçoit vos coordonnées.'}
        </p>
      </div>
      <div className="mb-6 overflow-hidden rounded-[14px] border border-trait">
        <p className="m-0 bg-accent-100 px-4.5 py-3 text-sm font-bold text-accent-800">
          Données transmises · demande n° <span data-test="reference">{d.reference}</span>
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
        <Link href={routes.demandeParticulier(d.demandeId)} className={bouton({ taille: 'lg' })}>
          Suivre ma demande
        </Link>
        <Button variant="secondaire" taille="lg" onClick={onRecommencer}>
          Simuler un autre projet
        </Button>
      </div>
    </div>
  );
}
