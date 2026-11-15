// Planche de contrôle : assemble des images de `.vsl/film/planches` en grille.
// Usage : tsx scripts/vsl/film/planche.ts <sortie.jpg> <colonnes> <image …>
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const dossier = resolve(__dirname, '../../../.vsl/film/planches');
const [sortie, colonnes, ...noms] = process.argv.slice(2);
const col = Number(colonnes);
const [l, h] = [640, 360];

async function main() {
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
    .jpeg({ quality: 82 })
    .toFile(join(dossier, '..', sortie!));
}
void main();
