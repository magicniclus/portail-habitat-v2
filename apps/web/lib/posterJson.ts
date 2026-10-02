import { messageErreur } from '@ph/core/erreurs';
import type { Resultat } from '@ph/core/resultat';

/** POST JSON vers une route de l'application ; panne réseau ou réponse illisible : `INDISPONIBLE`. */
export async function posterJson<R>(url: string, corps: unknown): Promise<Resultat<R>> {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corps),
    });
    const res = (await r.json().catch(() => null)) as Resultat<R> | null;
    return res ?? { ok: false, code: 'INDISPONIBLE', message: messageErreur('INDISPONIBLE') };
  } catch {
    return { ok: false, code: 'INDISPONIBLE', message: messageErreur('INDISPONIBLE') };
  }
}
