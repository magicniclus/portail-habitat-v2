import { palettesSites } from '@ph/ui/tokens';
import { coche } from './styles';

const P = palettesSites[0];
const carte = 'rounded-[14px] border border-trait bg-blanc';
const petit = 'text-[clamp(10px,1.2vw,13px)] text-neutre-700';

const INFOS = [
  ['Activité', 'Couverture, zinguerie'],
  ['Zone', '30 km autour de Bordeaux'],
  ['Avis', 'Repris de votre fiche'],
  ['Photos', 'Vos réalisations'],
];

/** 1. L'IA reprend la fiche de l'artisan (rien n'est redemandé, IA_SITE SITE-IA-07). */
export function SceneFiche() {
  return (
    <div className={`${carte} grid w-[min(92%,720px)] gap-4 p-[clamp(16px,3.4%,28px)]`}>
      <div className="flex items-center gap-3">
        <span className="flex size-11 flex-none items-center justify-center rounded-[10px] bg-neutre-900 font-bold text-blanc">
          BR
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <strong className="text-[clamp(13px,1.8vw,18px)]">Bertrand Rénovation</strong>
          <span className={petit}>Couvreur · zingueur, Bordeaux (33000)</span>
        </span>
        <span className="flex flex-none items-center gap-1.5 text-[clamp(10px,1.1vw,12px)] font-bold text-succes">
          <span
            aria-hidden="true"
            className="flex size-[18px] items-center justify-center rounded-full bg-succes text-[10px] text-blanc"
          >
            ✓
          </span>
          Repris de votre fiche
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {INFOS.map(([k, v]) => (
          <span key={k} className="grid gap-0.5 rounded-[10px] bg-accent-100 px-3 py-2.5">
            <span className="text-[clamp(9px,1vw,11px)] uppercase tracking-[0.05em] text-neutre-700">
              {k}
            </span>
            <span className="text-[clamp(11px,1.3vw,14px)] font-semibold">{v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const TACHES = [
  'Page d’accueil',
  'Prestations',
  'Réalisations',
  'Avis clients',
  'Référencement Google',
];

/** 2. Génération : pages cochées une à une, texte en cours de rédaction. */
export function SceneGeneration({ actif }: { actif: boolean }) {
  return (
    <div className="grid w-[min(94%,760px)] grid-cols-2 gap-3.5">
      <div className={`${carte} grid content-start gap-2.5 p-[clamp(12px,2.6%,20px)]`}>
        <strong className="text-[clamp(11px,1.5vw,15px)]">L’IA crée votre site</strong>
        <span className="block h-1.5 overflow-hidden rounded-pill bg-accent-100">
          <span
            className="block h-full origin-left rounded-pill bg-accent transition-transform duration-[3200ms] ease-linear motion-reduce:transition-none"
            style={{ transform: `scaleX(${actif ? 1 : 0.05})` }}
          />
        </span>
        {TACHES.map((t, i) => (
          <span
            key={t}
            className="flex items-center gap-2 text-[clamp(10px,1.3vw,14px)] transition-opacity duration-300 motion-reduce:transition-none"
            style={{
              opacity: actif ? 1 : 0.35,
              transitionDelay: actif ? `${300 + i * 550}ms` : '0ms',
            }}
          >
            <span aria-hidden="true" className={coche}>
              ✓
            </span>
            {t}
          </span>
        ))}
      </div>
      <div className={`${carte} grid content-start gap-2 p-[clamp(12px,2.6%,20px)]`}>
        <span className="text-[clamp(9px,1vw,11px)] font-bold uppercase tracking-[0.06em] text-neutre-700">
          Texte en cours
        </span>
        <strong className="text-[clamp(12px,1.6vw,16px)] leading-[1.25]">
          Couvreur à Bordeaux : toiture, zinguerie et réparation de fuites
        </strong>
        <span className={`${petit} leading-normal`}>
          Bertrand Rénovation refait votre toiture dans les règles de l’art : tuiles, ardoises et
          zinc, chantier nettoyé chaque soir.
          <span
            aria-hidden="true"
            className="ml-px inline-block h-[1em] w-[1.5px] bg-texte align-[-2px] motion-safe:animate-pulse"
          />
        </span>
      </div>
    </div>
  );
}

const PRESTATIONS = ['Couverture', 'Zinguerie', 'Recherche de fuite'];
const NOTES = [
  'Bouton d’appel toujours visible',
  'Textes lisibles sans zoomer',
  'Demande de devis en une minute',
];

/** 3. Le rendu téléphone, vérifié pour l'artisan. */
export function SceneMobile() {
  return (
    <div className="flex h-full w-[94%] items-center justify-center gap-[clamp(16px,4%,40px)]">
      <div className="box-border aspect-[9/18.6] h-[92%] flex-none rounded-[26px] bg-neutre-900 p-1.5">
        <div className="relative h-full overflow-hidden rounded-[20px] bg-blanc text-[8px]">
          <div
            className="grid gap-1.5 px-2.5 pt-7 pb-3"
            style={{ background: P.clair, color: P.sombre }}
          >
            <span className="font-bold uppercase tracking-[0.1em]" style={{ color: P.accent }}>
              Couvreur à Bordeaux
            </span>
            <strong className="text-[13px] leading-[1.1]">
              Votre toiture, refaite dans les règles de l’art.
            </strong>
            <span>Réfection, zinguerie et fuites.</span>
          </div>
          <div className="grid gap-1.5 p-2.5">
            <strong className="text-[11px]" style={{ color: P.sombre }}>
              Nos prestations
            </strong>
            {PRESTATIONS.map((p) => (
              <span key={p} className="rounded-[6px] border border-trait px-2 py-1.5 font-semibold">
                {p}
              </span>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 grid grid-cols-2 gap-1.5 border-t border-trait bg-blanc p-2 text-center font-bold text-blanc">
            <span className="rounded-[6px] py-1.5" style={{ background: P.primaire }}>
              Appeler
            </span>
            <span className="rounded-[6px] py-1.5" style={{ background: P.accent }}>
              Devis gratuit
            </span>
          </div>
        </div>
      </div>
      <ul className="m-0 hidden max-w-[250px] list-none gap-3 p-0 min-[560px]:grid">
        {NOTES.map((n, i) => (
          <li
            key={n}
            className={`${carte} flex items-center gap-2.5 px-3 py-2.5 text-[clamp(11px,1.3vw,14px)] font-semibold`}
          >
            <span className="flex size-[26px] flex-none items-center justify-center rounded-[8px] border border-accent-300 bg-accent-100 text-xs font-bold text-accent-700">
              {i + 1}
            </span>
            {n}
          </li>
        ))}
      </ul>
    </div>
  );
}

const SUITES = [
  ['Modifier', 'Textes et photos'],
  ['Partager', 'Lien et QR code'],
  ['Recevoir', 'Demandes de devis'],
];

/** 4. Publication par l'artisan (l'IA ne publie jamais seule). */
export function ScenePublier() {
  return (
    <div className={`${carte} grid w-[min(88%,640px)] gap-4 p-[clamp(18px,3.6%,30px)]`}>
      <span className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex size-9 flex-none items-center justify-center rounded-full bg-succes-fond font-bold text-succes"
        >
          ✓
        </span>
        <span className="grid gap-px">
          <strong className="text-[clamp(13px,1.8vw,18px)]">Votre site est en ligne</strong>
          <span className={petit}>Publié en un clic sur « Publier »</span>
        </span>
      </span>
      <span className="truncate rounded-[9px] bg-neutre-100 px-3 py-2 text-[clamp(10px,1.3vw,14px)] font-semibold">
        bertrand-renovation.portailtravaux.fr
      </span>
      <span className="grid grid-cols-3 gap-2">
        {SUITES.map(([t, l]) => (
          <span key={t} className="grid gap-0.5 rounded-[8px] border border-trait px-2.5 py-2">
            <strong className="text-[clamp(9px,1.1vw,12px)]">{t}</strong>
            <span className="text-[clamp(8px,1vw,11px)] text-neutre-700">{l}</span>
          </span>
        ))}
      </span>
    </div>
  );
}
