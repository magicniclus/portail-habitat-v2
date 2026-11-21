# Analyse comportementale des pages (cartes de chaleur, trajets, replays)

Objectif : comprendre **où les visiteurs regardent, hésitent, cliquent, ne cliquent pas et partent** sur chaque page publique (landings pro et particulier, simulateur, diagnostic, annuaire), pour améliorer la conversion. Outil **interne**, sans dépendance à un outil tiers (Hotjar, Clarity) : les données restent en UE et dans notre base.

Maquette : `designs/Admin Comportement.dc.html`. L'assistant IA qui exploite ces données est décrit dans IA_ADMIN.md.

---

## 1. Ce qui est mesuré

| Mesure | Événement | Détail |
|---|---|---|
| Trajet du curseur | `mv` | position échantillonnée toutes les **100 ms** si le curseur a bougé de plus de 8 px (ordinateur uniquement) |
| Arrêts (attention) | `pause` | curseur immobile **≥ 600 ms** : position, durée, élément survolé |
| Survol d'élément | `hover` | entrée / sortie sur les éléments marqués `data-ph` (CTA, prix, FAQ, témoignages) : durée |
| Clics | `clk` | position, élément (`data-ph` ou sélecteur stable), cliquable ou non |
| Clics morts | `dead` | clic sur un élément **non cliquable** (image, titre, prix, icône) |
| Clics de rage | `rage` | **3 clics ou plus en 700 ms** dans un rayon de 30 px |
| Défilement | `scr` | profondeur maximale atteinte (paliers de 5 %), vitesse |
| Temps de lecture par section | `sec` | temps pendant lequel chaque `section[data-ph-section]` est visible à plus de 50 % (IntersectionObserver) |
| Toucher (mobile) | `tap` | équivalent du clic + zones de pouce ; pas de trajet de curseur |
| Formulaires | `fld` | focus, temps passé, abandon par champ (**jamais la valeur saisie**) |
| Sortie | `exit` | dernière section visible, profondeur, durée, intention de sortie (curseur vers le haut de la fenêtre), type de sortie (fermeture, retour, lien externe, conversion) |
| Conversion | `conv` | objectif atteint (inscription commencée, demande envoyée, paiement) : relie la session au résultat |

Chaque session porte : `page`, `variante` (tests A/B), `appareil` (`ordinateur`, `tablette`, `mobile`), largeur de fenêtre, source (`utm_*`, référent), nouvelle ou déjà vue, `sessionId` aléatoire (aucun identifiant personnel).

---

## 2. Traceur côté navigateur (`packages/tracker`, `@ph/tracker`, 3,7 Ko compressé, test de poids < 6 Ko)

```ts
initTracker({ page: 'acquisition-artisans', variante: 'B', endpoint: '/api/t', echantillon: 1.0 })
```
- **Démarre uniquement après le consentement** « Mesure d'audience détaillée » (bandeau cookies, catégorie dédiée). Sans consentement, rien n'est collecté, pas même un identifiant.
- Coordonnées enregistrées **relatives au document** (`x` en % de la largeur de la mise en page, `y` en px depuis le haut) avec la largeur de fenêtre. Ainsi les cartes restent justes quelle que soit la taille d'écran. On agrège par gabarit : `≥ 1200`, `768–1199`, `< 768`.
- **Agrégation dans le navigateur** (clé des économies) : le traceur ne transmet pas un flux d'événements. Il tient en mémoire un **résumé de la page vue** (cellules de clics et d'attention, profondeur max, temps par section, éléments survolés/cliqués, clics morts/rage, sortie) et l'envoie **une seule fois** à `pagehide` (`navigator.sendBeacon`, ~1 à 2 Ko compressé), plus un envoi de secours après 60 s si la page reste ouverte (le serveur garde le dernier).
- **Trajets du curseur** : enregistrés seulement pour une fraction des sessions ordinateur (`echantillonTrajets`, 10 % par défaut), simplifiés (Ramer-Douglas-Peucker, 40 points max).
- **Pages suivies** (fait) : liste fixe dans le code, `PAGES_SUIVIES` (`@ph/core/comportement`) : `accueil`, `annuaire`, `simulateur`, `acquisition-artisans` (`/pro`), `landing-chantiers`, `landing-site`, `landing-devis`, `diagnostic`. Les espaces connectés ne sont pas suivis ; Dessin (`/dessin`) n'est pas suivi. Conversions signalées : inscription commencée sur `/pro`, demande envoyée par le simulateur.
- **Masquage** : aucun texte saisi, aucune valeur de champ, aucun contenu de la page n'est envoyé. Les éléments `data-ph-masque` sont exclus.
- Stabilité des cibles : les éléments importants portent `data-ph="cta-hero"`, `data-ph="prix-visibilite"`… (convention à appliquer dans toutes les pages publiques). À défaut, un sélecteur CSS court est calculé.
- Échantillonnage réglable par page (`config/comportement.echantillon`) pour maîtriser le volume.
- Respect de `Do Not Track` et de `Global Privacy Control`.

---

## 3. Chaîne de traitement (optimisée pour le coût)

```
Navigateur (résumé en mémoire) ──1 envoi par page vue──► /api/t (Route Handler Next.js sur Vercel, région UE)
   validation Zod · rate limit IP hachée · rejet des bots · échantillonnage serveur
      ├─► comportementSessions/{id}   Firestore, 1 écriture par page vue, TTL 35 jours
      └─► si replay retenu : Cloud Storage replays/{page}/{jour}/{id}.json.gz (règle de cycle de vie : suppression à 30 j)
Chaque nuit 3 h ──► Function comportementAgreger
      lit les sessions de la veille (requête par page) → comportementAgregats/{page}_{jour}_{app}
      puis recalcule les cumuls prêts à afficher : comportementAgregats/{page}_{7j|30j|90j}_{app}
      puis détection → comportementAlertes (+ tâche friction_page si gravité ≥ 4) ; résultat des tests A/B en cours
3 h 30 ──► Function iaContexteNuit → iaContexte (IA_ADMIN.md §3)
```
- **Pas de BigQuery ni de Pub/Sub au lancement** : un résumé par page vue suffit, Firestore l'absorbe pour quelques centimes.
- **Cartes creuses** : grilles de **20 × 20 px** (choix du lot 13c : ce paragraphe disait 40 px, le §4 20 px) stockées en objet clé → valeur (`"12:40": 7`) avec seulement les cellules non vides.
- **Admin économe** : l'écran lit **un seul document** pré-cumulé par combinaison page × période × appareil (1 lecture par affichage). Aucune écoute temps réel sur ces données.
- **Replays** : 5 % des sessions, plus toutes celles avec clic de rage ou abandon de formulaire, **plafond de 300 par jour**, stockés compressés dans Cloud Storage (pas dans Firestore).
- **Seuil de bascule** : au-delà de ~300 000 pages vues par mois, activer l'extension « Stream Firestore to BigQuery » sur `comportementSessions` et déplacer l'agrégation dans BigQuery. Le traceur et l'admin ne changent pas.

## 4. Algorithmes (fonctions pures dans `packages/core/src/comportement/` : `agregation.ts`, `detection.ts`, `abPages.ts`, testées unitairement ; la Function `apps/functions/src/comportement/planifiees.ts` ne fait que les appeler)

### Cartes de chaleur (clics, mouvements, attention)
- Grille de **20 × 20 px** sur la mise en page de référence (1280 px pour l'ordinateur, 390 px pour le mobile), comptage par cellule.
- Rendu : noyau gaussien (rayon 30 px) puis normalisation au 99e percentile, pour qu'un seul point très chaud n'écrase pas le reste.
- Carte d'attention = somme des **durées d'arrêt** (pas du nombre), pondérée.

### Défilement
Pour chaque palier de 5 % : part des sessions qui l'atteignent. La **ligne de flottaison moyenne** est calculée par appareil.

### Clics morts et de rage
Regroupement par élément (`data-ph` ou sélecteur). Un élément devient une friction si ses clics morts dépassent **2 % des sessions** qui le voient, ou s'il reçoit un clic de rage pour plus de 0,5 % d'entre elles.

### Hésitation
Arrêt de **plus de 2 s** sur un CTA ou un prix **sans clic** dans les 5 s qui suivent. On calcule le taux d'hésitation par élément.

### Sorties
Distribution de la **dernière section visible** avant la sortie, hors conversions. On compare ensuite la part de sorties de chaque section à la part de sessions qui l'atteignent : l'écart signale une section qui fait partir les visiteurs.

### Attribution par section
Pour chaque section : taux de conversion des sessions qui y ont passé plus de 3 s, comparé à celles qui l'ont sautée (corrélation, **pas causalité** : l'interface le précise).

### Détection automatique (nuit)
Une alerte est créée dans ces cas :
- une friction nouvelle apparaît ;
- la conversion d'une page varie de plus de 20 % sur 7 jours par rapport aux 28 jours précédents ;
- la vitesse de défilement est anormale (lecture en diagonale) — **pas encore fait** ;
- un élément important est vu par moins de 30 % des visiteurs — **pas fait** : le traceur sait quelles sections ont été vues, pas quels éléments.

Types d'alertes réellement calculés : `clic_mort` (> 2 %), `rage` (> 0,5 %), `hesitation` (> 10 % des sessions, seuil choisi au lot 13c), `sortie` (taux de sortie > 1,5 × la moyenne des sections avec au moins 30 sorties), `baisse_conversion` (> 20 % sur 7 jours contre les 28 précédents). Aucune alerte sous 200 sessions. Alertes dédoublonnées (une par page, type et élément ; une alerte ignorée le reste ; une alerte traitée qui revient est rouverte).

Chaque alerte → `comportementAlertes` + tâche `filesModeration` de type `friction_page` si la gravité est élevée.

### Tests A/B
Répartition déterministe par `hash(sessionId) % 100`, variante mémorisée dans le stockage de session. Résultat : test bayésien (bêta-binomial), probabilité d'être meilleur et gain attendu, 100 sessions minimum par variante. La bascule est proposée à partir de 95 %, **jamais automatique**.
> **État** : le calcul est prêt, mais **aucune page n'affiche encore de variante B** (pages et textes à choisir avec le propriétaire, reste du lot 13c).

---

## 5. Données Firestore (écriture par Functions uniquement)

```
pagesSuivies/{page}                 (schéma et règle de lecture prêts ; la liste réelle des pages est PAGES_SUIVIES dans le code) url, nom, gabarits, sections[{ id, nom }], elements[{ dataPh, nom, type }],
                                    objectif ('inscription'|'demande'|'paiement'), actif, echantillon, captureUrl
comportementSessions/{vueId}        (une écriture par envoi, le dernier l'emporte ; + sessionId, appareil, hauteur, champs, abandon, jour)
                                    page, variante, app, largeur, source, nouvelle, duree, profondeur, cellulesClics{}, cellulesAttention{},
                                    sections{ id: ms }, elements{ dataPh: { survolMs, clics } }, morts[], rages[], sortie{ section, type },
                                    conversion? ('inscription'|'demande'|'paiement'), trajet? (10 %), replayPath?, aReplay, expireLe (TTL 35 j)
comportementAgregats/{page_jour_app} sessions, conversions, dureeMediane, profondeurMediane,
                                    grilleClics (tuiles encodées), grilleAttention, grilleMouvements,
                                    scroll[20], sections{ id: { vues, tempsMoyen, sorties, convSiLue } },
                                    elements{ dataPh: { vues, clics, morts, rages, hesitations, survolMoyenMs } },
                                    sorties[{ section, part }], sources{}, variantes{}
comportementAlertes/{id}            page, type ('clic_mort'|'rage'|'hesitation'|'sortie'|'baisse_conversion' ; 'element_invisible' pas calculé),
                                    element?, gravite (1-5), valeur, reference, statut ('ouverte'|'traitee'|'ignoree'), createdAt
abTests/{id}                        page, nom, variantes[{ id, poids, description }], objectif, statut, debut, fin?, resultat?
config/comportement                 actif, echantillon, echantillonReplay, seuils de détection
```
Replays : Cloud Storage `replays/` (gzip, cycle de vie 30 j). BigQuery uniquement après le seuil de bascule (§3).

---

## 6. Admin (section « Comportement »)
- Choix de la page, de la période, de l'appareil et de la variante
- Page réelle en arrière-plan (iframe de la page, même origine : d'où `frame-ancestors 'self'` dans la CSP), avec les calques **Clics**, **Mouvements**, **Attention**, **Défilement**, **Clics morts et rage**, **Sorties**, réglables en opacité
- Panneau latéral : indicateurs (sessions, conversion, temps médian, profondeur médiane), liste des éléments (clics, clics morts, hésitation), liste des sections (temps, sorties) ; survol d'une ligne = mise en évidence sur la page
- **Replays** : 30 dernières sessions avec leur issue, lecteur avec curseur, trace, clics et défilement (×1, ×2, ×4) ; chaque lecture journalisée (`adminLectureReplay`)
- **Alertes** : frictions détectées, avec le bouton « Demander à l'IA » (préremplit l'assistant avec le contexte)
- Permissions : `comportement.lire` (cartes et alertes), `comportement.replays` (lecture des replays, journalisée), `comportement.configurer` (pages suivies, échantillonnage, tests A/B)

---

## 7. RGPD et CNIL
- Mesure **soumise au consentement** : catégorie « Mesure d'audience détaillée » dans le bandeau, refusable aussi simplement qu'acceptable. La politique cookies liste la finalité, la durée (35 jours pour les résumés de visite, 13 mois pour les agrégats anonymes, 30 jours pour les replays) et le fait que tout est hébergé en UE.
- Aucune donnée saisie, aucun contenu, aucune IP en clair (hachage salé, rotation quotidienne du sel), aucun identifiant de compte dans les événements.
- Les replays ne montrent **ni texte saisi, ni données personnelles affichées** : les pages publiques ne contiennent pas de données personnelles, et les espaces connectés ne sont **pas suivis**.
- Droit d'opposition : « Gérer les cookies » dans le pied de page rouvre le choix (« Tout refuser » coupe la mesure). Le lien « Ne plus mesurer ma visite » a été retiré à la demande du propriétaire (11/11/2026).

## 8. Variables et coûts
```
REPLAYS_BUCKET=portailtravaux-replays      # cycle de vie 30 j (bucket UE à créer)
COMPORTEMENT_SALT_SECRET=                  # secret du site (lu par /api/t) ; sel du jour dérivé, rotation quotidienne
```
L'adresse d'envoi est fixe (`/api/t`) : `TRACKER_ENDPOINT` prévu n'existe pas. Réglages : `config/comportement` (actif, échantillonnage, relu toutes les 5 min).
Coût estimé : voir **COUTS.md** (moins de 1 € par mois à 30 000 pages vues par mois).

## 9. Tests
- Traceur : aucun envoi sans consentement, aucune valeur de champ dans les lots, masquage `data-ph-masque`, coordonnées relatives justes après redimensionnement
- Agrégations : jeux de données synthétiques → cartes et taux attendus (tests unitaires sur les fonctions pures)
- Détection : cas limites (petits volumes : aucune alerte sous 200 sessions)
