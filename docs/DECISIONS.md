# Décisions à trancher avant le développement

Chaque ligne a une **proposition par défaut**. Si vous ne changez rien, c'est elle qui s'applique. Claude Code doit lire ce fichier et **ne jamais décider seul** une question marquée « À confirmer ».

Légende : ✅ décidé · ⏳ à confirmer (la proposition s'applique en attendant) · 🔒 bloquant avant la mise en ligne

## 1. Outils et fournisseurs
| # | Question | Proposition | Statut |
|---|---|---|---|
| D1 | Emails transactionnels | **Resend** + React Email (région UE) (validé en bloc le 17/10/2026) | ✅ |
| D2 | SMS | **Brevo SMS** (société française, données UE) (validé en bloc le 17/10/2026) | ✅ |
| D3 | Newsletters et marketing | **Brevo** (même compte que les SMS) (validé en bloc le 17/10/2026) | ✅ |
| D4 | Recherche plein texte de l'annuaire | **Typesense Cloud** (région UE, moins cher qu'Algolia à ce volume) (validé en bloc le 17/10/2026) | ✅ |
| D5 | Hébergement du site | **Vercel**, région `cdg1` (Paris) pour les fonctions (validé en bloc le 17/10/2026) | ✅ |
| D6 | Suivi des erreurs | **Sentry** (région UE) (validé en bloc le 17/10/2026) | ✅ |
| D7 | Analytics | **Plausible** ou Matomo auto-hébergé (sans cookie, pas de consentement requis) (validé en bloc le 17/10/2026) | ✅ |
| D8 | Feature flags | **Firebase Remote Config** + surcharge par artisan dans Firestore (voir EXPLOITATION.md §4) (validé en bloc le 17/10/2026) | ✅ |
| D9 | Antivirus des documents | extension Firebase « Scan files » (ClamAV sur Cloud Run) (validé en bloc le 17/10/2026) | ✅ |
| D10 | Vérification SIREN | API Recherche d'entreprises (gratuite) + API Sirene INSEE (clé gratuite) | ✅ |
| D11 | Paiement | Stripe Checkout + Billing + Tax | ✅ |
| D12 | Catalogue de composants | Storybook | ✅ |

## 2. Domaines et comptes
| # | Question | Proposition | Statut |
|---|---|---|---|
| D13 | Nom de domaine principal | `portailtravaux.fr` (à vérifier et réserver, avec `.com` en redirection) | 🔒 |
| D14 | Sous-domaines | `pro.` non : tout sur le même domaine (`/pro`), meilleur pour le SEO. Emails : `notifications.portailtravaux.fr` (validé en bloc le 17/10/2026) | ✅ |
| D15 | Projets Firebase | `portail-travaux-dev`, `-staging`, `-prod` (plan Blaze, alertes de budget à 50 €, 200 €, 500 €) (validé en bloc le 17/10/2026) | ✅ |
| D16 | Compte Stripe | un compte, mode test pour dev et staging | ✅ |
| D17 | Dépôt Git | GitHub privé, branche `main` protégée (PR + CI verte obligatoires) (validé en bloc le 17/10/2026) | ✅ |

## 3. Fiscal et légal
| # | Question | Proposition | Statut |
|---|---|---|---|
| D18 | Raison sociale, SIREN, adresse, capital | champs `[…]` des pages légales et des emails | 🔒 |
| D19 | TVA sur les abonnements et leads | 20 % (B2B France) ; autoliquidation si numéro de TVA UE hors France (Stripe Tax) (validé en bloc le 17/10/2026) | ✅ |
| D20 | Médiateur de la consommation | à choisir (ex. CM2C, Medicys) | 🔒 |
| D21 | Hébergeur à citer dans les mentions | Vercel Inc. + Google Cloud EMEA (validé en bloc le 17/10/2026) | ✅ |
| D22 | Relecture juridique des CGU, CGV et politique d'avis | par un avocat avant la mise en ligne | 🔒 |
| D23 | DPO | pas obligatoire à ce stade ; contact RGPD : `[email]` (validé en bloc le 17/10/2026) | ✅ |

## 4. Produit
| # | Question | Proposition | Statut |
|---|---|---|---|
| D24 | Prix Premium | **79,90 € HT/mois payé en une fois à l'année** (958,80 € HT), **99,90 € HT/mois** sans engagement | ✅ |
| D25 | Formule Visibilité | **79,90 € HT/an payé en une fois**, **12,90 € HT/mois** sans engagement : tout le Gratuit + mise en avant dans l'annuaire du secteur, téléphone affiché, badge, statistiques de visibilité. Premium l'inclut | ✅ |
| D26b | Garantie Premium | 4 **mises en relation exclusives** par mois (artisan seul contacté), sinon le 2e mois est offert. À ne pas confondre avec les appels d'offres (3 artisans max, payés à l'unité) | ✅ |
| D26c | Prix sur la landing pro | Affichés (transparence, qualification). Sélecteur Annuel / Mensuel, annuel par défaut | ✅ |
| D26d | Navigation mobile | Sous 760 px : bouton S'inscrire + menu burger ouvrant un panneau latéral (slide depuis la droite, voile, Échap, blocage du scroll). Règle pour toutes les pages publiques | ✅ |
| D26e | Étapes d'inscription | Réduites à l'essentiel (un seul sujet par étape). Barre fixe en bas : étape, statut, bouton « Étape suivante » actif seulement quand l'étape est complète | ✅ |
| D26 | Sièges Premium | 3 inclus, 9 € HT/mois par siège supplémentaire (validé en bloc le 17/10/2026) | ✅ |
| D27 | Crédits inclus dans Premium | 5 par mois, non reportables (validé en bloc le 17/10/2026) | ✅ |
| D28 | Valeur d'un crédit | 10 € HT (validé en bloc le 17/10/2026) | ✅ |
| D29 | Packs de crédits | ~~10 crédits = 90 € HT, 25 = 200 € HT, 50 = 375 € HT~~ **remplacé par D59** (17/10/2026) | ✅ |
| D30 | Zone de lancement | Gironde (33), 11 communes de la rive droite en premier pour le diagnostic | ✅ |
| D31 | Nombre d'artisans par demande | Demandes depuis la fiche : à l'artisan seul. **Appels d'offres : 3 réponses maximum.** (Demandes garanties Premium supprimées avec D54) | ✅ |
| D40 | Site artisan : offres | Gratuit (sous-domaine) et **Site Pro 9,90 € HT/mois** (domaine inclus) ; inclus dans Fiche + Site et Tout inclus | ✅ |
| D54 | Grille des offres | Gratuit · **Fiche Pro 29 €** · Site Pro 9,90 € · **Fiche + Site 34,90 €** · **Tout inclus 49 €** (HT/mois, sans engagement, pas d'annuel) ; fin de Visibilité et Premium (PAIEMENTS.md) | ✅ |
| D55 | Pas de prix avant inscription | aucune formule payante ni prix sur landing, onboarding, pages publiques | ✅ |
| D56 | Gratuits permanents | avis clients, devis et factures, demandes de la fiche, 0 % commission | ✅ |
| D57 | Contenu Tout inclus | Fiche + Site + IA quotas ×2 (pas illimités) + −15 % et 12 h d'avance sur les appels d'offres + support prioritaire (validé en bloc le 17/10/2026) | ✅ |
| D58 | Appels d'offres | prix fixé par l'admin (grille + surcharge), paiement carte **ou** crédits | ✅ |
| D59 | Packs de crédits | 50 € → 50 · 100 € → 110 · 250 € → 290 crédits, validité 24 mois (validé en bloc le 17/10/2026) | ✅ |
| D60 | Migration abonnés existants | Visibilité → Fiche Pro, Premium → Tout inclus, préavis 30 j (validé en bloc le 17/10/2026) | ✅ |
| D62 | Facturation électronique | export Factur-X dès le lancement **et raccordement à une plateforme agréée dès maintenant** (17/10/2026) ; plateforme à choisir (proposition : B2Brouter ou Iopole, API en marque blanche) ; e-reporting B2C | ⏳ |
| D63 | Navigation de l'espace artisan | barre latérale = outils ; **Mon compte** épinglé en bas, avec onglets Profil et sécurité · Équipe · Abonnement · Aide & contact ; sélecteur d'entreprise retiré de la barre latérale | ✅ |
| D64 | Blog : périmètre | un blog **par artisan**, dans « Mon site internet », visible uniquement sur son site ; mentions légales des articles = Paramètres de Devis & factures (lues en direct) | ✅ |
| D65 | Blog : accès | inclus dans Site Pro, Fiche + Site et Tout inclus ; pas d'achat séparé | ✅ |
| D66 | Blog : quotas IA | **5 articles/mois** (Site Pro, Fiche + Site) · **15/mois** (Tout inclus) ; seule la rédaction complète compte, retouches illimitées ; pas de report | ✅ |
| D67 | Blog : commentaires | aucun en v1 (modération et spam à la charge de l'artisan) (validé en bloc le 17/10/2026) | ✅ |
| D68 | Blog : données de mots-clés | **DataForSEO**, cache 30 j par mot-clé et département (validé le 17/10/2026 ; compte à créer) | ✅ |
| D69 | Blog : réseaux sociaux | textes à copier en v1 ; publication automatique Facebook/Google plus tard (validé en bloc le 17/10/2026) | ✅ |
| D70 | Blog : mode autonome | un clic = mot-clé + rédaction + SEO + image + liens + réseaux ; fin au choix « Je relis » (brouillon) ou « Planifier seul » (le clic de l'artisan vaut validation) ; pilote automatique **toujours « Je valide d'abord »** (email 48 h avant, sans clic rien n'est publié) ; « Publier seul » et « Publier sans moi » retirés (validé le 17/10/2026) | ✅ |
| D72 | Landings : preuves marketing | « Premier réseau d'artisans de France », « 300+ demandes/jour », avis du bandeau : **le propriétaire fournit les sources et les vrais avis** (17/10/2026) ; masqués en production tant qu'ils ne sont pas reçus. **25/10/2026** : le propriétaire confirme comme réels les chiffres du hero de `/pro` (« 4,8/5 sur 2 000+ avis », « 3 200 artisans ») ; modifiables dans `config/preuveSociale` ; pastilles d'initiales JB, SM, MD affichées telles quelles à sa demande ; avis et preuves de la maquette affichés d'office en développement et sur les aperçus Vercel (démonstrations), jamais en production sans le flag `preuvesMarketing` ; à remplacer par les avis Google (GMB) | ⏳ |
| D71 | Blog : prix | **Option Blog 9,90 € HT/mois : +20 articles IA par mois (5 + 20 = 25)**, ajoutable à Site Pro et Fiche + Site, pas à Tout inclus (validé le 17/10/2026) | ✅ |
| D61 | Paiement en ligne des factures clients | **Pas en v1** : virement seulement (IBAN sur la facture) ; Stripe Connect plus tard (validé le 17/10/2026) | ✅ |
| D41 | Site artisan : génération IA | Toutes les pages d'un coup + pages locales par commune (validé en bloc le 17/10/2026) | ✅ |
| D42 | Registrar | **OVHcloud API** (revendeur), domaine au nom de l'artisan (validé en bloc le 17/10/2026) | ✅ |
| D43 | Stats des sites artisans | Mesure maison sans cookie, agrégée par jour + Search Console (validé en bloc le 17/10/2026) | ✅ |
| D44 | Formulaire des sites | Multi-champs, envois = demandes directes gratuites, hors matching (validé en bloc le 17/10/2026) | ✅ |
| D45 | Hébergement des sites artisans | **Cloudflare for SaaS** (Worker unique + R2 + KV) sur le compte Portail Travaux ; domaines nus redirigés vers `www.` par OVH ; plateforme et sites isolés (validé en bloc le 17/10/2026) | ✅ |
| D46 | Anti-spam des formulaires de site | **Cloudflare Turnstile** invisible, vérifié côté API avant création de la demande (validé en bloc le 17/10/2026) | ✅ |
| D48 | IA du site : monétisation | IA complète réservée à **Site Pro 9,90 € HT/mois** (et Fiche + Site, Tout inclus) ; gratuit = questionnaire + aperçu de l'accueil (1 fois, non publiable) + 3 réécritures à vie (validé en bloc le 17/10/2026) | ✅ |
| D49 | IA du site : sortie | Uniquement des **opérations** validées (Zod) sur l'arbre du site, catalogue de 15 éléments / 12 sections ; jamais de HTML ; jamais de publication automatique | ✅ |
| D50 | IA du site : modèles | Claude **Sonnet** pour la création complète et les pages, **Haiku** pour textes, composants, routeur (validé en bloc le 17/10/2026) | ✅ |
| D51 | IA du site : quotas Site Pro | 5 créations, 60 composants/pages, 300 textes par mois (validé en bloc le 17/10/2026) | ✅ |
| D52 | IA du site : pack supplémentaire | +100 modifications à 2,90 € HT (paiement unique) (validé en bloc le 17/10/2026) | ✅ |
| D53 | IA du site : images | Pas d'images générées ; photos de la médiathèque et des réalisations, sinon emplacement vide | ✅ |
| D47 | Modèles de site | 6 modèles fournis + modèles et sections enregistrés par l'artisan (`sites/{id}/modeles`, `sites/{id}/sectionsEnregistrees`) (validé le 17/10/2026) | ✅ |
| D32 | Période d'essai Premium | aucune au lancement (codes promo à la place) (validé en bloc le 17/10/2026) | ✅ |
| D31b | Demandes partenaires | Import en temps réel depuis le simulateur d'aides (~200 / jour, 7 € l'unité) : webhook, preuve de consentement obligatoire, qualification A/B/C, RGE requis pour les travaux éligibles aux aides (DATABASE §4 bis, MATCHING) | ✅ |
| D31c | Rayon de transmission | 10 à 100 km autour de l'établissement, choisi par l'artisan, sans remboursement « hors zone » dans ce rayon (CGV Pro §1 bis) | ✅ |
| D31d | Nature des demandes | Une demande est une opportunité, pas un chantier signé (CGV Pro §1 ter) ; argumentaire « un chantier signé rembourse l'année » | ✅ |
| D31e | Invendues | Offertes contre activation de Visibilité après 24 h, 1 fois par entreprise ; archivées après 72 h | ✅ |
| D31f | Groupe Facebook | « Trouver chantier » (7 000 artisans) : publication quotidienne manuelle générée par l'admin, lien suivi, 1re demande offerte | ✅ |
| D32b | Emails de conversion | Séquences par étape du cycle de vie, déclenchées d'abord par des signaux réels, score qui choisit l'offre cible (CONVERSION.md) | ✅ |
| D32c | Remises commerciales | Code personnel Stripe : −30 % max, 1 fois / 90 j, expiration réelle (72 h lancement, 7 j reconquête) ; −50 % 2 mois réservé à la rétention (validé en bloc le 17/10/2026) | ✅ |
| D32d | Catégorie `offres_pro` | Activée par défaut pour les pros (intérêt légitime B2B, opposition en un clic) — **validation juridique requise** | ⏳ |
| D32e | Relances humaines | Emails de dernière chance et de reconquête signés « Julie », réponses lues, tâches d'appel si score ≥ 70 (validé en bloc le 17/10/2026) | ✅ |
| D32f | Groupe témoin | 10 % des entreprises sans email commercial pour mesurer le gain réel | ✅ |
| D33 | Application mobile | **dans le périmètre** (espace pro : notifications, demandes, réponses). PWA installable avec notifications push (MOBILE.md §9) ; application native plus tard si besoin, en réutilisant packages/core | ✅ |
| D34b | Vocabulaire | Jamais le mot « lead » dans l'interface ni le marketing : on parle de **demandes**, de **mise en relation** et d'**appels d'offres** | ✅ |
| D34 | Langue | français uniquement, mais textes centralisés pour permettre une traduction plus tard | ✅ |

## 5. Technique
| # | Question | Proposition | Statut |
|---|---|---|---|
| D35 | Gestionnaire de paquets | pnpm + Turborepo | ✅ |
| D36 | Node | 22 LTS partout (site, Functions, CI) | ✅ |
| D37 | Style | Tailwind 4 + preset généré depuis les tokens | ✅ |
| D38 | Requêtes côté client | TanStack Query | ✅ |
| D39 | Navigateurs supportés | 2 dernières versions de Chrome, Safari, Firefox, Edge ; Safari iOS 16.4+ (requis pour les notifications push web) ; Android Chrome | ✅ |

## 6. Décisions prises pendant le développement (lots 0 à 14)

Ces décisions figuraient sous les numéros D40 à D50 avant la mise à jour du handoff du 13/10/2026, qui a réutilisé ces numéros. Elles sont reprises **sans changement de contenu**, renumérotées (D40 → D73, D41 → D74, D42 → D75, D43 → D76, D44 → D77, D45 → D78, D46 → D79, D47 → D80, D48 → D81, D49 → D82, D50 → D83). Elles décrivent ce que fait le code actuel ; en cas de contradiction avec une ligne plus haut, la signaler au propriétaire plutôt que trancher.

| # | Question | Proposition | Statut |
|---|---|---|---|
| D73 | Routes | Diagnostic sous `/diagnostic-immobilier/…` ; `/connexion` unique (`/pro/connexion` redirige) ; `/avis?jeton=` ; paiement `/pro/abonnement/[offre]?facturation=&code=` ; admin `/admin/appels-d-offres` | ✅ |
| D74 | Aiguillage des demandes du site | Demande garantie Premium si un Premium a du quota, sinon appel d'offres automatique (MATCHING) | ✅ |
| D75 | Emplacement du code | `packages/core/*` (ARCHITECTURE fait foi ; les anciennes mentions `lib/…` y renvoient) ; Tailwind 4 configuré en CSS (`@theme` généré depuis les tokens, pas de `tailwind.config.js`) | ✅ |
| D76 | Suivi | `docs/AVANCEMENT.md` seul (PROGRESSION.md fusionné) ; lot 1 découpé en 1a (socle) et 1b (design system) | ✅ |
| D77 | Versions du socle | **Next.js 16** (la 15 n'est plus qu'en maintenance), React 19, **TypeScript 6** (la 7 n'est pas encore prise en charge par typescript-eslint), ESLint 9, Vitest 5, Zod 4 (`@ph/core/zod`, messages en français), Sentry 11, Functions esbuild → `lib/` | ✅ |
| D78 | Contraste des boutons | L'orange pro de marque `#e05a10` n'atteint que 3,7 : 1 avec du texte blanc (AA exige 4,5). **Proposition** : les boutons principaux pro prennent `#c94f0a` (palier 600 de la maquette, 4,6 : 1) ; le texte ambre passe à `#7a5206` et le texte or Premium à `#8a6420`. L'orange reste la couleur de marque (logo, bordures, grands titres). Token `actions` dans `packages/ui/tokens` (validé en bloc le 17/10/2026) | ✅ |
| D79 | Budget JavaScript initial | EXPLOITATION §1 fixe 90 Ko (accueil) ; le socle Next.js 16 + React 19 pèse déjà ~140 Ko compressés sur une page vide. **Proposition** : accueil, landings, communes ≤ 160 Ko ; annuaire, fiche ≤ 210 Ko ; simulateur, diagnostic ≤ 230 Ko ; espace pro, admin ≤ 320 Ko. LCP de l'accueil : ≤ 2,5 s (seuil « bon » des Core Web Vitals) au lieu de 2,0 s ; sur une page presque vide, la simulation Lighthouse mesure déjà 1,9 à 2,1 s à cause du socle JavaScript. Les autres critères (performance ≥ 95, CLS ≤ 0,05, TBT) sont inchangés et respectés. Appliqué en CI en attendant (validé en bloc le 17/10/2026) | ✅ |
| D80 | Barème des appels d'offres (compléments à DATABASE §5) | La formule ne précise pas tout. **Proposition** : (1) prix de base cherché par métier, puis par **famille de travaux**, puis `prixBaseDefaut` = 15 € ; (2) concurrence : ≤ 2 artisans éligibles = faible, ≥ 8 = forte ; (3) tranche de budget sur le **milieu** de la fourchette estimée ; (4) promo appliquée au prix payé (base ou Premium) et aux crédits (arrondi supérieur), **sans plancher** (une promo de −50 % sur 5 € donne 2,50 € arrondi à 3 €) ; (5) prix bruts arrondis au centime avant l'arrondi à l'euro. Valeurs dans `docs/data/bareme-appels-offres.json` (validé en bloc le 17/10/2026) | ✅ |
| D81 | Matching : points non précisés par MATCHING.md | **Proposition** : (1) budget de l'artisan ou de la demande inconnu → adéquation neutre 0,5 ; délai souhaité inconnu (« je me renseigne ») → disponibilité 1 ; (2) décennale absente = exclusion `assurance` ; (3) sous-score qualité borné à 1 après l'ajout de `tauxRecommandation × 0,2` ; score arrondi au centième ; (4) à égalité complète, identifiant de l'artisan (déterminisme) ; (5) demande venant de la fiche d'un artisan **gratuit** : aiguillage normal (garantie au meilleur Premium s'il y en a un), l'artisan ciblé étant en tête de l'appel d'offres sinon ; ciblé Premium avec quota → la demande garantie lui revient ; (6) « plus de `seuilDemandes7j` » et « dépasse `tauxSeuil` » compris au sens strict (validé en bloc le 17/10/2026) | ✅ |
| D82 | Accueil : contenus de la maquette sans source réelle | La maquette montre des artisans, témoignages et « inspirations » fictifs et des badges App Store / Google Play, alors que D33 retient une PWA. Afficher de faux avis est une pratique commerciale trompeuse. **Proposition** : (1) artisans mis en avant = 3 fiches `artisansPublic` en ligne (Premium puis `scoreClassement`) ; (2) témoignages = 3 derniers avis publiés notés 4 ou 5 avec un texte d'au moins 40 caractères (prénom + initiale, type de travaux) ; (3) inspirations = avis publiés avec photo (titre = type de travaux, ville de l'artisan, **sans budget**) ; (4) section application : bouton « Ouvrir mon espace » et mention « installable depuis votre navigateur », sans badge de store tant qu'aucune application native n'existe ; (5) chaque section est masquée s'il n'y a pas assez de données réelles (3 artisans, 3 avis, 4 photos) ; (6) landing pro : témoignages d'artisans masqués tant qu'aucun témoignage réel et consenti n'est fourni, exemples de demandes présentés « à titre d'illustration ». Appliqué en attendant (validé en bloc le 17/10/2026) | ✅ |
| D83 | Avance Premium sur les appels d'offres | **60 minutes** (`acces: 'premium_prioritaire'`, `fenetrePremiumMin = 60`), réglable par l'admin. Remplace les « 24 h d'avance » de MATCHING et de la maquette Appels d'Offres (décision du propriétaire, 30/09/2026) | ✅ |

---

Quand vous tranchez une question : changez le statut en ✅, corrigez la proposition si besoin, et demandez à Claude Code de mettre à jour les documents concernés.

**25/10/2026 (propriétaire)** : formulaire d'inscription `/pro` limité au **métier principal** (autres métiers ajoutés ensuite dans l'espace pro) ; bloc « Pas encore prêt ? Recevez cette estimation par email » retiré (séquence prospect S1 sans point d'entrée sur `/pro`). Étapes 2 et 3 : même colonne « L'activité de votre secteur » (code postal de la ville choisie gardé dans le brouillon).

**25/10/2026 (propriétaire)** : Ma fiche — plus de liste « ce qu'il reste à compléter », seulement une barre de progression fixée en haut tant que la fiche n'est pas à 100 % ; bloc « Derniers avis · 0 avis » quand il n'y a aucun avis ; logo et bannière en glisser-déposer. **Bannières : jusqu'à 5 avec la visibilité payante** (Fiche Pro, Fiche + Site, Tout inclus), 1 sinon (remplacée à chaque envoi, « Plus de bannières » ouvre la fenêtre d'offre). Modèle de données : `artisans.banniereUrl` devient `bannieres: string[]` (≤ 5), projeté dans `artisansPublic` limité au nombre permis (après une résiliation, seules les premières restent visibles) ; carrousel sans défilement automatique sur la fiche publique.
