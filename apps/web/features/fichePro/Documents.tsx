'use client';

import {
  LIBELLES_STATUT_DOCUMENT,
  LIBELLES_TYPE_DOCUMENT,
  type StatutDocument,
} from '@ph/core/espace-pro';
import { formatDate } from '@ph/core/format';
import { TYPES_DOCUMENT } from '@ph/core/schemas';
import { fichiers } from '@ph/firebase/chemins';
import type { DocumentPro } from '@ph/firebase/pro';
import { Badge, Banner, Button, Field, Select, type Tone } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { deposerFichier } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';
import { nomFichierSur, nouvelIdFichier, problemeFichier, TYPES_PIECE } from './fichiers';

const TONS: Record<StatutDocument, Tone> = {
  en_attente: 'info',
  valide: 'succes',
  refuse: 'danger',
  expire: 'attention',
};

/**
 * Documents de l'entreprise (COMPTES §3) : dépôt dans Storage puis enregistrement vérifié par le
 * serveur ; la fiche passe en ligne dès que le Kbis (ou SIREN vérifié) et la décennale sont envoyés.
 */
export function Documents({
  artisanId,
  documents,
  peutDeposer,
}: {
  artisanId: string;
  documents: DocumentPro[];
  peutDeposer: boolean;
}) {
  const router = useRouter();
  const [type, setType] = useState<string>('decennale');
  const [fichier, setFichier] = useState<File | null>(null);
  const [message, setMessage] = useState<{ ton: 'danger' | 'succes'; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const idFichier = useId();

  const envoyer = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!fichier) return;
    const probleme = problemeFichier(fichier, TYPES_PIECE, 10);
    if (probleme) return setMessage({ ton: 'danger', texte: probleme });
    setEnCours(true);
    setMessage(null);
    const docId = nouvelIdFichier();
    const nomFichier = nomFichierSur(fichier);
    try {
      await deposerFichier(fichiers.document(artisanId, docId, nomFichier), fichier);
      const r = await posterJson<{ enLigne: boolean }>('/api/pro/documents', {
        docId,
        type,
        nomFichier,
      });
      if (!r.ok) setMessage({ ton: 'danger', texte: r.message });
      else {
        setMessage({
          ton: 'succes',
          texte: r.data.enLigne
            ? 'Document reçu. Votre fiche est en ligne ; nous vérifions vos documents sous 48 h ouvrées.'
            : 'Document reçu : nous le vérifions sous 48 h ouvrées.',
        });
        setFichier(null);
        router.refresh();
      }
    } catch {
      setMessage({ ton: 'danger', texte: "L'envoi du fichier n'a pas abouti. Réessayez." });
    }
    setEnCours(false);
  };

  return (
    <div className="grid gap-4">
      {documents.length ? (
        <ul aria-label="Documents envoyés" className="m-0 grid list-none gap-2 p-0">
          {documents.map((d) => (
            <li key={d.id} className="grid gap-1 rounded-[10px] border border-trait p-3">
              <p className="m-0 flex flex-wrap items-center justify-between gap-2">
                <strong className="text-[15px]">{LIBELLES_TYPE_DOCUMENT[d.type] ?? d.type}</strong>
                <Badge tone={TONS[d.statut]}>{LIBELLES_STATUT_DOCUMENT[d.statut]}</Badge>
              </p>
              <p className="m-0 text-[13px] break-all text-neutre-700">
                {d.nomFichier} · envoyé le {formatDate(d.deposeLe)}
              </p>
              {d.motifRefus ? <p className="m-0 text-sm text-danger">{d.motifRefus}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-neutre-800">
          Envoyez votre attestation décennale pour mettre votre fiche en ligne.
        </p>
      )}
      {peutDeposer ? (
        <form onSubmit={envoyer} className="grid gap-3">
          <Field label="Type de document">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES_DOCUMENT.map((t) => (
                <option key={t} value={t}>
                  {LIBELLES_TYPE_DOCUMENT[t]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-1.5">
            <label htmlFor={idFichier} className="text-[15px] font-semibold">
              Fichier{' '}
              <span className="font-normal text-neutre-700">(PDF, JPEG ou PNG, 10 Mo au plus)</span>
            </label>
            <input
              id={idFichier}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
              className="min-h-11 w-full text-base file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border file:border-trait file:bg-blanc file:px-4 file:font-semibold"
            />
          </div>
          {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
          <div>
            <Button type="submit" disabled={!fichier || enCours}>
              {enCours ? 'Envoi…' : 'Envoyer le document'}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
