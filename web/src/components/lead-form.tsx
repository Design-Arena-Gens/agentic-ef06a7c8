"use client";

import { useState, useTransition } from "react";
import { createLeadAction } from "@/app/actions";

type FormState = {
  ok?: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export function LeadForm() {
  const [formState, setFormState] = useState<FormState>({});
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      action={async (formData) => {
        startTransition(async () => {
          const result = await createLeadAction(formData);
          if (!result.ok) {
            setFormState({
              ok: false,
              errors: result.errors?.fieldErrors,
              message: "Please correct the highlighted fields.",
            });
            return;
          }
          setFormState({
            ok: true,
            message: "Lead saved successfully and queued for calling.",
          });
        });
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Add Lead Manually
          </h2>
          <p className="text-sm text-zinc-500">
            Capture walk-in or referral enquiries quickly.
          </p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Auto-call enabled
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-zinc-700">
            Guardian Name
          </label>
          <input
            name="firstName"
            required
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            placeholder="Parent or guardian name"
          />
          {formState.errors?.firstName && (
            <p className="mt-1 text-xs text-rose-500">
              {formState.errors.firstName[0]}
            </p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">
            Student Name
          </label>
          <input
            name="studentName"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            placeholder="Child's name"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">Phone</label>
          <input
            name="phone"
            required
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            placeholder="+91XXXXXXXXXX"
          />
          {formState.errors?.phone && (
            <p className="mt-1 text-xs text-rose-500">
              {formState.errors.phone[0]}
            </p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">Email</label>
          <input
            name="email"
            type="email"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            placeholder="parent@example.com"
          />
          {formState.errors?.email && (
            <p className="mt-1 text-xs text-rose-500">
              {formState.errors.email[0]}
            </p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">
            Target Exam
          </label>
          <select
            name="preferredExam"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            <option value="Sainik School">Sainik School</option>
            <option value="RMS">Rashtriya Military School (RMS)</option>
            <option value="Navodaya">Jawahar Navodaya Vidyalaya</option>
            <option value="RIMC">RIMC</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">Class</label>
          <input
            name="studentGrade"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            placeholder="5th / 6th / 8th"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">City</label>
          <input
            name="city"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            placeholder="City or town"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">
            Additional Notes
          </label>
          <textarea
            name="notes"
            rows={2}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            placeholder="Exam attempts, preferences, or follow-up reminders"
          />
        </div>
      </div>

      {formState.message && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            formState.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {formState.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
      >
        {isPending ? "Saving..." : "Save Lead & Auto Call"}
      </button>
    </form>
  );
}
