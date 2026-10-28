import type { Theme } from '@ph/core/sites';
import { neutresSites as N } from '@ph/ui/tokens';
import { css } from './elements';

export const POLICES: Record<Theme['polices'], { titre: string; texte: string; poids: number }> = {
  archivo: {
    titre: 'Archivo, Arial, sans-serif',
    texte: '"Source Sans 3", Arial, sans-serif',
    poids: 800,
  },
  dmserif: {
    titre: '"DM Serif Display", Georgia, serif',
    texte: '"Source Sans 3", Arial, sans-serif',
    poids: 400,
  },
  barlow: {
    titre: '"Barlow Condensed", Arial, sans-serif',
    texte: 'Barlow, Arial, sans-serif',
    poids: 700,
  },
};

/** Polices servies par la plateforme (aucun appel à un service tiers, RGPD), latin et latin étendu (œ…). */
const FICHIERS_POLICES: [string, string, number][] = [
  ['Archivo', 'archivo', 800],
  ['Source Sans 3', 'source-sans-3', 400],
  ['Source Sans 3', 'source-sans-3', 700],
  ['DM Serif Display', 'dm-serif-display', 400],
  ['Barlow Condensed', 'barlow-condensed', 700],
  ['Barlow', 'barlow', 400],
  ['Barlow', 'barlow', 700],
];
const PLAGES = {
  latin:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext':
    'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
};
const fontes = (origine: string) =>
  FICHIERS_POLICES.flatMap(([f, n, w]) =>
    (['latin-ext', 'latin'] as const).map(
      (sub) =>
        `@font-face{font-family:"${f}";font-weight:${w};font-display:swap;src:url("${origine}/polices-sites/${n}-${sub}-${w}.woff2") format("woff2");unicode-range:${PLAGES[sub]}}`,
    ),
  ).join('');

/**
 * Feuille de style des sites (maquette Editeur de Site) : fonds pleine largeur et contenu limité
 * en largeur, grille de blocs par appareil, couleurs de texte selon le fond (clair ou foncé),
 * boutons, images, avis, chiffres, formulaire, carte ; menu mobile plein écran.
 */
export function feuilleDeStyle(t: Theme, origine = ''): string {
  const p = POLICES[t.polices];
  return `${fontes(origine)}:root{--primaire:${css(t.palette.primaire)};--accent:${css(t.palette.accent)};--clair:${css(t.palette.clair)};--sombre:${css(t.palette.sombre)};--rayon:${t.rayonBoutons}px;--max:${t.largeurContenu ?? 1120}px;--px:48px;--txt:var(--sombre);--txt2:color-mix(in srgb,var(--sombre) 80%,white);--puce:var(--accent);--lien:var(--accent);--trait:rgba(28,36,48,.18)}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}body{margin:0;font-family:${p.texte};color:var(--txt);line-height:1.55;background:white}
h1,h2,h3{font-family:${p.titre};font-weight:${p.poids};margin:0}p{margin:0}img{max-width:100%;display:block}
.fonce{--txt:white;--txt2:rgba(255,255,255,.86);--puce:white;--lien:white;--trait:rgba(255,255,255,.3);color:var(--txt)}.clair{--txt:var(--sombre);--txt2:color-mix(in srgb,var(--sombre) 80%,white);--puce:var(--accent);--lien:var(--accent);--trait:rgba(28,36,48,.18);color:var(--txt)}
.s{position:relative;padding:var(--pd) var(--px);background:var(--fond,transparent)}.s.img{background-size:cover;background-position:var(--fp,center)}
.s.img::before{content:"";position:absolute;inset:0;background:var(--voile);opacity:var(--vo);pointer-events:none}.s>.in{position:relative;display:grid;gap:40px;max-width:var(--max);margin:0 auto}.s>.in.plein{max-width:none}
.r{display:grid;grid-template-columns:var(--cd);gap:var(--gd);align-items:var(--va,stretch)}.r.f{padding:24px;border-radius:12px;background:var(--rf)}
.c{display:flex;flex-wrap:wrap;align-items:flex-start;align-content:var(--ac,flex-start);min-width:0}
.el{flex:0 0 100%;max-width:100%}.bouton.enligne{flex:0 0 auto;margin-right:10px}.bouton.pl{flex:1 1 100%}
.ts{font-size:var(--fd)}.espace{height:var(--hd)}.t{line-height:1.12;text-wrap:balance;color:var(--col,var(--txt))}h3.t{line-height:1.25}
.sur{display:block;font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-family:${p.texte};color:var(--col,var(--accent))}.fonce .sur.ac{--col:white}
.txt{line-height:1.55;color:var(--col,var(--txt2))}.txt.ct{max-width:62ch;margin-inline:auto}
.lien{color:var(--lc,var(--lien));text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1.5px}.ns .lien{text-decoration:none}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 18px;border:2px solid var(--bb);border-radius:var(--rayon);background:var(--bb);color:var(--bt);font-weight:700;font-size:15px;line-height:1.2;text-decoration:none;white-space:nowrap}
.btn.contour{background:transparent;color:var(--bc);border-color:var(--bc)}.btn.large{width:100%}
.image{position:relative;margin:0;overflow:hidden;border-radius:var(--ra,12px)}.image img,.image .vide{width:100%;aspect-ratio:var(--ar);object-fit:var(--of,cover);object-position:var(--op,center)}.image .vide{display:block;background:color-mix(in srgb,var(--clair) 70%,${N.imageVide} 30%)}
.image::after{content:"";position:absolute;inset:0;background:var(--voile,transparent);opacity:var(--vo,0);pointer-events:none}
.liste{display:grid;gap:10px;margin:0;padding:0;list-style:none;font-size:16px;line-height:1.45;color:var(--col,var(--txt2))}.liste li{display:flex;gap:10px;align-items:baseline}.liste .puce{color:var(--puce);font-weight:700}
.liste.ac{justify-items:center}.liste.ad{justify-items:end}
.avis{margin:0;display:grid;gap:8px}.etoiles{color:var(--accent);letter-spacing:2px;font-size:16px}.avis p{font-size:16px;line-height:1.5;color:var(--txt2)}.avis footer{font-size:14px;font-weight:700;color:var(--txt)}
.chiffre strong{display:block;font-family:${p.titre};font-weight:${p.poids};line-height:1.05;color:var(--col,var(--primaire))}.fonce .chiffre strong{color:var(--col,white)}.chiffre span{font-size:14px;color:var(--txt2)}
.formulaire{display:grid;gap:14px}.formulaire label{display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:var(--txt)}
.formulaire input,.formulaire select,.formulaire textarea{width:100%;min-height:48px;padding:10px 12px;font:inherit;font-size:16px;border:1px solid ${N.bordChamp};border-radius:8px;background:white;color:var(--sombre)}
.formulaire .btn{--bb:var(--primaire);--bt:white;width:100%}.rgpd{font-size:13px;color:var(--txt2)}
.carte{aspect-ratio:16/7;border-radius:10px;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--primaire);background:repeating-linear-gradient(0deg,${N.trameCarte} 0 1px,transparent 1px 28px),repeating-linear-gradient(90deg,${N.trameCarte} 0 1px,${N.fondCarte} 1px 28px);text-align:center;padding:12px}
.video iframe,.video .vide{width:100%;aspect-ratio:16/9;border:0;border-radius:12px}.video .vide{display:flex;align-items:center;justify-content:center;background:var(--sombre);color:rgba(255,255,255,.85)}
hr{height:1px;border:0;margin:0;background:var(--trait)}hr.court{width:64px}hr.ac{margin-inline:auto}hr.ad{margin-left:auto}
.logo-el{display:flex;align-items:center;gap:10px;font-family:${p.titre};font-weight:${p.poids};font-size:19px}.menu-el{display:flex;flex-wrap:wrap;gap:22px;font-size:15px}.menu-el a{color:inherit;text-decoration:none}
.ini{display:inline-flex;align-items:center;justify-content:center;flex:none;font-family:${p.titre};font-weight:800;font-size:14px}
.pied{padding:24px var(--px);text-align:center;font-size:14px;color:color-mix(in srgb,var(--sombre) 75%,white)}.pied a{color:inherit}
.om{display:none}
@media (max-width:1023px){:root{--px:32px}.ts{font-size:var(--ft)}.espace{height:var(--ht)}.s{padding:var(--pt) var(--px)}.r{grid-template-columns:var(--ct);gap:var(--gt)}}
@media (min-width:768px) and (max-width:1023px){.ht{display:none!important}}@media (min-width:1024px){.hd{display:none!important}}
@media (max-width:767px){:root{--px:20px}.ts{font-size:var(--fm)}.espace{height:var(--hm)}.s{padding:var(--pm) var(--px)}.s>.in{gap:28px}.r{grid-template-columns:var(--cm);gap:var(--gm)}.c{order:var(--om,0)}.hm{display:none!important}.image img,.image .vide{aspect-ratio:var(--arm,var(--ar))}.nm{display:none}.om{display:inline}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}`;
}
