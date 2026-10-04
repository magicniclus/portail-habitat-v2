/** RGPD (ADMIN §2.13) : délai légal d'un mois pour répondre à une demande. */
export function echeanceRgpd(recueLe: number): number {
  const d = new Date(recueLe);
  const cible = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  const dernierJour = new Date(
    Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return Date.UTC(
    cible.getUTCFullYear(),
    cible.getUTCMonth(),
    Math.min(d.getUTCDate(), dernierJour),
    d.getUTCHours(),
    d.getUTCMinutes(),
  );
}

export const joursRestants = (echeance: number, maintenant: number) =>
  Math.ceil((echeance - maintenant) / 86_400_000);

export const LIBELLES_TYPE_RGPD = {
  acces: 'Accès (export)',
  portabilite: 'Portabilité (export)',
  rectification: 'Rectification',
  effacement: 'Effacement',
  opposition: 'Opposition',
} as const;
