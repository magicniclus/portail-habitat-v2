// Voix de synthèse provisoire (voix neuronale Edge « Henri ») : un mp3 par segment + minutage des mots.
// En attendant la voix définitive. Le texte de la voix off est envoyé au service de synthèse de
// Microsoft Edge ; le paquet `msedge-tts` n'est pas une dépendance du dépôt : l'installer à part
// (dossier temporaire) puis lancer : node voix-synthese.cjs scripts/vsl/film/script.json .vsl/voix [segment]
/* eslint-disable @typescript-eslint/no-require-imports, no-empty */
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');
const path = require('path');
const [, , fichierScript, sortie, seul] = process.argv;
(async () => {
  const { segments } = JSON.parse(fs.readFileSync(fichierScript, 'utf8'));
  fs.mkdirSync(sortie, { recursive: true });
  const mots = fs.existsSync(path.join(sortie, 'mots.json'))
    ? JSON.parse(fs.readFileSync(path.join(sortie, 'mots.json'), 'utf8'))
    : {};
  for (const s of segments) {
    if (seul && s.id !== seul) continue;
    const tts = new MsEdgeTTS();
    await tts.setMetadata('fr-FR-HenriNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
      wordBoundaryEnabled: true,
    });
    const { audioStream, metadataStream } = tts.toStream(s.texte.replace(/[«»]/g, ''), {
      rate: '-4%',
    });
    const audio = [];
    const meta = [];
    audioStream.on('data', (d) => audio.push(d));
    metadataStream.on('data', (d) => meta.push(d));
    await new Promise((ok, ko) => {
      audioStream.on('end', ok);
      audioStream.on('error', ko);
    });
    fs.writeFileSync(path.join(sortie, s.id + '.mp3'), Buffer.concat(audio));
    const liste = [];
    for (const m of meta.map((x) => x.toString('utf8'))) {
      try {
        for (const x of JSON.parse(m).Metadata ?? [])
          if (x.Type === 'WordBoundary')
            liste.push({ mot: x.Data.text.Text, t: x.Data.Offset / 1e7, d: x.Data.Duration / 1e7 });
      } catch {}
    }
    mots[s.id] = liste;
    console.log(
      s.id,
      liste.length,
      'mots',
      liste.length ? (liste.at(-1).t + liste.at(-1).d).toFixed(2) + ' s' : 'SANS MINUTAGE',
    );
    tts.close();
  }
  fs.writeFileSync(path.join(sortie, 'mots.json'), JSON.stringify(mots, null, 1));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
