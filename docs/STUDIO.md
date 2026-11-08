# Studio vidéo (back-office)

Le Studio sert à **produire des vidéos courtes qui font des vues** sur TikTok, Reels et Shorts, pour faire venir des artisans. L'auteur (le propriétaire) enregistre son écran et sa voix ; Claude choisit le sujet, écrit le script, monte la vidéo et y ajoute des captures de Portail Travaux et des animations 2D. Objectif : jusqu'à 30 vidéos par jour.

Route : `/admin/studio`. Permission : `studio.utiliser` (section `std`). Le propriétaire décide qui y a accès dans Admin › Équipe (rôle, permissions en plus ou en moins). Superadmin et admin l'ont par défaut. Après l'ajout de la permission, lancer une fois `pnpm admin:permissions`, puis se reconnecter.

## 1. Sujet et script

- **Tendances** : API YouTube Data v3, avec une clé gratuite `YOUTUBE_API_KEY`. On cherche des Shorts en France, en français, sur les 60 derniers jours, triés par vues. Ils sont ensuite classés par **vues par jour**. Cinq recherches par défaut, ou le thème donné par l'auteur.
  - Cache de 24 h dans `studioTendances`. Une recherche coûte 101 unités sur 10 000 par jour.
  - TikTok et Instagram n'ont pas d'API publique pour les vidéos des autres. Ce n'est donc pas branché.
- **Indicateurs de chaque vidéo analysée** : vues par jour, engagement ((j'aime + commentaires) / vues), **×abonnés** (vues / abonnés de la chaîne : au-dessus de 1, la vidéo a percé au-delà de son audience) et **score viral** sur 100 (`scoreViral`). Les vidéos sont classées par score ; le tableau « Ce qui marche en ce moment » les affiche.
- **Claude** (`claude-opus-5-5`, réflexion adaptative, effort élevé, sortie JSON imposée) propose 3 sujets. Chacun affiche aussi son **potentiel viral sur 10**, les **vues visées** sur 30 jours, l'**objectif d'abonnés**, les vidéos qui l'inspirent et le texte de sa **miniature**.
- **Déclinaisons** : « Décliner » transforme un sujet qui plaît en 2 à 5 vidéos (angles, accroches et miniatures différents), chacune créée prête à tourner. Chacun a un angle, des accroches et un « pourquoi ça peut marcher » tiré des données. Il a aussi un script phrase par phrase avec ce qu'on voit à l'écran, une légende et des hashtags.
- **Règles données à Claude** :
  - vouvoiement ; jamais « lead » ;
  - rien d'affirmé sur le produit en dehors des faits listés dans `packages/core/src/studio/prompts.ts` ;
  - pas de faux avis ni de faux témoignage ;
  - les chiffres d'un **artisan d'exemple** sont permis, l'auteur précisant à l'oral qu'il est fictif.
- L'auteur peut aussi enregistrer sans sujet.
- **Créativité** : en plus des recherches du métier, deux recherches **hors bâtiment** par jour (défi 24 h, combien je gagne, avant/après…, tirées dans `RECHERCHES_EXTERIEURES`) et un catalogue de 20 formats viraux (`FORMATS_VIRAUX`). Au moins la moitié des idées transpose un concept venu d'ailleurs ; chaque idée indique son `concept` (format, vidéo source avec son lien, transposition). Idées banales interdites.
- **Apprentissage** : Claude reçoit les idées que l'auteur a choisies, gardées ou ignorées (40 dernières vidéos), en plus des résultats réels des vidéos publiées.
- **Idées gardées** : « ☆ Garder » met une proposition de côté (`studioIdees`, une seule fois par titre, avec les liens des vidéos d'inspiration). Sur l'accueil du Studio, « Tourner cette vidéo » crée une vidéo prête à tourner **sans rappeler l'IA** (format et caméra au choix) ; « Supprimer » l'efface.

## 2. Enregistrement (navigateur)

- **Écran** : partage choisi par le navigateur, 1080p, 30 images/s.
- **Voix** :
  - micro au choix, intégré ou externe, avec la liste des appareils et le niveau en direct ;
  - réduction du bruit décochable pour un bon micro.
- **Caméra** : facultative, 720p. Au montage, l'auteur choisit de s'afficher ou non.
- **Trois fichiers** démarrés ensemble : `voix`, `ecran`, `camera`. Prompteur avec le script (flèches du clavier). Durée maximale de 8 min.
- **Envoi** : directement dans Storage, `studio/{uid}/{prise}/{voix|ecran|camera}.webm`, avec l'avancement.
  - Règles : section Studio, propriétaire du dossier, noms `voix`, `ecran` ou `camera` seulement, vidéo ou audio, 100 Mo au plus par fichier, jamais écrasé.
- **Autres façons de tourner** (onglets de l'étape 2) :
  - **Vidéo du téléphone** : `import.(mp4|mov|m4v|webm)`, 1 Go et 15 min au plus ; elle donne l'image (face caméra ou écran) et la voix.
  - **Voix seule** : fichier audio `voix-import.(mp3|m4a|wav|aac|ogg|webm)`, 200 Mo et 15 min au plus. On peut aussi enregistrer ici sans écran ni caméra.
  - **Voix ElevenLabs** : une voix de synthèse lit le texte (le script par défaut, 5 000 caractères au plus). Le serveur dépose `voix.mp3` (MP3 à 128 kbit/s, durée = taille × 8 / 128). ElevenLabs renvoie le temps de chaque lettre (`with-timestamps`) : les mots sont horodatés (`motsDepuisAlignement`), pas de transcription, Claude monte tout de suite. Case « Sous-titres » : le choix de l'auteur est imposé au plan.
  - **Claude fait tout (rien à tourner)** : voix au choix (aucune, ou une voix IA ElevenLabs qui lit le script et fixe la durée) ; sans voix, une durée (15 à 90 s). Claude monte des cartons et des textes sur les captures Portail Travaux, avec la musique ; le robot pose une piste muette de la durée choisie. Case « Sous-titres » (cochée par défaut) : sans voix, le texte du script est réparti sur la durée (`motsDepuisTexte`) et Claude prend les plans dans l'ordre pour que les sous-titres suivent.
  - Sans écran enregistré, `verifierPlan` refuse le visuel « ecran » et Claude est prévenu : la vidéo montre les captures Portail Travaux, des cartons et des calques.

## 3. Transcription

Le robot de rendu transcrit la voix **en local** avec faster-whisper (modèle `small`, int8, français). On obtient chaque mot avec son début et sa fin en millisecondes. Il n'y a pas de nouveau fournisseur ni de prix à la minute.

Le robot extrait aussi 4 images de la caméra, envoyées à Claude pour juger le regard et l'énergie.

## 4. Captures de Portail Travaux (artisan d'exemple)

- **Avant le montage** (page « Captures », entre l'idée et le tournage) :
  - **Préparation** (`preparerCapturesStudio`, `promptPreparation`, sortie structurée `SCHEMA_JSON_PREPARATION`) : à partir du script, Claude crée l'artisan d'exemple fictif (nom inventé, chiffres cohérents avec la voix, montants en centimes) et choisit 1 à 4 écrans (colonne « à l'écran » du script). Lancée toute seule en arrivant sur la page s'il y a un script ; sans script, l'artisan d'exemple par défaut (`ARTISAN_EXEMPLE`) est proposé.
  - **Relecture** : l'auteur corrige l'artisan et coche les écrans (6 au plus), puis « Filmer ces écrans » (`filmerCapturesStudio`, statut `captures`). Chaque vidéo filmée se regarde sur la page et peut être refaite (`refaire`).
  - **Montage ensuite** : Claude reçoit les captures filmées (`c1 = fiche_publique`…) et l'artisan ; le plan reprend leurs identifiants (`alignerCaptures`, rien n'est refilmé) et l'artisan préparé est imposé.
  - **Enchaînement** : captures finies sans prise → retour au tournage ; avec une prise prête (voix IA, « Claude fait tout », voix transcrite) → montage lancé.
  - **Sans captures** : « Monter sans captures » (`ignorerCapturesStudio`, préparation `ignoree`) ; aussi le recours quand le robot n'est pas branché.
  - Le robot filme la préparation tant qu'il n'y a pas de montage, puis les captures du montage (`capturesAFilmer`).

- **Copie isolée** : le robot filme une copie de Portail Travaux qui tourne dans son conteneur (émulateurs Firebase, jeu de test, site compilé).
- **Artisan d'exemple** : le compte de démonstration prend son nom, sa note, son nombre d'avis et ses mentions de devis.
- **Jamais dans le vrai projet** : rien n'est écrit dans le vrai projet, le faux artisan n'apparaît jamais dans l'annuaire réel.
- **Scènes** (`SCENES_CAPTURE`) : recherche dans l'annuaire, fiche publique, demande envoyée depuis la fiche, demandes reçues, détail d'une demande, tableau de bord, création d'un devis, devis transformé en facture, éditeur du site, site publié.
- **Filmées au format de la vidéo** : téléphone ×2 en vertical, écran large sinon. Curseur visible, frappe et défilement « humains ».
- **Fichiers** : `studioRendus/{projet}/captures/`, réutilisées d'une version à l'autre.

## 5. Montage

- **Plan de montage** (`planMontage`, Zod strict) : la seule chose que Claude produit. Il ne contient jamais de code.
  - **Plans** : chaque plan est un passage de la prise, avec un visuel (écran, caméra, capture ou carton), la place de la caméra (cachée, en bas, dans le coin, plein écran) et un zoom facultatif.
  - **Calques 2D** : texte (accroche, titre, chiffre, note), compteur, notification « Nouvelle demande », liste cochée, barre de progression, flèche, surlignage.
  - **Réglages** : sous-titres mot à mot, nappe musicale.
  - **Artisan d'exemple** : montants en centimes entiers.
- **Vérifications** (`verifierPlan`) :
  - durée de 10 s à 3 min ;
  - passages dans la prise ;
  - captures connues ;
  - caméra disponible ;
  - calques dans leur plan.

  Un plan refusé est renvoyé une fois à Claude avec les erreurs. Deux refus : le projet passe « À relancer ».
- **Découpe proposée à Claude** (`segmentsParoles`) : silences de plus de 0,7 s et « euh » retirés. Claude garde les meilleures prises.
- **Aperçu de l'admin** : image par image, avec les mêmes fonctions de dessin que le rendu (`dessinerImage`, `disposition`, `couverture`).
- **Réglages directs**, sans Claude : format (vertical par défaut, horizontal, carré), m'afficher ou non, sous-titres.
- **Pages du Studio** (organisation inspirée de CapCut et Descript) : en-tête commun avec les onglets Vidéos · Idées · Calendrier · Résultats · Réseaux, et en haut à droite un seul bouton « Studio » qui ouvre directement l'éditeur sur une vidéo neuve (`ouvrirStudioStudio` : une vidéo neuve restée vide — aucun clip, média, idée ni prise — est reprise au lieu d'en créer une de plus). Vidéos en grille de miniatures au format de la vidéo, filtrées par état ; un clic ouvre le Studio de la vidéo, la corbeille (au survol, ou au clavier) la supprime avec ses médias après confirmation.
- **Tout se fait dans le Studio** : le panneau IA (premier onglet à gauche, ouvert d'office sur une vidéo vide ou en fabrication) enchaîne ① l'idée (thème facultatif, idées de Claude avec script, choix ou improvisation), ② « Claude fait la vidéo à partir de… » : me filmer (visage et voix, prompteur), ma voix seulement, voix IA ElevenLabs, une vidéo ou un audio déjà tournés, ou sans rien (la voix se fait après), chaque choix s'ouvrant sur place ; puis l'avancement de la fabrication (chargeur, étapes, durée habituelle, « Relancer »), ③ « je monte moi-même » (enregistrement posé sur les pistes). Une fois montée par Claude : « Revoir le montage avec Claude ». Dès qu'une prise part chez Claude, la vidéo n'est plus « libre » : le plan de Claude remplace les pistes (les médias importés restent). Les largeurs des panneaux gauche et droit se règlent en tirant les séparateurs (ou flèches du clavier) et restent gardées dans le navigateur. Les anciennes adresses d'étape (`/admin/studio/{id}`, `captures`, `tournage`) renvoient au Studio ; la page Publication reste.
- **Frise** : barre d'outils au-dessus des pistes : loupes, ciseaux (coupe le clip choisi à la tête de lecture, aussi touche S), « + Vidéo / + Audio / + Effets ». Une transition d'entrée s'affiche en bande bleutée hachurée au début du clip ; tirer son bord change sa durée (0,1 à 3 s, jamais plus que le clip). Vidéo prête : on reste dans le Studio (« Regarder la vidéo », « Publier… » au choix) et on peut redonner des instructions à Claude autant de fois qu'on veut.
- **Écrans de Portail Travaux dans les montages de Claude** : 3 écrans différents au plus, chacun au moins 4 s d'affilée (`CAPTURES_MAX`, `CAPTURE_MIN_MS`, vérifiés dans `verifierPlan` : sinon Claude corrige) ; consigne d'un montage posé pour un public d'artisans. Le robot filme plus calmement (`CALME` dans `demo/gestes.ts` : souris, frappe et défilement plus lents, pause de lecture après chaque geste).
- **Habillage et scènes animées (motion design)** :
  - *Écran dans un appareil* (`appareil` sur un clip ou un plan : `ordinateur` ou `telephone`) : l'image se pose dans l'écran de l'appareil (`ecranAppareil`), sur un fond animé aux couleurs de la marque (halos qui dérivent, motif de points). Le robot dessine ce « dessous » image par image dans Chromium (entrée 0 de ffmpeg) avec le même code que l'aperçu ; sans appareil à l'image, fond uni. Un écran posé depuis l'onglet Écrans arrive dans l'appareil du format (téléphone en vertical, ordinateur sinon), 6 s.
  - *Scènes animées* (nouveaux calques) : `demandes` (cartes « Nouvelle demande » qui arrivent), `outils` (tuiles qui apparaissent), `tampon`, `comparaison` (avant barré / après), `fin` (logo, phrase, bouton). Dans l'onglet Animations et réglables à droite.
  - *Entrées animées* (`entree` sur tout calque : monte, zoom, glisse, fondu, tampon).
  - *Style* choisi dans le panneau IA (`style` du projet : posé par défaut, ou dynamique), suivi par Claude ; consignes : scènes animées, captures dans un appareil, fin avec appel à l'action.
  - Le robot rend toujours la frise (y compris un plan de Claude converti et ses variantes d'accroche) : la vidéo est exactement l'aperçu.
- **Style « Écran filmé » (par défaut)** : pour les artisans, la vidéo est l'écran de Portail Travaux filmé par le robot comme par une personne (fiche, devis… selon le thème), avec une intro (carton d'accroche) et une fin (scène « fin » : phrase et bouton), plus quelques textes pour souligner ; rien d'autre. `planSelonStyle` l'impose au plan de Claude (ni appareil, ni zoom, ni autre animation). **Jamais de musique** dans les montages de Claude, quel que soit le style. Un même écran sur des plans qui se suivent continue (il ne recommence pas au début) et, s'il est plus court que son clip, reste sur sa dernière image. Styles animés au choix : « Animé posé », « Animé rythmé ».
- **Qualité des écrans filmés** (essai réel du robot, 08/11) : la fiche de l'artisan d'exemple est complète (logo, bannière, 3 réalisations avec photos, images dessinées par `demo/preparer.ts`, couleurs `demoStudio`) ; son cache est vidé avant de la filmer (`POST /api/studio/demo-fiche`, n'existe que sur la copie de démonstration) ; la vidéo ne commence qu'une fois la page affichée (`charger(…, avant)` : plus 15 s d'attente de la carte filmées).
- **Session de tournage** (Studio › Tournage) : pour produire en masse avec son visage et sa voix. 1) jusqu'à 5 thèmes, chacun avec 1 à 10 vidéos ; un appel à Claude par thème (`ideesSessionStudio`), accroches toutes différentes au-delà de 3 idées, chaque idée devient une vidéo avec son script, ou on ajoute des idées gardées ; 2) on coche les vidéos à tourner ; 3) on les tourne à la suite sur un seul écran : caméra et micro restent ouverts, le prompteur passe au script suivant, chaque prise envoyée part dans sa vidéo et Claude la monte (style « Écran filmé ») pendant qu'on tourne la suivante ; 4) à la fin, la liste des vidéos à ouvrir dans le Studio. Deux façons de filmer : la caméra de l'ordinateur (messages précis si elle ne s'ouvre pas : accès refusé, déjà utilisée par une autre application, introuvable ; nouvel essai sans réglages imposés), ou **« Mon téléphone »** : prompteur qui défile tout seul en très gros (vitesse, pause, plein écran) devant soi, on filme avec l'appareil photo du téléphone puis on envoie la vidéo, qui part dans sa vidéo du Studio.
- **Jamais « exemple fictif » à l'image** : consigne à Claude et filtre (`planSansMentionFictive`, `friseSansMentionFictive`) ; l'auteur le dit à l'oral.
- **Éditeur de montage plein écran** (organisation des logiciels de montage, ambiance sombre `data-ambiance="sombre"`, palette `montage` de @ph/ui) : tout tient dans l'écran, sans défiler.
  - Barre du haut : fermer (confirmation si non enregistré), titre et état du projet, annuler / rétablir, « À corriger » et « Rythme » en listes dépliantes, « Enregistrer et fabriquer ».
  - À gauche, bibliothèque (Médias, Texte, Effets, Cartons) : un clic pose l'élément à la tête de lecture. Au centre, l'aperçu (adapté à la place) et le compteur, lecture, miniature, plein écran. À droite, les réglages de l'élément choisi ou de toute la vidéo (et la retouche par Claude).
  - En bas, la frise sur toute la largeur, hauteur réglable : pistes nommées (Vidéo, Effets, Sous-titres, Voix, Musique), règle et tête de lecture, plans à glisser et à couper par les bords, effets à décaler et à allonger, aimant (`aimanter` : coupes, tête de lecture, autres effets), zoom (curseur, Ctrl + molette, ajuster à la largeur), scinder, supprimer.
  - Raccourcis : Espace (lecture), S (scinder), Suppr (supprimer), ← → (0,1 s ; 1 s avec Maj), Ctrl+Z / Ctrl+Y.
  - Tout se fait sur un brouillon vérifié en direct (`verifierPlan`), revalidé côté serveur à l'enregistrement. Opérations pures dans `packages/core/src/studio/edition.ts`.
- **Miniature** (image de couverture) : Claude choisit l'image (`tempsMs`), un texte de 2 à 5 mots et le mot mis en avant ; visible dans l'aperçu (« Voir la miniature ») et dessinée par le robot avec le même code.
- **Retouche** « Revoir avec Claude » : Claude reçoit le plan actuel et la demande. Chaque plan accepté est une version (`studioProjets/{id}/versions/{n}`).

## 5 bis. Montage libre (éditeur multipistes, sans génération)

- **Départ** : Studio › « Monter moi-même » (titre et taille de la vidéo) crée un projet `libre` qui s'ouvre directement sur l'étape Montage, avec une frise vide (Effets, Vidéo 1, Audio 1). « Supprimer le projet » (en-tête du projet) efface aussi tous ses médias.
- **Modèle** (`packages/core/src/studio/frise.ts`, `operationsFrise.ts`, `verifierFrise.ts`, `imageFrise.ts`) : pistes vidéo, audio et d'effets (16 au plus, de haut en bas ; entre pistes vidéo, la plus haute passe devant) ; clips (média importé, passage de la prise, capture, carton, effet) avec volume (jusqu'à 200 %), muet, vitesse (0,25× à 4×), fondus, place dans l'image et opacité, filtres image (luminosité, contraste, saturation, chaleur, flou, noir et blanc), filtres son (graves, médiums, aigus, voix claire, réduction de bruit) et automations (points de volume ou d'opacité). Temps en ms entières. Un plan généré par Claude se convertit en frise (`friseDepuisPlan`).
- **Médias** : vidéos, sons et images glissés depuis l'ordinateur (ou « Importer ») vers `studio/{uid}/medias/{id}.{ext}` ; le serveur relit taille et type (`ajouterMediaStudio`). Limites : vidéo 1 Go, son 200 Mo, image 20 Mo, 5 Go par projet. Gardés tant que le projet existe.
- **Éditeur** (`EditeurFrise`, plein écran, même organisation que l'éditeur des plans) :
  - bibliothèque : Médias (zone d'import, envois en cours, médias et captures à glisser), Texte, Effets, Cartons ; glisser sur une piste ou cliquer pour poser à la tête de lecture ;
  - en-têtes de pistes : nom, masquer / couper le son, solo, verrou, volume de la piste, supprimer ; « + Vidéo / + Audio / + Effets » dans les réglages du projet ;
  - clips à glisser dans le temps et d'une piste à l'autre (aimant), à rogner par les bords, couper (S), dupliquer, supprimer ; fondus et courbe d'automation visibles sur le clip ;
  - réglages du clip en onglets Clip, Son et Image ; « Poser un point » d'automation à la tête de lecture ;
  - aperçu image par image (`dessinerFrise`) et son mixé en direct par WebAudio (`useLectureFrise` : volume, fondus, automations, solo, égaliseur). Un fichier lu sans CORS garde l'image mais perd les filtres son (volume limité à 100 %) : régler le CORS du bucket pour la production.
- **Toutes les vidéos** s'ouvrent dans cet éditeur : un montage de Claude est converti en pistes (`friseDuProjet`) tant qu'on ne l'a pas retouché à la main (`friseVersion` = version du plan) ; un nouveau plan de Claude (retouche) le remplace, les médias importés restent.
- **Gestes** : un clip glissé suit le curseur, un repère montre où il tombe ; au lâcher il s'insère et les clips suivants glissent (animés) pour lui faire place (`insererClip`). Mode « Automation » : la courbe de volume (son) ou d'opacité (image) se dessine sur le clip choisi (clic = point, glisser = déplacer, double-clic = enlever). Sur l'aperçu, le cadre du clip choisi se déplace et se redimensionne ; un effet animé ou les sous-titres se déplacent (`decalage`, `decalageSousTitres`).
- **10 transitions** (`TRANSITIONS` : fondu enchaîné, passage au noir, flash blanc, glisser ×4, zoom, flou, balayage) au début d'un clip, depuis la séquence d'avant (prolongée dessous) ; **10 effets vidéo** (`EFFETS_VIDEO` : sépia, vintage, négatif, vignette, grain, miroir, pixels, tremblement, pulsation, décalage RGB) sur un clip ou sur toute une piste. Bibliothèque : onglets Transitions et Effets (glisser sur un clip ou cliquer).
- **Sous-titres** : piste « Sous-titres » sous les autres ; la choisir ouvre leur réglage (afficher, corriger chaque ligne, écrire un texte d'un bloc, revenir à la voix) ; mots corrigés dans `motsEdites`.
- **Panneau de droite** : vidéo entière en onglets Contenu (format, sous-titres, nappe, miniature, pistes) et Mixage (volume, muet, solo de chaque piste) ; clip choisi en onglets Clip (transition d'entrée), Son, Image (effets vidéo du clip et de la piste). Onglet IA à gauche : « Revoir avec Claude ».
- **Enregistrer** (`enregistrerFriseStudio`) : schéma et `verifierFrise` refaits côté serveur ; les médias doivent être ceux du serveur (tailles comprises). **Enregistrer et fabriquer** (`fabriquerFriseStudio`) : le robot filme les écrans manquants puis rend la frise (`rendreFrise`, graphe `grapheFrise` : pistes, recadrage, vitesse, filtres, effets, transitions, fondus, opacité et volume automatisés, cartons et surcouche dessinés dans Chromium, sous-titres, miniature).

## 6. Rendu (robot Cloud Run, `apps/studio`)

- **Ordre des étapes** : transcription (voix enregistrée seulement) → montage par Claude → captures → rendu. Le montage vient avant les captures parce que c'est lui qui choisit les écrans de Portail Travaux à filmer ; le robot ne filme que ceux-là.
- **Suivi** (`ETAPES_SUIVI`, `etapesFabrication`, `etapeBloquee`) : l'étape en cours est expliquée, avec le temps écoulé et la durée habituelle ; la page se relit toutes les 5 s. Au-delà de la durée maximale (montage 12 min, transcription et captures 20 min, rendu 30 min), « Relancer cette étape » apparaît ; le serveur refuse une relance plus tôt (pas de double appel à Claude).
- **Montage en arrière-plan** (`lancerMontageStudio`) : l'étape passe à « montage » tout de suite, puis Claude travaille après la réponse (`after()` de Next, durée maximale de la page) ; une panne met le projet « À relancer ». On peut naviguer : une pastille « Vidéo en création » en bas à droite de tout le back-office suit la vidéo (écoute Firestore en direct des 5 projets les plus récents, sinon relecture toutes les 30 s) et annonce « Vidéo prête » ou « à relancer ».

- **Entrée** : `POST /travail { type: transcrire | capturer | rendre, projetId }`, avec l'en-tête `x-studio-cle` (`STUDIO_RENDU_CLE`). Réponse immédiate 202. Les travaux passent un par un ; chaque étape enchaîne la suivante.
- **Images** : chaque plan est composé par ffmpeg aux rectangles de `disposition` et `couverture`. Les sources sont d'abord remises à 30 images/s constantes, puis les plans sont mis bout à bout.
- **Surcouche** : calques et sous-titres karaoké sont dessinés dans Chromium par le code de l'aperçu, puis posés par-dessus.
- **Voix** : coupée aux mêmes endroits (fondus de 10 ms), filtre passe-haut, volume des réseaux (-14 LUFS). Nappe facultative, baissée sous la voix.
- **Sortie** : MP4 H.264 1080×1920 (ou 1920×1080, 1080×1080) à 30 images/s, AAC, `faststart`, plus `.srt` et miniature, dans `studioRendus/{projet}/v{n}/`. Essai local : 16 s de vidéo rendues en 32 s.
- **Déploiement** : `PROJET=<id> ./scripts/deployerStudio.sh`, à lancer **par le propriétaire uniquement**.
  - Service : 4 vCPU, 8 Go, processeur toujours alloué, 0 à 3 instances, région europe-west1.
  - Ensuite, mettre l'adresse dans `STUDIO_RENDU_URL` et la même clé dans `STUDIO_RENDU_CLE` côté site.
- **En développement** :
  ```
  docker build -f apps/studio/Dockerfile -t studio-rendu .
  docker run -p 8090:8090 --env-file .env.local studio-rendu
  ```
  Puis `STUDIO_RENDU_URL=http://localhost:8090`.

## 7. Données et conservation

- `studioProjets/{id}` : auteur, titre, statut, format, caméra, sujets, sujet, prise, mots, plan, version, captures, rendu, erreur, coût en centimes. Sous-collection `versions/{n}`.
  - Règles : lecture par la section Studio, écriture par le serveur uniquement.
- `studioTendances/{recherche}` : cache YouTube de 24 h. Admin SDK uniquement.
- **Prises brutes** supprimées après **30 jours** par la purge de nuit (`purgerPrisesStudio`). Les vidéos finies restent.

## 8. Variables

| Variable | Où | Rôle |
|---|---|---|
| `ANTHROPIC_API_KEY` | site + robot | Claude (sujets, montage, retouches) |
| `YOUTUBE_API_KEY` | site | tendances YouTube (console Google Cloud → API YouTube Data v3 → identifiants) |
| `ELEVENLABS_API_KEY` | site | voix de synthèse, facultative (elevenlabs.io → profil → clés API) |
| `STUDIO_RENDU_URL` | site | adresse du robot de rendu |
| `STUDIO_RENDU_CLE` | site + robot | clé partagée (longue chaîne aléatoire) |
| `STUDIO_CHIFFREMENT_CLE` | site + Functions | 32 octets en base64 (`openssl rand -base64 32`) : chiffre les accès aux réseaux |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | site + Functions | publier sur YouTube et lire les statistiques (§10) |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | site + Functions | publier sur Instagram et lire les statistiques (§10) |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | site + Functions | publier sur TikTok et lire les vues (§10) |
| `INSTAGRAM_TENDANCES_JETON`, `INSTAGRAM_TENDANCES_COMPTE` | site | Reels populaires par hashtag (§1), facultatif |

## 9. Coûts (estimation, à vérifier sur la facture)

| Poste | Par vidéo | 30 vidéos par jour (30 jours) |
|---|---|---|
| Claude Opus 5.5 (sujets + montage, une retouche) | 0,30 à 0,60 € | 270 à 540 € |
| Robot Cloud Run (environ 5 min de calcul) | environ 0,03 € | environ 30 € |
| Storage (prises gardées 30 jours, vidéos) | négligeable | quelques euros |
| YouTube Data API | gratuit (quota) | 0 € |
| ElevenLabs (seulement si utilisé) | facturé au caractère selon l'offre choisie : à lire sur elevenlabs.io | — |

Leviers si besoin :
- passer les sujets en Sonnet 5.5 (deux fois moins cher), décision du propriétaire ;
- garder les tendances 24 h (déjà fait).

## 10. Réseaux connectés (Studio › Réseaux)

- Un compte par réseau pour l'entreprise : YouTube, Instagram (compte professionnel), TikTok.
- Connexion OAuth : `/api/studio/reseaux/{reseau}` part chez le réseau ; le retour `/api/studio/reseaux/{reseau}/retour` vérifie l'état (cookie de 10 min, comparaison à temps constant), puis échange le code par une action admin journalisée.
- Adresse de retour à déclarer chez chaque réseau : `{NEXT_PUBLIC_SITE_URL}/api/studio/reseaux/{reseau}/retour` (affichée sur la page).
- Jetons chiffrés AES-256-GCM dans `studioComptes/{reseau}`, jamais envoyés au navigateur ni journalisés. Renouvelés seuls : 5 min avant la fin (YouTube, TikTok), 7 jours avant pour Instagram (jeton de 60 jours).
- TikTok : tant que TikTok n'a pas validé l'application, les vidéos partent en **privé** (le Studio le détecte et l'affiche).
- Adresses et droits des API à revérifier au premier branchement réel (testés ici avec de faux serveurs).

## 11. Publication et calendrier

- Étape 6 d'une vidéo prête : réseaux, accroche (version principale ou variante), titre, légende, hashtags (3 au plus sur YouTube, 30 sur Instagram), date et heure. « Publier maintenant » ou « Programmer ».
- `studioPublications` : une publication par vidéo et par réseau. La Function `studioPublier` (toutes les 10 min) réserve chaque publication en transaction, puis envoie :
  - YouTube : envoi reprenable, en public ;
  - Instagram : conteneur Reels à partir d'une adresse signée de 6 h (le compte de service des Functions doit pouvoir signer : rôle « Créateur de jetons du compte de service »), attente, publication ;
  - TikTok : envoi du fichier (morceaux de 20 Mo au-delà de 64 Mo), puis suivi.
- Échec : message lisible, bouton « Relancer ». Annulation tant que ce n'est pas parti.
- Calendrier (Studio › Calendrier) : 14 jours, objectif par jour (1 à 30), créneaux conseillés. Sans statistiques : répartition régulière de 8 h à 21 h ; ensuite, les heures où vos vidéos ont fait le plus de vues (au moins 2 vidéos par heure) passent devant.

## 12. Résultats de vos vidéos

- La Function `studioStats` relève toutes les 6 h, pendant 30 jours après la publication :
  - YouTube : vues, j'aime, commentaires, partages, durée moyenne, part regardée, abonnés gagnés, courbe de rétention ;
  - Instagram : vues, j'aime, commentaires, partages, durée moyenne regardée ;
  - TikTok : vues, j'aime, commentaires, partages (pas de rétention ouverte).
- Studio › Résultats : chiffres, courbe avec la plus forte chute, conseils (accroche qui ne retient pas, milieu trop long, aucun abonné).
- Claude reçoit le résumé réel de vos meilleures et moins bonnes vidéos (90 jours) à chaque proposition de sujets.
- Rythme au montage : un changement visuel au moins toutes les 3 s, texte dès la première image, fin qui reboucle. Avertissements affichés au montage (non bloquants).

## 13. Variantes d'accroche et séries

- Claude propose 2 autres accroches avec leur miniature. Le robot rend une vidéo par variante (`studioRendus/{projet}/v{n}-{variante}/`). On publie chaque version (un réseau chacune, ou des jours différents) ; le tableau « Test des accroches » marque la gagnante (★) dès que toutes ont des résultats.
- Séries (`studioSeries`) : un nom et une promesse. « Épisode N » crée la vidéo ; Claude reçoit les épisodes déjà faits, ajoute « Série · épisode N » au début et « Épisode N+1 bientôt : abonne-toi » à la fin.

## 14. Idées tirées des commentaires et tendances Instagram

- « Idées tirées de vos commentaires » : questions et objections sous vos vidéos YouTube et Instagram (60 jours) → 5 sujets « réponse en vidéo ». Seul le texte est lu ; ni nom ni identifiant de l'auteur, rien n'est enregistré. TikTok n'ouvre pas ses commentaires aux applications.
- Reels Instagram populaires : hashtags suivis (#artisan, #artisanfrancais, #renovation, #btp, #chantier), gardés 7 jours. Il faut l'API Instagram **avec connexion Facebook** et la fonctionnalité « Instagram Public Content Access » validée par Meta. Instagram ne donne que j'aime et commentaires (pas les vues), et 30 hashtags par 7 jours.
- TikTok n'a pas d'API publique de tendances (la « Research API » est réservée aux chercheurs) : les tendances viennent de YouTube et d'Instagram.

