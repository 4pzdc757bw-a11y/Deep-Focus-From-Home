import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, SkipForward } from "lucide-react";
import { nextDateAfterClose } from "@/lib/close-day";
import { DailyOs } from "@/components/daily-os";
import { PageTitle } from "@/components/app-shell";
import { isDateKey, prettyDate } from "@/lib/utils";
import { useWorkdayKey } from "@/lib/workday";

export const Route = createFileRoute("/daily")({
  validateSearch: (search: Record<string, unknown>) => ({
    date: isDateKey(search.date) ? search.date : undefined,
  }),
  component: DailyPage,
});

function DailyPage() {
  const { date: searchDate } = Route.useSearch();
  const workday = useWorkdayKey();
  const date = searchDate ?? workday;
  const isToday = date === workday;
  const navigate = useNavigate();

  /** Day off: open the next work day without marking anything done. */
  function skipToNextWorkday() {
    void navigate({ to: "/daily", search: { date: nextDateAfterClose(date) } });
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/starter"
        className="no-print inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-olive"
      >
        <ArrowLeft className="size-4" />
        Back to starter week
      </Link>
      <div className="no-print">
        <PageTitle
          kicker={isToday ? "Daily OS · today" : `Daily OS · ${prettyDate(date)}`}
          title="One page for this workday"
          lede={`${prettyDate(date)}. Put the task in a time slot, write the outcome, ring the bell to start and to finish.`}
        />
        <button
          type="button"
          onClick={skipToNextWorkday}
          className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-md border border-yellow bg-paper px-3 text-sm font-semibold text-olive hover:bg-cream"
        >
          <SkipForward className="size-4" />
          Day off — skip to next workday
        </button>
      </div>
      <DailyOs date={date} />
    </div>
  );
}
