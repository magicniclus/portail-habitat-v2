# Landings d'acquisition par outil

Maquettes : `designs/Landing Outil.dc.html` (gabarit unique, prop `outil` = `chantiers` · `site` · `devis`), pages `Landing Trouver des chantiers`, `Landing Site internet artisan`, `Landing Logiciel devis factures`. Base visuelle : `Acquisition Artisans v2` (même hero, même formulaire 4 champs `Formulaire Espace.dc.html`).

## 1. Routes et source
| Route | outil | source (URL du formulaire, enregistrée sur le compte) |
|---|---|---|
| `/pro/trouver-des-chantiers` | chantiers | `trouver-chantier` |
| `/pro/site-internet-artisan` | site | `site-internet-artisan` |
| `/pro/logiciel-devis-factures` | devis | `logiciel-devis-facture` |
- Le formulaire envoie `?source=` vers `/pro/inscription/zone` ; la valeur est écrite dans `artisans/{id}.acquisition {source, utm_*, landingAt}` à la création du compte et ne change plus.
- L'onboarding lit `source` pour choisir la première action (§4).

## 2. Ce qui change d'une page à l'autre
Seuls varient : surtitre, H1, sous-titre (gras via `**…**`), bénéfices + captures réelles, étapes, vitrine, FAQ, titre du CTA. Contenu dans la constante `CONTENU` du gabarit — à migrer dans le CMS.

## 3. Sections (ordre)
1. Bandeau « 100 % gratuit · Sans carte bancaire » · header
2. Hero : surtitre, H1, sous-titre, points (site : 4 points), formulaire 4 champs (CTA site : « Créer mon espace et mon site »)
3. Site uniquement : démo `SiteGenerationDemo` (6 étapes animées, remplaçable par vidéo via props `demoVideo` / `demoPoster`, WebM + MP4)
4. Trois étapes « scrollytelling » : panneau `position:sticky` ; **GSAP 3.12 + ScrollTrigger** : un trigger sur la zone, `snap` directionnel (un geste = une étape, jamais deux), durée 0,35–0,7 s `power3.inOut`, sortie libre après la 3e / avant la 1re. `html { scroll-behavior: auto }` obligatoire (le smooth CSS casse le snap GSAP). Titres de section : apparition `y:28 → 0` une fois, désactivée si `prefers-reduced-motion`. En production : `npm i gsap`, `useGSAP` + `gsap.context` pour le nettoyage.
5. Comment ça marche (3 étapes) · vitrine (site publié ordinateur + téléphone)
6. Site uniquement : « Un vrai site », exemples par métier (emplacements à remplacer par de vrais sites), section demandes
7. Outils inclus (cartes → formulaire, jamais vers une autre landing)
8. Preuve sociale : masquée tant que `nbInscrits` / `nbSites` / `note` / `temoignages` ne sont pas renseignés
9. FAQ (site : 10 questions dont gratuité, Site Pro optionnel, domaine à l'artisan, sans commission)
10. Bandeau d'avis défilants : 2 lignes × 20 cartes, sens opposés, bords flous, pause au survol, `prefers-reduced-motion` = arrêt
11. Bloc final Portail Habitat (6 tuiles : demandes, visibilité portail, site, avis, devis/factures, suivi clients) · footer
- Mobile ≤ 768 px : barre fixe « Créer mon site gratuitement » / « Créer mon espace gratuit », masquée si un formulaire est visible.

## 4. Onboarding selon la source
- chantiers : zone + compteur de demandes réelles → carte des demandes proches → « Voir les demandes près de chez moi »
- site : « Créer mon site avec l'IA » → aperçu → « Publier »
- devis : « Créer mon premier devis » depuis un modèle pré-rempli du métier
- Aucune offre payante avant la première action réussie ; ensuite fenêtre d'offre → `/pro/abonnement?offre=`.

## 5. Analytics (dataLayer, paramètre `landing`)
`landing_site_view`, `hero_form_started`, `hero_form_submitted`, `demo_played`, `pricing_section_viewed`, `site_example_clicked`, `faq_opened`, `sticky_cta_clicked`, `final_cta_clicked`.

## 6. Performances et accessibilité
Captures produit chargées à l'approche (lazy), dimensions fixées (pas de CLS), images WebP/AVIF, vidéo compressée avec poster. Labels de formulaire, focus visible, cibles ≥ 44 px, étoiles avec `aria-label`.

## 7. À valider avant mise en ligne (bloquant)
- **Avis du bandeau défilant : fictifs** → remplacer par de vrais avis (nom, métier, ville, photo, accord écrit) ou retirer. Faux avis = pratique commerciale trompeuse.
- « Premier réseau d'artisans de France » et « Plus de 300 demandes de travaux chaque jour sur le réseau » : preuve chiffrée datée requise, sinon retirer.
- « En ligne en 5 minutes », « 3 questions » : conformes au parcours réel de création.
- « Plusieurs centaines d'euros » (prix agence) : estimation à sourcer ou reformuler.
- Facture électronique : toujours « en cours de mise en conformité ».

## 8. Critères d'acceptation
- **LAND-01** chaque landing transmet sa `source` et elle est visible sur le compte créé
- **LAND-02** une seule action primaire orange par écran ; aucun prix dans le hero
- **LAND-03** étapes : un geste de défilement = une étape, sortie libre après la 3e (et avant la 1re en remontant), aucun saut ni blocage, OK souris, pavé tactile, doigt, clavier
- **LAND-04** preuve sociale absente si aucune donnée réelle
- **LAND-05** barre mobile absente quand un formulaire est visible ; tous les CTA mènent au formulaire
- **LAND-06** les 9 événements analytics remontent avec `landing`
- **LAND-07** aucun avis fictif ni chiffre non sourcé en production
