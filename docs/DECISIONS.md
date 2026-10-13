# Décisions à trancher avant le développement

Chaque ligne a une **proposition par défaut**. Si vous ne changez rien, c'est elle qui s'applique. Claude Code doit lire ce fichier et **ne jamais décider seul** une question marquée « À confirmer ».

Légende : ✅ décidé · ⏳ à confirmer (la proposition s'applique en attendant) · 🔒 bloquant avant la mise en ligne

## 1. Outils et fournisseurs
| # | Question | Proposition | Statut |
|---|---|---|---|
| D1 | Emails transactionnels | **Resend** + React Email (région UE) | ⏳ |
| D2 | SMS | **Brevo SMS** (société française, données UE) | ⏳ |
| D3 | Newsletters et marketing | **Brevo** (même compte que les SMS) | ⏳ |
| D4 | Recherche plein texte de l'annuaire | **Typesense Cloud** (région UE, moins cher qu'Algolia à ce volume) | ⏳ |
| D5 | Hébergement du site | **Vercel**, région `cdg1` (Paris) pour les fonctions | ⏳ |
| D6 | Suivi des erreurs | **Sentry** (région UE) | ⏳ |
| D7 | Analytics | **Plausible** ou Matomo auto-hébergé (sans cookie, pas de consentement requis) | ⏳ |
| D8 | Feature flags | **Firebase Remote Config** + surcharge par artisan dans Firestore (voir EXPLOITATION.md §4) | ⏳ |
| D9 | Antivirus des documents | extension Firebase « Scan files » (ClamAV sur Cloud Run) | ⏳ |
| D10 | Vérification SIREN | API Recherche d'entreprises (gratuite) + API Sirene INSEE (clé gratuite) | ✅ |
| D11 | Paiement | Stripe Checkout + Billing + Tax | ✅ |
| D12 | Catalogue de composants | Storybook | ✅ |

## 2. Domaines et comptes
| # | Question | Proposition | Statut |
|---|---|---|---|
| D13 | Nom de domaine principal | `portailhabitat.fr` (à vérifier et réserver, avec `.com` en redirection) | 🔒 |
| D14 | Sous-domaines | `pro.` non : tout sur le même domaine (`/pro`), meilleur pour le SEO. Emails : `notifications.portailhabitat.fr` | ⏳ |
| D15 | Projets Firebase | `portail-habitat-dev`, `-staging`, `-prod` (plan Blaze, alertes de budget à 50 €, 200 €, 500 €) | ⏳ |
| D16 | Compte Stripe | un compte, mode test pour dev et staging | ✅ |
| D17 | Dépôt Git | GitHub privé, branche `main` protégée (PR + CI verte obligatoires) | ⏳ |

## 3. Fiscal et légal
| # | Question | Proposition | Statut |
|---|---|---|---|
| D18 | Raison sociale, SIREN, adresse, capital | champs `[…]` des pages légales et des emails | 🔒 |
| D19 | TVA sur les abonnements et leads | 20 % (B2B France) ; autoliquidation si numéro de TVA UE hors France (Stripe Tax) | ⏳ |
| D20 | Médiateur de la consommation | à choisir (ex. CM2C, Medicys) | 🔒 |
| D21 | Hébergeur à citer dans les mentions | Vercel Inc. + Google Cloud EMEA | ⏳ |
| D22 | Relecture juridique des CGU, CGV et politique d'avis | par un avocat avant la mise en ligne | 🔒 |
| D23 | DPO | pas obligatoire à ce stade ; contact RGPD : `[email]` | ⏳ |

## 4. Produit
| # | Question | Proposition | Statut |
|---|---|---|---|
| D24 | Prix Premium | **79,90 € HT/mois payé en une fois à l'année** (958,80 € HT), **99,90 € HT/mois** sans engagement | ✅ |
| D25 | Formule Visibilité | **79,90 € HT/an payé en une fois**, **12,90 € HT/mois** sans engagement : tout le Gratuit + mise en avant dans l'annuaire du secteur, téléphone affiché, badge, statistiques de visibilité. Premium l'inclut | ✅ |
| D26b | Garantie Premium | 4 **mises en relation exclusives** par mois (artisan seul contacté), sinon le 2e mois est offert. À ne pas confondre avec les appels d'offres (3 artisans max, payés à l'unité) | ✅ |
| D26c | Prix sur la landing pro | Affichés (transparence, qualification). Sélecteur Annuel / Mensuel, annuel par défaut | ✅ |
| D26d | Navigation mobile | Sous 760 px : bouton S'inscrire + menu burger ouvrant un panneau latéral (slide depuis la droite, voile, Échap, blocage du scroll). Règle pour toutes les pages publiques | ✅ |
| D26e | Étapes d'inscription | Réduites à l'essentiel (un seul sujet par étape). Barre fixe en bas : étape, statut, bouton « Étape suivante » actif seulement quand l'étape est complète | ✅ |
| D26 | Sièges Premium | 3 inclus, 9 € HT/mois par siège supplémentaire | ⏳ |
| D27 | Crédits inclus dans Premium | 5 par mois, non reportables | ⏳ |
| D28 | Valeur d'un crédit | 10 € HT | ⏳ |
| D29 | Packs de crédits | 10 crédits = 90 € HT, 25 = 200 € HT, 50 = 375 € HT | ⏳ |
| D30 | Zone de lancement | Gironde (33), 11 communes de la rive droite en premier pour le diagnostic | ✅ |
| D31 | Nombre d'artisans par demande | Demandes depuis la fiche : à l'artisan seul. **Appels d'offres : 3 réponses maximum.** (Demandes garanties Premium supprimées avec D54) | ✅ |
| D40 | Site artisan : offres | Gratuit (sous-domaine) et **Site Pro 9,90 € HT/mois** (domaine inclus) ; inclus dans Fiche + Site et Tout inclus | ✅ |
| D54 | Grille des offres | Gratuit · **Fiche Pro 29 €** · Site Pro 9,90 € · **Fiche + Site 34,90 €** · **Tout inclus 49 €** (HT/mois, sans engagement, pas d'annuel) ; fin de Visibilité et Premium (PAIEMENTS.md) | ✅ |
| D55 | Pas de prix avant inscription | aucune formule payante ni prix sur landing, onboarding, pages publiques | ✅ |
| D56 | Gratuits permanents | avis clients, devis et factures, demandes de la fiche, 0 % commission | ✅ |
| D57 | Contenu Tout inclus | Fiche + Site + IA quotas ×2 (pas illimités) + −15 % et 12 h d'avance sur les appels d'offres + support prioritaire | ⏳ |
| D58 | Appels d'offres | prix fixé par l'admin (grille + surcharge), paiement carte **ou** crédits | ✅ |
| D59 | Packs de crédits | 50 € → 50 · 100 € → 110 · 250 € → 290 crédits, validité 24 mois | ⏳ |
| D60 | Migration abonnés existants | Visibilité → Fiche Pro, Premium → Tout inclus, préavis 30 j | ⏳ |
| D62 | Facturation électronique | export Factur-X dès le lancement ; raccordement à une plateforme agréée (PA) avant le 1er septembre 2027 (émission TPE/PME) ; e-reporting B2C | ⏳ |
| D63 | Navigation de l'espace artisan | barre latérale = outils ; **Mon compte** épinglé en bas, avec onglets Profil et sécurité · Équipe · Abonnement · Aide & contact ; sélecteur d'entreprise retiré de la barre latérale | ✅ |
| D64 | Blog : périmètre | un blog **par artisan**, dans « Mon site internet », visible uniquement sur son site ; mentions légales des articles = Paramètres de Devis & factures (lues en direct) | ✅ |
| D65 | Blog : accès | inclus dans Site Pro, Fiche + Site et Tout inclus ; pas d'achat séparé | ✅ |
| D66 | Blog : quotas IA | **5 articles/mois** (Site Pro, Fiche + Site) · **15/mois** (Tout inclus) ; seule la rédaction complète compte, retouches illimitées ; pas de report | ✅ |
| D67 | Blog : commentaires | aucun en v1 (modération et spam à la charge de l'artisan) | ⏳ |
| D68 | Blog : données de mots-clés | fournisseur API (ex. DataForSEO), cache 30 j par mot-clé et département | ⏳ |
| D69 | Blog : réseaux sociaux | textes à copier en v1 ; publication automatique Facebook/Google plus tard | ⏳ |
| D70 | Blog : mode autonome | un clic = mot-clé + rédaction + SEO + image + liens + réseaux ; pilote automatique avec validation par email par défaut, publication sans validation en option | ⏳ |
| D72 | Landings : preuves marketing | « Premier réseau d'artisans de France », « 300+ demandes/jour », avis du bandeau : fournir sources et vrais avis, sinon retirer avant production | ⏳ |
| D71 | Blog : prix | à trancher : (1) option Blog 9,90 €/mois, 20 articles, ajoutable à Site Pro ; (2) « Site Pro Plus » 29 € avec 20 articles (impose de revoir Tout inclus) ; (3) pack ponctuel +10 articles. Coût réel ≈ 2 à 4 € / mois pour 20 articles | ⏳ |
| D61 | Paiement en ligne des factures clients | Stripe Connect Express (frais Stripe à la charge de l'artisan, 0 commission Portail Habitat) | ⏳ |
| D41 | Site artisan : génération IA | Toutes les pages d'un coup + pages locales par commune | ⏳ |
| D42 | Registrar | **OVHcloud API** (revendeur), domaine au nom de l'artisan | ⏳ |
| D43 | Stats des sites artisans | Mesure maison sans cookie, agrégée par jour + Search Console | ⏳ |
| D44 | Formulaire des sites | Multi-champs, envois = demandes directes gratuites, hors matching | ⏳ |
| D45 | Hébergement des sites artisans | **Cloudflare for SaaS** (Worker unique + R2 + KV) sur le compte Portail Habitat ; domaines nus redirigés vers `www.` par OVH ; plateforme et sites isolés | ⏳ |
| D46 | Anti-spam des formulaires de site | **Cloudflare Turnstile** invisible, vérifié côté API avant création de la demande | ⏳ |
| D48 | IA du site : monétisation | IA complète réservée à **Site Pro 9,90 € HT/mois** (et Fiche + Site, Tout inclus) ; gratuit = questionnaire + aperçu de l'accueil (1 fois, non publiable) + 3 réécritures à vie | ⏳ |
| D49 | IA du site : sortie | Uniquement des **opérations** validées (Zod) sur l'arbre du site, catalogue de 15 éléments / 12 sections ; jamais de HTML ; jamais de publication automatique | ✅ |
| D50 | IA du site : modèles | Claude **Sonnet** pour la création complète et les pages, **Haiku** pour textes, composants, routeur | ⏳ |
| D51 | IA du site : quotas Site Pro | 5 créations, 60 composants/pages, 300 textes par mois | ⏳ |
| D52 | IA du site : pack supplémentaire | +100 modifications à 2,90 € HT (paiement unique) | ⏳ |
| D53 | IA du site : images | Pas d'images générées ; photos de la médiathèque et des réalisations, sinon emplacement vide | ✅ |
| D47 | Modèles de site | 6 modèles fournis + modèles et sections enregistrés par l'artisan (`sites/{id}/modeles`, `sites/{id}/sectionsEnregistrees`) | ⏳ |
| D32 | Période d'essai Premium | aucune au lancement (codes promo à la place) | ⏳ |
| D31b | Demandes partenaires | Import en temps réel depuis le simulateur d'aides (~200 / jour, 7 € l'unité) : webhook, preuve de consentement obligatoire, qualification A/B/C, RGE requis pour les travaux éligibles aux aides (DATABASE §4 bis, MATCHING) | ✅ |
| D31c | Rayon de transmission | 10 à 100 km autour de l'établissement, choisi par l'artisan, sans remboursement « hors zone » dans ce rayon (CGV Pro §1 bis) | ✅ |
| D31d | Nature des demandes | Une demande est une opportunité, pas un chantier signé (CGV Pro §1 ter) ; argumentaire « un chantier signé rembourse l'année » | ✅ |
| D31e | Invendues | Offertes contre activation de Visibilité après 24 h, 1 fois par entreprise ; archivées après 72 h | ✅ |
| D31f | Groupe Facebook | « Trouver chantier » (7 000 artisans) : publication quotidienne manuelle générée par l'admin, lien suivi, 1re demande offerte | ✅ |
| D32b | Emails de conversion | Séquences par étape du cycle de vie, déclenchées d'abord par des signaux réels, score qui choisit l'offre cible (CONVERSION.md) | ✅ |
| D32c | Remises commerciales | Code personnel Stripe : −30 % max, 1 fois / 90 j, expiration réelle (72 h lancement, 7 j reconquête) ; −50 % 2 mois réservé à la rétention | ⏳ |
| D32d | Catégorie `offres_pro` | Activée par défaut pour les pros (intérêt légitime B2B, opposition en un clic) — **validation juridique requise** | ⏳ |
| D32e | Relances humaines | Emails de dernière chance et de reconquête signés « Julie », réponses lues, tâches d'appel si score ≥ 70 | ⏳ |
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

---

Quand vous tranchez une question : changez le statut en ✅, corrigez la proposition si besoin, et demandez à Claude Code de mettre à jour les documents concernés.
