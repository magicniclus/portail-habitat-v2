'use client';

import type { ConfigCycleLue } from '@ph/firebase/cycle';
import { Card, CardBody, CardHeader, CardTitle, Checkbox, Field, Input } from '@ph/ui';
import { useState } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { enregistrerReglages } from './actions';

type Nombre = 'maxOffresProSemaine' | 'maxNonTransacJour' | 'veilleApres' | 'seuilPremium';
const NOMBRES: [Nombre, string][] = [
  ['maxOffresProSemaine', 'Emails offres_pro max. par semaine'],
  ['maxNonTransacJour', 'Emails non transactionnels max. par jour'],
  ['veilleApres', 'Mise en veille après N emails non ouverts'],
  ['seuilPremium', 'Score → offre cible Premium'],
];

/** Réglages du moteur (`config/cycle`) : enregistrés avec motif et audit. */
export function FormulaireReglages({
  actuel,
  peutConfigurer,
}: {
  actuel: ConfigCycleLue;
  peutConfigurer: boolean;
}) {
  const [r, setR] = useState(actuel);
  const desactive = peutConfigurer ? undefined : 'Permission requise : conversion.configurer';
  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Interrupteur général</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3">
          <p className="m-0 text-sm">
            Coupe immédiatement tous les emails offres_pro. Les emails transactionnels, de sécurité
            et d’activité continuent, et les traces aussi.
          </p>
          <Checkbox checked={r.actif} onChange={(e) => setR({ ...r, actif: e.target.checked })}>
            Emails commerciaux activés
          </Checkbox>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pression commerciale et score</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          {NOMBRES.map(([cle, libelle]) => (
            <Field key={cle} label={libelle}>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={r[cle]}
                onChange={(e) => setR({ ...r, [cle]: Number(e.target.value) })}
              />
            </Field>
          ))}
          <Field label="Taille du groupe témoin (%)">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={50}
              value={Math.round(r.tailleTemoin * 100)}
              onChange={(e) => setR({ ...r, tailleTemoin: Number(e.target.value) / 100 })}
            />
          </Field>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Signataire des emails « humains »</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Field label="Prénom">
            <Input
              value={r.signataire.nom}
              onChange={(e) => setR({ ...r, signataire: { ...r.signataire, nom: e.target.value } })}
            />
          </Field>
          <Field label="Adresse de réponse">
            <Input
              type="email"
              value={r.signataire.email}
              onChange={(e) =>
                setR({ ...r, signataire: { ...r.signataire, email: e.target.value } })
              }
            />
          </Field>
        </CardBody>
      </Card>
      <p className="m-0 text-sm text-neutre-700">
        Remises (−30 % sur 12 mois, code valable 72 h, une remise tous les 90 jours) : valeurs de la
        décision D32c, encore à valider ; elles ne se modifient pas ici.
      </p>
      <div>
        <ConfirmationAdmin
          libelle="Enregistrer"
          titre="Enregistrer les réglages"
          description="Les nouvelles valeurs s’appliquent dès le prochain calcul et le prochain envoi."
          desactive={desactive}
          onConfirmer={(motif) => enregistrerReglages({ ...r, motif })}
        />
      </div>
    </div>
  );
}
