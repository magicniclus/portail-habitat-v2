# Emails, SMS et notifications

Document de référence pour **tout ce qui part vers un utilisateur** : emails, SMS, notifications in-app. Il remplace INTEGRATIONS.md §2 et COMPTES.md §8, qui renvoient ici.

---

## 1. Architecture

```
Événement (Function, Server Action, webhook Stripe, tâche planifiée)
   └─ notifier(evenement, destinataires, donnees)          lib/notifications/notifier.ts
        ├─ résout les canaux (email / SMS / in-app) selon le modèle + préférences
        ├─ écrit emails/{id} (statut 'en_file') avec cleIdempotence unique
        └─ Cloud Task "envoyerEmail" (file dédiée, 10 envois/s)
               └─ rend le modèle React Email → Resend → statut 'envoye'
Webhook Resend (/api/resend/webhook) → 'delivre' | 'ouvert' | 'clic' | 'rebond' | 'plainte'
```

- **Une seule porte d'entrée** : `notifier()`. Aucun appel direct à Resend ailleurs dans le code
- **Idempotence** : `cleIdempotence` = `modele:refObjet:destinataire[:variante]` (ex. `demande-confirmee:demandes/abc:uid123`). Un deuxième appel avec la même clé ne renvoie rien
- **File d'attente** (Cloud Tasks) : l'action utilisateur n'attend jamais l'envoi ; 5 nouvelles tentatives avec délai exponentiel ; au-delà, `statut: 'echec'` et tâche `filesModeration`
- **Envoi différé** : `envoyerLe` pour les relances (J+1, J+3…). Une relance est **annulée** si la condition n'est plus vraie au moment de l'envoi (ex. onboarding terminé entre-temps) : chaque modèle différé a une fonction `encoreValable(donnees)`
- **Regroupement** : les modèles marqués « groupé » attendent 15 min et fusionnent les événements du même type (ex. 4 messages → un seul email)

### Fournisseurs
| Canal | Fournisseur | Notes |
|---|---|---|
| Email | **Resend** (région UE) + **React Email** | domaine `notifications.portailhabitat.fr`, SPF, DKIM, DMARC `p=quarantine` |
| SMS | **Brevo SMS** ou Twilio (expéditeur alphanumérique `PortailHab`) | uniquement : codes, nouvelle demande (si activé), assurance expirée |
| In-app | `users/{uid}/notifications` | cloche dans les espaces particulier et pro |
| Codes d'authentification | Firebase Auth (SMS 2FA) | les emails Auth sont **personnalisés** (§4) : Firebase ne les envoie pas lui-même |

### Collection `emails/{id}`
`modele`, `canal` (`email`, `sms`), `destinataire` (email ou téléphone), `uid?`, `artisanId?`, `refObjet`, `cleIdempotence` (unique), `donnees` (sans secret ni lien magique en clair), `envoyerLe`, `statut` (`en_file`, `envoye`, `delivre`, `ouvert`, `clic`, `rebond`, `plainte`, `echec`, `annule`, `bloque_preferences`), `fournisseurId`, `tentatives`, `erreur?`, `createdAt`. TTL 13 mois.

### Liste de blocage `suppressions/{emailHash}`
Alimentée par les rebonds définitifs et les plaintes. Plus aucun envoi vers cette adresse, sauf les emails de sécurité (§4), qui passent quand même une fois. Un bandeau dans l'espace de l'utilisateur lui demande de corriger son adresse.

---

## 2. Préférences et catégories

Chaque modèle appartient à une catégorie :

| Catégorie | Désactivable | Exemples |
|---|---|---|
| `securite` | **Non** | lien de connexion, vérification, mot de passe, nouvel appareil, changement d'email |
| `transactionnel` | **Non** | demande confirmée, reçu, facture, lead débloqué, décision de modération |
| `activite` | Oui | nouveau message, nouvel avis, rapport hebdomadaire, résumé des appels d'offres |
| `relance` | Oui | onboarding incomplet, fiche incomplète, demander un avis |
| `offres_pro` | Oui, **activé par défaut** pour les pros (prospection B2B, opposition en un clic) | séquences de conversion et de montée en gamme (CONVERSION.md) |
| `marketing` | Oui, **désactivé par défaut** (consentement explicite) | actualités, newsletters, particuliers |

- `users/{uid}.preferences.notifs = { activite: { email, sms, inapp }, relance: {…}, offres_pro: {…}, marketing: {…} }` ; pour un pro, surcharge par entreprise dans `membres/{uid}.notifs`
- Lien **« Se désabonner »** en un clic (en-tête `List-Unsubscribe` + `List-Unsubscribe-Post`, obligatoire pour Gmail et Yahoo), qui désactive **la catégorie**, pas tout
- Page `/preferences?t=<jeton>` accessible sans connexion depuis l'email
- **Heures calmes** pour les SMS : aucun SMS entre 21 h et 8 h (report au matin), sauf les codes

---

## 3. Modèles et mise en page

> **Maquette de référence : `designs/Modeles Emails.dc.html`** : 34 modèles représentatifs dans les 4 chartes, en version ordinateur et mobile, avec les SMS associés. Les autres modèles du catalogue reprennent les mêmes blocs.

Blocs réutilisables (un composant React Email chacun, dans `packages/emails/blocs/`) : `Surtitre`, `Titre`, `Paragraphe`, `Citation`, `Bouton`, `Recap` (lignes clé / valeur), `Alerte` (`info`, `ok`, `warn`, `danger`), `Etapes` (fait / à faire), `Progression`, `Stats`, `CarteArtisan`, `Etoiles`, `ListeStatuts`, `Note`. Un modèle n'est qu'un **assemblage de blocs** : aucun style dans les modèles eux-mêmes.


- Dossier `emails/` (React Email), un fichier par modèle, `emails/_layout/{Particulier,Pro,Diag,Admin}.tsx` : logo, couleur de l'espace (vert, orange, bleu, ardoise), pied de page (adresse postale de l'éditeur, lien vers les préférences, mention « Vous recevez cet email parce que… »)
- Chaque modèle exporte : `sujet(donnees)`, `preheader(donnees)`, le composant, `categorie`, `canaux`, `exemple` (données fictives pour l'aperçu et les tests)
- **Version texte** générée automatiquement pour chaque email
- Largeur 600 px, un seul bouton principal, cible de 44 px, texte alternatif sur toutes les images, lisible sans images, mode sombre testé
- Tous les liens passent par `lien(route, { utm_campaign: modele })`. Les liens d'action (connexion, invitation, préférences) contiennent un **jeton signé à usage unique**, jamais l'email en clair
- Tutoiement interdit ; ton : clair, direct, « vous »
- Aperçu local : `pnpm email:dev` (serveur React Email) ; en local et en staging, **tous les envois sont capturés par Mailpit** et jamais envoyés en vrai (sauf liste blanche en staging)

---

## 4. Catalogue complet

Légende : **G** = groupé · **D** = différé · **S** = aussi par SMS · **A** = aussi in-app

### 4.1 Authentification et sécurité (tous les publics, catégorie `securite`)
| Modèle | Déclencheur | Contenu |
|---|---|---|
| `lien-connexion` | demande de lien magique | bouton valable 1 h, usage unique ; « Vous n'êtes pas à l'origine de cette demande ? Ignorez cet email » |
| `verifier-email` | création de compte avec mot de passe | lien valable 24 h ; renvoi possible toutes les 60 s, 5 fois par jour max |
| `bienvenue-particulier` | premier clic de vérification | à quoi sert l'espace, lien vers les demandes |
| `mot-de-passe-oublie` | demande de réinitialisation | lien valable 1 h ; **même réponse à l'écran que l'email existe ou non** (pas de fuite d'information) |
| `mot-de-passe-modifie` | changement réussi | date, appareil, lien « Ce n'était pas moi » |
| `nouvel-appareil` | connexion depuis un appareil ou un pays inconnu | appareil, ville approximative, heure, bouton « Sécuriser mon compte » |
| `changement-email-alerte` | changement d'email (envoyé à l'**ancienne** adresse) | lien d'annulation valable 7 j |
| `changement-email-verifier` | idem (envoyé à la **nouvelle** adresse) | lien de confirmation |
| `2fa-activee` / `2fa-desactivee` | changement de la double authentification | |
| `compte-bloque` | 10 échecs de connexion | déblocage par lien |
| `compte-suspendu` / `compte-reactive` | décision admin | motif, recours |
| `suppression-compte-confirmee` | suppression effective | récapitulatif de ce qui est conservé (factures) |
| `export-donnees-pret` | export RGPD généré | lien valable 7 j, connexion requise |

### 4.2 Inscription et onboarding artisan (charte orange)
| Modèle | Déclencheur | Contenu |
|---|---|---|
| `reprise-onboarding` | brouillon créé à l'étape SIREN avec un email saisi | lien pour reprendre sur n'importe quel appareil |
| `relance-onboarding-1` **D** | J+1 si l'onboarding n'est pas terminé | « Il vous reste 2 minutes » + étape manquante |
| `relance-onboarding-2` **D** | J+3 | bénéfices chiffrés de la zone (nombre de demandes du mois dans son métier) |
| `relance-onboarding-3` **D** | J+10, dernière relance | puis plus rien ; brouillon purgé à J+30 |
| `bienvenue-pro` | `finaliserOnboarding` | les 3 étapes pour être en ligne : téléphone, décennale, fiche à 60 % |
| `verifier-telephone` **S** | avant la première réponse | code à 6 chiffres (Firebase Auth) |
| `fiche-incomplete` **D** | J+2 et J+7 si `completude < 60` | ce qui manque, avec des liens directs |
| `document-recu` | téléversement d'un document | « Vérification sous 48 h ouvrées » |
| `document-valide` / `document-refuse` | décision du modérateur | motif du refus et marche à suivre |
| `fiche-en-ligne` **A** | `enLigne` passe à `true` | lien vers la fiche publique, conseils |
| `revendication-code` | revendication par email ou courrier | code ou lien |
| `revendication-resultat` | décision | |
| `entreprise-existe-deja` | tentative d'inscription sur un SIREN déjà revendiqué | envoyé au **propriétaire** : « Quelqu'un a tenté d'inscrire votre entreprise » |

### 4.3 Équipes (charte orange)
| Modèle | Déclencheur |
|---|---|
| `invitation-membre` | `inviterMembre` : nom de l'entreprise, rôle, invitant, bouton valable 7 j |
| `invitation-relance` **D** | J+3 si l'invitation n'est pas acceptée |
| `invitation-acceptee` **A** | à l'invitant |
| `invitation-expiree` | à l'invitant, avec un bouton « Renvoyer » |
| `demande-acces` **A** | au propriétaire et aux gérants |
| `demande-acces-reponse` | au demandeur |
| `role-modifie` | au membre concerné |
| `membre-retire` | au membre retiré |
| `transfert-propriete` | à l'ancien et au nouveau propriétaire |
| `sieges-suspendus` | passage en gratuit avec plusieurs membres, au propriétaire et aux membres suspendus |
| `entreprise-fermee` | à tous les membres |

### 4.4 Particuliers (charte verte, bleue pour le diagnostic)
| Modèle | Déclencheur |
|---|---|
| `reprise-simulateur` | case « M'envoyer un lien pour reprendre plus tard » cochée : résumé du projet, étape, lien valable 30 j à usage unique (REPRISE_PARCOURS.md §5). Catégorie `relance`, consentement explicite |
| `reprise-simulateur-rappel` **D** | J+3, une seule fois, si la case a été cochée et la demande non envoyée |
| `demande-confirmee` | création d'une demande : récapitulatif, estimation, référence, lien de suivi (et lien de connexion si le compte vient d'être créé) |
| `demande-sans-artisan` **D** | aucun artisan disponible sous 48 h : explication, proposition d'élargir le rayon |
| `artisan-a-repondu` **A** | attribution `acceptee` |
| `devis-recu` **A** | `devis_envoye` : montant, lien vers le devis |
| `nouveau-message` **G A** | message d'un artisan |
| `relance-devis` **D** | J+7 après un devis sans réponse du particulier |
| `demande-avis` **D** | J+30 après la date de chantier si `signee` |
| `rappel-avis` **D** | J+45, une seule fois |
| `avis-recu` | dépôt d'un avis : « Publication sous 48 h » |
| `avis-publie` / `avis-refuse` | modération (motif) |
| `reponse-artisan-avis` | l'artisan a répondu publiquement |
| `dossier-diag-confirme` | création d'un dossier diagnostic (charte bleue) |
| `compte-inactif` **D** | J-30 avant la purge |

### 4.5 Artisans, activité (charte orange)
| Modèle | Déclencheur |
|---|---|
| `nouvelle-demande` **S A** | attribution `proposee`, aux membres concernés (§4.6 de COMPTES.md) |
| `relance-demande` **D** | demande non vue après 4 h, puis 20 h (avant l'expiration) |
| `demande-expiree` **A** | l'attribution expire sans réponse : impact sur le taux de réponse |
| `nouveau-message` **G A** | message du particulier |
| `devis-accepte` / `devis-refuse` **A** | décision du particulier |
| `nouvel-appel-offres` **A** | immédiat pour Premium prioritaire, sinon **résumé quotidien** à 7 h (`resume-appels-offres`) |
| `lead-debloque` | coordonnées + reçu |
| `credits-faibles` | solde < 2 crédits, une fois par période |
| `credits-expirent` **D** | J-15 avant l'expiration de crédits achetés |
| `remboursement-lead` | décision sur une contestation |
| `nouvel-avis` **A** | avis publié : inviter à répondre |
| `avis-signale-decision` | décision sur un signalement fait par l'artisan |
| `assurance-expire` **S** | J-30, J-7, J0 avant la fin de la décennale ; suspension automatique à J0 |
| `rapport-hebdo` | lundi 8 h (Premium) : vues, clics, demandes, comparaison avec la semaine précédente |
| `rapport-mensuel` | 1er du mois (tous) : résumé et encart vers l'offre cible (CONVERSION.md §4), catégorie `offres_pro` |
| `avertissement-charte` / `suspension` / `levee-sanction` | décision admin |

### 4.6 Facturation (webhooks Stripe, charte orange, catégorie `transactionnel`)
| Modèle | Déclencheur |
|---|---|
| `abonnement-active` | `customer.subscription.created` |
| `recu` | `invoice.paid` (PDF de la facture Stripe en lien) |
| `paiement-echoue` | `invoice.payment_failed`, puis J+3 et J+6 **D** ; rétrogradation à J+7 |
| `renouvellement` | `invoice.upcoming` (annuel, obligation légale d'information) |
| `abonnement-resilie` | résiliation demandée : date de fin, ce qui sera perdu |
| `abonnement-termine` | `customer.subscription.deleted` |
| `pack-achete` | achat d'un pack de crédits |
| `moyen-paiement-expire` **D** | J-30 avant l'expiration de la carte |

### 4.7 Conversion, montée en gamme et fidélisation (catégorie `offres_pro`)
Définis dans **CONVERSION.md** (séquences, déclencheurs, score, règles de pression) :
`prospect-estimation`, `prospect-demande-zone`, `prospect-temoignage`, `prospect-derniere`, `resume-zone-mensuel`, `vis-position`, `vis-concurrents`, `vis-recherches-manquees`, `vis-offre-lancement`, `vis-offre-rappel`, `vis-offre-relance`, `vis-demande-offerte`, `prem-bilan-visibilite`, `prem-demandes-manquees`, `prem-credits`, `prem-appel-offres-complet`, `prem-renouvellement`, `passage-annuel`, `garantie-tenue`, `resiliation-alternative`, `reconquete-1`, `reconquete-2`.

### 4.8 Internes (admins, charte ardoise, en **résumé** sauf urgence)
| Modèle | Déclencheur |
|---|---|
| `resume-file` | 9 h et 14 h : nombre d'éléments par type et SLA dépassés |
| `alerte-urgente` | litige Stripe, suspicion de fraude, échec d'envoi en masse (> 5 % de rebonds sur 1 h), webhook en erreur |
| `rgpd-demande` | nouvelle demande RGPD (délai légal d'un mois) |
| `ia-synthese-hebdo` | lundi 7 h, aux superadmins : audit IA complet (gain estimé, notes des étapes de l'entonnoir, 3 premières actions, lien vers l'admin) |
| `alerte-budget` | coût mensuel (Google Cloud ou IA) à 80 % puis 100 % du plafond |

---

## 5. Parcours d'inscription : qui reçoit quoi, et quand

### Particulier
```
Envoi d'une demande (email inconnu)
  → demande-confirmee (contient le lien de connexion)
  → [clic] bienvenue-particulier
  → artisan-a-repondu, devis-recu… au fil de l'eau
  → demande-avis (J+30) → rappel-avis (J+45)
```
```
Inscription « Mon espace » avec mot de passe
  → verifier-email → [clic] bienvenue-particulier
Inscription par lien magique
  → lien-connexion → [clic] bienvenue-particulier
```

### Artisan
```
Étape SIREN (email saisi)    → reprise-onboarding
  pas terminé                → relance-onboarding-1 (J+1) → -2 (J+3) → -3 (J+10)
Étape Compte validée         → bienvenue-pro   (les relances sont annulées)
  téléphone                  → verifier-telephone (SMS)
  documents                  → document-recu → document-valide / document-refuse
  fiche < 60 %               → fiche-incomplete (J+2, J+7)
Conditions remplies          → fiche-en-ligne
Première demande             → nouvelle-demande (+ SMS si activé)
```

### Collaborateur invité
```
invitation-membre → (J+3) invitation-relance → [accepte] invitation-acceptee (à l'invitant)
                                             → [expire à J+7] invitation-expiree (à l'invitant)
```

---

## 6. Limites anti-abus
| Action | Limite |
|---|---|
| Lien de connexion, mot de passe oublié, vérification | 5 / h par email et 20 / h par IP |
| SMS de code | 3 / h par numéro, 10 / jour ; bloqué hors de +33, +262, +590, +594, +596 |
| Invitations | 20 / jour par entreprise |
| Relances différées | 3 maximum par parcours, jamais deux relances le même jour |
| Total non transactionnel | 1 email / jour / personne maximum (les autres sont reportés ou regroupés) |
| `offres_pro` | 2 / semaine maximum, jamais le week-end ; mise en veille après 5 emails non ouverts d'affilée |

---

## 7. Délivrabilité et suivi
- Réchauffement du domaine : montée progressive les 4 premières semaines
- Webhook Resend → `emails.statut` ; rebond définitif → `suppressions` ; plainte → `suppressions` + désactivation du marketing
- Tableau de bord admin (Finances ou Configuration) : envois, taux de délivrance, ouverture, rebonds et plaintes par modèle ; alerte si les rebonds dépassent 2 % ou les plaintes 0,1 %
- Aucune donnée personnelle sensible (coordonnées du particulier) dans le **sujet** ni dans le **preheader**

---

## 8. Tests
- Chaque modèle : test de rendu (snapshot HTML et texte) avec ses données `exemple`, vérification des liens (aucun lien vers `localhost` en build de production), sujet de moins de 60 caractères
- `notifier()` : idempotence (deux appels, un seul envoi), préférences respectées, catégorie `securite` impossible à bloquer, relance annulée si `encoreValable` est faux, heures calmes des SMS
- Playwright + Mailpit : parcours complets (inscription particulier, onboarding artisan avec relance simulée, invitation d'un collaborateur, mot de passe oublié) en lisant la boîte Mailpit et en cliquant sur les vrais liens

## 9. Variables d'environnement
```
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
EMAIL_FROM="Portail Habitat <notifications@portailhabitat.fr>"
EMAIL_FROM_PRO="Portail Habitat Pro <pro@notifications.portailhabitat.fr>"
EMAIL_FROM_HUMAIN="Julie de Portail Habitat Pro <julie@notifications.portailhabitat.fr>"
EMAIL_REPLY_TO_COMMERCIAL=julie@portailhabitat.fr
EMAIL_REPLY_TO=support@portailhabitat.fr
SMS_API_KEY=
SMS_SENDER=PortailHab
EMAIL_CAPTURE=mailpit            # local et staging : aucun envoi réel
EMAIL_WHITELIST=@portailhabitat.fr
NOTIF_SIGNING_SECRET=            # jetons des liens de préférences et d'action
```
