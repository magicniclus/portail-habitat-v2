// Planche de contrôle : assemble des images de `.vsl/film/planches` en grille.
// Usage : tsx scripts/vsl/film/planche.ts <sortie.jpg> <colonnes> <image …>
//         tsx scripts/vsl/film/planche.ts --revue   (toutes les images `r-*.jpg`, par planches de 2 × 2 en 960 × 540)
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const dossier = resolve(__dirname, '../../../.vsl/film/planches');

async function grille(sortie: string, col: number, noms: string[], l: number, h: number) {
  const tuiles = await Promise.all(
    noms.map(async (n, i) => ({
      input: await sharp(join(dossier, n)).resize(l, h).toBuffer(),
      left: (i % col) * l,
      top: Math.floor(i / col) * h,
    })),
  );
  await sharp({
    create: {
      width: col * l,
      height: Math.ceil(noms.length / col) * h,
      channels: 3,
      background: 'black',
    },
  })
    .composite(tuiles)
    .jpeg({ quality: 86 })
    .toFile(join(dossier, '..', sortie));
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--revue') {
    const noms = readdirSync(dossier)
      .filter((n) => n.startsWith('r-'))
      .sort();
    for (let i = 0; i < noms.length; i += 4)
      await grille(
        `revue-${String(i / 4 + 1).padStart(2, '0')}.jpg`,
        2,
        noms.slice(i, i + 4),
        960,
        540,
      );
    console.log(`✓ ${Math.ceil(noms.length / 4)} planches de revue`);
    return;
  }
  const [sortie, colonnes, ...noms] = args;
  await grille(sortie!, Number(colonnes), noms, 640, 360);
}
void main();
