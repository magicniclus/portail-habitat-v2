# Blog des artisans

Maquettes : `designs/Site Internet Artisan.dc.html` (onglet **Blog**), `designs/Editeur de Blog.dc.html` (écrire un article), `designs/Editeur de Site.dc.html` (contenu **Articles du blog** et zone **Articles du blog**). Données : `DATABASE.md` §15 quater. Décisions : D64 à D71 (toutes ✅).

**État au 19/11/2026** (lot 10d, AVANCEMENT §29 et §30) : blog codé (cœur, serveur, écrans, affichage sur le site, IA), Article en un clic et pilote automatique faits le 17/10/2026, option Blog aussi. Restent : rédaction réelle à vérifier avec la clé `ANTHROPIC_API_KEY` ; données de mots-clés DataForSEO (D68, compte et clés à fournir) ; statistiques détaillées de lecture et positions Search Console ; abonnés au blog. Ce qui n'est pas fait est marqué dans le texte.

## 1. Périmètre
- **Un blog par artisan**, dans « Mon site internet ». Ses articles ne s'affichent **que sur son site** (pas d'agrégation sur portailtravaux.fr, pas de centre d'aide commun). (D64 ✅)
- Accès : **Site Pro, Fiche + Site, Tout inclus**. Compte gratuit ou Fiche Pro seule : onglet visible, tout clic sur une action payante ouvre la **fenêtre d'offre** (PAIEMENTS §4). (D65 ✅)
- Pas de commentaires en v1 (D67 ✅).

## 2. Quotas IA (D66 ✅, D71 ✅)
| | Site Pro / Fiche + Site | avec option Blog (9,90 € HT/mois) | Tout inclus |
|---|---|---|---|
| Articles rédigés entièrement par l'IA | **5 / mois** | **25 / mois** (5 + 20) | **15 / mois** (option Blog impossible) |
| Titres, sous-titres, méta-descriptions, texte alternatif, catégorie et tags, idées, liens internes, textes réseaux sociaux, recherche de mots-clés | illimité | illimité |

- Seule la **rédaction complète** consomme un crédit (« Rédiger l'article », ou chaque idée cochée dans « Idées d'articles »). Remise à zéro le 1er du mois, pas de report.
- Compteur séparé du quota de modifications du site (IA_SITE §4), rangé à côté de lui dans `sites/{id}/ia/{mois}` (crédit `blogArticles`) plutôt que dans `usageIA/…`. Échec technique : crédit non consommé.
- Quota atteint : bouton désactivé, message, l'écriture manuelle et les retouches restent disponibles ; Site Pro voit « Passer à Tout inclus : 15 articles par mois » et le lien « Option Blog : +20 articles / mois » (`?offre=blog`). Email `blog-quota-atteint` au dernier article du quota.
- L'IA ne publie **jamais sans un clic de l'artisan** (D70) : « Planifier seul » dans le mode autonome, ou le lien de l'email `blog-a-valider` pour le pilote ; sinon tout article généré reste un brouillon.

## 2 bis. Mode autonome (un clic)
- **Fait (17/10/2026) : « ✦ Article en un clic »**, dans l'onglet Blog : sujet facultatif (vide = une idée de l'IA dont le mot-clé n'est pas déjà pris). Enchaîne : rédaction (1 crédit, fiche + chantiers + avis) → titre, méta → catégorie → photo des Réalisations + texte alternatif → liens internes complétés jusqu'à 3 (« Pour aller plus loin ») → corrections SEO automatiques (mot-clé dans le titre, longueurs, texte alternatif) → textes réseaux sociaux. **Pas encore fait** : choix du mot-clé par volume, difficulté et saison, et analyse des 10 premiers résultats Google (attendent DataForSEO, D68).
- Fin au choix : **Je relis** (brouillon) · **Planifier seul** : le 1er du mois avant le pic de recherche du mot-clé, à 8 h ; **sans DataForSEO, date de repli : dans 7 jours à 8 h**. Pas de « Publier seul » (D70). Compte 1 article dans le quota.
- **Pilote automatique** (onglet Blog, Function `piloteBlog` toutes les heures) : rythmes 2/mois, 1/semaine (Site Pro et plus) ou 2/semaine (Tout inclus seulement, fenêtre d'offre sinon). Validation : toujours « Je valide d'abord » : 48 h avant la date, l'article est rédigé en brouillon et l'email `blog-a-valider` part avec un lien personnel `/pro/blog-valider/…` ; la page ne publie qu'au clic sur « Valider la publication » (un lien ouvert par un antivirus ne publie rien) ; sans clic, jamais publié ; clic après la date : publié tout de suite. Pas de « Publier sans moi » (D70). Liste des 3 prochains sujets, chacun remplaçable (« Autre sujet »). Jamais deux articles sur le même mot-clé principal. Données : `sites/{id}/reglagesBlog/pilote` (serveur seulement), `articles.pilote`.
- Garde-fous : jamais de chiffre, prix ou promesse absent de la fiche ou des sources ; vocabulaire interdit (« lead ») ; pas plus de 2 publications automatiques par semaine pour éviter le contenu de masse pénalisé par Google.

## 3. Éditeur d'article
- Routes : `/pro/site/blog/nouveau`, `/pro/site/blog/{id}`.
- Champs : image à la une (photos des Réalisations, référence de média du site) + texte alternatif, titre, sous-titre, adresse `/blog/{slug}` (suit le titre tant que l'interrupteur est actif), corps riche (gras, italique, souligné, H2, H3, paragraphe, listes, citation, lien, annuler), méta-description, catégorie (une), tags (plusieurs), auteur (membres de l'équipe), date de publication.
- Corps stocké en HTML **assaini** côté serveur (liste blanche : p, h2, h3, strong, em, u, ul, ol, li, blockquote, a[href]) ; liens externes en `rel="noopener nofollow"`.
- Panneau droit : **IA** (quota, rédaction, retouches, idées) · **Mots-clés** · **SEO** · **Diffusion**.
- **Mots-clés** : volume mensuel (zone de la fiche), difficulté 0–100 (Facile < 30 ≤ Moyenne < 55 ≤ Difficile), tendance 12 mois avec conseil de date (« publiez le mois avant le pic »), mots associés, propositions de l'IA. Mot-clé principal + secondaires. Source : DataForSEO (D68 ✅, cache 30 j) **pas encore branché** (compte et clés à fournir) : aujourd'hui le panneau garde le mot-clé principal et les secondaires, sans volume, difficulté ni tendance (aucune donnée inventée).
- **SEO**. Bloquant pour planifier/publier : titre 10–70 car. · méta 120–160 car. · mot-clé principal dans le titre · texte alternatif ≥ 10 car. · catégorie · mentions légales complètes · aucun « [à compléter] » restant. Recommandé (non bloquant) : titre 50–60 · mot-clé dans les 100 premiers mots · densité 0,5–2,5 % · ≥ 2 liens internes · ≥ 300 mots · ≥ 2 intertitres. Aperçu Google. Liens internes suggérés (pages du site + autres articles publiés), insérables en un clic.
- **Diffusion** : textes pour Facebook, Instagram, LinkedIn, fiche Google ; hashtags ; image conseillée (prise dans les Réalisations). Copier-coller en v1, pas de publication automatique (D69 ✅ : publication automatique Facebook/Google plus tard).

## 4. Mentions légales (D64 ✅)
Bloc affiché sous chaque article, **lu en direct** depuis les Paramètres de Devis & factures (`parametresFacturation`) : éditeur (raison sociale, forme, capital, siège), SIRET, RNE, TVA, assurance décennale (assureur, n°, zone), médiateur, directeur de la publication (raison sociale par défaut : aucun champ dédié), hébergement (affiché : Portail Travaux, sites hébergés chez Vercel ; à revoir si D45 Cloudflare est mis en place). Aucune copie : une modification des paramètres met à jour devis, factures, page Mentions légales du site **et** articles. Un champ manquant bloque la publication (même règle que l'envoi d'un devis).

## 5. Liste des articles (onglet Blog)
- Colonnes : sélection, titre + catégorie + tags + « rédigé avec l'IA », statut (Brouillon, Planifié, Publié, Archivé), date, vues, auteur.
- Recherche (titre, tag, catégorie) et export CSV sur la ligne des vues (Articles · Catégories et tags · Statistiques) ; le statut se lit dans le tableau (pas de filtres en double).
- Actions groupées : publier, planifier, archiver, remettre en brouillon, supprimer (corbeille 30 j), **export CSV** (sélection ou liste filtrée ; `;` + BOM UTF-8 pour Excel). Publication groupée refusée pour les articles ayant un point bloquant.
- **Catégories** : créer, renommer (propagé aux articles), réordonner (ordre des onglets sur le site), supprimer si vide. **Tags** : créer, supprimer (retiré des articles).
- Vues : Articles · Catégories et tags · Corbeille (corbeille vidée chaque nuit après 30 j, `viderCorbeilleBlogNuit`).
- **Statistiques** : fait : **vues par article** (colonne Vues), mesure sans cookie comme le reste du site. **Pas encore fait** : lecteurs uniques, rebond, temps moyen, source principale et demandes générées, sources de trafic, par catégorie, par auteur, positions Google (Search Console).

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
- **BLOG-10** « Article en un clic » sans sujet : article complet avec 0 point bloquant et 0 recommandation restante, 3 liens internes réellement présents dans le texte
- **BLOG-11** mode autonome « Planifier seul » : statut Planifié, date = mois précédant le pic de recherche du mot-clé (sans DataForSEO : dans 7 jours à 8 h) ; « Je relis » : Brouillon
- **BLOG-12** pilote « Je valide d'abord » : email `blog-a-valider` 48 h avant ; sans clic, l'article n'est jamais publié
- **BLOG-13** pilote 2/semaine refusé en Site Pro (fenêtre d'offre Tout inclus) ; deux articles du pilote n'ont jamais le même mot-clé principal
- **BLOG-14** quota atteint en Tout inclus : simple message, aucune fenêtre d'offre
