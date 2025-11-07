import { NextResponse } from "next/server";
import { fetchFacebookLeads } from "@/services/facebook";
import { fetchGoogleAdsLeads } from "@/services/googleAds";
import { upsertLead } from "@/services/leads";
import { LeadSource } from "@prisma/client";
import { featureFlags } from "@/lib/config";

export async function POST() {
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

  return NextResponse.json({
    ok: true,
    createdCount: created.length,
    updatedCount: updated.length,
    createdIds: created,
    updatedIds: updated,
  });
}
