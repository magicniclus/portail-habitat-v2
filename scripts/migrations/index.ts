import type { Migration } from '@ph/firebase/migrations';

/**
 * Registre des migrations (EXPLOITATION §2), dans l'ordre. Une migration = un fichier
 * `NNN-description.ts` qui exporte une `Migration`, ajouté ici ; jamais modifiée une fois lancée.
 */
export const MIGRATIONS: Migration[] = [];
