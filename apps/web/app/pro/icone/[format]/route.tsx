import { actions, couleurs } from '@ph/ui/tokens';
import { ImageResponse } from 'next/og';
import { FORMATS_ICONE, TAILLES_ICONE, type FormatIcone } from '@/features/pwa/manifest';

export const dynamic = 'force-static';
export const dynamicParams = false;
export const generateStaticParams = () => FORMATS_ICONE.map((format) => ({ format }));

/** Icônes de l'application pro, générées à la compilation (aucun fichier binaire dans le dépôt). */
export async function GET(_r: Request, { params }: { params: Promise<{ format: string }> }) {
  const format = (await params).format as FormatIcone;
  const taille = TAILLES_ICONE[format];
  // Icône « maskable » : fond plein, dessin réduit dans la zone sûre ; sinon coins arrondis.
  const masquable = format === 'maskable';
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: actions.pro,
        borderRadius: masquable || format === 'apple' ? 0 : taille * 0.22,
        color: couleurs.blanc,
        fontSize: taille * (masquable ? 0.3 : 0.4),
        fontWeight: 800,
        letterSpacing: -taille * 0.01,
      }}
    >
      PH
    </div>,
    { width: taille, height: taille },
  );
}
