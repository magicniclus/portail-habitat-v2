# Assistant IA de l'admin

Un auditeur IA dont **l'unique objectif est d'augmenter le taux de conversion**. À la demande, il analyse **toutes les données du site ou la partie choisie** (landings et comportement, parcours et formulaires, emails et séquences, offres et prix, fiches artisans) et rend soit des **points d'amélioration**, soit un **audit complet** de ce qu'il faut changer.

### Deux modes
| Mode | Sortie |
|---|---|
| **Points d'amélioration** | 3 à 6 actions à fort gain, classées par gain attendu / effort |
| **Audit complet** | chaque étape de l'entonnoir notée de 0 à 100 avec son constat, puis 6 à 12 actions, les étapes les plus faibles d'abord, et un gain total estimé |

Étapes de l'entonnoir utilisées partout : Acquisition (trafic) · Landing → intérêt · Inscription / demande · Activation (fiche en ligne) · 1er paiement · Montée en gamme · Rétention.

**Tout ce qui n'a pas d'effet mesurable sur la conversion est hors sujet** (esthétique, image de marque, SEO pur) : le prompt système l'interdit.
Maquette : `designs/Admin IA.dc.html`.

---

## 1. Principes
1. **Des preuves, pas des opinions.** Chaque recommandation cite ses sources (chiffre, page, élément, période) et indique un niveau de confiance. Sans donnée suffisante, l'assistant le dit.
2. **Actionnable.** Chaque recommandation propose une action exécutable depuis l'admin : créer une tâche, préparer un test A/B, proposer un nouveau texte, modifier une étape de séquence. **Rien n'est appliqué sans validation humaine.**
3. **Données minimales.** L'assistant reçoit des **agrégats et du contenu public**, jamais de données personnelles (noms, emails, téléphones, contenus des messages).
4. **Traçable.** Chaque analyse, chaque question et chaque action proposée est enregistrée (`iaAnalyses`), avec le modèle, le coût et les sources utilisées.

---

## 2. Périmètres d'analyse

| Périmètre | Contexte fourni au modèle |
|---|---|
| Landings et pages publiques | texte et structure des sections (extraits du rendu), agrégats de comportement (COMPORTEMENT.md), conversion par variante, alertes ouvertes |
| Emails et séquences | modèles (sujet, preheader, blocs), statistiques par étape (ouverture, clic, conversion, désabonnements), traces de blocage |
| Offres et prix | grille actuelle, conversion par formule, part d'annuel, résiliations et motifs, prix des appels d'offres et taux de déblocage |
| Fiches artisans | complétude, photos, délais de réponse, notes (agrégats par métier et zone) ; recommandations de coaching par segment |
| Parcours (simulateur, diagnostic, onboarding) | abandon par étape et par champ, durées |
| Global | synthèse hebdomadaire de tout ce qui précède |

---

## 3. Architecture

```
Admin (onglet IA) ──callable iaAnalyser({ mode: 'rapide'|'audit', perimetres: string[] (ou ['tout']), question?, approfondie? })──► Function (europe-west1)
   1. assertPermission('ia.utiliser') · quota par membre (30 analyses / jour) · journal
   2. construireContexte(perimetre) : lectures Firestore + BigQuery (agrégats), anonymisation, découpage < 60 k tokens
   3. Appel API Claude (Anthropic) : system prompt versionné + outils en lecture seule
   4. Validation Zod de la sortie JSON (schéma §4), rejet ou nouvelle tentative si invalide
   5. écrit iaAnalyses/{id} + iaRecommandations/{id} ; renvoie le résultat
```
- **Modèle** : **Claude Haiku par défaut** (analyses et questions). **Sonnet uniquement** quand l'utilisateur coche « Analyse approfondie » et pour la synthèse du lundi. Configurable dans `config/ia`.
- **Contexte pré-calculé** : chaque nuit, les Functions d'agrégation écrivent `iaContexte/{perimetre}`, un JSON compact (≤ 6 000 tokens) déjà résumé. Une analyse = **un seul appel** sans boucle d'outils ; les outils ne servent qu'en mode approfondi.
- **Mise en cache** : prompt caching Anthropic sur le prompt système + contexte (les questions de suivi coûtent ~10 % du prix) ; même périmètre + même question dans les 24 h → résultat stocké renvoyé sans appel, sauf « Relancer ».
- **Outils exposés au modèle** (lecture seule, exécutés par la Function) :
  - `lireAgregatsPage(page, periode)` ;
  - `lireSequence(id)` ;
  - `lireStatsEmails(modele)` ;
  - `comparerVariantes(test)` ;
  - `lireEntonnoir(periode)` ;
  - `lireContenuPage(page)` ;
  - `lireAlertes()`.

  Le modèle va chercher ce dont il a besoin au lieu de recevoir tout d'un coup.
- **Clé API** dans Secret Manager (`ANTHROPIC_API_KEY`), jamais côté client. Région : appel sortant depuis `europe-west1`. Mention dans la politique de confidentialité (sous-traitant, données agrégées uniquement).
- **Analyse planifiée** : lundi 7 h, **audit complet** sur toutes les données, envoyé aux superadmins (email `ia-synthese-hebdo`) et visible dans l'admin, avec l'évolution des notes d'étape par rapport à la semaine précédente.

---

## 4. Format de sortie (contrat JSON validé par Zod)

```json
{
  "resume": "3 phrases maximum",
  "recommandations": [{
    "titre": "Déplacer le comparatif des offres au-dessus des témoignages",
    "perimetre": "landing:acquisition-artisans",
    "etape": "Landing → intérêt",            // étape de l'entonnoir visée
    "gainEstime": "+1 à +2 pts sur mobile",  // fourchette prudente, en points de conversion de l'étape
    "priorite": 1,                       // 1 = à faire cette semaine
    "impact": "élevé",                   // élevé | moyen | faible
    "effort": "faible",
    "confiance": 0.72,
    "constat": "62 % des sorties ont lieu dans la section témoignages ; seuls 38 % des visiteurs mobiles atteignent les offres.",
    "preuves": [{ "source": "comportementAgregats", "ref": "acquisition-artisans · 30 j · mobile", "valeur": "38 %" }],
    "action": { "type": "ab_test" | "tache" | "texte" | "sequence" | "prix", "details": {} },
    "propositionTexte": "facultatif : nouveau titre, nouvel objet d'email…"
  }],
  "etapes": [{ "etape": "Inscription / demande", "score": 58, "constat": "26 % d'abandon à l'étape compte" }],   // mode audit uniquement
  "gainTotal": "+2 à +3,5 points de conversion inscription",
  "questionsOuvertes": ["Données insuffisantes sur la variante C (84 sessions)."]
}
```
Prompt système (versionné dans `config/ia.promptVersion`) :
- rôle : expert en conversion et en marketing pour une place de marché B2B2C de l'habitat ;
- vocabulaire imposé (DECISIONS D34b : jamais « lead ») ;
- interdiction d'inventer un chiffre ;
- un maximum de 7 recommandations, triées par impact / effort.

---

## 5. Actions depuis une recommandation
| Action | Effet |
|---|---|
| Créer une tâche | `filesModeration` de type `recommandation_ia`, assignable |
| Préparer un test A/B | brouillon `abTests/{id}` prérempli (page, hypothèse, variante décrite), à compléter par un humain |
| Utiliser ce texte | ouvre l'éditeur concerné (séquence, modèle d'email) avec la proposition, **sans enregistrer** |
| Ignorer | statut `ignoree` avec motif : alimente les consignes (« ne plus proposer X ») stockées dans `config/ia.consignes` |
| Marquer faite | statut `faite` ; 30 jours plus tard, l'assistant mesure l'effet et l'indique sur la carte |

---

## 6. Données
```
iaContexte/{perimetre}   json compact, tokensEstimes, updatedAt (réécrit chaque nuit)
iaAnalyses/{id}          mode, perimetres[], etapes[] (audit), gainTotal,
                         perimetre, question?, demandePar, modele, promptVersion, tokensEntree, tokensSortie,
                         coutCentimes, dureeMs, sources[], resume, statut ('ok'|'erreur'), createdAt
iaRecommandations/{id}   analyseId, titre, perimetre, etape, gainEstime, priorite, impact, effort, confiance, constat, preuves[],
                         action{}, propositionTexte?, statut ('nouvelle'|'en_cours'|'faite'|'ignoree'),
                         motifIgnore?, effetMesure?, createdAt, updatedAt
config/ia                actif, modeleAnalyse, modeleQuestion, promptVersion, quotaJour, budgetMensuelCentimes,
                         consignes[], analyseHebdo: bool
```
Permissions : `ia.utiliser` (lancer, questionner, créer une tâche), `ia.configurer` (modèle, budget, consignes, planification). Toute action issue d'une recommandation passe ensuite par la permission de la section concernée.

## 7. Garde-fous
- Budget mensuel plafonné (`config/ia.budgetMensuelCentimes`, **10 € par défaut**) : alerte à 80 %, coupure à 100 %, message clair dans l'admin. Coût estimé : voir COUTS.md
- Sortie non conforme au schéma → nouvelle tentative (1 fois), puis erreur affichée : aucune recommandation « inventée » n'est enregistrée
- Aucune écriture automatique : l'assistant n'a que des outils de **lecture**
- Tests : jeux de contextes figés → la sortie respecte le schéma, cite des preuves présentes dans le contexte (vérification automatique que chaque valeur citée existe dans les sources)

---

## 8. Assistant de rédaction pour les artisans (même moteur)
Maquette : `designs/Ma Fiche.dc.html`. Le crayon de la présentation « À propos » et le bouton « Ajouter un projet » ouvrent un éditeur avec l'assistant.

| Action | Effet |
|---|---|
| **Relire et corriger** | orthographe, grammaire, ponctuation, typographie française, sans changer le sens ni le style |
| **Réécrire** (4 tons) | Plus professionnel · Plus chaleureux · Plus court · Plus convaincant (ce que vous faites, pour qui et où, pourquoi vous choisir, invitation à demander un devis) |
| **Rédiger à partir des infos** (chantiers) | 2 à 4 phrases à partir du titre, du métier, de la ville et des notes de l'artisan |

- **Même objectif que l'audit** : que les particuliers contactent l'artisan. **Interdiction d'inventer** un fait absent du texte ou des informations vérifiées de la fiche (années, chiffres, certifications, marques, garanties, prix) : vérification automatique côté serveur que les certifications citées existent dans `artisans/{id}.labels`, sinon la proposition est refusée.
- La proposition s'affiche **à côté** du texte : « Remplacer mon texte » ou « Garder le mien ». Rien n'est enregistré ni publié sans validation.
- Callable `iaRediger({ artisanId, type: 'apropos'|'projet'|'reponse_avis'|'message', action: 'relire'|'reecrire'|'generer', ton?, texte, infos })` : permission `fiche.modifier` sur l'entreprise, **Claude Haiku**, 900 tokens max, sortie JSON validée par Zod (`{ texte, changements[] }`).
- **Quota** : 20 utilisations par jour et par entreprise (toutes formules), compteur dans `iaQuotas/{artisanId_jour}` (TTL 2 jours). Plus de quota : message clair, l'édition manuelle reste possible.
- **Limites de longueur** : présentation 1 200 caractères, chantier 400 ; contrôlées aussi côté serveur.
- **Journal minimal** : `iaRedactions/{id}` (`artisanId`, `type`, `action`, `ton`, `accepte`, `tokens`, `coutCentimes`, `createdAt`), **sans le texte** ; TTL 90 jours. Sert à mesurer l'usage et le taux d'acceptation dans Admin › Audit IA.
- Photos des chantiers : 3 maximum par projet, compressées côté client (WebP, 1 600 px), EXIF supprimées (Function `onDocumentUpload`), case « J'ai l'accord du propriétaire » obligatoire (CGV §9).
- Extensions prévues avec la même fonction : réponses aux avis (`reponse_avis`) et premiers messages aux particuliers (`message`).
