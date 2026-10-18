# Prompt : intégrer le dossier de handoff dans le dépôt

À coller tel quel dans Claude Code, ouvert à la racine du dépôt, après avoir déposé le dossier `design_handoff_portail_travaux/` à la racine.

---

Un dossier `design_handoff_portail_travaux/` vient d'être déposé à la racine du dépôt. C'est la nouvelle version de la documentation et des maquettes. Fais l'intégration toi-même, dans cet ordre, sans rien supprimer du code applicatif :

### 1. Remplacer la documentation
- Crée une branche `docs/handoff-maj`.
- Remplace le contenu de `docs/` par celui de `design_handoff_portail_travaux/` (tous les `.md`, `data/`, `designs/`). Conserve dans `docs/` tout fichier qui n'existe pas dans le nouveau dossier, et liste-les-moi.
- Le fichier `design_handoff_portail_travaux/CLAUDE.md` remplace le `CLAUDE.md` racine du dépôt. Si l'ancien contient des règles absentes du nouveau, garde-les en fin de fichier sous « Règles locales » et montre-moi lesquelles.
- Le dossier `design_handoff_portail_travaux/claude/` va dans `.claude/` (agents, commands, settings.json) : fusionne `settings.json` sans écraser mes permissions existantes.
- Supprime ensuite `design_handoff_portail_travaux/` de la racine. Commit : `docs: mise à jour du handoff (blog, domaines, landings)`.

### 2. Maquettes
- `docs/designs/*.dc.html` sont des maquettes de référence : ne les importe pas dans l'app, ne les sers pas en production. Elles s'ouvrent dans un navigateur (`npx serve docs/designs`) pour comparer le rendu.
- Le dossier `docs/designs/_ds/` contient les tokens CSS : vérifie que `src/styles/tokens.css` (ou l'équivalent du dépôt) a exactement les mêmes variables `--color-*`, `--shadow-*`, rayons et polices ; corrige les écarts.

### 3. Images
Il n'y a **aucune image finale** dans le handoff. Trois cas :
- **Captures d'écran du produit** (landings, bénéfices, vitrine, démo) : ce sont des écrans réels de l'app. Ne les dessine pas et ne les commite pas à la main. Crée `scripts/captures.ts` (Playwright) qui ouvre chaque écran de l'app en local avec le compte de démo du seed, capture en 1280×800 (ordinateur) et 390×844 (téléphone), et écrit `public/landing/captures/{ecran}-{desktop|mobile}.webp` (qualité 82) + `.avif`. Liste des écrans : celle des objets `cap`, `vitrine.grand`, `vitrine.tel` et `benefices[*][4]` dans `docs/designs/Landing Outil.dc.html` (champ `src` = écran, `x/y/w/h` = zone à recadrer, `clics` = onglets à cliquer avant la capture). Ajoute `npm run captures`.
- **Photos** (hero, exemples de sites par métier, témoignages) : ce sont des emplacements vides à remplir par nous. Crée `public/landing/photos/` avec un `README.md` listant les fichiers attendus, leur taille et leur ratio (`hero-chantiers.webp`, `hero-site.webp`, `hero-devis.webp` 1600×1200 ; `exemple-{plombier|couvreur|electricien|peintre|macon|menuisier}-desktop.webp` 1280×800 et `-mobile.webp` 390×844). Tant qu'un fichier manque, affiche un fond `--color-neutral-100` avec la légende, jamais une image de banque.
- **Avatars des avis** : initiales sur pastille de couleur (déjà dans la maquette). Remplacés par la photo réelle quand `config/preuveSociale.temoignages[].photo` est rempli.
- Toutes les images : `next/image`, `sizes` renseigné, `loading="lazy"` sous la ligne de flottaison, `width/height` fixes (pas de CLS).

### 4. Vérifier puis planifier
- Lis `CLAUDE.md`, `PLAN_DEV.md`, `DECISIONS.md` (⏳ D67 à D72 = ne pas coder sans validation).
- Compare le code existant avec `LANDINGS.md`, `DOMAINES.md`, `BLOG.md`, `DATABASE.md`, `EMAILS.md`, `PAIEMENTS.md` (PAY-10), `IA_SITE.md`, `README.md` (nouvelles routes).
- Donne-moi la **liste des écarts par lot** (10b, 10d, 10e, 11 surtout), avec pour chacun : fichiers à créer/modifier, critères d'acceptation concernés. **Attends ma validation avant de coder.**

### 5. Ensuite (après validation)
Ordre : DATABASE (schémas Zod + règles + index) → 10d Blog → Domaines (10b/11) → 10e Landings (GSAP : `npm i gsap @gsap/react`, `useGSAP`) → emails. Un commit par lot, critères du lot en tests. Avis fictifs, « premier réseau » et « 300+ demandes/jour » derrière `config.marketing.preuves` désactivé par défaut.

---
