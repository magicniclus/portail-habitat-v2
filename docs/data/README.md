# Données extraites des maquettes

Fichiers générés automatiquement à partir des constantes des maquettes `.dc.html`, pour éviter que Claude Code les recopie à la main.

| Fichier | Source | Utilisation |
|---|---|---|
| `prestations.json` | `Simulateur de Devis` (`PRESTATIONS`) | seed de `referentiel/prestations/items` + cas de test du simulateur |
| `diagnostics.json` | `Parcours Diagnostic` (`DIAGS`, `PERIODES`, `TYPES`, `COMMUNES`, `CONSEILLES`) | seed de `referentiel/diagnostics/items` + cas de test |
| `communes.json` | `Diagnostic Immobilier Rive Droite` (`VILLES`, `ORDRE`) | seed de `communes/{slug}` et `generateStaticParams` |
| `annuaire-demo.json` | `Annuaire Artisans` | artisans fictifs pour le seed, référentiels de filtres (métiers, notes, disponibilités, budgets) |
| `prestations-catalogue.json` | `prestations-catalogue.js` | 103 prestations déclaratives + 15 familles ; seed de `referentiel/prestations/items` (champs) et `referentiel/prestations/prix` (tarifs, serveur uniquement) |
| `recherche-intentions.json` | `recherche-projets.js` | seed de `referentiel/recherche` (intentions, mots-clés, métiers, synonymes) + index Typesense |
| `demandes-demo.json` | `Mes Demandes` | demandes fictives pour le seed et les tests de l'espace pro |

- Les objets `{"$formule": "…"}` sont le **code source d'origine** d'une fonction de la maquette (formule de calcul ou règle). Il sert de référence pour écrire la version TypeScript testée dans `packages/core` ; il ne doit **pas** être exécuté tel quel.
- Les **nombres** (prix unitaires, coefficients, validités) vont dans Firestore (`parametres`), modifiables depuis l'admin.
- En cas d'écart entre ces fichiers et une maquette, la **maquette** fait foi : signalez l'écart.
