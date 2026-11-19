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
Admin (onglet IA) ──action serveur adminAnalyseIa({ mode: 'rapide'|'audit', perimetres, question?, approfondie? })──► site (Vercel)
   1. actionAdmin : permission 'ia.utiliser', double authentification, audit · quota par membre (30 analyses / jour) · budget du mois
   2. lireContextesIa(perimetres) : documents iaContexte/{perimetre} pré-calculés la nuit (agrégats Firestore, aucune donnée personnelle)
   3. Appel API Claude (Anthropic, @anthropic-ai/sdk dans @ph/firebase) : prompt système versionné + contexte, mis en cache
   4. Validation Zod de la sortie JSON (schéma §4) + contrôle que chaque valeur citée existe dans le contexte ; une nouvelle tentative, sinon échec
   5. écrit iaAnalyses/{id} + iaRecommandations/{id} ; renvoie le résultat
```
> **Fait autrement que prévu (lot 13c, 05/10/2026)** : l'analyse est une **action serveur du site** et non une Function appelable (comme toutes les écritures du back-office) ; la synthèse du lundi (`iaSyntheseHebdo`) et le contexte de nuit (`iaContexteNuit`) sont des Functions. La clé doit donc être posée côté site **et** côté Functions. **Pas de BigQuery** (COMPORTEMENT §3) et **pas d'outils** donnés au modèle : une analyse = un seul appel avec le contexte pré-calculé.
- **Modèles** (`packages/core/src/ia/couts.ts`) : **Claude Haiku 4.5 par défaut** (`claude-haiku-4-5`), **Claude Sonnet 5.5** (`claude-sonnet-5-5`) pour « Analyse approfondie » et la synthèse du lundi, avec repli serveur si le modèle décline. Configurable dans `config/ia` (`modeleDefaut`, `modeleApprofondi`).
- **Contexte pré-calculé** : chaque nuit (3 h 30, après l'agrégation du comportement), `iaContexteNuit` écrit `iaContexte/{perimetre}` (landings, parcours, emails, offres, fiches), un JSON compact (≤ 6 000 tokens) déjà résumé ; seuls les périmètres choisis sont envoyés.
- **Mise en cache** : prompt caching Anthropic sur le prompt système + contexte (les questions de suivi coûtent ~10 % du prix) ; même périmètre + même question dans les 24 h → résultat stocké renvoyé sans appel (`cleCache`), sauf « Relancer ».
- **Outils exposés au modèle** (`lireAgregatsPage`, `lireSequence`, `lireStatsEmails`, `comparerVariantes`, `lireEntonnoir`, `lireContenuPage`, `lireAlertes`) : **pas faits** (raison non consignée ; l'analyse se contente du contexte pré-calculé).
- **Clé API** (`ANTHROPIC_API_KEY`) côté serveur seulement, jamais côté client ; sans clé, l'écran l'indique et le bouton est désactivé. Mention dans la politique de confidentialité (sous-traitant, données agrégées uniquement).
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
| Utiliser ce texte | **copie la proposition** ; l'ouverture directe d'un éditeur n'est pas faite (il n'existe pas d'éditeur des textes d'emails ou de pages dans l'admin : les modèles d'email sont dans le code) |
| Ignorer | statut `ignoree` avec motif : alimente les consignes (« ne plus proposer X ») stockées dans `config/ia.consignes` |
| Marquer faite | statut `faite` ; 30 jours plus tard, `iaContexteNuit` mesure l'effet (au plus 10 par nuit, Haiku compare les preuves d'origine au contexte du jour, sinon « Effet non mesurable ») et l'indique sur la carte |

---

## 6. Données
```
iaContexte/{perimetre}   json compact, tokensEstimes, updatedAt (réécrit chaque nuit)
iaAnalyses/{id}          mode, perimetres[], etapes[] (audit), gainTotal,
                         perimetre, question?, demandePar, modele, promptVersion, tokensEntree, tokensSortie,
                         coutCentimes, dureeMs, sources[], resume, statut ('ok'|'erreur'), createdAt
iaRecommandations/{id}   analyseId, titre, perimetre, etape, gainEstime, priorite, impact, effort, confiance, constat, preuves[],
                         action{}, propositionTexte?, statut ('nouvelle'|'en_cours'|'faite'|'ignoree'),
                         motifIgnore?, faiteLe?, effet? (mesure à 30 jours), createdAt, updatedAt
                         (iaAnalyses porte aussi cleCache et suivis[] : questions de suivi, 10 au plus)
config/ia                actif, modeleDefaut, modeleApprofondi, promptVersion, quotaJour (30), budgetMensuelCentimes (1000),
                         consignes[], analyseHebdo: bool   (réglables à l'écran, audit adminReglagesIa)
```
Permissions : `ia.utiliser` (lancer, questionner, créer une tâche), `ia.configurer` (modèle, budget, consignes, planification). Toute action issue d'une recommandation passe ensuite par la permission de la section concernée.

## 7. Garde-fous
- Budget mensuel plafonné (`config/ia.budgetMensuelCentimes`, **10 € par défaut**) : alerte à 80 %, coupure à 100 %, message clair dans l'admin. Coût estimé : voir COUTS.md
- Sortie non conforme au schéma → nouvelle tentative (1 fois), puis erreur affichée : aucune recommandation « inventée » n'est enregistrée
- Conversion dollars → euros à 0,95 pour le budget (choix du lot 13c)
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
- Route `POST /api/pro/redaction` (et `/api/pro/redaction/acceptee` pour le taux d'acceptation), au lieu de la callable `iaRediger` prévue : types `apropos`, `projet` et `accroche`, actions `relire`, `reecrire` (4 tons) et `generer` (chantier) ; permission `fiche.modifier` sur l'entreprise, **Claude Haiku 4.5**, 900 tokens max, sortie JSON validée par Zod (`{ texte, changements[] }`).
- **Quota** : 20 utilisations par jour et par entreprise (toutes formules), compteur dans `iaQuotas/{artisanId_jour}` (TTL 2 jours). Plus de quota : message clair, l'édition manuelle reste possible.
- **Limites de longueur** : présentation 1 200 caractères, chantier 400 ; contrôlées aussi côté serveur.
- **Journal minimal** : `iaRedactions/{id}` (`artisanId`, `type`, `action`, `ton`, `accepte`, `tokens`, `coutCentimes`, `createdAt`), **sans le texte** ; TTL 90 jours. Sert à mesurer l'usage et le taux d'acceptation dans Admin › Audit IA.
- Photos des chantiers : 3 maximum par projet, compressées côté client (WebP, 1 600 px), case « J'ai l'accord du propriétaire » obligatoire (CGV §9). La suppression des EXIF par une Function `onDocumentUpload` n'est **pas encore faite** (DATABASE §13).
- Extensions prévues avec la même fonction, **pas encore faites** : réponses aux avis (`reponse_avis`) et premiers messages aux particuliers (`message`). D'autres usages de Claude existent ailleurs (IA du site, blog, Studio : IA_SITE.md, BLOG.md, STUDIO.md).
