'use client';

import { Combobox, Field, Input, Select, Textarea } from '@ph/ui';
import { useState } from 'react';
import { useLieux } from '@/features/inscription/useLieux';
import { AssistantRedaction } from './AssistantRedaction';
import { FeuilleEdition } from './FeuilleEdition';

export function EditionPresentation({
  pitch,
  description,
}: {
  pitch: string;
  description: string;
}) {
  const [p, setP] = useState(pitch);
  const [d, setD] = useState(description);
  return (
    <FeuilleEdition titre="Présentation" entree={() => ({ pitch: p, description: d })}>
      <Field label="Accroche" aide={`Une phrase affichée dans l'annuaire (${p.length}/280).`}>
        <Input value={p} onChange={(e) => setP(e.target.value)} maxLength={280} />
      </Field>
      <Field
        label="À propos"
        aide={`Votre savoir-faire, vos chantiers, votre équipe (${d.length}/3000).`}
      >
        <Textarea value={d} onChange={(e) => setD(e.target.value)} maxLength={3000} rows={8} />
      </Field>
      <AssistantRedaction type="apropos" texte={d} remplacer={setD} />
    </FeuilleEdition>
  );
}

export function EditionCoordonnees(p: {
  telephonePublic?: string;
  emailContact?: string;
  siteWeb?: string;
}) {
  const [tel, setTel] = useState(p.telephonePublic ?? '');
  const [email, setEmail] = useState(p.emailContact ?? '');
  const [site, setSite] = useState(p.siteWeb ?? '');
  return (
    <FeuilleEdition
      titre="Informations"
      entree={() => ({
        telephonePublic: tel.trim(),
        emailContact: email.trim(),
        siteWeb: site.trim(),
      })}
    >
      <Field
        label="Téléphone affiché"
        aide="Visible avec Premium ou l'option Visibilité. Laissez vide pour le retirer."
      >
        <Input champ="tel" value={tel} onChange={(e) => setTel(e.target.value)} />
      </Field>
      <Field label="Email de contact">
        <Input champ="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Site internet" aide="Adresse complète, avec https://">
        <Input type="url" inputMode="url" value={site} onChange={(e) => setSite(e.target.value)} />
      </Field>
    </FeuilleEdition>
  );
}

const euros = (c?: number) => (c === undefined ? '' : String(Math.round(c / 100)));

export function EditionDevis({ devis }: { devis?: { minCentimes: number; maxCentimes: number } }) {
  const [min, setMin] = useState(euros(devis?.minCentimes));
  const [max, setMax] = useState(euros(devis?.maxCentimes));
  const nombre = (v: string) => Number(v.replace(/\s/g, '')) || 0;
  return (
    <FeuilleEdition
      titre="Devis moyen"
      entree={() => ({ devis: { minEuros: nombre(min), maxEuros: nombre(max) } })}
    >
      <p className="m-0 text-sm text-neutre-800">
        Fourchette affichée aux particuliers pour qualifier leurs demandes, en euros.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Minimum (€)">
          <Input champ="montant" value={min} onChange={(e) => setMin(e.target.value)} />
        </Field>
        <Field label="Maximum (€)">
          <Input champ="montant" value={max} onChange={(e) => setMax(e.target.value)} />
        </Field>
      </div>
    </FeuilleEdition>
  );
}

const RAYONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export function EditionZone({
  zone,
}: {
  zone: { centre: { latitude: number; longitude: number }; rayonKm: number };
}) {
  const [saisie, setSaisie] = useState('');
  const [centre, setCentre] = useState(zone.centre);
  const [choisi, setChoisi] = useState<string>();
  const [rayon, setRayon] = useState(zone.rayonKm);
  const lieux = useLieux(saisie, choisi);
  return (
    <FeuilleEdition
      titre="Zone d'intervention"
      entree={() => ({ zone: { centre, rayonKm: rayon } })}
    >
      <Combobox
        label="Ville de départ"
        valeur={saisie}
        onValeurChange={setSaisie}
        options={lieux.map((l) => ({
          id: `${l.nom}-${l.codePostal}`,
          libelle: l.nom,
          complement: l.codePostal,
        }))}
        onSelection={(o) => {
          const l = lieux.find((x) => `${x.nom}-${x.codePostal}` === o.id);
          if (!l) return;
          setCentre(l.centre);
          setChoisi(l.nom);
          setSaisie(l.nom);
        }}
        placeholder="Laisser vide pour garder la ville actuelle"
      />
      <Field label="Rayon d'intervention">
        <Select value={rayon} onChange={(e) => setRayon(Number(e.target.value))}>
          {RAYONS.map((r) => (
            <option key={r} value={r}>
              {r} km
            </option>
          ))}
        </Select>
      </Field>
    </FeuilleEdition>
  );
}
