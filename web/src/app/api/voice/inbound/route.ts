import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LeadSource, LeadStatus } from "@prisma/client";
import { buildAbsoluteUrl } from "@/lib/url";
import { generateSalesReply } from "@/lib/ai";
import twilio from "twilio";

const { VoiceResponse } = twilio.twiml;

export async function POST(request: Request) {
  const form = await request.formData();
  const fromNumber = (form.get("From") || "").toString();
  const callSid = (form.get("CallSid") || "").toString();

  if (!fromNumber) {
    const twiml = new VoiceResponse();
    twiml.say(
      { voice: "Polly.Aditi", language: "en-IN" },
      "Thank you for reaching out. Please contact us again from a valid number."
    );
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const existing = await prisma.lead.findFirst({ where: { phone: fromNumber } });
  const lead =
    existing ??
    (await prisma.lead.create({
      data: {
        firstName: fromNumber,
        phone: fromNumber,
        preferredExam: "Sainik School",
        source: LeadSource.UNKNOWN,
        status: LeadStatus.CONTACTED,
      },
    }));

  if (existing) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: LeadStatus.CONTACTED,
        lastContactedAt: new Date(),
      },
    });
  }

  const openingPrompt = [
    {
      role: "user" as const,
      content: `Inbound call from ${lead.phone}. Lead name: ${
        lead.guardianName ?? lead.firstName
      }. Provide a warm greeting and ask how you can help.`,
    },
  ];

  const { message } = await generateSalesReply(
    openingPrompt,
    lead.guardianName ?? lead.firstName
  );

  const session = await prisma.callSession.create({
    data: {
      leadId: lead.id,
      twilioCallSid: callSid,
      context: {
        direction: "INBOUND",
        history: [
          { role: "assistant", content: message },
        ],
      },
    },
  });

  const twiml = new VoiceResponse();
  const gather = twiml.gather({
    input: ["speech"],
    action: `${buildAbsoluteUrl(
      request,
      `/api/voice/continue?sessionId=${session.id}`
    )}`,
    method: "POST",
    speechTimeout: "auto",
  });
  gather.say({ voice: "Polly.Aditi", language: "en-IN" }, message);

  twiml.redirect(
    `${buildAbsoluteUrl(
      request,
      `/api/voice/continue?sessionId=${session.id}`
    )}`
  );

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
