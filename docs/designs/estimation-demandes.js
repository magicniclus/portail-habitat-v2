/* Portail Habitat — modèle d'estimation du nombre de demandes de travaux par zone et par métier.
   Sert tant que l'historique réel est insuffisant ; en production, remplacé par le décompte réel (voir docs/STATS_DEMANDES.md).
   Dépend de window.PH_RECHERCHE (référentiel des métiers et intentions) pour la part de chaque métier. */
(function () {
  // Population par département (milliers d'habitants, ordre de grandeur Insee)
  const POP = { "01":657,"02":526,"03":335,"04":165,"05":141,"06":1098,"07":330,"08":268,"09":155,"10":311,"11":376,"12":280,"13":2056,"14":697,"15":144,"16":352,"17":657,"18":298,"19":240,"2A":160,"2B":184,"21":535,"22":602,"23":115,"24":413,"25":545,"26":522,"27":600,"28":431,"29":918,"30":752,"31":1435,"32":191,"33":1654,"34":1201,"35":1095,"36":217,"37":612,"38":1283,"39":258,"40":420,"41":327,"42":767,"43":228,"44":1450,"45":684,"46":175,"47":332,"48":77,"49":822,"50":491,"51":566,"52":170,"53":307,"54":732,"55":181,"56":761,"57":1047,"58":199,"59":2611,"60":830,"61":276,"62":1461,"63":666,"64":689,"65":229,"66":482,"67":1152,"68":767,"69":1890,"70":233,"71":548,"72":566,"73":438,"74":836,"75":2133,"76":1255,"77":1438,"78":1450,"79":375,"80":568,"81":391,"82":262,"83":1090,"84":562,"85":694,"86":439,"87":372,"88":360,"89":335,"90":141,"91":1306,"92":1627,"93":1655,"94":1409,"95":1256,"971":384,"972":355,"973":286,"974":871,"976":300 };
  const PETITE_COURONNE = ["75", "92", "93", "94"];

  // Paramètres par défaut (en production : Firestore stats/modeleDemandes, modifiables dans l'admin)
  const PARAM = {
    tauxHabitantAn: 0.012,          // demandes de travaux déposées par habitant et par an sur la plateforme
    couverture: { 30: 0.45, 50: 0.8, 100: 1.6 }, // part de la population du département couverte selon le rayon
    // part des demandes par famille de travaux (somme = 1)
    familles: { plomberie: 0.13, chauffage: 0.12, electricite: 0.11, menuiseries: 0.09, "sdb-cuisine": 0.09, deco: 0.09, toiture: 0.08,
      isolation: 0.07, sols: 0.05, interieur: 0.05, "gros-oeuvre": 0.04, exterieur: 0.04, depannage: 0.02, traitements: 0.015, securite: 0.005 },
    // saisonnalité par mois (janvier → décembre, moyenne = 1)
    saison: [0.85, 0.95, 1.12, 1.18, 1.12, 1.02, 0.86, 0.72, 1.08, 1.12, 1.0, 0.98],
    minimum: 3,
  };

  const dept = (cp) => { cp = String(cp || "").replace(/\D/g, ""); if (cp.length < 2) return null;
    if (cp.startsWith("97")) return cp.slice(0, 3); if (cp.startsWith("20")) return Number(cp) < 20200 ? "2A" : "2B"; return cp.slice(0, 2); };

  // part d'un métier = part de sa famille × poids de ses intentions (popularité) dans la famille
  function partMetier(id) {
    const R = window.PH_RECHERCHE; if (!R || !id || !R.METIERS[id]) return 1;
    const fam = R.METIERS[id].famille, pf = PARAM.familles[fam] || 0.02;
    const poids = (m) => R.INTENTIONS.filter((i) => i.m === m).reduce((a, i) => a + i.pop, 0);
    const total = Object.keys(R.METIERS).filter((m) => R.METIERS[m].famille === fam).reduce((a, m) => a + poids(m), 0) || 1;
    return pf * (poids(id) / total);
  }

  /* estimer({ cp, metiers: [ids], rayon: 30|50|100, date }) → { total, parMetier: {id: n}, departement, source } */
  function estimer(o) {
    const d = dept(o && o.cp); const pop = d && POP[d] ? POP[d] * 1000 : null;
    if (!pop) return { total: null, parMetier: {}, departement: d, source: "modele" };
    const rayon = (o && o.rayon) || 30;
    let couv = PARAM.couverture[rayon] || PARAM.couverture[30];
    if (PETITE_COURONNE.indexOf(d) > -1) couv = Math.max(couv, rayon >= 50 ? 2.2 : 1.1); // zone dense : le rayon déborde sur les départements voisins
    const mois = ((o && o.date) || new Date()).getMonth();
    const base = pop * couv * PARAM.tauxHabitantAn / 12 * PARAM.saison[mois];
    const ids = (o && o.metiers && o.metiers.length) ? o.metiers : [null];
    const parMetier = {}; let total = 0;
    ids.forEach((id) => { const n = Math.max(PARAM.minimum, Math.round(base * (id ? partMetier(id) : 1))); parMetier[id || "tous"] = n; total += n; });
    return { total, parMetier, departement: d, source: "modele" };
  }

  window.PH_DEMANDES = { estimer, partMetier, PARAM, POP, dept };
})();
