import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  COMMUNES,
  communeParSlug,
  descriptionCommune,
  faqCommune,
  titreCommune,
} from '@/features/diagnostic/communes';
import { enTeteDiag, piedDiag } from '@/features/diagnostic/navigation';
import { PageCommune } from '@/features/diagnostic/PageCommune';
import { EnTetePublic } from '@/features/vitrine/EnTetePublic';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { entrepriseLocale, faqPage, filAriane } from '@/features/vitrine/seo';
import { routes } from '@/lib/routes';

// DIA-05 : les 11 pages sont générées au build ; toute autre commune donne une 404 (notFound).
export const generateStaticParams = () => COMMUNES.map((c) => ({ commune: c.slug }));

type Props = { params: Promise<{ commune: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = communeParSlug((await params).commune);
  if (!c) return {};
  return {
    title: { absolute: `${titreCommune(c)} · Portail Habitat Diag` },
    description: descriptionCommune(c),
    alternates: { canonical: routes.diagnosticCommune(c.slug) },
  };
}

export default async function Commune({ params }: Props) {
  const c = communeParSlug((await params).commune);
  if (!c) notFound();
  const chemin = routes.diagnosticCommune(c.slug);
  return (
    <>
      <JsonLd donnees={faqPage(faqCommune(c.nom))} />
      <JsonLd
        donnees={filAriane([
          { nom: 'Diagnostic immobilier', chemin: routes.diagnostic },
          { nom: c.nom, chemin },
        ])}
      />
      <JsonLd
        donnees={entrepriseLocale({
          nom: `Portail Habitat Diag · ${c.nom}`,
          chemin,
          description: descriptionCommune(c),
          ville: c.nom,
          codePostal: c.cp,
          zone: [c.nom],
        })}
      />
      <EnTetePublic
        {...enTeteDiag}
        bandeau={undefined}
        liens={[{ libelle: 'Les diagnostics', href: enTeteDiag.liens[0]!.href }]}
        principal={{ ...enTeteDiag.principal, href: routes.diagnosticEstimationCommune(c.slug) }}
      />
      <PageCommune c={c} />
      <PiedPublic {...piedDiag} variantLogo="diag" mention="Données Insee 2023, prix indicatifs" />
    </>
  );
}
