import { useEffect, useState } from 'react';
import { hourHeight } from '@/lib/planning/layout';
import { isToday, minutesFromMidnight } from '@/lib/planning/dates';

/** Ligne « maintenant » — uniquement aujourd'hui, dans la plage affichée */
export function NowIndicator({
  date,
  fromHour,
  toHour,
  isDesktop,
}: {
  date: Date;
  fromHour: number;
  toHour: number;
  isDesktop: boolean;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!isToday(date)) return null;

  const mins = minutesFromMidnight(now);
  if (mins < fromHour * 60 || mins >= toHour * 60) return null;

  const top = (mins - fromHour * 60) * (hourHeight(isDesktop) / 60);

  return (
    <div className="agenda-now" style={{ top }} aria-hidden>
      <span className="agenda-now-dot" />
      <span className="agenda-now-line" />
    </div>
  );
}

