# Site internet des artisans

Maquettes :
- `designs/Site Internet Artisan.dc.html` · route `/pro/site` : **tableau de bord du site** (onglets `?onglet=pages|domaine|stats|formulaire`).
- `designs/Editeur de Site.dc.html` · route `/pro/site/editeur?page=&panneau=&creation=1` : **éditeur plein écran** (hors menu du tableau de bord), qui regroupe création assistée, mise en page, référencement, modèles et assistant IA.

## 1. Offres
| Offre | Prix | Contenu |
|---|---|---|
| Gratuit | 0 € | `{slug}.portailhabitat.fr`, toutes les pages, éditeur, modèles, **aperçu IA de l'accueil (1 fois, non publiable)**, formulaire, stats 30 jours, mention « Site créé avec Portail Habitat » |
| **Site Pro** | **9,90 € HT/mois**, sans engagement (Stripe, produit `site_pro`) ; inclus dans Fiche + Site et Tout inclus | **IA complète** (création du site, composants, pages, textes, SEO ; quotas IA_SITE §4) ; 1 domaine inclus (.fr, .com ou .eu, acheté par nous **au nom de l'artisan**) ou domaine existant connecté ; sous-domaine conservé et redirigé en 301 ; sans mention ; stats 12 mois ; Search Console ; SMS à chaque demande |

Résiliation : le site repasse sur le sous-domaine ; le domaine acheté reste la propriété de l'artisan (code de transfert envoyé, renouvellement à sa charge).

## 2. Décisions (DECISIONS D40-D53)
- **Génération IA** : toutes les pages d'un coup + pages locales « Plombier à {commune} ». **Toute la logique IA est dans `IA_SITE.md`** (opérations validées, questionnaire, monétisation, pipeline).
- **Registrar** : **OVHcloud API**, domaine au nom de l'artisan.
- **Hébergement** (D45) : **Cloudflare for SaaS** sur le compte Portail Habitat. L'artisan ne voit ni ne connecte aucun hébergeur.
- **Anti-spam** (D46) : **Cloudflare Turnstile** invisible sur tous les formulaires, sans cookie publicitaire.
- **Statistiques** : mesure maison **sans cookie**, agrégée par jour + Search Console.
- **Formulaire** : envois = `demandes` gratuites attribuées directement, hors matching.

## 3. Tableau de bord du site (`/pro/site`)
- **Pages** : liste, statut, menu, score SEO, visites. Boutons « Créer avec l'IA » (`?creation=1`), « Nouvelle page », « Modèles de site » (`?panneau=modeles`), « Modifier » et « SEO » (ouvrent l'éditeur sur la page).
- **Domaine** : sous-domaine gratuit ; achat OVH ; connexion d'un domaine existant ; état d'hébergement (« Hébergé et protégé par Portail Habitat »).
- **Statistiques** et **Formulaire** (constructeur de champs, notifications, anti-spam, RGPD).
- **Formulaire en Gratuit** : formulaire **standard figé** à 4 champs (Nom et prénom, Téléphone, Email, Code postal du chantier) ; constructeur de champs et **tous les réglages** (email, SMS, anti-spam, RGPD) visibles mais verrouillés 🔒, avec un seul encart Site Pro. Valeurs par défaut appliquées : email activé, Turnstile activé, mention RGPD affichée, SMS désactivé. Contrôlé côté serveur : un site gratuit qui envoie d'autres champs voit sa requête rejetée.

## 4. Éditeur plein écran
Barre du haut : retour, page, appareil (ordinateur 1200 px, tablette 768, mobile 390 ; aperçu mis à l'échelle), annuler/rétablir, Aperçu (les liens et boutons y sont cliquables), Publier.
Barre de gauche : Ajouter · Calques · Pages · SEO · Styles · Modèles · IA. Panneau de droite : réglages de la sélection (onglets Général / Avancé ; Navigation : Général / Mobile / Avancé).

### 4.1 Structure (4 niveaux, comme les constructeurs du marché)
**Section** → **Ligne** (1 à 6 colonnes, largeurs sur 12, 8 dispositions) → **Colonne** → **Élément**.
- 16 éléments : titre (H1/H2/H3), surtitre, texte, bouton, image, liste, avis, chiffre clé, formulaire, vidéo, carte, espace, séparateur, logo, menu, **articles du blog**.
- **Un bouton = un élément** ; plusieurs boutons consécutifs se placent sur la même ligne (`enLigne`).
- 12 sections prêtes + **sections enregistrées par l'artisan**.
- Raccourcis : Ctrl Z / Ctrl ⇧ Z, Ctrl D, Suppr, Échap (parent). Historique : 80 états.

### 4.2 Réglages
- **Par appareil** : marges, tailles, hauteurs, masquer. Mobile : empiler / inverser les colonnes, **texte différent sur mobile** (titre, surtitre, texte, bouton).
- **Fonds** (section, colonne) : couleur **ou image** + couleur par-dessus avec opacité 0-95 %, cadrage, couleur du texte auto/clair/foncé.
- **Couleurs partout** : palette du site, nuancier (`input type=color`), saisie `#hex`, `rgb()`, `hsl()`, 8 couleurs récentes. Palette du site : 6 proposées ou 4 couleurs éditables.
- **Image** : import, médiathèque (réalisations + imports), format, remplir/contenir, cadrage, arrondi, couleur par-dessus, texte alternatif, action au clic.
- **ID** sur chaque section (= ancre), ligne, colonne, élément ; unicité vérifiée sur la page.

### 4.3 Actions et liens
Même modèle d'action pour les boutons, images, liens du menu, bouton devis de la navigation et **mots liés dans les textes** (sélection + « Lier la sélection », stockés `[mot](#L1)`).
Types : `page` (+ section d'arrivée, nouvel onglet) · `ancre` (création automatique de l'ancre) · `url` (https obligatoire, nouvel onglet, nofollow) · `tel` · `email` (objet, message) · `sms` · `whatsapp` (message) · `formulaire` (défiler ou fenêtre) · `fichier` (téléchargement) · `aucun`. Validation en direct ; les liens cassés remontent dans le score SEO.

### 4.4 Navigation (composant global)
Une seule navigation pour tout le site, **enregistrée à part** (bouton « Enregistrer la navigation », état « non enregistrée »). Logo image ou initiales (taille par appareil), liens avec actions, bouton devis (couleurs fond/texte), téléphone, fond, transparente sur le premier bandeau, fixe, ombre, masquable par page.
**Mobile/tablette** : menu à 3 traits → croix ; panneau **plein écran qui glisse de la droite** (ou de la gauche), défilement de la page bloqué ; sur mobile la barre fermée n'affiche que logo + traits.

### 4.5 Référencement (panneau SEO)
Par page : aperçu Google, titre 30-60, méta 110-155, adresse, mot-clé, régénération IA, vérifications cliquables (H1 unique, ville dans le titre et le H1, textes alternatifs, liens cassés, publication). Tout le site : nom, activité schema.org, zone, image de partage, Search Console, automatismes (sitemap, robots, canonique, JSON-LD LocalBusiness + AggregateRating).

### 4.6 Création assistée et panneau IA (détail : `IA_SITE.md`)
- **Créer mon site avec l'IA** (`?creation=1`) : questions simples une par une (IA_SITE §3.1, ce qui est dans la fiche n'est pas redemandé), puis génération page par page dans l'éditeur. Compte gratuit : aperçu de l'accueil seulement, puis fenêtre Site Pro ; après paiement la génération reprend.
- **Panneau IA** : une zone « Demandez à l'IA… » qui agit sur la sélection (texte, élément, section) ou la page ; puces de portée (Sélection · Page · Tout le site) ; suggestions ; propositions **Appliquer / Annuler** (une étape d'historique) ; compteur de quota. Cadenas sur chaque action pour un compte gratuit.
- **Texte riche** : les zones de texte sont éditées en direct (gras, italique, souligné, lien) ; stockage `<b> <i> <u>` + `[mot](#L1)`.

### 4.7 Modèles
- **6 modèles** fournis (classique, premium photo, dépannage 24/7, minimal, chaleureux, bleu franc) : « Appliquer à tout le site » (refait la mise en page, garde les données de la fiche) ou « Couleurs et polices seulement ». Retour à l'état précédent possible.
- **Mes modèles** : l'artisan enregistre son site complet (pages, navigation, thème) ; **mes sections** : une section enregistrée réapparaît dans Ajouter › Sections.

## 5. Hébergement et publication (D45)
```
Éditeur ──Publier──▶ Function publierSite ──▶ HTML/CSS/images (WebP) ──▶ Cloudflare R2  sites/{siteId}/v{n}/…
                                                                   └──▶ KV  hote → { siteId, version }
Visiteur ──▶ www.domaine-artisan.fr ──▶ Cloudflare (WAF, DDoS, bots) ──▶ Worker « sites » ──▶ R2
Formulaire ──Turnstile──▶ API Portail Habitat /api/sites/{id}/demande ──▶ demandes (Mes demandes)
Statistiques ──▶ /api/sites/{id}/t (sans cookie) ──▶ sites/{id}/statsJour
```
- Un **seul Worker** sert tous les sites : il lit l'hôte, résout le site dans KV, sert la version publiée depuis R2 (cache edge). Changement de version = mise à jour d'une clé KV (instantané, retour arrière immédiat).
- **Domaines personnalisés** : Custom Hostnames ajoutés par l'API Cloudflare lors de l'achat ou de la connexion ; certificat HTTPS automatique. Domaines nus (`exemple.fr`) : **redirection 301 vers `www.` configurée chez OVH** (le proxy de l'apex est réservé à l'offre Entreprise). Sous-domaines gratuits : enregistrement générique `*.portailhabitat.fr` vers le même Worker.
- **Isolation** : la plateforme (Next.js + Firebase) et les sites publiés sont indépendants. Une panne de l'un n'arrête pas l'autre ; les sites déjà publiés restent en ligne pendant une maintenance de la plateforme.
- **Sécurité héritée** par tous les domaines : WAF, protection DDoS, Bot Fight Mode ; Turnstile sur les formulaires.
- **Limites à surveiller** : 15 certificats par minute (file d'attente lors des imports massifs) ; plafond de 50 000 domaines en paiement à l'usage, au-delà contrat Entreprise ; un domaine en attente de validation est facturé (purger après 72 h).
- Désactivation (résiliation, impayé) : suppression du Custom Hostname, le domaine reste à l'artisan ; le sous-domaine sert la dernière version.

## 6. Domaines
- Sous-domaine : 3-40 caractères `[a-z0-9-]`, liste réservée, unique (`sitesSlugs/{slug}`).
- Achat : recherche OVH (`/domain/check`), commande au nom de l'artisan, DNS chez OVH avec CNAME `www` → `sites.portailhabitat.fr` et redirection de l'apex.
- Domaine existant : l'artisan ajoute le CNAME `www` et le TXT de validation Cloudflare ; vérification toutes les 10 min pendant 72 h.

## 7. Coûts (COUTS.md, à revérifier avant lancement)
IA : voir IA_SITE §6 (création complète ≈ 0,25 €, composant ≈ 0,02 €, texte ≈ 0,002 € ; quotas Site Pro 5 / 60 / 300 par mois). Domaine OVH ≈ 7-12 € HT/an. Cloudflare for SaaS : 100 domaines inclus puis ≈ 0,10 $/domaine/mois ; R2 et Workers : quelques euros par mois à 2 000 sites.

## 8. Critères d'acceptation (préfixe SITE-)
SITE-01 génération des pages + locales en < 90 s · SITE-02 réglage mobile sans effet sur ordinateur · SITE-03 envoi formulaire → « Mes demandes » en < 10 s · SITE-04 Lighthouse mobile ≥ 90 · SITE-05 domaine connecté → HTTPS < 30 min · SITE-06 résiliation → retour au sous-domaine · SITE-07 aucun cookie sur un site publié · **SITE-08** publication visible en < 60 s, retour à la version précédente en < 10 s · **SITE-09** tout lien ou bouton invalide bloque la publication avec un message clair · **SITE-10** menu mobile : ouverture plein écran, défilement bloqué, fermeture par la croix · **SITE-11** enregistrer la navigation l'applique à toutes les pages, sans toucher au contenu des pages · **SITE-12** formulaire soumis par un robot (Turnstile refusé) → aucune demande créée · **SITE-IA-01 à 10** : voir IA_SITE §7.


## Blog
Onglet **Blog** de « Mon site internet » : liste des articles, catégories et tags, statistiques. Éditeur d'article dédié ; l'affichage sur le site se fait dans l'éditeur de site avec le contenu « Articles du blog ». Spécification complète : `BLOG.md`.
