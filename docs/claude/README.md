# Configuration Claude Code

À copier à la racine du dépôt sous le nom **`.claude/`** (avec le point).

| Fichier | Rôle |
|---|---|
| `settings.json` | Autorise les commandes sans risque (pnpm, git local, émulateurs), demande confirmation pour push et déploiements, **interdit** la production, les suppressions massives et la lecture des secrets. Hooks : typecheck + lint après chaque modification, tests des fichiers modifiés en fin de réponse |
| `commands/` | Commandes à taper dans Claude Code : `/nouveau-lot 4`, `/fin-lot`, `/relecture`, `/nouveau-composant …`, `/bug …`, `/maquette …`, `/duplication`, `/reprise`, `/decision …` |
| `agents/` | Sous-agents spécialisés : `relecteur-securite`, `relecteur-maquette`, `testeur` |

Routine type d'un lot : `/nouveau-lot N` → validation du plan → développement → `/fin-lot` → relecture de la PR par vous → fusion → `/clear`.
