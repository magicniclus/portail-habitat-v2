# Critères d'acceptation

Un écran est **terminé** quand tous ses critères passent. Chaque critère devient un test Playwright qui porte le même identifiant dans son titre (`test('SIM-03 …')`) : pages publiques dans `apps/web/e2e/<ecran>.spec.ts`, espace pro et admin (sur émulateurs, jeu de données du seed) dans `apps/web/e2e-pro/<ecran>.spec.ts`. Les critères de serveur pur (emails, imports, webhooks, concurrence) sont testés sur émulateur avec Vitest ; ils sont signalés dans « Couverture des tests » en fin de fichier.

Critères communs à **tous** les écrans (préfixe `ALL`) :
- **ALL-01** : rendu conforme à la maquette à 1440 px et à 390 px (capture comparée, écarts listés puis corrigés)
- **ALL-02** : navigation complète au clavier, focus toujours visible, aucune erreur `axe` de niveau sérieux ou critique
- **ALL-03** : aucune erreur dans la console, aucun appel réseau en échec
- **ALL-04** : état de chargement (squelette), état vide et état d'erreur prévus pour chaque liste ou donnée distante
- **ALL-05** : Lighthouse mobile ≥ 90 en performance et ≥ 95 en accessibilité (pages publiques)
- **ALL-06** : titre et description de la page uniques
- **ALL-07** : critères mobiles MOB-01 à MOB-07 de MOBILE.md §12

---

## Particuliers

### Accueil `/`
- **ACC-01** : les chiffres affichés (demandes, artisans, villes) viennent de `stats/public`
- **ACC-02** : un chip « Projets populaires » remplit le champ projet
- **ACC-02b** : recherche de projet : critères RCH-01 à RCH-08 de RECHERCHE.md §7
- **ACC-03** : l'envoi du formulaire du hero mène au simulateur avec la prestation et le code postal préremplis
- **ACC-04** : sur mobile, la navigation passe dans un menu accessible (bouton avec `aria-expanded`)

### Simulateur `/simulateur`
- **SIM-01** : étant donné la prestation « Peinture », 30 m² et 2 couches, quand j'envoie mes coordonnées, alors l'estimation affichée sur l'écran de résultat est celle de `packages/core/simulateur` pour ces valeurs
- **SIM-01b** : aucun montant en euros n'est présent dans la page (texte ou réponses réseau) avant l'envoi des coordonnées ; la lecture de `referentiel/prestations/prix` depuis le navigateur est refusée
- **SIM-02** : l'étape courante est dans l'URL (`?etape=3`) ; le bouton précédent du navigateur revient à l'étape précédente
- **SIM-03** : je ne peux pas passer à l'étape suivante si un champ obligatoire est vide ; le message d'erreur est lié au champ
- **SIM-04** : un code postal 75xxx applique le coefficient Île-de-France (×1,16)
- **SIM-05** : pour l'isolation, la ligne d'aides apparaît en négatif et respecte le plafond
- **SIM-06a à SIM-06j** : reprise d'un parcours interrompu, voir **REPRISE_PARCOURS.md §7**
- **SIM-07** : quand j'envoie, une demande `PT-XXXXXX` est créée et j'arrive sur la confirmation
- **SIM-08** : la requête d'envoi ne contient aucun montant ; l'estimation enregistrée et affichée vient du serveur
- **SIM-09** : avec un email déjà inscrit, la demande est rattachée à ce compte et aucune session n'est ouverte automatiquement
- **SIM-10** : 6 envois en 1 h depuis la même IP : le 6e est refusé avec un message clair

### Annuaire `/artisans`
- **ANN-01** : les filtres (métier, rayon, note, labels, disponibilité, budget) sont dans l'URL ; recharger la page conserve les résultats
- **ANN-02** : chaque filtre actif apparaît en chip retirable ; « Tout effacer » vide tout
- **ANN-03** : les artisans recommandés (formule qui inclut la mise en avant, ex-Premium : D54) sont en tête, signalés comme tels, et la mention L111-7 est visible
- **ANN-04** : une recherche « douche italienne » trouve les artisans qui ont ce tag
- **ANN-05** : aucun résultat : état vide avec la proposition de déposer un projet
- **ANN-06** : le téléphone n'apparaît qu'avec Fiche Pro ou une formule qui l'inclut (ex-Premium ou option Visibilité, D54, D60)

### Fiche artisan `/artisans/[slug]`
- **FIC-01** : seuls les labels vérifiés sont affichés
- **FIC-02** : une fiche hors ligne renvoie une 404
- **FIC-03** : JSON-LD `LocalBusiness` valide avec la note et le nombre d'avis

### Laisser un avis `/avis`
- **AVI-01** : le bouton de publication est désactivé tant qu'il n'y a pas de note et que la case de certification n'est pas cochée
- **AVI-02** : le compteur de caractères bloque à 1 200
- **AVI-03** : après l'envoi, l'avis est `en_attente` et n'apparaît pas sur la fiche
- **AVI-04** : un deuxième avis du même email pour le même artisan et le même mois de chantier est refusé

### Mon espace `/mon-espace`
- **ESP-01** : je vois mes demandes avec leur statut, le nombre d'artisans et de devis
- **ESP-02** : je ne vois jamais la demande d'un autre particulier, même en changeant l'identifiant dans l'URL (404)
- **ESP-03** : je peux lire et envoyer des messages ; un numéro de téléphone tapé avant l'acceptation est masqué
- **ESP-04** : je peux exporter mes données et supprimer mon compte (confirmation en deux temps)

## Diagnostic
- **DIA-01** : les paramètres `?motif&type&periode&ville` préremplissent le parcours
- **DIA-02** : maison de 1968 à la vente : amiante, plomb, DPE, électricité (si installation de plus de 15 ans) et ERP sont « à réaliser »
- **DIA-03** : un DPE fait en 2019 est « à refaire »
- **DIA-04** : 4 diagnostics ou plus : la remise pack est appliquée et indiquée sur l'écran de résultat
- **DIA-05** : chacune des 11 pages communes est générée statiquement, avec un titre unique et des liens vers les 10 autres
- **DIA-06** : avant l'envoi, la liste des diagnostics obligatoires est visible mais aucun prix ; après l'envoi, budget total et prix par diagnostic s'affichent

## Artisans

### Inscription `/pro` → `/pro/inscription/*`
- **ONB-01** : saisir un SIREN valide préremplit la raison sociale et l'adresse
- **ONB-01b** : le métier principal se choisit dans une liste déroulante groupée par famille (60 métiers) ; sans choix, l'envoi est bloqué avec un message
- **ONB-01c** (17/11/2026) : dans le premier formulaire, tous les chantiers du métier principal sont acceptés et repliés derrière « Modifier mes chantiers » ; choisir le métier ne change pas la hauteur du formulaire ; décocher un chantier l'exclut du matching ; les autres métiers s'ajoutent dans Ma fiche ; l'étape 2 ne montre que la zone
- **ONB-01d** (17/11/2026) : sans numéro sur la fiche, « Accepter la demande » ouvre d'abord « Votre numéro » ; fermer n'accepte rien ; un numéro invalide est refusé ; une fois enregistré (sur la fiche, comme dans Ma fiche), l'acceptation reprend d'elle-même
- **ONB-02** : SIREN d'une entreprise fermée : refus avec message
- **ONB-03** : SIREN déjà revendiqué : écran « déjà inscrite » avec « Demander à rejoindre »
- **ONB-04** : fermer le navigateur à l'étape 2 puis rouvrir le lien reçu par email reprend à l'étape 2
- **ONB-05** : deux finalisations simultanées du même SIREN : une seule entreprise créée
- **ONB-06** (15/11/2026) : à la fin, je suis propriétaire, la fiche est **en ligne** (SIREN trouvé au répertoire) ; le premier écran affiche « Bienvenue {prénom}, votre espace est prêt », un seul bouton « Rédiger ma fiche avec l'IA », l'état de la fiche et « Assurance non vérifiée » ; Ma fiche dit « Pour compléter votre fiche : … »
- **ONB-06b** (15/11/2026) : entreprise saisie à la main (« Je ne trouve pas mon entreprise ») → fiche hors ligne jusqu'à la vérification du SIREN par un modérateur ; SIREN refusé, expiré ou entreprise suspendue → fiche hors ligne
- **ONB-07** : étapes 2 et 3 : bouton « Étape suivante » / « Activer mon espace » de la barre fixe désactivé tant que l'étape est incomplète, statut explicite
- **ONB-08** (15/11/2026) : étape 2 : ville proposée d'après le code postal de l'étape 1, rayon au curseur de 10 à 100 km, phrase « Au moins {n} demandes de travaux déposées ces dernières 48 h autour de {ville}, dans un rayon de {rayon} km. » visible sans défiler sur téléphone ; {n} suit le rayon (17/11/2026 : demandes du mois à 30 km pour les métiers de l'artisan (modèle STATS_DEMANDES), mises à l'échelle du rayon, ramenées à 48 h, moins 10 %, jamais sous 3) ; étape 3 : « Créez votre compte », « Continuer avec Google », aucune case des conditions, un seul résultat possible sélectionné d'office
- **ACQ-01** : `?metier=couvreur` préremplit le métier et affiche le bandeau « Couvreur » ; le nombre de demandes de la page `/pro` suit STATS_DEMANDES.md (plus d'estimation aux étapes 2 et 3 depuis le 15/11/2026)
- **ACQ-02** : le lien « Espace pro » de l'en-tête mène à la connexion ; aucun texte ne contient le mot « lead »
- **ACQ-03** : ~~sélecteur Annuel/Mensuel : Visibilité 79,90 € HT/an / 12,90 € HT/mois, Premium 79,90 / 99,90 € HT ; le bouton transmet `?facturation=` et la page de paiement s'ouvre sur la bonne formule ; en annuel, le total dû = 12 mois TTC~~ **retiré** (D54 : plus d'annuel ni de Premium/Visibilité ; D55 : aucun prix avant l'inscription, voir PAY-01)
- **ACQ-04** : sous 760 px, le menu burger ouvre le panneau latéral ; Échap, le voile et chaque lien le ferment
- **ACQ-05** (17/11/2026) : erreurs sous le champ sans perdre la saisie ; code postal au clavier numérique (`postal-code`), email au clavier email (`email`)
- **ACQ-06** (17/11/2026) : sur les 4 pages d'entrée (/pro et les 3 landings), à 375 × 667 et 390 × 844, premier visiteur (bandeau cookies affiché) : premier champ et bouton d'envoi visibles sans défiler, au-dessus du bandeau ; titre, une phrase, puis le formulaire ; ordinateur inchangé ; bandeau cookies compact, « Tout refuser » aussi grand que « Tout accepter »
- **ACQ-07** (17/11/2026) : formulaire court sur les 4 pages : métier principal, code postal, email ; ni nom, ni téléphone, ni case à cocher ; « Gratuit · sans carte bancaire · 2 minutes » et « En continuant, vous acceptez les conditions générales, la charte et la politique de confidentialité » sous le bouton (version enregistrée côté serveur) ; `?metier=` préremplit aussi sur les landings ; aucune donnée saisie dans l'adresse de l'étape suivante
- **ACQ-08** (17/11/2026) : sur téléphone, barre « Voir les demandes près de chez moi » (libellé propre à chaque page) : cachée tant que le formulaire est à l'écran ou que le clavier est ouvert, visible ensuite ; elle ramène au formulaire avec le curseur dans le premier champ vide ; cible ≥ 44 px, marge de sécurité en bas ; jamais sur ordinateur

### Connexion `/connexion` (`/pro/connexion` y renvoie)
- **CON-01** : identifiants faux : message générique (sans dire si l'email existe)
- **CON-02** : propriétaire Tout inclus (ex-Premium) sans 2FA : activation demandée avant l'accès à la facturation
- **CON-03** : après 5 échecs, délai d'attente affiché

### Tableau de bord, demandes, appels d'offres
- **PRO-01** : une nouvelle demande apparaît en temps réel, sans recharger la page
- **PRO-02** : les coordonnées du particulier ne sont visibles qu'après avoir accepté la demande
- **PRO-03** : « Je m'en occupe » assigne la demande ; les autres membres voient qui la traite
- **PRO-04** : un collaborateur sans droit de dépense ne voit pas le bouton « Débloquer »
- **PRO-05** : débloquer avec des crédits insuffisants propose le paiement par carte ou l'achat d'un pack
- **PRO-06** : 10 artisans débloquent la dernière place au même moment : un seul réussit, les autres reçoivent « Complet » sans être débités
- **PRO-07** : la page Statistiques est ouverte à tous les artisans, abonnés ou non (décision du 06/11/2026) ; vues, appels et demandes de devis en graphiques sur la période choisie
- **NAV-01** : Mon compte épinglé en bas de la barre latérale sur toutes les pages /pro ; onglets identiques sur les 4 pages du compte

### Équipe `/pro/equipe`
- **EQU-01** : le propriétaire invite un collaborateur ; l'invitation apparaît « en attente » avec le compteur de sièges mis à jour
- **EQU-02** : sièges pleins : le bouton « Inviter » est désactivé et propose d'ajouter un siège
- **EQU-03** : un collaborateur ne voit ni le bouton « Inviter » ni les actions sur les autres membres
- **EQU-04** : le dernier propriétaire ne peut pas quitter l'équipe
- **EQU-05** : un membre retiré perd l'accès immédiatement (sa requête suivante est refusée)

### Invitation `/pro/invitation`
- **INV-01** : lien valide : l'entreprise, le rôle et l'invitant sont affichés
- **INV-02** : connecté avec un autre email : refus explicite avec l'email masqué attendu
- **INV-03** : lien expiré ou révoqué : message et bouton « Demander une nouvelle invitation »

## Paiements (détail : PAIEMENTS.md §7, fait foi)
- **PAY-01** à **PAY-10** : aucun prix avant inscription, ouverture du paiement par `?offre=`, prorata en montée, descente à l'échéance, droits par webhook seulement, appels d'offres au prix admin (−15 % Tout inclus), packs de crédits, grâce de 7 jours, devis/factures/avis sans paiement, fenêtre d'offre pour toute fonction payante cliquée.
- *Anciens PAY-01 et PAY-02 (lot 11 de septembre 2026)* : « au retour de Stripe Checkout, la page attend la confirmation du webhook » et « le même webhook reçu deux fois n'a qu'un seul effet ». Ces deux contrôles restent testés dans `e2e-pro/paiement.spec.ts` sous le titre « PAY-01 et PAY-02 : le retour attend le webhook ; un événement rejoué n'a qu'un effet » : **double sens des numéros à lever** (renommer ce test, par exemple en PAY-05, ou donner un numéro propre à ces contrôles).

## Admin
- **ADM-01** : un modérateur ne voit que Projets et Avis dans la navigation ; les URL des autres sections renvoient une 403
- **ADM-02** : les données personnelles sont masquées ; « Afficher » écrit une entrée d'audit
- **ADM-03** : toute action destructrice demande un motif et une confirmation
- **ADM-04** : l'impersonation affiche un bandeau rouge et toute écriture échoue
- **ADM-05** : modifier un barème affiche l'effet sur les 50 dernières demandes avant publication

### Studio vidéo `/admin/studio` (STUDIO.md ; critères repris des titres des tests existants le 19/11/2026, à valider par le propriétaire)
- **STUDIO-EDIT** : montage de Claude dans l'éditeur multipistes, écrans, IA, enregistrer, fabriquer
- **STUDIO-SUIVI** : montage en cours visible partout, relance si bloqué
- **STUDIO-CAPTURES** : écrans et artisan d'exemple dans le Studio, « Filmer maintenant »
- **STUDIO-LIBRE** : nouveau montage, carton, pistes muet / solo, enregistrer
- **STUDIO-LIBRE-FILTRES** : filtres image et point d'automation sur un média
- **STUDIO-LIBRE-CAPCUT** : glisser qui pousse, transition, effet, automation, mixage, sous-titres, place dans l'image
- **STUDIO-SESSION** : vidéos à tourner à la suite, prompteur, idées sans clé Claude
- **STUDIO-FICHIER** : vidéos du Studio servies par le serveur (morceaux), refusées sans droit

## Emails
- **MAIL-01** : inscription d'un particulier : exactement les emails de EMAILS.md §5, dans l'ordre
- **MAIL-02** : onboarding abandonné : relances à J+1, J+3 et J+10 ; aucune si l'inscription est terminée entre-temps
- **MAIL-03** : le lien « Se désabonner » coupe la catégorie, pas les emails de sécurité

## Conversion
- **CONV-01** : un artisan gratuit en ligne reçoit vis-position à J+3 puis vis-offre-lancement à J+14 ; plus rien dès qu'il paie
- **CONV-02** : le code promo envoyé est personnel, à usage unique, expire à la date affichée et s'applique sans saisie via le bouton
- **CONV-03** : jamais plus de 2 emails offres_pro par semaine ni le week-end ; un email reporté apparaît dans le journal avec la raison « pression »
- **CONV-04** : une entreprise du groupe témoin ne reçoit aucun email commercial (trace « temoin »)
- **CONV-05** : créer, modifier, dupliquer, mettre en pause et supprimer une séquence depuis l'admin ; chaque action crée une version et une entrée d'audit
- **CONV-06** : sans la permission conversion.configurer, les boutons de séquence sont désactivés et l'API refuse
- **CONV-07** : un appel d'offres sans déblocage après 24 h est offert à 5 artisans gratuits du secteur ; les 3 premiers qui activent Visibilité (Fiche Pro depuis D60) le reçoivent débloqué ; une entreprise ne bénéficie qu'une fois d'une demande offerte
- **CONV-08** : la publication Facebook du jour ne contient aucune donnée personnelle et chaque lien porte les paramètres utm du groupe

## Comportement et IA
- **CMP-01** : sans consentement « Mesure d'audience détaillée », aucune requête vers /api/t
- **CMP-02** : une page vue produit un seul envoi (plus au maximum un envoi de secours) ; aucune valeur de champ dans la charge utile
- **CMP-03** : après l'agrégation de nuit, les 6 calques de l'admin s'affichent pour la page, la période et l'appareil choisis en une seule lecture Firestore
- **CMP-04** : un clic de rage simulé crée une alerte et garde le replay
- **IA-01** : une analyse renvoie un JSON conforme au schéma ; chaque valeur citée existe dans le contexte
- **IA-02** : la même question relancée dans les 24 h ne déclenche pas de nouvel appel au modèle
- **IA-03** : budget mensuel atteint : l'assistant est coupé avec un message, aucune erreur technique
- **IA-04** : en mode « Audit complet », les 7 étapes de l'entonnoir sont notées de 0 à 100 avec un constat, puis 6 à 12 recommandations ; en mode « Points d'amélioration », 3 à 6
- **IA-05** : chaque recommandation indique une étape de l'entonnoir et un gain estimé ; aucune ne porte sur l'esthétique ou l'image de marque sans effet de conversion
- **IA-06** : choisir une partie des données (ex. emails + offres) n'envoie au modèle que ces périmètres
- **IA-07** : le lundi 7 h, un audit complet est créé et envoyé aux superadmins ; le bandeau du tableau de bord affiche son gain estimé et ses étapes les plus faibles

## Demandes partenaires
- **IMP-01** : une demande envoyée deux fois avec le même identifiant externe ne crée qu'une seule demande
- **IMP-02** : une demande sans preuve de consentement complète est rejetée (motif visible dans l'admin), aucune donnée personnelle n'est conservée
- **IMP-03** : une demande éligible aux aides n'est proposée qu'à des artisans RGE vérifiés dans leur rayon
- **IMP-04** : entre la réception et la première proposition à un artisan, moins de 5 minutes (test de charge : 200 demandes en 1 h)
- **IMP-05** : le niveau C n'est jamais attribué en demande exclusive Premium ; son prix d'appel d'offres applique le coefficient 0,4 *(les demandes exclusives Premium n'existent plus depuis D54 : seul le coefficient reste à vérifier)*
- **IMP-06** : l'artisan voit les aides estimées avec la mention « indicatif » ; le rayon choisi (10 à 100 km) est respecté

## Assistant de rédaction (artisans)
- **RED-01** : dans l'éditeur de la présentation et d'un chantier, « Relire », les 4 tons de réécriture et (chantier) « Rédiger à partir des infos » affichent une proposition à côté du texte, sans rien enregistrer
- **RED-02** : « Remplacer mon texte » remplace le brouillon ; seul « Enregistrer » ou « Publier » écrit dans la fiche
- **RED-03** : une proposition qui cite une certification absente de la fiche est refusée côté serveur
- **RED-04** : au-delà de 20 utilisations par jour, message clair et édition manuelle toujours possible

## Pages d'erreur
- **ERR-01** : une URL inconnue affiche la page 404 avec recherche et liens utiles, et renvoie le code HTTP 404
- **ERR-02** : une erreur serveur affiche la page 500 avec un identifiant d'incident (le même que dans Sentry)
- **ERR-03** : `config/app.maintenance = true` affiche la page de maintenance partout sauf `/admin` (l'interrupteur est lu dans `config/flags`, AVANCEMENT §23)

## Site internet artisan (détail : SITE_INTERNET.md, critères SITE-01 à SITE-13)
- **SITE-01** à **SITE-13** : voir SITE_INTERNET.md. Rappel de l'un d'eux :
- **SITE-13** site gratuit : formulaire limité à 4 champs, réglages verrouillés, champ supplémentaire rejeté par l'API

## Site internet · IA (détail : IA_SITE.md §7)
- **SITE-IA-01** à **SITE-IA-10** : aperçu gratuit non publiable, reprise après paiement Site Pro, droits vérifiés côté serveur, sorties hors schéma rejetées, faits absents → `[à compléter]` bloquant, Ctrl Z sur une proposition, questionnaire sans doublon avec la fiche, quotas, sauvegarde « Avant IA », aucune publication par l'IA.

## Devis et factures (DATABASE §8 bis-ter)
- **DEV-01** il manque une mention obligatoire (identité, client, validité, lignes) → « Valider » refusé avec la liste ; même contrôle côté serveur. Décennale, médiateur, SIREN du client (devis), date ou durée des travaux : conseillés, jamais bloquants (décision du propriétaire, 27/10/2026)
- **DEV-02** client professionnel sans SIREN valide (9 chiffres) → signalé « conseillé » sur le devis ; refusé sur la facture (mention de la réforme)
- **DEV-03** devis signé au domicile → PDF avec mention de rétractation 14 j et formulaire annexé
- **DEV-04** ligne à 5,5 % ou 10 % → attestation TVA réduite jointe
- **DEV-05** aucun aperçu du PDF dans l'éditeur ; « Télécharger le PDF » renvoie le même fichier que celui joint à l'email
- **DEV-06** numérotation des factures sans trou sous concurrence (100 créations simultanées)
- **DEV-07** facture : SIREN client (pro), lieu d'exécution, nature de l'opération présents ; export Factur-X valide (Factur-X en attente de D62 ⏳)

## Blog
Critères BLOG-01 à BLOG-14 : voir `BLOG.md` §8.

## Landings par outil
Critères LAND-01 à LAND-11 : voir `LANDINGS.md` §8. LAND-09 (démo du site en 4 vidéos, l'étape suit le défilement) et LAND-11 (chantiers, de la fiche à la demande, l'étape suit le défilement) sont testés dans `e2e/landings.spec.ts` mais **ne sont pas encore décrits dans LANDINGS.md §8**.

## Domaines
Critères DOM-01 à DOM-08 : voir `DOMAINES.md` §8.

## Plans (Dessin)
Critères DES-01 à DES-48 : voir `DESSIN.md` §6. **DES-45** (« Créer un devis depuis ce plan ») est **retiré** depuis le 18/11/2026 à la demande du propriétaire : pas de test. Tous les autres ont un parcours Playwright (`e2e-pro/dessin-*.spec.ts` ; DES-44 dans `e2e/simulateur.spec.ts`), sur iPhone 13 et ordinateur.

---

## Couverture des tests (relevé du 19/11/2026)

Relevé fait par recherche des identifiants dans `apps/web/e2e` et `apps/web/e2e-pro` (titres des tests et commentaires d'étapes), sans lancer les tests. « Émulateur » = un test Vitest du dépôt cite l'identifiant (`packages/*/tests`, `packages/core`), à vérifier au cas par cas.

**Sans test Playwright portant l'identifiant**
- Communs : ALL-01 (captures non automatisées), ALL-04, ALL-05 (Lighthouse en CI, pas de test nommé), ALL-07 (MOB-04, MOB-05, MOB-07 sans test ; MOB-01 à 03 et MOB-06 testés).
- Particuliers : ACC-01 (seed seulement), ACC-02b (couvert par RCH-01 à 08), SIM-04, SIM-09 et SIM-10 (émulateur).
- Artisans : ACQ-04, ONB-05, ONB-06b (émulateur), ONB-08, EQU-05.
- Paiements : PAY-03, PAY-04, PAY-08 (émulateur) ; PAY-06, PAY-07, PAY-09 (aucun test trouvé).
- Emails : MAIL-01 à MAIL-03 (aucun test trouvé).
- Conversion : CONV-01, CONV-02, CONV-07 (émulateur) ; CONV-03, CONV-04 (aucun test trouvé).
- Comportement et IA : CMP-04, IA-01 à IA-04, IA-06, IA-07 (émulateur, faux modèle).
- Demandes partenaires : IMP-01, IMP-03 à IMP-05 (émulateur).
- Assistant de rédaction : RED-01 à RED-04 (aucun test trouvé).
- Devis : DEV-03, DEV-04, DEV-06, DEV-07 (tests unitaires et émulateur, cités en tête de `e2e-pro/devis.spec.ts`).
- Site : SITE-01 (clé IA), SITE-04 (Lighthouse), SITE-05, SITE-06 ; SITE-12 (émulateur) ; SITE-IA-03 à 06, 08, 10 (émulateur ou unitaires).
- Blog : BLOG-02, 06, 07, 09 à 12, 14 (émulateur ou unitaires).
- Domaines : DOM-01, DOM-05 à DOM-08 (émulateur ou unitaires).
- Retirés, donc sans test : ACQ-03, DES-45.

**Testés mais absents des critères (avant ce relevé)**
- STUDIO-* (8 tests, ajoutés ci-dessus d'après leurs titres, à valider).
- LAND-08 à LAND-11 (ACCEPTANCE ne citait que LAND-01 à 07 ; LAND-09 et LAND-11 restent à décrire dans LANDINGS.md).
- PAY-10 (ACCEPTANCE ne citait que PAY-01 à 09).
- ACQ-09 : cité seulement dans le commentaire d'en-tête de `e2e/conversion.spec.ts` (« ACQ-06 à ACQ-09 »), sans test ni critère.
