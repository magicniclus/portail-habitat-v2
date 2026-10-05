/** Valeurs de `demandes.delaiSouhaite` et leur libellé. */
export const DELAIS = [
  { valeur: 'asap', libelle: 'Dès que possible' },
  { valeur: '1mois', libelle: 'Sous 1 mois' },
  { valeur: '3mois', libelle: 'Sous 3 mois' },
  { valeur: 'renseignement', libelle: 'Je me renseigne' },
] as const;

export const libelleDelai = (valeur: string): string =>
  DELAIS.find((d) => d.valeur === valeur)?.libelle ?? '';
