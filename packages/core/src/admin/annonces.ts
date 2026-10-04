/** Annonces in-app (ADMIN §2.11, `annonces`) : bandeau des espaces pro et particulier. */
export interface AnnonceLue {
  id: string;
  titre: string;
  texte: string;
  cible: 'particuliers' | 'pros' | 'tous';
  ton: 'info' | 'attention' | 'premium';
  actif: boolean;
  debut: number;
  fin?: number;
}

export function annoncesVisibles(
  annonces: readonly AnnonceLue[],
  public_: 'particuliers' | 'pros',
  maintenant: number,
): AnnonceLue[] {
  return annonces
    .filter(
      (a) =>
        a.actif &&
        a.debut <= maintenant &&
        (a.fin === undefined || a.fin > maintenant) &&
        (a.cible === 'tous' || a.cible === public_),
    )
    .sort((x, y) => y.debut - x.debut);
}

/** Minuit (heure de Paris) du jour « AAAA-MM-JJ », en ms ; heure d'été comprise. */
export function minuitParis(jour: string): number {
  const [a, m, j] = jour.split('-').map(Number) as [number, number, number];
  const minuitUtc = Date.UTC(a, m - 1, j);
  const heure = Number.parseInt(
    new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(minuitUtc),
    10,
  );
  return minuitUtc - heure * 3_600_000;
}
