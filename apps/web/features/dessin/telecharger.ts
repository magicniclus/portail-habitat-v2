/** Téléchargement d'un fichier produit dans le navigateur (photo, PNG, PDF, CSV). */
export function telechargerFichier(nom: string, contenu: Blob) {
  const url = URL.createObjectURL(contenu);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** « 202611181530 » : horodatage des noms de fichiers. */
export const horodatage = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

/**
 * PNG du plan 2D : le SVG est copié avec ses couleurs calculées (classes Tailwind), puis
 * dessiné sur une toile blanche, 4 000 px au plus de côté.
 */
export async function svgEnPng(svg: SVGSVGElement): Promise<Blob> {
  const copie = svg.cloneNode(true) as SVGSVGElement;
  const sources = svg.querySelectorAll<SVGElement>('*');
  copie.querySelectorAll<SVGElement>('*').forEach((el, i) => {
    const st = getComputedStyle(sources[i]!);
    el.style.fill = st.fill;
    el.style.stroke = st.stroke;
    el.style.fontFamily = st.fontFamily;
    el.style.fontWeight = st.fontWeight;
  });
  const [, , l, h] = (svg.getAttribute('viewBox') ?? '0 0 1 1').split(' ').map(Number);
  const k = Math.min(4_000 / Math.max(l!, h!), 0.08); // 80 px par mètre au plus
  const [W, H] = [Math.round(l! * k), Math.round(h! * k)];
  copie.setAttribute('width', String(W));
  copie.setAttribute('height', String(H));
  copie.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(copie)], { type: 'image/svg+xml' }),
  );
  try {
    const img = new Image();
    await new Promise((ok, ko) => {
      img.onload = ok;
      img.onerror = ko;
      img.src = url;
    });
    const toile = document.createElement('canvas');
    [toile.width, toile.height] = [W, H];
    const c = toile.getContext('2d')!;
    c.fillStyle = 'white';
    c.fillRect(0, 0, W, H);
    c.drawImage(img, 0, 0, W, H);
    return await new Promise<Blob>((ok, ko) =>
      toile.toBlob((b) => (b ? ok(b) : ko(new Error('PNG'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
