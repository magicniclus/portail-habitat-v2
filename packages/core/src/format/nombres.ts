const formateurs = new Map<number, Intl.NumberFormat>();

/** « 2 400 », « 4,8 » : format français, `decimales` fixes (0 par défaut). */
export function formatNombre(n: number, decimales = 0): string {
  let f = formateurs.get(decimales);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    });
    formateurs.set(decimales, f);
  }
  return f.format(n);
}

/**
 * Preuve sociale sans surestimation : arrondi VERS LE BAS à la centaine ou au millier,
 * suivi de « + » quand l'arrondi a retiré quelque chose (« 2 000+ avis »).
 */
export function nombreArrondi(n: number): string {
  const pas = n >= 1000 ? 1000 : n >= 100 ? 100 : 1;
  const arrondi = Math.floor(n / pas) * pas;
  return formatNombre(arrondi) + (arrondi < n ? '+' : '');
}
