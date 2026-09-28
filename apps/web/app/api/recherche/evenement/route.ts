import { entreeEvenementRecherche } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { journaliserRecherche } from '@ph/firebase/support';
import { getFirestore } from 'firebase-admin/firestore';
import { action } from '@/server/action';
import { memeOrigine } from '@/server/origine';

export const dynamic = 'force-dynamic';

const TAILLE_MAX = 1024;

const enregistrer = action(
  {
    schema: entreeEvenementRecherche,
    nom: 'journaliserRecherche',
    authentification: 'facultative',
    // Mesure d'usage sans donnée personnelle, envoyée en `keepalive` sans jeton App Check (lot 8) ;
    // même origine exigée et débit limité par client.
    appCheck: false,
    rateLimit: { cle: 'recherche-evenement', max: 120, fenetre: '1h' },
  },
  async (e) => journaliserRecherche({ db: getFirestore(appAdmin()), horloge: Date.now }, e),
);

/** Événements `recherche_*` (RECHERCHE §5). Réponse vide dans tous les cas : rien à exploiter côté client. */
export async function POST(requete: Request) {
  if (!memeOrigine(requete)) return new Response(null, { status: 403 });
  const texte = await requete.text();
  if (texte.length > TAILLE_MAX) return new Response(null, { status: 413 });
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return new Response(null, { status: 400 });
  }
  const r = await enregistrer(brut);
  return new Response(null, { status: r.ok ? 204 : 400 });
}
