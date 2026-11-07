import { appliquerVariante } from '@ph/core/studio';
import { appAdmin } from '@ph/firebase/admin';
import {
  capturesTermineesStudio,
  clientClaudeStudio,
  echecStudio,
  lireProjetStudio,
  renduTermineStudio,
  transcriptionRecueStudio,
  type ServicesStudio,
  type TravailStudio,
} from '@ph/firebase/studio';
import { getFirestore } from 'firebase-admin/firestore';
import { capturer } from './capturer';
import { rendre } from './rendre';
import { transcrire } from './transcrire';

/**
 * File des travaux du robot, un à la fois (le rendu prend tout le processeur). Chaque étape
 * enchaîne la suivante : transcription → montage (Claude) → captures → rendu.
 */
const file: { type: TravailStudio; projetId: string }[] = [];
let enCours = false;

function services(): ServicesStudio {
  return {
    db: getFirestore(appAdmin()),
    horloge: Date.now,
    claude: process.env.ANTHROPIC_API_KEY
      ? clientClaudeStudio(process.env.ANTHROPIC_API_KEY)
      : null,
    youtube: null,
    lancerTravail: async (type, projetId) => ajouterTravail(type, projetId),
  };
}

async function executerTravail(type: TravailStudio, projetId: string) {
  const s = services();
  const p = await lireProjetStudio(s.db, projetId);
  if (!p) return;
  try {
    if (type === 'transcrire') {
      const { mots, images } = await transcrire(p);
      await transcriptionRecueStudio(s, { projetId, mots, images });
    } else if (type === 'capturer') {
      await capturesTermineesStudio(s, { projetId, captures: await capturer(p) });
    } else {
      const r = await rendre(p);
      // Variantes d'accroche (tests A/B) : même montage, autre première image et miniature.
      const variantes: Record<string, { video: string; miniature: string; accroche: string }> = {};
      for (const v of p.plan?.variantes ?? []) {
        const rv = await rendre({ ...p, plan: appliquerVariante(p.plan!, v) }, v.id);
        variantes[v.id] = { video: rv.video, miniature: rv.miniature, accroche: v.accroche };
      }
      await renduTermineStudio(s, {
        projetId,
        fichiers: { video: r.video, srt: r.srt, miniature: r.miniature },
        dureeMs: r.dureeMs,
        variantes,
      });
    }
  } catch (e) {
    console.error(`studio : ${type} ${projetId}`, e);
    await echecStudio(s, {
      projetId,
      etape: type,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

export function ajouterTravail(type: TravailStudio, projetId: string) {
  file.push({ type, projetId });
  void suivant();
}

async function suivant() {
  if (enCours) return;
  const t = file.shift();
  if (!t) return;
  enCours = true;
  try {
    await executerTravail(t.type, t.projetId);
  } finally {
    enCours = false;
    void suivant();
  }
}

export const travauxEnAttente = () => file.length + (enCours ? 1 : 0);
