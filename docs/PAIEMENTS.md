# Offres, prix et paiements (fait foi)

Maquette : `designs/Mon Abonnement.dc.html` · route `/pro/abonnement` (`?offre=fiche|site|pack|tout|blog` ouvre directement le paiement). Remplace `Paiement Offre Premium` et `Paiement Option Visibilite` (supprimées du parcours ; `/pro/abonnement/premium|visibilite` et `/pro/facturation` redirigent). Décisions D54-D61, D71. Ce document **prime** sur INTEGRATIONS §1 et sur toute mention antérieure de « Visibilité » ou « Premium ».

État au 19/11/2026 : tout ce document est codé (lot 11 refait le 14/10/2026, option Blog le 17/10/2026), sauf ce qui est marqué **pas encore fait**. Prix dans le code : `PRIX_FORMULES_HT` et `PRIX_OPTION_BLOG_HT` (`packages/core/src/paiements/droits.ts`), `CATALOGUE_STRIPE` (`packages/core/src/facturation/abonnements.ts`, créé chez Stripe par `pnpm stripe:produits`). Les prix du code et ceux de ce document concordent.

## 1. Règle n°1 : pas de paiement avant l'inscription
Tant que l'artisan n'a pas de compte, **aucun prix, aucune formule payante, aucun mot « abonnement »** : landing d'acquisition, onboarding étapes 1-3, emails de prospection avant inscription, annuaire, fiche publique. Seules mentions autorisées : « Inscription gratuite », « 0 % de commission », « Sans engagement », « Gratuit · sans carte bancaire · 2 minutes » (formulaire court du 17/11/2026). Les prix n'apparaissent qu'**une fois connecté** (`/pro/*`). Test **PAY-01** : aucune chaîne `€` liée à une formule ni lien `/pro/abonnement` dans le HTML des pages publiques pro (section Tarifs de `/pro` retirée).

## 2. Offres (mensuelles, HT, sans engagement, TVA 20 % en sus)
| Offre | Prix HT/mois | Contenu | Produit Stripe |
|---|---|---|---|
| **Gratuit** | 0 € | Fiche, demandes depuis la fiche (formulaire « Demander un devis » de la fiche publique), **avis clients**, **devis et factures**, **statistiques de la fiche** (06/11/2026), appels d'offres à l'unité, site sur `{slug}.portailtravaux.fr` (mention « Propulsé par Portail Travaux ») + aperçu IA, « Remplir ma fiche avec l'IA », Plans (gratuit, D84 ; ouvert par le flag `dessin`, coupé par défaut) | — |
| **Fiche Pro** | **29 €** | Priorité d'affichage dans le secteur, label **« Premium Portail Travaux »** (a remplacé « Artisan recommandé » le 01/11/2026, même droit `badgeRecommande`), jusqu'à 5 bannières (1 sinon), photos et réalisations illimitées, téléphone et site visibles ; fiche « Premium » avec vidéo en bannière | `fiche_pro` |
| **Site Pro** | **9,90 €** | Domaine inclus, IA du site (IA_SITE §4), **blog avec 5 articles IA/mois** (BLOG.md), sans mention « Propulsé par Portail Travaux », formulaire sur mesure, stats 12 mois, Search Console (**pas encore fait**, voir SITE_INTERNET) | `site_pro` |
| **Fiche + Site** | **34,90 €** | Fiche Pro + Site Pro (−4 €) | `pack_fiche_site` |
| **Tout inclus** | **49 €** | Fiche Pro + Site Pro + **IA quotas doublés** (pas illimités) + **blog avec 15 articles IA/mois** + **−15 % sur les appels d'offres** + **accès 12 h avant** aux appels d'offres + support prioritaire + 3 sièges d'équipe + **« Partenaire »** en tête des « Artisans à la une » de l'annuaire (01/11/2026) | `tout_inclus` |

- **Toujours gratuits** : avis clients, devis et factures (module `Devis et Factures`), demandes reçues depuis la fiche, 0 % de commission. Les **statistiques de la fiche** (vues, appels, demandes de devis) sont aussi ouvertes à tous depuis le 06/11/2026 : `statsDetaillees` est toujours vrai et n'est plus un argument de vente.
- L'argumentaire repose sur le contact direct gratuit (01/11/2026) : Fiche Pro affiche le numéro **en plus** du formulaire, qui reste gratuit pour tous.
- Une seule formule active par entreprise : passer de Fiche Pro à Site Pro **remplace** (proposer alors Fiche + Site, `offreProposee`). Les combinaisons sont des produits distincts, pas des cumuls d'abonnements.
- Fin des formules Visibilité et Premium et des « demandes exclusives garanties » (D31 modifiée). Abonnés existants : migration (Visibilité → Fiche Pro, Premium → Tout inclus, `formuleMigree`, migration `001-formules-droits`), annoncée 30 jours avant. **Pas encore fait** : lancer la migration sur la vraie base et changer les prix Stripe des abonnés existants (AVANCEMENT §24).
- **Pas encore fait** : aucune limite de réalisations n'est appliquée au compte gratuit (`photosIllimitees` existe dans les droits mais rien ne le vérifie ; plafond « 5 projets » à confirmer par le propriétaire).

## 3. Achats à l'unité
| Achat | Prix | Mode |
|---|---|---|
| **Appel d'offres** | **fixé par l'admin** : grille `grillesTarifaires` par catégorie × qualification A/B/C × budget, surchargeable par appel d'offres (Admin › Appels d'offres) | carte (Checkout `payment`, `price_data` dynamique) **ou** crédits |
| Packs de crédits | 50 € → 50 crédits · 100 € → 110 · 250 € → 290 (D59) | paiement unique ; 1 crédit = 1 € HT ; validité 24 mois |
| Pack IA | +100 modifications du site : 2,90 € HT | paiement unique, consommé après le quota du mois |
| Option Blog (D71) | +20 articles rédigés par l'IA par mois : 9,90 € HT/mois | ajoutée à Site Pro ou Fiche + Site (5 + 20 = 25 articles), pas à Tout inclus ; prorata à l'ajout, retirée sans remboursement du mois entamé, retirée d'office au passage à une formule qui ne la permet pas (dans la même modification d'abonnement) |

- **Déblocage payant des appels d'offres fermé** : flag `appelsOffresPayants` à faux par défaut. Les artisans voient les chantiers (« Le déblocage des appels d'offres ouvre bientôt ») ; les packs de crédits ne sont proposés à l'achat que si le flag est ouvert.
- **Écart avec la version initiale** : les packs de crédits sont des constantes du code (`CATALOGUE_STRIPE`) ; il n'existe **pas** de collection `packsCredits` éditable dans l'admin. Les changer = changer le code et le prix Stripe.
- **Pack IA : pas encore fait côté achat.** Son prix Stripe (`ph_ia_100`) existe et le webhook sait le lire, mais aucun écran ne permet de l'acheter ; l'éditeur, quota épuisé, propose Site Pro / Tout inclus.
- Remise Tout inclus (−15 %) appliquée au prix affiché, en carte comme en crédits (`remiseAppelOffres`).
- Contestation d'un appel d'offres acceptée → remboursement **en crédits** (ou sur la carte si payé par carte, au choix de l'admin).

## 4. Parcours
- **Pas de page catalogue des formules.** `/pro/abonnement` montre **la formule de l'artisan**, ses crédits, l'option Blog si elle est souscrite (Retirer), sa carte et ses factures. Sous « Votre formule », un bloc **« Aller plus loin »** (15/11/2026, `formulesAllerPlusLoin`) : les formules qui ajoutent quelque chose à la sienne, **Site Pro en premier**, avec nom, promesse courte, prix HT par mois et un bouton qui ouvre la fenêtre de paiement (`?offre=`) ; jamais de doublon ni de formule déjà incluse (Fiche Pro + Site Pro = Fiche + Site), rien pour Tout inclus. Les **packs de crédits** ne sont proposés que si le déblocage des appels d'offres est ouvert (flag `appelsOffresPayants`) ; fermé, la section n'apparaît que s'il reste un solde, sans bouton d'achat. Les offres sont **distillées dans les outils**, au moment où elles servent, par un encart discret (`EncartOffre`, `EncartPremium`), jamais plus d'un par écran :

| Où | Déclencheur | Offre proposée | État |
|---|---|---|---|
| Tableau de bord, menu | position dans le secteur au-delà du top 5 | Fiche Pro | **pas encore fait** (position dans le secteur non calculée) |
| Ma fiche › Projets réalisés | 5 projets atteints | Fiche Pro (photos illimitées) | fait (encart `realisations`) |
| Ma fiche › Aperçu côté particulier | numéro masqué | Fiche Pro (coordonnées visibles) | fait (encart `coordonnees`) |
| Statistiques | sous les totaux | Fiche Pro (détail) | **abandonné** le 06/11/2026 (statistiques ouvertes à tous) |
| Mon site › Domaine · Formulaire · Statistiques · Éditeur › IA | domaine, IA, formulaire sur mesure, stats 12 mois, publication sans mention | Site Pro ; **Fiche + Site** si l'artisan a déjà Fiche Pro (et inversement) | fait |
| Appels d'offres | appel d'offres en accès anticipé, prix affiché | Tout inclus (−15 %, 12 h d'avance) | fait |
| Éditeur › IA, quota épuisé | quota du mois atteint | Pack IA 2,90 € | **pas encore fait** (Pack IA non achetable) |
| Blog, quota d'articles atteint (Site Pro, Fiche + Site) | 5 articles du mois utilisés | Option Blog `?offre=blog` (ou Tout inclus) | fait (lien « Option Blog : +20 articles / mois » près du compteur) |
| Mon site › Blog | gratuit ou Fiche Pro seule : création d'article | Site Pro (ou Fiche + Site) | fait |
| Éditeur de blog › IA, quota épuisé | Site Pro, 5 articles rédigés | Tout inclus (15/mois) | fait (et email `blog-quota-atteint`) |

- **Fenêtre d'offre** (`features/offres/FenetreOffre`, textes dans `packages/core/src/paiements/offres.ts`) : tout clic sur une fonction payante (bouton, interrupteur, domaine, réglage verrouillé, quota atteint) ouvre une fenêtre : raison du blocage, promesse, avantages concrets (uniquement des faits du catalogue, aucun chiffre inventé), prix HT + TTC « sans engagement », note de prorata, bouton **« Continuer vers le paiement »**, et « Plus tard ». Depuis le 01/11/2026, la formule demandée et **Tout inclus** sont présentées **côte à côte** (l'une sous l'autre sur mobile), **aucune n'est cochée d'avance** ; pas de Tout inclus proposé avec un code promo ni à qui l'a déjà. « Continuer vers le paiement » ouvre **directement Stripe Checkout** (premier abonnement) ou change la formule chez Stripe (carte déjà enregistrée) (27/10/2026). Jamais d'activation sans passer par le paiement. Maquettes : `Site Internet Artisan` et `Editeur de Blog`.
  Règles : jamais d'encart pour une offre déjà incluse ; « Plus tard » masque l'encart 30 jours (`users/{uid}.encartsMasques`, fait le 16/10/2026) ; aucun encart tant que la fiche n'est pas en ligne (onboarding).
- Le lien `?offre=` ouvre directement la fenêtre de paiement sur `/pro/abonnement` (liens des emails et des landings). Fenêtre de paiement : récapitulatif HT/TVA/TTC, Stripe Checkout (aucune saisie de carte chez nous), CGV acceptées sur la page Stripe (`consent_collection`), 3-D Secure. `?offre=blog` sans site ouvre d'abord la fenêtre Site Pro.
- **Changement de formule** : montée = immédiate avec **prorata** (`proration_behavior: 'always_invoice'`) ; descente = à la prochaine échéance (planning Stripe). Résiliation = fin de période, retour en Gratuit.
- Retour de paiement : la page **attend le webhook** (écoute de `artisans/{id}.droits`) avant d'afficher « activé ». En développement seulement : `pnpm stripe:webhooks`, ou la route `/api/pro/abonnement/relais-local` qui relit les événements Stripe de la dernière heure (404 en production).
- Échec de paiement : bannière + emails J0/J+3/J+6, **grâce 7 jours** (`GRACE_PAIEMENT_MS`), puis retour Gratuit (le site reste en ligne sur le sous-domaine).
- Double authentification exigée avant la facturation pour le propriétaire et le gérant d'une entreprise Tout inclus (CON-02, COMPTES §5).

## 5. Droits (une seule source de vérité)
`artisans/{id}.droits` (écrit **uniquement** par le webhook Stripe) :
```ts
{ formule: 'gratuit'|'fiche_pro'|'site_pro'|'pack_fiche_site'|'tout_inclus',
  ficheMiseEnAvant: bool, badgeRecommande: bool, photosIllimitees: bool, coordonneesVisibles: bool, statsDetaillees: bool /* toujours vrai depuis le 06/11/2026 : statistiques de la fiche pour tous */,
  sitePro: bool, iaSite: 'essai'|'complet', iaMultiplicateur: 1|2,
  remiseAppelsOffres: 0|0.15, avanceAppelsOffresH: 0|12, supportPrioritaire: bool,
  optionBlog: bool /* D71, Site Pro et Fiche + Site seulement */,
  statut: 'actif'|'grace'|'resilie_fin_periode', finPeriode?, majLe }
```
Fonction pure `droitsDe(formule, optionBlog)` dans `packages/core/src/paiements/droits.ts` (testée) ; le webhook l'applique (avec `siegesMax`), la projection `artisansPublic` en dérive `misEnAvant`, le label, `telVisible` et `partenaire` (Tout inclus). `sites/{id}.droits.ia` est recopié depuis `iaSite`. Le client ne lit `droits` que pour l'affichage ; **chaque Function revérifie**. (La version initiale prévoyait aussi un statut `past_due` dans `droits` : il reste sur l'abonnement Stripe, `droits.statut` n'a que les trois valeurs ci-dessus.)

## 6. Admin
- **Admin › Finances** : revenus par formule (MRR), achats d'appels d'offres, packs, remboursements, impayés en grâce, export comptable (CSV).
- **Admin › Appels d'offres › Tarifs** : édition de `grillesTarifaires` (versionnée dans `historiquePrix`), prix manuel par appel d'offres, aperçu du prix remisé Tout inclus.
- **Admin › Référentiels › Offres** : libellés et points affichés (les prix Stripe ne se modifient pas depuis l'admin : nouveau `price` + migration).
- Permissions réelles (`packages/core/src/admin/permissions.ts`) : `finances.lire`, `finances.exporter`, `finances.rembourser_carte`, `leads.prix` (et `leads.prix_illimite`) pour les tarifs. Les noms `finances.rembourser` et `tarifs.modifier` de la version initiale n'existent pas.

## 7. Critères (préfixe PAY-)
PAY-01 aucune mention de prix avant inscription · PAY-02 `?offre=fiche` ouvre le paiement Fiche Pro, TTC = 34,80 € · PAY-03 montée Fiche Pro → Tout inclus : prorata facturé immédiatement · PAY-04 descente : effective à l'échéance · PAY-05 droits mis à jour uniquement par webhook (écriture client refusée par les règles) · PAY-06 appel d'offres au prix admin, −15 % en Tout inclus, payable carte ou crédits · PAY-07 pack 100 € crédite 110 · PAY-08 échec de paiement → grâce 7 j puis Gratuit · PAY-09 devis, factures et avis accessibles sans aucun paiement. · PAY-10 clic sur une fonction payante → fenêtre d'offre (prix HT, TVA, TTC), aucune case à cocher chez nous (CGV acceptées sur la page Stripe Checkout, case obligatoire avec lien vers nos CGV), « Continuer vers le paiement » ouvre directement Stripe Checkout (ou change la formule d'un abonné), aucune activation sans paiement (décision du propriétaire, 27/10/2026 ; `/pro/abonnement?offre=` reste valable pour les liens des emails et des landings)
