import type { ReactNode } from 'react';
import { EnTeteStudio } from '@/features/studio/EnTeteStudio';

/** Pages du Studio (vidéos, idées, calendrier, résultats, réseaux, studio de montage). */
export default function LayoutStudio({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-w-0 content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <EnTeteStudio />
      {children}
    </main>
  );
}
