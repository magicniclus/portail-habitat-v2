import { elementDuCatalogue } from './catalogue';
import { A_COMPLETER, construireSection, type SectionIa } from './ia/operations';
import type { PageSite, TypeElement } from './schemas';

/**
 * Panneau « Ajouter » de l'éditeur (SITE_INTERNET §4.1) : 12 sections prêtes et les 16 éléments.
 * Les textes sont des intitulés à adapter ; tout ce qui serait un fait (chiffre, avis, téléphone)
 * reste « [à compléter] », ce qui bloque la publication tant que l'artisan ne l'a pas rempli.
 */
export interface SectionPrete {
  cle: string;
  nom: string;
  description: string;
  section: SectionIa;
}

type El = SectionIa['rows'][number]['cols'][number]['els'][number];
const el = (type: TypeElement, p: Record<string, unknown> = {}): El => ({ type, p });
const col = (w: number, els: El[], p?: Record<string, unknown>) => ({
  w,
  els,
  ...(p ? { p } : {}),
});
const section = (
  nom: string,
  rows: SectionIa['rows'][number]['cols'][],
  p: Record<string, unknown> = {},
): SectionIa => ({ p: { nom, ...p }, rows: rows.map((cols) => ({ cols })) });
const devis = { type: 'formulaire', formulaire: 'defiler' } as const;
const carteService = (titre: string) =>
  col(
    4,
    [
      el('titre', { texte: titre, niveau: 'h3' }),
      el('texte', { texte: 'Décrivez ce service en deux phrases.' }),
    ],
    {
      pad: 24,
      arrondi: 12,
      fond: 'clair',
    },
  );

export const SECTIONS_PRETES: readonly SectionPrete[] = [
  {
    cle: 'bandeau',
    nom: 'Bandeau d’accueil',
    description: 'Grand titre, phrase d’accroche et bouton devis sur une photo.',
    section: section(
      'Bandeau d’accueil',
      [
        [
          col(12, [
            el('surtitre', { texte: 'Votre métier · votre ville' }),
            el('titre', { texte: 'Votre titre principal', niveau: 'h1' }),
            el('texte', { texte: 'Une phrase qui dit ce que vous faites et pour qui.' }),
            el('bouton', { texte: 'Demander un devis', action: devis }),
          ]),
        ],
      ],
      {
        fond: 'sombre',
        fondType: 'image',
        voileOpacite: 55,
        padY: { desktop: 120, tablet: 96, mobile: 72 },
      },
    ),
  },
  {
    cle: 'presentation',
    nom: 'Présentation',
    description: 'Texte à gauche, photo à droite.',
    section: section('Présentation', [
      [
        col(6, [
          el('titre', { texte: 'Qui sommes-nous ?' }),
          el('texte', {
            texte: 'Présentez votre entreprise, votre savoir-faire et votre façon de travailler.',
          }),
        ]),
        col(6, [el('image', { legende: '' })]),
      ],
    ]),
  },
  {
    cle: 'services',
    nom: 'Services',
    description: 'Trois cartes pour vos prestations principales.',
    section: section('Services', [
      [col(12, [el('titre', { texte: 'Nos services', align: 'center' })])],
      [
        carteService('Premier service'),
        carteService('Deuxième service'),
        carteService('Troisième service'),
      ],
    ]),
  },
  {
    cle: 'chiffres',
    nom: 'Chiffres clés',
    description: 'Trois chiffres qui rassurent (à compléter avec les vôtres).',
    section: section(
      'Chiffres clés',
      [
        [1, 2, 3].map(() =>
          col(4, [el('chiffre', { valeur: A_COMPLETER, label: A_COMPLETER, align: 'center' })]),
        ),
      ],
      { fond: 'clair' },
    ),
  },
  {
    cle: 'avis',
    nom: 'Avis clients',
    description: 'Trois avis de vos clients (à recopier depuis vos vrais avis).',
    section: section('Avis clients', [
      [col(12, [el('titre', { texte: 'Ils nous ont fait confiance', align: 'center' })])],
      [1, 2, 3].map(() => col(4, [el('avis', { nom: A_COMPLETER, texte: A_COMPLETER })])),
    ]),
  },
  {
    cle: 'realisations',
    nom: 'Réalisations',
    description: 'Galerie de trois photos de chantiers.',
    section: section('Réalisations', [
      [col(12, [el('titre', { texte: 'Nos réalisations' })])],
      [1, 2, 3].map(() => col(4, [el('image', { ratio: '1/1' })])),
    ]),
  },
  {
    cle: 'etapes',
    nom: 'Étapes',
    description: 'Comment se passe un chantier, en trois étapes.',
    section: section('Étapes', [
      [col(12, [el('titre', { texte: 'Comment ça se passe' })])],
      [
        ['1. Premier contact', 'Vous décrivez votre projet, nous vous rappelons.'],
        ['2. Devis', 'Nous passons voir le chantier et vous envoyons un devis détaillé.'],
        ['3. Travaux', 'Nous réalisons les travaux à la date convenue.'],
      ].map(([t, x]) =>
        col(4, [el('titre', { texte: t, niveau: 'h3' }), el('texte', { texte: x })]),
      ),
    ]),
  },
  {
    cle: 'atouts',
    nom: 'Atouts',
    description: 'Liste de vos points forts avec un bouton.',
    section: section('Atouts', [
      [
        col(6, [
          el('titre', { texte: 'Pourquoi nous choisir' }),
          el('liste', { items: ['Premier atout', 'Deuxième atout', 'Troisième atout'] }),
          el('bouton', { texte: 'Demander un devis', action: devis }),
        ]),
        col(6, [el('image')]),
      ],
    ]),
  },
  {
    cle: 'appel',
    nom: 'Appel à l’action',
    description: 'Bandeau coloré : une phrase et un bouton.',
    section: section(
      'Appel à l’action',
      [
        [
          col(12, [
            el('titre', { texte: 'Un projet ? Parlons-en.', align: 'center' }),
            el('bouton', { texte: 'Demander un devis', action: devis, align: 'center' }),
          ]),
        ],
      ],
      { fond: 'primaire' },
    ),
  },
  {
    cle: 'contact',
    nom: 'Contact',
    description: 'Texte et formulaire de demande de devis.',
    section: section('Contact', [
      [
        col(5, [
          el('titre', { texte: 'Demandez votre devis' }),
          el('texte', { texte: 'Décrivez votre projet : nous vous répondons rapidement.' }),
        ]),
        col(7, [el('formulaire')]),
      ],
    ]),
  },
  {
    cle: 'carte',
    nom: 'Zone d’intervention',
    description: 'Carte et texte sur les communes desservies.',
    section: section('Zone d’intervention', [
      [
        col(6, [
          el('titre', { texte: 'Où intervenons-nous ?' }),
          el('texte', { texte: 'Citez les communes où vous intervenez.' }),
        ]),
        col(6, [el('carte')]),
      ],
    ]),
  },
  {
    cle: 'blog',
    nom: 'Articles du blog',
    description: 'Vos trois derniers articles.',
    section: section('Articles du blog', [
      [col(12, [el('titre', { texte: 'Nos conseils' }), el('blog')])],
    ]),
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
