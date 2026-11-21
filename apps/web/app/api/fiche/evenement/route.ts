import { estRobot } from '@ph/core/comportement';
import { entreeEvenementFiche } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { compterEvenementFiche } from '@ph/firebase/annuaire';
import { getFirestore } from 'firebase-admin/firestore';
import { actionMesure } from '@/server/action';
import { firestoreConfigure } from '@/server/lecture';
import { memeOrigine } from '@/server/origine';

export const dynamic = 'force-dynamic';

const compter = actionMesure(
  {
    schema: entreeEvenementFiche,
    nom: 'compterEvenementFiche',
    rateLimit: { cle: 'fiche-evenement', max: 200, fenetre: '1h' },
  },
  async (e) => compterEvenementFiche({ db: getFirestore(appAdmin()), horloge: Date.now }, e),
);

/**
 * Vue d'une fiche, clic sur le téléphone ou sur « Demander un devis » (`statsJour`) : compteur
 * anonyme, sans cookie ni identifiant ; robots écartés, même origine, débit limité.
 */
export async function POST(requete: Request) {
  if (!memeOrigine(requete)) return new Response(null, { status: 403 });
  // Robots, ou base indisponible (aperçus, tests sans émulateur) : rien à compter, jamais d'erreur.
  if (estRobot(requete.headers.get('user-agent')) || !firestoreConfigure())
    return new Response(null, { status: 204 });
  const texte = await requete.text();
  if (texte.length > 256) return new Response(null, { status: 413 });
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return new Response(null, { status: 400 });
  }
  const r = await compter(brut);
  // Une mesure qui échoue (base momentanément indisponible) ne gêne jamais le visiteur.
  return new Response(null, { status: r.ok || r.code === 'INDISPONIBLE' ? 204 : 400 });
}
