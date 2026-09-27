const NBSP = '\u00a0';

const formateurs = {
  avec: new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }),
  sans: new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }),
};

export interface OptionsEuros {
  /** `auto` (défaut) : décimales seulement s'il y a des centimes. */
  decimales?: 'auto' | 'toujours' | 'jamais';
  suffixe?: 'HT' | 'TTC';
}

/** Centimes entiers → « 1 290 € », « 79,90 € HT ». Seule fonction autorisée pour afficher un prix. */
export function formatEuros(centimes: number, options: OptionsEuros = {}): string {
  if (!Number.isSafeInteger(centimes)) {
    throw new RangeError(`Montant invalide : ${centimes} (entier de centimes attendu)`);
  }
  const { decimales = 'auto', suffixe } = options;
  const avecDecimales = decimales === 'toujours' || (decimales === 'auto' && centimes % 100 !== 0);
  const texte = (avecDecimales ? formateurs.avec : formateurs.sans).format(centimes / 100);
  return suffixe ? `${texte}${NBSP}${suffixe}` : texte;
}

/** Saisie utilisateur (« 79,90 », « 1 290 € ») → centimes entiers, ou `null` si illisible. */
export function parseEuros(saisie: string): number | null {
  const nettoye = saisie.replace(/[\s\u00a0\u202f]/g, '').replace(/€$/, '');
  const m = /^(-?)(\d+)(?:[.,](\d{1,2}))?$/.exec(nettoye);
  if (!m) return null;
  const [, signe, entiers = '', decimales = ''] = m;
  const centimes = Number(entiers) * 100 + Number(decimales.padEnd(2, '0'));
  return signe ? -centimes : centimes;
}
