/**
 * Envoi d’emails (invitation externe).
 * Sans SMTP configuré : le lien est renvoyé à l’UI pour copie manuelle (démo).
 */

export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail(payload: MailPayload): Promise<{ sent: boolean; reason?: string }> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.info('[mail:demo]', payload.to, payload.subject, payload.text.slice(0, 200));
    return { sent: false, reason: 'SMTP non configuré — lien à transmettre manuellement' };
  }
  // Branche SMTP réelle à brancher plus tard (nodemailer).
  console.info('[mail]', payload.to, payload.subject);
  return { sent: true };
}

export function invitationEmailBody(opts: {
  nom: string;
  inviterNom: string;
  threadTitre: string;
  message: string;
  link: string;
  expiresLabel: string;
}) {
  const lines = [
    `Bonjour ${opts.nom},`,
    ``,
    `${opts.inviterNom} vous invite à rejoindre la discussion « ${opts.threadTitre} » sur la plateforme SETRIM.`,
    opts.message ? `\nMessage :\n${opts.message}\n` : '',
    `Ouvrez ce lien pour définir votre mot de passe (valable ${opts.expiresLabel}) :`,
    opts.link,
    ``,
    `Vous n’aurez accès qu’à cette discussion (et aux autres auxquelles vous serez invité).`,
    ``,
    `— SETRIM / BeWork`,
  ];
  return lines.filter((l) => l !== undefined).join('\n');
}
