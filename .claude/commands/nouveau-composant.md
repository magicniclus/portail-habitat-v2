---
description: Ajouter un composant réutilisable
argument-hint: <description du besoin>
---
Besoin : $ARGUMENTS
1. Cherche dans packages/ui et Storybook un composant existant qui couvre ce besoin avec une nouvelle variante. Si oui, propose la variante (cva) plutôt qu'un nouveau composant.
2. Sinon, choisis le niveau (primitive, pattern, feature : ARCHITECTURE.md §5.1) et justifie-le.
3. Crée : le composant (forwardRef, asChild si pertinent, variantes cva, tokens uniquement), sa story dans les 4 thèmes, son test (rendu + jest-axe).
4. Remplace les éventuelles duplications existantes par ce composant.
