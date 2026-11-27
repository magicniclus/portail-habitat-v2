'use client';

import { formatTel } from '@ph/core/format';
import type { ComptePro } from '@ph/firebase/pro';
import { Banner, Button, Field, Input } from '@ph/ui';
import { useState } from 'react';
import { LigneReglage } from '@/features/espace/LigneReglage';
import { posterJson } from '@/lib/posterJson';
import { FeuilleCompte } from './FeuilleCompte';
import { VerifierTelephone } from './VerifierTelephone';

const modifier = (libelle: string) => (
  <Button variant="secondaire" taille="sm" aria-label={libelle}>
    Modifier
  </Button>
);

/** Profil (maquette Mon Compte) : nom, email de connexion, mobile. */
export function ProfilCompte({
  profil,
  smsActif,
}: {
  profil: ComptePro['profil'];
  smsActif: boolean;
}) {
  const [prenom, setPrenom] = useState(profil.prenom);
  const [nom, setNom] = useState(profil.nom);
  const [tel, setTel] = useState(profil.telephone ? formatTel(profil.telephone) : '');
  const [email, setEmail] = useState('');
  const [envoye, setEnvoye] = useState<string | null>(null);

  const enregistrer = async (e: Record<string, string>) => {
    const r = await posterJson<null>('/api/pro/compte/profil', { prenom, nom, ...e });
    return r.ok ? null : r.message;
  };

  const telephone = profil.telephone
    ? `${formatTel(profil.telephone)} · ${profil.telephoneVerifie ? 'vérifié par SMS' : 'non vérifié'}`
    : 'Non renseigné';

  return (
    <>
      <LigneReglage
        libelle="Nom"
        valeur={`${profil.prenom} ${profil.nom}`.trim() || 'Non renseigné'}
        action={
          <FeuilleCompte
            titre="Votre nom"
            declencheur={modifier('Modifier le nom')}
            envoyer={() => enregistrer({})}
          >
            <Field label="Prénom" requis>
              <Input
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                autoComplete="given-name"
                required
              />
            </Field>
            <Field label="Nom" requis>
              <Input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                autoComplete="family-name"
                required
              />
            </Field>
          </FeuilleCompte>
        }
      />
      <LigneReglage
        libelle="Email de connexion"
        valeur={`${profil.email}${profil.emailVerifie ? ' · vérifié' : ' · non vérifié'}`}
        action={
          <FeuilleCompte
            titre="Changer d'email"
            description="Un lien de confirmation part à la nouvelle adresse et une alerte à l'ancienne. L'adresse change au clic sur le lien."
            declencheur={
              <Button variant="secondaire" taille="sm">
                Changer d&apos;email
              </Button>
            }
            libelleEnvoi="Envoyer le lien"
            envoyer={async () => {
              const r = await posterJson<null>('/api/pro/compte/email', { email });
              if (r.ok) setEnvoye(email);
              return r.ok ? null : r.message;
            }}
          >
            <Field label="Nouvelle adresse email" requis>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </Field>
          </FeuilleCompte>
        }
      />
      <LigneReglage
        id="telephone"
        libelle="Mobile"
        valeur={telephone}
        action={
          <span className="flex flex-wrap gap-2">
            {smsActif && profil.telephone && !profil.telephoneVerifie ? (
              <VerifierTelephone telephone={profil.telephone} />
            ) : null}
            <FeuilleCompte
              titre="Votre mobile"
              description={
                smsActif
                  ? 'Vérifiez-le ensuite par SMS : il compte pour la complétude de votre fiche.'
                  : 'Numéro utilisé par notre équipe pour vous joindre. Il n’est pas affiché sur votre fiche.'
              }
              declencheur={modifier('Modifier le mobile')}
              envoyer={() => enregistrer({ telephone: tel })}
            >
              <Field label="Numéro de mobile" aide="Laissez vide pour le retirer.">
                <Input
                  type="tel"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                />
              </Field>
            </FeuilleCompte>
          </span>
        }
      />
      {envoye ? (
        <Banner tone="succes">
          Lien envoyé à {envoye}. Cliquez dessus pour terminer le changement.
        </Banner>
      ) : null}
    </>
  );
}
