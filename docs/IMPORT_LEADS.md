# Envoi des leads à Portail Habitat — format attendu

Pour le site partenaire (simulateur d'aides) qui envoie ses demandes. Chaque lead est envoyé **un par un, en temps réel**, à un webhook HTTPS. Le webhook (Cloud Function `importerDemandePartenaire`, `europe-west1`) valide, déduplique, qualifie puis écrit dans Firestore. **Vous n'écrivez jamais directement dans Firestore.**

Références internes : DATABASE.md §4 bis, MATCHING.md « Demandes partenaires », ACCEPTANCE.md IMP-01 à IMP-06.

---

## 1. Endpoint

```
POST https://europe-west1-<projet>.cloudfunctions.net/importerDemandePartenaire
Content-Type: application/json
X-Api-Key: <clé fournie par Portail Habitat>
X-Source-Id: <identifiant de votre source, ex. simulateur-aides>
```

- Appel depuis une **IP déclarée** (liste `ipAutorisees` de votre source). Toute autre IP → `403`.
- Un environnement `staging` avec sa propre clé est fourni pour les tests.
- Quota journalier par source (`quotaJour`) ; au-delà → `429`.

---

## 2. Corps de la requête (JSON)

```json
{
  "idExterne": "SIM-2026-0918-004512",
  "recueLe": "2026-09-27T09:42:11+02:00",

  "contact": {
    "prenom": "Claire",
    "nom": "Martin",
    "email": "claire.martin@email.fr",
    "telephone": "+33631420045",
    "telephoneVerifie": true
  },

  "chantier": {
    "codePostal": "33600",
    "ville": "Pessac",
    "typeTravaux": "isolation_combles",
    "description": "Combles perdus d'environ 80 m², maison de 1975.",
    "surfaceM2": 80
  },

  "qualification": {
    "statutOccupation": "proprietaire_occupant",
    "horizon": "moins_3_mois"
  },

  "aides": {
    "eligibilite": "eligible",
    "trancheRevenus": "jaune",
    "montantEstimeCentimes": 180000,
    "dispositifs": ["MaPrimeRenov", "CEE"]
  },

  "consentement": {
    "coche": true,
    "texteAffiche": "J'accepte que mes coordonnées soient transmises à Portail Habitat et à des professionnels partenaires afin d'être recontacté pour mon projet.",
    "versionTexte": "v3-2026-06",
    "horodatage": "2026-09-27T09:41:58+02:00",
    "urlPage": "https://simulateur-aides.fr/resultat",
    "ip": "92.184.12.40",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) …",
    "finalites": [
      "transmission_portail_habitat",
      "mise_en_relation_professionnels",
      "rappel_telephonique"
    ]
  }
}
```

### Champs

| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `idExterne` | string (≤ 64) | ✅ | **Unique chez vous**, stable. Sert à l'idempotence : un renvoi avec le même id ne crée rien de plus |
| `recueLe` | ISO 8601 avec fuseau | ✅ | Moment où l'internaute a validé le formulaire |
| `contact.prenom`, `contact.nom` | string | ✅ | |
| `contact.email` | string | ✅ | Format email valide |
| `contact.telephone` | string E.164 | ✅ | `+33…` ; mobile ou fixe français. Invalide → rejet |
| `contact.telephoneVerifie` | bool | ✅ | `true` seulement si vérifié par code SMS chez vous. Sinon nous envoyons le code |
| `chantier.codePostal` | string 5 chiffres | ✅ | Hors zone couverte → rejet |
| `chantier.ville` | string | ✅ | |
| `chantier.typeTravaux` | string | ✅ | **Votre vocabulaire** ; converti en `prestationId` via la table de correspondance convenue (`mappingPrestations`). Type inconnu → rejet `schema_invalide` |
| `chantier.description` | string (≤ 2 000) | — | Texte libre, montré anonymisé aux artisans |
| `chantier.surfaceM2` | number | — | Si connu |
| `qualification.statutOccupation` | `proprietaire_occupant` · `bailleur` · `locataire` · `inconnu` | ✅ | |
| `qualification.horizon` | `moins_3_mois` · `3_6_mois` · `plus_6_mois` · `renseignement` | ✅ | |
| `aides.eligibilite` | `eligible` · `ampleur_seulement` · `non_eligible` | ✅ | Tout sauf `non_eligible` → seuls des artisans **RGE vérifiés** reçoivent la demande |
| `aides.trancheRevenus` | `bleu` · `jaune` · `violet` · `rose` · `null` | — | |
| `aides.montantEstimeCentimes` | integer | — | **En centimes**. Affiché à l'artisan avec la mention « indicatif » |
| `aides.dispositifs` | string[] | — | Ex. `MaPrimeRenov`, `CEE`, `EcoPTZ` |
| `consentement.coche` | `true` | ✅ | Toute autre valeur → rejet |
| `consentement.texteAffiche` | string | ✅ | **Texte exact** de la case cochée ; doit correspondre à `versionTexte` enregistrée chez nous, sinon rejet |
| `consentement.versionTexte` | string | ✅ | Version convenue au contrat |
| `consentement.horodatage` | ISO 8601 | ✅ | Clic sur la case |
| `consentement.urlPage` | URL | ✅ | Page où la case était affichée |
| `consentement.ip`, `consentement.userAgent` | string | ✅ | Hachés à réception, jamais stockés en clair |
| `consentement.finalites` | string[] | ✅ | Doit contenir au moins `transmission_portail_habitat` et `mise_en_relation_professionnels` |

Règles générales : UTF-8, montants **toujours en centimes**, dates **ISO 8601 avec fuseau**, aucun champ inconnu (rejeté par la validation stricte), taille max 32 Ko.

---

## 3. Réponses

| HTTP | `statut` | Signification | Facturé |
|---|---|---|---|
| `201` | `creee` | Demande créée, matching lancé | Oui (7 € HT) |
| `200` | `deja_recue` | Même `idExterne` déjà reçu : on renvoie la même réponse | Non (pas de 2ᵉ facturation) |
| `200` | `doublon` | Même téléphone + même prestation reçu dans les 30 derniers jours | Non |
| `422` | `rejetee` | Voir `motifRejet` ci-dessous | Non |
| `401` / `403` | — | Clé invalide / IP non autorisée | — |
| `429` | — | Quota journalier atteint | — |
| `5xx` | — | Erreur de notre côté : **renvoyez** (même `idExterne`) | — |

```json
{ "statut": "creee", "idExterne": "SIM-2026-0918-004512", "reference": "PH-4F8K2Q", "niveau": "A" }
```
```json
{ "statut": "rejetee", "idExterne": "SIM-2026-0918-004513", "motifRejet": "consentement_absent", "details": "consentement.texteAffiche ne correspond pas à v3-2026-06" }
```

### Motifs de rejet (`motifRejet`)
- `schema_invalide` — champ manquant, mauvais type, `typeTravaux` inconnu
- `consentement_absent` — case non cochée, texte ou version différents, finalités manquantes
- `telephone_invalide` — format ou numéro inexistant
- `hors_zone_couverte` — code postal hors zone
- `doublon_30j` — (renvoyé en `statut: doublon`)

Une demande rejetée ne laisse **aucune donnée personnelle** chez nous ; seul le journal technique est conservé (id, motif, horodatage).

### Renvois
En cas de timeout ou de `5xx`, renvoyez **le même corps avec le même `idExterne`** (backoff exponentiel conseillé : 30 s, 2 min, 10 min, 1 h). L'idempotence garantit qu'aucun doublon n'est créé.

---

## 4. Ce que devient le lead (pour information)

| Collection Firestore | Contenu |
|---|---|
| `importsDemandes/{id}` | Journal : `sourceId`, `idExterne`, `recueLe`, `statut`, `motifRejet?`, `demandeId?`, `payloadHash` — sans données personnelles, 13 mois |
| `preuvesConsentement/{id}` | Votre bloc `consentement` (ip et user-agent hachés), jamais modifié, 5 ans |
| `demandes/{id}` | `source: 'partenaire'`, `partenaire: { sourceId, idExterne, recueLe, coutAchatCentimes: 700 }`, `contact`, `prestationId`, `adresseChantier`, `aides`, `qualification` (score 0-100, niveau A/B/C), `rgeRequis` |

Puis : proposition au premier artisan en **moins de 5 minutes**, dans son rayon (10 à 100 km). Niveau A/B/C calculé chez nous à partir de `telephoneVerifie`, `statutOccupation`, `horizon` et `aides` — vous n'avez pas à l'envoyer.

---

## 5. À convenir avant la mise en ligne
- Clé API et IP de sortie (staging + prod)
- Table de correspondance `typeTravaux` → `prestationId` (liste de nos prestations : `data/prestations.json`)
- Texte exact de la case de consentement et son numéro de version
- Quota journalier et zone couverte (liste des codes postaux ou départements)
