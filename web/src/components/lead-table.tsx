"use client";

import { useMemo, useState, useTransition } from "react";
import { triggerCallAction } from "@/app/actions";

type LeadWithLogs = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  studentGrade: string | null;
  preferredExam: string;
  guardianName: string | null;
  studentName: string | null;
  source: string;
  campaignName: string | null;
  adGroupName: string | null;
  status: string;
  callCount: number;
  createdAt: string;
  demoScheduledAt: string | null;
  lastContactedAt: string | null;
  callLogs: Array<{
    id: string;
    createdAt: string;
    outcome: string | null;
    notes: string | null;
  }>;
};

function formatDate(date?: Date | string | null) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function LeadTable({
  leads,
  telephonyEnabled,
}: {
  leads: LeadWithLogs[];
  telephonyEnabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!query) return leads;
    return leads.filter((lead) => {
      const haystack = [
        lead.firstName,
        lead.lastName,
        lead.studentName,
        lead.phone,
        lead.email,
        lead.city,
        lead.preferredExam,
        lead.guardianName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [leads, query]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-zinc-100 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Lead Engagement Board
          </h2>
          <p className="text-sm text-zinc-500">
            Track outreach for Facebook, Google Ads, and manual enquiries.
          </p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by parent, student, phone, exam..."
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 sm:w-72"
        />
      </div>

      <div className="max-h-[580px] overflow-y-auto">
        <table className="min-w-full divide-y divide-zinc-100 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-zinc-600">
                Parent & Student
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-600">
                Contact
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-600">
                Exam Focus
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-600">
                Status
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-600">
                Last Call
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((lead) => {
              const latestCall = lead.callLogs[0];
              return (
                <tr key={lead.id} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-4 align-top">
                    <div className="font-semibold text-zinc-900">
                      {lead.guardianName ?? lead.firstName}
                    </div>
                    <div className="text-xs text-zinc-500">
                      Student: {lead.studentName ?? "—"} • Class{" "}
                      {lead.studentGrade ?? "—"}
                    </div>
                    <div className="mt-1 text-xs text-sky-600">
                      Source: {lead.source}
                      {lead.campaignName && ` • ${lead.campaignName}`}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="font-medium text-zinc-800">
                      {lead.phone}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {lead.email ?? "No email"}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {lead.city ?? "City not set"}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="font-medium text-zinc-800">
                      {lead.preferredExam}
                    </div>
                    <div className="text-xs text-zinc-500">
                      Created {formatDate(lead.createdAt)}
                    </div>
                    <div className="text-xs text-emerald-600">
                      Demo:{" "}
                      {lead.demoScheduledAt
                        ? formatDate(lead.demoScheduledAt)
                        : "Not booked"}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold capitalize text-sky-700">
                      {lead.status.replace("_", " ").toLowerCase()}
                    </span>
                    <div className="mt-2 text-xs text-zinc-500">
                      Calls: {lead.callCount}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-xs text-zinc-500">
                    {latestCall ? (
                      <div className="space-y-1">
                        <div className="font-medium text-zinc-700">
                          {latestCall.outcome ?? "In progress"}
                        </div>
                        <div>{formatDate(latestCall.createdAt)}</div>
                      </div>
                    ) : (
                      <span>Waiting for first call</span>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top">
                    {telephonyEnabled ? (
                      <button
                        onClick={() =>
                          startTransition(async () => {
                            await triggerCallAction(lead.id);
                          })
                        }
                        className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:bg-sky-300"
                        disabled={isPending}
                      >
                        {isPending ? "Dialling..." : "Call Now"}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400">
                        Configure Twilio to auto-call
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-zinc-500"
                >
                  No leads match your filters yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
