import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildInitialScript } from "@/services/leads";
import { buildAbsoluteUrl } from "@/lib/url";
import twilio from "twilio";

const { VoiceResponse } = twilio.twiml;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const leadId = url.searchParams.get("leadId");

  if (!leadId) {
    const twiml = new VoiceResponse();
    twiml.say(
      {
        voice: "Polly.Aditi",
        language: "en-IN",
      },
      "We could not find the lead details. Please contact support."
    );
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    const twiml = new VoiceResponse();
    twiml.say(
      {
        voice: "Polly.Aditi",
        language: "en-IN",
      },
      "The lead record is missing. This call will now end."
    );
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const openingMessage = await buildInitialScript(leadId);

  const session = await prisma.callSession.create({
    data: {
      leadId,
      context: {
        direction: "OUTBOUND",
        history: [
          {
            role: "assistant",
            content: openingMessage,
          },
        ],
      },
    },
  });

  const voiceResponse = new VoiceResponse();
  const gather = voiceResponse.gather({
    input: ["speech"],
    action: `${buildAbsoluteUrl(
      request,
      `/api/voice/continue?sessionId=${session.id}`
    )}`,
    method: "POST",
    speechTimeout: "auto",
  });
  gather.say({ voice: "Polly.Aditi", language: "en-IN" }, openingMessage);
  voiceResponse.redirect(
    `${buildAbsoluteUrl(
      request,
      `/api/voice/continue?sessionId=${session.id}`
    )}`
  );

  return new NextResponse(voiceResponse.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
