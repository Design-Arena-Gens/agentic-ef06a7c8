import { getLeadSummary } from "@/services/leads";
import { StatusCards } from "@/components/status-cards";
import { LeadTable } from "@/components/lead-table";
import { LeadForm } from "@/components/lead-form";
import { SyncBar } from "@/components/sync-bar";
import { featureFlags, agentConfig } from "@/lib/config";
import { LeadStatus } from "@prisma/client";

export default async function Home() {
  const { stats, leads } = await getLeadSummary();

  const serializedLeads = leads.map((lead) => ({
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    lastContactedAt: lead.lastContactedAt
      ? lead.lastContactedAt.toISOString()
      : null,
    demoScheduledAt: lead.demoScheduledAt
      ? lead.demoScheduledAt.toISOString()
      : null,
    callLogs: lead.callLogs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString(),
      followUpAt: log.followUpAt ? log.followUpAt.toISOString() : null,
    })),
  }));

  const statusMap = Object.values(LeadStatus).map((status) => ({
    status,
    count: stats.find((item) => item.status === status)?._count._all ?? 0,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-zinc-50 to-emerald-50 pb-16">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-10 sm:px-6 lg:px-8">
        <SyncBar exportUrl="/api/leads/export" />

        <section className="grid gap-6 lg:grid-cols-[1.8fr,1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <h2 className="text-xl font-semibold text-zinc-900">
                Welcome to {agentConfig.instituteName} AI Concierge
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Every new enquiry from Facebook Lead Ads, Google Ads, or manual
                walk-ins is automatically greeted by Ananya—our empathetic
                counsellor who books demo sessions, captures guardian details,
                and keeps your team updated with structured notes.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-sky-700">
                <span className="rounded-full bg-sky-100 px-3 py-1">
                  Outbound demo booking
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                  Inbound helpline handling
                </span>
                <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700">
                  Automated Excel reports
                </span>
              </div>
            </div>

            <StatusCards stats={statusMap} />
            <LeadTable
              leads={serializedLeads}
              telephonyEnabled={featureFlags.enableTelephony}
            />
          </div>

          <div className="space-y-6">
            <LeadForm />
            <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-zinc-900">
                How Ananya qualifies each family
              </h3>
              <ol className="mt-4 space-y-3 text-sm text-zinc-600">
                <li>
                  <span className="font-semibold text-sky-600">1.</span> Greets
                  warmly in an Indian-English tone and shares key highlights of
                  {` ${agentConfig.instituteName}`}.
                </li>
                <li>
                  <span className="font-semibold text-sky-600">2.</span> Captures
                  student name, class, exam preference, study medium, and city.
                </li>
                <li>
                  <span className="font-semibold text-sky-600">3.</span>{" "}
                  Explains personalised study plan, bilingual mentors, mock
                  tests, and hostel support.
                </li>
                <li>
                  <span className="font-semibold text-sky-600">4.</span>{" "}
                  Confirms demo slot and shares the joining link instantly.
                </li>
                <li>
                  <span className="font-semibold text-sky-600">5.</span>{" "}
                  Updates the CRM and marks qualified leads for counsellor
                  follow-up.
                </li>
              </ol>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-800">
              Configure your Twilio voice number, Facebook Lead form IDs, and
              Google Ads credentials in the `.env` file before deploying. Once
              done, all demo requests are handled autonomously—no missed calls,
              no forgotten follow-ups.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
