# Suivi des lots

Résumé tenu à jour par Claude Code à la fin de chaque lot, puis commité. Le suivi détaillé (ce qui est fait, choix signalés, restes) est dans `AVANCEMENT.md` (§1 à §31 et journal). En cas d'interruption, c'est ici qu'on regarde où on en est (prompt « Reprise » de PROMPT_CLAUDE_CODE.md, commande `/reprise`).

Statuts : ⬜ à faire · 🟡 en cours · ✅ terminé (critères d'ACCEPTANCE verts) · ⏸ bloqué (raison dans Notes)

**Rien n'est en production.** Aucune mise en ligne sans le « go » explicite du propriétaire et les 🔒 de DECISIONS.md (D13, D18, D20, D22).

| Lot | Contenu | Statut | Date | Tests | Notes |
|---|---|---|---|---|---|
| 0 | Cadrage | ✅ | 27/09/2026 | — | AVANCEMENT §2 à §5 |
| 1a, 1b | Socle technique, design system, composants | ✅ | 27/09/2026 | build, lint, Knip, Storybook, e2e (ERR-01/02, MOB-01 à 03) | AVANCEMENT §6, §7 |
| 2 | Données et sécurité | ✅ | 27/09/2026 | règles Firestore et Storage sur émulateur | AVANCEMENT §8 |
| 3 | Logique métier pure | ✅ | 27/09/2026 | unitaires (couverture ≥ 95 %), pertinence de recherche | AVANCEMENT §9 |
| 4 | Comptes, équipes, seed | ✅ | 27/09/2026 | CON, EQU, INV (émulateur) | AVANCEMENT §10 |
| 5 | Emails, SMS, notifications | ✅ | 28/09/2026 | tests emails et Functions | MAIL-01 à 03 sans parcours Playwright (AVANCEMENT §11) |
| 6 | Pages publiques, SEO, cookies | ✅ | 28/09/2026 | ACC, DIA-05 | textes légaux à fournir (D18, D20, D22) |
| 7 | Recherche | ✅ | 28/09/2026 | RCH-01 à 08, pertinence | Typesense prêt, clés à fournir |
| 8 | Parcours particuliers | ✅ | 28/09/2026 | SIM, DIA, AVI, ESP | AVANCEMENT §14 |
| 9 | Annuaire, fiche publique | ✅ | 28/09/2026 | ANN, FIC | AVANCEMENT §15 ; repris en profondeur du 01/11 au 02/11 (journal) |
| 10 | Espace artisan, équipes, PWA | ✅ | 29/09/2026 | ACQ, ONB, CON, PRO, EQU, INV, MOB-06 | inscription refaite le 16/11 et le 17/11 (décisions du propriétaire des 15/11 et 17/11, ACQ-05 à 08, ONB-01c, 01d, 06, 06b, 08) |
| 10b | Site internet artisan, domaines | 🟡 | en cours depuis le 14/10/2026 | SITE-02, 03, 07 à 13, DOM-02 à 04 (e2e) ; DOM-01, 05 à 08 (émulateur) | fait : éditeur V2, 6 modèles (D47, revus le 17/11), publication, rendu public, domaine existant, achat de domaine codé (OVH compte ordinaire, Gandi en secours, D42), statistiques sans cookie, médiathèque, illustrations. Reste : clés OVH réelles, Search Console, variantes WebP de la médiathèque, SITE-04 (Lighthouse), D45 Cloudflare/Vercel à trancher (AVANCEMENT §27, journal 28/10 à 17/11) |
| 10c | IA du site | 🟡 | codé le 16/10/2026 | SITE-IA-01, 02, 07, 09 (e2e) ; 03 à 06, 08, 10 (émulateur) | tout IA_SITE codé ; D48, D50, D51 validées le 17/10. Reste : essai réel avec `ANTHROPIC_API_KEY` (SITE-01 < 90 s), palette tirée du logo (AVANCEMENT §28) |
| 10d | Blog | 🟡 | codé le 17/10/2026 | BLOG-01, 03, 04, 05, 08, 13 (e2e) ; 02, 06, 07, 09 à 12, 14 (unitaires ou émulateur) | mode autonome et pilote automatique faits (D70), option Blog faite (D71). Reste : rédaction réelle (clé IA), DataForSEO (D68, compte à créer), statistiques détaillées de lecture, Search Console, abonnés (AVANCEMENT §29, §30) |
| 10e | Landings par outil | ✅ | 14/10/2026, ouvertes le 12/11/2026 | LAND-01 à 11 (e2e) | les 3 landings en ligne (flags `landingSite`, `landingDevis` vrais) ; preuves marketing derrière `preuvesMarketing` (D72 ⏳) ; photos du hero à fournir (AVANCEMENT §25) |
| 11 | Paiements (formules 2026) | 🟡 | refait le 14/10/2026 | PAY-01, 02, 05, 10 (e2e) ; PAY-03, 04, 08 (émulateur) | fait : 4 formules, droits par webhook, fenêtre d'offre, NAV-01, encarts, option Blog. Reste : encart « au-delà du top 5 du secteur », plafond de 5 projets en gratuit (règle à confirmer), migration `001-formules-droits` en production avec préavis (D60) (AVANCEMENT §24) |
| 11b | Devis et factures | 🟡 | 14/10/2026, repris jusqu'au 09/11/2026 | DEV-01 à 07 (e2e, DEV-07 sans Factur-X) | fait : feuille A4, base clients, brouillons de facture, devis → facture, signature en ligne, relances, cachet, logo, IBAN chiffré. Reste : Factur-X et plateforme agréée (D62 ⏳) ; paiement en ligne écarté en v1 (D61) (AVANCEMENT §26) |
| 12 | Matching, appels d'offres | ✅ | 02/10/2026 | PRO-04 à 06, unitaires | avance Tout inclus 12 h (D57, remplace D83) |
| 12b | Demandes partenaires | ✅ | 02/10/2026 | IMP-02, IMP-06 (e2e) ; IMP-01, 03 à 05 (émulateur) | |
| 13 | Back-office | ✅ | 09/10/2026 | ADM-01 à 05 | reste : variantes B des pages (contenu à choisir) |
| 13b | Conversion, séquences | ✅ | 07/10/2026 | CONV-05, 06, 08 (e2e) ; CONV-01, 02, 07 (émulateur) | D32d ⏳ (validation juridique de `offres_pro`) |
| 13c | Comportement, IA | ✅ | 09/10/2026 | CMP-01 à 03 (e2e), CMP-04 et IA (émulateur, faux modèle) | RED-01 à 04 sans test Playwright |
| 14 | Qualité, préparation de la mise en production | 🟡 | 09/10/2026 | ALL-02, 03, 06, en-têtes de sécurité, tâches planifiées | rien déployé ; reste : ALL-01 (captures comparées), sauvegardes à activer, mise en ligne (AVANCEMENT §23) |
| Studio | Studio vidéo de l'admin (`/admin/studio`) | 🟡 | 05/11 au 09/11/2026 | STUDIO-EDIT, -SUIVI, -CAPTURES, -LIBRE, -SESSION… (e2e), studio sur émulateur | hors plan initial, demandé par le propriétaire (DECISIONS §6 bis). Reste : déployer le robot sur Cloud Run (par le propriétaire), clés YouTube, Meta, TikTok, ElevenLabs, `STUDIO_RENDU_CLE`, `STUDIO_CHIFFREMENT_CLE` ; Whisper à vérifier dans l'image |
| 15 | Plans (Dessin) | 🟡 | 18/11 au 19/11/2026 | DES-01 à DES-48 (sauf DES-45, retiré) en e2e, iPhone 13 et ordinateur | 15a à 15j faits ; 15k recette en cours ; landing SEO `/plan-maison-gratuit` + 17 guides (23/11) ; aucune mise en production ; flags `dessin` et `dessinPublic` éteints par défaut (AVANCEMENT §31) |

## Lot en cours
- **Lot** : 15k, recette du lot 15 « Plans » (éditeur de plans 2D / 3D), fusionné dans la branche de développement le 19/11/2026 (commit `a5524a8d`).
- **Fait** (19/11/2026) : sécurité et RGPD de l'API des plans (jetons de partage en empreinte et datés, plan joint lu sans jeton, idempotence, purge, D92, D93) ; bugs de l'éditeur (réglages et découpe des murs, type de pièce, saisie au clavier, historique des versions, D94) ; fonctions manquantes (DES-01 modèles de départ, DES-02 aperçu et recherche, DES-04 niveaux, DES-12 pièce libre, DES-25 peinture libre et finition, DES-29 sélection multiple et verrous, DES-30 calques, DES-31 cotes libres et textes, DES-32 noir et blanc) ; « Hors ligne » corrigé (DES-39) ; vrais meubles 3D et textures photo CC0 (D88) ; murs transparents ; maison de démonstration sur deux niveaux ; couleurs des menuiseries ; un parcours Playwright par identifiant DES.
- **Reste** : tests sur Pixel (seul l'iPhone 13 est émulé dans la configuration pro) ; papiers peints, stratifié gris, ardoise, carrelage blanc 60 × 60 sans texture libre convenable ; meubles sans modèle libre (cuisine, salle de bains, lits doubles) ; services IGN à vérifier en préproduction ; `/dessin` à passer en `revalidate = 3600` à l'ouverture ; essai par le propriétaire ; clôture du lot (`/fin-lot`).
- **Dernier commit** : `a5524a8d` — Fusion du lot 15 (Plans / Dessin) dans la branche de développement (19/11/2026).

## Décisions prises en cours de route
(Toute décision qui modifie un document de docs/ : date, décision, document mis à jour. Les plus récentes en haut.)
- 19/11/2026 — Documents de pilotage remis à jour après la fusion : tableau des lots, ordre et doublons de DECISIONS (D24, D25, D26b, D26c, D28, D74, D83 marquées remplacées ; écarts D38, D45, D86 signalés), journal d'AVANCEMENT remis à plat. Documents : PROGRESSION, AVANCEMENT, DECISIONS, PLAN_DEV, README, ACCEPTANCE, CLAUDE (docs), prompts.
- 19/11/2026 — Lot 15k (recette Plans) : fonctions manquantes faites (DES-01 modèles, DES-02 aperçu et recherche, DES-04 niveaux, DES-12 pièce libre, DES-29 sélection multiple et verrous, DES-30 calques, DES-31 cotes libres et textes) ; champs ajoutés au modèle : `apercu` (métadonnées du plan), `verrouille?` (objets et scène), `finition?` (revêtements) ; calques électricité et plomberie affichés par défaut ; statut « Hors ligne » corrigé (DES-39) ; D92 à D94 tranchées. Documents : DATABASE §8 quater, DESSIN §3–4, DECISIONS §7, AVANCEMENT §31.
- 18/11/2026 — Lot 15j fait : page publique /dessin et essai sans compte repris après connexion, éditeur au téléphone (feuilles du bas, pincer, appui long), accessibilité (« ? », annonces, animations réduites), budget de performance 500 murs / 1 000 objets mesuré (AVANCEMENT §31).
- 18/11/2026 — Lot 15i fait : exports (PDF à l'échelle, PNG, CSV), lien de partage en lecture seule, « Demander des devis » avec plan joint et réponses écrites (D90) faits ; « Créer un devis depuis ce plan » (DES-45) retiré à la demande du propriétaire (AVANCEMENT §31).
- 18/11/2026 — Lot 15h fait : menuiseries complètes, toiture (L, T, U, H, étage partiel, hauteurs), terrasse, terrain, piscine, implantation sur le cadastre avec photo aérienne IGN (champs `terrain.georef` et `terrain.orthophoto`, sans MapLibre, validé : D87 modifiée), façades et coupes (AVANCEMENT §31). Services IGN à vérifier en préproduction.
- 18/11/2026 — Lot 15g fait : 3D, visite, photo et galerie, placement automatique des meubles, rotation libre sur 3 axes (AVANCEMENT §31).
- 18/11/2026 — Lot 15f fait : meubles et équipements, revêtements et motifs, zones au sol (AVANCEMENT §31).
- 18/11/2026 — Lot 15e fait : portes, fenêtres, escaliers, niveaux, plan importé (AVANCEMENT §31).
- 18/11/2026 — Lot 15d fait : éditeur 2D Dessin derrière le flag `dessin` ; outil renommé « Plans » pour l'utilisateur (AVANCEMENT §31).
- 18/11/2026 — Lots 15b et 15c faits (cœur, données, règles, serveur de Dessin) — AVANCEMENT §31, DATABASE §8 quater.
- 18/11/2026 — Lot 15 Dessin : D84 à D91 tranchées (gratuit, aucun rendu serveur, IGN, CC0 puis catalogue maison, devis par écrit sans appel, pile technique, pas de temps réel, import image/PDF) — DECISIONS, DESSIN, AVANCEMENT §31 (15a fait).
- 17/11/2026 — Conversion des pages d'entrée : formulaire court (métier, code postal, email), phrase des conditions au lieu de la case, nom et téléphone demandés plus tard, test A/B abandonné. Documents : DECISIONS §6 bis, ACCEPTANCE (ACQ-05 à 08, ONB-01c, 01d, 08).
- 15/11/2026 — Parcours d'inscription des artisans (fiche en ligne dès le SIREN reconnu, champ `sirenReconnu`, migration 002, étapes 2 et 3, premier écran). Documents : DECISIONS §6 bis, ACCEPTANCE (ONB-06, 06b, 08).
- 10/11/2026 — Registrar : OVHcloud avec un compte client ordinaire, Gandi en secours (D42). Documents : DECISIONS, DOMAINES.
- 06/11/2026 — Statistiques de la fiche ouvertes à tous les artisans (PRO-07). Documents : DECISIONS §6 bis, ACCEPTANCE.
- 05/11/2026 et 06/11/2026 — Studio vidéo de l'admin, voix de synthèse, réseaux sociaux. Documents : STUDIO.md, DECISIONS §6 bis.
- 25/10/2026 — devis et factures façon « feuille A4 » (captures du propriétaire) : français seulement, Factur-X visible « bientôt » (D62), mention de TVA lue dans Paramètres. Données : lignes `type` (chiffrée/texte) et `nature` (prestation/fourniture), options facultatives, « Nouvelle facture » sans devis. Documents : DATABASE.md §8 bis, DECISIONS.md.
- 17/10/2026 — faits : 6 modèles de site (D47), option Blog 9,90 € +20 articles (D71, 5 + 20). D71 option Blog 9,90 € ; D61 pas en v1 ; D47 6 modèles à coder ; D70 toujours validé ; D68 DataForSEO ; D62 Factur-X + plateforme agréée dès maintenant (plateforme à choisir) ; autres ⏳ validées en bloc (D29 remplacé par D59). Documents : DECISIONS.md, A_FOURNIR.md.
- 13/10/2026 et 14/10/2026 — Handoff intégré (blog, domaines, landings, paiements, site, IA du site, devis) ; décisions du développement D40 à D50 renumérotées D73 à D83 ; lot 11 refait selon PAIEMENTS.md. Documents : DECISIONS §6, AVANCEMENT §24.
