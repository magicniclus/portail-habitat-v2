import { LIBELLES_TYPE_FACTURE } from '@ph/core/devis';
import { formatDate } from '@ph/core/format';
import type { DevisResume, FactureResume } from '@ph/firebase/devis';
import { EmptyState } from '@ph/ui';
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
import { ActionsLigneFacture } from './liste/ActionsLigneFacture';
import { StatutFactureListe } from './liste/StatutFactureListe';
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
  peutGerer,
  aujourdHui,
}: {
  factures: FactureResume[];
  creer?: ReactNode;
  peutGerer: boolean;
  /** Jour (AAAA-MM-JJ) proposé pour un paiement. */
  aujourdHui: string;
}) {
  const numeros = new Map(factures.map((f) => [f.id, f.numero]));
  const lien = (f: FactureResume) =>
    f.type === 'avoir' && f.factureOrigineId
      ? `avoir annulant la facture ${numeros.get(f.factureOrigineId) ?? ''}`.trim()
      : f.avoirId
        ? `facture annulée par l’avoir ${numeros.get(f.avoirId) ?? ''}`.trim()
        : '';
  return (
    <TableauDocuments
      libelle="Factures"
      creer={creer}
      vide={
        <EmptyState titre="Aucune facture">
          Une facture se crée depuis un devis accepté, en un clic, ou avec « Nouvelle facture ».
        </EmptyState>
      }
      lignes={factures.map((f) => {
        const brouillon = f.statut === 'brouillon';
        return {
          id: f.id,
          href: brouillon ? routes.proModifierFacture(f.id) : routes.proFactureClient(f.id),
          date: f.creeLe,
          icone: <FileTextIcon size={20} aria-label={LIBELLES_TYPE_FACTURE[f.type]} />,
          numero: f.numero || `${LIBELLES_TYPE_FACTURE[f.type]} (brouillon)`,
          client: f.client,
          objet: [
            LIBELLES_TYPE_FACTURE[f.type],
            f.objet,
            lien(f),
            f.echeanceLe && f.type !== 'avoir' && !f.annulee
              ? `échéance ${formatDate(f.echeanceLe)}`
              : '',
          ]
            .filter(Boolean)
            .join(' · '),
          htCentimes: f.htCentimes,
          ttcCentimes: f.ttcCentimes,
          negatif: f.type === 'avoir',
          statut: (
            <StatutFactureListe
              factureId={f.id}
              numero={f.numero}
              statut={f.statut}
              type={f.type}
              annulee={f.annulee}
              resteCentimes={f.resteCentimes}
              peutGerer={peutGerer}
              aujourdHui={aujourdHui}
            />
          ),
          action: `${brouillon ? 'Modifier' : 'Ouvrir'} la facture ${f.numero || 'brouillon'}`,
          iconeAction: brouillon ? (
            <PencilSimpleIcon size={20} aria-hidden="true" />
          ) : (
            <EyeIcon size={20} aria-hidden="true" />
          ),
          menu: peutGerer ? <ActionsLigneFacture f={f} /> : null,
        };
      })}
    />
  );
}
