'use client';

import {
  CANAUX_NOTIF,
  LIBELLES_CANAL,
  LIGNES_NOTIFS,
  LIGNES_NOTIFS_ENTREPRISE,
  type NotifsEntreprise,
  type PreferencesNotifs,
} from '@ph/core/espace-pro';
import type { ComptePro } from '@ph/firebase/pro';
import { Banner, Interrupteur } from '@ph/ui';
import { useState, type ReactNode } from 'react';
import { posterJson } from '@/lib/posterJson';
import { NotificationsPush } from './NotificationsPush';

const GRILLE = 'grid grid-cols-[minmax(0,1fr)_repeat(3,52px)] items-center gap-x-1';

function Ligne({
  libelle,
  description,
  children,
}: {
  libelle: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <li className={`${GRILLE} border-t border-trait py-2 first:border-t-0`}>
      <span className="flex flex-col py-1">
        <span className="text-[15px] font-semibold">{libelle}</span>
        <span className="text-sm text-neutre-700">{description}</span>
      </span>
      {children}
    </li>
  );
}

const Case = ({ children }: { children?: ReactNode }) => (
  <span className="flex justify-center">{children}</span>
);

/**
 * Notifications (maquette Mon Compte, EMAILS §2) : chaque bascule est enregistrée aussitôt ; les
 * emails de sécurité et les reçus partent toujours.
 */
export function NotificationsCompte({ compte, push }: { compte: ComptePro; push: boolean }) {
  const [prefs, setPrefs] = useState<PreferencesNotifs>(compte.notifs);
  const [entreprise, setEntreprise] = useState<NotifsEntreprise | null>(
    compte.entreprise?.notifs ?? null,
  );
  const [erreur, setErreur] = useState<string | null>(null);

  const enregistrer = async (p: PreferencesNotifs, e: NotifsEntreprise | null) => {
    const avant = { prefs, entreprise };
    setPrefs(p);
    setEntreprise(e);
    setErreur(null);
    const r = await posterJson<null>('/api/pro/compte/notifications', {
      preferences: p,
      ...(e ? { entreprise: e } : {}),
    });
    if (r.ok) return;
    setPrefs(avant.prefs);
    setEntreprise(avant.entreprise);
    setErreur(r.message);
  };

  return (
    <div className="grid gap-3">
      {push ? <NotificationsPush /> : null}
      <div
        className={`${GRILLE} text-center text-[13px] font-semibold text-neutre-700`}
        aria-hidden
      >
        <span className="text-start">Type</span>
        {CANAUX_NOTIF.map((c) => (
          <span key={c}>{LIBELLES_CANAL[c]}</span>
        ))}
      </div>
      <ul aria-label="Notifications personnelles" className="m-0 list-none p-0">
        {LIGNES_NOTIFS.map((l) => (
          <Ligne key={l.cle} libelle={l.libelle} description={l.description}>
            {CANAUX_NOTIF.map((c) => (
              <Case key={c}>
                {l.canaux.includes(c) ? (
                  <Interrupteur
                    aria-label={`${l.libelle} par ${LIBELLES_CANAL[c].toLowerCase()}`}
                    checked={prefs[l.cle][c]}
                    onCheckedChange={(v) =>
                      enregistrer({ ...prefs, [l.cle]: { ...prefs[l.cle], [c]: v } }, entreprise)
                    }
                  />
                ) : null}
              </Case>
            ))}
          </Ligne>
        ))}
        <Ligne
          libelle="Sécurité et facturation"
          description="Connexions, reçus, assurance : toujours envoyés"
        >
          {CANAUX_NOTIF.map((c) => (
            <Case key={c}>
              <Interrupteur
                aria-label={`Sécurité par ${LIBELLES_CANAL[c].toLowerCase()}`}
                checked
                disabled
              />
            </Case>
          ))}
        </Ligne>
      </ul>
      {entreprise && compte.entreprise ? (
        <>
          <h3 className="m-0 mt-2 text-base">Pour {compte.entreprise.nom}</h3>
          <ul
            aria-label={`Notifications de ${compte.entreprise.nom}`}
            className="m-0 list-none p-0"
          >
            {LIGNES_NOTIFS_ENTREPRISE.map((l) => (
              <Ligne key={l.cle} libelle={l.libelle} description={l.description}>
                <span />
                <span />
                <Case>
                  <Interrupteur
                    aria-label={l.libelle}
                    checked={entreprise[l.cle]}
                    onCheckedChange={(v) => enregistrer(prefs, { ...entreprise, [l.cle]: v })}
                  />
                </Case>
              </Ligne>
            ))}
          </ul>
        </>
      ) : null}
      <p className="m-0 text-sm text-neutre-700">
        Aucun SMS n&apos;est envoyé entre 21 h et 8 h, sauf les codes de connexion.
      </p>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </div>
  );
}
