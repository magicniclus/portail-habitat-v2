import type { ClientCarnet } from '@ph/firebase/devis';

const plat = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Recherche dans la base clients : nom, ville, code postal, email (sans accents). */
export function filtrerClients(clients: ClientCarnet[], recherche: string): ClientCarnet[] {
  const q = plat(recherche.trim());
  if (!q) return clients;
  return clients.filter((c) =>
    plat([c.nom, c.ville, c.codePostal, c.email].filter(Boolean).join(' ')).includes(q),
  );
}
