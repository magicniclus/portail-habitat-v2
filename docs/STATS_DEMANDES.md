# Nombre de demandes affiché aux artisans

Deux chiffres sont montrés aux artisans avant l'inscription. Ils doivent être **crédibles, cohérents d'une page à l'autre et honnêtes** sur leur source.

1. **Formulaire de la page d'acquisition** (`/pro` et les landings, `FormulaireInscription`) : « ≈ N demandes estimées » pour le métier principal choisi, à 30 km autour du code postal (`useDemandesEstimees`, route `/api/stats/demandes`). Modèle du §2.
2. **Étapes 2 et 3 de l'inscription** : plus d'estimation mensuelle depuis le 15/11/2026, mais une phrase sur les dernières 48 h : « Au moins N demandes de travaux déposées ces dernières 48 h autour de {ville}, dans un rayon de {rayon} km. », suivie de « Certaines ont peut-être déjà été confiées à un artisan : vous verrez dans votre espace celles qui sont encore ouvertes. » (`phraseDemandesRecentes`, `packages/core/src/onboarding`).
   - 15/11/2026 : N était fixé à 3 (engagement du propriétaire, `DEMANDES_RECENTES_MIN`).
   - **17/11/2026 (demande du propriétaire)** : N suit le rayon (`demandesRecentes`) = demandes du mois **des métiers de l'artisan** à 30 km (modèle du §2 ; tous métiers donnait des nombres trop gros) × couverture du rayon (interpolée entre les points du modèle) ÷ couverture à 30 km × 2/30 (ramené à 48 h) × 0,9 (10 % de marge : la phrase dit « au moins »), arrondi à l'unité inférieure, **jamais sous 3**. Recalculé si la ville change de département.

**À signaler** : la phrase dit « déposées » alors que le nombre vient aujourd'hui du **modèle** (aucun décompte réel n'existe encore, §1). C'est le choix du propriétaire (phrase « au moins », marge de 10 %), mais le principe du §1 (« jamais présenté comme un décompte réel ») n'est pas respecté à la lettre. À confirmer.

Maquette de référence : `designs/estimation-demandes.js` (`PH_DEMANDES.estimer`).

## 1. Deux sources, par ordre de priorité
1. **Réel** : nombre de demandes (mises en relation + appels d'offres) des **30 derniers jours** pour le(s) métier(s) et la zone, dès qu'il existe **au moins 3 mois d'historique** dans le département. Libellé : « demandes déposées ». **Pas encore fait** : les compteurs `statsZones` n'existent pas ; seul le modèle est utilisé.
2. **Modèle** (tant que l'historique est insuffisant) : libellé « demandes estimées ». Jamais présenté comme un décompte réel.

## 2. Modèle
```
demandes/mois = population du département
              × couverture(rayon)          30 km : 0,45 · 50 km : 0,8 · 100 km : 1,6   (petite couronne : 1,1 / 2,2)
              × taux par habitant et par an / 12   (0,012 par défaut)
              × saisonnalité du mois       jan 0,85 … avr 1,18 … août 0,72 … oct 1,12
              × part du métier
```
- **Part du métier** = part de sa famille de travaux (plomberie 13 %, chauffage 12 %, électricité 11 %…) × poids du métier dans sa famille, calculé à partir de la **popularité de ses intentions** dans le référentiel (`referentiel/recherche`). Même référentiel que la recherche et l'inscription : les chiffres restent cohérents
- Plusieurs métiers : somme des parts (5 métiers au plus). Depuis le 25/10/2026, le premier formulaire ne demande que le **métier principal** : la page d'acquisition calcule pour ce seul métier
- Arrondi à l'unité, **minimum 3** par métier (évite un « 0 » décourageant sur un petit métier)
- Mois en cours à l'heure de Paris
- Exemples (septembre, 30 km) : tous métiers à Bordeaux ≈ 800, plombier ≈ 100, couvreur ≈ 28 ; plombier en Lozère ≈ 5

## 3. Paramètres
**Fait** : paramètres et population par département dans le fichier versionné `docs/data/stats-demandes.json` (`modele` : taux, couverture, familles, saison, minimum ; `population`), lus par `apps/web/server/statsDemandes.ts`.
**Pas encore fait** : le document `stats/modeleDemandes` (Admin SDK), l'écran admin Finances → Prévisions et le **calage mensuel** (tâche planifiée qui compare le modèle au réel des départements avec historique et propose un nouveau `tauxHabitantAn`, validation manuelle, audit). Changer un paramètre = modifier le fichier.

## 4. Implémentation
- `packages/core/src/stats/estimerDemandes.ts` (fonction pure, testée) ; `demandesRecentes` et `phraseDemandesRecentes` dans `packages/core/src/onboarding`
- Route `/api/stats/demandes?cp=&metiers=&rayon=` : renvoie `{ total, parMetier, source: 'reel' | 'modele' }`, cache 6 h, aucune donnée personnelle (aujourd'hui toujours `modele`)
- Le **réel** sera lu dans `statsZones/{departement}_{metier}_{AAAAMM}` (compteurs incrémentés par le trigger de création de demande) — **pas encore fait**
- L'estimation sert aussi à l'email `prospect-estimation` (CONVERSION S1)

## 5. Tests
- Même entrée → même résultat ; somme des parts de famille = 1 ; minimum respecté
- Bascule vers le réel dès 3 mois d'historique, avec le libellé « déposées » (à écrire avec le réel)
- Étapes 2 et 3 : la phrase suit le rayon, jamais sous 3 (e2e de l'inscription)
