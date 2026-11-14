'use client';

import { SCRIPT_COUPURES_FIRESTORE } from './scriptCoupures';

/** Script en ligne écrit par le serveur seulement (même principe que `ScriptBandeau`). */
export function ScriptCoupures() {
  if (typeof window !== 'undefined') return null;
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT_COUPURES_FIRESTORE }} />;
}
