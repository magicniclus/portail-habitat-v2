'use client';

import { MOTIFS_CONTESTATION, type MotifContestation } from '@ph/core/leads';
import { Banner, Button, Feuille, Field, Select, Textarea } from '@ph/ui';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

type Reponse = { etat: 'ouverte' } | { etat: 'refusee'; raison: string };

/** Contester un appel d'offres débloqué (7 jours) : numéro invalide, projet inexistant… */
export function ContesterAppelOffres({ appelOffresId }: { appelOffresId: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState<MotifContestation>('faux_numero');
  const [details, setDetails] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<Reponse | null>(null);

  const envoyer = async () => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<Reponse>('/api/pro/appels-offres/contester', {
      appelOffresId,
      motif,
      details,
    });
    setEnCours(false);
    if (r.ok) setResultat(r.data);
    else setErreur(r.message);
  };

  return (
    <Feuille
      open={ouvert}
      onOpenChange={setOuvert}
      titre="Contester cette demande"
      description="Coordonnées erronées, projet inexistant, doublon ou chantier hors de votre rayon : l’équipe vous répond sous 72 h."
      declencheur={<Button variant="fantome">Contester</Button>}
    >
      <div className="grid gap-4">
        {resultat?.etat === 'ouverte' ? (
          <Banner tone="succes" titre="Contestation envoyée">
            Vous recevrez la décision par email et dans vos notifications.
          </Banner>
        ) : resultat?.etat === 'refusee' ? (
          <Banner tone="attention" titre="Contestation non recevable">
            {resultat.raison}
          </Banner>
        ) : (
          <>
            <Field label="Motif">
              <Select value={motif} onChange={(e) => setMotif(e.target.value as MotifContestation)}>
                {Object.entries(MOTIFS_CONTESTATION).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ce qui s’est passé">
              <Textarea
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                minLength={10}
              />
            </Field>
            {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
            <Button onClick={envoyer} disabled={enCours || details.trim().length < 10}>
              Envoyer la contestation
            </Button>
          </>
        )}
      </div>
    </Feuille>
  );
}
