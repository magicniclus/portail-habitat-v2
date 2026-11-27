import { A_COMPLETER } from '../sites/ia/operations';
import { contientMotCle, statsTexte } from './html';

export interface ArticleAControler {
  titre: string;
  meta: string;
  motCle: string;
  corpsHtml: string;
  image: { src: string; alt: string };
  categorieId: string;
}

export interface PointSeo {
  cle: string;
  libelle: string;
}

export interface ControleSeo {
  bloquants: PointSeo[];
  recommandations: PointSeo[];
  /** 0 à 100 : part des points respectés. */
  score: number;
}

/**
 * Contrôle SEO (BLOG §3) : les points bloquants empêchent de planifier ou publier (BLOG-04) ;
 * les recommandations s'affichent sans bloquer. Même fonction à l'écran et sur le serveur.
 */
export function controleSeo(
  a: ArticleAControler,
  ctx: { mentionsCompletes: boolean },
): ControleSeo {
  const t = a.titre.trim();
  const m = a.meta.trim();
  const s = statsTexte(a.corpsHtml, a.motCle);
  const aCompleter = [a.titre, a.meta, a.corpsHtml, a.image.alt].some((x) =>
    x.includes(A_COMPLETER),
  );
  const bloquants: [boolean, PointSeo][] = [
    [t.length >= 10 && t.length <= 70, { cle: 'titre', libelle: 'Titre de 10 à 70 caractères' }],
    [
      m.length >= 120 && m.length <= 160,
      { cle: 'meta', libelle: 'Méta-description de 120 à 160 caractères' },
    ],
    [
      contientMotCle(t, a.motCle),
      { cle: 'motCleTitre', libelle: 'Mot-clé principal dans le titre' },
    ],
    [
      a.image.alt.trim().length >= 10,
      { cle: 'alt', libelle: 'Texte alternatif de l’image (10 caractères au moins)' },
    ],
    [Boolean(a.categorieId), { cle: 'categorie', libelle: 'Une catégorie' }],
    [
      ctx.mentionsCompletes,
      { cle: 'mentions', libelle: 'Mentions légales complètes (Devis & factures › Paramètres)' },
    ],
    [!aCompleter, { cle: 'aCompleter', libelle: 'Informations à compléter (« [à compléter] »)' }],
  ];
  const recommandations: [boolean, PointSeo][] = [
    [
      t.length >= 50 && t.length <= 60,
      { cle: 'titreIdeal', libelle: 'Titre de 50 à 60 caractères' },
    ],
    [s.motCleAuDebut, { cle: 'motCleDebut', libelle: 'Mot-clé dans les 100 premiers mots' }],
    [
      s.densite >= 0.5 && s.densite <= 2.5,
      { cle: 'densite', libelle: 'Mot-clé présent sans excès (0,5 à 2,5 %)' },
    ],
    [
      s.liensInternes >= 2,
      { cle: 'liensInternes', libelle: 'Deux liens vers vos pages ou articles' },
    ],
    [s.mots >= 300, { cle: 'longueur', libelle: '300 mots au moins' }],
    [s.intertitres >= 2, { cle: 'intertitres', libelle: 'Deux intertitres au moins' }],
  ];
  const tous = [...bloquants, ...recommandations];
  return {
    bloquants: bloquants.filter(([ok]) => !ok).map(([, p]) => p),
    recommandations: recommandations.filter(([ok]) => !ok).map(([, p]) => p),
    score: Math.round((tous.filter(([ok]) => ok).length / tous.length) * 100),
  };
}
