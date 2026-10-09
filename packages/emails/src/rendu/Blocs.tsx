import { Button, Column, Heading, Link, Row, Section, Text } from '@react-email/components';
import { couleursEmail as c, polices } from '@ph/ui/tokens';
import type { CSSProperties } from 'react';
import type { Bloc } from '../blocs';
import type { CharteEmail } from '../chartes';

const texte: CSSProperties = { margin: 0, fontSize: 16, lineHeight: '1.6', color: c.corps };
const cadre: CSSProperties = { border: `1px solid ${c.bord}`, borderRadius: 12 };
/** Visible seulement dans la version texte (séparateur clé / valeur). */
const masque: CSSProperties = {
  display: 'none',
  fontSize: 0,
  lineHeight: 0,
  maxHeight: 0,
  overflow: 'hidden',
};
const separe = (i: number): CSSProperties => (i ? { borderTop: `1px solid ${c.separateur}` } : {});

/** Rendu d'un bloc (maquette Modeles Emails) : tableaux et styles en ligne, lisibles sans images. */
export function RenduBloc({ bloc: b, charte: t }: { bloc: Bloc; charte: CharteEmail }) {
  switch (b.type) {
    case 'surtitre':
      return (
        <Text
          style={{
            ...texte,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: t.fonce,
          }}
        >
          {b.texte}
        </Text>
      );
    case 'titre':
      return b.niveau === 2 ? (
        <Heading
          as="h2"
          style={{ margin: '6px 0 0', fontSize: 17, lineHeight: '1.3', color: c.titre }}
        >
          {b.texte}
        </Heading>
      ) : (
        <Heading as="h1" style={{ margin: 0, fontSize: 26, lineHeight: '1.2', color: c.titre }}>
          {b.texte}
        </Heading>
      );
    case 'paragraphe':
      return <Text style={texte}>{b.texte}</Text>;
    case 'citation':
      return (
        <Text
          style={{
            ...texte,
            fontStyle: 'italic',
            padding: '12px 16px',
            borderRadius: 10,
            background: c.fondBloc,
          }}
        >
          {b.texte}
        </Text>
      );
    case 'bouton':
      return (
        <Button
          href={b.url}
          style={{
            display: 'inline-block',
            padding: '14px 26px',
            borderRadius: 10,
            background: t.action,
            color: c.blanc,
            fontSize: 16,
            fontWeight: 700,
            textDecoration: 'none',
            minHeight: 44,
          }}
        >
          {b.texte}
        </Button>
      );
    case 'lien':
      return (
        <Link href={b.url} style={{ fontSize: 15, fontWeight: 600, color: t.fonce }}>
          {b.texte}
        </Link>
      );
    case 'code':
      return (
        <Text
          style={{
            ...texte,
            textAlign: 'center',
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '0.3em',
            padding: '16px 0',
            borderRadius: 12,
            background: t.clair,
            color: t.fonce,
            fontFamily: 'monospace',
          }}
        >
          {b.texte}
        </Text>
      );
    case 'recap':
      return (
        <Section style={{ ...cadre, background: c.fondBloc, padding: '2px 18px' }}>
          {b.lignes.map((l, i) => (
            <Row key={l.cle} style={separe(i)}>
              <Column style={{ padding: '11px 0', fontSize: 15, color: c.doux }}>
                {l.cle}
                <span style={masque}> : </span>
              </Column>
              <Column
                style={{
                  padding: '11px 0',
                  fontSize: 15,
                  color: c.titre,
                  fontWeight: l.fort ? 700 : 500,
                  textAlign: 'right',
                }}
              >
                {l.valeur}
              </Column>
            </Row>
          ))}
        </Section>
      );
    case 'alerte': {
      const ton = c.tons[b.ton];
      return (
        <Text
          style={{
            ...texte,
            fontSize: 15.5,
            lineHeight: '1.5',
            fontWeight: 600,
            padding: '14px 16px',
            borderRadius: 10,
            background: ton.fond,
            color: ton.texte,
          }}
        >
          {b.texte}
        </Text>
      );
    }
    case 'etapes':
      return (
        <Section>
          {b.etapes.map((e, i) => (
            <Row key={e.texte} style={{ paddingBottom: 10 }}>
              <Column style={{ width: 34, verticalAlign: 'top' }}>
                <Text
                  style={{
                    margin: 0,
                    width: 24,
                    height: 24,
                    lineHeight: '24px',
                    borderRadius: 99,
                    textAlign: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    background: e.fait ? t.accent : c.blanc,
                    color: e.fait ? c.blanc : t.fonce,
                    border: e.fait ? 0 : `2px solid ${t.clair2}`,
                  }}
                >
                  {e.fait ? '✓' : String(i + 1)}
                </Text>
              </Column>
              <Column
                style={{
                  fontSize: 15.5,
                  lineHeight: '1.45',
                  color: e.fait ? c.doux : c.titre,
                  textDecoration: e.fait ? 'line-through' : 'none',
                }}
              >
                {e.fait ? <span aria-label="fait">{e.texte}</span> : e.texte}
              </Column>
            </Row>
          ))}
        </Section>
      );
    case 'progression':
      return (
        <Section>
          <Row>
            <Column style={{ fontSize: 14, color: c.lien }}>{b.libelle}</Column>
            <Column style={{ fontSize: 14, fontWeight: 700, color: c.titre, textAlign: 'right' }}>
              {b.pourcent} %
            </Column>
          </Row>
          <div style={{ height: 8, borderRadius: 99, background: c.separateur, marginTop: 6 }}>
            <div
              style={{ height: 8, width: `${b.pourcent}%`, borderRadius: 99, background: t.accent }}
            />
          </div>
        </Section>
      );
    case 'stats':
      return (
        <Row>
          {b.stats.map((s) => (
            <Column
              key={s.libelle}
              style={{ padding: 12, borderRadius: 12, background: t.clair, verticalAlign: 'top' }}
            >
              <span style={{ fontSize: 26, fontWeight: 700, color: t.fonce }}>{s.valeur}</span>
              {s.evolution ? (
                <span style={{ fontSize: 13, fontWeight: 700, color: c.hausse }}>
                  {' '}
                  {s.evolution}
                </span>
              ) : null}
              <div style={{ fontSize: 14, lineHeight: '1.35', color: c.corps }}>{s.libelle}</div>
            </Column>
          ))}
        </Row>
      );
    case 'carteArtisan':
      return (
        <Section style={{ ...cadre, padding: 14 }}>
          <Row>
            <Column style={{ width: 70 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  lineHeight: '56px',
                  borderRadius: 12,
                  textAlign: 'center',
                  fontSize: 19,
                  fontWeight: 700,
                  background: t.clair,
                  color: t.fonce,
                }}
              >
                {b.initiales}
              </div>
            </Column>
            <Column>
              <div style={{ fontSize: 16.5, fontWeight: 700, color: c.titre }}>{b.nom}</div>
              <div style={{ fontSize: 14, color: c.lien }}>
                <span style={{ color: c.etoile }}>★</span> {b.meta}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.fonce }}>{b.labels}</div>
            </Column>
          </Row>
        </Section>
      );
    case 'etoiles':
      return (
        <Section style={{ ...cadre, background: c.fondBloc, padding: 16, textAlign: 'center' }}>
          <Link
            href={b.url}
            style={{ fontSize: 34, color: c.etoile, letterSpacing: 6, textDecoration: 'none' }}
          >
            ☆☆☆☆☆
          </Link>
          <Text style={{ ...texte, fontSize: 14, color: c.doux }}>
            Touchez une étoile pour commencer votre avis
          </Text>
        </Section>
      );
    case 'statuts':
      return (
        <Section style={{ ...cadre, padding: '2px 16px' }}>
          {b.lignes.map((l, i) => (
            <Row key={l.nom} style={separe(i)}>
              <Column style={{ padding: '11px 0', fontSize: 15, fontWeight: 600, color: c.titre }}>
                {l.nom}
              </Column>
              <Column style={{ padding: '11px 0' }}>
                {l.statut ? (
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: 99,
                      background: c.tons[l.ton].fond,
                      color: c.tons[l.ton].texte,
                    }}
                  >
                    {l.statut}
                  </span>
                ) : null}
              </Column>
              <Column
                style={{ padding: '11px 0', fontSize: 14, color: c.lien, textAlign: 'right' }}
              >
                {l.valeur}
              </Column>
            </Row>
          ))}
        </Section>
      );
    case 'note':
      return (
        <Text style={{ ...texte, fontSize: 13.5, lineHeight: '1.55', color: c.doux }}>
          {b.texte}
        </Text>
      );
  }
}

export const policeEmail = polices.sans;
