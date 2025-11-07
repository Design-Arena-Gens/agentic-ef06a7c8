"use client";

import { useTransition, useState } from "react";
import { syncLeadsAction } from "@/app/actions";

export function SyncBar({ exportUrl }: { exportUrl: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Admissions AI Control Center
        </h1>
        <p className="text-sm text-zinc-500">
          Automate follow-ups for Sainik School, RMS, and Navodaya entrance leads in one place.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          onClick={() =>
            startTransition(async () => {
              const result = await syncLeadsAction();
              setMessage(
                `Synced leads • new: ${result.createdCount}, updated: ${result.updatedCount}`
              );
              setTimeout(() => setMessage(null), 5000);
            })
          }
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
        >
          {isPending ? "Syncing..." : "Sync Ad Leads"}
        </button>
        <a
          href={exportUrl}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-sky-200 hover:text-sky-700"
        >
          Download Excel
        </a>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          {message}
        </div>
      )}
    </div>
  );
}
