import { createFileRoute } from "@tanstack/react-router";
import { Card, PageTitle } from "@/components/app-shell";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useFocusStore } from "@/lib/store";

export const Route = createFileRoute("/setup")({ component: SetupPage });

function SetupPage() {
  const setup = useFocusStore((s) => s.setup);
  const setSetup = useFocusStore((s) => s.setSetup);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        kicker="Chapter 1 + 4"
        title="Home focus setup"
        lede="Write the space and the two rituals once. Then stop redesigning them for a week."
      />
      <Card className="flex flex-col gap-3">
        <Field label="Location">
          <Input
            value={setup.location}
            onChange={(e) => setSetup({ location: e.target.value })}
            placeholder="Spare room / kitchen corner / bedroom desk"
          />
        </Field>
        <Field label="Work-only surface">
          <Input
            value={setup.surface}
            onChange={(e) => setSetup({ surface: e.target.value })}
          />
        </Field>
        <Field label="Light and sound">
          <Textarea
            value={setup.lighting}
            onChange={(e) => setSetup({ lighting: e.target.value })}
          />
        </Field>
        <Field label="Apps that stay closed until the first block ends">
          <Textarea
            value={setup.blockedApps}
            onChange={(e) => setSetup({ blockedApps: e.target.value })}
          />
        </Field>
        <Field label="Morning sequence (5–7 minutes)">
          <Textarea
            value={setup.morning}
            onChange={(e) => setSetup({ morning: e.target.value })}
            placeholder="Clear surface. Write 1–3 outcomes. Park the phone for the block. Start."
          />
        </Field>
        <Field label="Shutdown sequence (5 minutes)">
          <Textarea
            value={setup.shutdown}
            onChange={(e) => setSetup({ shutdown: e.target.value })}
            placeholder="Mark what finished. Capture tomorrow. Leave the space."
          />
        </Field>
      </Card>
    </div>
  );
}
