import {
  estFonce,
  resoudreCouleur,
  type Appareil,
  type Bloc,
  type Couleur,
  type Ligne,
  type Section,
  type Theme,
} from '@ph/core/sites';
import { marquerEdition, videEdition } from './edition';
import {
  avecAnimation,
  css,
  masques,
  parAppareil,
  rendreElement,
  type ContexteRendu,
} from './elements';
import { esc, urlCss } from './html';

type Fond = Pick<
  Section['p'],
  'fond' | 'fondType' | 'fondImage' | 'voile' | 'voileOpacite' | 'fondPos' | 'texteCouleur'
>;

const reel = (c: Couleur, t?: Theme) => (t ? resoudreCouleur(c, t.palette) : null);

/**
 * Fond foncé ? Image : selon la couleur par-dessus (assez couvrante) ou foncée par défaut ;
 * couleur : selon sa luminance ; sans fond : comme le parent. « Clair » / « Foncé » forcent.
 */
function fonceDe(p: Fond, image: boolean, parent: boolean, t?: Theme): boolean {
  if (p.texteCouleur === 'clair') return true;
  if (p.texteCouleur === 'fonce') return false;
  if (image) return p.voileOpacite >= 30 ? estFonce(reel(p.voile, t)) : true;
  if (p.fond === 'aucun' || p.fond === 'auto') return parent;
  return estFonce(reel(p.fond, t) ?? css(p.fond));
}

/** Fond en variables CSS : couleur, ou image et couleur par-dessus. */
function styleFond(p: Fond, image: string | null | false): string {
  if (image)
    return `background-image:${urlCss(image)};--fp:${p.fondPos};--voile:${css(p.voile) || 'black'};--vo:${p.voileOpacite / 100};`;
  return css(p.fond) ? `--fond:${css(p.fond)};` : '';
}

const APPAREILS: Appareil[] = ['desktop', 'tablet', 'mobile'];

/** Colonnes de la grille par appareil : largeurs sur 12, empilement sur mobile, 2 par ligne sur tablette au-delà de 3. */
function pistes(r: Ligne, a: Appareil): string {
  const vis = r.cols.filter((c) => !c.p.masque[a]);
  if (!vis.length) return 'minmax(0,1fr)';
  if (a === 'mobile' && r.p.empile) return 'minmax(0,1fr)';
  if (a === 'tablet' && r.p.empile && vis.length > 3) return 'repeat(2,minmax(0,1fr))';
  const somme = vis.reduce((s, c) => s + c.w, 0);
  return `${vis.map((c) => `minmax(0,${c.w}fr)`).join(' ')}${somme < 12 ? ` minmax(0,${12 - somme}fr)` : ''}`;
}

const ALIGNE = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'flex-start',
} as const;

function rendreBloc(c: Bloc, i: number, r: Ligne, ctx: ContexteRendu, parent: boolean): string {
  const image = c.p.fondType === 'image' && c.p.fondImage ? ctx.media(c.p.fondImage) : null;
  const fonce = fonceDe(c.p, Boolean(image), parent, ctx.theme);
  const propre = image || (c.p.fond !== 'aucun' && c.p.fond !== 'auto');
  const fondBloc = image
    ? `background:linear-gradient(color-mix(in srgb,${css(c.p.voile) || 'black'} ${c.p.voileOpacite}%,transparent),color-mix(in srgb,${css(c.p.voile) || 'black'} ${c.p.voileOpacite}%,transparent)),${urlCss(image)} ${c.p.fondPos}/cover no-repeat;`
    : css(c.p.fond)
      ? `background:${css(c.p.fond)};`
      : '';
  const style = `${c.p.pad ? `padding:${c.p.pad}px;` : ''}${fondBloc}${c.p.arrondi ? `border-radius:${c.p.arrondi}px;` : ''}${c.p.ombre ? 'box-shadow:0 8px 24px rgba(20,30,40,.12);' : ''}--ac:${ALIGNE[c.p.valign]};${c.p.valign === 'center' || c.p.valign === 'end' ? `align-self:${c.p.valign};` : ''}${r.p.inverse ? `--om:${r.cols.length - i};` : ''}`;
  const cls = ['c', masques(c.p.masque), propre ? (fonce ? 'fonce' : 'clair') : '']
    .filter(Boolean)
    .join(' ');
  const html = `<div class="${cls}"${c.p.htmlId ? ` id="${esc(c.p.htmlId)}"` : ''} style="${esc(style)}">${c.els.length || !ctx.edition ? c.els.map((e) => rendreElement(e, ctx, fonce)).join('') : videEdition('contenu', c.id, 'Ajouter un contenu')}</div>`;
  return ctx.edition ? marquerEdition(html, c.id, 'bloc') : html;
}

function rendreLigne(r: Ligne, ctx: ContexteRendu, parent: boolean): string {
  const avecFond = r.p.fond !== 'aucun' && r.p.fond !== 'auto' && Boolean(css(r.p.fond));
  const fonce = avecFond ? estFonce(reel(r.p.fond, ctx.theme)) : parent;
  const [d, t, m] = APPAREILS.map((a) => pistes(r, a));
  const style = `--cd:${d};--ct:${t};--cm:${m};--gd:${r.p.gap}px;--gt:${r.p.gap}px;--gm:${Math.min(r.p.gap, 24)}px;--va:${r.p.valign};${avecFond ? `--rf:${css(r.p.fond)};` : ''}`;
  const cls = ['r', avecFond ? `f ${fonce ? 'fonce' : 'clair'}` : '', masques(r.p.masque)]
    .filter(Boolean)
    .join(' ');
  const html = `<div class="${cls}"${r.p.htmlId ? ` id="${esc(r.p.htmlId)}"` : ''} style="${esc(style)}">${r.cols.map((c, i) => rendreBloc(c, i, r, ctx, fonce)).join('')}</div>`;
  return ctx.edition ? marquerEdition(html, r.id, 'section') : html;
}

/** Zone : fond pleine largeur (couleur ou image), contenu limité en largeur (sauf « Pleine largeur »). */
export function rendreSection(s: Section, ctx: ContexteRendu): string {
  const image = s.p.fondType === 'image' && s.p.fondImage ? ctx.media(s.p.fondImage) : null;
  const fonce = fonceDe(s.p, Boolean(image), false, ctx.theme);
  const style = parAppareil('p', s.p.padY) + styleFond(s.p, image);
  const classes = [
    's',
    image ? 'img' : '',
    fonce ? 'fonce' : 'clair',
    masques(s.p.masque),
    ctx.surligner?.has(s.id) ? 'ia-modifie' : '',
  ]
    .filter(Boolean)
    .join(' ');
  // Éditeur : la zone en fenêtre pop-up reste dans la page pour être modifiée, avec son étiquette.
  const etiquettes = ctx.edition
    ? [
        s.p.globale ? 'Zone globale · modifiée sur toutes ses pages' : '',
        s.p.popup
          ? `Fenêtre pop-up · ${{ clic: 'ouverte par un bouton', delai: `après ${s.p.popup.delai} s`, sortie: 'quand le visiteur s’apprête à partir' }[s.p.popup.ouverture]}`
          : '',
      ].filter(Boolean)
    : [];
  const etiquette = etiquettes.length ? `<p class="ed-pop">${etiquettes.join(' · ')}</p>` : '';
  const zone = `<section class="${classes}${etiquette ? ' ed-zone-pop' : ''}"${s.p.ancre && !(s.p.popup && !ctx.edition) ? ` id="${esc(s.p.ancre)}"` : ''} style="${esc(style)}">${etiquette}<div class="in${s.p.largeur === 'plein' ? ' plein' : ''}">${s.rows.length || !ctx.edition ? s.rows.map((r) => rendreLigne(r, ctx, fonce)).join('') : videEdition('section', s.id, 'Ajouter une section')}</div></section>`;
  return ctx.edition ? marquerEdition(zone, s.id, 'zone') : avecAnimation(zone, s.p.anim, ctx);
}

/**
 * Zone en fenêtre pop-up (site publié et aperçu) : `<dialog>` fermable (bouton, Échap, clic
 * dehors), ouverte par un bouton `data-pop`, après un délai ou à la sortie de la page.
 */
export function rendreFenetre(s: Section, ctx: ContexteRendu): string {
  const p = s.p.popup!;
  const auto =
    p.ouverture === 'delai'
      ? ` data-auto="${p.delai}"`
      : p.ouverture === 'sortie'
        ? ' data-auto="sortie"'
        : '';
  return `<dialog class="fenetre pop pl-${p.largeur}" id="pop-${esc(s.p.ancre)}" aria-label="${esc(s.p.nom || 'Fenêtre')}"${auto}><div class="fen"><button type="button" class="ff-fermer" data-fermer-pop aria-label="Fermer">×</button>${rendreSection(s, ctx)}</div></dialog>`;
}
