import { Card, CardLabel, CardTitle } from '@/components/ui/card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { BumpIllustration } from '@/components/ui/bump';
import { requireOnboardedSession } from '@/lib/session';
import { gestationOn } from '@/lib/pregnancy';
import { todayInManila } from '@/lib/civil-date';

function greeting(nowInManila: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      hour12: false,
    }).format(nowInManila),
  );

  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function HomePage() {
  const { profile, pregnancy } = await requireOnboardedSession();

  const gestation = gestationOn({
    edd: pregnancy.edd,
    on: todayInManila(),
    datingOffsetDays: pregnancy.dating_offset_days,
  });

  const name = profile.display_name ?? 'you';
  // Nico's greeting is his own; the sage accent for his section arrives with
  // the For Nico milestone.
  const isDad = profile.role === 'dad';

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl">
          {greeting(new Date())}, {name}
        </h1>
        <p className="text-sm text-foreground-muted">
          {isDad ? 'Here’s where the cub is this week.' : gestation.label}
        </p>
      </header>

      <Card className="flex flex-col items-center gap-4 text-center">
        <ProgressRing
          value={gestation.progress}
          label={`Week ${gestation.weeks} of 40`}
          size={200}
        >
          <BumpIllustration className="size-24" />
          <p className="mt-1 font-display text-xl">{gestation.label}</p>
          <p className="text-xs text-foreground-muted">
            Trimester {gestation.trimester}
          </p>
        </ProgressRing>

        <div>
          <p className="font-display text-3xl">
            {gestation.isPastDue
              ? `${Math.abs(gestation.daysToGo)} days past due`
              : `${gestation.daysToGo} days to go`}
          </p>
          <p className="text-sm text-foreground-muted">
            Due{' '}
            {new Intl.DateTimeFormat('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            }).format(new Date(`${pregnancy.edd}T00:00:00Z`))}
          </p>
        </div>
      </Card>

      {/*
        The remaining dashboard cards — this week, next appointment, caffeine
        total, quick-log row and Nico's tip — arrive with the milestones that
        supply their data.
      */}
      <Card>
        <CardLabel>Coming next</CardLabel>
        <CardTitle className="mt-1">Your week-by-week guide</CardTitle>
        <p className="mt-2 text-sm text-foreground-muted">
          Once the guide content is loaded, this is where the week&rsquo;s summary, your next
          appointment and today&rsquo;s caffeine total will live.
        </p>
      </Card>
    </div>
  );
}
