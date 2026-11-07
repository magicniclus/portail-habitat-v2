import { sourceDemandes } from '@ph/core/schemas';
import { createHash, randomBytes } from 'node:crypto';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';

export interface ParametresSource {
  id: string;
  nom: string;
  ipAutorisees: string[];
  coutUnitaireCentimes: number;
  quotaJour: number;
  departementsCouverts: string[];
  versionConsentement: string;
  texteConsentementAttendu: string;
  mappingPrestations: Record<string, string>;
}

/**
 * Crée ou met à jour une source de demandes partenaire (DATABASE §4 bis). Une nouvelle clé API est
 * générée à la création ou sur demande (`nouvelleCle`) : seule son empreinte est enregistrée, la
 * clé n'est affichée qu'une fois. Les prestations du mapping doivent exister au référentiel.
 */
export async function enregistrerSource(
  s: { db: Firestore; horloge: () => number },
  p: ParametresSource,
  o: { nouvelleCle?: boolean } = {},
): Promise<{ cleApi: string | null }> {
  const ref = s.db.collection(collections.sourcesDemandes).doc(p.id);
  const existante = await ref.get();
  const inconnues = (
    await Promise.all(
      [...new Set(Object.values(p.mappingPrestations))].map(async (id) =>
        (await s.db.doc(chemins.prestationItem(id)).get()).exists ? null : id,
      ),
    )
  ).filter(Boolean);
  if (inconnues.length) throw new Error(`Prestations inconnues : ${inconnues.join(', ')}`);
  const cleApi = !existante.exists || o.nouvelleCle ? randomBytes(32).toString('base64url') : null;
  const maintenant = Timestamp.fromMillis(s.horloge());
  const doc = {
    schemaVersion: 1,
    nom: p.nom,
    ipAutorisees: p.ipAutorisees,
    coutUnitaireCentimes: p.coutUnitaireCentimes,
    quotaJour: p.quotaJour,
    departementsCouverts: p.departementsCouverts,
    versionConsentement: p.versionConsentement,
    texteConsentementAttendu: p.texteConsentementAttendu,
    mappingPrestations: p.mappingPrestations,
    actif: true,
    cleApiHash: cleApi
      ? createHash('sha256').update(cleApi).digest('hex')
      : (existante.get('cleApiHash') as string),
    createdAt: (existante.get('createdAt') as Timestamp | undefined) ?? maintenant,
    updatedAt: maintenant,
  };
  sourceDemandes.parse({
    ...doc,
    createdAt: doc.createdAt.toDate(),
    updatedAt: maintenant.toDate(),
  });
  await ref.set(doc);
  return { cleApi };
}
