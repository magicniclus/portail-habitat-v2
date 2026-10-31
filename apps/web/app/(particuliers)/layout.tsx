import type { ReactNode } from 'react';
import { EspaceTheme } from '@/features/theme/Theme';

export default function ParticuliersLayout({ children }: { children: ReactNode }) {
  return (
    <EspaceTheme theme="particulier">
      {/* Page courte (peu de résultats) : le contenu s'étire, le pied de page reste en bas. */}
      <div className="flex min-h-dvh flex-col [&>main]:flex-1">{children}</div>
    </EspaceTheme>
  );
}
