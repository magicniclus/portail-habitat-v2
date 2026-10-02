import { Body, Container, Head, Html, Link, Preview, Section, Text } from '@react-email/components';
import { couleursEmail as c } from '@ph/ui/tokens';
import type { Bloc } from '../blocs';
import { RAISONS, type CharteEmail } from '../chartes';
import type { Categorie } from '@ph/core/notifications';
import { policeEmail, RenduBloc } from './Blocs';

export interface PiedEmail {
  preferences: string;
  /** Présent seulement pour les catégories désabonnables. */
  desabonnement?: string;
  aide: string;
  /** Raison sociale et adresse postale de l'éditeur (mention obligatoire). */
  editeur: string;
}

export interface ProprietesEmail {
  preheader: string;
  blocs: Bloc[];
  charte: CharteEmail;
  categorie: Categorie;
  pied: PiedEmail;
}

/** Mise en page commune aux 4 chartes : en-tête, carte à liseré, signature, pied légal. 600 px. */
export function Email({ preheader, blocs, charte: t, categorie, pied }: ProprietesEmail) {
  const { raison, desabonnable } = RAISONS[categorie];
  return (
    <Html lang="fr">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
      </Head>
      <Preview>{preheader}</Preview>
      <Body style={{ margin: 0, background: c.fondPage, fontFamily: policeEmail }}>
        <Container style={{ maxWidth: 600, padding: '24px 12px' }}>
          <Text
            style={{
              margin: '0 0 14px',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: c.titre,
            }}
          >
            PORTAIL HABITAT{' '}
            {t.suffixe ? (
              <span style={{ letterSpacing: '0.18em', color: t.fonce }}>{t.suffixe}</span>
            ) : null}
          </Text>
          <Section
            style={{
              background: c.blanc,
              borderRadius: 14,
              borderTop: `4px solid ${t.accent}`,
              padding: '32px 28px',
            }}
          >
            {blocs.map((b, i) => (
              <Section key={i} style={{ paddingBottom: 18 }}>
                <RenduBloc bloc={b} charte={t} />
              </Section>
            ))}
            <Text style={{ margin: 0, fontSize: 15, lineHeight: '1.5', color: c.corps }}>
              {t.signature}
            </Text>
          </Section>
          <Section style={{ padding: '18px 8px 4px', textAlign: 'center' }}>
            <Text style={{ margin: '0 0 8px', fontSize: 12.5, lineHeight: '1.55', color: c.doux }}>
              {raison}
            </Text>
            <Text style={{ margin: '0 0 8px', fontSize: 12.5 }}>
              <Link href={pied.preferences} style={{ color: c.lien }}>
                Mes préférences
              </Link>
              {desabonnable && pied.desabonnement ? (
                <>
                  {' · '}
                  <Link href={pied.desabonnement} style={{ color: c.lien }}>
                    Se désabonner de ces emails
                  </Link>
                </>
              ) : null}
              {' · '}
              <Link href={pied.aide} style={{ color: c.lien }}>
                Aide
              </Link>
            </Text>
            <Text style={{ margin: 0, fontSize: 12.5, color: c.doux }}>{pied.editeur}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
