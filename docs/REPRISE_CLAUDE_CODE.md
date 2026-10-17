# Reprise du développement avec les ajouts récents

Message à coller dans Claude Code (à la racine du dépôt, après avoir remplacé le dossier `docs/` par ce dossier `design_handoff_portail_habitat/`) :

---

Le dossier de handoff a été mis à jour. Ne repars pas de zéro : le code existant des lots 0 à 14 reste la base.

1. Relis `CLAUDE.md`, puis `PLAN_DEV.md` (tableau des lots), puis `DECISIONS.md` (décisions ⏳ = ne pas coder sans validation : D67 à D72).
2. Compare le code existant avec ces documents nouveaux ou modifiés, et fais-moi d'abord la liste des écarts, lot par lot, avant de coder :
   - `LANDINGS.md` (nouveau, lot 10e) : 3 landings par outil sur un gabarit unique, `source` enregistrée sur le compte, onboarding selon la source, étapes au scroll avec GSAP ScrollTrigger, bandeau d'avis défilants, 9 événements analytics, critères LAND-01 à LAND-07
   - `DOMAINES.md` (nouveau, lots 10b et 11) : sous-domaine, achat OVH au nom de l'artisan, connexion d'un domaine existant, tableau DNS, vérification planifiée, HTTPS Vercel, statuts, critères DOM-01 à DOM-08. Les valeurs DNS sont lues depuis l'API Vercel, jamais en dur.
   - `BLOG.md` (lot 10d) : mode autonome en un clic, pilote automatique, plus de filtres par statut, fenêtre d'offre, critères BLOG-01 à BLOG-14
   - `DATABASE.md` : `articles.origine / finAuto / validation / postsReseaux`, `sites.blogPilote`, `serpCache`, `artisans.acquisition`, `config/preuveSociale`, `sites.domaine` (DOMAINES §5)
   - `EMAILS.md` : `blog-a-valider`, `blog-publie`, `blog-quota-atteint`, emails `site-domaine-*`
   - `PAIEMENTS.md` : PAY-10 (toute fonction payante cliquée ouvre la fenêtre d'offre → `/pro/abonnement?offre=`)
   - `IA_SITE.md`, `COUTS.md` : Function `iaBlogAuto` et son coût
   - `README.md` : nouvelles routes (`/pro/trouver-des-chantiers`, `/pro/site-internet-artisan`, `/pro/logiciel-devis-factures`, `/pro/site/blog/*`)
3. Les maquettes à jour sont dans `designs/` (`Landing Outil`, `Formulaire Espace`, `SiteGenerationDemo`, `Capture Ecran`, `Site Internet Artisan`, `Editeur de Site`, `Editeur de Blog`, `Fenetre Offre`, `Mon Abonnement`). Reprends leur rendu exact (tokens orange, Source Sans 3, rayons 6/8/12, icônes au trait 1,7).
4. Ordre de travail : DATABASE (schémas + règles) → 10d Blog → 10b/11 Domaines → 10e Landings → emails. Un commit par lot, avec les critères d'acceptation du lot passés en test.
5. Bloquants avant production (LANDINGS §7) : pas d'avis fictifs, pas de « premier réseau » ni de « 300+ demandes/jour » sans source. Mets-les derrière une variable de config désactivée par défaut.

Commence par l'étape 2 (liste des écarts) et attends ma validation.

---

## Rappel : lots du plan
0 cadrage · 1 socle · 2 données · 3 logique métier · 4 comptes · 5 emails · 6 pages publiques · 7 recherche · 8 particuliers · 9 annuaire · 10 espace artisan · **10b site · 10c IA site · 10d blog · 10e landings** · 11 paiements · 11b devis/factures · 12 matching · 12b import · 13 back-office · 13b conversion · 13c comportement/IA · 14 mise en production.
