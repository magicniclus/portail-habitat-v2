import { z } from '../../zod';

/** Ce que la création assistée sait déjà de la fiche (jamais redemandé, SITE-IA-07). */
export interface FicheCreation {
  metierPrincipal: string;
  metierNom: string;
  ville: string;
  prestations: string[];
  nbPhotos: number;
  nbAvis: number;
  labels: string[];
  rayonKm: number;
  /** Communes du rayon, les plus recherchées d'abord. */
  communesProches: string[];
  pitch?: string;
}

export interface QuestionCreation {
  id: 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'locales';
  texte: string;
  type: 'choix' | 'multi';
  options: string[];
  max?: number;
  /** Exemple de phrase par option (ton du site). */
  exemples?: Record<string, string>;
  preselection?: string[];
  /** Bouton « Passer » / « Je ne sais pas » toujours proposé. */
  passable: true;
}

const DEPANNAGE = new Set(['plombier', 'serrurier', 'electricien', 'chauffagiste']);
const TONS = {
  Professionnel: 'Nous intervenons avec rigueur, devis détaillé à l’appui.',
  Chaleureux: 'On prend le temps de vous écouter et de bien faire.',
  Direct: 'Un problème ? On vient, on répare.',
};

/** Questions de la création (IA_SITE §3.1) : 6 au plus, une à la fois, réponses en un tap. */
export function questionsCreation(f: FicheCreation): {
  questions: QuestionCreation[];
  repris: string[];
} {
  const q: QuestionCreation[] = [
    {
      id: 'q1',
      texte: 'Quels travaux voulez-vous le plus décrocher ?',
      type: 'multi',
      options: f.prestations.slice(0, 12),
      max: 3,
      passable: true,
    },
    {
      id: 'q2',
      texte: 'Vos clients, c’est surtout…',
      type: 'choix',
      options: ['Particuliers', 'Propriétaires bailleurs', 'Syndics', 'Entreprises'],
      passable: true,
    },
    {
      id: 'q3',
      texte: 'Qu’est-ce qui vous distingue ?',
      type: 'multi',
      options: [
        'Devis rapide',
        'Prix ferme',
        'Chantier propre',
        'Urgence 24/7',
        'Garantie',
        'Équipe locale',
      ],
      max: 3,
      passable: true,
    },
  ];
  if (DEPANNAGE.has(f.metierPrincipal))
    q.push({
      id: 'q4',
      texte: 'Vous intervenez en urgence ?',
      type: 'choix',
      options: ['Oui, 7j/7', 'Oui, en semaine', 'Non'],
      passable: true,
    });
  const montrer = [
    ...(f.nbPhotos ? ['Mes photos de chantier'] : []),
    ...(f.nbAvis ? ['Mes avis'] : []),
    ...(f.labels.some((l) => l !== 'local' && l !== 'rapide') ? ['Mes certifications'] : []),
    ...(f.labels.includes('rge') ? ['Les aides (MaPrimeRénov’)'] : []),
  ];
  if (montrer.length)
    q.push({
      id: 'q5',
      texte: 'Vous voulez montrer…',
      type: 'multi',
      options: montrer,
      passable: true,
    });
  q.push({
    id: 'q6',
    texte: 'Le ton du site ?',
    type: 'choix',
    options: Object.keys(TONS),
    exemples: TONS,
    passable: true,
  });
  if (f.rayonKm > 10 && f.communesProches.length)
    q.push({
      id: 'locales',
      texte: 'Je crée aussi une page pour ces communes ?',
      type: 'multi',
      options: f.communesProches.slice(0, 6),
      preselection: f.communesProches.slice(0, 3),
      passable: true,
    });
  const repris = [
    `Métier : ${f.metierNom}`,
    `Ville : ${f.ville}`,
    ...(f.pitch ? [`Présentation : ${f.pitch}`] : []),
    ...(f.nbAvis ? [`${f.nbAvis} avis`] : []),
    ...(f.nbPhotos ? [`${f.nbPhotos} photos de chantier`] : []),
  ];
  return { questions: q, repris };
}

const texte = z.string().max(140);
export const reponsesCreation = z.object({
  q1: z.array(texte).max(3).optional(),
  q2: texte.optional(),
  q3: z.array(texte).max(3).optional(),
  autre: texte.optional(),
  q4: texte.optional(),
  q5: z.array(texte).max(4).optional(),
  q6: texte.optional(),
  locales: z.array(texte).max(6).optional(),
  /** Informations de la fiche que l'artisan a exclues. */
  exclus: z.array(texte).max(10).optional(),
});
export type ReponsesCreation = z.output<typeof reponsesCreation>;

export interface PagePlanifiee {
  cle: string;
  nom: string;
  /** Page déjà présente dans le site de départ, dont le contenu est remplacé. */
  remplace?: string;
  consigne: string;
}

const slug = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Pages générées une à une, l'accueil d'abord (IA_SITE §5) ; les mentions légales restent. */
export function planCreation(r: ReponsesCreation, f: FicheCreation): PagePlanifiee[] {
  const cibles = r.q1?.length ? r.q1.join(', ') : f.prestations.slice(0, 3).join(', ');
  const atouts = [...(r.q3 ?? []), ...(r.autre ? [r.autre] : [])].join(', ');
  const commun = `Clients : ${r.q2 ?? 'Particuliers'}. Atouts : ${atouts || 'à déduire de la fiche'}. Ton : ${r.q6 ?? 'Professionnel'}.${r.q4 && r.q4 !== 'Non' ? ` Urgence : ${r.q4}.` : ''}`;
  const plan: PagePlanifiee[] = [
    {
      cle: 'accueil',
      nom: 'Accueil',
      remplace: 'accueil',
      consigne: `Page d'accueil de ${f.metierNom} à ${f.ville} : bandeau avec H1 contenant la ville, travaux mis en avant (${cibles}), atouts, appel à demander un devis, formulaire. ${commun}`,
    },
    {
      cle: 'prestations',
      nom: 'Prestations',
      consigne: `Une section par prestation (${f.prestations.slice(0, 6).join(', ')}), bénéfices concrets, bouton devis. ${commun}`,
    },
  ];
  if (f.nbPhotos)
    plan.push({
      cle: 'realisations',
      nom: 'Réalisations',
      consigne: `Galerie des photos de chantier existantes (références lib:…), légendes courtes. ${commun}`,
    });
  if (f.nbAvis)
    plan.push({
      cle: 'avis',
      nom: 'Avis clients',
      consigne: `Présentation des avis existants seulement, sans en inventer. ${commun}`,
    });
  plan.push({
    cle: 'contact',
    nom: 'Contact et devis',
    remplace: 'contact',
    consigne: `Formulaire de demande de devis, téléphone de la fiche, zone d'intervention. ${commun}`,
  });
  for (const c of r.locales ?? [])
    plan.push({
      cle: `locale-${slug(c)}`,
      nom: `${f.metierNom} à ${c}`,
      consigne: `Page locale « ${f.metierNom} à ${c} » : H1 et titre SEO avec ${c}, travaux (${cibles}), délai d'intervention seulement s'il est connu, formulaire. ${commun}`,
    });
  return plan;
}
