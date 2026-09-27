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
| Cloud Functions / Scheduler | quelques milliers d'invocations | dans le quota gratuit |
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
7. **Pas de minimum d'instances** sur les Functions (`minInstances: 0`), sauf le webhook Stripe si la latence l'exige.

## Surveillance
- **Alerte budget Google Cloud** à 20 € par mois (80 % et 100 %), envoyée aux superadmins
- Carte « Coûts du mois » dans Admin › Tableau de bord › Santé technique : Firestore, Storage, Functions, IA (lu depuis l'export de facturation et `iaAnalyses`)
- Revue mensuelle : si un poste double d'un mois sur l'autre, alerte dans la file de travail
