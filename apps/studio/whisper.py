# Transcription mot à mot de la voix du Studio (faster-whisper, en local dans le robot de rendu).
# Usage : python3 whisper.py voix.wav  → JSON [{"texte", "debut", "fin"}] en millisecondes.
import json
import os
import sys

from faster_whisper import WhisperModel

modele = WhisperModel(
    os.environ.get("WHISPER_MODELE", "small"),
    device="cpu",
    compute_type="int8",
    download_root=os.environ.get("WHISPER_DOSSIER", "/opt/whisper"),
)
segments, _ = modele.transcribe(
    sys.argv[1],
    language="fr",
    word_timestamps=True,
    vad_filter=True,
    beam_size=5,
    initial_prompt="Portail Travaux, artisans, devis, chantier, demandes.",
)
mots = []
for s in segments:
    for m in s.words or []:
        texte = m.word.strip()
        if texte:
            mots.append({"texte": texte, "debut": round(m.start * 1000), "fin": round(m.end * 1000)})
json.dump(mots, sys.stdout, ensure_ascii=False)
