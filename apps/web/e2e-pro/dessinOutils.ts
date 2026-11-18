import { flagGlobal } from './outils';

/**
 * Outils des parcours Plans (e2e). Les flags `dessin` et `dessinPublic` sont allumés et laissés
 * allumés sur l'émulateur : les remettre à zéro à la fin d'un fichier les couperait pendant que
 * les autres fichiers et l'autre appareil testent encore (exécution en parallèle).
 */
export async function activerPlans() {
  await flagGlobal('dessin', true);
  await flagGlobal('dessinPublic', true);
}

/** PDF d'une page (un rectangle tracé), construit avec ses décalages exacts. */
export function pdfMinimal(): Buffer {
  const flux = '20 20 500 300 re S';
  const objets = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 540 340] /Contents 4 0 R >>',
    `<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`,
  ];
  let corps = '%PDF-1.4\n';
  const decalages = objets.map((o, i) => {
    const d = corps.length;
    corps += `${i + 1} 0 obj\n${o}\nendobj\n`;
    return d;
  });
  const xref = corps.length;
  corps += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  for (const d of decalages) corps += `${String(d).padStart(10, '0')} 00000 n \n`;
  corps += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(corps, 'latin1');
}

/** PNG 2 × 2 (vert / gris) qui tient lieu de photo aérienne. */
export const PHOTO_TEST =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAE0lEQVR4nGOI6nFbsGAaAxADWQAqZgYFdPEiigAAAABJRU5ErkJggg==';
