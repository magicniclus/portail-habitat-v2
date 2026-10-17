# IA du site internet artisan

Maquette : `designs/Editeur de Site.dc.html` (panneau **IA** de la barre de gauche, fenêtre « Créer mon site avec l'IA »). Complète `SITE_INTERNET.md` ; données : `DATABASE.md` §15 ter ; décisions D48-D53.

Objectif : en **un clic** (après quelques questions simples), l'artisan obtient un site complet, prêt à publier. Ensuite l'IA sert à **améliorer** : un texte, un composant, une page ou tout le site. Fonction payante : **incluse dans Site Pro (9,90 € HT/mois) dans Fiche + Site et dans Tout inclus**.

---

## 1. Ce que l'IA sait faire

| Mode | Portée | Exemples de demandes | Modèle |
|---|---|---|---|
| **Créer le site** | tout le site | questionnaire → toutes les pages, navigation, thème, SEO, pages locales | Sonnet |
| **Améliorer les textes** | sélection, élément, section, page, site | « corrige les fautes », « plus court », « plus chaleureux », « mets Mérignac dans le titre » | Haiku |
| **Modifier un composant** | section ou élément sélectionné | « mets une photo en fond », « ajoute un bouton WhatsApp », « passe en 3 colonnes » | Haiku |
| **Créer un composant** | page (position choisie) | « ajoute une FAQ sur les aides », « une section avant/après », « un bloc urgence 24/7 » | Haiku |
| **Créer ou refaire une page** | page | « crée une page Pompe à chaleur », « refais la page Contact » | Sonnet |
| **Thème** | site | « plus moderne », « couleurs de mon logo » (palette extraite du logo) | Haiku |
| **SEO** | page ou site | titres, méta-descriptions, textes alternatifs, pages locales | Haiku |

L'artisan écrit en langage courant dans **une seule zone** (« Demandez à l'IA… ») ; un **routeur** (Haiku, sortie courte) classe la demande dans un mode et une portée. S'il manque une information, l'IA **pose une question** au lieu de deviner (§3).

---

## 2. Principe technique : l'IA ne produit jamais de HTML

L'IA ne renvoie que des **opérations** sur l'arbre du site (Section → Ligne → Colonne → Élément, DATABASE §15 bis), validées par Zod, avec uniquement les **15 éléments et 12 sections du catalogue**. Résultat : rien de cassé, tout reste éditable à la main, compatible mobile/tablette, et les règles de publication (liens valides, H1 unique…) s'appliquent.

### 2.1 Opérations (`packages/core/sites/ia/operations.ts`)
```ts
type OperationIA =
  | { op: 'texte',        cible: ElementId, champ: 'texte'|'texteMobile'|'titre'|'alt', valeur: string }   // texte riche : <b> <i> <u> [mot](#L1)
  | { op: 'props',        cible: NoeudId, patch: Partial<PropsNoeud> }                                       // fond, colonnes, marges par appareil…
  | { op: 'insererSection', page: PageId, apres: SectionId|null, section: SectionIA }                        // ids générés côté serveur
  | { op: 'remplacerSection', cible: SectionId, section: SectionIA }
  | { op: 'supprimer',    cible: NoeudId }
  | { op: 'deplacer',     cible: NoeudId, parent: NoeudId, index: number }
  | { op: 'creerPage',    page: PageIA }                                                                     // nom, slug, type, sections, seo
  | { op: 'supprimerPage', cible: PageId }                                                                   // jamais accueil ni mentions
  | { op: 'theme',        patch: Partial<Theme> }                                                            // palette, polices, rayon
  | { op: 'navigation',   patch: Partial<Navigation> }
  | { op: 'seo',          page: PageId, patch: Partial<SeoPage> }
  | { op: 'lien',         cible: ElementId, lid: string, action: Action }                                    // modèle d'action de SITE_INTERNET §4.3
```
- `SectionIA` = même schéma qu'une `Section` mais **sans ids ni styles libres** : uniquement les props autorisées du catalogue. Les images sont des références `media:{id}` (médiathèque, réalisations de la fiche) ou `vide` (emplacement « Ajouter une photo »). **L'IA ne génère pas d'images.**
- Limites par réponse : 60 opérations (création : 400), 12 sections par page, textes aux longueurs du catalogue.

### 2.2 Validation (`validerOperations`, côté serveur, avant tout affichage)
1. Schéma Zod (rejet → **1 nouvelle tentative** avec l'erreur renvoyée au modèle, puis échec propre).
2. Les `cible` existent dans l'instantané envoyé ; pages protégées non supprimées.
3. Actions de lien valides (mêmes règles que la publication).
4. **Garde-fou des faits** : tout chiffre, année, certification (RGE, Qualibat…), assurance, note d'avis, prix ou délai doit exister dans les **sources autorisées** (fiche vérifiée, réponses au questionnaire, texte existant). Sinon il est remplacé par `[à compléter]` et signalé en orange dans l'éditeur.
5. Pas de coordonnées autres que celles de la fiche ; pas de promesse de prix ferme si la fiche ne l'indique pas.
6. Lexique : jamais « lead » ; vouvoiement ; français.

### 2.3 Application
- L'éditeur affiche une **proposition** : liste lisible des changements (« Bandeau d'accueil : titre réécrit », « + Section FAQ (5 questions) ») et aperçu en direct dans le canevas, surligné.
- Boutons **Appliquer** / **Annuler** ; pour les textes : **Remplacer** / **Garder le mien** / **Autre version**.
- Appliquer = **une seule étape d'historique** (Ctrl Z annule toute la proposition).
- **Rien n'est publié par l'IA.** La publication reste un clic de l'artisan (contrôles SITE-09).
- Création complète : l'ancien site est sauvegardé en modèle automatique « Avant IA – {date} » (récupérable dans Modèles › Mes modèles).

---

## 3. Questions à l'artisan

Règles : **phrases courtes, vocabulaire de chantier, une question à la fois, réponses en un tap** (puces, oui/non), toujours un bouton « Passer » et « Je ne sais pas ». Ce qui est déjà dans la fiche **n'est jamais redemandé** : l'IA affiche « J'ai repris de votre fiche : … » avec une case pour exclure.

### 3.1 Questionnaire de création (6 questions max, adaptatif)
| # | Question (texte affiché) | Réponse | Posée si |
|---|---|---|---|
| Q1 | Quels travaux voulez-vous **le plus** décrocher ? | puces (prestations de la fiche), 3 max | toujours |
| Q2 | Vos clients, c'est surtout… | Particuliers · Propriétaires bailleurs · Syndics · Entreprises | toujours |
| Q3 | Qu'est-ce qui vous distingue ? | puces : Devis rapide · Prix ferme · Chantier propre · Urgence 24/7 · Garantie · Équipe locale · Autre (texte 140 car.) | toujours |
| Q4 | Vous intervenez en urgence ? | Oui, 7j/7 · Oui, en semaine · Non | métiers dépannage (plomberie, serrurerie, électricité, chauffage) |
| Q5 | Vous voulez montrer… | Mes photos de chantier · Mes avis · Mes certifications · Les aides (MaPrimeRénov') | photos, avis ou certifs présents ; aides si RGE |
| Q6 | Le ton du site ? | Professionnel · Chaleureux · Direct (avec un exemple de phrase pour chacun) | toujours |
| + | Pages locales : « Je crée aussi une page pour ces communes ? » | puces pré-cochées (communes du rayon les plus recherchées) | rayon > 10 km |

Le choix des modèles/couleurs n'est **pas** une question : l'IA prend le logo (palette extraite), sinon le métier, et propose 3 variantes visuelles côte à côte après génération.

### 3.2 Questions de précision (toutes les autres demandes)
L'IA appelle l'outil `poserQuestion` quand la demande est ambiguë ou qu'un fait manque (« Quel délai pour un devis : 24 h, 48 h, une semaine ? »). **Maximum 2 questions** par demande ; au-delà elle propose avec `[à compléter]`.

### 3.3 Outils exposés au modèle (exécutés par la Function)
- `poserQuestion({ texte, type: 'choix'|'multi'|'ouiNon'|'texteCourt'|'photos', options?, raison })`
- `lireNoeud(id)` / `lirePage(pageId)` : détail complet d'une partie du site (le contexte initial n'est qu'un **résumé** de l'arbre).
- `listerMedias(filtre)` : photos utilisables (alt, tags de chantier).
- `catalogue()` : sections et éléments autorisés avec leurs props.
- `proposer({ resume, operations[] })` : **sortie finale obligatoire**.

---

## 4. Monétisation (D48)

| | Gratuit | **Site Pro 9,90 € HT/mois** · Fiche + Site | Tout inclus (49 €) |
|---|---|---|---|
| Éditeur manuel, modèles, sections | ✓ | ✓ | ✓ |
| Questionnaire + **aperçu IA de la page d'accueil** | ✓ (1 fois, non publiable, filigrane « Aperçu ») | ✓ | ✓ |
| Création complète par l'IA | — | 5 / mois | 10 / mois |
| Créer / modifier des composants et pages | — | 60 / mois | 120 / mois |
| Améliorer les textes, SEO | 3 essais à vie | 300 / mois | 600 / mois |

- **Point de bascule** : à la fin de l'aperçu gratuit, l'écran montre le site généré + « Activer Site Pro pour obtenir les 7 pages et publier » → `/pro/paiement?offre=site_pro&retour=/pro/site/editeur?ia=reprendre`. Les réponses au questionnaire sont gardées : après paiement, la génération complète **reprend sans rien redemander**.
- Chaque bouton IA visible par un compte gratuit porte un cadenas et ouvre la même fenêtre d'offre (pas de bouton caché : l'artisan voit ce qu'il gagne).
- Droit calculé côté serveur : `sites/{id}.droits.ia` (`aucun`, `essai`, `complet`) écrit par le webhook Stripe (`customer.subscription.*` sur `site_pro`, `pack_fiche_site` ou `tout_inclus`). **Jamais lu depuis le client pour autoriser** : la Function revérifie.
- Résiliation : l'IA repasse en `essai` épuisé ; tout ce qui a été généré reste (c'est le site de l'artisan).
- Quotas affichés dans le panneau (« 52 modifications restantes ce mois-ci »), remis à zéro le 1er du mois. Quota épuisé : message clair, l'édition manuelle reste complète. Pack « +100 modifications » 2,90 € HT (⏳ D52).

---

### 4 bis. Blog
Quota **distinct** : 5 articles rédigés/mois (Site Pro, Fiche + Site), 15 (Tout inclus). Retouches (titres, méta, alt, tags, idées, liens internes, textes réseaux) illimitées. **Mode autonome** et **pilote automatique** : même pipeline, une seule Function `iaBlogAuto` (mot-clé → SERP → plan → rédaction → méta → image/alt → tags/liens → contrôle SEO avec jusqu'à 2 boucles de correction → réseaux), 1 crédit par article. Coût estimé ≈ 0,05 à 0,10 € par article (Sonnet), + données mots-clés/SERP en cache. Détail : `BLOG.md` §2. Rédaction : Sonnet (≈ 0,03 € par article de 900 mots) ; retouches : Haiku.

---

## 5. Pipeline serveur

```
Éditeur ── callable iaSite({ siteId, mode?, portee, cibles[], demande, sessionId? }) ──▶ Function (europe-west1)
  1. assertPermission('site.modifier') · lire droits + quota (transaction, réservation du crédit)
  2. routeur (Haiku, 200 tokens) si mode absent → { mode, portee, besoinQuestion }
  3. contexte : fiche vérifiée (iaContexteFiche/{artisanId}, recalculé à chaque modif de fiche)
               + résumé de l'arbre (ids, types, textes tronqués à 120 car.) ≤ 4 000 tokens
               + catalogue (prompt système, mis en cache Anthropic)
  4. appel Claude avec outils §3.3 · boucle d'outils ≤ 6 tours
  5. validerOperations (§2.2) · calcul du diff lisible
  6. écrit sites/{id}/iaSessions/{sessionId} · consomme le crédit (rendu si échec)
  7. renvoie { resume, operations, avertissements[], question? }
```
- **Création complète** : génération **par page en streaming** (une page = un appel, accueil en premier) ; l'éditeur remplit les sections au fil de l'eau (maquette : barre de progression du panneau IA). SITE-01 : < 90 s pour 7 pages.
- Prompt système versionné : `packages/core/sites/ia/prompts/{mode}.v{n}.md` ; version stockée dans chaque session.
- Clé `ANTHROPIC_API_KEY` dans Secret Manager ; mêmes règles qu'IA_ADMIN (pas d'appel client, journalisation, pas de données de particuliers dans le contexte).
- Modération : la demande de l'artisan passe par un filtre (contenu illicite, dénigrement de concurrents nommés) avant l'appel.

---

## 6. Coûts (COUTS.md, à revérifier)
Création complète (Sonnet, ≈ 20 k entrée + 15 k sortie) ≈ 0,25 € · composant/page (Haiku) ≈ 0,02 € · texte ≈ 0,002 €. Plafond théorique par abonné Site Pro : 5 × 0,25 + 60 × 0,02 + 300 × 0,002 ≈ **3 €/mois** pour 9,90 € HT ; usage médian attendu < 0,50 €. Aperçu gratuit ≈ 0,04 € par compte (accueil seule, Haiku). Prompt caching sur le système + catalogue.

---

## 7. Critères d'acceptation (préfixe SITE-IA-)
- **SITE-IA-01** compte gratuit : questionnaire + aperçu de l'accueil générés, bouton Publier désactivé, filigrane visible
- **SITE-IA-02** paiement Site Pro depuis l'aperçu → retour dans l'éditeur, génération complète reprise **sans reposer de question**
- **SITE-IA-03** appel direct de la Function par un compte gratuit hors essai → `permission-denied`, aucun appel Anthropic
- **SITE-IA-04** toute sortie hors schéma ou avec un id inexistant est rejetée ; rien n'est appliqué
- **SITE-IA-05** une certification ou un chiffre absent de la fiche apparaît comme `[à compléter]` et bloque la publication tant qu'il n'est pas rempli
- **SITE-IA-06** « Appliquer » puis Ctrl Z restaure exactement l'état précédent
- **SITE-IA-07** questionnaire : aucune information présente dans la fiche n'est redemandée ; 6 questions maximum
- **SITE-IA-08** quota épuisé : message, crédit non consommé en cas d'échec technique, édition manuelle intacte
- **SITE-IA-09** création complète : l'ancien site est disponible dans « Mes modèles » (« Avant IA – date »)
- **SITE-IA-10** l'IA ne publie jamais : aucune version créée dans `sites/{id}/versions` par la Function `iaSite`
