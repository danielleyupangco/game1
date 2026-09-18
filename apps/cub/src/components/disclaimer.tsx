import { Card } from '@/components/ui/card';

export const MEDICAL_DISCLAIMER =
  'This app offers general information, not medical advice. Always follow Dra. Villafria’s guidance. In an emergency, go to the Makati Med ER.';

export function DisclaimerCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <p className="text-sm leading-relaxed text-foreground-muted">{MEDICAL_DISCLAIMER}</p>
    </Card>
  );
}
