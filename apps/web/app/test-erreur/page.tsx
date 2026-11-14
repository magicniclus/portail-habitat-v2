import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Déclenche une erreur serveur pour le test ERR-02 ; introuvable si la variable n'est pas posée. */
export default function TestErreur() {
  if (process.env.ACTIVER_ROUTE_TEST_ERREUR !== '1') notFound();
  throw new Error('Erreur volontaire (test ERR-02)');
}
