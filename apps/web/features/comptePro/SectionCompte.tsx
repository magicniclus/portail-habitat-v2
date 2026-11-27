import type { ReactNode } from 'react';

/** Section de Mon compte, atteignable par ancre (`#securite` depuis la facturation, CON-02). */
export function SectionCompte({
  id,
  titre,
  children,
}: {
  id: string;
  titre: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titre`} className="grid scroll-mt-24 gap-2">
      <h2 id={`${id}-titre`} className="m-0 text-xl">
        {titre}
      </h2>
      <div className="grid gap-3 rounded-[14px] border border-trait px-4.5 py-2">{children}</div>
    </section>
  );
}

export const SECTIONS_COMPTE = [
  ['profil', 'Profil'],
  ['securite', 'Sécurité'],
  ['appareils', 'Appareils'],
  ['notifications', 'Notifications'],
  ['donnees', 'Mes données'],
] as const;
