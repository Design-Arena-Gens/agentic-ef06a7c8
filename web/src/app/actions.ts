"use server";

import { revalidatePath } from "next/cache";
import { fetchFacebookLeads } from "@/services/facebook";
import { fetchGoogleAdsLeads } from "@/services/googleAds";
import { upsertLead, initiateOutboundCall } from "@/services/leads";
import { LeadSource } from "@prisma/client";
import { featureFlags } from "@/lib/config";
import { z } from "zod";

export async function syncLeadsAction() {
  const created: string[] = [];
  const updated: string[] = [];

  if (featureFlags.enableFacebookSync) {
    const facebookLeads = await fetchFacebookLeads();
    for (const lead of facebookLeads) {
      const { lead: record, created: isCreated } = await upsertLead({
        source: LeadSource.FACEBOOK,
        sourceId: lead.sourceId,
        createdAt: lead.createdAt,
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        studentGrade: lead.studentGrade,
        preferredExam: lead.preferredExam,
        guardianName: lead.guardianName,
        studentName: lead.studentName,
        metadata: lead.metadata,
      });
      if (isCreated) {
        created.push(record.id);
      } else {
        updated.push(record.id);
      }
    }
  }

  if (featureFlags.enableGoogleAdsSync) {
    const googleLeads = await fetchGoogleAdsLeads();
    for (const lead of googleLeads) {
      const { lead: record, created: isCreated } = await upsertLead({
        source: LeadSource.GOOGLE_ADS,
        sourceId: lead.sourceId,
        createdAt: lead.createdAt,
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        studentGrade: lead.studentGrade,
        preferredExam: lead.preferredExam,
        guardianName: lead.guardianName,
        studentName: lead.studentName,
        campaignName: lead.campaignResource,
        adGroupName: lead.adGroupResource,
        metadata: lead.metadata,
      });
      if (isCreated) {
        created.push(record.id);
      } else {
        updated.push(record.id);
      }
    }
  }

  revalidatePath("/");
  return { createdCount: created.length, updatedCount: updated.length };
}

const manualLeadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  city: z.string().optional(),
  studentGrade: z.string().optional(),
  preferredExam: z.string().optional(),
  guardianName: z.string().optional(),
  studentName: z.string().optional(),
  notes: z.string().optional(),
});

export async function createLeadAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const parsed = manualLeadSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.flatten(),
    };
  }

  const { lead } = await upsertLead({
    source: LeadSource.MANUAL,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    phone: parsed.data.phone,
    email: parsed.data.email,
    city: parsed.data.city,
    studentGrade: parsed.data.studentGrade,
    preferredExam: parsed.data.preferredExam ?? "Sainik School",
    guardianName: parsed.data.guardianName,
    studentName: parsed.data.studentName,
    metadata: parsed.data.notes ? { notes: parsed.data.notes } : undefined,
  });

  revalidatePath("/");
  return { ok: true, leadId: lead.id };
}

export async function triggerCallAction(leadId: string) {
  const call = await initiateOutboundCall(leadId);
  revalidatePath("/");
  return { callSid: call?.sid ?? null };
}
