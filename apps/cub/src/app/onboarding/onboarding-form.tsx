'use client';

import { useActionState, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardLabel } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { MEDICAL_DISCLAIMER } from '@/components/disclaimer';
import { completeOnboarding, type OnboardingState } from '@/app/onboarding/actions';
import { gestationOn } from '@/lib/pregnancy';
import { bmiCategory, calculateBmi, gainBandForBmi } from '@/lib/bmi';
import { isCivilDate } from '@/lib/civil-date';

/** Dani's due date, pre-filled and fully editable. */
const DEFAULT_EDD = '2027-05-23';

const BMI_LABELS: Record<ReturnType<typeof bmiCategory>, string> = {
  underweight: 'under 18.5',
  normal: '18.5 to 24.9',
  overweight: '25 to 29.9',
  obese: '30 and above',
};

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    {},
  );

  const [edd, setEdd] = useState(DEFAULT_EDD);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  const gestation = useMemo(
    () => (isCivilDate(edd) ? gestationOn({ edd }) : null),
    [edd],
  );

  const bmi = useMemo(() => {
    const weightKg = Number(weight);
    const heightCm = Number(height);
    if (!weightKg || !heightCm) return null;
    const value = calculateBmi(weightKg, heightCm);
    return { value, band: gainBandForBmi(value), category: bmiCategory(value) };
  }, [weight, height]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4">
        <CardLabel>About you</CardLabel>

        <Field
          label="What should we call you?"
          name="displayName"
          defaultValue={defaultName}
          required
          maxLength={60}
          autoComplete="given-name"
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">I am</legend>
          <div className="flex gap-2">
            {(
              [
                { value: 'mom', label: 'Mom' },
                { value: 'dad', label: 'Dad' },
              ] as const
            ).map(({ value, label }) => (
              <label
                key={value}
                className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 text-sm font-semibold has-checked:border-accent-foreground has-checked:bg-accent has-checked:text-accent-foreground"
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  defaultChecked={value === 'mom'}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card className="flex flex-col gap-4">
        <CardLabel>Due date</CardLabel>

        <Field
          label="Estimated due date"
          name="edd"
          type="date"
          required
          value={edd}
          onChange={(event) => setEdd(event.target.value)}
          hint="Your OB may adjust this after the dating scan. You can edit it any time."
        />

        {gestation ? (
          <p className="rounded-2xl bg-surface-muted p-3 text-sm">
            That puts you at{' '}
            <strong className="font-semibold">{gestation.label}</strong>, with{' '}
            <strong className="font-semibold">{Math.max(gestation.daysToGo, 0)} days</strong> to go.
          </p>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-4">
        <CardLabel>Weight and height</CardLabel>
        <p className="text-sm text-foreground-muted">
          Optional, and only used to shade the recommended gain range on your weight chart.
        </p>

        <Field
          label="Pre-pregnancy weight (kg)"
          name="prepregWeightKg"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={20}
          max={300}
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
        />

        <Field
          label="Height (cm)"
          name="heightCm"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={100}
          max={250}
          value={height}
          onChange={(event) => setHeight(event.target.value)}
        />

        {bmi ? (
          <p className="rounded-2xl bg-surface-muted p-3 text-sm">
            BMI <strong className="font-semibold">{bmi.value.toFixed(1)}</strong> (
            {BMI_LABELS[bmi.category]}). The usual guidance for this range is a total gain of{' '}
            <strong className="font-semibold">
              {bmi.band.totalMinKg}–{bmi.band.totalMaxKg} kg
            </strong>{' '}
            across the pregnancy.
          </p>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-4">
        <CardLabel>Who to call</CardLabel>
        <p className="text-sm text-foreground-muted">
          These become the one-tap call buttons on the warning-signs screen. Leave them blank for
          now if you don&rsquo;t have them to hand.
        </p>

        <Field
          label="Dra. Fe Villafria"
          name="obPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Add her number"
        />

        <Field
          label="Makati Medical Center ER"
          name="erPhone"
          type="tel"
          inputMode="tel"
          placeholder="Add the ER number"
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <CardLabel>Before you start</CardLabel>
        <p className="text-sm leading-relaxed text-foreground-muted">{MEDICAL_DISCLAIMER}</p>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="disclaimerAccepted"
            required
            className="size-5 rounded border-border accent-[var(--color-blush-deep)]"
          />
          I&rsquo;ve read this
        </label>
      </Card>

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-[#8c2f2f]">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? 'Setting things up…' : 'Continue'}
      </Button>
    </form>
  );
}
