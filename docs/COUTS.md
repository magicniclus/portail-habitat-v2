# Coûts d'infrastructure : estimation et règles d'économie

Hypothèse de départ : **30 000 pages vues par mois** sur les pages publiques, **1 200 artisans** inscrits, **10 000 emails** commerciaux par mois. Prix publics de septembre 2026, à revérifier au lancement.

## Estimation mensuelle

| Poste | Volume | Coût estimé |
|---|---|---|
| Comportement : écritures Firestore | 30 000 résumés de visite + agrégats | < 0,10 € |
| Comportement : lectures (agrégation de nuit + admin) | ~35 000 | < 0,05 € |
| Comportement : replays (Cloud Storage) | ~1 500 fichiers gzip, 30 Mo | < 0,01 € |
| Moteur de conversion (Functions + Firestore) | calcul quotidien de 1 200 fiches, ~70 000 traces | < 0,50 € |
| Assistant IA | ~40 analyses Haiku + 4 synthèses Sonnet, avec cache | 1 à 3 € (plafond 10 €) |
| Assistant de rédaction (artisans) | ~3 000 utilisations Haiku (≈ 1 500 tokens chacune) | 2 à 4 € |
| Blog des artisans (si 300 abonnés × 8 articles) | 2 400 articles Sonnet + retouches Haiku | 120 à 240 € (≈ 0,05 à 0,10 € / article) |
| Données mots-clés et SERP (API, cache 30 j / 14 j) | ~3 000 requêtes | 30 à 60 € |
| Pages de secteur (SEO local) : texte IA une fois par page (recherche web 5 recherches au plus + rédaction Sonnet 5.5) | selon les pages créées | ≈ 5 à 15 centimes par page, **plafond 20 € par mois** (`BUDGET_SECTEUR_CENTIMES`), ré-écrit au plus une fois par an |
| Studio vidéo (STUDIO.md §9, si 30 vidéos par jour) | Claude Opus 5.5 + robot Cloud Run | 300 à 570 € (≈ 0,35 à 0,65 € / vidéo) |
| Cloud Functions / Scheduler | quelques milliers d'invocations | dans le quota gratuit |
| Plans (Dessin, lot 15) : Firestore, Storage, route `/api/dessin`, une Function de nuit | selon l'usage (pas encore en production) | **pas encore chiffré** ; aucun service payant appelé (voir § Plans) |
| **Total comportement + conversion + IA** | | **moins de 10 € par mois** |
| Emails (Resend, hors périmètre ci-dessus) | 10 000 à 50 000 emails | 0 à 20 € selon l'offre |

À 300 000 pages vues par mois, le total reste de l'ordre de **10 à 15 €**. Au-delà, voir le seuil de bascule BigQuery (COMPORTEMENT.md §3).

## Règles qui garantissent ces coûts (à respecter dans le code)
1. **Un envoi par page vue** : le traceur agrège dans le navigateur, jamais de flux d'événements (COMPORTEMENT.md §2).
2. **Échantillonnage** : trajets du curseur sur 10 % des sessions ordinateur ; replays sur 5 % + sessions à problème, plafond 300 par jour.
3. **TTL partout** : résumés de visite 35 j, replays 30 j (cycle de vie Storage), traces de conversion 6 mois, emails 13 mois.
4. **L'admin lit des agrégats pré-calculés** : un document par écran, pas de calcul à l'affichage, pas d'écoute temps réel sauf sur le journal de conversion (limité aux 50 dernières traces).
5. **Écrire seulement ce qui change** : `cycleCalculer` compare avant d'écrire ; les triggers ignorent les modifications sans effet.
6. **IA** : Haiku par défaut, Sonnet à la demande ; contexte compact pré-calculé la nuit ; prompt caching ; réponses mises en cache 24 h ; quota de 30 analyses par jour par membre ; budget mensuel plafonné.
7. **Pages de secteur** : le déclencheur ignore les changements de fiche sans effet (note, pitch) ; le recomptage relit l'annuaire une fois par commune (cache) ; l'IA n'écrit qu'une fois par page indexable, verrou de 10 minutes, 3 essais au plus, plafond mensuel.
8. **Pas de minimum d'instances** sur les Functions (`minInstances: 0`), sauf le webhook Stripe si la latence l'exige.

## Plans (Dessin, lot 15) : règles appliquées dans le code
Plans est gratuit pour tous (D84). Ces règles tiennent son coût près de zéro :
1. **Aucun rendu serveur** (D85) : 3D, visite et photo HD sont calculées dans le navigateur.
2. **Aucun service payant** : implantation par les services publics et gratuits de l'IGN (géocodage Géoplateforme, API Carto cadastre, WMS), appelés par le serveur. La photo aérienne est **téléchargée une seule fois** par plan et rangée dans son dossier (l'ancienne est remplacée).
3. **Aucune vignette image** : l'aperçu de « Mes plans » est un chemin SVG (`apercu`) calculé par le serveur à l'enregistrement.
4. **Taille bornée** : scène compressée (gzip) 5 Mo au plus ; plan importé et photos 3 Mo au plus ; 30 photos par plan ; un seul plan importé et une seule photo aérienne par plan.
5. **Quota** : 5 plans actifs par particulier ; artisans illimités.
6. **Versions** : une version automatique au plus toutes les 10 minutes ; au-delà des 50 plus récentes, celles de plus de 30 jours sont supprimées à l'enregistrement suivant.
7. **Purge de nuit** (`purgeDessinNuit`, 200 plans par passage) : plans à la corbeille depuis 30 jours, avec leurs fichiers et leurs liens ; plans d'une entreprise fermée, 30 jours après (D92).
8. **Limites de débit** par heure : 600 opérations, dont PDF 30, parcelle 20, adresses 120, fichiers 30.
9. **Fichiers 3D légers, chargés à la demande** : 17 meubles `glb` (Meshopt, textures WebP 512 px, 2,4 Mo au total) et 11 textures (544 Ko) servis comme fichiers statiques de l'application (`apps/web/public/dessin/`), pas depuis Storage ; un meuble n'est téléchargé que s'il est vu en 3D.
10. **Pas encore fait** : passer la landing `/dessin` en `revalidate = 3600` à l'ouverture (elle est rendue à chaque visite tant que le flag est éteint) ; purger les liens de partage expirés (ils ne sont supprimés qu'avec leur plan) ; en-tête de cache long propre aux fichiers `/dessin/` (aucun n'est configuré dans `next.config.ts`, à vérifier sur l'hébergeur).

## Surveillance
- **Alerte budget Google Cloud** à 20 € par mois (80 % et 100 %), envoyée aux superadmins
- Carte « Coûts du mois » dans Admin › Tableau de bord › Santé technique : Firestore, Storage, Functions, IA (lu depuis l'export de facturation et `iaAnalyses`)
- Revue mensuelle : si un poste double d'un mois sur l'autre, alerte dans la file de travail
