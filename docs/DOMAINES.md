# Domaines, DNS et HTTPS des sites artisans

Maquette : `designs/Site Internet Artisan.dc.html?onglet=domaine`. Hébergement : Vercel (projet unique « sites-artisans », multi-tenant). Registrar : **OVHcloud, compte client ordinaire** (API gratuite, aucun programme revendeur ; clés `OVH_APP_KEY`, `OVH_APP_SECRET`, `OVH_CONSUMER_KEY` ; commande payée par le moyen de paiement enregistré sur le compte), prioritaire ; **Gandi** en secours (`GANDI_TOKEN`, bac à sable `GANDI_BAC_A_SABLE=1`). Paiement : Stripe `site_pro` 9,90 € HT/mois.

**État au 19/11/2026** : cas A, B et C codés (AVANCEMENT §27, journal du 29/10 et du 10/11/2026). **Aucun achat réel n'a encore été fait** : sans clés OVH (ou Gandi) en production, l'achat affiche « L'achat de domaine ouvre très bientôt » et rien n'est commandé ; hors production, un bureau local simule le registrar (disponibilité lue dans le DNS public, commande livrée aussitôt). Secrets Vercel à fournir pour la connexion : `VERCEL_API_TOKEN`, `VERCEL_PROJET_SITES`, `VERCEL_EQUIPE`. Les sites sont servis par l'application Next.js elle-même (pas un projet Vercel séparé « sites-artisans ») : voir SITE_INTERNET §5. **À vérifier par le propriétaire** : `portailtravaux.fr` n'apparaissait pas enregistré dans le DNS public le 29/10/2026 (D13 🔒).

## 1. Trois cas
| Cas | Offre | Qui gère le DNS | Résultat |
|---|---|---|---|
| A. Sous-domaine `{slug}.portailtravaux.fr` | Gratuit | Nous (wildcard) | En ligne immédiatement |
| B. Domaine acheté chez nous | Site Pro | Nous (zone écrite par l'API du registrar : OVH, ou LiveDNS chez Gandi) | En ligne < 15 min, rien à faire pour l'artisan |
| C. Domaine existant de l'artisan | Site Pro | L'artisan, chez son registrar | En ligne après ajout de 3 enregistrements |
Le sous-domaine reste actif dans les cas B et C et **redirige en 301** vers le domaine principal.

## 2. Cas A — sous-domaine
- DNS Portail Travaux (une fois pour toutes) : `*.portailtravaux.fr  CNAME  cname.vercel-dns.com.` + domaine wildcard ajouté au projet Vercel (certificat wildcard géré par Vercel).
- Slug : `^[a-z0-9-]{3,40}$`, pas de tiret en début/fin, unique (index `sitesSlugs/{slug}`), liste réservée (`www`, `admin`, `api`, `pro`, `mail`, `app`, `static`, noms de métiers seuls…). Vérification de disponibilité en direct.
- `proxy.ts` (Next.js 16) lit l'en-tête `Host` et réécrit vers `/s/{hôte}` ; le site est retrouvé par `sitesSlugs` ou `sitesDomaines/{host}` puis rendu (cache partagé de 30 s). En local, « Voir le site » ouvre `{slug}.localhost:port`.

## 3. Cas B — achat de domaine (Site Pro)
Écran : onglet Domaine › « Votre propre domaine » › « Acheter un domaine » (« J'ai déjà un domaine » = cas C). Suivi en 4 étapes à l'écran. Routes `/api/pro/site/domaine/recherche` et `/acheter` (`site.gerer`).
1. Recherche (saisie de l'artisan, ou idées tirées du nom commercial) → registrar choisi par `registrarDepuisEnv` : **OVH** (`/order/cart`) si ses clés sont présentes, sinon **Gandi** (`GET /v5/domain/check`, seul le statut `available` de la création compte), sinon disponibilité lue dans le DNS public (un domaine qui existe ou une panne = « pris », jamais un faux « disponible »). Extensions proposées `.fr .com .eu` (+ variante `nom-ville.fr`). Cache 10 min. Un domaine déjà relié chez nous est « pris ».
2. « Choisir » sans Site Pro → le domaine est mis de côté (`sites/{id}.domaineVoulu`) et la **fenêtre d'offre** s'ouvre (PAIEMENTS §4), jamais d'achat direct ; le webhook Stripe (`synchroniserOffreSite`) lance la commande après paiement. Avec Site Pro : commande immédiate.
3. Commande **au nom de l'entreprise de l'artisan** (contact titulaire = raison sociale, SIREN, siège, email et téléphone de la fiche ; fiche incomplète → refus avec la liste de ce qui manque). Pour `.fr` : éligibilité AFNIC laissée au registrar (à valider). Non livré en 48 h ou refusé → « Non vérifié » avec message ; pas d'alerte admin dédiée.
4. Zone DNS écrite par l'API du registrar (A + CNAME lus chez l'hébergeur Vercel ; anciennes cibles A, AAAA et CNAME retirées ; **MX et TXT jamais touchés** ; renouvellement automatique activé à la livraison, sur les seuls domaines achetés pour un artisan) :
   - `@  A  76.76.21.21`
   - `www  CNAME  cname.vercel-dns.com.`
   - MX / SPF : aucun par défaut (on ne touche pas aux emails) ; option future.
5. Ajout du domaine au projet Vercel (API `POST /v10/projects/{id}/domains` pour `domaine` et `www.domaine`, redirection apex → www ou l'inverse selon choix). HTTPS : certificat Let's Encrypt émis automatiquement par Vercel.
6. Statut `actif` quand Vercel renvoie `verified: true` et que `https://domaine` répond 200 → email `site-domaine-actif`.
- Renouvellement automatique tant que Site Pro est actif. Résiliation : domaine **non** supprimé, renouvellement automatique arrêté (10/11/2026) ; l'artisan reçoit le code de transfert (AuthCode) **une fois par email, jamais écrit en base**, et reste propriétaire jusqu'à l'échéance.
- La tâche `verifierDomaines` fait aussi avancer les achats (`avancerDomaine`). Pas de rappel « ajoutez vos enregistrements » pour un domaine acheté.

## 4. Cas C — domaine existant
Écran : l'artisan saisit son domaine → on affiche les enregistrements à créer **chez son registrar** (OVH, Gandi, IONOS, GoDaddy…), avec bouton copier par ligne et lien d'aide par registrar.

| Type | Nom | Valeur | Rôle |
|---|---|---|---|
| A | `@` | `76.76.21.21` | domaine nu vers nos sites |
| CNAME | `www` | `cname.vercel-dns.com.` | www vers nos sites |
| TXT | `_portailtravaux` | `ph-verif={token}` | preuve que l'artisan contrôle le domaine |
- **Ne jamais coder les valeurs A/CNAME en dur** : les lire depuis la réponse de l'API Vercel lors de l'ajout du domaine (Vercel peut renvoyer des valeurs propres au projet) et les stocker dans `sites/{id}.domaine.enregistrements`.
- TXT sur un sous-nom (`_portailtravaux`) pour ne pas entrer en conflit avec un SPF existant sur `@`.
- `{token}` : 24 caractères aléatoires, généré une fois par (site, domaine).
- Si Vercel exige sa propre vérification (`_vercel TXT vc-domain-verify=…`, domaine déjà utilisé ailleurs), l'ajouter au tableau automatiquement (non vérifié dans le code à cette date).
- Si l'artisan a un CAA restrictif : afficher « Autorisez letsencrypt.org dans votre enregistrement CAA » (non vérifié dans le code à cette date).
- Emails de l'artisan : on ne demande **jamais** de modifier les MX.

### Vérification
- Function planifiée `verifierDomaines` (toutes les 2 min) : chaque domaine est vérifié toutes les 2 min pendant 1 h, puis toutes les 30 min pendant 72 h, puis arrêt (statut `echec`, email `site-domaine-echec` avec ce qui manque).
- Bouton « Vérifier maintenant » = même contrôle immédiat (limité à 1 / 30 s).
- Contrôle par enregistrement par DNS-over-HTTPS (résolveurs publics, pas le cache local) : TXT exact, A contient la valeur attendue (et aucune autre IP), CNAME exact. État par ligne : `en_attente` · `ok` · `incorrect` (avec la valeur trouvée).
- Quand les 3 sont `ok` → `POST /v9/projects/{id}/domains/{domaine}/verify` Vercel → certificat → `actif`.
- L'index des hôtes (`sitesDomaines`) n'est écrit qu'après vérification ; 301 vers l'adresse canonique.
- Après activation : contrôle quotidien (`controlerDomaines`, 6 h) ; si le DNS ne pointe plus vers nous pendant 3 jours → `casse`, index retirés, email `site-domaine-casse`, le sous-domaine reprend le relais (pas de site hors ligne) ; corrigé → réactivé.

## 5. Données
`sites/{siteId}.domaine` :
```
{ nom: "bertrand-renovation.fr", mode: "achat" | "connexion",
  statut: "recherche" | "commande" | "attente_dns" | "verification" | "actif" | "echec" | "casse" | "resilie",
  principal: "www" | "apex", token: "…", enregistrements: [{type, nom, valeur, etat, trouve, verifieLe}],
  prochaineVerifLe?, derniereVerifLe?, incorrectDepuis?, rappelAttenteLe?,
  registrar: { fournisseur: "ovh" | "gandi" | "local", etape, commandeId, commandeLe, authCodeEnvoyeLe } | null,
  creeLe, activeLe }
```
`sites/{siteId}.domaineVoulu { nom, choisiLe }` : domaine mis de côté avant le paiement.
Index : `sitesDomaines/{host}` → site (host = domaine, www.domaine) et `sitesSlugs/{slug}` (sous-domaine). Écrits uniquement par le serveur. (La version initiale prévoyait un index unique `domainesIndex` et un bloc `vercel` dans `domaine` : pas faits ainsi.)

## 6. Règles et sécurité
- Un domaine ne peut être relié qu'à un seul site ; tentative sur un domaine déjà actif ailleurs → refus sans révéler le site.
- Toutes les opérations (achat, ajout Vercel, vérif) côté serveur ; le client n'appelle jamais OVH, Gandi ni Vercel.
- Clés OVH (`OVH_APP_KEY`, `OVH_APP_SECRET`, `OVH_CONSUMER_KEY`, droits `/order/*`, `/me/*`, `/domain/*`), jeton Gandi et clés Vercel en secrets (Vercel et Functions).
- Journal `sites/{id}/journalDomaine` (action, résultat, date ; ni code de transfert ni donnée personnelle) pour le support.
- SEO : une seule URL canonique (domaine principal), 301 depuis le sous-domaine et la variante www/apex, sitemap régénéré au changement de domaine. Search Console (propriété re-vérifiée automatiquement) : **pas encore fait**.

## 7. Emails
`site-domaine-actif`, `site-domaine-attente` (24 h sans DNS : rappel unique avec le tableau), `site-domaine-echec`, `site-domaine-casse`, `site-domaine-renouvele` (J-30, info), `site-domaine-transfert` (AuthCode à la résiliation, canal `secrets` des envois).

## 8. Critères d'acceptation
- **DOM-01** sous-domaine indisponible ou réservé refusé avec message clair ; disponible → site servi en < 5 s
- **DOM-02** achat sans Site Pro → fenêtre d'offre ; aucune **commande** au registrar avant paiement confirmé (la recherche de disponibilité l'interroge avant : lecture à valider par le propriétaire)
- **DOM-03** domaine acheté : titulaire = entreprise de l'artisan (vérifié dans le WHOIS/RDAP) — vérifiable seulement avec un vrai compte OVH
- **DOM-04** cas C : chaque ligne passe `ok` indépendamment ; valeur erronée → état `incorrect` + valeur trouvée
- **DOM-05** HTTPS valide sur domaine, www et sous-domaine ; 301 vers l'URL canonique
- **DOM-06** DNS retiré 3 jours → statut `casse`, email, sous-domaine toujours en ligne
- **DOM-07** résiliation Site Pro : **renouvellement automatique arrêté** pour ce domaine (Portail Travaux ne le paie plus), domaine conservé par l'artisan jusqu'à échéance, AuthCode envoyé, site repasse sur le sous-domaine. Le renouvellement automatique n'est jamais activé que sur les domaines achetés pour un artisan : les autres domaines du compte du registrar ne sont pas touchés.
- **DOM-08** aucun MX modifié, ni en achat ni en connexion
