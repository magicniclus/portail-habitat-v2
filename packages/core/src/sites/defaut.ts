import type { Action, Element, Navigation, PageSite, Section, Theme } from './schemas';

/** Données de la fiche utilisées pour le site de départ (aucune invention : ce qui manque reste vide). */
export interface FicheSite {
  nomCommercial: string;
  metier: string;
  ville: string;
  telephone?: string;
  pitch?: string;
  description?: string;
  noteMoyenne?: number;
  nbAvis?: number;
  raisonSociale?: string;
  siret?: string;
  adresse?: string;
  decennale?: string;
  /** `lib:{realisationId}/{index}` des photos publiées. */
  photos: string[];
}

export interface SiteInitial {
  theme: Theme;
  navigation: Navigation;
  pages: Record<string, PageSite>;
}

const v3 = <T>(d: T, t: T, m: T) => ({ desktop: d, tablet: t, mobile: m });
const non = () => v3(false, false, false);
const FOND = {
  fondType: 'couleur' as const,
  fondImage: '' as const,
  voile: 'sombre' as const,
  voileOpacite: 0,
  fondPos: 'center' as const,
  texteCouleur: 'auto' as const,
};
const A = (type: Action['type'], o: Partial<Action> = {}): Action => ({ type, ...o });
/** Élément avec quelques réglages changés (marges, tailles). */
const avec = (e: Element, p: Record<string, unknown>): Element =>
  ({ ...e, p: { ...e.p, ...p } }) as Element;

/** Fabrique d'identifiants stables pour un même appel (`s1`, `r2`, `c3`, `e4`…). */
function fabrique() {
  let n = 0;
  const id = (p: string) => `${p}${++n}`;
  const base = { htmlId: '', mb: 16, masque: non() };
  const el = {
    titre: (
      texte: string,
      niveau: 'h1' | 'h2' | 'h3' = 'h2',
      align: 'left' | 'center' = 'left',
    ): Element => ({
      id: id('e'),
      type: 'titre',
      p: {
        ...base,
        texte,
        niveau,
        taille:
          niveau === 'h1' ? v3(48, 40, 30) : niveau === 'h2' ? v3(34, 30, 26) : v3(21, 20, 19),
        couleur: 'auto',
        align,
      },
    }),
    surtitre: (texte: string): Element => ({
      id: id('e'),
      type: 'surtitre',
      p: { ...base, texte, taille: v3(14, 14, 13), couleur: 'accent', align: 'left' },
    }),
    texte: (texte: string, align: 'left' | 'center' = 'left'): Element => ({
      id: id('e'),
      type: 'texte',
      p: { ...base, texte, taille: v3(18, 17, 16), couleur: 'auto', align },
    }),
    bouton: (texte: string, action: Action, variante: 'plein' | 'contour' = 'plein'): Element => ({
      id: id('e'),
      type: 'bouton',
      p: {
        ...base,
        mb: 0,
        texte,
        action,
        variante,
        couleur: 'primaire',
        largeur: 'auto',
        enLigne: true,
        align: 'left',
      },
    }),
    image: (src: string, legende: string): Element => ({
      id: id('e'),
      type: 'image',
      p: {
        ...base,
        mb: 0,
        src: src as '',
        legende,
        ratio: '4 / 3',
        ajuste: 'cover',
        pos: 'center',
        arrondi: 12,
        voile: 'sombre',
        voileOpacite: 0,
        action: A('aucun'),
      },
    }),
    chiffre: (valeur: string, label: string): Element => ({
      id: id('e'),
      type: 'chiffre',
      p: { ...base, valeur, label, taille: v3(40, 36, 32), couleur: 'auto', align: 'left' },
    }),
    formulaire: (): Element => ({
      id: id('e'),
      type: 'formulaire',
      p: { ...base, mb: 0, bouton: 'Envoyer ma demande' },
    }),
  };
  const col = (
    els: Element[],
    w: number,
    o: Partial<{
      pad: number;
      arrondi: number;
      fond: 'aucun' | 'clair' | 'blanc';
      valign: 'start' | 'center';
    }> = {},
  ) => ({
    id: id('c'),
    w,
    p: {
      pad: 0,
      arrondi: 0,
      ombre: false,
      valign: 'start' as 'start' | 'center',
      masque: non(),
      ...FOND,
      fond: 'aucun' as 'aucun' | 'clair' | 'blanc',
      ...o,
    },
    els,
  });
  const ligne = (
    cols: ReturnType<typeof col>[],
    gap = 32,
    valign: 'stretch' | 'center' = 'stretch',
  ) => ({
    id: id('r'),
    p: {
      gap,
      valign,
      fond: 'aucun' as const,
      empile: true,
      inverse: false,
      masque: non(),
    },
    cols,
  });
  const section = (
    nom: string,
    rows: ReturnType<typeof ligne>[],
    fond: Section['p']['fond'] = 'blanc',
    ancre = '',
    padY = v3(72, 56, 40),
  ): Section => ({
    id: id('s'),
    p: { nom, ancre, largeur: 'boite', padY, masque: non(), fond, ...FOND },
    rows,
  });
  return { el, col, ligne, section };
}

const page = (
  nom: string,
  court: string,
  slug: string,
  type: PageSite['type'],
  ordre: number,
  menu: boolean,
  seo: PageSite['seo'],
  sections: Section[],
): PageSite => ({
  nom,
  court,
  slug,
  type,
  statut: 'publiee',
  ordre,
  sansNavigation: false,
  menu,
  seo,
  sections,
});

/**
 * Site de départ, sans IA, à partir de la fiche (modèle « Artisan classique ») : accueil, contact
 * et mentions légales. La palette vient des tokens (`palettesSites` de `@ph/ui/tokens`). Aucun chiffre ni avis inventé : un bloc sans donnée réelle n'est pas créé.
 */
export function siteParDefaut(f: FicheSite, palette: Theme['palette']): SiteInitial {
  const { el, col, ligne, section } = fabrique();
  const devis = A('formulaire', { formulaire: 'defiler' });
  const tel = f.telephone ? A('tel', { tel: f.telephone }) : null;
  const accroche = f.pitch || `${f.metier} à ${f.ville} : devis gratuit et sans engagement.`;
  const bandeau = section(
    'Bandeau',
    [
      ligne(
        [
          col(
            [
              el.surtitre(`${f.metier} · ${f.ville}`),
              avec(el.titre(`${f.nomCommercial}, ${f.metier.toLowerCase()} à ${f.ville}`, 'h1'), {
                mb: 20,
              }),
              avec(el.texte(accroche), { mb: 24 }),
              el.bouton('Demander un devis gratuit', devis),
              ...(tel ? [el.bouton(f.telephone!, tel, 'contour')] : []),
            ],
            f.photos[0] ? 6 : 12,
            { valign: 'center' },
          ),
          ...(f.photos[0]
            ? [col([el.image(f.photos[0], `Chantier réalisé par ${f.nomCommercial}`)], 6)]
            : []),
        ],
        48,
        'center',
      ),
    ],
    'clair',
    '',
    v3(80, 60, 40),
  );
  const avis =
    f.nbAvis && f.noteMoyenne
      ? [
          section(
            'Avis clients',
            [
              ligne([
                col(
                  [
                    el.chiffre(
                      `${String(f.noteMoyenne).replace('.', ',')}/5`,
                      `Note moyenne sur ${f.nbAvis} avis vérifiés par Portail Travaux`,
                    ),
                  ],
                  12,
                ),
              ]),
            ],
            'blanc',
            '',
            v3(56, 44, 32),
          ),
        ]
      : [];
  const presentation = f.description
    ? [
        section('Présentation', [
          ligne([col([el.titre('Qui sommes-nous ?'), el.texte(f.description)], 12)]),
        ]),
      ]
    : [];
  const realisations =
    f.photos.length > 1
      ? [
          section(
            'Réalisations',
            [
              ligne([col([el.titre('Chantiers récents')], 12)]),
              ligne(
                f.photos
                  .slice(0, 3)
                  .map((p, i) =>
                    col([el.image(p, `Réalisation ${i + 1} de ${f.nomCommercial}`)], 4),
                  ),
                20,
              ),
            ],
            'clair',
          ),
        ]
      : [];
  const contact = () =>
    section(
      'Contact et devis',
      [
        ligne(
          [
            col(
              [
                el.titre('Parlons de votre projet'),
                el.texte('Devis gratuit et sans engagement.'),
                ...(f.telephone ? [el.chiffre(f.telephone, 'Par téléphone')] : []),
              ],
              5,
            ),
            col([el.formulaire()], 7, { fond: 'clair', pad: 28, arrondi: 12 }),
          ],
          40,
        ),
      ],
      'blanc',
      'contact',
    );
  const pied = () =>
    section(
      'Pied de page',
      [
        ligne(
          [
            [f.nomCommercial, [f.adresse, f.telephone].filter(Boolean).join(' · ') || f.ville],
            ...(f.decennale ? [['Garanties', `Assurance décennale : ${f.decennale}`]] : []),
            ['Informations', `${f.metier} à ${f.ville} · devis gratuit`],
          ].map(([t, x]) =>
            col(
              [
                avec(el.titre(t!, 'h3'), { taille: v3(17, 17, 16), mb: 6 }),
                avec(el.texte(x!), { taille: v3(15, 15, 14), mb: 0 }),
              ],
              f.decennale ? 4 : 6,
            ),
          ),
          24,
        ),
      ],
      'sombre',
      '',
      v3(40, 36, 28),
    );
  const mentions = [
    [
      'Éditeur',
      [f.raisonSociale ?? f.nomCommercial, f.siret ? `SIRET ${f.siret}` : '', f.adresse ?? '']
        .filter(Boolean)
        .join(' · '),
    ],
    ['Hébergeur', 'Portail Travaux'],
    ...(f.decennale ? [['Assurance décennale', f.decennale]] : []),
    [
      'Données personnelles',
      'Les données du formulaire servent uniquement à vous recontacter. Durée de conservation : 3 ans.',
    ],
  ];
  const titreSite = `${f.metier} à ${f.ville} | ${f.nomCommercial}`;
  const pages: Record<string, PageSite> = {
    accueil: page(
      'Accueil',
      'Accueil',
      '',
      'accueil',
      0,
      true,
      {
        title: titreSite.slice(0, 120),
        meta: accroche.slice(0, 320),
        motCle: `${f.metier} ${f.ville}`.toLowerCase(),
      },
      [bandeau, ...avis, ...presentation, ...realisations, contact(), pied()],
    ),
    contact: page(
      'Contact et devis',
      'Contact',
      'contact-devis',
      'contact',
      1,
      true,
      {
        title: `Devis gratuit ${f.metier.toLowerCase()} ${f.ville} | ${f.nomCommercial}`.slice(
          0,
          120,
        ),
        meta: `Décrivez votre projet : ${f.nomCommercial} vous répond rapidement. Devis gratuit et sans engagement.`,
        motCle: `devis ${f.metier} ${f.ville}`.toLowerCase(),
      },
      [contact(), pied()],
    ),
    mentions: page(
      'Mentions légales',
      'Mentions',
      'mentions-legales',
      'mentions',
      2,
      false,
      {
        title: `Mentions légales | ${f.nomCommercial}`,
        meta: `Éditeur, hébergeur et données personnelles du site de ${f.nomCommercial}.`,
        motCle: '',
      },
      [
        section('Mentions légales', [
          ligne([
            col(
              [
                el.titre('Mentions légales', 'h1'),
                ...mentions.flatMap(([t, x]) => [el.titre(t!, 'h3'), el.texte(x!)]),
              ],
              12,
            ),
          ]),
        ]),
      ],
    ),
  };
  return {
    theme: {
      palette,
      polices: 'archivo',
      rayonBoutons: 8,
      ton: 'pro',
    },
    navigation: {
      logo: {
        mode: 'logo-nom',
        image: '',
        initiales: f.nomCommercial
          .split(/\s+/)
          .map((m) => m[0] ?? '')
          .join('')
          .slice(0, 2)
          .toUpperCase(),
      },
      nom: f.nomCommercial,
      liens: [
        { id: 'l1', label: 'Accueil', action: A('page', { page: 'accueil' }) },
        { id: 'l2', label: 'Contact', action: A('page', { page: 'contact' }) },
      ],
      cta: {
        visible: true,
        texte: 'Devis gratuit',
        couleur: 'primaire',
        action: A('page', { page: 'contact' }),
      },
      tel: { visible: Boolean(f.telephone), numero: f.telephone ?? '' },
      fond: 'blanc',
      fixe: true,
      ombre: true,
      transparente: false,
      mobile: { sens: 'droite' },
    },
    pages,
  };
}
