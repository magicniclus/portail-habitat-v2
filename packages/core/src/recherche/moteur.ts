import { BONUS_LIBELLE_EXACT, BONUS_MOT_CLE_EXACT, MOTS_VIDES, URGENCE } from './constantes';
import { distance, motsDe, normaliser, raciner, surligner } from './texte';

export interface Intention {
  id: string;
  libelle: string;
  metier: string;
  prestation: string;
  popularite: number;
  motsCles: string[];
}

export interface Metier {
  id: string;
  nom: string;
  famille: string;
  prestation: string;
  alias: string[];
}

export interface DonneesRecherche {
  intentions: readonly Intention[];
  metiers: Readonly<Record<string, Metier>>;
  /** Développements appliqués avant la recherche : `sdb` → `salle bain`. */
  synonymes: Readonly<Record<string, string>>;
  motsVides?: ReadonlySet<string>;
}

export interface Suggestion {
  id: string;
  libelle: string;
  segments: { t: string; b: boolean }[];
  metier: string | undefined;
  metierId: string;
  prestation: string;
  score: number;
}

export interface ResultatRecherche {
  resultats: Suggestion[];
  /** Requête corrigée à proposer (« Vous vouliez dire… »), ou null. */
  correction: string | null;
  urgence: boolean;
  metiers: { id: string; nom: string | undefined }[];
  associees: { id: string; libelle: string; prestation: string }[];
}

interface Entree extends Intention {
  nl: string;
  nk: string[];
  termes: Set<string>;
}

/**
 * Moteur de recherche de projet, portage de docs/designs/recherche-projets.js.
 * Les données viennent de referentiel/recherche ; le même moteur sert de repli hors ligne au site.
 */
export function creerMoteur(donnees: DonneesRecherche) {
  const vides = donnees.motsVides ?? MOTS_VIDES;
  const syn = donnees.synonymes;
  const mots = (s: string, garder = false) => motsDe(s, vides, garder);
  const variantes = (t: string) => [t, ...(syn[t] ? syn[t].split(' ').map(raciner) : [])];

  const vocabulaire = new Set<string>();
  const surface: Record<string, string> = {};
  const entrees: Entree[] = donnees.intentions.map((it) => {
    const m = donnees.metiers[it.metier];
    for (const w of normaliser(`${it.libelle} ${it.motsCles.join(' ')}`).split(' ')) {
      const r = raciner(w);
      if (!surface[r]) surface[r] = w;
    }
    const termes = new Set<string>([
      ...mots(it.libelle),
      ...it.motsCles.flatMap((k) => mots(k)),
      ...mots(m ? `${m.nom} ${m.alias.join(' ')}` : ''),
    ]);
    for (const t of termes) vocabulaire.add(t);
    return { ...it, nl: normaliser(it.libelle), nk: it.motsCles.map(normaliser), termes };
  });
  const voc = [...vocabulaire];
  const df: Record<string, number> = {};
  for (const e of entrees) for (const t of e.termes) df[t] = (df[t] ?? 0) + 1;
  const n = entrees.length;
  const idf = (t: string) => {
    let d = df[t];
    if (!d) for (const v of voc) if (v.startsWith(t)) d = Math.max(d ?? 0, df[v]!);
    return d ? Math.log(1 + n / d) / Math.log(1 + n / 1.5) : 1;
  };

  const corriger = (tok: string) => {
    if (vocabulaire.has(tok) || syn[tok] || tok.length < 4) return tok;
    const max = tok.length >= 8 ? 2 : 1;
    let meilleur: string | null = null;
    let bd = max + 1;
    for (const v of voc) {
      if (v[0] !== tok[0] && tok.length < 7) continue;
      const x = distance(tok, v, max);
      if (x < bd) {
        bd = x;
        meilleur = v;
      }
    }
    return meilleur ?? tok;
  };

  const scorer = (e: Entree, groupes: string[][], qnorm: string, dernier: string) => {
    let s = 0;
    let trouves = 0;
    let poidsTotal = 0;
    let poidsTrouve = 0;
    for (const groupe of groupes) {
      let meilleur = 0;
      const w0 = idf(groupe[0]!);
      poidsTotal += w0;
      for (const t of groupe) {
        let m = 0;
        if (e.termes.has(t)) m = 3;
        else if (groupe[0] === dernier && t.length >= 2) {
          for (const w of e.termes)
            if (w.startsWith(t)) {
              m = 2.2;
              break;
            }
        }
        if (!m && t.length >= 4) {
          const max = t.length >= 8 ? 2 : 1;
          for (const w of e.termes)
            if (Math.abs(w.length - t.length) <= max && distance(t, w, max) <= max) {
              m = 1.6;
              break;
            }
        }
        if (m > meilleur) meilleur = m;
      }
      if (meilleur) {
        trouves++;
        s += meilleur * (0.4 + w0);
        poidsTrouve += w0;
      }
    }
    if (!trouves) return 0;
    if (groupes.length >= 2 && poidsTotal && poidsTrouve / poidsTotal < 0.55) return 0;
    const couverture = poidsTotal ? poidsTrouve / poidsTotal : 0;
    if (qnorm.length >= 3) {
      if (e.nl.startsWith(qnorm)) s += 5;
      else if (e.nl.includes(qnorm)) s += 3.5;
      else if (e.nk.some((k) => k === qnorm)) s += 4.5;
      else if (e.nk.some((k) => k.startsWith(qnorm))) s += 3;
      else if (e.nk.some((k) => k.includes(qnorm))) s += 2;
    }
    // Correction du lot 3 (RECHERCHE.md §2) : une requête identique à un libellé, ou à un mot-clé choisi,
    // doit l'emporter sur une intention voisine plus populaire.
    if (e.nl === qnorm) s += BONUS_LIBELLE_EXACT;
    else if (e.nk.some((k) => k === qnorm)) s += BONUS_MOT_CLE_EXACT;
    return s * (0.35 + 0.65 * couverture * couverture) + e.popularite * 0.6;
  };

  const nomMetier = (id: string) => donnees.metiers[id]?.nom;

  function rechercher(q: string, options: { max?: number } = {}): ResultatRecherche {
    const max = options.max ?? 7;
    const qn = normaliser(q);
    if (qn.length < 2)
      return { resultats: [], correction: null, urgence: false, metiers: [], associees: [] };
    let brut = mots(q);
    if (!brut.length) brut = mots(q, true);
    const dernierBrut = brut[brut.length - 1]!;
    const corr = brut.map((t) => (t === dernierBrut ? t : corriger(t)));
    const dernier = voc.some((v) => v.startsWith(dernierBrut))
      ? dernierBrut
      : corriger(dernierBrut);
    corr[corr.length - 1] = dernier;
    const groupes = corr.map(variantes);
    const plats = groupes.flat();
    const corrige = corr.some((t, i) => t !== brut[i]);
    const tous = entrees
      .map((e) => ({ e, s: scorer(e, groupes, qn, dernier) }))
      .filter((x) => x.s > 1.2)
      .sort((a, b) => b.s - a.s);
    const seuil = tous.length ? Math.max(3.5, tous[0]!.s * 0.34) : 0;
    const retenus = tous.filter((x) => x.s >= seuil);
    const top = retenus.slice(0, max);
    const metiers: ResultatRecherche['metiers'] = [];
    const vus = new Set<string>();
    for (const { e } of retenus) {
      if (!vus.has(e.metier) && metiers.length < 4) {
        vus.add(e.metier);
        metiers.push({ id: e.metier, nom: nomMetier(e.metier) });
      }
    }
    const lies = new Set(top.map((x) => x.e.id));
    const premier = top[0]?.e;
    const associees = premier
      ? entrees
          .filter((e) => e.metier === premier.metier && !lies.has(e.id))
          .sort((a, b) => b.popularite - a.popularite)
          .slice(0, 4)
          .map((e) => ({ id: e.id, libelle: e.libelle, prestation: e.prestation }))
      : [];
    return {
      resultats: top.map(({ e, s }) => ({
        id: e.id,
        libelle: e.libelle,
        segments: surligner(e.libelle, plats),
        metier: nomMetier(e.metier),
        metierId: e.metier,
        prestation: e.prestation,
        score: Math.round(s * 10) / 10,
      })),
      correction: corrige && top.length ? corr.map((t) => surface[t] ?? t).join(' ') : null,
      urgence: URGENCE.test(q),
      metiers,
      associees,
    };
  }

  /** Recherche de métiers (inscription artisan, filtres de l'annuaire) : nom et alias, préfixe, fautes. */
  function rechercherMetiers(q: string, max = 8) {
    const qn = normaliser(q);
    const liste = Object.values(donnees.metiers);
    if (qn.length < 1)
      return liste.slice(0, max).map((m) => ({ ...m, segments: [{ t: m.nom, b: false }] }));
    const qt = mots(q, true).map((t) => (syn[t] ? [t, ...syn[t].split(' ').map(raciner)] : [t]));
    return liste
      .map((m) => {
        const nn = normaliser(m.nom);
        const termes = new Set(mots(`${m.nom} ${m.alias.join(' ')}`, true));
        let s = 0;
        let ok = 0;
        for (const g of qt) {
          let b = 0;
          for (const t of g) {
            for (const w of termes) {
              if (w === t) b = Math.max(b, 3);
              else if (w.startsWith(t)) b = Math.max(b, 2.2);
              else if (
                t.length >= 4 &&
                Math.abs(w.length - t.length) <= 1 &&
                distance(t, w, 1) <= 1
              )
                b = Math.max(b, 1.5);
            }
          }
          if (b) {
            ok++;
            s += b;
          }
        }
        if (ok < qt.length) return { m, s: 0 };
        if (nn.startsWith(qn)) s += 4;
        else if (nn.includes(qn)) s += 2;
        if (m.alias.some((a) => a.startsWith(qn))) s += 1.5;
        return { m, s };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, max)
      .map(({ m }) => ({ ...m, segments: surligner(m.nom, qt.flat()) }));
  }

  const intentionsDuMetier = (id: string) =>
    entrees
      .filter((e) => e.metier === id)
      .sort((a, b) => b.popularite - a.popularite)
      .map((e) => ({ id: e.id, libelle: e.libelle, prestation: e.prestation }));

  const populaires = () =>
    entrees
      .filter((e) => e.popularite >= 5)
      .slice(0, 8)
      .map((e) => ({
        id: e.id,
        libelle: e.libelle,
        prestation: e.prestation,
        metier: nomMetier(e.metier),
      }));

  return { rechercher, rechercherMetiers, intentionsDuMetier, populaires };
}

export type MoteurRecherche = ReturnType<typeof creerMoteur>;
