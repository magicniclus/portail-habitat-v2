import type { ModeIaSite } from './reglages';

/** Version du prompt, enregistrée dans chaque session (IA_SITE §5). */
export const VERSION_PROMPT_IA_SITE = 'site.v2';

const CATALOGUE = `Éléments (champ "type", réglages dans "p") :
- titre { texte, niveau: h1|h2|h3, align: left|center|right }
- surtitre { texte } · texte { texte } (texte riche : <b> <i> <u> seulement)
- bouton { texte, action, variante: plein|contour, largeur: auto|plein }
- image { src: "" (emplacement vide) ou une référence "lib:…" listée dans le site, legende (texte alternatif) }
- liste { items: [textes] } · avis { nom, texte, note 1-5 } (seulement des avis existants)
- chiffre { valeur, label } · formulaire { bouton } · video { url YouTube } · carte { adresse }
- espace · separateur · logo { texte }
Couleurs : jetons aucun, auto, blanc, clair, primaire, sombre, accent.
Section { p: { nom, ancre (a-z0-9-), fond, texteCouleur: auto|clair|fonce }, rows: [ { cols: [ { w: 1-12, els: [...] } ] } ] }
Action { type: aucun|page|ancre|url|tel|email|sms|whatsapp|formulaire, page?, ancre?, url? (https), tel?, email? }`;

const OPERATIONS = `Opérations possibles (tableau JSON dans le champ "operations") :
{"op":"texte","cible":ID_ELEMENT,"champ":"texte|texteMobile|legende|label|nom|valeur|bouton","valeur":"…"}
{"op":"props","cible":ID,"patch":{…réglages du catalogue…}}
{"op":"insererSection","page":ID_PAGE,"apres":ID_SECTION|null,"section":{…sans id…}}
{"op":"remplacerSection","cible":ID_SECTION,"section":{…sans id…}}
{"op":"supprimer","cible":ID} · {"op":"deplacer","cible":ID_SECTION,"index":N}
{"op":"creerPage","page":{"nom":"…","sections":[…],"seo":{"title":"…","meta":"…"}}}
{"op":"supprimerPage","cible":ID_PAGE} (jamais accueil ni mentions)
{"op":"remplacerContenuPage","cible":ID_PAGE,"sections":[…],"seo":{…}} (création assistée)
{"op":"theme","patch":{…}} · {"op":"navigation","patch":{…}}
{"op":"seo","page":ID_PAGE,"patch":{"title":"…","meta":"…","motCle":"…"}}`;

/**
 * Prompt système (stable, mis en cache) : règles, catalogue et format de sortie. Le contexte
 * (fiche vérifiée, résumé de l'arbre) et la demande viennent ensuite.
 */
export const PROMPT_SYSTEME_IA_SITE = `Tu aides un artisan du bâtiment à améliorer son site internet sur Portail Habitat.
Tu ne produis jamais de HTML : tu proposes des opérations sur l'arbre du site, qui seront vérifiées puis montrées à l'artisan. Il décide seul d'appliquer et de publier.

Règles :
- Français, vouvoiement, phrases courtes, vocabulaire de chantier. Jamais le mot « lead » : on parle de demandes ou de devis.
- N'invente aucun fait. Chiffres, années, certifications (RGE, Qualibat…), assurances, notes d'avis, prix et délais : seulement s'ils figurent dans la fiche, les réponses de l'artisan ou le texte existant. Sinon écris « [à compléter] ».
- Pas d'autres coordonnées que celles de la fiche. Pas de promesse de prix ferme.
- Jamais de critique d'un concurrent, de propos injurieux ni de pratique interdite (travail non déclaré, faux avis).
- Les "cible" doivent être des identifiants présents dans le résumé du site. N'ajoute pas d'images : "src" vide ou une référence existante.
- Reste dans la portée demandée. 60 opérations au plus.
- S'il manque une information indispensable, laisse "operations" vide et pose une seule question courte dans "question". Sinon "question" est vide.
- "resume" : la liste lisible des changements, une ligne par changement (« Bandeau d'accueil : titre réécrit »).

${CATALOGUE}

${OPERATIONS}

Réponds uniquement avec l'objet JSON demandé ; "operations" contient le tableau JSON des opérations, sous forme de texte.`;

const MODES: Record<ModeIaSite, string> = {
  textes: 'Améliorer les textes (opérations "texte" uniquement, sauf demande contraire).',
  seo: 'Référencement : titres, méta-descriptions, textes alternatifs (opérations "seo" et "texte").',
  composant: 'Créer ou modifier des sections de la page.',
  page: 'Créer ou refaire une page complète.',
  theme: 'Couleurs, polices et forme des boutons (opération "theme").',
};

/** Message de l'artisan, avec la portée et la sélection (les ids ciblés). */
export function messageIaSite(e: {
  mode: ModeIaSite;
  portee: 'selection' | 'page' | 'site';
  pageId: string;
  cibles: string[];
  demande: string;
  reponse?: string;
}): string {
  return [
    `Mode : ${MODES[e.mode]}`,
    `Portée : ${e.portee === 'selection' ? `sélection ${e.cibles.join(', ')}` : e.portee === 'page' ? `page ${e.pageId}` : 'tout le site'} (page ouverte : ${e.pageId})`,
    `Demande de l'artisan : ${e.demande}`,
    ...(e.reponse ? [`Réponse de l'artisan à ta question : ${e.reponse}`] : []),
  ].join('\n');
}

/** Création assistée : une page à la fois (accueil d'abord), une seule opération attendue. */
export function messageCreationPage(e: {
  nom: string;
  consigne: string;
  remplace?: string;
  reponses: string;
  exclus: string[];
}): string {
  return [
    `Mode : création complète du site, page « ${e.nom} ».`,
    e.remplace
      ? `Réponds avec une seule opération "remplacerContenuPage" sur la page ${e.remplace}.`
      : `Réponds avec une seule opération "creerPage" (nom « ${e.nom} »).`,
    'Entre 3 et 8 sections, titre SEO de 30 à 60 caractères et méta-description de 110 à 155 caractères, un seul H1.',
    `Consigne : ${e.consigne}`,
    `Réponses de l'artisan au questionnaire : ${e.reponses}`,
    ...(e.exclus.length
      ? [`Informations de la fiche à ne pas utiliser : ${e.exclus.join(', ')}`]
      : []),
  ].join('\n');
}
