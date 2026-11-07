# Robot de rendu du Studio (STUDIO.md §6) : Node 22 + Chromium (Playwright), ffmpeg, Java (émulateurs
# de la copie de démonstration) et faster-whisper. Construit depuis la racine du dépôt :
#   docker build -f apps/studio/Dockerfile -t studio-rendu .
FROM mcr.microsoft.com/playwright:v1.56.1-noble

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg openjdk-21-jre-headless python3-venv \
  && rm -rf /var/lib/apt/lists/*

# Whisper en local (pas de fournisseur ni de prix à la minute) ; modèle téléchargé à la construction.
RUN python3 -m venv /opt/whisper-venv \
  && /opt/whisper-venv/bin/pip install --no-cache-dir faster-whisper==1.1.1 \
  && /opt/whisper-venv/bin/python -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8', download_root='/opt/whisper')"

RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile \
  && pnpm --filter @ph/web build \
  && pnpm --filter @ph/studio build \
  && npx firebase setup:emulators:firestore && npx firebase setup:emulators:storage

ENV NODE_ENV=production \
  PORT=8090 \
  STUDIO_DEPOT=/app \
  PYTHON=/opt/whisper-venv/bin/python \
  WHISPER_DOSSIER=/opt/whisper
EXPOSE 8090
CMD ["node", "apps/studio/dist/index.js"]
