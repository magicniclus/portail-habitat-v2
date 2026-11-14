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
1. Bandeau « 100 % gratuit · Sans carte bancaire » (orange clair) · header avec « Espace pro » en pastille claire
2. Hero : surtitre, H1, sous-titre, points (site : 4 points ; plus de rangée de pastilles depuis le 14/11/2026, elle répétait la gratuité des outils), formulaire 4 champs (CTA site : « Créer mon espace et mon site ») ; sous le texte, la vidéo de présentation (VSL : générale sur chantiers, film de l’outil sur site et devis) tant que les preuves marketing sont actives (elle cite un chiffre à sourcer)
2 bis. Chiffres du réseau (section à part, sous le hero) : 3 colonnes animées (comptage de 0 à la valeur, une fois, `prefers-reduced-motion` = valeurs directes) — « Plus de 6 000 demandes de travaux par mois », « Plus de 7 000 artisans connectés au réseau », « 100 % des outils accessibles gratuitement » ; affichés **seulement avec les preuves marketing** (`CHIFFRES_RESEAU`, chiffres annoncés par le propriétaire le 11/11/2026, à dater avant la production)
3. Site uniquement : « Regardez votre site se construire tout seul » (`DemoSiteVideos`) : 4 vraies vidéos filmées dans l'éditeur (`public/landing/videos/site/{ia,modifier,en-ligne,clients}.mp4`, sans son, en boucle) : l'IA crée le site, vous modifiez, le site est en ligne, les demandes arrivent. Panneau collant, l'étape et sa vidéo changent au fil du défilement dans les deux sens, étapes cliquables ; sur téléphone, le texte de l'étape au-dessus de la vidéo ; avec `prefers-reduced-motion`, les 4 étapes empilées, vidéos lancées à la demande (LAND-09). Tournage du 14/11/2026 sur les émulateurs : textes du site écrits par Claude à partir de la fiche du jeu de test, rejoués par un faux serveur local (pas de clé API dans l'environnement de tournage)
4. Chantiers et devis seulement (site : déroulé déjà raconté par les 4 vidéos) — Trois étapes « scrollytelling » : panneau `position:sticky` ; **GSAP 3.12 + ScrollTrigger** : un trigger sur la zone, animation liée au défilement (`scrub` 0,35), dans les deux sens, défilement libre sans aimantation ; opacité et transformations seulement, décor fixe, sortie libre après la 3e / avant la 1re. `html { scroll-behavior: auto }` obligatoire (le smooth CSS se bat avec ScrollTrigger). Titres de section : apparition `y:28 → 0` une fois, désactivée si `prefers-reduced-motion`. En production : `npm i gsap`, `useGSAP` + `gsap.context` pour le nettoyage.
5. Vitrine (site publié ordinateur + téléphone) ; site : les atouts « Pas une fiche annuaire. Un vrai site, à votre nom. » sont dans la même section (`AtoutsSite`) · Chantiers : « De votre fiche à vos premiers clients » (`HistoireFiche`, LAND-11) à la place de « Comment ça marche » : panneau collant au défilement, 3 temps sur de vraies captures (fiche complète à 100 %, annuaire puis fiche publique, formulaire rempli par un client) avec encarts animés (fiche complétée, visible près de chez vos clients, nouvelle demande, compteur « 1 / 10 demandes gratuites ce mois » — chiffre confirmé par le propriétaire le 14/11/2026). Devis : Comment ça marche (3 étapes) : en-tête centré, chaque étape avec la vraie capture téléphone de l'écran (`etapes[].ecran` : inscription, appels d'offres, répondre / inscription, devis, envoi ; défilement horizontal sur téléphone)
7. L'app : section « Application mobile » (`features/pro/SectionApplication.tsx`, aussi sur `/pro` et dans l'espace pro) : texte, 3 points, badges App Store et Google Play **« Bientôt sur »** sans lien (pas encore publiée dans les stores, choix du propriétaire le 14/11/2026), « s'installe déjà depuis votre navigateur », et deux vraies captures téléphone (Mes demandes, Devis & factures) avec une notification ; une seule fois par page, à la place de la section des 6 outils gratuits. `OutilsGratuits` reste dans le code, hors landings
8. Preuve sociale : masquée tant que `nbInscrits` / `nbSites` / `note` / `temoignages` ne sont pas renseignés
9. FAQ (site : 11 questions dont gratuité, Site Pro optionnel, domaine à l'artisan, « J'ai déjà un nom de domaine » (intégré avec Site Pro, 3 réglages, vérification automatique), sans commission). Site : sous la vitrine, « Votre site, à votre nom » (plus de mention d'annuaire : il y en a un) et un encadré nom de domaine personnalisé / domaine existant
10. Bandeau d'avis défilants : 2 lignes × 20 cartes, sens opposés, bords flous, pause au survol, `prefers-reduced-motion` = arrêt
11. Bloc final Portail Travaux : tous les outils (6 tuiles : demandes, visibilité portail, site, avis, devis/factures, suivi clients), chacune avec un bouton lecture en haut à droite qui ouvre le film de l'outil dans une fenêtre (`TuilesOutils` + `FenetreVideoOutil`, `outil_video_played`, outil suivant) · footer
- Liens vers une ancre (toutes les pages) : défilement doux en JavaScript (`AncresDouces`, dans le layout racine ; immédiat avec `prefers-reduced-motion` ; attend la fermeture d'une fenêtre), pas de `scroll-behavior: smooth` (conflit ScrollTrigger)
- Mobile ≤ 768 px : barre fixe « Créer mon site gratuitement » / « Créer mon espace gratuit », masquée si un formulaire est visible.

## 4. Onboarding selon la source
- chantiers : zone + compteur de demandes réelles → carte des demandes proches → « Voir les demandes près de chez moi »
- site : « Créer mon site avec l'IA » → aperçu → « Publier »
- devis : « Créer mon premier devis » depuis un modèle pré-rempli du métier
- Aucune offre payante avant la première action réussie ; ensuite fenêtre d'offre → `/pro/abonnement?offre=`.

## 5. Analytics (dataLayer, paramètre `landing`)
`landing_site_view`, `hero_form_started`, `hero_form_submitted`, `demo_played`, `outil_video_played` (avec `outil`), `pricing_section_viewed`, `site_example_clicked`, `faq_opened`, `sticky_cta_clicked`, `final_cta_clicked`.

## 6. Performances et accessibilité
Captures produit chargées à l'approche (lazy), dimensions fixées (pas de CLS), images WebP/AVIF, vidéo compressée avec poster. Labels de formulaire, focus visible, cibles ≥ 44 px, étoiles avec `aria-label`.

## 7. À valider avant mise en ligne (bloquant)
- **Avis du bandeau défilant : fictifs** → remplacer par de vrais avis (nom, métier, ville, photo, accord écrit) ou retirer. Faux avis = pratique commerciale trompeuse.
- « Premier réseau d'artisans de France » et « Plus de 200 demandes de travaux chaque jour sur le réseau » : preuve chiffrée datée requise, sinon retirer.
- « En ligne en 5 minutes », « 3 questions » : conformes au parcours réel de création.
- « Plusieurs centaines d'euros » (prix agence) : estimation à sourcer ou reformuler.
- Facture électronique : toujours « en cours de mise en conformité ».

## 8. Critères d'acceptation
- **LAND-01** chaque landing transmet sa `source` et elle est visible sur le compte créé
- **LAND-02** une seule action primaire orange par écran ; aucun prix dans le hero
- **LAND-03** étapes : l’animation suit le défilement dans les deux sens (pas d’aimantation), sortie libre après la 3e (et avant la 1re en remontant), aucun saut ni blocage, OK souris, pavé tactile, doigt, clavier
- **LAND-04** preuve sociale absente si aucune donnée réelle
- **LAND-05** barre mobile absente quand un formulaire est visible ; tous les CTA mènent au formulaire
- **LAND-06** les 10 événements analytics remontent avec `landing`
- **LAND-07** aucun avis fictif ni chiffre non sourcé en production
- **LAND-08** l'app (section « Application mobile ») une seule fois par landing ; son bouton ramène au formulaire (`#inscription`)
- **LAND-10** bloc final : 6 boutons « Voir la vidéo : … », chacun ouvre le film de son outil dans une fenêtre, `outil_video_played` avec `outil` ; « Voir : suivant » passe à l'outil suivant
