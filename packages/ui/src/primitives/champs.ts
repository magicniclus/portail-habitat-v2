import type { InputHTMLAttributes } from 'react';

/** Types de champ de MOBILE.md §5 : clavier, remplissage automatique et majuscules adaptés. */
export type TypeChamp =
  | 'tel'
  | 'email'
  | 'codePostal'
  | 'prenom'
  | 'nom'
  | 'adresse'
  | 'siren'
  | 'montant'
  | 'codeSms'
  | 'motDePasseNouveau'
  | 'motDePasseActuel';

type Attributs = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode' | 'autoComplete' | 'autoCapitalize' | 'maxLength' | 'pattern' | 'spellCheck'
>;

export const ATTRIBUTS_CHAMP: Record<TypeChamp, Attributs> = {
  tel: { type: 'tel', inputMode: 'tel', autoComplete: 'tel' },
  email: {
    type: 'email',
    inputMode: 'email',
    autoComplete: 'email',
    autoCapitalize: 'off',
    spellCheck: false,
  },
  codePostal: {
    type: 'text',
    inputMode: 'numeric',
    autoComplete: 'postal-code',
    maxLength: 5,
    pattern: '\\d{5}',
  },
  prenom: { type: 'text', autoComplete: 'given-name', autoCapitalize: 'words' },
  nom: { type: 'text', autoComplete: 'family-name', autoCapitalize: 'words' },
  adresse: { type: 'text', autoComplete: 'street-address' },
  siren: { type: 'text', inputMode: 'numeric', autoComplete: 'off', maxLength: 11 },
  montant: { type: 'text', inputMode: 'decimal', autoComplete: 'off' },
  codeSms: {
    type: 'text',
    inputMode: 'numeric',
    autoComplete: 'one-time-code',
    maxLength: 6,
    pattern: '\\d{6}',
  },
  motDePasseNouveau: {
    type: 'password',
    autoComplete: 'new-password',
    autoCapitalize: 'off',
    spellCheck: false,
  },
  motDePasseActuel: {
    type: 'password',
    autoComplete: 'current-password',
    autoCapitalize: 'off',
    spellCheck: false,
  },
};
