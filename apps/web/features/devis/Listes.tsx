import { LIBELLES_STATUT_FACTURE, LIBELLES_TYPE_FACTURE, tonStatut } from '@ph/core/devis';
import { formatDate } from '@ph/core/format';
import type { DevisResume, FactureResume } from '@ph/firebase/devis';
import { Badge, EmptyState } from '@ph/ui';
import {
  ArchiveIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  FileTextIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  XCircleIcon,
} from '@phosphor-icons/react/ssr';
import type { ReactNode } from 'react';
import { routes } from '@/lib/routes';
import { ActionsLigneDevis } from './liste/ActionsLigneDevis';
import { StatutDevisListe } from './liste/StatutDevisListe';
import { TableauDocuments } from './liste/TableauDocuments';

const ICONES: Record<string, ReactNode> = {
  brouillon: <PencilSimpleIcon size={20} aria-label="Brouillon" />,
  envoye: <PaperPlaneTiltIcon size={20} aria-label="Envoyé" />,
  accepte: <CheckCircleIcon size={20} weight="fill" className="text-succes" aria-label="Accepté" />,
  refuse: <XCircleIcon size={20} weight="fill" className="text-danger" aria-label="Refusé" />,
  expire: <ClockIcon size={20} aria-label="Expiré" />,
  archive: <ArchiveIcon size={20} aria-label="Archivé" />,
};

export function ListeDevis({
  devis,
  peutGerer,
  creer,
}: {
  devis: DevisResume[];
  peutGerer: boolean;
  creer?: ReactNode;
}) {
  return (
    <TableauDocuments
      libelle="Devis"
      creer={creer}
      vide={
        <EmptyState titre="Aucun devis pour l’instant">
          Créez votre premier devis : les mentions obligatoires sont vérifiées pour vous.
        </EmptyState>
      }
      lignes={devis.map((d) => {
        const brouillon = d.statut === 'brouillon' && peutGerer;
        return {
          id: d.id,
          href: brouillon ? routes.proModifierDevis(d.id) : routes.proUnDevis(d.id),
          date: d.creeLe,
          icone: ICONES[d.statut] ?? <FileTextIcon size={20} aria-hidden="true" />,
          numero: d.numero,
          client: d.client,
          objet: d.objet,
          htCentimes: d.htCentimes,
          ttcCentimes: d.ttcCentimes,
          statut: (
            <StatutDevisListe
              devisId={d.id}
              numero={d.numero}
              statut={d.statut}
              peutGerer={peutGerer}
            />
          ),
          action: `${brouillon ? 'Modifier' : 'Ouvrir'} le devis ${d.numero || 'brouillon'}`,
          menu: peutGerer ? (
            <ActionsLigneDevis devisId={d.id} numero={d.numero} statut={d.statut} aPdf={d.aPdf} />
          ) : null,
          iconeAction: brouillon ? (
            <PencilSimpleIcon size={20} aria-hidden="true" />
          ) : (
            <EyeIcon size={20} aria-hidden="true" />
          ),
        };
      })}
    />
  );
}

export function ListeFactures({
  factures,
  creer,
}: {
  factures: FactureResume[];
  creer?: ReactNode;
}) {
  return (
    <TableauDocuments
      libelle="Factures"
      creer={creer}
      vide={
        <EmptyState titre="Aucune facture">
          Une facture se crée depuis un devis accepté, en un clic, ou avec « Nouvelle facture ».
        </EmptyState>
      }
      lignes={factures.map((f) => ({
        id: f.id,
        href: routes.proFactureClient(f.id),
        date: f.creeLe,
        icone: <FileTextIcon size={20} aria-label={LIBELLES_TYPE_FACTURE[f.type]} />,
        numero: f.numero,
        client: f.client,
        objet: [
          LIBELLES_TYPE_FACTURE[f.type],
          f.objet,
          f.echeanceLe && f.type !== 'avoir' ? `échéance ${formatDate(f.echeanceLe)}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
        htCentimes: f.htCentimes,
        ttcCentimes: f.ttcCentimes,
        negatif: f.type === 'avoir',
        statut: (
          <Badge tone={f.annulee ? 'neutre' : tonStatut(f.statut)}>
            {f.annulee
              ? 'Annulée par avoir'
              : (LIBELLES_STATUT_FACTURE[f.statut as keyof typeof LIBELLES_STATUT_FACTURE] ??
                f.statut)}
          </Badge>
        ),
        action: `Ouvrir la facture ${f.numero}`,
        iconeAction: <EyeIcon size={20} aria-hidden="true" />,
      }))}
    />
  );
}
