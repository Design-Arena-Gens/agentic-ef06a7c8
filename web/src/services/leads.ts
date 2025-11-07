import { prisma } from "@/lib/prisma";
import { LeadSource, LeadStatus, CallOutcome, Prisma } from "@prisma/client";
import { twilioClient } from "@/lib/twilio";
import { telephonyConfig } from "@/lib/config";
import { generateSalesReply } from "@/lib/ai";
import { getStaticBaseUrl } from "@/lib/url";

export interface NormalizedLeadInput {
  source: LeadSource;
  sourceId?: string;
  createdAt?: Date;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  city?: string;
  studentGrade?: string;
  preferredExam?: string;
  guardianName?: string;
  studentName?: string;
  campaignName?: string;
  adGroupName?: string;
  metadata?: unknown;
}

export async function upsertLead(input: NormalizedLeadInput) {
  if (!input.phone) {
    throw new Error("Lead phone number is required");
  }

  const existingLead = await prisma.lead.findFirst({
    where: {
      OR: [
        { phone: input.phone },
        ...(input.email ? [{ email: input.email }] : []),
        ...(input.sourceId
          ? [{ sourceId: input.sourceId, source: input.source }]
          : []),
      ],
    },
  });

  if (existingLead) {
    const updatedLead = await prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        firstName: input.firstName || existingLead.firstName,
        lastName: input.lastName ?? existingLead.lastName,
        phone: input.phone || existingLead.phone,
        email: input.email ?? existingLead.email,
        city: input.city ?? existingLead.city,
        studentGrade: input.studentGrade ?? existingLead.studentGrade,
        preferredExam: input.preferredExam ?? existingLead.preferredExam,
        guardianName: input.guardianName ?? existingLead.guardianName,
        studentName: input.studentName ?? existingLead.studentName,
        campaignName: input.campaignName ?? existingLead.campaignName,
        adGroupName: input.adGroupName ?? existingLead.adGroupName,
        sourceId: input.sourceId ?? existingLead.sourceId,
        source: input.source,
        status:
          existingLead.status === LeadStatus.NEW
            ? LeadStatus.CONTACTED
            : existingLead.status,
        ...(input.metadata !== undefined
          ? {
              metadata: input.metadata as Prisma.InputJsonValue,
            }
          : {}),
      },
    });
    return { lead: updatedLead, created: false };
  }

  const newLead = await prisma.lead.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email,
      city: input.city,
      studentGrade: input.studentGrade,
      preferredExam: input.preferredExam ?? "Sainik School",
      guardianName: input.guardianName,
      studentName: input.studentName,
      campaignName: input.campaignName,
      adGroupName: input.adGroupName,
      source: input.source,
      sourceId: input.sourceId,
      metadata:
        input.metadata !== undefined
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
      createdAt: input.createdAt ?? undefined,
    },
  });

  if (twilioClient && telephonyConfig.callerId) {
    await initiateOutboundCall(newLead.id);
  }

  return { lead: newLead, created: true };
}

export async function initiateOutboundCall(leadId: string) {
  if (!twilioClient || !telephonyConfig.callerId) {
    return null;
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    throw new Error("Lead not found");
  }

  const call = await twilioClient.calls.create({
    to: lead.phone,
    from: telephonyConfig.callerId,
    url: `${getStaticBaseUrl()}/api/voice/outbound?leadId=${lead.id}`,
    statusCallback: telephonyConfig.statusCallbackUrl || undefined,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
  });

  await prisma.callLog.create({
    data: {
      leadId: lead.id,
      direction: "OUTBOUND",
      twilioCallSid: call.sid,
    },
  });

  return call;
}

export async function logCallOutcome(params: {
  leadId: string;
  twilioCallSid?: string;
  outcome?: CallOutcome;
  duration?: number;
  transcript?: string;
  recordingUrl?: string;
  demoAccepted?: boolean;
  followUpAt?: Date;
  notes?: string;
}) {
  const lead = await prisma.lead.findUnique({ where: { id: params.leadId } });
  if (!lead) {
    throw new Error("Lead does not exist");
  }

  await prisma.callLog.create({
    data: {
      leadId: lead.id,
      direction: "OUTBOUND",
      twilioCallSid: params.twilioCallSid,
      outcome: params.outcome,
      duration: params.duration,
      transcript: params.transcript,
      recordingUrl: params.recordingUrl,
      demoAccepted: params.demoAccepted,
      followUpAt: params.followUpAt,
      notes: params.notes,
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: params.demoAccepted
        ? LeadStatus.DEMO_SCHEDULED
        : lead.status,
      lastContactedAt: new Date(),
      callCount: { increment: 1 },
    },
  });
}

export async function getLeadSummary() {
  const [stats, leads] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        callLogs: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    }),
  ]);

  return { stats, leads };
}

export async function buildInitialScript(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return "Hello! This is Ananya calling from our institute. We help students crack competitive entrance exams with expert mentors. Have you had a chance to look at our free demo class?";
  }

  const prompt = [
    {
      role: "user" as const,
      content: `Lead details:\nName: ${lead.guardianName ?? lead.firstName}\nStudent: ${
        lead.studentName ?? "Not provided"
      }\nGrade: ${lead.studentGrade ?? "Not provided"}\nPreferred Exam: ${
        lead.preferredExam
      }\nCity: ${lead.city ?? "Unknown"}\n\nStart the conversation with a friendly greeting.`,
    },
  ];

  const { message } = await generateSalesReply(prompt, lead.guardianName ?? lead.firstName);
  return message;
}
