# Domaines, DNS et HTTPS des sites artisans

Maquette : `designs/Site Internet Artisan.dc.html?onglet=domaine`. Hébergement : Vercel (projet unique « sites-artisans », multi-tenant). Registrar : OVHcloud (compte revendeur, API). Paiement : Stripe `site_pro` 9,90 € HT/mois.

## 1. Trois cas
| Cas | Offre | Qui gère le DNS | Résultat |
|---|---|---|---|
| A. Sous-domaine `{slug}.portailtravaux.fr` | Gratuit | Nous (wildcard) | En ligne immédiatement |
| B. Domaine acheté chez nous | Site Pro | Nous (zone OVH créée par API) | En ligne < 15 min, rien à faire pour l'artisan |
| C. Domaine existant de l'artisan | Site Pro | L'artisan, chez son registrar | En ligne après ajout de 3 enregistrements |
Le sous-domaine reste actif dans les cas B et C et **redirige en 301** vers le domaine principal.

## 2. Cas A — sous-domaine
- DNS Portail Travaux (une fois pour toutes) : `*.portailtravaux.fr  CNAME  cname.vercel-dns.com.` + domaine wildcard ajouté au projet Vercel (certificat wildcard géré par Vercel).
- Slug : `^[a-z0-9-]{3,40}$`, pas de tiret en début/fin, unique, liste réservée (`www`, `admin`, `api`, `pro`, `mail`, `app`, `static`, noms de métiers seuls…). Vérification de disponibilité en direct (`sites` where slug ==).
- Le middleware Next.js lit l'en-tête `Host`, retrouve `sites/{siteId}` via `domainesIndex/{host}`, rend le site.

## 3. Cas B — achat de domaine (Site Pro)
1. Recherche : Function `domaineDisponibilite(q)` → API OVH `/order/cart` + `/domain/...`, extensions proposées `.fr .com .eu` (+ variante `-ville.fr`). Cache 10 min.
2. Clic sur un domaine sans Site Pro → **fenêtre d'offre** (PAIEMENTS §4), jamais d'achat direct.
3. Après paiement Stripe confirmé (webhook) : commande OVH **au nom de l'entreprise de l'artisan** (contact propriétaire = raison sociale, SIREN, adresse de la fiche vérifiée ; Portail Travaux = contact technique). Pour `.fr` : éligibilité AFNIC vérifiée avec le SIREN.
4. Zone DNS créée par API OVH :
   - `@  A  76.76.21.21`
   - `www  CNAME  cname.vercel-dns.com.`
   - MX / SPF : aucun par défaut (on ne touche pas aux emails) ; option future.
5. Ajout du domaine au projet Vercel (API `POST /v10/projects/{id}/domains` pour `domaine` et `www.domaine`, redirection apex → www ou l'inverse selon choix). HTTPS : certificat Let's Encrypt émis automatiquement par Vercel.
6. Statut `actif` quand Vercel renvoie `verified: true` et que `https://domaine` répond 200 → email `site-domaine-actif`.
- Renouvellement automatique tant que Site Pro est actif. Résiliation : domaine **non** supprimé ; l'artisan reçoit le code de transfert (AuthCode) et reste propriétaire jusqu'à l'échéance.

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
- Si Vercel exige sa propre vérification (`_vercel TXT vc-domain-verify=…`, domaine déjà utilisé ailleurs), l'ajouter au tableau automatiquement.
- Si l'artisan a un CAA restrictif : afficher « Autorisez letsencrypt.org dans votre enregistrement CAA ».
- Emails de l'artisan : on ne demande **jamais** de modifier les MX.

### Vérification
- Function planifiée `verifierDomaines` : toutes les 2 min pendant 1 h, puis toutes les 30 min pendant 72 h, puis arrêt (statut `echec`, email `site-domaine-echec` avec ce qui manque).
- Bouton « Vérifier maintenant » = même contrôle immédiat (limité à 1 / 30 s).
- Contrôle par enregistrement (résolveurs publics 1.1.1.1 et 8.8.8.8, pas le cache local) : TXT exact, A contient la valeur attendue (et aucune autre IP), CNAME exact. État par ligne : `en_attente` · `ok` · `incorrect` (avec la valeur trouvée).
- Quand les 3 sont `ok` → `POST /v9/projects/{id}/domains/{domaine}/verify` Vercel → certificat → `actif`.
- Après activation : contrôle quotidien ; si le DNS ne pointe plus vers nous pendant 3 jours → `casse`, email, le sous-domaine reprend le relais (pas de site hors ligne).

## 5. Données
`sites/{siteId}.domaine` :
```
{ nom: "bertrand-renovation.fr", mode: "achat" | "connexion",
  statut: "recherche" | "commande" | "attente_dns" | "verification" | "actif" | "echec" | "casse" | "resilie",
  principal: "www" | "apex", token: "…", enregistrements: [{type, nom, valeur, etat, trouve, verifieLe}],
  registrar: { fournisseur: "ovh", commandeId, expireLe, authCodeEnvoyeLe } | null,
  vercel: { ajouteLe, verifie, certificatLe }, creeLe, activeLe }
```
`domainesIndex/{host}` → `{ siteId }` (host = domaine, www.domaine, slug.portailtravaux.fr). Écrit uniquement par les Functions.

## 6. Règles et sécurité
- Un domaine ne peut être relié qu'à un seul site ; tentative sur un domaine déjà actif ailleurs → refus sans révéler le site.
- Toutes les opérations (achat, ajout Vercel, vérif) côté Functions ; le client n'appelle jamais OVH ni Vercel.
- Clés API OVH / Vercel dans Secret Manager.
- Journal `sites/{id}/journalDomaine` (action, résultat, date) pour le support.
- SEO : une seule URL canonique (domaine principal), 301 depuis le sous-domaine et la variante www/apex, sitemap régénéré au changement de domaine, Search Console : propriété re-vérifiée (TXT) automatiquement.

## 7. Emails
`site-domaine-actif`, `site-domaine-attente` (24 h sans DNS : rappel avec le tableau), `site-domaine-echec`, `site-domaine-casse`, `site-domaine-renouvele` (J-30, info), `site-domaine-transfert` (AuthCode à la résiliation).

## 8. Critères d'acceptation
- **DOM-01** sous-domaine indisponible ou réservé refusé avec message clair ; disponible → site servi en < 5 s
- **DOM-02** achat sans Site Pro → fenêtre d'offre ; aucun appel OVH avant paiement confirmé
- **DOM-03** domaine acheté : titulaire = entreprise de l'artisan (vérifié dans le WHOIS/RDAP)
- **DOM-04** cas C : chaque ligne passe `ok` indépendamment ; valeur erronée → état `incorrect` + valeur trouvée
- **DOM-05** HTTPS valide sur domaine, www et sous-domaine ; 301 vers l'URL canonique
- **DOM-06** DNS retiré 3 jours → statut `casse`, email, sous-domaine toujours en ligne
- **DOM-07** résiliation Site Pro : domaine conservé jusqu'à échéance, AuthCode envoyé, site repasse sur le sous-domaine
- **DOM-08** aucun MX modifié, ni en achat ni en connexion
