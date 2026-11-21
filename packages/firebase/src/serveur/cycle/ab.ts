import { gagnantAB, SEQUENCES_DEFAUT, type EtapeSequence } from '@ph/core/conversion';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { enregistrerSequenceAdmin } from '../admin/conversion';

const J = 86_400_000;
const ENVOYES = ['envoye', 'delivre', 'ouvert', 'clic'];

/**
 * `cycleTestsAB` (lundi) : pour chaque étape de séquence en test A/B, compare le taux de clic des
 * variantes sur 60 jours ; dès qu'une variante gagne à 95 %, la séquence ne garde qu'elle (nouvelle
 * version et audit, comme une modification depuis l'admin).
 */
export async function evaluerTestsAB(s: {
  db: Firestore;
  horloge: () => number;
}): Promise<{ tests: number; basculees: string[] }> {
  const maintenant = s.horloge();
  const docs = await s.db.collection(collections.sequences).get();
  const lues = new Map(docs.docs.map((d) => [d.id, d]));
  const sequences = [...new Set([...Object.keys(SEQUENCES_DEFAUT), ...lues.keys()])]
    .filter((id) => lues.get(id)?.get('supprimee') !== true)
    .map((id) => {
      const d = lues.get(id);
      const defaut = SEQUENCES_DEFAUT[id];
      return {
        id,
        nom: (d?.get('nom') as string | undefined) ?? defaut!.nom,
        etapeEntree: (d?.get('etapeEntree') as string | undefined) ?? defaut!.etapeEntree,
        objectif: (d?.get('objectif') as string | undefined) ?? defaut!.objectif,
        actif: d ? d.get('actif') === true : true,
        etapes: (d?.get('etapes') as EtapeSequence[] | undefined) ?? defaut!.etapes,
      };
    });
  let tests = 0;
  const basculees: string[] = [];
  for (const seq of sequences)
    for (const [i, etape] of seq.etapes.entries()) {
      if ((etape.ab?.length ?? 0) < 2) continue;
      tests++;
      const emails = await s.db
        .collection(collections.emails)
        .where('modele', '==', etape.modele)
        .where('createdAt', '>=', Timestamp.fromMillis(maintenant - 60 * J))
        .get();
      const stats = etape.ab!.map((variante) => {
        const lot = emails.docs.filter(
          (d) => d.get('variante') === variante && ENVOYES.includes(d.get('statut') as string),
        );
        return { variante, envois: lot.length, clics: lot.filter((d) => d.get('cliqueLe')).length };
      });
      const gagnante = gagnantAB(stats);
      if (!gagnante) continue;
      await enregistrerSequenceAdmin(s, {
        acteurUid: 'moteur-ab',
        motif: `Test A/B « ${etape.modele} » : variante ${gagnante} gagnante (95 %)`,
        sequence: {
          ...seq,
          etapes: seq.etapes.map((x, j) => (j === i ? { ...x, ab: [gagnante] } : x)),
        },
      });
      basculees.push(`${seq.id}:${etape.modele}:${gagnante}`);
    }
  return { tests, basculees };
}
