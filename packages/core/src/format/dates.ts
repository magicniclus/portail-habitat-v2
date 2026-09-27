const FUSEAU = 'Europe/Paris';

export type DateEntree = Date | number | string | { toDate(): Date };
export type StyleDate = 'court' | 'long' | 'moisAnnee' | 'dateHeure';

const formateurs: Record<Exclude<StyleDate, 'dateHeure'> | 'heure', Intl.DateTimeFormat> = {
  court: new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, dateStyle: 'short' }),
  long: new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, dateStyle: 'long' }),
  moisAnnee: new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, month: 'long', year: 'numeric' }),
  heure: new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, hour: '2-digit', minute: '2-digit' }),
};
const relatif = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

function versDate(entree: DateEntree): Date {
  const d =
    entree instanceof Date
      ? entree
      : typeof entree === 'object'
        ? entree.toDate()
        : new Date(entree);
  if (Number.isNaN(d.getTime())) throw new RangeError(`Date invalide : ${String(entree)}`);
  return d;
}

/** Date affichée en français, toujours dans le fuseau de Paris. */
export function formatDate(entree: DateEntree, style: StyleDate = 'court'): string {
  const d = versDate(entree);
  if (style === 'dateHeure') return `${formateurs.court.format(d)} à ${formateurs.heure.format(d)}`;
  return formateurs[style].format(d);
}

const MINUTE = 60_000;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;

/** « il y a 5 minutes », « hier »… ; au-delà de 7 jours, la date courte. */
export function formatRelatif(entree: DateEntree, maintenant: DateEntree = new Date()): string {
  const ecart = versDate(entree).getTime() - versDate(maintenant).getTime();
  const abs = Math.abs(ecart);
  if (abs < MINUTE) return 'à l’instant';
  if (abs < HEURE) return relatif.format(Math.round(ecart / MINUTE), 'minute');
  if (abs < JOUR) return relatif.format(Math.round(ecart / HEURE), 'hour');
  if (abs < 7 * JOUR) return relatif.format(Math.round(ecart / JOUR), 'day');
  return formatDate(entree);
}
