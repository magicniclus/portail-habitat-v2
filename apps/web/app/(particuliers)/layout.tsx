import type { ReactNode } from 'react';
import { EspaceTheme } from '@/features/theme/Theme';

export default function ParticuliersLayout({ children }: { children: ReactNode }) {
  return <EspaceTheme theme="particulier">{children}</EspaceTheme>;
}
