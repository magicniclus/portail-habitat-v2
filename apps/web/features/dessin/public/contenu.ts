/**
 * Textes de la page publique Plans (/dessin, DES-03). Aucun avis ni chiffre non sourcé
 * (LANDINGS §7) : seulement ce que l'outil fait réellement. Gratuit : décision D84.
 */
export const FONCTIONS_PLANS = [
  {
    icone: 'murs',
    titre: 'Murs et pièces',
    texte:
      'Tracez point par point ou partez d’un rectangle, d’un L ou d’un U : les pièces et leur surface se calculent seules.',
  },
  {
    icone: 'portes',
    titre: 'Portes et fenêtres',
    texte:
      'Portes battantes, coulissantes ou à galandage, fenêtres, baies vitrées, volets : posées d’un clic sur le mur.',
  },
  {
    icone: 'meubles',
    titre: 'Meubles et finitions',
    texte:
      'Cuisine, salle de bains, séjour : les meubles se placent contre les murs. Sols, peintures et carrelages en quelques clics.',
  },
  {
    icone: 'toit',
    titre: 'Toiture et jardin',
    texte:
      'Toit deux pans, quatre pans ou plat, terrasse, piscine, clôtures et arbres, avec les distances aux limites.',
  },
  {
    icone: 'troisd',
    titre: '3D, visite et photos',
    texte: 'Voyez votre maison en 3D, promenez-vous dedans et faites de belles images à partager.',
  },
  {
    icone: 'metre',
    titre: 'Métré et devis',
    texte:
      'Surfaces, longueurs et menuiseries comptées pour vous. Téléchargez le PDF à l’échelle et demandez des devis avec votre plan.',
  },
] as const;

export const ETAPES_PLANS = [
  {
    titre: 'Dessinez',
    texte: 'Ouvrez l’éditeur sans créer de compte et tracez vos pièces, au doigt ou à la souris.',
  },
  {
    titre: 'Visualisez',
    texte: 'Passez en 3D, visitez votre maison, essayez les meubles et les couleurs.',
  },
  {
    titre: 'Passez aux travaux',
    texte:
      'Créez votre compte gratuit pour enregistrer, puis demandez des devis en joignant votre plan.',
  },
] as const;

export const FAQ_PLANS = [
  {
    q: 'Est-ce vraiment gratuit ?',
    r: 'Oui. Dessiner, voir en 3D, exporter en PDF et demander des devis ne coûtent rien.',
  },
  {
    q: 'Faut-il créer un compte ?',
    r: 'Non pour essayer : votre plan reste sur votre appareil. Un compte gratuit est nécessaire pour l’enregistrer, le retrouver partout et le partager. Votre essai est repris tel quel.',
  },
  {
    q: 'Puis-je dessiner sur mon téléphone ?',
    r: 'Oui. L’éditeur fonctionne sur téléphone, tablette et ordinateur.',
  },
  {
    q: 'Mon plan est-il privé ?',
    r: 'Oui. Il n’est visible que par vous, sauf si vous créez un lien de partage ou le joignez à une demande de devis. Le lien ne montre jamais votre adresse.',
  },
  {
    q: 'Les cotes sont-elles exactes ?',
    r: 'Le plan est à l’échelle, mais il reste indicatif : faites vérifier les mesures sur place par un professionnel avant les travaux.',
  },
] as const;
