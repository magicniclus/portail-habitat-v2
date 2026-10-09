# Conversion et montée en gamme (cycle de vie artisan)

Objectif : **maximiser le chiffre d'affaires par artisan**. Il faut transformer les prospects en inscrits, les inscrits en fiches en ligne, les fiches gratuites en Visibilité ou en Premium, faire monter la Visibilité en Premium et le mensuel en annuel, puis limiter les résiliations.
Complète EMAILS.md (architecture d'envoi, préférences, limites). Maquettes des emails : `designs/Modeles Emails.dc.html`, groupes « Conversion » et « Fidélisation ».

---

## 1. Principes (non négociables)

1. **Le comportement avant le calendrier.** Les meilleurs emails partent sur un signal réel (demande manquée, crédits dépensés, concurrent passé devant). Le calendrier (J+3, J+14…) ne sert que de filet quand aucun signal n'arrive.
2. **Les vrais chiffres de sa zone et de son métier** dans chaque email commercial : recherches, demandes, budget moyen, position dans l'annuaire. Pas de chiffre = pas d'envoi (`encoreValable` renvoie faux si les données sont vides ou trop faibles pour convaincre).
3. **La peur de perdre avant le gain.** « 3 chantiers sont partis chez un autre » convertit mieux que « recevez plus de demandes ».
4. **La valeur d'abord, la remise ensuite.** Aucune remise avant que l'artisan ait vu ses chiffres. Une remise au maximum tous les 90 jours par entreprise, 30 % maximum (50 % uniquement en rétention). Toujours un code personnel Stripe à usage unique et à date d'expiration réelle : **aucune fausse urgence**.
5. **Viser la bonne offre.** Un artisan à fort potentiel n'est pas ancré sur la petite offre : le score (§4) décide de l'**offre cible** (Visibilité ou Premium).
6. **Un seul bouton, un seul message.** Les emails de relance « humains » (dernière chance, reconquête) partent au nom d'une personne, en texte simple, avec une adresse de réponse lue. Ils ont de meilleurs taux de réponse et de délivrabilité.
7. **Une séquence active à la fois**, arrêtée dès que l'objectif est atteint.

---

## 2. Étapes du cycle de vie

| Étape | Définition | Objectif | Séquence |
|---|---|---|---|
| `prospect` | email connu (estimation sur la landing, guide, salon), aucune inscription commencée | commencer l'inscription | S1 |
| `inscription` | brouillon d'onboarding en cours | terminer l'inscription | S2 (existant : `relance-onboarding-1/2/3`) |
| `hors_ligne` | compte créé, fiche pas encore en ligne | fiche en ligne | S3 (existant : `bienvenue-pro`, `fiche-incomplete`) |
| `gratuit` | fiche en ligne, sans abonnement | 1er paiement | S4 (offre cible Visibilité) ou S5 (offre cible Premium) |
| `visibilite` | abonné Visibilité | passage à Premium | S6 |
| `premium` | abonné Premium | passage à l'année, fidélité | S7 |
| `resiliation` | résiliation demandée, pas encore effective | rester abonné | S8 |
| `ancien_client` | abonnement terminé | reprise | S9 |

`mensuel` ou `annuel` est un attribut, pas une étape : S7 s'applique aussi à la Visibilité mensuelle.

---

## 3. Séquences

Légende : **T** = déclenché par un signal · **C** = calendrier (filet) · **H** = email « humain » signé Julie · **€** = code promo personnel.

### S1 · Prospect → inscription (catégorie `offres_pro`)
| Quand | Modèle | Contenu |
|---|---|---|
| Immédiat | `prospect-estimation` | résultat de l'estimation : demandes du mois dans son métier et sa zone, budget moyen, nombre d'artisans inscrits (peu de concurrence = argument) |
| **T** J+1 à J+30, max 1/semaine | `prospect-demande-zone` | une demande réelle de son métier, à moins de 15 km, est arrivée : travaux, budget, distance ; « elle est partie chez un autre artisan » |
| **C** J+5 | `prospect-temoignage` | un artisan du même métier en Gironde : délai avant la 1re demande, chantiers signés |
| **C H** J+12 | `prospect-derniere` | « Je clôture votre dossier ? » : texte simple, un lien, invitation à répondre |
| Ensuite | `resume-zone-mensuel` | 1er du mois pendant 6 mois : demandes de sa zone. Puis arrêt définitif |

Sortie : brouillon d'onboarding créé → passage en S2 (les relances d'inscription existantes prennent le relais).

### S2 · Inscription commencée → terminée (existant)
`reprise-onboarding` immédiat, `relance-onboarding-1` J+1, `-2` J+3 (chiffres de la zone), `-3` J+10 (dernière). **Ajout** : un SMS unique à J+2 entre 10 h et 18 h si un mobile a été saisi (« Votre inscription est enregistrée à 66 %, terminez-la en 2 minutes »), catégorie `relance`.

### S3 · Compte créé → fiche en ligne (existant)
`bienvenue-pro`, `fiche-incomplete` J+2 et J+7. **Ajout** : à J+10 sans mise en ligne, **tâche d'appel** dans l'admin (`filesModeration`, type `appel_activation`) si score ≥ 40. Une fiche en ligne qui reçoit une demande dans les 7 jours convertit 3 à 5 fois mieux : l'activation est le premier levier de vente.

Le moment déclic est la **première demande reçue**. Il faut donc donner la priorité aux nouveaux inscrits dans l'attribution des appels d'offres pendant leurs 14 premiers jours (réglage `bonusNouveaux` dans l'algorithme d'attribution).

### S4 · Gratuit → Visibilité (offre cible Visibilité)
Départ : `fiche-en-ligne`.
| Quand | Modèle | Contenu |
|---|---|---|
| **C** J+3 | `vis-position` | vues de la semaine, **position dans le secteur** (« 14e sur 22 »), vues moyennes des fiches mises en avant ; prix ramené au mois (6,67 €) |
| **T** | `vis-concurrents` | un autre artisan du même métier et du même secteur passe en Visibilité ou en Premium : « votre fiche recule de 3 places » (anonymisé, max 1 toutes les 3 semaines) |
| **T** | `vis-recherches-manquees` | ≥ 10 recherches de son métier dans son secteur en 7 jours où sa fiche n'était pas en 1re page |
| **C €** J+14 | `vis-offre-lancement` | code personnel −30 % sur la 1re année (55,93 € HT au lieu de 79,90 €), **valable 72 h** |
| **C** J+17, 8 h | `vis-offre-rappel` | « expire ce soir » : **uniquement si** l'email J+14 a été ouvert ou cliqué |
| 1er du mois | `rapport-mensuel` | existant, avec encart Visibilité |

Sans conversion à J+30 : plus aucun email calendrier. Seuls restent les emails **T** (au maximum 2 par mois) et le rapport mensuel. Une nouvelle offre €, `vis-offre-relance`, part à J+104 (90 jours après l'offre de J+14, règle d'une remise tous les 90 jours ; validé le 05/10/2026).

### S5 · Gratuit → Premium direct (offre cible Premium, score ≥ 50)
Même rythme que S4, avec des messages Premium : `vis-position` (variante Premium), `prem-demandes-manquees` (T), `prem-credits` (T). **Pas de remise** : l'argument est la **garantie** (4 demandes exclusives par mois, sinon le 2e mois est offert). Score ≥ 70 : **tâche d'appel commercial** à J+7.

### S6 · Visibilité → Premium
| Quand | Modèle | Contenu |
|---|---|---|
| **C** J+30 après l'activation | `prem-bilan-visibilite` | chiffres du mois (vues ×N, appels), puis l'étape suivante : demandes exclusives. Visibilité restante **déduite au prorata** |
| **T** lundi 8 h | `prem-demandes-manquees` | ≥ 2 demandes de son métier et de son secteur confiées en exclusivité à un Premium la semaine passée : liste anonymisée avec les budgets. **Le plus fort levier** |
| **T** | `prem-credits` | crédits achetés sur 30 jours > 40 € HT : « Premium inclut 5 crédits (50 €) par mois » |
| **T** | `prem-appel-offres-complet` | un appel d'offres de son métier était complet (3 réponses) avant son résumé de 7 h : les Premium le voient en premier |
| **C** J-30 avant le renouvellement annuel | `prem-renouvellement` | « Renouvelez directement en Premium » : le meilleur moment pour monter en gamme |

### S7 · Mensuel → annuel, fidélité
| Quand | Modèle | Contenu |
|---|---|---|
| **C** après la 3e échéance payée | `passage-annuel` | économie chiffrée : 240 € HT (Premium) ou 74,90 € HT (Visibilité), mois en cours déduit |
| Reçus des mois 6 et 9 | encart dans `recu` | même argument, sans email supplémentaire |
| **T** 4e demande garantie reçue dans le mois | `garantie-tenue` (in-app + email) | renforce la valeur perçue ; si la garantie n'est pas tenue, le 2e mois offert est appliqué automatiquement avec un email d'excuse |

### S8 · Rétention (résiliation demandée)
- **Dans le parcours de résiliation** (écran, avant confirmation) : raison obligatoire (liste), puis une alternative adaptée à la raison :
  - trop cher → descendre à Visibilité ;
  - pas assez de demandes → −50 % pendant 2 mois ;
  - saison creuse, trop de travail → suspendre 2 mois ;
  - autre → appel.
- `resiliation-alternative` : envoyé si la résiliation est confirmée, rappelle les 3 options avant la date de fin. **Une seule offre de rétention par 12 mois.**
- Signaux de risque (aucune connexion depuis 14 jours, 3 demandes expirées sans réponse, note en baisse) : **tâche d'appel** « risque de résiliation », pas d'email commercial.

### S9 · Reconquête (ancien client)
`reconquete-1` à J+30 (demandes exclusives parties depuis son départ, position perdue, code −30 % valable 7 jours) → `reconquete-2` à J+90, signé Julie, dernier email. Ensuite : rapport mensuel gratuit uniquement.

---

## 3 bis. Demandes invendues offertes (levier Gratuit → Visibilité)

Les demandes achetées (~7 € l'unité) qui ne trouvent pas preneur servent d'**appât à conversion** au lieu d'être perdues.

| Règle | Valeur par défaut (`config/cycle.demandeOfferte`) |
|---|---|
| Déclencheur | appel d'offres sans aucun déblocage **24 h** après publication, ou demande sans artisan attribué |
| Fraîcheur | demande de moins de **72 h** (au-delà, elle n'est plus offerte : qualité avant tout) |
| Destinataires | artisans **Gratuit** du métier dont le rayon couvre le chantier, triés par score, **5 maximum** ; puis prospects du métier à moins de 50 km |
| Condition | **activer Visibilité** (annuelle ou mensuelle) : la demande est débloquée gratuitement dans la foulée |
| Attribution | les **3 premiers** qui activent la reçoivent (même limite que les appels d'offres) ; les suivants reçoivent la prochaine |
| Limite | **1 demande offerte par entreprise**, une seule fois (pas de contournement par résiliation) |

- Modèle **`vis-demande-offerte`** (catégorie `offres_pro`, notification in-app en plus) : travaux, budget, distance, « cette demande est à vous si vous activez Visibilité aujourd'hui (6,67 € HT/mois) ». Il **prime** sur les emails calendrier S4 et compte dans la pression hebdomadaire.
- Pour les prospects : variante de `prospect-demande-zone` avec « inscrivez-vous et activez Visibilité : cette demande vous est offerte ».
- Function `cycleDemandesInvendues` (toutes les heures) ; traces `demande_offerte`, `demande_offerte_convertie` ; suivi dans `cycleStats` : demandes offertes, conversions, revenu généré, coût d'achat récupéré.
- Si personne ne convertit sous 48 h : la demande repasse en appel d'offres à prix réduit (MATCHING, prix dynamique), puis est archivée.

## 3 ter. Groupe Facebook « Trouver chantier » (7 000 artisans)

Premier canal d'acquisition d'artisans, gratuit et déjà qualifié.

- **Publication quotidienne** (8 h) générée par l'admin (Appels d'offres › Publication Facebook) : 5 à 8 demandes du jour **anonymisées** (métier, commune, budget, délai), avec un lien unique `/pro?utm_source=facebook&utm_medium=groupe&utm_campaign=trouver-chantier&m=<metier>`. Copier-coller manuel : l'API Facebook ne permet plus de publier dans les groupes.
- **Page d'arrivée dédiée** (variante de la landing pro) : bandeau « Vous venez du groupe Trouver chantier », métier prérempli, **première demande offerte** à l'activation de Visibilité (même mécanique que §3 bis).
- Les inscrits venant du groupe sont marqués `prospects.source = 'facebook'` / `artisans.source` : conversion et revenu suivis séparément dans Conversion › Vue d'ensemble.
- Aucune donnée personnelle de particulier dans les publications (commune seulement, jamais d'adresse ni de nom).

## 4. Score et offre cible

Tâche planifiée `calculerCycle`, chaque jour à 5 h, pour chaque entreprise (0 à 100) :

| Signal | Points |
|---|---|
| Effectif SIRENE ≥ 3 salariés | +20 |
| 3 métiers ou plus, ou zone ≥ 30 km | +10 |
| Temps de réponse moyen < 2 h | +15 |
| ≥ 5 demandes reçues sur 30 jours | +15 |
| ≥ 2 appels d'offres débloqués sur 30 jours | +20 |
| Connexions ≥ 3 jours sur les 7 derniers | +10 |
| Fiche complète à 100 % | +10 |
| Aucune connexion depuis 14 jours | −20 |

- `offreCible = score >= 50 ? 'premium' : 'visibilite'` (recalculée chaque jour ; changement de séquence au maximum une fois par 30 jours)
- Score ≥ 70 : tâche d'appel commercial (une par 60 jours)

---

## 5. Orchestration

- **Priorité** : sécurité > transactionnel > paiement échoué > S2/S3 (activation) > S8 > signaux **T** > calendrier **C** > rapports. Un email de priorité supérieure le même jour **reporte** l'email commercial au lendemain.
- **Pression** : 2 emails commerciaux (`offres_pro`) par semaine maximum, 1 email non transactionnel par jour maximum, jamais le week-end.
- **Heure d'envoi** : mardi au jeudi à 7 h 15 (avant le chantier) ; les signaux **T** partent à 7 h 15 ou 18 h 30, le premier créneau qui suit.
- **Mise en veille** : 5 emails commerciaux consécutifs non ouverts → plus que le rapport mensuel (protège la délivrabilité).
- **Réponses** : les emails **H** ont `Reply-To: julie@portailhabitat.fr`. Une réponse crée une tâche `reponse_commerciale` dans l'admin et **met la séquence en pause**.
- **Groupe témoin** : 10 % des entreprises (`cycle.groupeTemoin = true`, tirage à l'inscription) ne reçoivent aucun email commercial. C'est la seule façon de mesurer le gain réel.
- **Tests A/B** : `variante` (déjà dans `cleIdempotence`) ; un test à la fois par modèle, bascule à 95 % de confiance.

---

## 6. Données

```
prospects/{id}        email, source ('estimation'|'guide'|'salon'|'import'), metiers[], commune, rayonKm,
                      siren?, etape, consentement { base: 'interet_legitime_b2b', date, texte }, desabonne,
                      convertiEn? (entrepriseId), createdAt
cycleEtat/{artisanId} {      ← document séparé d'artisans/{id} : ne redéclenche pas onArtisanWrite
  etape, depuis, offreCible, score, groupeTemoin,
  signaux { vues7j, vues30j, position, positionPrec, recherchesSecteur30j, demandesExclusivesManquees7j,
            montantManque7j, creditsAchetes30j, tempsReponseMoyen, derniereConnexion },
  sequence { id, etape, prochainEnvoi }, derniereRemise, derniereOffreRetention,
  emailsNonOuvertsConsecutifs, enVeille, pause? { par, depuis, motif }, exclu }
codesPromo/{code}     (collection existante, DATABASE.md §8) + source 'conversion', artisanId, modele
```
- Les codes sont créés côté Stripe (`promotion_codes` : `max_redemptions: 1`, `expires_at`, `customer`) et appliqués **automatiquement** via le lien du bouton (`/pro/abonnement/[offre]?facturation=…&code=…`). L'artisan n'a rien à saisir.
- Montée en gamme en cours de période : `proration_behavior: 'create_prorations'` (Visibilité restante déduite).
- La position est calculée à partir du classement réel de l'annuaire sur la requête « métier + commune du siège ».

---

## 7. Juridique

- Entre professionnels (CNIL) : prospection par email **sans consentement préalable** possible si le message concerne **l'activité professionnelle** du destinataire, qu'il est informé de l'utilisation de son adresse et qu'il peut s'opposer simplement.
  - Nouvelle catégorie **`offres_pro`**, **activée par défaut** pour les pros. Désabonnement en un clic dans chaque email. Mention : « Vous recevez cet email en tant que professionnel… ».
  - Le formulaire d'estimation mentionne l'usage de l'email à côté du bouton.
- **Aucun email** à des adresses achetées ou collectées sans contact préalable.
- **SMS commerciaux** : aucun. Seuls les SMS de relance d'inscription (S2) et d'activité sont envoyés.
- Remises : prix de référence réel affiché (règle du prix barré), date de fin affichée.
- **À faire valider par un juriste** avant le lancement.

---

## 8. Mesure (Admin › Finances › Conversion)

Entonnoir par semaine d'inscription : prospect → inscription commencée → terminée → en ligne (≤ 7 j) → 1er paiement (J+30, J+60, J+90) → Premium (J+90). Plus : Visibilité → Premium à 90 j, part d'annuel, résiliations mensuelles, revenu par artisan, **revenu par email envoyé** et **gain par rapport au groupe témoin** pour chaque séquence et chaque modèle.

Cibles de départ, à recaler après 8 semaines :
- prospect → inscrit : 25 % ;
- gratuit → payant à J+30 : 12 % ;
- Visibilité → Premium à 90 j : 10 % ;
- part d'annuel : 60 %.

---

## 9. Implémentation Firebase (automatisme complet)

Aucune action manuelle n'est nécessaire : tout est piloté par des Functions v2 (`europe-west1`), dans `functions/src/cycle/`.

### Déclencheurs
| Function | Type | Rôle |
|---|---|---|
| `cycleOnProspectCreate` | `onDocumentCreated('prospects/{id}')` | envoie `prospect-estimation`, démarre S1 |
| `cycleOnArtisanWrite` | `onDocumentWritten('artisans/{id}')` (compare avant / après ; ignore si ni `statut`, ni `enLigne`, ni `completude` n'ont changé) | détecte les changements d'étape (brouillon → compte → en ligne) ; bascule de séquence |
| `cycleOnAbonnement` | appelée par le webhook Stripe (`customer.subscription.*`, `invoice.paid`) | étape `visibilite` / `premium` / `resiliation` / `ancien_client`, compteur d'échéances (S7) |
| `cycleOnAttribution` | `onDocumentCreated('demandes/{demandeId}/attributions/{artisanId}')` (exclusives Premium uniquement) | signal `demandesExclusivesManquees` pour les artisans éligibles non Premium du secteur |
| `cycleOnDeblocage` | `onDocumentCreated('appelsOffres/{aoId}/deblocages/{artisanId}')` | cumul `creditsAchetes30j` → signal `prem-credits` |
| `cycleOnDemandeProspect` | `onDocumentCreated('demandes/{id}')` | recherche des prospects du métier à moins de 15 km (geohash) → `prospect-demande-zone` |
| `cycleOnResendEvent` | webhook Resend (`/api/resend/webhook`) | ouvertures, clics, `emailsNonOuvertsConsecutifs`, mise en veille |
| `cycleOnReponseEmail` | Resend Inbound (`julie@…`) | tâche `reponse_commerciale`, pause de la séquence |

### Planifiées (`onSchedule`, fuseau `Europe/Paris`)
| Fréquence | Function | Rôle |
|---|---|---|
| 5 h chaque jour | `cycleCalculer` | signaux et score de chaque entreprise active (lots de 200, Cloud Tasks) ; `offreCible` ; signaux de position et de concurrents |
| 7 h 00 et 18 h 15 | `cyclePlanifier` | pour chaque entreprise : prochaine étape de sa séquence ou signal en attente → contrôle de la pression → `notifier()` avec `envoyerLe` = 7 h 15 ou 18 h 30 |
| Lundi 7 h | `cycleHebdo` | `prem-demandes-manquees` |
| 1er du mois, 7 h | `cycleMensuel` | `resume-zone-mensuel`, encarts du `rapport-mensuel` |
| Chaque heure | `cycleCodesExpires` | désactive les codes expirés dans Stripe, trace `code_expire` |
| Chaque nuit | `cycleAgreger` | `cycleStats/{jour}` : entonnoir, envois, conversions, revenu attribué, groupe témoin |

### Moteur de séquences
- Les séquences sont des **données** (`sequences/{id}` : nom, étape d'entrée, objectif, étapes [modèle, déclencheur `immediat|delai|signal|planifie`, valeur, A/B], `actif`), **créées, modifiées, dupliquées, mises en pause et supprimées depuis l'admin** sans déploiement (`adminSequenceCreer`, `adminSequenceModifier`, `adminSequenceSupprimer`). Chaque enregistrement crée une version (`sequences/{id}/versions`). Suppression : double confirmation (saisie de l'identifiant), motif obligatoire, choix du devenir des entreprises en cours (arrêt ou bascule vers une autre séquence).
- `cycleEtat/{artisanId}` (voir §6) : étape, séquence, pas courant, prochain envoi, pauses. Toute écriture se fait en transaction.
- Chaque envoi passe par `notifier()` (idempotence, préférences, file Cloud Tasks) ; `encoreValable()` est réévalué **au moment de l'envoi**.
- Interrupteur général : `config/cycle.actif` (Remote Config). S'il est coupé, plus aucun email commercial ne part, mais les traces continuent.

### Traces (`cycleTraces/{id}`) visibles dans l'admin
Chaque décision est journalisée, **y compris les non-envois** :
- **Volume maîtrisé** : on trace les **décisions** (signal, étape, planifié, envoyé, bloqué, annulé, code, conversion, action admin). Les ouvertures et les clics ne créent pas de trace : ils sont comptés sur `emails/{id}` et dans `cycleStats`. TTL des traces : **6 mois**.
- `type` :
  - `signal_detecte`, `etape_changee`, `score_calcule` ;
  - `email_planifie`, `email_envoye`, `email_annule`, `email_bloque` (avec `raison` : `pression`, `preferences`, `veille`, `temoin`, `plus_valable`, `interrupteur`) ;
  - `code_cree`, `code_utilise`, `conversion`, `tache_creee`, `action_admin`.
- Autres champs : `entrepriseId`, `sequence`, `modele`, `variante`, `details`, `function`, `traceId` (corrélé à Cloud Logging), `createdAt`. TTL 6 mois.
- **Attribution du revenu** : une conversion est attribuée au dernier email cliqué dans les 7 jours (sinon « sans email »). C'est le calcul du revenu par modèle.
- Actions admin (callables, `auditLog`) :
  - `adminCyclePause`, `adminCycleReprendre`, `adminCycleForcerEtape`, `adminCycleExclure` ;
  - `adminSequenceModifier`, `adminCycleTesterEnvoi` (envoie le modèle à l'admin avec les données réelles de l'artisan) ;
  - `adminTacheTraiter`.

### Permissions
`conversion.lire`, `conversion.piloter` (pause, forcer, tâches), `conversion.configurer` (séquences, remises, interrupteur).

---

## 10. Tests

- `calculerCycle` : score, offre cible, changement d'étape, groupe témoin jamais contacté
- `encoreValable` de chaque modèle : aucun envoi après conversion, sans chiffres ou en veille
- Codes promo : usage unique, expiration, refus d'une 2e remise dans les 90 jours
- Playwright + Mailpit : parcours prospect → inscription (S1 annulée), gratuit → offre J+14 → paiement avec code appliqué, Visibilité → Premium avec prorata
