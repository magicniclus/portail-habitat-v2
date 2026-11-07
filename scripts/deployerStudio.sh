#!/usr/bin/env bash
# Déploie le robot de rendu du Studio sur Cloud Run (STUDIO.md §6). À lancer par le propriétaire,
# depuis la racine du dépôt, après `gcloud auth login`. Rien n'est déployé sans cette commande.
#   PROJET=managea-895d7 ./scripts/deployerStudio.sh
set -euo pipefail
PROJET="${PROJET:?Indiquez PROJET=<id du projet Google Cloud>}"
REGION="${REGION:-europe-west1}"
IMAGE="$REGION-docker.pkg.dev/$PROJET/studio/rendu:$(git rev-parse --short HEAD)"

gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com --project "$PROJET"
gcloud artifacts repositories describe studio --location "$REGION" --project "$PROJET" >/dev/null 2>&1 \
  || gcloud artifacts repositories create studio --repository-format docker --location "$REGION" --project "$PROJET"

# Secrets (créés une fois) : clé partagée avec le site et clé Claude.
for s in STUDIO_RENDU_CLE ANTHROPIC_API_KEY; do
  gcloud secrets describe "$s" --project "$PROJET" >/dev/null 2>&1 || {
    echo "Secret $s absent : gcloud secrets create $s --project $PROJET --data-file=-  (puis collez la valeur)"
    exit 1
  }
done

# Le robot (compte de service par défaut de Cloud Run) doit pouvoir lire ses deux secrets.
COMPTE="$(gcloud projects describe "$PROJET" --format 'value(projectNumber)')-compute@developer.gserviceaccount.com"
for s in STUDIO_RENDU_CLE ANTHROPIC_API_KEY; do
  gcloud secrets add-iam-policy-binding "$s" --project "$PROJET" \
    --member "serviceAccount:$COMPTE" --role roles/secretmanager.secretAccessor >/dev/null
done

gcloud builds submit --project "$PROJET" --region "$REGION" \
  --config /dev/stdin . <<YAML
steps:
  - name: gcr.io/cloud-builders/docker
    args: [build, -f, apps/studio/Dockerfile, -t, "$IMAGE", .]
images: ["$IMAGE"]
timeout: 3600s
options: { machineType: E2_HIGHCPU_8 }
YAML

gcloud run deploy studio-rendu --project "$PROJET" --region "$REGION" --image "$IMAGE" \
  --port 8090 --cpu 4 --memory 8Gi --no-cpu-throttling --concurrency 4 \
  --min-instances 0 --max-instances 3 --timeout 3600 --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_FIREBASE_PROJECT_ID=$PROJET,NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${BUCKET:-$PROJET.firebasestorage.app}" \
  --set-secrets "STUDIO_RENDU_CLE=STUDIO_RENDU_CLE:latest,ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest"

echo "Adresse du robot (à mettre dans STUDIO_RENDU_URL) :"
gcloud run services describe studio-rendu --project "$PROJET" --region "$REGION" --format 'value(status.url)'
