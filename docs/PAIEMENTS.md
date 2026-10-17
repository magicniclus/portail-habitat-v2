# Offres, prix et paiements (fait foi)

Maquette : `designs/Mon Abonnement.dc.html` · route `/pro/abonnement` (`?offre=fiche|site|pack|tout` ouvre directement le paiement). Remplace `Paiement Offre Premium` et `Paiement Option Visibilite` (supprimées du parcours). Décisions D54-D61. Ce document **prime** sur INTEGRATIONS §1 et sur toute mention antérieure de « Visibilité » ou « Premium ».

## 1. Règle n°1 : pas de paiement avant l'inscription
Tant que l'artisan n'a pas de compte, **aucun prix, aucune formule payante, aucun mot « abonnement »** : landing d'acquisition, onboarding étapes 1-3, emails de prospection avant inscription, annuaire, fiche publique. Seules mentions autorisées : « Inscription gratuite », « 0 % de commission », « Sans engagement ». Les prix n'apparaissent qu'**une fois connecté** (`/pro/*`). Test **PAY-01** : aucune chaîne `€` liée à une formule ni lien `/pro/abonnement` dans le HTML des pages publiques pro.

## 2. Offres (mensuelles, HT, sans engagement, TVA 20 % en sus)
| Offre | Prix HT/mois | Contenu | Produit Stripe |
|---|---|---|---|
| **Gratuit** | 0 € | Fiche, demandes depuis la fiche, **avis clients**, **devis et factures**, appels d'offres à l'unité, site sur `{slug}.portailhabitat.fr` + aperçu IA | — |
| **Fiche Pro** | **29 €** | Priorité d'affichage dans le secteur, badge « Artisan recommandé », photos et réalisations illimitées, téléphone et site visibles, statistiques détaillées | `fiche_pro` |
| **Site Pro** | **9,90 €** | Domaine inclus, IA du site (IA_SITE §4), **blog avec 5 articles IA/mois** (BLOG.md), sans mention, stats 12 mois, Search Console | `site_pro` |
| **Fiche + Site** | **34,90 €** | Fiche Pro + Site Pro (−4 €) | `pack_fiche_site` |
| **Tout inclus** | **49 €** | Fiche Pro + Site Pro + **IA quotas doublés** (pas illimités) + **blog avec 15 articles IA/mois** + **−15 % sur les appels d'offres** + **accès 12 h avant** aux appels d'offres + support prioritaire | `tout_inclus` |

- **Toujours gratuits** : avis clients, devis et factures (module `Devis et Factures`), demandes reçues depuis la fiche, 0 % de commission.
- Une seule formule active par entreprise : passer de Fiche Pro à Site Pro **remplace** (proposer alors Fiche + Site). Les combinaisons sont des produits distincts, pas des cumuls d'abonnements.
- Fin des formules Visibilité et Premium et des « demandes exclusives garanties » (D31 modifiée). Abonnés existants : migration au prix inférieur le plus proche (Visibilité → Fiche Pro, Premium → Tout inclus), annoncée 30 jours avant.

## 3. Achats à l'unité
| Achat | Prix | Mode |
|---|---|---|
| **Appel d'offres** | **fixé par l'admin** : grille `grillesTarifaires` par catégorie × qualification A/B/C × budget, surchargeable par appel d'offres (Admin › Appels d'offres) | carte (Checkout `payment`, `price_data` dynamique) **ou** crédits |
| Packs de crédits | 50 € → 50 crédits · 100 € → 110 · 250 € → 290 (définis dans `packsCredits`, éditables en admin) | paiement unique ; 1 crédit = 1 € HT ; validité 24 mois |
| Pack IA | +100 modifications du site : 2,90 € HT | paiement unique, consommé après le quota du mois |
| Option Blog (D71) | +20 articles rédigés par l'IA par mois : 9,90 € HT/mois | ajoutée à Site Pro ou Fiche + Site (5 + 20 = 25 articles), pas à Tout inclus ; prorata à l'ajout, retirée sans remboursement du mois entamé, retirée d'office au passage à une formule qui ne la permet pas |

- Remise Tout inclus (−15 %) appliquée au prix affiché, en carte comme en crédits.
- Contestation d'un appel d'offres acceptée → remboursement **en crédits** (ou sur la carte si payé par carte, au choix de l'admin).

## 4. Parcours
- **Pas de page catalogue des formules.** `/pro/abonnement` montre seulement **la formule de l'artisan**, ses crédits, son pack IA, sa carte et ses factures. Les offres sont **distillées dans les outils**, au moment où elles servent, par un encart discret (une phrase + un lien `?offre=`), jamais plus d'un par écran :

| Où | Déclencheur | Offre proposée |
|---|---|---|
| Tableau de bord, menu | position dans le secteur au-delà du top 5 | Fiche Pro |
| Ma fiche › Projets réalisés | 5 projets atteints | Fiche Pro (photos illimitées) |
| Ma fiche › Aperçu côté particulier | numéro masqué | Fiche Pro (coordonnées visibles) |
| Statistiques | sous les totaux | Fiche Pro (détail) |
| Mon site › Domaine · Éditeur › IA | domaine, IA, publication sans mention | Site Pro ; **Fiche + Site** si l'artisan a déjà Fiche Pro (et inversement) |
| Appels d'offres | appel d'offres en accès anticipé, prix affiché | Tout inclus (−15 %, 12 h d'avance) |
| Éditeur › IA, quota épuisé | quota du mois atteint | Pack IA 2,90 € |
| Blog, quota d'articles atteint (Site Pro, Fiche + Site) | 5 articles du mois utilisés | Option Blog `?offre=blog` (ou Tout inclus) |
| Mon site › Blog | gratuit ou Fiche Pro seule : création d'article | Site Pro (ou Fiche + Site) |
| Éditeur de blog › IA, quota épuisé | Site Pro, 5 articles rédigés | Tout inclus (15/mois) |

- **Fenêtre d'offre** : tout clic sur une fonction payante (bouton, interrupteur, domaine, réglage verrouillé, quota atteint) ouvre une fenêtre : raison du blocage, nom de la formule, 6 avantages, prix HT + TTC « sans engagement », note de prorata ou de pack, bouton **« Continuer vers le paiement »** → `/pro/abonnement?offre=site|tout|fiche|pack`, et « Plus tard ». Jamais d'activation sans passer par le paiement. Maquettes : `Site Internet Artisan` et `Editeur de Blog`.
  Règles : jamais d'encart pour une offre déjà incluse ; « Plus tard » masque l'encart 30 jours (`users/{uid}.encartsMasques`) ; aucun encart pendant l'onboarding.
- Le lien `?offre=` ouvre directement la fenêtre de paiement sur `/pro/abonnement`. Fenêtre de paiement : récapitulatif HT/TVA/TTC, carte enregistrée ou Stripe Payment Element, CGV à cocher, 3-D Secure.
- **Changement de formule** : montée = immédiate avec **prorata** (`proration_behavior: 'always_invoice'`) ; descente = à la prochaine échéance (`schedule`). Résiliation = fin de période, retour en Gratuit.
- Retour de paiement : la page **attend le webhook** (écoute de `artisans/{id}.droits`) avant d'afficher « activé ».
- Échec de paiement : bannière + emails J0/J+3/J+6, **grâce 7 jours**, puis retour Gratuit (le site reste en ligne sur le sous-domaine).

## 5. Droits (une seule source de vérité)
`artisans/{id}.droits` (écrit **uniquement** par le webhook Stripe) :
```ts
{ formule: 'gratuit'|'fiche_pro'|'site_pro'|'pack_fiche_site'|'tout_inclus',
  ficheMiseEnAvant: bool, badgeRecommande: bool, photosIllimitees: bool, coordonneesVisibles: bool, statsDetaillees: bool,
  sitePro: bool, iaSite: 'essai'|'complet', iaMultiplicateur: 1|2,
  remiseAppelsOffres: 0|0.15, avanceAppelsOffresH: 0|12, supportPrioritaire: bool,
  statut: 'actif'|'past_due'|'grace'|'resilie_fin_periode', finPeriode, majLe }
```
Fonction pure `droitsDe(formule)` dans `packages/core/paiements/droits.ts` (testée) ; le webhook l'applique, la projection `artisansPublic` en dérive `misEnAvant`, `badge`, `telVisible`. `sites/{id}.droits.ia` est recopié depuis `iaSite`. Le client ne lit `droits` que pour l'affichage ; **chaque Function revérifie**.

## 6. Admin
- **Admin › Finances** : revenus par formule (MRR), achats d'appels d'offres, packs, remboursements, impayés en grâce, export comptable.
- **Admin › Appels d'offres › Tarifs** : édition de `grillesTarifaires` (versionnée dans `historiquePrix`), prix manuel par appel d'offres, aperçu du prix remisé Tout inclus.
- **Admin › Référentiels › Offres** : libellés et points affichés (les prix Stripe ne se modifient pas depuis l'admin : nouveau `price` + migration).
- Permissions : `finances.lire`, `finances.rembourser`, `tarifs.modifier`.

## 7. Critères (préfixe PAY-)
PAY-01 aucune mention de prix avant inscription · PAY-02 `?offre=fiche` ouvre le paiement Fiche Pro, TTC = 34,80 € · PAY-03 montée Fiche Pro → Tout inclus : prorata facturé immédiatement · PAY-04 descente : effective à l'échéance · PAY-05 droits mis à jour uniquement par webhook (écriture client refusée par les règles) · PAY-06 appel d'offres au prix admin, −15 % en Tout inclus, payable carte ou crédits · PAY-07 pack 100 € crédite 110 · PAY-08 échec de paiement → grâce 7 j puis Gratuit · PAY-09 devis, factures et avis accessibles sans aucun paiement. · PAY-10 clic sur une fonction payante → fenêtre d'offre (prix HT, TVA, TTC), « Continuer vers le paiement » ouvre `/pro/abonnement?offre=` sur la bonne formule, aucune activation sans paiement
