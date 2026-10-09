import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { documentLegal, tousLesDocuments } from '@/features/legal/documents';
import { PageLegale } from '@/features/legal/PageLegale';
import { EspaceTheme } from '@/features/theme/Theme';
import { routes } from '@/lib/routes';

export const generateStaticParams = tousLesDocuments;

type Props = { params: Promise<{ public: string; doc: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const d = documentLegal(p.public, p.doc);
  if (!d) return {};
  return {
    title: {
      absolute: `${d.doc.titre} (${d.public === 'pro' ? 'professionnels' : 'particuliers'}) · Portail Habitat`,
    },
    description: d.doc.chapeau.slice(0, 170),
    alternates: { canonical: routes.legal(d.public, d.slug) },
  };
}

export default async function Legal({ params }: Props) {
  const p = await params;
  const d = documentLegal(p.public, p.doc);
  if (!d) notFound();
  return (
    <EspaceTheme theme={d.public === 'pro' ? 'pro' : 'particulier'}>
      <PageLegale {...d} />
    </EspaceTheme>
  );
}
