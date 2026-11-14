import { ErreurMetier } from '@ph/core/erreurs';
import { RESEAUX, type Reseau } from '@ph/core/studio';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { chiffrer, dechiffrer } from '../devis/chiffrement';

/**
 * Comptes YouTube, Instagram et TikTok connectés au Studio (STUDIO.md §10) : un compte par réseau
 * pour l'entreprise. Jetons chiffrés (AES-256-GCM, `STUDIO_CHIFFREMENT_CLE`), jamais renvoyés au
 * navigateur ni journalisés. Admin SDK uniquement.
 */
export interface ConfigReseaux {
  /** Clé de 32 octets (base64) qui chiffre les jetons. */
  cle: Buffer;
  /** Adresse publique du site, pour les adresses de retour OAuth. */
  site: string;
  applis: Partial<Record<Reseau, { id: string; secret: string }>>;
  fetch: typeof fetch;
  horloge: () => number;
}

export function configReseaux(
  env: NodeJS.ProcessEnv,
  f: typeof fetch = fetch,
): ConfigReseaux | null {
  const cle = env.STUDIO_CHIFFREMENT_CLE ? Buffer.from(env.STUDIO_CHIFFREMENT_CLE, 'base64') : null;
  if (!cle || cle.length !== 32) return null;
  const applis: ConfigReseaux['applis'] = {};
  for (const r of Object.keys(RESEAUX) as Reseau[]) {
    const v = RESEAUX[r].variables;
    const id = env[v.id];
    const secret = env[v.secret];
    if (id && secret) applis[r] = { id, secret };
  }
  const site = env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return { cle, site, applis, fetch: f, horloge: Date.now };
}

export const redirectionReseau = (c: Pick<ConfigReseaux, 'site'>, r: Reseau) =>
  new URL(`/api/studio/reseaux/${r}/retour`, c.site).toString();

export interface CompteReseau {
  reseau: Reseau;
  compteId: string;
  nom: string;
  connecteLe: number;
}

interface Jetons {
  acces: string;
  rafraichissement: string | null;
  /** Fin de validité du jeton d'accès (ms). */
  expireLe: number;
}

const formulaire = (x: Record<string, string>) => ({
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(x).toString(),
  signal: AbortSignal.timeout(15_000),
});

async function json<T>(r: Response, quoi: string): Promise<T> {
  if (!r.ok) throw new Error(`${quoi} : refus (${r.status}).`);
  return (await r.json()) as T;
}

interface ReponseJeton {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user_id?: number | string;
  open_id?: string;
}

/** Échange le code reçu au retour d'autorisation contre des jetons, puis lit le nom du compte. */
async function echanger(
  c: ConfigReseaux,
  r: Reseau,
  code: string,
): Promise<{ jetons: Jetons; compteId: string; nom: string }> {
  const app = c.applis[r];
  if (!app) throw new ErreurMetier('INDISPONIBLE', `${RESEAUX[r].libelle} n’est pas configuré.`);
  const f = c.fetch;
  const maintenant = c.horloge();
  const redirect_uri = redirectionReseau(c, r);
  if (r === 'youtube') {
    const j = await json<ReponseJeton>(
      await f(
        RESEAUX.youtube.jeton,
        formulaire({
          code,
          client_id: app.id,
          client_secret: app.secret,
          redirect_uri,
          grant_type: 'authorization_code',
        }),
      ),
      'Google',
    );
    if (!j.access_token) throw new Error('Google : jeton absent.');
    const ch = await json<{ items?: { id?: string; snippet?: { title?: string } }[] }>(
      await f('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { authorization: `Bearer ${j.access_token}` },
        signal: AbortSignal.timeout(10_000),
      }),
      'YouTube',
    );
    const chaine = ch.items?.[0];
    if (!chaine?.id)
      throw new ErreurMetier('PRECONDITION', 'Ce compte Google n’a pas de chaîne YouTube.');
    return {
      jetons: {
        acces: j.access_token,
        rafraichissement: j.refresh_token ?? null,
        expireLe: maintenant + (j.expires_in ?? 3_600) * 1000,
      },
      compteId: chaine.id,
      nom: chaine.snippet?.title ?? 'Chaîne YouTube',
    };
  }
  if (r === 'instagram') {
    const court = await json<ReponseJeton>(
      await f(
        RESEAUX.instagram.jeton,
        formulaire({
          client_id: app.id,
          client_secret: app.secret,
          grant_type: 'authorization_code',
          redirect_uri,
          code,
        }),
      ),
      'Instagram',
    );
    if (!court.access_token) throw new Error('Instagram : jeton absent.');
    // Jeton court (1 h) → jeton long (60 jours), renouvelé avant son terme.
    const long = await json<ReponseJeton>(
      await f(
        `https://graph.instagram.com/access_token?${new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: app.secret, access_token: court.access_token })}`,
        { signal: AbortSignal.timeout(10_000) },
      ),
      'Instagram',
    );
    const acces = long.access_token ?? court.access_token;
    const moi = await json<{ user_id?: string | number; id?: string; username?: string }>(
      await f(
        `https://graph.instagram.com/me?${new URLSearchParams({ fields: 'user_id,username', access_token: acces })}`,
        { signal: AbortSignal.timeout(10_000) },
      ),
      'Instagram',
    );
    return {
      jetons: {
        acces,
        rafraichissement: null,
        expireLe: maintenant + (long.expires_in ?? 3_600) * 1000,
      },
      compteId: String(moi.user_id ?? moi.id ?? court.user_id ?? ''),
      nom: moi.username ? `@${moi.username}` : 'Compte Instagram',
    };
  }
  const j = await json<ReponseJeton>(
    await f(
      RESEAUX.tiktok.jeton,
      formulaire({
        client_key: app.id,
        client_secret: app.secret,
        code,
        grant_type: 'authorization_code',
        redirect_uri,
      }),
    ),
    'TikTok',
  );
  if (!j.access_token) throw new Error('TikTok : jeton absent.');
  const u = await json<{ data?: { user?: { open_id?: string; display_name?: string } } }>(
    await f('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name', {
      headers: { authorization: `Bearer ${j.access_token}` },
      signal: AbortSignal.timeout(10_000),
    }),
    'TikTok',
  );
  return {
    jetons: {
      acces: j.access_token,
      rafraichissement: j.refresh_token ?? null,
      expireLe: maintenant + (j.expires_in ?? 86_400) * 1000,
    },
    compteId: u.data?.user?.open_id ?? j.open_id ?? '',
    nom: u.data?.user?.display_name ?? 'Compte TikTok',
  };
}

/** Retour d'autorisation : jetons chiffrés en base, compte prêt à publier. */
export async function connecterReseauStudio(
  db: Firestore,
  c: ConfigReseaux,
  e: { reseau: Reseau; code: string; auteurUid: string },
): Promise<CompteReseau> {
  const { jetons, compteId, nom } = await echanger(c, e.reseau, e.code);
  const connecteLe = c.horloge();
  await db.doc(chemins.compteStudio(e.reseau)).set({
    schemaVersion: 1,
    reseau: e.reseau,
    compteId,
    nom,
    acces: chiffrer(jetons.acces, c.cle),
    rafraichissement: jetons.rafraichissement ? chiffrer(jetons.rafraichissement, c.cle) : null,
    expireLe: Timestamp.fromMillis(jetons.expireLe),
    connectePar: e.auteurUid,
    connecteLe: Timestamp.fromMillis(connecteLe),
  });
  return { reseau: e.reseau, compteId, nom, connecteLe };
}

export async function deconnecterReseauStudio(db: Firestore, reseau: Reseau) {
  await db.doc(chemins.compteStudio(reseau)).delete();
}

export async function listerComptesStudio(db: Firestore): Promise<CompteReseau[]> {
  const docs = await db.getAll(
    ...(Object.keys(RESEAUX) as Reseau[]).map((r) => db.doc(chemins.compteStudio(r))),
  );
  return docs.flatMap((d) =>
    d.exists
      ? [
          {
            reseau: d.get('reseau') as Reseau,
            compteId: d.get('compteId') as string,
            nom: d.get('nom') as string,
            connecteLe: (d.get('connecteLe') as Timestamp).toMillis(),
          },
        ]
      : [],
  );
}

/** Marge avant expiration : on renouvelle 5 min avant (60 jours avant 7 pour Instagram). */
const MARGE_MS = 5 * 60_000;
const MARGE_INSTAGRAM_MS = 7 * 86_400_000;

/**
 * Jeton d'accès valide pour un réseau (renouvelé si besoin). `null` si le compte n'est pas
 * connecté ; erreur lisible si le réseau refuse le renouvellement (à reconnecter).
 */
export async function jetonReseauStudio(
  db: Firestore,
  c: ConfigReseaux,
  r: Reseau,
): Promise<{ jeton: string; compteId: string } | null> {
  const ref = db.doc(chemins.compteStudio(r));
  const d = await ref.get();
  if (!d.exists) return null;
  const acces = dechiffrer(d.get('acces') as string, c.cle);
  const brut = d.get('rafraichissement') as string | null;
  const rafraichissement = brut ? dechiffrer(brut, c.cle) : null;
  if (!acces)
    throw new ErreurMetier('PRECONDITION', `${RESEAUX[r].libelle} : reconnectez le compte.`);
  const expire = (d.get('expireLe') as Timestamp).toMillis();
  const maintenant = c.horloge();
  const compteId = d.get('compteId') as string;
  if (expire - (r === 'instagram' ? MARGE_INSTAGRAM_MS : MARGE_MS) > maintenant)
    return { jeton: acces, compteId };
  const app = c.applis[r];
  let j: ReponseJeton;
  try {
    if (r === 'instagram')
      j = await json<ReponseJeton>(
        await c.fetch(
          `https://graph.instagram.com/refresh_access_token?${new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: acces })}`,
          { signal: AbortSignal.timeout(10_000) },
        ),
        'Instagram',
      );
    else {
      if (!app || !rafraichissement) throw new Error('sans jeton de rafraîchissement');
      j = await json<ReponseJeton>(
        await c.fetch(
          RESEAUX[r].jeton,
          formulaire({
            grant_type: 'refresh_token',
            refresh_token: rafraichissement,
            [r === 'tiktok' ? 'client_key' : 'client_id']: app.id,
            client_secret: app.secret,
          }),
        ),
        RESEAUX[r].libelle,
      );
    }
  } catch {
    throw new ErreurMetier(
      'PRECONDITION',
      `${RESEAUX[r].libelle} : la connexion a expiré, reconnectez le compte.`,
    );
  }
  if (!j.access_token)
    throw new ErreurMetier('PRECONDITION', `${RESEAUX[r].libelle} : reconnectez le compte.`);
  await ref.update({
    acces: chiffrer(j.access_token, c.cle),
    ...(j.refresh_token ? { rafraichissement: chiffrer(j.refresh_token, c.cle) } : {}),
    expireLe: Timestamp.fromMillis(maintenant + (j.expires_in ?? 3_600) * 1000),
  });
  return { jeton: j.access_token, compteId };
}
