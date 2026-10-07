import { ErreurMetier } from '@ph/core/erreurs';
import { jourIso } from '@ph/core/format';
import {
  controlerRedaction,
  coutCentimes,
  MODELE_DEFAUT,
  promptRedaction,
  QUOTA_REDACTION_JOUR,
  SCHEMA_JSON_REDACTION,
  sortieRedaction,
  type SortieRedaction,
} from '@ph/core/ia';
import type { EntreeRedactionIa } from '@ph/core/schemas';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import type { ClientIa } from './client';

/** Assistant de rédaction de Ma Fiche (IA_ADMIN §8) : Haiku, 900 jetons, 20 par jour et par entreprise. */
const J = 86_400_000;

export interface ServicesRedaction {
  db: Firestore;
  horloge: () => number;
  client: ClientIa | null;
  nomMetier: (id: string) => string | undefined;
}

/** Réserve une utilisation du quota du jour (avant l'appel : un échec compte aussi). */
async function reserverQuota(s: ServicesRedaction, artisanId: string, maintenant: number) {
  const ref = s.db.collection(collections.iaQuotas).doc(`${artisanId}_${jourIso(maintenant)}`);
  return s.db.runTransaction(async (t) => {
    const n = ((await t.get(ref)).get('utilisations') as number | undefined) ?? 0;
    if (n >= QUOTA_REDACTION_JOUR) return false;
    t.set(
      ref,
      {
        schemaVersion: 1,
        utilisations: FieldValue.increment(1),
        expireLe: Timestamp.fromMillis(maintenant + 2 * J),
      },
      { merge: true },
    );
    return true;
  });
}

export async function redigerIa(
  s: ServicesRedaction,
  ctx: { artisanId: string },
  e: EntreeRedactionIa,
): Promise<SortieRedaction & { redactionId: string }> {
  if (!s.client)
    throw new ErreurMetier('INDISPONIBLE', 'L’assistant de rédaction n’est pas encore disponible.');
  const maintenant = s.horloge();
  if (!(await reserverQuota(s, ctx.artisanId, maintenant)))
    throw new ErreurMetier(
      'TROP_DE_REQUETES',
      `Vous avez utilisé les ${QUOTA_REDACTION_JOUR} aides du jour. Vous pouvez toujours modifier votre texte vous-même.`,
    );
  const a = (await s.db.collection(collections.artisans).doc(ctx.artisanId).get()).data();
  if (!a) throw new ErreurMetier('INTROUVABLE');
  const labels = (a.labels as string[] | undefined) ?? [];
  const p = promptRedaction(e, {
    nom: a.nomCommercial as string,
    metiers: ((a.metiers as string[] | undefined) ?? []).map((m) => s.nomMetier(m) ?? m),
    ville: (a.adresseSiege as { ville?: string } | undefined)?.ville ?? '',
    labels,
  });
  let tokens = 0;
  let cout = 0;
  let sortie: SortieRedaction | null = null;
  let ecarts: string[] = [];
  for (let essai = 0; essai < 2 && !sortie; essai++) {
    const r = await s.client({
      modele: MODELE_DEFAUT,
      systeme: p.systeme,
      contexte: p.contexte,
      demande: essai ? `${p.demande}\n\nCorrige ces points : ${ecarts.join(' ; ')}` : p.demande,
      schema: SCHEMA_JSON_REDACTION,
      maxTokens: 900,
    });
    tokens += r.usage.entree + r.usage.sortie + r.usage.cacheEcrit + r.usage.cacheLu;
    cout += coutCentimes(MODELE_DEFAUT, r.usage);
    let brut: unknown;
    try {
      brut = r.refus ? null : JSON.parse(r.texte);
    } catch {
      brut = null;
    }
    const lu = sortieRedaction.safeParse(brut);
    if (!lu.success) {
      ecarts = ['réponds en JSON conforme'];
      continue;
    }
    ecarts = controlerRedaction(lu.data.texte, e, labels);
    if (!ecarts.length) sortie = lu.data;
  }
  // Journal minimal, sans le texte (TTL 90 jours) : usage et taux d'acceptation.
  const ref = await s.db.collection(collections.iaRedactions).add({
    schemaVersion: 1,
    artisanId: ctx.artisanId,
    type: e.type,
    action: e.action,
    ...(e.ton ? { ton: e.ton } : {}),
    accepte: false,
    tokens,
    coutCentimes: cout,
    createdAt: Timestamp.fromMillis(maintenant),
    expireLe: Timestamp.fromMillis(maintenant + 90 * J),
  });
  if (!sortie)
    throw new ErreurMetier(
      'PRECONDITION',
      'La proposition a été écartée (elle citait une information absente de votre fiche). Réessayez ou modifiez votre texte.',
    );
  return { ...sortie, redactionId: ref.id };
}

/** « Remplacer mon texte » : la proposition est retenue (le texte reste à enregistrer par l'artisan). */
export async function marquerRedactionAcceptee(
  db: Firestore,
  artisanId: string,
  redactionId: string,
) {
  const ref = db.collection(collections.iaRedactions).doc(redactionId);
  const d = await ref.get();
  if (d.get('artisanId') !== artisanId) throw new ErreurMetier('INTROUVABLE');
  await ref.update({ accepte: true });
}
