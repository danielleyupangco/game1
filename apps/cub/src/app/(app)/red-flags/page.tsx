import type { Metadata } from 'next';
import { Card, CardLabel, CardTitle } from '@/components/ui/card';
import { buttonClasses } from '@/components/ui/button';
import { requireOnboardedSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Warning signs' };

/**
 * The full trimester-by-trimester list arrives with the logs milestone. What
 * has to work from day one is the calling: the numbers shown here are only ever
 * the ones saved during onboarding, never a number the app supplied.
 */
const CALL_NOW_SIGNS = [
  'Heavy bleeding, or bleeding with cramping',
  'Severe headache that will not lift, or changes in your vision',
  'Sudden swelling of your face or hands',
  'Fever, or pain when passing water',
  'Steady pain in your belly or shoulder tip',
  'A noticeable drop in the baby’s movement, later on',
  'Fluid leaking, or waters breaking before 37 weeks',
];

export default async function RedFlagsPage() {
  const { pregnancy } = await requireOnboardedSession();

  const contacts = [
    { label: 'Makati Med ER', phone: pregnancy.er_phone, variant: 'danger' as const },
    { label: pregnancy.ob_name ?? 'Your OB', phone: pregnancy.ob_phone, variant: 'secondary' as const },
  ];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl">When to call</h1>
        <p className="text-sm text-foreground-muted">
          Most of the time none of this applies. It&rsquo;s here so you never have to go looking.
        </p>
      </header>

      <Card className="flex flex-col gap-3">
        <CardLabel>Call straight away</CardLabel>
        {contacts.map(({ label, phone, variant }) =>
          phone ? (
            <a key={label} href={`tel:${phone.replace(/\s+/g, '')}`} className={buttonClasses(variant, 'w-full')}>
              Call {label}
            </a>
          ) : (
            <div key={label} className="rounded-2xl border border-dashed border-border p-3 text-sm text-foreground-muted">
              No number saved for {label} yet. Add it in Settings and it becomes a call button here.
            </div>
          ),
        )}
      </Card>

      <Card>
        <CardTitle>Signs worth a call</CardTitle>
        <ul className="mt-3 flex flex-col gap-2">
          {CALL_NOW_SIGNS.map((sign) => (
            <li key={sign} className="flex gap-2 text-sm leading-relaxed">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-foreground" />
              {sign}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-foreground-muted">
          General guidance only, and not a complete list. If something feels wrong, call — that is
          always the right call to make.
        </p>
      </Card>
    </div>
  );
}
