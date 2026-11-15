// Animations propres à certains plans de la VSL (`data-fn`). Chaque fonction reçoit l'élément, le
// temps local de la scène et la scène ; elle renvoie un décalage { o, x, y, s, r } ou modifie un style.
/* global window */
/* eslint-disable no-restricted-syntax */
(() => {
  const { borne, doux, seg } = window.outils;
  const FN = window.FN;
  const PI = Math.PI;

  // Plan 1 : ondes derrière la carte, après le « ding ».
  FN.anneau = (el, lt) => {
    const k = lt < 0.6 ? -1 : ((lt - 0.6 + Number(el.dataset.n) * 1.2) % 2.4) / 2.4;
    const r = 320 + Math.max(0, k) * 700;
    Object.assign(el.style, {
      width: `${r * 2}px`,
      height: `${r}px`,
      margin: `${-r / 2}px 0 0 ${-r}px`,
      borderRadius: '50%',
      border: `3px solid rgba(255,152,87,${k < 0 ? 0 : (1 - k) * 0.45})`,
    });
  };
  // Plan 2 : la carte monte pour laisser la place aux trois lignes.
  FN.monte = (_el, lt) => ({ y: -250 * doux(lt / 0.5) });
  // Téléphone qui vibre (une fois, ou par salves avec `data-boucle`).
  FN.vibre = (el, lt, sc) => {
    const k = lt - sc.rep(el.dataset.t);
    if (k < 0) return {};
    const force = el.dataset.boucle ? (Math.sin(k * 3.2) > -0.3 ? 1 : 0) : Math.max(0, 1 - k / 1.3);
    return { x: Math.sin(k * 70) * 8 * force, r: Math.sin(k * 70 + 1) * 4 * force };
  };
  FN.sonne = (_el, lt) => {
    const force = Math.sin(lt * 5) > -0.2 ? 1 : 0;
    return { x: Math.sin(lt * 64) * 6 * force, r: Math.sin(lt * 64 + 1) * 3 * force };
  };
  // Plan 5 : pages du calendrier qui tombent, épingle qui s'éloigne.
  FN.page = (el, lt, sc) => {
    const g = seg('p05b');
    const k = ((((lt + sc.debut - g.debut) * 0.8 + Number(el.dataset.n) * 0.5) % 1) + 1) % 1;
    return { y: k * 300, r: (Number(el.dataset.n) ? -1 : 1) * k * 46, o: 1 - k };
  };
  FN.eloigne = (_el, lt, sc) => {
    const g = seg('p05c');
    const k = doux(((lt + sc.debut - g.debut) / g.duree) * 1.1);
    return { x: k * 150, y: -k * 46, s: 1 - 0.45 * k };
  };
  // Plan 6 : les trois « oui » se rejoignent, la flèche part vers la droite.
  FN.converge = (el, lt) => {
    const p = doux((lt - 0.1) / 0.55);
    return {
      x: ([150, 420, 690][Number(el.dataset.n)] - 870) * (1 - p),
      y: 290 * (1 - p),
      o: 1 - borne((lt - 0.7) / 0.15),
    };
  };
  FN.glisse = (_el, lt) => ({ x: Math.max(0, lt - 0.75) * 70 });
  // Plan 8 : le soleil descend entre « chantier » et « le soir ».
  FN.soleil = (_el, lt, sc) => {
    const p = borne((lt - 0.2) / sc.rep('@soir'));
    return {
      x: p * 560,
      y: -Math.sin(p * PI * 0.85) * 90 + p * p * 560,
      o: 1 - borne((p - 0.82) / 0.18),
    };
  };
  // Le chantier s'assombrit, le bureau s'éclaire sur « le soir ».
  FN.crepuscule = (_el, lt, sc) => ({ o: doux((lt - sc.rep('@soir') + 0.4) / 0.8) });
  FN.reveil = (_el, lt, sc) => ({ o: 0.62 * (1 - doux((lt - sc.rep('@soir') + 0.2) / 0.5)) });
  FN.monteCharge = (_el, lt) => ({ y: 610 - 150 * Math.sin(lt * 1.3) });
  FN.derive = (_el, lt) => ({ x: lt * 16 });
  FN.vapeur = (_el, lt) => ({ y: -((lt * 12) % 10), o: 0.55 + 0.45 * Math.sin(lt * 3) });
  // Plan 11 : la ligne à l'étoile remonte en tête, les autres descendent d'un cran.
  FN.descend = (_el, lt, sc) => ({ y: 120 * doux((lt - sc.rep('@inverse')) / 0.6) });
  FN.grimpe = (_el, lt, sc) => ({ y: 600 * (1 - doux((lt - sc.rep('@inverse')) / 0.6)) });
  // Plan 16 : le chronomètre file jusqu'à « deux minutes ».
  FN.arc = (el, lt, sc) => {
    el.style.strokeDashoffset = 654 * (1 - borne((lt - 0.3) / (sc.rep('@minutes') - 0.3)));
  };
  // Plan 19 : le rayon s'élargit autour de Bordeaux.
  FN.cercle = (el, lt, sc) => {
    const a = sc.rep('@rayon');
    const r = 70 + doux((lt - a) / (sc.rep('@cent') + 0.7 - a)) * 190;
    Object.assign(el.style, {
      width: `${r * 2}px`,
      height: `${r * 2}px`,
      margin: `${-r}px 0 0 ${-r}px`,
      borderRadius: '50%',
      border: '6px solid #e05a10',
      background: 'rgba(224,90,16,.16)',
    });
  };
  // Plan 20 : le bouclier se dessine.
  FN.trace = (el, lt) => {
    el.style.strokeDashoffset = 380 * (1 - doux((lt - 0.2) / 0.8));
  };
  // Plan 22 : la carte de l'outil cité s'éclaire et rebondit ; les précédentes restent allumées.
  FN.outil = (el, lt, sc) => {
    const g = seg(el.dataset.seg);
    const k = lt + sc.debut - (g.debut - 0.2);
    const actif = k >= 0 && k < g.duree;
    el.style.background = `rgba(255,255,255,${actif ? 0.18 : k >= 0 ? 0.1 : 0.05})`;
    el.style.borderColor = actif ? '#ff9857' : `rgba(255,255,255,${k >= 0 ? 0.32 : 0.15})`;
    return { s: k > 0 && k < 0.4 ? 1 + 0.08 * Math.sin((k / 0.4) * PI) : 1 };
  };
  FN.centre = (el, lt, sc) => {
    const p = doux((lt - sc.rep('@p22g')) / 0.6);
    el.style.borderStyle = p > 0.5 ? 'solid' : 'dashed';
    return { x: -600 * p, s: 1 + 0.18 * p };
  };
  // Plan 24 : les options s'effacent, le gratuit grandit.
  FN.grandit = (_el, lt, sc) => ({ s: 1 + 0.1 * doux((lt - sc.rep('@personne')) / 0.5) });
  FN.efface = (_el, lt, sc) => ({ o: 1 - 0.5 * doux((lt - sc.rep('@personne')) / 0.5) });
  // Plan 26 : les cartes traversent l'écran sans s'arrêter.
  FN.vol = (el, lt) => {
    const k = lt - Number(el.dataset.n) - 0.1;
    return { x: 1920 - k * 1500, o: k < 0 ? 0 : 1, s: 0.86 };
  };
  // Plan 28 : bouton qui pulse (100 → 104 % toutes les 24 images), reflet toutes les 2 s, flèche.
  FN.bouton = (el, lt, sc) => {
    const k = lt - sc.rep(el.dataset.t);
    return { s: k > 0.5 ? 1.02 + 0.02 * Math.sin((k * 2 * PI) / 0.8) : 1 };
  };
  FN.reflet = (_el, lt) => {
    const k = (lt % 2) / 0.7;
    return { x: -260 + k * 1500, o: k < 1 ? 1 : 0 };
  };
  FN.rebondit = (_el, lt) => ({ y: Math.abs(Math.sin(lt * 4)) * 20 });
})();
