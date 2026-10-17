# Suivi des lots

Mis à jour par Claude Code à la fin de chaque lot, puis commité. En cas d'interruption, c'est ici qu'on regarde où on en est (prompt « Reprise » dans PROMPT_CLAUDE_CODE.md).

Statuts : ⬜ à faire · 🟡 en cours · ✅ terminé (critères d'ACCEPTANCE verts) · ⏸ bloqué (raison dans Notes)

| Lot | Contenu | Statut | Terminé le | Tests | Notes |
|---|---|---|---|---|---|
| 0 | Cadrage | ✅ | avant le 13/10/2026 | — | |
| 1 | Socle technique, composants | ✅ | avant le 13/10/2026 | build, lint | |
| 2 | Données et sécurité | ✅ | avant le 13/10/2026 | règles | |
| 3 | Logique métier pure | ✅ | avant le 13/10/2026 | unitaires | |
| 4 | Comptes, équipes, seed | ✅ | avant le 13/10/2026 | CON, EQU, INV | |
| 5 | Emails, SMS, notifications | ✅ | avant le 13/10/2026 | MAIL | |
| 6 | Pages publiques, SEO, cookies | ✅ | avant le 13/10/2026 | ACC, DIA-05 | |
| 7 | Recherche | ✅ | avant le 13/10/2026 | pertinence | |
| 8 | Parcours particuliers | ✅ | avant le 13/10/2026 | ESP, DIA | |
| 9 | Annuaire, fiche publique | ✅ | avant le 13/10/2026 | ANN, FIC | |
| 10 | Espace artisan | ✅ | avant le 13/10/2026 | ACQ, ONB, PRO | |
| 10b | Site internet artisan, domaines | 🟡 | 14/10/2026 | SITE-02, 03, 07, 08, 09, 10, 11, 13, DOM-02, 04, 06 ✅ | éditeur (Ajouter, mots liés, Mes sections, médiathèque), publication, rendu public, domaine existant, statistiques faits ; achat OVH, variantes WebP, modèles de site (D47 ⏳) à faire (AVANCEMENT §27) |
| 10c | IA du site | 🟡 | 16/10/2026 | SITE-IA-01 à 10 ✅ (sans clé IA) | opérations, garde-fou, crédits, panneau, création assistée, aperçu gratuit, reprise, Mes modèles, routeur, modération, quotas affichés, surlignage, variantes visuelles faits ; génération réelle à vérifier avec la clé ; D48, D50, D51 ⏳ (AVANCEMENT §28) |
| 10d | Blog | 🟡 | 16/10/2026 | BLOG-01 à 09, 14 ✅ (IA sans clé) | cœur, serveur, écrans, affichage sur le site et IA faits ; BLOG-10 à 13 attendent D70 ; stats détaillées et Search Console reportées ; D67 à D71 ⏳ non codés (AVANCEMENT §29) |
| 10e | Landings par outil | 🟡 | 14/10/2026 | LAND-01 à 07 ✅ | chantiers en ligne ; site et devis derrière flags ; démo et exemples avec 10b (AVANCEMENT §25) |
| 11 | Stripe | 🟡 | | PAY-01 à 05, 08, 10 | nouvelle grille faite (AVANCEMENT §24) ; restent encarts, NAV-01, emails |
| 11b | Devis et factures | 🟡 | 14/10/2026 | DEV-01 à 06 ✅, DEV-07 sans Factur-X (D62 ⏳) | Factur-X (D62 ⏳), lien de paiement (D61 ⏳) ; faits le 17/10 : cachet, logo propre aux devis, IBAN chiffré, signature en ligne, relances J−3/J+1/J+15, expiration, devis depuis « Mes demandes », modèles et bibliothèque, logo de la fiche sur les PDF |
| 12 | Matching, appels d'offres | ✅ | avant le 13/10/2026 | unitaires + e2e | |
| 12b | Demandes partenaires | ✅ | avant le 13/10/2026 | IMP | |
| 13 | Back-office | ✅ | avant le 13/10/2026 | ADM | |
| 13b | Conversion, séquences | ✅ | avant le 13/10/2026 | CONV | |
| 13c | Comportement, IA | ✅ | avant le 13/10/2026 | CMP, IA, RED | |
| 14 | Qualité, mise en production | ✅ | avant le 13/10/2026 | ERR, MISE_EN_PROD | |

## Lot en cours
- Lot : intégration du handoff (blog, domaines, landings) — détail des lots 0 à 14 dans AVANCEMENT.md
- Fait :
- Reste :
- Dernier commit :

## Décisions prises en cours de route
(Toute décision qui modifie un document de docs/ : date, décision, document mis à jour.)
- 17/10/2026 — faits : 6 modèles de site (D47), option Blog 9,90 € +20 articles (D71, 5 + 20). D71 option Blog 9,90 € ; D61 pas en v1 ; D47 6 modèles à coder ; D70 toujours validé ; D68 DataForSEO ; D62 Factur-X + plateforme agréée dès maintenant (plateforme à choisir) ; autres ⏳ validées en bloc (D29 remplacé par D59). Documents : DECISIONS.md, A_FOURNIR.md.
