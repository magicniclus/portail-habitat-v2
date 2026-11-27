/** Exports d'image du plan : PNG du SVG 2D. */
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
  // Tout le dessin (`data-cadre`), pas seulement la partie visible à l'écran.
  const cadre = svg.dataset.cadre ?? svg.getAttribute('viewBox') ?? '0 0 1 1';
  copie.setAttribute('viewBox', cadre);
  const [, , l, h] = cadre.split(' ').map(Number);
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
