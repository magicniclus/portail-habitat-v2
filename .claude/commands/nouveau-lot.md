---
description: Démarrer un lot du plan (ex. /nouveau-lot 4)
argument-hint: <numéro du lot>
---
Lot $ARGUMENTS.
1. Lis CLAUDE.md, docs/AVANCEMENT.md, docs/DECISIONS.md, puis le prompt du lot $ARGUMENTS dans docs/PROMPT_CLAUDE_CODE.md et uniquement les sections de docs qu'il cite.
2. Crée la branche `lot-$ARGUMENTS-<nom-court>`.
3. Liste les critères de docs/ACCEPTANCE.md concernés par ce lot.
4. Propose un plan : fichiers à créer ou modifier, composants réutilisés depuis packages/ui, nouveaux composants (avec leur niveau), schémas, tests, points ⏳ de DECISIONS.md qui te bloquent.
5. Attends ma validation avant d'écrire du code.
