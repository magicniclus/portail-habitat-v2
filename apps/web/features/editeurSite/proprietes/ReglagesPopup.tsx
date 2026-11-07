'use client';

import type { Section } from '@ph/core/sites';
import { Curseur, Groupe, Info, Interrupteur, Segments } from './controles';
import type { ContexteReglages } from './contexte';

type Popup = NonNullable<Section['p']['popup']>;

/**
 * Zone en fenêtre pop-up : elle quitte la page et s'ouvre en fenêtre (feuille du bas sur mobile),
 * au clic sur un bouton (action « Pop-up »), après quelques secondes ou à la sortie de la page.
 */
export function ReglagesPopup({ zone: z, c }: { zone: Section; c: ContexteReglages }) {
  const p = z.p.popup;
  const maj = (r: Partial<Popup>) => c.maj({ popup: { ...p!, ...r } });
  return (
    <Groupe titre="Fenêtre pop-up">
      <Interrupteur
        libelle="Afficher cette zone en fenêtre pop-up"
        actif={Boolean(p)}
        onChange={(on) => {
          if (!on) return c.maj({ popup: undefined });
          // L'ancre sert d'adresse à la fenêtre (boutons « Pop-up » de la page).
          c.ancrerZone(c.pageId, z.id);
          c.maj({ popup: { ouverture: 'clic', delai: 5, largeur: 'moyenne' } });
        }}
      />
      {p ? (
        <>
          <Segments
            libelle="Ouverture"
            valeur={p.ouverture}
            options={[
              ['clic', 'Au clic'],
              ['delai', 'Après un délai'],
              ['sortie', 'En partant'],
            ]}
            onChange={(ouverture) => maj({ ouverture })}
          />
          {p.ouverture === 'delai' ? (
            <Curseur
              libelle="Délai"
              valeur={p.delai}
              min={1}
              max={60}
              unite="s"
              onChange={(delai) => maj({ delai })}
            />
          ) : null}
          <Segments
            libelle="Largeur"
            valeur={p.largeur}
            options={[
              ['petite', 'Petite'],
              ['moyenne', 'Moyenne'],
              ['grande', 'Grande'],
            ]}
            onChange={(largeur) => maj({ largeur })}
          />
          <Info>
            {p.ouverture === 'clic'
              ? 'Pour l’ouvrir : sur un bouton, Action au clic › Pop-up.'
              : p.ouverture === 'sortie'
                ? 'S’ouvre une fois, quand la souris quitte la page (ordinateur).'
                : 'S’ouvre une fois par visite de la page.'}{' '}
            Essayez-la dans l’Aperçu.
          </Info>
        </>
      ) : null}
    </Groupe>
  );
}
