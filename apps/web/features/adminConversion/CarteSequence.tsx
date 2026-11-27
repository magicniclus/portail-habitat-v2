import { DECLENCHEURS_SEQUENCE, LIBELLES_ETAPE_CYCLE } from '@ph/core/conversion';
import { formatNombre } from '@ph/core/format';
import type { SequenceAdmin } from '@ph/firebase/admin-serveur';
import { Card, CardBody, CardHeader, CardTitle, StatusBadge } from '@ph/ui';
import type { EtapeSaisie } from './EtapesSequence';
import { ActionsSequence } from './ActionsSequence';
import { EditeurSequence } from './EditeurSequence';
import { SupprimerSequence } from './SupprimerSequence';

const quand = (e: SequenceAdmin['etapes'][number]) =>
  e.declencheur === 'delai'
    ? `J+${String(e.valeur ?? 0)}`
    : `${DECLENCHEURS_SEQUENCE[e.declencheur]}${e.valeur && e.declencheur !== 'signal' ? ` · ${String(e.valeur)}` : ''}`;

/** Une séquence : statut, entreprises en cours, envois, étapes et actions (CONV-05). */
export function CarteSequence({
  seq,
  autres,
  modeles,
  desactive,
}: {
  seq: SequenceAdmin;
  autres: { id: string; nom: string }[];
  modeles: string[];
  desactive?: string | undefined;
}) {
  return (
    <section aria-label={`Séquence ${seq.id}`}>
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>
            {seq.id} · {seq.nom}
          </CardTitle>
          <StatusBadge
            statut={
              seq.actif
                ? { libelle: 'Active', tone: 'succes' }
                : { libelle: 'En pause', tone: 'neutre' }
            }
          />
        </CardHeader>
        <CardBody className="grid gap-3">
          <p className="m-0 text-sm text-neutre-800">
            Entrée : {LIBELLES_ETAPE_CYCLE[seq.etapeEntree] ?? seq.etapeEntree} · objectif :{' '}
            {seq.objectif} · {formatNombre(seq.enCours)} en cours · {formatNombre(seq.envois30j)}{' '}
            envois sur 30 j{seq.version ? ` · version ${seq.version}` : ' · version initiale'}
          </p>
          <ol className="m-0 grid gap-1 pl-5 text-sm">
            {seq.etapes.map((e, i) => (
              <li key={i}>
                {e.modele} · {quand(e)}
                {e.ab?.length ? ' · test A/B' : ''}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <EditeurSequence
              libelle="Modifier"
              modeles={modeles}
              desactive={desactive}
              initiale={{
                id: seq.id,
                nom: seq.nom,
                etapeEntree: seq.etapeEntree,
                objectif: seq.objectif,
                actif: seq.actif,
                etapes: seq.etapes as EtapeSaisie[],
              }}
            />
            <ActionsSequence id={seq.id} actif={seq.actif} desactive={desactive} />
            <SupprimerSequence
              id={seq.id}
              enCours={seq.enCours}
              autres={autres}
              desactive={desactive}
            />
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
