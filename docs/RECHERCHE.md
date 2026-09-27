# Recherche de projet (« Quel est votre projet ? »)

Le champ de l'accueil (et celui de l'annuaire) doit **comprendre ce que tape un particulier**, avec ses mots, ses abréviations et ses fautes, et l'orienter vers le bon parcours : simulateur de la bonne prestation, ou demande libre vers le bon métier.

Maquette de référence : `designs/Accueil Particuliers.dc.html` + moteur `designs/recherche-projets.js` (logique complète, testable dans le navigateur).
Données : **`data/recherche-intentions.json`** — 137 intentions de projet (**toutes reliées à une prestation estimable en ligne**), 1 435 mots-clés et formulations, 60 métiers du bâtiment (avec alias, famille et prestation par défaut), 62 synonymes et abréviations.

---

> **Référentiel unique** : les mêmes métiers et intentions servent à la recherche des particuliers, à l'inscription des artisans (listes déroulantes de métiers + chantiers acceptés, COMPTES §3.1 bis), au simulateur, à l'annuaire et au matching. Fonctions : `rechercher(q)` (projets), `intentionsDuMetier(id)`, `rechercherMetiers(q)` (réservée aux filtres de l'annuaire et de l'admin, **pas** à l'inscription).

## 1. Modèle de données

### `referentiel/recherche/intentions/{id}` (lecture publique, écriture admin)
| Champ | Rôle |
|---|---|
| `libelle` | ce qui s'affiche dans la suggestion (« Douche à l'italienne ») |
| `metier` | id du métier (routage vers les artisans, filtre annuaire) |
| `prestation` | id de la prestation estimable (obligatoire : 112 prestations couvrent tous les projets ; `diagnostic` mène au parcours diagnostic) |
| `motsCles[]` | synonymes, formulations, marques, fautes fréquentes (« douche plain pied », « walk-in », « receveur extra plat ») |
| `popularite` | 1 à 5, départage les ex æquo ; recalculé chaque mois à partir des demandes réelles |
| `actif` | masquer sans supprimer |
| `saison?` | ex. `ete` pour climatisation, `automne` pour ramonage : léger bonus en saison |

### `referentiel/recherche/synonymes/global` (un document)
Abréviations et équivalences appliquées **avant** la recherche : `sdb → salle de bain`, `pac → pompe à chaleur`, `clim`, `wc`, `ite`, `vmc`, `appart`, `reno`, `carlage → carrelage`… Deux types :
- **équivalence** (dans les deux sens) : `toilettes ⇄ wc`
- **développement** (un sens) : `sdb → salle de bain`

### `referentiel/recherche/metiers/{id}`
Nom affiché, alias de recherche (« couvreur zingueur », « frigoriste »…), famille, prestation estimable par défaut, lien annuaire. 60 métiers : gros œuvre, toiture et façade, second œuvre, fluides et énergie, extérieur, sécurité, conception, dépannage.

---

## 2. Traitement d'une requête

1. **Normalisation** : minuscules, accents retirés, `œ → oe`, apostrophes et tirets → espace, ponctuation retirée
2. **Mots vides** retirés (`de, la, mon, pour, faire, prix, devis, combien, urgent…`), sauf si la requête n'en contient pas d'autres
3. **Racinisation légère** : pluriels (`fenetres → fenetre`, `travaux → traval`), sans lemmatiseur lourd
4. **Synonymes** : chaque mot devient un groupe {mot + synonymes} ; un groupe est satisfait si l'un de ses membres correspond (le synonyme ne compte pas comme mot manquant)
5. **Correction orthographique** : distance de Damerau-Levenshtein ≤ 1 (4 à 7 lettres) ou ≤ 2 (8 lettres et plus), contre le vocabulaire des intentions. Le **dernier mot** est traité en préfixe (l'utilisateur est en train de taper)
6. **Score** par intention :
   - correspondance exacte 3, préfixe 2,2, approchée 1,6
   - chaque mot pondéré par son **IDF** (un mot rare comme « italienne » pèse plus que « remplacer »)
   - bonus d'expression : libellé qui commence par la requête +5, mot-clé identique +4,5, contient +2 à +3,5
   - pénalité de couverture (mots importants non trouvés) ; une intention qui couvre moins de 55 % du poids de la requête est écartée
   - + popularité × 0,6
7. **Seuil relatif** : on n'affiche que les résultats ≥ 34 % du meilleur score (pas de suggestions hors sujet)
8. Détection d'**urgence** (« urgent », « fuite », « ce soir »…) → message dédié et délai « Dès que possible » présélectionné

---

## 3. Interface

- Liste déroulante sous le champ dès **2 caractères** (délai 120 ms), 7 suggestions maximum
- **Champ vide au focus** : « Projets les plus demandés » (popularité 5)
- Chaque suggestion : loupe, **libellé avec les mots reconnus en gras**, métier en dessous, badge « Estimation en ligne » si un simulateur existe
- En tête si correction : « Résultats pour **douche italienne** »
- Pied : « Métiers : Plombier · Chauffagiste » (liens vers l'annuaire filtré)
- **Aucun résultat** : message rassurant, la saisie libre reste possible (un conseiller oriente la demande) ; la requête est enregistrée pour enrichir la base (§5)
- Sous le formulaire, les chips « Projets populaires » deviennent **« Projets associés »** (même métier) une fois qu'une recherche a donné un résultat
- Clavier : ↓ ↑ pour naviguer, Entrée pour choisir, Échap pour fermer ; ARIA `combobox` + `listbox` + `aria-activedescendant`
- Mobile : la liste prend toute la largeur, cibles de 44 px minimum
- **Validation du formulaire** :
  - suggestion choisie avec `prestation` → `/simulateur?prestation=sdb&cp=…&intention=sdb-italienne` (le simulateur démarre directement à l'étape 2)
  - suggestion sans prestation → demande libre avec le métier présélectionné
  - rien de choisi : le meilleur résultat est pris **s'il est net** (score ≥ 8), sinon demande libre

---

## 4. Production

- **Typesense** (voir DECISIONS.md D4), collection `intentions` : champs `libelle`, `motsCles`, `metier`, `popularite`
  - `query_by: libelle,motsCles`, `query_by_weights: 3,2`, `prefix: true`, `num_typos: 2`, `typo_tokens_threshold: 1`, `drop_tokens_threshold: 1`, `sort_by: _text_match:desc,popularite:desc`
  - synonymes Typesense générés depuis `referentiel/recherche/synonymes` (script de synchronisation déclenché à chaque modification)
  - **mots vides** configurés côté Typesense (`stopwords` FR + la liste ci-dessus)
- **Repli sans réseau / avant le chargement** : `packages/core/recherche` (portage TypeScript de `recherche-projets.js`) embarqué dans la page, avec un index compact (~40 Ko gzip) chargé au premier focus du champ. Même résultat qu'en ligne à 95 % ; c'est lui qui sert pour les tests de pertinence
- Appel : Route Handler `/api/recherche?q=` en Edge, cache CDN 1 h par requête normalisée, limite 30 requêtes / min / IP
- La même recherche alimente l'annuaire (`/artisans?q=`) : l'intention reconnue devient le filtre métier + les tags

---

## 5. Amélioration continue (admin)

- Journal `evenements` : `recherche_saisie` (requête normalisée, **sans données personnelles**), `recherche_choix` (intention, rang), `recherche_zero` (aucun résultat), `recherche_abandon`
- Écran admin **Configuration → Recherche** :
  - top des requêtes sans résultat de la semaine, avec bouton « Ajouter comme mot-clé de… » (choix de l'intention)
  - requêtes où l'utilisateur choisit souvent la 3e suggestion ou plus bas → pertinence à revoir
  - édition des intentions, mots-clés, synonymes ; publication versionnée et auditée (comme les prix)
  - **banc d'essai** : saisir une requête, voir le classement et le détail du score
- Popularité recalculée chaque mois à partir des demandes envoyées

---

## 6. Tests de pertinence

Fichier `packages/core/recherche/__tests__/pertinence.cases.json` : au moins **200 requêtes** avec l'intention attendue en **1re position** (ou dans le top 3 pour les requêtes vagues). Exemples obligatoires :

| Requête | Attendu en 1er |
|---|---|
| `renovation de salle de bain` | `sdb-renovation` |
| `sdb` | `sdb-renovation` |
| `douche italiene` (faute) | `sdb-italienne` |
| `carlage` (faute) | `carrelage-sol` |
| `refaire ma cuisine` | `cuisine-renovation` |
| `pac` | `pac-air-eau` |
| `remplacer chaudiere fioul par pompe a chaleur` | `pac-air-eau` |
| `chaudier` (préfixe) | `chaudiere` |
| `toit qui fuit urgent` | `toiture-fuite` + urgence détectée |
| `wc bouché` | `plomberie-debouchage` |
| `ipn` | `mur-porteur` |
| `volet roulant bloqué` | `volets` |
| `isolation combles perdus` | `isolation-combles` |
| `mettre une borne de recharge` | `borne-recharge` |
| `peindre mon salon` | `peinture-interieure` |
| `fosse septique` | `assainissement` |
| `xyzabc` | aucun résultat |

Règle en CI : **≥ 95 %** des cas au 1er rang, **100 %** dans le top 3. Toute modification des données ou de l'algorithme rejoue le fichier.

## 7. Critères d'acceptation
- **RCH-01** : taper `sdb ita` affiche « Douche à l'italienne » en 1er avec « ita » en gras
- **RCH-02** : `douche italiene` affiche « Résultats pour douche italienne »
- **RCH-03** : ↓ puis Entrée choisit la suggestion ; Échap ferme la liste ; le focus reste dans le champ
- **RCH-04** : choisir une suggestion avec estimation et valider ouvre le simulateur directement à l'étape 2 de la bonne prestation, code postal prérempli
- **RCH-05** : une requête sans résultat affiche le message d'orientation et laisse valider ; l'événement `recherche_zero` est enregistré
- **RCH-06** : après un résultat, les chips deviennent « Projets associés » du même métier
- **RCH-07** : `toit qui fuit urgent` affiche le message d'urgence
- **RCH-08** : lecteur d'écran : le nombre de suggestions et l'option active sont annoncés
