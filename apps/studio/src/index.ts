import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { ajouterTravail, travauxEnAttente } from './travaux';

/**
 * Robot de rendu du Studio (Cloud Run, STUDIO.md §6). Une seule entrée : POST /travail
 * { type, projetId } avec l'en-tête `x-studio-cle` (STUDIO_RENDU_CLE). Réponse immédiate (202),
 * le travail continue en arrière-plan (Cloud Run avec processeur toujours alloué).
 */
const CLE = process.env.STUDIO_RENDU_CLE ?? '';
const TYPES = new Set(['transcrire', 'capturer', 'rendre']);

function cleValide(recue: string | string[] | undefined): boolean {
  if (!CLE || typeof recue !== 'string') return false;
  const a = Buffer.from(recue);
  const b = Buffer.from(CLE);
  return a.length === b.length && timingSafeEqual(a, b);
}

const serveur = createServer((req, res) => {
  const json = (code: number, corps: unknown) => {
    res.writeHead(code, { 'content-type': 'application/json' });
    res.end(JSON.stringify(corps));
  };
  if (req.method === 'GET' && req.url === '/sante')
    return json(200, { ok: true, enAttente: travauxEnAttente() });
  if (req.method !== 'POST' || req.url !== '/travail') return json(404, { ok: false });
  if (!cleValide(req.headers['x-studio-cle'])) return json(401, { ok: false });
  let corps = '';
  req.on('data', (d: Buffer) => {
    corps += d.toString();
    if (corps.length > 2_000) req.destroy();
  });
  req.on('end', () => {
    try {
      const e = JSON.parse(corps) as { type?: string; projetId?: string };
      if (!e.type || !TYPES.has(e.type) || !e.projetId || !/^[A-Za-z0-9_-]{1,40}$/.test(e.projetId))
        return json(400, { ok: false });
      ajouterTravail(e.type as 'transcrire' | 'capturer' | 'rendre', e.projetId);
      json(202, { ok: true });
    } catch {
      json(400, { ok: false });
    }
  });
});

if (!CLE) console.warn('studio : STUDIO_RENDU_CLE manquante, toutes les demandes seront refusées.');
serveur.listen(Number(process.env.PORT ?? 8090), () =>
  console.log('robot de rendu du Studio prêt'),
);
