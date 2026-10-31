'use client';

import { TAUX_TVA } from '@ph/core/devis';
import { Banner, Button, Checkbox, Field, Input, Select } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { posterJson } from '@/lib/posterJson';

type Valeurs = Record<string, unknown>;
const texte = (v: Valeurs, k: string) => (typeof v[k] === 'string' ? (v[k] as string) : '');
const sous = (v: Valeurs, k: string, s: string) =>
  typeof (v[k] as Valeurs | undefined)?.[s] === 'string' ? ((v[k] as Valeurs)[s] as string) : '';

/**
 * Paramètres de facturation : saisis une fois, repris sur chaque devis et facture (mentions
 * obligatoires, DATABASE §8 bis). Propriétaire et gérant.
 */
export function FormulaireParametres({
  valeurs,
  modifiable,
}: {
  valeurs: Valeurs;
  modifiable: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const envoyer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const t = (n: string) => String(f.get(n) ?? '').trim();
    const opt = (n: string) => (t(n) ? { [n]: t(n) } : {});
    const nombre = (n: string, d: number) => {
      const x = Number(t(n).replace(',', '.'));
      return Number.isFinite(x) && t(n) ? x : d;
    };
    const corps = {
      raisonSociale: t('raisonSociale'),
      ...opt('formeJuridique'),
      ...opt('capitalSocial'),
      adresseSiege: t('adresseSiege'),
      siret: t('siret'),
      ...opt('rne'),
      ...opt('tvaIntra'),
      franchiseTva: f.get('franchiseTva') === 'on',
      tvaSurDebits: f.get('tvaSurDebits') === 'on',
      ...(t('assureur')
        ? {
            assuranceDecennale: { assureur: t('assureur'), contrat: t('contrat'), zone: t('zone') },
          }
        : {}),
      ...opt('rcPro'),
      ...(t('mediateurNom')
        ? {
            mediateur: {
              nom: t('mediateurNom'),
              adresse: t('mediateurAdresse'),
              ...(t('mediateurSite') ? { site: t('mediateurSite') } : {}),
            },
          }
        : {}),
      ...opt('conditionsPaiement'),
      // IBAN : vide = inchangé ; « Retirer » = supprimé ; sinon vérifié et chiffré par le serveur.
      ...(t('iban') ? { iban: t('iban') } : f.get('retirerIban') === 'on' ? { iban: '' } : {}),
      delaiPaiementJours: Math.round(nombre('delaiPaiementJours', 30)),
      acompteDefautPct: nombre('acompteDefautPct', 30),
      validiteDevisJours: Math.round(nombre('validiteDevisJours', 30)),
      tvaDefaut: Number(t('tvaDefaut')) || 10,
      tauxPenalitesAnnuel: nombre('tauxPenalitesAnnuel', 12.15),
    };
    setEnCours(true);
    const r = await posterJson<null>('/api/pro/devis/parametres', corps);
    setEnCours(false);
    if (!r.ok) return setMessage({ ton: 'danger', texte: r.message });
    setMessage({ ton: 'succes', texte: 'Paramètres enregistrés.' });
    router.refresh();
  };
  const champ = (name: string, label: string, valeur: string, aide?: string) => (
    <Field label={label} aide={aide}>
      <Input name={name} defaultValue={valeur} disabled={!modifiable} />
    </Field>
  );
  return (
    <form onSubmit={envoyer} className="grid gap-6">
      {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
      <fieldset className="m-0 grid gap-3 border-0 p-0 min-[700px]:grid-cols-2">
        <legend className="mb-2 text-lg font-bold">Identité de l’entreprise</legend>
        {champ('raisonSociale', 'Raison sociale', texte(valeurs, 'raisonSociale'))}
        {champ('formeJuridique', 'Forme juridique', texte(valeurs, 'formeJuridique'))}
        {champ('capitalSocial', 'Capital social', texte(valeurs, 'capitalSocial'))}
        {champ('adresseSiege', 'Adresse du siège', texte(valeurs, 'adresseSiege'))}
        {champ('siret', 'SIRET', texte(valeurs, 'siret'))}
        {champ('rne', 'RNE / RCS', texte(valeurs, 'rne'))}
        {champ('tvaIntra', 'N° de TVA intracommunautaire', texte(valeurs, 'tvaIntra'))}
      </fieldset>
      <fieldset className="m-0 grid gap-3 border-0 p-0 min-[700px]:grid-cols-3">
        <legend className="mb-2 text-lg font-bold">
          Assurance décennale (si votre métier y est soumis)
        </legend>
        {champ('assureur', 'Assureur', sous(valeurs, 'assuranceDecennale', 'assureur'))}
        {champ('contrat', 'N° de contrat', sous(valeurs, 'assuranceDecennale', 'contrat'))}
        {champ('zone', 'Couverture géographique', sous(valeurs, 'assuranceDecennale', 'zone'))}
        {champ('rcPro', 'RC professionnelle (facultatif)', texte(valeurs, 'rcPro'))}
      </fieldset>
      <fieldset className="m-0 grid gap-3 border-0 p-0 min-[700px]:grid-cols-3">
        <legend className="mb-2 text-lg font-bold">
          Médiateur de la consommation (clients particuliers)
        </legend>
        {champ('mediateurNom', 'Nom', sous(valeurs, 'mediateur', 'nom'))}
        {champ('mediateurAdresse', 'Adresse', sous(valeurs, 'mediateur', 'adresse'))}
        {champ('mediateurSite', 'Site internet', sous(valeurs, 'mediateur', 'site'))}
      </fieldset>
      <fieldset className="m-0 grid gap-3 border-0 p-0 min-[700px]:grid-cols-3">
        <legend className="mb-2 text-lg font-bold">Conditions par défaut</legend>
        {champ(
          'delaiPaiementJours',
          'Délai de paiement (jours)',
          String(valeurs.delaiPaiementJours ?? 30),
        )}
        {champ(
          'acompteDefautPct',
          'Acompte par défaut (%)',
          String(valeurs.acompteDefautPct ?? 30),
        )}
        {champ(
          'validiteDevisJours',
          'Validité des devis (jours)',
          String(valeurs.validiteDevisJours ?? 30),
        )}
        {champ(
          'tauxPenalitesAnnuel',
          'Pénalités de retard (% par an)',
          String(valeurs.tauxPenalitesAnnuel ?? 12.15),
          '3 fois le taux d’intérêt légal au minimum.',
        )}
        <Field label="TVA par défaut">
          <Select
            name="tvaDefaut"
            defaultValue={String(valeurs.tvaDefaut ?? 10)}
            disabled={!modifiable}
          >
            {TAUX_TVA.map((t) => (
              <option key={t} value={t}>
                {String(t).replace('.', ',')} %
              </option>
            ))}
          </Select>
        </Field>
        {champ(
          'conditionsPaiement',
          'Moyens de paiement acceptés',
          texte(valeurs, 'conditionsPaiement'),
          'Ex. : virement (IBAN sur la facture), chèque.',
        )}
        {champ(
          'iban',
          'IBAN (imprimé sur vos factures)',
          '',
          valeurs.ibanFin
            ? `Enregistré, se termine par ${texte(valeurs, 'ibanFin')}. Laissez vide pour le garder.`
            : 'Conservé chiffré ; seuls les 4 derniers caractères s’affichent ici.',
        )}
        {valeurs.ibanFin && modifiable ? (
          <Checkbox name="retirerIban">Retirer l’IBAN des factures</Checkbox>
        ) : null}
      </fieldset>
      <div className="grid gap-2">
        <Checkbox
          name="franchiseTva"
          defaultChecked={valeurs.franchiseTva === true}
          disabled={!modifiable}
        >
          Franchise en base de TVA (« TVA non applicable, art. 293 B du CGI »)
        </Checkbox>
        <Checkbox
          name="tvaSurDebits"
          defaultChecked={valeurs.tvaSurDebits === true}
          disabled={!modifiable}
        >
          Option pour le paiement de la TVA d’après les débits
        </Checkbox>
      </div>
      {modifiable ? (
        <div>
          <Button chargement={enCours} type="submit" disabled={enCours}>
            {enCours ? 'Enregistrement…' : 'Enregistrer les paramètres'}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
