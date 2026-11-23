import { plansPublicsOuverts } from '@/server/plansAcquisition';
import { EnTetePublic } from './EnTetePublic';
import { enTeteParticuliersPour, piedParticuliersPour } from './navigation';
import { PiedPublic } from './PiedPublic';

/** En-tête du site particuliers, avec « Plan 3D » quand Plans est ouvert au public. */
export async function EnTeteParticuliers() {
  return <EnTetePublic {...enTeteParticuliersPour(await plansPublicsOuverts())} />;
}

/** Pied de page du site particuliers, avec le lien Plans quand il est ouvert au public. */
export async function PiedParticuliers() {
  return <PiedPublic {...piedParticuliersPour(await plansPublicsOuverts())} />;
}
