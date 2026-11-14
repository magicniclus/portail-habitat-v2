/**
 * Formats de vidéos courtes qui reviennent dans toutes les niches (STUDIO.md §1). Claude part
 * d'un de ces mécanismes, ou d'un concept repéré dans les vidéos fournies, et le transpose aux
 * artisans et à Portail Travaux. Mécanismes seulement : jamais de contenu copié.
 */
export const FORMATS_VIRAUX = [
  {
    nom: 'Défi chronométré',
    mecanique:
      'Une contrainte de temps affichée (« en 2 minutes »), on reste pour savoir si c’est tenu.',
  },
  {
    nom: 'Avant / après',
    mecanique: 'Le contraste visuel d’abord, le comment ensuite ; la fin montre le résultat.',
  },
  {
    nom: 'POV',
    mecanique: 'Le spectateur vit la scène à la première personne (« POV : tu es artisan et… »).',
  },
  {
    nom: 'Combien je gagne',
    mecanique:
      'Des chiffres concrets et assumés (exemple fictif annoncé), la curiosité fait le reste.',
  },
  {
    nom: 'Erreur à ne pas faire',
    mecanique: 'Une faute répandue, ses conséquences, la bonne méthode.',
  },
  {
    nom: 'Ce que personne ne vous dit',
    mecanique: 'Une vérité cachée du métier, révélée pas à pas.',
  },
  {
    nom: 'Je teste pendant 30 jours',
    mecanique: 'Une expérience suivie avec des étapes et un verdict chiffré.',
  },
  { nom: 'Mythe ou réalité', mecanique: 'Une idée reçue affirmée puis démontée à l’écran.' },
  {
    nom: 'Classement',
    mecanique: 'Du pire au meilleur (« top 3 »), la meilleure option gardée pour la fin.',
  },
  { nom: 'Storytime', mecanique: 'Une histoire vécue avec tension, rebondissement et chute.' },
  {
    nom: 'Réaction',
    mecanique: 'On réagit à un devis, une annonce ou un commentaire réel (anonymisé).',
  },
  { nom: 'Comparaison', mecanique: 'Deux façons de faire côte à côte, l’écart saute aux yeux.' },
  {
    nom: 'Question aux inconnus',
    mecanique: 'Micro-trottoir ou sondage ; les réponses surprennent.',
  },
  { nom: 'Contre-pied', mecanique: 'Une opinion à rebrousse-poil qui fait réagir en commentaire.' },
  {
    nom: 'Coulisses',
    mecanique: 'Montrer ce qu’on ne voit jamais (le soir après le chantier, la paperasse).',
  },
  {
    nom: 'Tutoriel express',
    mecanique: 'Une astuce utile en moins de 30 secondes, qu’on enregistre.',
  },
  {
    nom: 'Faux pas / vrai pas',
    mecanique: 'Deux versions jouées, la mauvaise puis la bonne, avec humour.',
  },
  { nom: 'Compte à rebours', mecanique: 'Des étapes numérotées qui tiennent jusqu’au bout.' },
  { nom: 'Série', mecanique: 'Un épisode d’une suite, avec un rendez-vous pour le prochain.' },
  { nom: 'Pari', mecanique: 'Une promesse risquée annoncée au début, tenue (ou pas) à la fin.' },
] as const;
