# Site internet des artisans

Maquettes :
- `designs/Site Internet Artisan.dc.html` · route `/pro/site` : **tableau de bord du site** (onglets `?onglet=pages|domaine|stats|formulaire`, plus **Suivi et publicité** et **Blog**).
- `designs/Editeur de Site.dc.html` · route `/pro/site/editeur?page=&panneau=&creation=1` : **éditeur plein écran** (hors menu du tableau de bord), qui regroupe création assistée, mise en page, référencement, modèles et assistant IA.

## 1. Offres
| Offre | Prix | Contenu |
|---|---|---|
| Gratuit | 0 € | `{slug}.portailtravaux.fr`, toutes les pages, éditeur, modèles, **aperçu IA de l'accueil (1 fois, non publiable)** + 3 réécritures de texte, formulaire standard, stats 30 jours, petite ligne « Propulsé par Portail Travaux » en bas du site |
| **Site Pro** | **9,90 € HT/mois**, sans engagement (Stripe, produit `site_pro`) ; inclus dans Fiche + Site et Tout inclus | **IA complète** (création du site, composants, pages, textes, SEO ; quotas IA_SITE §4) ; blog (BLOG.md) ; 1 domaine inclus (.fr, .com ou .eu, acheté par nous **au nom de l'artisan**) ou domaine existant connecté ; sous-domaine conservé et redirigé en 301 ; sans mention ; formulaire sur mesure ; stats 12 mois ; Search Console (**pas encore fait**) ; SMS à chaque demande (**pas encore actif** : flag `smsNouvelleDemande` coupé par défaut) |

Résiliation : le site repasse sur le sous-domaine ; le domaine acheté reste la propriété de l'artisan (code de transfert envoyé une fois par email, jamais écrit en base ; renouvellement automatique arrêté, à sa charge ensuite).

## 2. Décisions (DECISIONS D40-D53)
- **Génération IA** : toutes les pages d'un coup + pages locales « Plombier à {commune} ». **Toute la logique IA est dans `IA_SITE.md`** (opérations validées, questionnaire, monétisation, pipeline).
- **Registrar** : **OVHcloud, compte client ordinaire** (API gratuite) ; Gandi en secours ; domaine au nom de l'artisan.
- **Hébergement** (D45) : **Cloudflare for SaaS** décidé, **pas encore fait** ; aujourd'hui les sites sont rendus par l'application Next.js sur **Vercel** (§5). L'artisan ne voit ni ne connecte aucun hébergeur.
- **Anti-spam** (D46) : **Cloudflare Turnstile** invisible sur tous les formulaires, sans cookie publicitaire.
- **Statistiques** : mesure maison **sans cookie**, agrégée par jour (fait) + Search Console (**pas encore fait**).
- **Formulaire** : envois = `demandes` gratuites attribuées directement, hors matching (code commun avec le formulaire de la fiche publique, `creerDemandeDirecte`) ; badge « Via votre site » dans Mes demandes.
- **Publication jamais bloquée** (05/11/2026, l'artisan est responsable de son contenu) : les textes « [à compléter] » et liens incomplets (20 au plus) sont signalés après la publication ; un lien invalide n'est pas cliquable sur le site.

## 3. Tableau de bord du site (`/pro/site`)
- En-tête : adresse, état (en ligne, maintenance, retiré : chaque changement confirmé), Voir le site, Ouvrir l'éditeur, Publier.
- **Pages** : liste, statut, interrupteur Menu, score SEO, visites du mois, Dépublier / Mettre en ligne (effet à la publication, l'accueil reste en ligne). Boutons « Créer avec l'IA » (`?creation=1`), « Nouvelle page », « Modèles de site » (`?panneau=modeles`), « Modifier » et « SEO » (ouvrent l'éditeur sur la page).
- **Domaine** : sous-domaine gratuit ; achat en un clic (OVH compte client ordinaire, Gandi en secours ; DOMAINES §3) ; connexion d'un domaine existant ; état d'hébergement (« Hébergé et protégé par Portail Travaux »).
- **Statistiques** et **Formulaire** (constructeur de champs, notifications, anti-spam, RGPD). Le type de champ « photos » n'est **pas encore proposé** (envoi de fichiers à faire).
- **Suivi et publicité** (29/10/2026) : identifiants Google (Analytics 4, Google Ads, Tag Manager) et pixel Meta, jamais de code collé (`sites/{id}.suivi`). Événements « demande envoyée » et « clic téléphone ». Avec une balise, le site affiche un **bandeau de consentement** et rien ne se charge avant « Tout accepter ». Ouvert à tous pour l'instant (réservé ou non à Site Pro : non tranché). Les balises « HTML personnalisé » de Tag Manager sont bloquées par la CSP.
- **Formulaire en Gratuit** : formulaire **standard figé** à 4 champs (Nom et prénom, Téléphone, Email, Code postal du chantier) ; constructeur de champs et **tous les réglages** (email, SMS, anti-spam, RGPD) visibles mais verrouillés 🔒, avec un seul encart Site Pro. Valeurs par défaut appliquées : email activé, Turnstile activé, mention RGPD affichée, SMS désactivé. Contrôlé côté serveur : un site gratuit qui envoie d'autres champs voit sa requête rejetée.

## 4. Éditeur plein écran
Refait le 28/10/2026 selon la maquette `Editeur de Site`. Barre du haut : retour, site et page, appareil (ordinateur 1200 px, tablette 768, mobile 390 ; aperçu mis à l'échelle), annuler/rétablir, état d'enregistrement, Aperçu (menu, formulaire en fenêtre et liens entre pages y sont cliquables ; rien n'est compté ni envoyé), Publier.
Rail d'outils à gauche : Ajouter · Structure · Pages · SEO · Styles · Modèles · Versions · IA (panneau refermable). Page cliquable au centre (cadre et barre d'actions sur la sélection, « + Zone » / « + Section », modification directe du texte au double-clic). Panneau de droite : réglages de la sélection (onglets Général / Avancé ; Navigation : Général / Mobile / Avancé).
**Enregistrement** : à la demande (bouton « Enregistrer » ou Ctrl S ; « Publier » enregistre avant). L'enregistrement automatique essayé le 28/10/2026 a été **retiré** le 01/11/2026 (une écriture toutes les 2,5 s). « Retour » avec des modifications non enregistrées propose « Enregistrer et quitter » ou « Quitter sans enregistrer ».

### 4.1 Structure (4 niveaux, comme les constructeurs du marché)
**Section** → **Ligne** (1 à 6 colonnes, largeurs sur 12, 8 dispositions) → **Colonne** → **Élément**.
- Dans l'éditeur, ces niveaux s'appellent **zone, section, bloc, contenu** (logique pure dans `packages/core/src/sites/structure.ts`).
- 16 éléments : titre (H1/H2/H3), surtitre, texte, bouton, image, liste, avis, chiffre clé, formulaire, vidéo (YouTube, toutes les formes de lien), carte (adresse placée par le géocodage IGN, fond OpenStreetMap sans script ni cookie), espace, séparateur, logo, menu, **articles du blog**.
- **Un bouton = un élément** ; plusieurs boutons consécutifs se placent sur la même ligne (`enLigne`).
- **13 zones prêtes** avec vignettes (bandeau, bandeau photo, chiffres, prestations, réalisations, avis, texte et image, FAQ, contact, appel à l'action, pied de page, blog, vide) + **sections enregistrées par l'artisan** (« Mes sections », 30 au plus). Les faits restent « [à compléter] ».
- **Zones globales** : une zone rendue globale se pose sur d'autres pages ; modifier une copie modifie les autres ; « Détacher » la rend indépendante.
- **Fenêtres pop-up** : une zone passe en pop-up (ouverture par un bouton, après un délai ou à la sortie de la souris).
- **Animations à l'apparition** sur les zones et contenus (jamais si le visiteur réduit les animations).
- Raccourcis : Ctrl Z / Ctrl ⇧ Z, Ctrl D, Suppr, Échap (parent). Historique : 80 états.

### 4.2 Réglages
- **Par appareil** : marges (haut, bas, gauche, droite ; la valeur ordinateur descend vers tablette et mobile), tailles de texte libres (px, em, rem, vw, %), hauteurs, masquer. Mobile : empiler / inverser les colonnes, **texte différent sur mobile** (titre, surtitre, texte, bouton).
- **Fonds** (section, colonne) : couleur **ou image** + couleur par-dessus avec opacité 0-95 %, cadrage, couleur du texte auto/clair/foncé.
- **Couleurs partout** : palette du site, nuancier (`input type=color`), saisie `#hex`, `rgb()`, `hsl()`. Palette du site : 6 proposées (celles des modèles, §4.7) ou 4 couleurs éditables. Formats de texte : couleurs du thème seulement (pas de couleur libre). **Pas encore fait** : les 8 couleurs récentes du nuancier.
- **Image** : import, médiathèque (réalisations + imports + **illustrations SVG** par famille de métier aux couleurs du site, `ill:{dessin}`, 17/11/2026), format, remplir/contenir, cadrage, arrondi, couleur par-dessus, texte alternatif, action au clic.
- **Médiathèque** : images JPEG, PNG, WebP ou AVIF de 8 Mo et PDF de 10 Mo (`sites/{id}/medias`) ; poubelle au survol d'une image importée que le site n'utilise nulle part (vérifié aussi côté serveur, 17/11/2026). **Pas encore fait** : variantes WebP 640/1280/1920.
- **ID** sur chaque section (= ancre), ligne, colonne, élément ; unicité vérifiée sur la page.

### 4.3 Actions et liens
Même modèle d'action pour les boutons, images, liens du menu, bouton devis de la navigation et **mots liés dans les textes** (sélection + « Lier la sélection », stockés `[mot](#L1)`).
Types : `page` (+ section d'arrivée, nouvel onglet) · `ancre` (création automatique de l'ancre) · `url` (https obligatoire, nouvel onglet, nofollow) · `tel` · `email` (objet, message) · `sms` · `whatsapp` (message) · `formulaire` (défiler ou fenêtre, feuille du bas sur mobile) · `fichier` (PDF de 10 Mo à télécharger) · `popup` · `aucun`. Validation en direct ; les liens cassés remontent dans le score SEO.

### 4.4 Navigation (composant global)
Une seule navigation pour tout le site, **enregistrée à part** (bouton « Enregistrer la navigation », état « non enregistrée »). « Retirer le menu du site » / « + Ajouter le menu du site ». Logo image ou initiales (taille par appareil ; sans logo choisi, celui de la fiche), liens avec actions, bouton devis (couleurs fond/texte), téléphone, fond, transparente sur le premier bandeau, fixe, ombre, masquable par page.
**Mobile/tablette** : menu à 3 traits → croix ; panneau **plein écran qui glisse de la droite** (ou de la gauche), défilement de la page bloqué ; sur mobile la barre fermée n'affiche que logo + traits ; barre « Appeler · Devis » possible.

### 4.4 bis Versions
Rail « Versions » : les 20 dernières publications ; « Remettre en ligne » (instantané) ou « Reprendre » dans le brouillon (Ctrl Z annule).

### 4.5 Référencement (panneau SEO)
Par page : aperçu Google, titre 30-60, méta 110-155, adresse, mot-clé, régénération IA, vérifications cliquables (H1 unique, ville dans le titre et le H1, textes alternatifs, liens cassés, publication). Tout le site : nom, activité schema.org, zone, adresse, automatismes (sitemap, robots, canonique, JSON-LD LocalBusiness + AggregateRating). **Pas encore fait** : image de partage du site (champ à valider) et Search Console.

### 4.6 Création assistée et panneau IA (détail : `IA_SITE.md`)
- **Créer mon site avec l'IA** (`?creation=1`) : questions simples une par une (IA_SITE §3.1, ce qui est dans la fiche n'est pas redemandé), puis génération page par page dans l'éditeur. Compte gratuit : aperçu de l'accueil seulement, puis fenêtre Site Pro ; après paiement la génération reprend.
- **Panneau IA** : une zone « Demandez à l'IA… » qui agit sur la sélection (texte, élément, section) ou la page ; puces de portée (Sélection · Page · Tout le site) ; suggestions ; propositions **Appliquer / Annuler** (une étape d'historique) ; compteur de quota. Cadenas sur chaque action pour un compte gratuit.
- **Texte riche** : les zones de texte sont éditées en direct (gras, italique, souligné, lien) ; stockage `<b> <i> <u>` + `[mot](#L1)`.

### 4.7 Modèles
- **6 modèles** fournis (D47 ✅, `MODELES_SITE`, revus le 17/11/2026 à la demande du propriétaire : typographie simple, couleurs « du bâtiment ») : **Essentiel** (ardoise et cuivre), **Premium photo** (bleu nuit et ocre), **Dépannage 24/7** (graphite et orange chantier, police Barlow), **Minimal** (pétrole et orange doux), **Nature** (sapin et ambre), **Signature** (indigo et safran, ex-« Bleu franc »). Archivo + Source Sans ailleurs ; contraste AA testé. Les identifiants internes (`classique`, `chaleureux`, `franc`…) n'ont pas changé : un site existant garde ses couleurs tant que l'artisan ne réapplique pas un modèle.
- « Appliquer à tout le site » : l'accueil, le contact et les mentions sont **reconstruits depuis la fiche**, les autres pages gardent leurs zones, mises au style du modèle ; « Couleurs et polices seulement » ne change que le thème. Chaque modèle part du site d'avant (les modèles ne s'additionnent pas) ; « Revenir à l'état précédent » et Ctrl Z. Appliquer un modèle change le brouillon : il faut publier.
- **Accueil orienté conversion** (31/10/2026, ordre fixe) : bandeau avec le **formulaire de devis** à droite et une liste de garanties, **4 avis** (vrais avis publiés ; places manquantes « [à compléter] », jamais d'avis fictif), présentation avec photo, prestations (une carte par métier), réalisations, appel à l'action, pied de page. Sans photo, le bandeau, « Qui sommes-nous » et les réalisations utilisent les illustrations du métier (mention « Photo d'illustration »).
- **Mes modèles** : l'artisan enregistre son site complet (pages, navigation, thème) ; **mes sections** : une section enregistrée réapparaît dans Ajouter › Sections.

## 5. Hébergement et publication (D45)

> **État au 19/11/2026 : ce qui suit (Cloudflare for SaaS, R2, KV, Worker) n'est pas encore fait.** Aujourd'hui, `proxy.ts` réécrit l'hôte d'un site vers `/s/{hôte}` de l'application Next.js (Vercel) ; HTML rendu côté serveur, cache partagé de 30 s, CSP propre aux sites, jamais servi sur le domaine de la plateforme. Les domaines personnalisés sont ajoutés par l'**API Vercel** (DOMAINES.md). Le passage à Cloudflare ne changerait que la couche de service. **Contradiction à trancher** : D45 est ✅ (Cloudflare) dans DECISIONS, mais DOMAINES.md, le handoff et le code suivent Vercel (AVANCEMENT §27, « à confirmer »).

Cible décidée (D45) :
```
Éditeur ──Publier──▶ Function publierSite ──▶ HTML/CSS/images (WebP) ──▶ Cloudflare R2  sites/{siteId}/v{n}/…
                                                                   └──▶ KV  hote → { siteId, version }
Visiteur ──▶ www.domaine-artisan.fr ──▶ Cloudflare (WAF, DDoS, bots) ──▶ Worker « sites » ──▶ R2
Formulaire ──Turnstile──▶ API Portail Travaux /api/sites/{id}/demande ──▶ demandes (Mes demandes)
Statistiques ──▶ /api/sites/{id}/t (sans cookie) ──▶ sites/{id}/statsJour
```
- Un **seul Worker** sert tous les sites : il lit l'hôte, résout le site dans KV, sert la version publiée depuis R2 (cache edge). Changement de version = mise à jour d'une clé KV (instantané, retour arrière immédiat).
- **Domaines personnalisés** : Custom Hostnames ajoutés par l'API Cloudflare lors de l'achat ou de la connexion ; certificat HTTPS automatique. Domaines nus (`exemple.fr`) : **redirection 301 vers `www.` configurée chez OVH** (le proxy de l'apex est réservé à l'offre Entreprise). Sous-domaines gratuits : enregistrement générique `*.portailtravaux.fr` vers le même Worker.
- **Isolation** : la plateforme (Next.js + Firebase) et les sites publiés sont indépendants. Une panne de l'un n'arrête pas l'autre ; les sites déjà publiés restent en ligne pendant une maintenance de la plateforme.
- **Sécurité héritée** par tous les domaines : WAF, protection DDoS, Bot Fight Mode ; Turnstile sur les formulaires.
- **Limites à surveiller** : 15 certificats par minute (file d'attente lors des imports massifs) ; plafond de 50 000 domaines en paiement à l'usage, au-delà contrat Entreprise ; un domaine en attente de validation est facturé (purger après 72 h).
- Désactivation (résiliation, impayé) : suppression du Custom Hostname, le domaine reste à l'artisan ; le sous-domaine sert la dernière version.

## 6. Domaines
- Sous-domaine : 3-40 caractères `[a-z0-9-]`, liste réservée, unique (`sitesSlugs/{slug}`).
- Achat : recherche (OVH `/order/cart`, ou Gandi `/v5/domain/check` ; sans clés, disponibilité lue dans le DNS public), commande au nom de l'entreprise, zone DNS écrite automatiquement (A + CNAME de l'hébergeur ; MX et TXT jamais touchés).
- Domaine existant (fait) : l'artisan ajoute les enregistrements A et CNAME lus chez l'hébergeur Vercel et un TXT `_portailtravaux` ; vérification par DNS-over-HTTPS toutes les 2 min la 1re heure, puis toutes les 30 min jusqu'à 72 h (détail : DOMAINES.md). La version Cloudflare (TXT de validation Cloudflare, toutes les 10 min) n'est pas faite.
- Achat (fait, sans achat réel : clés OVH à fournir) : voir DOMAINES §3.

## 7. Coûts (COUTS.md, à revérifier avant lancement)
IA : voir IA_SITE §6 (création complète ≈ 0,25 €, composant ≈ 0,02 €, texte ≈ 0,002 € ; quotas Site Pro 5 / 60 / 300 par mois). Domaine : prix public du registrar (`.fr` chez OVH : environ 8 à 9 € par an au renouvellement selon un comparateur, à confirmer sur sa grille ; Gandi environ 24 € par an). Cloudflare for SaaS : 100 domaines inclus puis ≈ 0,10 $/domaine/mois ; R2 et Workers : quelques euros par mois à 2 000 sites.

## 8. Critères d'acceptation (préfixe SITE-)
SITE-01 génération des pages + locales en < 90 s (à mesurer avec la clé `ANTHROPIC_API_KEY`) · SITE-02 réglage mobile sans effet sur ordinateur · SITE-03 envoi formulaire → « Mes demandes » en < 10 s · SITE-04 Lighthouse mobile ≥ 90 · SITE-05 domaine connecté → HTTPS < 30 min · SITE-06 résiliation → retour au sous-domaine · SITE-07 aucun cookie sur un site publié sans balise de suivi (avec Google ou Meta : rien avant le consentement) · **SITE-08** publication visible en < 60 s, retour à la version précédente en < 10 s · **SITE-09** « Publier » met toujours le site en ligne (l'artisan est responsable de son contenu) ; une seule confirmation « Votre site est en ligne », sans liste d'erreurs techniques (les champs à revoir sont signalés dans l'éditeur, là où on les modifie) et un lien invalide n'est pas cliquable sur le site · **En ligne / maintenance / retiré** : depuis « Mon site internet », chaque changement confirmé, effet en moins d'une minute, rien n'est effacé ; republier remet en ligne · **Poste local** : « Voir le site » ouvre `sous-domaine.localhost:port` (le vrai sous-domaine n'a de DNS qu'une fois la plateforme en production) · **SITE-10** menu mobile : ouverture plein écran, défilement bloqué, fermeture par la croix · **SITE-11** enregistrer la navigation l'applique à toutes les pages, sans toucher au contenu des pages · **SITE-12** formulaire soumis par un robot (Turnstile refusé) → aucune demande créée · **SITE-IA-01 à 10** : voir IA_SITE §7.


## Blog
Onglet **Blog** de « Mon site internet » : liste des articles, catégories et tags, statistiques. Éditeur d'article dédié ; l'affichage sur le site se fait dans l'éditeur de site avec le contenu « Articles du blog ». Spécification complète : `BLOG.md`.
