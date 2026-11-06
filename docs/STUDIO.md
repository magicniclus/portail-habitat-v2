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
  - **Voix ElevenLabs** : une voix de synthèse lit le texte (le script par défaut, 5 000 caractères au plus). Le serveur dépose `voix.mp3` (MP3 à 128 kbit/s, durée = taille × 8 / 128) puis lance la suite comme pour une prise.
  - Sans écran enregistré, `verifierPlan` refuse le visuel « ecran » et Claude est prévenu : la vidéo montre les captures Portail Travaux, des cartons et des calques.

## 3. Transcription

Le robot de rendu transcrit la voix **en local** avec faster-whisper (modèle `small`, int8, français). On obtient chaque mot avec son début et sa fin en millisecondes. Il n'y a pas de nouveau fournisseur ni de prix à la minute.

Le robot extrait aussi 4 images de la caméra, envoyées à Claude pour juger le regard et l'énergie.

## 4. Captures de Portail Travaux (artisan d'exemple)

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
- **Miniature** (image de couverture) : Claude choisit l'image (`tempsMs`), un texte de 2 à 5 mots et le mot mis en avant ; visible dans l'aperçu (« Voir la miniature ») et dessinée par le robot avec le même code.
- **Retouche** « Revoir avec Claude » : Claude reçoit le plan actuel et la demande. Chaque plan accepté est une version (`studioProjets/{id}/versions/{n}`).

## 6. Rendu (robot Cloud Run, `apps/studio`)

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
