/**
 * Fournisseurs d'envoi derrière des interfaces remplaçables (EMAILS §1) : Resend (email, UE),
 * Brevo (SMS) ; en local et en staging, capture par Mailpit (EMAIL_CAPTURE=mailpit), aucun envoi réel.
 */
interface MessageEmail {
  de: string;
  a: string;
  sujet: string;
  html: string;
  texte: string;
  repondreA?: string;
  entetes?: Record<string, string>;
}
export interface EnvoiEmail {
  envoyer: (m: MessageEmail) => Promise<{ id: string }>;
}
export interface EnvoiSms {
  envoyer: (m: { a: string; texte: string }) => Promise<{ id: string }>;
}

type Fetch = typeof fetch;

async function reponseJson(r: Response, fournisseur: string) {
  if (!r.ok) throw new Error(`${fournisseur} ${r.status} : ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as Record<string, unknown>;
}

export function resend(cle: string, f: Fetch = fetch): EnvoiEmail {
  return {
    async envoyer(m) {
      const r = await f('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${cle}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: m.de,
          to: [m.a],
          subject: m.sujet,
          html: m.html,
          text: m.texte,
          ...(m.repondreA ? { reply_to: m.repondreA } : {}),
          ...(m.entetes ? { headers: m.entetes } : {}),
        }),
      });
      return { id: String((await reponseJson(r, 'Resend')).id) };
    },
  };
}

/** Mailpit (API d'envoi HTTP) : boîte de capture locale, lue par les tests Playwright. */
export function mailpit(url: string, f: Fetch = fetch): EnvoiEmail {
  const adresse = (texte: string) => {
    const m = /^(.*)<(.+)>$/.exec(texte.trim());
    return m ? { Name: m[1]!.trim().replace(/^"|"$/g, ''), Email: m[2]! } : { Email: texte };
  };
  return {
    async envoyer(m) {
      const r = await f(`${url.replace(/\/$/, '')}/api/v1/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          From: adresse(m.de),
          To: [adresse(m.a)],
          Subject: m.sujet,
          HTML: m.html,
          Text: m.texte,
          ...(m.entetes ? { Headers: m.entetes } : {}),
        }),
      });
      return { id: `mailpit:${String((await reponseJson(r, 'Mailpit')).ID)}` };
    },
  };
}

export function brevoSms(cle: string, expediteur: string, f: Fetch = fetch): EnvoiSms {
  return {
    async envoyer(m) {
      const r = await f('https://api.brevo.com/v3/transactionalSMS/sms', {
        method: 'POST',
        headers: { 'api-key': cle, 'content-type': 'application/json' },
        body: JSON.stringify({
          sender: expediteur,
          recipient: m.a.replace('+', ''),
          content: m.texte,
          type: 'transactional',
        }),
      });
      return { id: String((await reponseJson(r, 'Brevo')).messageId) };
    },
  };
}

/** SMS capturés en local : jamais envoyés, tracés sans le numéro. */
export const smsCapture: EnvoiSms = {
  async envoyer() {
    return { id: `capture:${Date.now()}` };
  },
};

/** En staging, liste blanche : seules les adresses qui se terminent par l'un des suffixes partent. */
export function estAutorise(adresse: string, listeBlanche: string | undefined): boolean {
  if (!listeBlanche) return true;
  return listeBlanche
    .split(',')
    .some((suffixe) => adresse.toLowerCase().endsWith(suffixe.trim().toLowerCase()));
}
