'use client';

import { LIBELLES_TON, TONS_REDACTION } from '@ph/core/ia';
import { Banner, bouton, Button, Field, Input, Modal, Select, Textarea } from '@ph/ui';
import { SparkleIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

type Proposition = { texte: string; redactionId: string };
type Ton = (typeof TONS_REDACTION)[number];

/**
 * « Remplir ma fiche avec l'IA » (gratuit, sans abonnement) : à partir des informations déjà
 * enregistrées (nom, métiers, ville, année de création du SIRET) et de deux réponses courtes,
 * l'IA propose l'accroche et la présentation. Rien n'est enregistré sans « Enregistrer sur ma
 * fiche » ; tout reste modifiable. Même quota que l'assistant de rédaction (20 aides par jour).
 */
export function RemplirFicheIa({ vide }: { vide: boolean }) {
  const router = useRouter();
  const [ouverte, setOuverte] = useState(false);
  const [specialites, setSpecialites] = useState('');
  const [atouts, setAtouts] = useState('');
  const [ton, setTon] = useState<Ton>('professionnel');
  const [accroche, setAccroche] = useState<Proposition | null>(null);
  const [apropos, setApropos] = useState<Proposition | null>(null);
  const [enCours, setEnCours] = useState<'creation' | 'enregistrement' | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const notes = [specialites && `Spécialités : ${specialites}`, atouts && `Atouts : ${atouts}`]
    .filter(Boolean)
    .join('. ');
  const creer = async () => {
    setEnCours('creation');
    setErreur(null);
    const demande = (type: 'accroche' | 'apropos') =>
      posterJson<Proposition>('/api/pro/redaction', {
        type,
        action: 'generer',
        texte: '',
        ...(notes ? { infos: { notes: `${notes}. Ton souhaité : ${LIBELLES_TON[ton]}.` } } : {}),
      });
    const [a, p] = await Promise.all([demande('accroche'), demande('apropos')]);
    setEnCours(null);
    if (!a.ok) return setErreur(a.message);
    if (!p.ok) return setErreur(p.message);
    setAccroche(a.data);
    setApropos(p.data);
  };
  const enregistrer = async () => {
    if (!accroche || !apropos) return;
    setEnCours('enregistrement');
    setErreur(null);
    const r = await posterJson('/api/pro/fiche', {
      pitch: accroche.texte.trim(),
      description: apropos.texte.trim(),
    });
    if (!r.ok) {
      setEnCours(null);
      return setErreur(r.message);
    }
    // Mesure du taux d'acceptation (le texte n'est jamais stocké dans le journal).
    for (const x of [accroche, apropos])
      void posterJson('/api/pro/redaction/acceptee', { redactionId: x.redactionId });
    setEnCours(null);
    setOuverte(false);
    router.refresh();
  };

  return (
    <Modal
      open={ouverte}
      onOpenChange={setOuverte}
      declencheur={
        vide ? (
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-3 rounded-card border border-accent-200 bg-accent-100 p-4 text-left"
          >
            <SparkleIcon size={28} weight="fill" aria-hidden="true" className="text-accent-700" />
            <span className="grid gap-0.5">
              <strong className="text-[16px]">Remplir ma fiche avec l’IA, en un clic</strong>
              <span className="text-sm text-neutre-800">
                Accroche et présentation rédigées à partir de vos informations. Gratuit.
              </span>
            </span>
          </button>
        ) : (
          <button type="button" className={bouton({ variant: 'secondaire', taille: 'sm' })}>
            <SparkleIcon size={16} aria-hidden="true" />
            Réécrire ma fiche avec l’IA
          </button>
        )
      }
      titre="Remplir ma fiche avec l’IA"
      description="Nous partons de votre nom, de vos métiers, de votre ville et de l’année de création de votre entreprise (SIRET). Deux réponses rapides suffisent."
      actions={
        accroche && apropos ? (
          <>
            <Button variant="fantome" onClick={() => void creer()} disabled={enCours !== null}>
              Proposer autre chose
            </Button>
            <Button
              chargement={enCours === 'enregistrement'}
              onClick={() => void enregistrer()}
              disabled={enCours !== null}
            >
              Enregistrer sur ma fiche
            </Button>
          </>
        ) : (
          <Button
            chargement={enCours === 'creation'}
            onClick={() => void creer()}
            disabled={enCours !== null}
          >
            {enCours === 'creation' ? 'Rédaction…' : 'Créer le contenu de ma fiche'}
          </Button>
        )
      }
    >
      <div className="grid gap-4">
        {accroche && apropos ? (
          <>
            <Field
              label="Accroche"
              aide={`Affichée dans l’annuaire (${accroche.texte.length}/280).`}
            >
              <Input
                value={accroche.texte}
                maxLength={280}
                onChange={(e) => setAccroche({ ...accroche, texte: e.target.value })}
              />
            </Field>
            <Field label="À propos" aide="Relisez et modifiez librement avant d’enregistrer.">
              <Textarea
                value={apropos.texte}
                rows={8}
                maxLength={3000}
                onChange={(e) => setApropos({ ...apropos, texte: e.target.value })}
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Vos spécialités" aide="Facultatif. Exemple : salles de bain, dépannage.">
              <Input
                value={specialites}
                maxLength={150}
                onChange={(e) => setSpecialites(e.target.value)}
              />
            </Field>
            <Field
              label="Ce qui vous distingue"
              aide="Facultatif. Seulement des faits vrais : l’IA n’invente rien."
            >
              <Textarea
                value={atouts}
                rows={3}
                maxLength={200}
                onChange={(e) => setAtouts(e.target.value)}
              />
            </Field>
            <Field label="Ton">
              <Select value={ton} onChange={(e) => setTon(e.target.value as Ton)}>
                {TONS_REDACTION.map((t) => (
                  <option key={t} value={t}>
                    {LIBELLES_TON[t]}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      </div>
    </Modal>
  );
}
