import { elementDuCatalogue } from './catalogue';
import { A_COMPLETER, construireSection, type SectionIa } from './ia/operations';
import type { PageSite, TypeElement } from './schemas';

/**
 * Panneau « Ajouter » de l'éditeur (SITE_INTERNET §4.1) : 13 zones prêtes et les 16 éléments.
 * Les textes sont des intitulés à adapter ; tout ce qui serait un fait (chiffre, avis, téléphone)
 * reste « [à compléter] », ce qui bloque la publication tant que l'artisan ne l'a pas rempli.
 */
export interface SectionPrete {
  cle: string;
  nom: string;
  description: string;
  /** Vignette du panneau Ajouter : fond et largeurs des blocs. */
  vignette: { fond: 'blanc' | 'clair' | 'primaire' | 'sombre'; largeurs: number[] };
  section: SectionIa;
}

type El = SectionIa['rows'][number]['cols'][number]['els'][number];
const el = (type: TypeElement, p: Record<string, unknown> = {}): El => ({ type, p });
const col = (w: number, els: El[], p?: Record<string, unknown>) => ({
  w,
  els,
  ...(p ? { p } : {}),
});
type Ligne = { cols: ReturnType<typeof col>[]; p?: Record<string, unknown> };
const ligne = (cols: ReturnType<typeof col>[], p?: Record<string, unknown>): Ligne => ({
  cols,
  ...(p ? { p } : {}),
});
const section = (nom: string, rows: Ligne[], p: Record<string, unknown> = {}): SectionIa => ({
  p: { nom, fond: 'blanc', padY: t3(72, 56, 40), ...p },
  rows,
});
const t3 = (d: number, t: number, m: number) => ({ desktop: d, tablet: t, mobile: m });
const devis = { type: 'formulaire', formulaire: 'defiler' } as const;
const titre3 = (texte: string, mb = 8) =>
  el('titre', { texte, niveau: 'h3', taille: t3(21, 20, 19), mb });
/** Titre de zone et phrase d'introduction. */
const entete = (titre: string, texte: string, align: 'left' | 'center' = 'left') =>
  ligne([
    col(12, [el('titre', { texte: titre, mb: 8, align }), el('texte', { texte, mb: 0, align })]),
  ]);

/** Les 13 zones prêtes de la maquette ; faits (chiffres, avis, réponses) à compléter. */
export const SECTIONS_PRETES: readonly SectionPrete[] = [
  {
    cle: 'bandeau',
    nom: 'Bandeau',
    description: 'Titre, accroche, boutons, photo',
    vignette: { fond: 'clair', largeurs: [6, 6] },
    section: section(
      'Bandeau',
      [
        ligne(
          [
            col(
              6,
              [
                el('surtitre', { texte: 'Votre métier · votre ville' }),
                el('titre', {
                  texte: 'Votre titre principal',
                  niveau: 'h1',
                  taille: t3(48, 40, 30),
                  mb: 20,
                }),
                el('texte', {
                  texte: 'Une phrase qui dit ce que vous faites et pour qui.',
                  mb: 24,
                }),
                el('bouton', { texte: 'Demander un devis gratuit', action: devis, mb: 0 }),
              ],
              { valign: 'center' },
            ),
            col(6, [
              el('image', { legende: 'Photo d’un de vos chantiers', ratio: '4 / 3', mb: 0 }),
            ]),
          ],
          { gap: 48, valign: 'center' },
        ),
      ],
      { fond: 'clair', padY: t3(80, 60, 40) },
    ),
  },
  {
    cle: 'bandeau-photo',
    nom: 'Bandeau sur photo',
    description: 'Image de fond, couleur par-dessus',
    vignette: { fond: 'primaire', largeurs: [12] },
    section: section(
      'Bandeau sur photo',
      [
        ligne([
          col(12, [
            el('surtitre', { texte: 'Votre entreprise', align: 'center', couleur: 'blanc' }),
            el('titre', {
              texte: 'Votre titre principal',
              niveau: 'h1',
              taille: t3(48, 40, 30),
              align: 'center',
              mb: 16,
            }),
            el('texte', {
              texte: 'Une phrase qui donne envie d’aller plus loin.',
              align: 'center',
              mb: 24,
            }),
            el('bouton', {
              texte: 'Demander un devis gratuit',
              action: devis,
              couleur: 'accent',
              align: 'center',
              enLigne: false,
              mb: 0,
            }),
          ]),
        ]),
      ],
      {
        fond: 'primaire',
        fondType: 'image',
        voile: 'primaire',
        voileOpacite: 72,
        padY: t3(110, 80, 56),
      },
    ),
  },
  {
    cle: 'chiffres',
    nom: 'Chiffres clés',
    description: '4 chiffres qui rassurent',
    vignette: { fond: 'blanc', largeurs: [3, 3, 3, 3] },
    section: section(
      'Chiffres clés',
      [
        ligne(
          [1, 2, 3, 4].map(() =>
            col(3, [el('chiffre', { valeur: A_COMPLETER, label: A_COMPLETER, mb: 0 })]),
          ),
          { gap: 24 },
        ),
      ],
      { padY: t3(56, 44, 32) },
    ),
  },
  {
    cle: 'prestations',
    nom: 'Prestations',
    description: '3 cartes avec bouton',
    vignette: { fond: 'blanc', largeurs: [4, 4, 4] },
    section: section('Prestations', [
      entete('Ce que nous faisons', 'Présentez vos métiers en une phrase.'),
      ligne(
        ['Premier service', 'Deuxième service', 'Troisième service'].map((t) =>
          col(
            4,
            [
              titre3(t),
              el('texte', {
                texte: 'Décrivez ce service en deux phrases.',
                taille: t3(16, 16, 15),
              }),
              el('bouton', { texte: 'En savoir plus', variante: 'contour', action: devis, mb: 0 }),
            ],
            { fond: 'clair', pad: 24, arrondi: 12 },
          ),
        ),
        { gap: 20 },
      ),
    ]),
  },
  {
    cle: 'realisations',
    nom: 'Réalisations',
    description: 'Photos de chantiers',
    vignette: { fond: 'clair', largeurs: [4, 4, 4] },
    section: section(
      'Réalisations',
      [
        entete('Chantiers récents', 'Photos prises chez vos clients, avec leur accord.'),
        ligne(
          [1, 2, 3].map((i) =>
            col(4, [
              el('image', { legende: `Chantier ${i}`, mb: 12 }),
              titre3(`Chantier ${i}`, 4),
              el('texte', {
                texte: 'Lieu, durée, travaux réalisés.',
                taille: t3(15, 15, 15),
                mb: 0,
              }),
            ]),
          ),
          { gap: 20 },
        ),
      ],
      { fond: 'clair' },
    ),
  },
  {
    cle: 'avis',
    nom: 'Avis clients',
    description: 'Synchronisés avec Portail Travaux',
    vignette: { fond: 'primaire', largeurs: [4, 4, 4] },
    section: section(
      'Avis clients',
      [
        entete(
          'Ce que disent nos clients',
          'Avis collectés par Portail Travaux après chaque chantier.',
          'center',
        ),
        ligne(
          [1, 2, 3].map(() =>
            col(4, [el('avis', { nom: A_COMPLETER, texte: A_COMPLETER, mb: 0 })], {
              fond: 'blanc',
              pad: 24,
              arrondi: 12,
            }),
          ),
          { gap: 20 },
        ),
      ],
      { fond: 'primaire' },
    ),
  },
  {
    cle: 'texte-image',
    nom: 'Texte et image',
    description: 'Titre, texte, liste et photo',
    vignette: { fond: 'blanc', largeurs: [6, 6] },
    section: section('Texte et image', [
      ligne(
        [
          col(
            6,
            [
              el('titre', { texte: 'Notre engagement' }),
              el('texte', { texte: 'Expliquez votre façon de travailler.' }),
              el('liste', {
                items: ['Premier engagement', 'Deuxième engagement', 'Troisième engagement'],
                mb: 0,
              }),
            ],
            { valign: 'center' },
          ),
          col(6, [el('image', { legende: 'Votre équipe sur un chantier', mb: 0 })]),
        ],
        { gap: 48, valign: 'center' },
      ),
    ]),
  },
  {
    cle: 'faq',
    nom: 'Questions fréquentes',
    description: 'Questions et réponses',
    vignette: { fond: 'blanc', largeurs: [4, 8] },
    section: section('Questions fréquentes', [
      ligne(
        [
          col(4, [el('titre', { texte: 'Questions fréquentes' })]),
          col(
            8,
            [
              'Intervenez-vous le week-end ?',
              'Le devis est-il payant ?',
              'Quelles aides pour mes travaux ?',
            ].flatMap((q) => [
              titre3(q),
              el('texte', { texte: A_COMPLETER, taille: t3(16, 16, 15), mb: 24 }),
            ]),
          ),
        ],
        { gap: 40 },
      ),
    ]),
  },
  {
    cle: 'contact',
    nom: 'Contact et devis',
    description: 'Formulaire relié à « Mes demandes »',
    vignette: { fond: 'blanc', largeurs: [5, 7] },
    section: section(
      'Contact et devis',
      [
        ligne(
          [
            col(5, [
              el('titre', { texte: 'Parlons de votre projet' }),
              el('texte', { texte: 'Devis gratuit et sans engagement.' }),
              el('carte', { mb: 0 }),
            ]),
            col(7, [el('formulaire', { mb: 0 })], { fond: 'clair', pad: 28, arrondi: 12 }),
          ],
          { gap: 40 },
        ),
      ],
      { ancre: 'contact' },
    ),
  },
  {
    cle: 'appel',
    nom: 'Appel à l’action',
    description: 'Photo assombrie et bouton',
    vignette: { fond: 'sombre', largeurs: [12] },
    section: section(
      'Appel à l’action',
      [
        ligne([
          col(12, [
            el('titre', {
              texte: 'Un projet ? Parlons-en.',
              align: 'center',
              taille: t3(36, 32, 26),
            }),
            el('texte', { texte: 'Devis gratuit, sans engagement.', align: 'center', mb: 24 }),
            el('bouton', {
              texte: 'Demander mon devis',
              action: devis,
              couleur: 'accent',
              align: 'center',
              enLigne: false,
              mb: 0,
            }),
          ]),
        ]),
      ],
      {
        fond: 'sombre',
        fondType: 'image',
        voile: 'sombre',
        voileOpacite: 80,
        padY: t3(80, 60, 44),
      },
    ),
  },
  {
    cle: 'pied',
    nom: 'Pied de page',
    description: 'Adresse, garanties, mentions',
    vignette: { fond: 'sombre', largeurs: [4, 4, 4] },
    section: section(
      'Pied de page',
      [
        ligne(
          [
            ['Votre entreprise', 'Adresse · téléphone'],
            ['Garanties', 'Assurance décennale · certifications'],
            ['Informations', 'Mentions légales · confidentialité'],
          ].map(([t, x]) =>
            col(4, [
              el('titre', { texte: t, niveau: 'h3', taille: t3(17, 17, 16), mb: 6 }),
              el('texte', { texte: x, taille: t3(15, 15, 14), mb: 0 }),
            ]),
          ),
          { gap: 24 },
        ),
      ],
      { fond: 'sombre', padY: t3(40, 36, 28) },
    ),
  },
  {
    cle: 'blog',
    nom: 'Articles du blog',
    description: 'Vos derniers articles, mis à jour seuls',
    vignette: { fond: 'blanc', largeurs: [4, 4, 4] },
    section: section('Articles du blog', [
      entete(
        'Nos conseils d’artisan',
        'Prix, aides, entretien : vos réponses aux questions de vos clients.',
      ),
      ligne([col(12, [el('blog', { mb: 0 })])]),
    ]),
  },
  {
    cle: 'vide',
    nom: 'Zone vide',
    description: 'Construisez section par section',
    vignette: { fond: 'blanc', largeurs: [] },
    section: section('Nouvelle zone', []),
  },
];

/** Section prête insérée après `apres` (en bas de page si `null` ou introuvable) ; renvoie la page et son identifiant. */
export function insererSectionPrete(
  page: PageSite,
  cle: string,
  apres: string | null,
  nouvelId: () => string,
): { page: PageSite; id: string } | null {
  const modele = SECTIONS_PRETES.find((s) => s.cle === cle);
  if (!modele) return null;
  const s = construireSection(structuredClone(modele.section), nouvelId);
  // Une ancre est unique sur la page : la copie d'une zone « contact » n'en reprend pas.
  if (s.p.ancre && page.sections.some((x) => x.p.ancre === s.p.ancre)) s.p.ancre = '';
  const i = apres === null ? -1 : page.sections.findIndex((x) => x.id === apres);
  const sections = [...page.sections];
  sections.splice(i < 0 ? sections.length : i + 1, 0, s);
  return { page: { ...page, sections }, id: s.id };
}

/**
 * Élément ajouté juste après l'élément sélectionné (même colonne), à la fin de la section
 * sélectionnée, ou dans une nouvelle section en bas de page si rien n'est sélectionné.
 */
export function insererElement(
  page: PageSite,
  cible: string | null,
  type: TypeElement,
  nouvelId: () => string,
): { page: PageSite; id: string } {
  const nouveau = elementDuCatalogue(type, nouvelId());
  let place = false;
  const sections = page.sections.map((s) => {
    if (place) return s;
    if (s.id === cible) {
      place = true;
      const rows = [...s.rows];
      const r = rows.at(-1);
      if (!r) return s;
      const cols = [...r.cols];
      cols[0] = { ...cols[0]!, els: [...cols[0]!.els, nouveau] };
      rows[rows.length - 1] = { ...r, cols };
      return { ...s, rows };
    }
    const rows = s.rows.map((r) => ({
      ...r,
      cols: r.cols.map((c) => {
        const j = c.els.findIndex((e) => e.id === cible);
        if (j < 0) return c;
        place = true;
        return { ...c, els: [...c.els.slice(0, j + 1), nouveau, ...c.els.slice(j + 1)] };
      }),
    }));
    return place ? { ...s, rows } : s;
  });
  if (place) return { page: { ...page, sections }, id: nouveau.id };
  const s = construireSection(
    { p: { nom: 'Nouvelle section' }, rows: [{ cols: [{ w: 12, els: [] }] }] },
    nouvelId,
  );
  s.rows[0]!.cols[0]!.els.push(nouveau);
  return { page: { ...page, sections: [...page.sections, s] }, id: nouveau.id };
}
