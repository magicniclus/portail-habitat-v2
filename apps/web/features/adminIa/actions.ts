'use server';

import { entreeActionRecommandation, entreeAnalyseIa, entreeReglagesIa } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import {
  agirSurRecommandation,
  analyserIa,
  clientAnthropic,
  enregistrerReglagesIa,
} from '@ph/firebase/ia';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';

/** Back-office › Assistant IA (IA_ADMIN §3 et §5). Clé API côté serveur uniquement. */
const services = () => {
  const cle = process.env.ANTHROPIC_API_KEY;
  return {
    db: getFirestore(appAdmin()),
    horloge: Date.now,
    client: cle ? clientAnthropic(cle) : null,
  };
};

const analyser = actionAdmin(
  { schema: entreeAnalyseIa, nom: 'adminAnalyseIa', permission: 'ia.utiliser' },
  async (e, ctx) => analyserIa(services(), e, ctx.uid!),
);

export async function lancerAnalyse(
  e: z.input<typeof entreeAnalyseIa>,
): Promise<{ analyseId: string } | { erreur: string }> {
  const r = await analyser(e);
  revalidatePath('/admin/ia');
  return r.ok ? { analyseId: r.data.analyseId } : { erreur: r.message };
}

const agir = actionAdmin(
  { schema: entreeActionRecommandation, nom: 'adminRecommandationIa', permission: 'ia.utiliser' },
  async (e, ctx) =>
    agirSurRecommandation(
      { db: getFirestore(appAdmin()), horloge: Date.now },
      { ...e, acteurUid: ctx.uid! },
    ),
);

export async function agirRecommandation(
  e: z.input<typeof entreeActionRecommandation>,
): Promise<string | null> {
  const r = await agir(e);
  revalidatePath('/admin/ia');
  return r.ok ? null : r.message;
}

const reglages = actionAdmin(
  { schema: entreeReglagesIa, nom: 'adminReglagesIa', permission: 'ia.configurer' },
  async (e, ctx) =>
    enregistrerReglagesIa(
      { db: getFirestore(appAdmin()), horloge: Date.now },
      { ...e, acteurUid: ctx.uid! },
    ),
);

export async function enregistrerReglages(
  e: z.input<typeof entreeReglagesIa>,
): Promise<string | null> {
  const r = await reglages(e);
  revalidatePath('/admin/ia');
  return r.ok ? null : r.message;
}
