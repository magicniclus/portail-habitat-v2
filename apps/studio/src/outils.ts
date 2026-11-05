import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Lance une commande ; rejette avec la fin de sa sortie d'erreur si elle échoue. */
export function executer(
  commande: string,
  args: readonly string[],
  o: { env?: NodeJS.ProcessEnv; entree?: Buffer } = {},
): Promise<string> {
  return new Promise((ok, ko) => {
    const p = spawn(commande, args, { env: o.env ?? process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    let sortie = '';
    let erreur = '';
    p.stdout.on('data', (d: Buffer) => (sortie += d.toString()));
    p.stderr.on('data', (d: Buffer) => (erreur = (erreur + d.toString()).slice(-4000)));
    p.on('error', ko);
    p.on('close', (code) =>
      code === 0 ? ok(sortie) : ko(new Error(`${commande} (code ${code}) : ${erreur.slice(-600)}`)),
    );
    if (o.entree) p.stdin.end(o.entree);
    else p.stdin.end();
  });
}

/** Dossier de travail temporaire, supprimé à la fin. */
export async function dansDossier<T>(f: (dossier: string) => Promise<T>): Promise<T> {
  const d = await mkdtemp(join(tmpdir(), 'studio-'));
  try {
    return await f(d);
  } finally {
    await rm(d, { recursive: true, force: true });
  }
}

/** Dimensions et durée d'une vidéo (ffprobe). */
export async function sonder(
  fichier: string,
): Promise<{ largeur: number; hauteur: number; dureeMs: number }> {
  const s = await executer('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height:format=duration',
    '-of',
    'json',
    fichier,
  ]);
  const j = JSON.parse(s) as {
    streams?: { width?: number; height?: number }[];
    format?: { duration?: string };
  };
  return {
    largeur: j.streams?.[0]?.width ?? 0,
    hauteur: j.streams?.[0]?.height ?? 0,
    dureeMs: Math.round(Number(j.format?.duration ?? 0) * 1000),
  };
}
