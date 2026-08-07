/** Clés VAPID démo — à régénérer / mettre en env en production. */
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
  'BFaxwVVdXbJBeX3EbAM4lk9-gbRZgI6WjzfmoYS8UMqfi85mZ0GkTZuf_ARABxmnRR35JTneGOMVawZK01XTiMY';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ?? 'zONtmCpfUqZPmzJ1LM1hL2rCDnidtZagnVuHebszZaE';

export const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:contact@bework.fr';
