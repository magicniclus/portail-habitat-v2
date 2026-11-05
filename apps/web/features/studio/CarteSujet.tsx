import { SCENES_CAPTURE, type SceneCapture, type SujetStudio } from '@ph/core/studio';
import { Badge, Button } from '@ph/ui';

const ecran = (x: string) =>
  x === 'camera'
    ? 'Face caméra'
    : x === 'ecran'
      ? 'Mon écran'
      : (SCENES_CAPTURE[x as SceneCapture]?.libelle ?? x);

/** Un sujet proposé : accroches, pourquoi il peut marcher, script minuté, légende. */
export function CarteSujet({
  sujet,
  choisi,
  desactive,
  onChoisir,
}: {
  sujet: SujetStudio;
  choisi: boolean;
  desactive: boolean;
  onChoisir: () => void;
}) {
  return (
    <li
      className={`grid content-start gap-2 rounded-card border p-3.5 ${choisi ? 'border-accent bg-accent-100' : 'border-trait'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <strong>{sujet.titre}</strong>
        <Badge tone="neutre">{sujet.dureeCibleS} s</Badge>
      </div>
      <p className="m-0 text-sm">{sujet.angle}</p>
      <p className="m-0 text-sm text-neutre-700">
        <strong>Pourquoi ça peut marcher :</strong> {sujet.pourquoi}
      </p>
      <div>
        <p className="m-0 text-sm font-semibold">Accroches</p>
        <ul className="m-0 pl-5 text-sm">
          {sujet.accroches.map((a) => (
            <li key={a}>« {a} »</li>
          ))}
        </ul>
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">
          Script ({sujet.script.length} phrases)
        </summary>
        <ol className="m-0 grid gap-1.5 pl-5 text-sm">
          {sujet.script.map((l, i) => (
            <li key={i}>
              {l.voix}
              <span className="block text-xs text-neutre-700">
                À l’écran : {ecran(l.aEcran)}
                {l.texteEcran ? ` · texte « ${l.texteEcran} »` : ''}
              </span>
            </li>
          ))}
        </ol>
      </details>
      <p className="m-0 text-xs text-neutre-700">
        {sujet.legende} {sujet.hashtags.join(' ')}
      </p>
      <div>
        <Button
          variant={choisi ? 'secondaire' : 'primaire'}
          disabled={desactive || choisi}
          onClick={onChoisir}
        >
          {choisi ? 'Sujet choisi' : 'Choisir ce sujet'}
        </Button>
      </div>
    </li>
  );
}
