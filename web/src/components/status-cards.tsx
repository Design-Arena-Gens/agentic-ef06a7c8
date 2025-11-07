import { LeadStatus } from "@prisma/client";

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New Leads",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow Ups",
  DEMO_SCHEDULED: "Demo Scheduled",
  DEMO_COMPLETED: "Demo Completed",
  ENROLLED: "Enrolled",
  DISQUALIFIED: "Disqualified",
};

const STATUS_TONE: Record<LeadStatus, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-purple-100 text-purple-700",
  FOLLOW_UP: "bg-amber-100 text-amber-700",
  DEMO_SCHEDULED: "bg-green-100 text-green-700",
  DEMO_COMPLETED: "bg-emerald-100 text-emerald-700",
  ENROLLED: "bg-teal-100 text-teal-700",
  DISQUALIFIED: "bg-rose-100 text-rose-700",
};

type StatusCardProps = {
  status: LeadStatus;
  count: number;
};

export function StatusCards({ stats }: { stats: StatusCardProps[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ status, count }) => (
        <div
          key={status}
          className="rounded-xl border border-zinc-100 bg-white p-5 shadow-sm"
        >
          <span
            className={`text-xs font-semibold uppercase tracking-wide ${STATUS_TONE[status]}`}
          >
            {STATUS_LABELS[status]}
          </span>
          <p className="mt-3 text-3xl font-semibold text-zinc-900">{count}</p>
        </div>
      ))}
    </div>
  );
}
