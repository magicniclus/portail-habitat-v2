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
| D5 | Hébergement du site | **Vercel**, région `cdg1` (Paris) pour les fonctions | ✅ |
| D6 | Suivi des erreurs | **Sentry** (région UE) | ✅ |
| D7 | Analytics | **Plausible** ou Matomo auto-hébergé (sans cookie, pas de consentement requis) | ⏳ |
| D8 | Feature flags | **Firebase Remote Config** + surcharge par artisan dans Firestore (voir EXPLOITATION.md §4) | ✅ |
| D9 | Antivirus des documents | extension Firebase « Scan files » (ClamAV sur Cloud Run) | ⏳ |
| D10 | Vérification SIREN | API Recherche d'entreprises (gratuite) + API Sirene INSEE (clé gratuite) | ✅ |
| D11 | Paiement | Stripe Checkout + Billing + Tax | ✅ |
| D12 | Catalogue de composants | Storybook | ✅ |

## 2. Domaines et comptes
| # | Question | Proposition | Statut |
|---|---|---|---|
| D13 | Nom de domaine principal | `portailhabitat.fr` (à vérifier et réserver, avec `.com` en redirection) | 🔒 |
| D14 | Sous-domaines | `pro.` non : tout sur le même domaine (`/pro`), meilleur pour le SEO. Emails : `notifications.portailhabitat.fr` | ⏳ |
| D15 | Projets Firebase | `portail-habitat-dev`, `-staging`, `-prod` (plan Blaze, alertes de budget à 50 €, 200 €, 500 €) | ✅ |
| D16 | Compte Stripe | un compte, mode test pour dev et staging | ✅ |
| D17 | Dépôt Git | GitHub privé, branche `main` protégée (PR + CI verte obligatoires) | ✅ |

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
| D31 | Nombre d'artisans par demande | **Demandes garanties Premium (4/mois) : transmises à 1 seul artisan** (exclusivité). **Appels d'offres (toutes formules) : 3 réponses maximum** | ✅ |
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
| D37 | Style | Tailwind 4, thème `@theme` (CSS) généré depuis les tokens | ✅ |
| D38 | Requêtes côté client | TanStack Query | ✅ |
| D40 | Routes | Diagnostic sous `/diagnostic-immobilier/…` ; `/connexion` unique (`/pro/connexion` redirige) ; `/avis?jeton=` ; paiement `/pro/abonnement/[offre]?facturation=&code=` ; admin `/admin/appels-d-offres` | ✅ |
| D41 | Aiguillage des demandes du site | Demande garantie Premium si un Premium a du quota, sinon appel d'offres automatique (MATCHING) | ✅ |
| D42 | Emplacement du code | `packages/core/*` (ARCHITECTURE fait foi ; les anciennes mentions `lib/…` y renvoient) ; Tailwind 4 configuré en CSS (`@theme` généré depuis les tokens, pas de `tailwind.config.js`) | ✅ |
| D43 | Suivi | `docs/AVANCEMENT.md` seul (PROGRESSION.md fusionné) ; lot 1 découpé en 1a (socle) et 1b (design system) | ✅ |
| D44 | Versions du socle | **Next.js 16** (la 15 n'est plus qu'en maintenance), React 19, **TypeScript 6** (la 7 n'est pas encore prise en charge par typescript-eslint), ESLint 9, Vitest 5, Zod 4 (`@ph/core/zod`, messages en français), Sentry 11, Functions esbuild → `lib/` | ✅ |
| D45 | Contraste des boutons | L'orange pro de marque `#e05a10` n'atteint que 3,7 : 1 avec du texte blanc (AA exige 4,5). **Proposition** : les boutons principaux pro prennent `#c94f0a` (palier 600 de la maquette, 4,6 : 1) ; le texte ambre passe à `#7a5206` et le texte or Premium à `#8a6420`. L'orange reste la couleur de marque (logo, bordures, grands titres). Token `actions` dans `packages/ui/tokens` | ⏳ |
| D46 | Budget JavaScript initial | EXPLOITATION §1 fixe 90 Ko (accueil) ; le socle Next.js 16 + React 19 pèse déjà ~140 Ko compressés sur une page vide. **Proposition** : accueil, landings, communes ≤ 160 Ko ; annuaire, fiche ≤ 210 Ko ; simulateur, diagnostic ≤ 230 Ko ; espace pro, admin ≤ 320 Ko. Les autres critères (performance ≥ 95, LCP ≤ 2 s, CLS ≤ 0,05) sont inchangés et respectés. Appliqué en CI en attendant | ⏳ |
| D39 | Navigateurs supportés | 2 dernières versions de Chrome, Safari, Firefox, Edge ; Safari iOS 16.4+ (requis pour les notifications push web) ; Android Chrome | ✅ |

---

Quand vous tranchez une question : changez le statut en ✅, corrigez la proposition si besoin, et demandez à Claude Code de mettre à jour les documents concernés.
