# Mobile : règles de développement

Plus de 70 % des particuliers et la majorité des artisans (sur chantier) utiliseront le site **sur téléphone**. Le mobile est la cible **principale** : on conçoit et on teste d'abord à 390 px, puis on élargit.

Ce document s'applique à **tous les lots** qui produisent de l'interface. Il complète ARCHITECTURE.md (composants) et EXPLOITATION.md §1 (budget de performance).

---

## 1. Principes
1. **Mobile d'abord** : styles de base = mobile ; `sm: md: lg:` n'ajoutent que ce qui change en grand écran. Jamais l'inverse
2. **Une colonne sous 768 px**, sans exception pour les formulaires et les parcours
3. **Le pouce décide** : l'action principale est en bas de l'écran, atteignable d'une main
4. **Zéro défilement horizontal** à 320 px (test automatique)
5. **Même contenu** sur mobile et ordinateur : on réorganise, on ne supprime pas d'information utile

## 2. Points de rupture et gabarits
| Nom | Largeur | Usage |
|---|---|---|
| base | 320 – 639 px | téléphone (cible de conception : **390 px**) |
| `sm` | ≥ 640 px | grand téléphone paysage, petite tablette |
| `md` | ≥ 768 px | tablette : 2 colonnes possibles |
| `lg` | ≥ 1024 px | ordinateur : sidebars, grilles |
| `xl` | ≥ 1280 px | largeur maximale du contenu (1240 px) |

- Marges latérales : `clamp(16px, 4vw, 48px)` (token `--space-page`)
- Grilles : `repeat(auto-fit, minmax(min(100%, 280px), 1fr))` ; jamais de colonne fixe qui force le débordement
- **Container queries** (`@container`) pour les composants réutilisés dans des largeurs variables (cartes artisan, récapitulatifs)
- Hauteurs : `min-height` uniquement ; plein écran avec `100dvh` (pas `100vh`, faux sur iOS)

## 3. Typographie et lisibilité
- Corps de texte **16 px minimum** sur mobile (17 px pour les paragraphes longs) ; titres fluides avec `clamp()`
- **Champs de formulaire à 16 px minimum** : en dessous, Safari iOS zoome automatiquement
- Longueur de ligne ≤ 70 caractères ; `text-wrap: pretty` sur les paragraphes, `balance` sur les titres
- Contraste AA partout, y compris texte sur photo (voile ou fond plein)

## 4. Cibles tactiles et gestes
- **44 × 44 px minimum** pour tout élément cliquable (48 px pour les boutons principaux), 8 px d'espacement entre deux cibles
- Liens dans un texte : zone de clic agrandie par `padding` vertical
- Pas d'information accessible uniquement au survol (`:hover`) ; tout survol a son équivalent au toucher ou au focus
- Gestes : balayage uniquement en **complément** d'un bouton visible (carrousel, fermeture d'une feuille)
- `touch-action: manipulation` sur les boutons (supprime le délai de double-tap) ; pas de désactivation du zoom

## 5. Formulaires (le cœur du produit)
| Champ | Attributs obligatoires |
|---|---|
| Téléphone | `type="tel"` `inputmode="tel"` `autocomplete="tel"` |
| Email | `type="email"` `inputmode="email"` `autocomplete="email"` `autocapitalize="off"` |
| Code postal | `inputmode="numeric"` `autocomplete="postal-code"` `maxlength="5"` `pattern="\d{5}"` |
| Prénom / nom | `autocomplete="given-name"` / `"family-name"` `autocapitalize="words"` |
| Adresse | `autocomplete="street-address"` + suggestions API Adresse (BAN) |
| SIREN | `inputmode="numeric"` `autocomplete="off"`, formatage `812 345 678` à la saisie |
| Montant, surface | `inputmode="decimal"` |
| Code SMS | `inputmode="numeric"` `autocomplete="one-time-code"` |
| Mot de passe | `autocomplete="new-password"` / `"current-password"`, bouton afficher / masquer |

- **Listes déroulantes** : `<select>` natif (roue iOS, liste Android), jamais de liste déroulante JavaScript pour un choix simple. Les `<optgroup>` sont conservés (métiers par famille)
- `enterkeyhint="next"` entre les champs, `"send"` / `"done"` sur le dernier
- Erreurs sous le champ concerné, au moment où on quitte le champ (pas à chaque frappe), avec défilement vers la première erreur à l'envoi
- **Le clavier ne doit jamais masquer** le champ actif ni le bouton : `scroll-margin-bottom` + `visualViewport` pour les barres fixes
- Sliders (simulateur) : toujours accompagnés d'un champ numérique ou de boutons − / + ; poignée de 32 px minimum
- Chips et interrupteurs : hauteur 36 px minimum, retour à la ligne (`flex-wrap`), jamais de défilement horizontal caché

## 6. Navigation
- **Site public** : en-tête compact (56 px) avec logo, bouton principal et menu. Le menu s'ouvre en **plein écran** (Radix Dialog), focus piégé, fermeture par × et Échap
- **Espace pro et admin** : la sidebar devient une **barre d'onglets en bas** (5 entrées max : Tableau de bord, Demandes, Appels d'offres, Messages, Plus), avec badges ; « Plus » ouvre une feuille avec le reste
- **Espace particulier** : barre d'onglets en bas (Projets, Messages, Compte)
- Sélecteur d'entreprise : feuille du bas plutôt que menu déroulant
- Retour navigateur fonctionnel à chaque étape (étape dans l'URL, voir REPRISE_PARCOURS.md)

## 7. Motifs mobiles par écran
| Écran | Adaptation mobile |
|---|---|
| Accueil (recherche de projet) | au focus, la recherche passe en **plein écran** (champ en haut, suggestions dessous, clavier ouvert), bouton « Annuler » |
| Simulateur, parcours diagnostic, avis | une question par écran si la question est longue ; barre d'action **collée en bas** (« Continuer » + retour) au-dessus du clavier ; le récapitulatif latéral devient un bandeau repliable en haut |
| Écran de résultat (prix) | fourchette en tête, détail par poste en accordéon, bouton « Recevoir mes devis » fixe en bas |
| Annuaire | filtres dans une **feuille du bas** avec « Voir N résultats » ; chips des filtres actifs en ligne défilante ; carte en option (bouton « Carte ») |
| Fiche artisan | bouton **Appeler** (`tel:`) et **Demander un devis** fixes en bas ; galerie en balayage |
| Landing pro | formulaire d'inscription directement sous le titre (pas en bas de page) ; tableau comparatif en 2 cartes empilées |
| Inscription (étape 2 : zone) | carte à 55 % de la hauteur, rayon en boutons sous la carte ; géolocalisation « Utiliser ma position » |
| Mes demandes, appels d'offres | tableaux → **cartes empilées** ; actions principales (Répondre, Ignorer) sur la carte ; balayage facultatif |
| Messagerie | plein écran, champ de saisie collé en bas, `safe-area-inset-bottom` |
| Équipe, admin | tableaux → cartes ; matrice des droits en tableau défilant avec 1re colonne figée |
| Modales | deviennent des **feuilles du bas** (bottom sheet) sous 640 px, poignée + balayage vers le bas pour fermer |
| Emails | déjà mobiles (600 px, blocs empilés) : tester sur Gmail iOS / Android et Apple Mail |

## 8. Intégration iOS et Android
- `viewport` : `width=device-width, initial-scale=1, viewport-fit=cover` (jamais `user-scalable=no`)
- Zones sûres : `env(safe-area-inset-*)` sur les barres fixes haut et bas
- `theme-color` par espace (vert, orange, bleu, ardoise), clair et sombre
- Barres fixes : `position: sticky` de préférence à `fixed` ; `overscroll-behavior: contain` dans les feuilles et la messagerie
- Liens actionnables : `tel:`, `mailto:`, itinéraire (`geo:` / Apple Plans / Google Maps)
- Partage natif (`navigator.share`) pour une fiche artisan ou un devis, avec repli « Copier le lien »
- Appareil photo : `<input type="file" accept="image/*" capture="environment">` pour les documents et photos de chantier ; compression côté client (≤ 2 Mo, 2000 px) avant envoi

## 9. Application mobile (PWA, voir DECISIONS D33)
- **Manifest** par espace (`/pro` : nom « Portail Habitat Pro », icônes 192 / 512 / maskable, `display: standalone`, raccourcis « Mes demandes », « Appels d'offres »)
- **Service worker** (Serwist / Workbox) : pages de l'espace en cache, **mode hors ligne** lisible (demandes déjà chargées, brouillon de devis), file d'envoi rejouée au retour du réseau
- **Notifications push** (Web Push + Firebase Cloud Messaging) : nouvelle demande, message, appel d'offres ; demande d'autorisation **après** une première action utile, jamais au chargement
- Invitation « Installer l'application » après la 2e visite de l'espace pro (et guide spécifique pour iOS : Partager → Sur l'écran d'accueil)
- Si une application native est retenue plus tard (Capacitor ou React Native), elle réutilise `packages/core` et `packages/ui/tokens`

## 10. Performance mobile
Budget d'EXPLOITATION.md §1, mesuré en **4G lente simulée sur un Moto G Power** (profil Lighthouse mobile).
- Images `next/image` avec `sizes` exacts, AVIF/WebP, `priority` uniquement sur l'image du haut
- Aucune bibliothèque de carte chargée tant que la carte n'est pas visible (`IntersectionObserver`)
- Polices : 2 graisses maximum, `display: swap`, préchargées
- Animations : `transform` et `opacity` uniquement, désactivées avec `prefers-reduced-motion`
- INP < 200 ms : pas de calcul lourd au clavier (recherche avec délai de 120 ms, calculs du simulateur hors du rendu)

## 11. Tests
- **Playwright**, projets `iPhone 13` (390 × 844, WebKit), `Pixel 7` (Chromium) et `iPhone SE` (320 px de large utile), en plus de l'ordinateur
- Tests automatiques sur chaque page : aucun défilement horizontal à 320 px, cibles ≥ 44 px (script qui mesure les éléments interactifs), champs ≥ 16 px, `autocomplete` et `inputmode` présents sur les champs du §5
- Captures comparées aux maquettes à 390 px (commande `/maquette`)
- **Tests manuels avant chaque lot d'écrans** : un vrai iPhone (Safari) et un vrai Android (Chrome), en 4G, clavier ouvert, mode sombre système, texte agrandi à 130 %
- Lighthouse mobile en CI selon le budget

## 12. Critères d'acceptation communs (ajoutés à ACCEPTANCE.md)
- **MOB-01** : aucune page ne défile horizontalement à 320 px
- **MOB-02** : tous les éléments interactifs mesurent au moins 44 × 44 px
- **MOB-03** : aucun zoom automatique à la saisie sur iOS (champs ≥ 16 px)
- **MOB-04** : le bouton principal d'un parcours reste visible au-dessus du clavier ouvert
- **MOB-05** : les modales s'ouvrent en feuille du bas sous 640 px et se ferment par balayage, × ou retour
- **MOB-06** : l'espace pro s'installe comme application et reçoit une notification de nouvelle demande
- **MOB-07** : Lighthouse mobile conforme au budget sur les pages publiques et les parcours
