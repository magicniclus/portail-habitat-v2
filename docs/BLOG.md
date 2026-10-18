# Blog des artisans

Maquettes : `designs/Site Internet Artisan.dc.html` (onglet **Blog**), `designs/Editeur de Blog.dc.html` (écrire un article), `designs/Editeur de Site.dc.html` (contenu **Articles du blog** et zone **Articles du blog**). Données : `DATABASE.md` §15 quater. Décisions : D64 à D69.

## 1. Périmètre
- **Un blog par artisan**, dans « Mon site internet ». Ses articles ne s'affichent **que sur son site** (pas d'agrégation sur portailtravaux.fr, pas de centre d'aide commun). (D64 ✅)
- Accès : **Site Pro, Fiche + Site, Tout inclus**. Compte gratuit ou Fiche Pro seule : onglet visible, tout clic sur une action payante ouvre la **fenêtre d'offre** (PAIEMENTS §4). (D65 ✅)
- Pas de commentaires en v1 (D67 ⏳).

## 2. Quotas IA (D66 ✅)
| | Site Pro / Fiche + Site | Tout inclus |
|---|---|---|
| Articles rédigés entièrement par l'IA | **5 / mois** | **15 / mois** |
| Titres, sous-titres, méta-descriptions, texte alternatif, catégorie et tags, idées, liens internes, textes réseaux sociaux, recherche de mots-clés | illimité | illimité |

- Seule la **rédaction complète** consomme un crédit (« Rédiger l'article », ou chaque idée cochée dans « Idées d'articles »). Remise à zéro le 1er du mois, pas de report.
- Compteur séparé du quota de modifications du site (IA_SITE §4). Échec technique : crédit non consommé.
- Quota atteint : bouton désactivé, message, l'écriture manuelle et les retouches restent disponibles ; Site Pro voit « Passer à Tout inclus : 15 articles par mois ».
- L'IA ne publie **jamais sans un clic de l'artisan** (D70) : « Planifier seul » dans le mode autonome, ou le lien de l'email `blog-a-valider` pour le pilote ; sinon tout article généré reste un brouillon.

## 2 bis. Mode autonome (un clic)
- **Éditeur › ✦ Mode autonome › « Tout faire en un clic »** : sujet facultatif (vide = l'IA choisit). Enchaîne : choix du mot-clé (volume, difficulté, saison) → analyse des 10 premiers résultats Google → plan → rédaction (fiche + chantiers + avis) → titre, sous-titre, slug, méta → image à la une (Réalisations) + texte alternatif → catégorie, tags, liens internes → contrôle SEO et corrections automatiques jusqu'à 0 point bloquant → textes réseaux sociaux.
- Fin au choix : **Je relis** (brouillon) · **Planifier seul** (meilleure date calculée depuis la tendance du mot-clé). Pas de « Publier seul » (D70). Compte 1 article dans le quota.
- Raccourci depuis l'onglet Blog : « ✦ Article en un clic » (`Editeur de Blog?nouveau=1&auto=1`).
- **Pilote automatique** (onglet Blog) : l'IA planifie et produit les articles sans intervention. Rythme 2/mois, 1/semaine (Site Pro et plus) ou 2/semaine (Tout inclus seulement, quota oblige). Validation : toujours « Je valide d'abord » (email 48 h avant, un clic ; sans réponse rien n'est publié) ; pas de « Publier sans moi » (D70). Liste des 3 prochains sujets, chacun remplaçable (« Autre sujet »). Jamais deux articles sur le même mot-clé principal.
- Garde-fous : jamais de chiffre, prix ou promesse absent de la fiche ou des sources ; vocabulaire interdit (« lead ») ; pas plus de 2 publications automatiques par semaine pour éviter le contenu de masse pénalisé par Google.

## 3. Éditeur d'article
- Champs : image à la une + texte alternatif, titre, sous-titre, adresse `/blog/{slug}` (suit le titre tant que l'interrupteur est actif), corps riche (gras, italique, souligné, H2, H3, paragraphe, listes, citation, lien, annuler), méta-description, catégorie (une), tags (plusieurs), auteur (membres de l'équipe), date de publication.
- Corps stocké en HTML **assaini** côté serveur (liste blanche : p, h2, h3, strong, em, u, ul, ol, li, blockquote, a[href]) ; liens externes en `rel="noopener nofollow"`.
- Panneau droit : **IA** (quota, rédaction, retouches, idées) · **Mots-clés** · **SEO** · **Diffusion**.
- **Mots-clés** : volume mensuel (zone de la fiche), difficulté 0–100 (Facile < 30 ≤ Moyenne < 55 ≤ Difficile), tendance 12 mois avec conseil de date (« publiez le mois avant le pic »), mots associés, propositions de l'IA. Mot-clé principal + secondaires. Source : D68 ⏳ (maquette simulée).
- **SEO**. Bloquant pour planifier/publier : titre 10–70 car. · méta 120–160 car. · mot-clé principal dans le titre · texte alternatif ≥ 10 car. · catégorie · mentions légales complètes. Recommandé (non bloquant) : titre 50–60 · mot-clé dans les 100 premiers mots · densité 0,5–2,5 % · ≥ 2 liens internes · ≥ 300 mots · ≥ 2 intertitres. Aperçu Google. Liens internes suggérés (pages du site + autres articles publiés), insérables en un clic.
- **Diffusion** : textes pour Facebook, Instagram, LinkedIn, fiche Google ; hashtags ; image conseillée (prise dans les Réalisations). Copier-coller en v1, pas de publication automatique (D69 ⏳).

## 4. Mentions légales (D64 ✅)
Bloc affiché sous chaque article, **lu en direct** depuis les Paramètres de Devis & factures (`entreprises/{id}.parametresDocuments`) : éditeur (raison sociale, forme, capital, siège), SIRET, RNE, TVA, assurance décennale (assureur, n°, zone), médiateur, directeur de la publication, hébergement. Aucune copie : une modification des paramètres met à jour devis, factures, page Mentions légales du site **et** articles. Un champ manquant bloque la publication (même règle que l'envoi d'un devis).

## 5. Liste des articles (onglet Blog)
- Colonnes : sélection, titre + catégorie + tags + « rédigé avec l'IA », statut (Brouillon, Planifié, Publié, Archivé), date, vues, auteur.
- Recherche (titre, tag, catégorie) et export CSV sur la ligne des vues (Articles · Catégories et tags · Statistiques) ; le statut se lit dans le tableau (pas de filtres en double).
- Actions groupées : publier, planifier, archiver, remettre en brouillon, supprimer (corbeille 30 j), **export CSV** (sélection ou liste filtrée ; `;` + BOM UTF-8 pour Excel). Publication groupée refusée pour les articles ayant un point bloquant.
- **Catégories** : créer, renommer (propagé aux articles), réordonner (ordre des onglets sur le site), supprimer si vide. **Tags** : créer, supprimer (retiré des articles).
- **Statistiques** : vues, lecteurs uniques, rebond, temps moyen ; par article (avec source principale et demandes générées dans les 30 min) ; sources de trafic ; par catégorie ; par auteur ; positions Google (Search Console). Mesure sans cookie, comme le reste du site.

## 6. Afficher le blog sur le site
Pas d'outil séparé : le blog se place **dans l'éditeur de site**, comme n'importe quel contenu.
- **Ajouter › Zones › Articles du blog** : zone prête (titre, phrase, articles).
- **Ajouter › Contenus › Articles du blog** : à poser dans n'importe quel bloc existant.
- 3 réglages dans le panneau de droite : **Affichage** (Grille · Liste · À la une), **Nombre** (3 · 6 · 9), **Catégorie** (toutes ou une). + interrupteur « Afficher le résumé ». Couleurs, police et arrondis : ceux du site.
- **Responsive automatique** : la grille met autant de colonnes que la largeur le permet (cartes de 240 px minimum), une seule sur mobile ; Liste et À la une passent l'image au-dessus du texte sur mobile. Aucun réglage par appareil.
- Le contenu est une **requête**, pas une copie : un article publié apparaît tout seul, sans republier le site.
- Type d'élément `blog` ajouté au catalogue (DATABASE §15 bis) : l'IA du site peut le poser comme les autres.

## 7. SEO technique
URL `/blog/{slug}` (redirection 301 si le slug change), données structurées `BlogPosting` (auteur, date, image) liées à l'entreprise, articles dans le sitemap à la publication, flux RSS `/blog/rss.xml`, pages de catégorie `/blog/categorie/{slug}` indexées, tags en `noindex`.

## 8. Critères (préfixe BLOG-)
- **BLOG-01** compte gratuit : « Nouvel article » ne crée rien, encart Site Pro affiché
- **BLOG-02** Site Pro : 6e rédaction complète du mois refusée, retouches toujours possibles ; Tout inclus : 16e refusée
- **BLOG-03** titres, méta, tags, idées et mots-clés ne décrémentent pas le compteur
- **BLOG-04** méta-description vide → « Publier » et « Planifier » refusés, onglet SEO ouvert
- **BLOG-05** modifier le n° de décennale dans Devis & factures → visible sous tous les articles publiés sans action
- **BLOG-06** un article publié dans « Chauffage » apparaît dans chaque section filtrée « Chauffage » sans republication
- **BLOG-07** les articles d'un artisan n'apparaissent jamais sur le site d'un autre ni sur portailtravaux.fr
- **BLOG-08** export CSV ouvert dans Excel : accents corrects, une ligne par article
- **BLOG-09** HTML injecté dans le corps (script, iframe, onclick) supprimé à l'enregistrement
- **BLOG-10** « Tout faire en un clic » sans sujet : article complet avec 0 point bloquant et 0 recommandation restante, 3 liens internes réellement présents dans le texte
- **BLOG-11** mode autonome « Planifier seul » : statut Planifié, date = mois précédant le pic de recherche du mot-clé ; « Je relis » : Brouillon
- **BLOG-12** pilote « Je valide d'abord » : email `blog-a-valider` 48 h avant ; sans clic, l'article n'est jamais publié
- **BLOG-13** pilote 2/semaine refusé en Site Pro (fenêtre d'offre Tout inclus) ; deux articles du pilote n'ont jamais le même mot-clé principal
- **BLOG-14** quota atteint en Tout inclus : simple message, aucune fenêtre d'offre
