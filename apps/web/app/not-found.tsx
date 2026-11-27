import type { Metadata } from 'next';
import { PageIntrouvable } from '@/features/erreurs/PageIntrouvable';

export const metadata: Metadata = { title: 'Page introuvable', robots: { index: false } };

export default function Introuvable() {
  return <PageIntrouvable espace="particulier" />;
}
