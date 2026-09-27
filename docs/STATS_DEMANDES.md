# Nombre de demandes affiché aux artisans

Chiffre affiché sur la page d'acquisition (« N demandes estimées pour un couvreur à 30 km autour du 33000 ») et à l'étape 2 de l'inscription (carte et rayon). Il doit être **crédible, cohérent d'une page à l'autre et honnête** sur sa source.

Maquette de référence : `designs/estimation-demandes.js` (`PH_DEMANDES.estimer`).

## 1. Deux sources, par ordre de priorité
1. **Réel** : nombre de demandes (mises en relation + appels d'offres) des **30 derniers jours** pour le(s) métier(s) et la zone, dès qu'il existe **au moins 3 mois d'historique** dans le département. Libellé : « demandes déposées »
2. **Modèle** (tant que l'historique est insuffisant) : libellé « demandes estimées ». Jamais présenté comme un décompte réel

## 2. Modèle
```
demandes/mois = population du département
              × couverture(rayon)          30 km : 0,45 · 50 km : 0,8 · 100 km : 1,6   (petite couronne : 1,1 / 2,2)
              × taux par habitant et par an / 12   (0,012 par défaut)
              × saisonnalité du mois       jan 0,85 … avr 1,18 … août 0,72 … oct 1,12
              × part du métier
```
- **Part du métier** = part de sa famille de travaux (plomberie 13 %, chauffage 12 %, électricité 11 %…) × poids du métier dans sa famille, calculé à partir de la **popularité de ses intentions** dans le référentiel (`referentiel/recherche`). Même référentiel que la recherche et l'inscription : les chiffres restent cohérents
- Plusieurs métiers : somme des parts (étape 2 de l'inscription, à partir des métiers choisis dans le premier formulaire)
- Arrondi à l'unité, **minimum 3** par métier (évite un « 0 » décourageant sur un petit métier)
- Exemples (septembre, 30 km) : tous métiers à Bordeaux ≈ 800, plombier ≈ 100, couvreur ≈ 28 ; plombier en Lozère ≈ 5

## 3. Paramètres
Document `stats/modeleDemandes` (Admin SDK, écran admin Finances → Prévisions) : `tauxHabitantAn`, `couverture`, `familles`, `saison`, `minimum`. **Calage mensuel** : une tâche planifiée compare le modèle au réel des départements qui ont un historique et propose un nouveau `tauxHabitantAn` (validation manuelle, audit).

## 4. Implémentation
- `packages/core/src/stats/estimerDemandes.ts` (fonction pure, testée) ; paramètres initiaux et `population` par département (Insee) dans `docs/data/stats-demandes.json`
- Route `/api/stats/demandes?cp=&metiers=&rayon=` : renvoie `{ total, parMetier, source: 'reel' | 'modele' }`, cache 6 h, aucune donnée personnelle
- Le **réel** est lu dans `statsZones/{departement}_{metier}_{AAAAMM}` (compteurs incrémentés par le trigger de création de demande)

## 5. Tests
- Même entrée → même résultat ; somme des parts de famille = 1 ; minimum respecté
- Bascule vers le réel dès 3 mois d'historique, avec le libellé « déposées »
- Cohérence : le chiffre de la page d'acquisition et celui de l'étape 2 sont identiques pour le même code postal, métier et rayon
