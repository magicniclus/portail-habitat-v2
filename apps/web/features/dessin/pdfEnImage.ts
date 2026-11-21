/**
 * Première page d'un PDF rendue en image JPEG (D91), dans le navigateur. `pdfjs-dist` n'est
 * chargé qu'à ce moment-là ; son « worker » tourne dans la page (aucun fichier à servir à part).
 */
export async function pdfEnImage(fichier: File): Promise<string> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    // @ts-expect-error -- module du worker sans déclaration de types
    import('pdfjs-dist/build/pdf.worker.min.mjs'),
  ]);
  (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
  const chargement = pdfjs.getDocument({ data: new Uint8Array(await fichier.arrayBuffer()) });
  const doc = await chargement.promise;
  try {
    const page = await doc.getPage(1);
    const brut = page.getViewport({ scale: 1 });
    const vue = page.getViewport({ scale: Math.min(4, 3000 / Math.max(brut.width, brut.height)) });
    const toile = document.createElement('canvas');
    toile.width = Math.round(vue.width);
    toile.height = Math.round(vue.height);
    await page.render({ canvas: toile, viewport: vue, background: 'white' }).promise;
    return toile.toDataURL('image/jpeg', 0.85).split(',')[1]!;
  } finally {
    await chargement.destroy();
  }
}
