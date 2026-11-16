// Moteur d'animation de la VSL : tout est une fonction pure du temps (`window.allerA(image)`), aucune
// animation CSS ni minuterie. Les instants sont des repères sur la voix (`@mot`) : quand la voix
// change, la chronologie change et tout le montage suit.
/* global document, window */
/* eslint-disable @typescript-eslint/no-unused-expressions */
(() => {
  const IPS = 30;
  const TL = window.__CHRONO; // { duree, segments: [{ id, debut, duree, voix, mots: [{ mot, t, d }] }] }
  const CAP = window.__CAPTURES; // { base, images: { nom: nombre } }
  const borne = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  /** Sortie douce, proche de cubic-bezier(0.16, 1, 0.3, 1). */
  const doux = (x) => 1 - (1 - borne(x)) ** 4;
  /** Sortie avec léger dépassement (rebond). */
  const rebond = (x) => {
    const k = borne(x) - 1;
    return 1 + 2.4 * k ** 3 + 1.4 * k ** 2;
  };
  const sansAccent = (s) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9']/g, '');
  const seg = (id) => TL.segments.find((s) => s.id === id);

  /** Scène = un ou plusieurs segments de voix consécutifs (`data-scene="p05a p05b p05c"`). */
  class Scene {
    constructor(el) {
      this.el = el;
      this.segs = el.dataset.scene.split(' ').map(seg);
      this.debut = this.segs[0].debut;
      const dernier = this.segs.at(-1);
      this.fin = dernier.debut + dernier.duree;
      this.duree = this.fin - this.debut;
      this.cache = new Map();
    }
    /** Instant local : `1.2`, `@p05b$` (fin du segment), `@mot`, `@2:mot` (2e fois), `@p05b` (début de voix), `@p05b:mot`, `fin-0.8`, suffixe `+0.3`. */
    rep(expr) {
      if (expr === undefined || expr === '') return 0;
      if (this.cache.has(expr)) return this.cache.get(expr);
      let v;
      const m = /^(.*?)([+-]\d*\.?\d+)?$/.exec(String(expr));
      let [, base, decal] = m;
      if (/^-?\d*\.?\d+$/.test(String(expr))) {
        base = String(expr);
        decal = undefined;
      }
      if (base.startsWith('fin')) v = this.duree;
      else if (base.startsWith('@')) {
        let cle = base.slice(1);
        let segs = this.segs;
        let rang = 1;
        const p = cle.split(':');
        if (p.length === 2 && /^\d+$/.test(p[0])) [rang, cle] = [Number(p[0]), p[1]];
        else if (p.length === 2) [segs, cle] = [[seg(p[0])], p[1]];
        else if (cle.endsWith('$')) [segs, cle] = [[seg(cle.slice(0, -1))], '$'];
        else if (seg(cle)) [segs, cle] = [[seg(cle)], ''];
        if (cle === '$') v = segs[0].debut + segs[0].duree - this.debut;
        else if (!cle) v = segs[0].voix - this.debut;
        else {
          const n = sansAccent(cle);
          const trouves = segs.flatMap((s) =>
            // « l'inverse » répond aussi au repère « inverse ».
            s.mots.filter((w) =>
              [sansAccent(w.mot), sansAccent(w.mot).split("'").pop()].some((x) => x.startsWith(n)),
            ),
          );
          const w = trouves[rang - 1];
          // Version courte : la phrase du repère a pu être coupée, l'élément arrive alors en fin de plan.
          if (!w && !window.__SOUPLE)
            throw new Error(`Repère introuvable : ${expr} (scène ${this.el.dataset.scene})`);
          v = w ? w.t - this.debut : this.duree - 1.6;
        }
      } else v = Number(base);
      v += decal ? Number(decal) : 0;
      this.cache.set(expr, v);
      return v;
    }
  }

  const FN = (window.FN = {});
  // Une version courte ne garde que certains segments : les scènes incomplètes sont laissées de côté.
  const scenes = [...document.querySelectorAll('section[data-scene]')]
    .filter((el) => el.dataset.scene.split(' ').every(seg))
    .map((el) => new Scene(el));
  const VERTICAL = window.__FORMAT === 'vertical';
  const MOTS_PAR_LIGNE = VERTICAL ? 3 : 4;
  const stage = document.getElementById('scene');

  // Préparation : mots découpés (A2), traits de rature (A5), soulignement de l'italique (A3).
  for (const el of document.querySelectorAll('[data-mots]')) {
    const mots = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    mots.forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'm';
      s.textContent = w + (i < mots.length - 1 ? ' ' : '');
      el.appendChild(s);
    });
  }
  for (const el of document.querySelectorAll('[data-barre]')) {
    el.classList.add('barrable');
    const corps = document.createElement('span');
    while (el.firstChild) corps.appendChild(el.firstChild);
    const trait = document.createElement('i');
    trait.className = 'rature';
    el.append(corps, trait);
  }
  for (const el of document.querySelectorAll('.ital[data-in]')) {
    const t = document.createElement('i');
    t.className = 'trait';
    el.appendChild(t);
  }
  for (const img of document.querySelectorAll('img[data-cap]')) img.decoding = 'sync';

  const attente = [];
  function animer(el, lt, sc) {
    const d = el.dataset;
    let o = 1;
    let x = 0;
    let y = 0;
    let s = 1;
    let r = Number(d.r ?? 0);
    let clip = '';
    if (d.vis) {
      const g = seg(d.vis);
      const t = lt + sc.debut;
      if (t < g.debut || t >= g.debut + g.duree) o = 0;
    }
    if (d.in) {
      const k = lt - sc.rep(d.t);
      if (k < 0) o = 0;
      else if (d.in === 'haut') ((o *= borne(k / 0.2)), (y += (1 - doux(k / 0.4)) * 44));
      else if (d.in === 'bas') ((o *= borne(k / 0.2)), (y += (1 - doux(k / 0.45)) * 90));
      else if (d.in === 'droite') ((o *= borne(k / 0.12)), (x += (1 - rebond(k / 0.45)) * 1100));
      else if (d.in === 'gauche') ((o *= borne(k / 0.12)), (x -= (1 - rebond(k / 0.45)) * 1100));
      else if (d.in === 'pop') ((o *= borne(k / 0.1)), (s *= 0.4 + 0.6 * rebond(k / 0.36)));
      else if (d.in === 'fondu') o *= borne(k / 0.3);
      else if (d.in === 'balaye')
        clip = `inset(-20% ${(1 - doux(k / Number(d.d ?? 0.3))) * 100}% -20% 0 round 14px)`;
      else if (d.in === 'tampon') s *= 1.6 - 0.6 * rebond(k / 0.22);
      else if (d.in === 'masque') {
        clip = `inset(-10% ${(1 - doux(k / 0.4)) * 100}% -10% 0)`;
        const t = el.querySelector('i.trait');
        if (t) t.style.transform = `scaleX(${doux((k - 0.35) / 0.27)})`;
      } else if (d.in === 'tombe') {
        const p = borne(k / 0.42);
        y -=
          (1 - (p < 0.75 ? (p / 0.75) ** 2 : 1 - 0.06 * Math.sin(((p - 0.75) / 0.25) * Math.PI))) *
          760;
      }
    }
    if (d.out) {
      const k = lt - sc.rep(d.o);
      if (k > 0) {
        if (d.out === 'fondu') o *= 1 - borne(k / 0.25);
        else if (d.out === 'coupe') o = 0;
        else if (d.out === 'chute')
          ((y += k * k * 2400),
            (r += k * 34 * Number(d.sens ?? 1)),
            (o *= 1 - borne((k - 0.45) / 0.2)));
        else if (d.out === 'gauche')
          ((x -= doux(k / 0.4) * 1500), (o *= 1 - borne((k - 0.2) / 0.2)));
        else if (d.out === 'pop') ((s *= 1 - 0.3 * borne(k / 0.2)), (o *= 1 - borne(k / 0.2)));
      }
    }
    if (d.flotte !== undefined) y += Math.sin(lt * 1.5 + Number(d.flotte || 0)) * 7;
    if (d.pulse) {
      for (const e of d.pulse.split(',')) {
        const k = lt - sc.rep(e);
        if (k > 0 && k < 0.45) s *= 1 + 0.14 * Math.sin((k / 0.45) * Math.PI);
      }
    }
    if (d.mots !== undefined) {
      const t0 = sc.rep(d.mots || d.t);
      [...el.children].forEach((m, i) => {
        const k = lt - t0 - i * 0.1;
        m.style.opacity = borne(k / 0.2);
        m.style.transform = `translateY(${(1 - doux(k / 0.25)) * 22}px)`;
      });
    }
    if (d.barre) {
      const k = lt - sc.rep(d.barre);
      el.lastChild.style.transform = `scaleX(${doux(k / 0.2)})`;
      el.firstChild.style.opacity = 1 - 0.6 * borne(k / 0.2);
    }
    if (d.compte) {
      const [a, b] = d.compte.split(',').map(Number);
      const k = (lt - sc.rep(d.t)) / 0.67;
      el.textContent = String(Math.round(a + (b - a) * doux(k)));
      if (k > 1 && k < 1.6) s *= 1 + 0.08 * Math.sin(((k - 1) / 0.6) * Math.PI);
    }
    const cache = el.closest('[data-vis]');
    const horsChamp =
      cache &&
      (lt + sc.debut < seg(cache.dataset.vis).debut ||
        lt + sc.debut >= seg(cache.dataset.vis).debut + seg(cache.dataset.vis).duree);
    if (d.cap && !horsChamp) {
      // Capture : image de la prise à `de` secondes, lue à `vitesse`, à partir de l'instant `t`.
      const k = Math.max(0, lt - sc.rep(d.ct ?? 0));
      const n = CAP.images[d.cap];
      const max = d.jusqua ? Math.min(n, Math.round(Number(d.jusqua) * IPS)) : n;
      const i = borne(
        Math.round((Number(d.de ?? 0) + k * Number(d.vitesse ?? 1)) * IPS) + 1,
        1,
        max,
      );
      const src = `${CAP.base}/${d.cap}/${String(i).padStart(5, '0')}.jpg`;
      if (el.dataset.src !== src) {
        el.dataset.src = src;
        el.src = src;
        attente.push(el.decode().catch(() => undefined));
      }
    }
    if (d.fn) {
      const e = FN[d.fn](el, lt, sc) ?? {};
      o *= e.o ?? 1;
      x += e.x ?? 0;
      y += e.y ?? 0;
      s *= e.s ?? 1;
      r += e.r ?? 0;
    }
    el.style.opacity = o;
    el.style.transform = `translate(${x}px,${y}px) scale(${s}) rotate(${r}deg)`;
    if (clip) el.style.clipPath = clip;
  }

  // Sous-titres : lignes de 2 à 4 mots, coupées à la ponctuation, mot prononcé en orange.
  const FORTS = [
    /^gratuitement/,
    /^zero$/,
    /^euro$/,
    /^dix$/,
    /^deux$/,
    /^minutes$/,
    /^trois$/,
    /^artisans$/,
  ];
  const lignes = [];
  for (const g of TL.segments) {
    const jetons = g.texte
      .replace(/[«»"]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .reduce(
        (l, j) => (
          /[a-zA-Z0-9À-ÿ]/.test(j) ? l.push(j) : l.length && (l[l.length - 1] += ` ${j}`),
          l
        ),
        [],
      );
    const temps = jetons.map((_, i) => {
      const w =
        g.mots[
          Math.min(
            g.mots.length - 1,
            Math.round((i * (g.mots.length - 1)) / Math.max(1, jetons.length - 1)),
          )
        ];
      return jetons.length === g.mots.length ? g.mots[i] : w;
    });
    let ligne = [];
    const fermer = () => ligne.length && (lignes.push(ligne), (ligne = []));
    jetons.forEach((j, i) => {
      ligne.push({ texte: j, t: temps[i].t, f: temps[i].t + temps[i].d });
      const reste = jetons.length - i - 1;
      if (
        (/[,.?!:…]$/.test(j) && ligne.length >= 2 && reste !== 1) ||
        ligne.length === MOTS_PAR_LIGNE ||
        (ligne.length === MOTS_PAR_LIGNE - 1 && reste === 2)
      )
        fermer();
    });
    fermer();
  }
  const st = document.getElementById('st');
  let ligneAffichee = null;
  function sousTitres(t) {
    const i = lignes.findIndex(
      (l, n) =>
        t >= l[0].t - 0.08 && t < (lignes[n + 1]?.[0].t ?? Infinity) - 0.08 && t < l.at(-1).f + 0.5,
    );
    const l = i < 0 || window.__SANS_ST ? null : lignes[i];
    if (l !== ligneAffichee) {
      ligneAffichee = l;
      st.textContent = '';
      const bande = document.createElement('div');
      bande.className = 'bande';
      if (l) st.appendChild(bande);
      for (const m of l ?? []) {
        const s = document.createElement('span');
        s.textContent = m.texte;
        if (FORTS.some((f) => f.test(sansAccent(m.texte)))) s.classList.add('fort');
        bande.appendChild(s);
      }
    }
    (l ?? []).forEach((m, n) =>
      st.firstChild.children[n].classList.toggle(
        'dit',
        t >= m.t - 0.04 && t < (l[n + 1]?.t ?? m.f + 0.3) - 0.04,
      ),
    );
    st.classList.toggle('clair', stage.dataset.fond === 'clair');
    st.style.bottom = `${VERTICAL ? 300 : (stage.dataset.st ?? 64)}px`;
  }

  /** Affiche l'image `n` (30 images/s) ; la promesse se résout quand les captures sont chargées. */
  window.allerA = async (n) => {
    const t = n / IPS;
    let secousse = 0;
    for (const sc of scenes) {
      const actif = t >= sc.debut && t < sc.fin;
      sc.el.classList.toggle('on', actif);
      if (!actif) continue;
      const lt = t - sc.debut;
      // `data-st` d'une section : hauteur des sous-titres, sauf si la section porte un bruitage
      // (c'est alors l'instant du bruitage).
      stage.dataset.st = sc.el.dataset.sfx ? 64 : (sc.el.dataset.st ?? 64);
      stage.dataset.fond = sc.el.classList.contains('nuit') ? 'nuit' : 'clair';
      for (const el of sc.el.querySelectorAll(
        '[data-in],[data-out],[data-mots],[data-barre],[data-compte],[data-cap],[data-fn],[data-flotte],[data-pulse],[data-vis]',
      )) {
        animer(el, lt, sc);
        if (el.dataset.in === 'tampon') {
          const k = lt - sc.rep(el.dataset.t) - 0.2;
          if (k >= 0 && k < 2.5 / IPS) secousse = k < 1 / IPS ? 10 : -6;
        }
      }
    }
    stage.style.transform = `translate(${secousse}px,${secousse * 0.6}px)`;
    sousTitres(t);
    await Promise.all(attente.splice(0));
    return t;
  };

  /** Bruitages : `data-sfx="ding"` à l'instant `data-st` (sinon celui de l'entrée `data-t`). */
  window.bruitages = () =>
    scenes
      .flatMap((sc) =>
        [sc.el, ...sc.el.querySelectorAll('[data-sfx]')]
          .filter((el) => el.dataset.sfx)
          .flatMap((el) =>
            (el.dataset.st ?? el.dataset.t ?? '0').split(',').map((e, i) => ({
              t: Math.round((sc.debut + sc.rep(e)) * 1000) / 1000,
              nom: el.dataset.sfx.split(',')[i] ?? el.dataset.sfx.split(',')[0],
            })),
          ),
      )
      .sort((a, b) => a.t - b.t);
  window.lignesSousTitres = () =>
    lignes.map((l) => ({
      debut: l[0].t,
      fin: l.at(-1).f + 0.25,
      texte: l.map((m) => m.texte).join(' '),
    }));
  window.outils = { borne, doux, rebond, seg, IPS };
})();
