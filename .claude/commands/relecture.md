---
description: Relecture exigeante de la branche, sans rien modifier
---
Compare la branche à main (`git diff main...HEAD`). Relis comme un relecteur senior :
- sécurité : règles Firestore, permissions peut(), données personnelles, secrets, validation Zod côté serveur ;
- argent : centimes, transactions, idempotence, webhooks ;
- architecture : docs/ARCHITECTURE.md (dépendances, duplication, valeurs en dur, taille des fichiers) ;
- tests : critères de docs/ACCEPTANCE.md couverts, cas limites.
Rends une liste classée : 🔴 bloquant · 🟠 à corriger · 🟢 suggestion, avec fichier:ligne. Ne modifie rien.
