import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DailyOs } from "@/components/daily-os";
import { PageTitle } from "@/components/app-shell";
import { isDateKey, prettyDate, todayKey } from "@/lib/utils";

export const Route = createFileRoute("/daily")({
  validateSearch: (search: Record<string, unknown>) => ({
    date: isDateKey(search.date) ? search.date : undefined,
  }),
  component: DailyPage,
});

function DailyPage() {
  const { date: searchDate } = Route.useSearch();
  const date = searchDate ?? todayKey();
  const isToday = date === todayKey();

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/starter"
        className="no-print inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-olive"
      >
        <ArrowLeft className="size-4" />
        Back to starter week
      </Link>
      <PageTitle
        kicker={isToday ? "Daily OS · today" : `Daily OS · ${prettyDate(date)}`}
        title="One page for this workday"
        lede={`${prettyDate(date)}. Put the task in a time slot, write the outcome, ring the bell to start and to finish.`}
      />
      <DailyOs date={date} />
    </div>
  );
}
