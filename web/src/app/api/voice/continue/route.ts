import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSalesReply } from "@/lib/ai";
import { buildAbsoluteUrl } from "@/lib/url";
import { LeadStatus } from "@prisma/client";
import twilio from "twilio";

const { VoiceResponse } = twilio.twiml;

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

function detectDemoAcceptance(text: string) {
  const lowered = text.toLowerCase();
  return (
    lowered.includes("book a demo") ||
    lowered.includes("schedule a demo") ||
    lowered.includes("yes demo") ||
    lowered.includes("confirm") ||
    lowered.includes("ok demo") ||
    lowered.includes("will join") ||
    lowered.includes("i will attend")
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    const twiml = new VoiceResponse();
    twiml.say(
      { voice: "Polly.Aditi", language: "en-IN" },
      "The session expired. Thank you for your time."
    );
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const form = await request.formData();
  const speechResult = (form.get("SpeechResult") || "").toString();
  const callSid = (form.get("CallSid") || "").toString();
  const leadId = (form.get("leadId") || "").toString();

  const session = await prisma.callSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    const twiml = new VoiceResponse();
    twiml.say(
      { voice: "Polly.Aditi", language: "en-IN" },
      "I lost the context of our chat. Let's reconnect later. Thank you!"
    );
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const sessionContext =
    (session.context as { history?: ConversationTurn[]; direction?: string } | null) ??
    {};
  const history: ConversationTurn[] = sessionContext.history ?? [];
  const direction =
    sessionContext.direction === "INBOUND" ? "INBOUND" : "OUTBOUND";

  if (speechResult) {
    history.push({ role: "user", content: speechResult });
  }

  const lead =
    session.leadId || leadId
      ? await prisma.lead.findUnique({
          where: { id: session.leadId ?? leadId },
        })
      : null;

  if (!lead) {
    const response = new VoiceResponse();
    response.say(
      { voice: "Polly.Aditi", language: "en-IN" },
      "Thank you for speaking with us. A counsellor will reach out shortly."
    );
    response.hangup();
    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const { message } = await generateSalesReply(history, lead.guardianName ?? lead.firstName);
  history.push({ role: "assistant", content: message });

  const shouldHangup = session.stepIndex + 1 >= 6 || !speechResult;
  const acceptedDemo = speechResult && detectDemoAcceptance(speechResult);

  if (acceptedDemo) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: LeadStatus.DEMO_SCHEDULED,
        demoScheduledAt: new Date(),
        lastContactedAt: new Date(),
      },
    });
  }

  const updatedSession = await prisma.callSession.update({
    where: { id: session.id },
    data: {
      context: { history },
      stepIndex: session.stepIndex + 1,
      lastPrompt: message,
      lastResponse: speechResult,
      status: shouldHangup ? "COMPLETED" : "ACTIVE",
      twilioCallSid: (session.twilioCallSid ?? callSid) || undefined,
    },
  });

  const transcript = history
    .map((turn) => `${turn.role === "assistant" ? "Agent" : "Lead"}: ${turn.content}`)
    .join("\n");

  if (callSid || updatedSession.twilioCallSid) {
    const sid = callSid || updatedSession.twilioCallSid!;
    await prisma.callLog.upsert({
      where: { twilioCallSid: sid },
      update: {
        transcript,
        demoAccepted: acceptedDemo ? true : undefined,
        outcome: acceptedDemo ? "DEMO_SCHEDULED" : undefined,
        leadId: lead.id,
        gatherData: history,
      },
      create: {
        leadId: lead.id,
        direction,
        twilioCallSid: sid,
        transcript,
        demoAccepted: acceptedDemo ? true : undefined,
        outcome: acceptedDemo ? "DEMO_SCHEDULED" : undefined,
        gatherData: history,
      },
    });
  } else {
    await prisma.callLog.create({
      data: {
        leadId: lead.id,
        direction,
        transcript,
        demoAccepted: acceptedDemo ? true : undefined,
        outcome: acceptedDemo ? "DEMO_SCHEDULED" : undefined,
        gatherData: history,
      },
    });
  }

  const twiml = new VoiceResponse();

  if (shouldHangup) {
    twiml.say(
      { voice: "Polly.Aditi", language: "en-IN" },
      "Thank you for your time. Our counsellor will follow up with you shortly. Have a great day!"
    );
    twiml.hangup();
  } else {
    const gather = twiml.gather({
      input: ["speech"],
      action: `${buildAbsoluteUrl(
        request,
        `/api/voice/continue?sessionId=${sessionId}`
      )}`,
      method: "POST",
      speechTimeout: "auto",
    });
    gather.say({ voice: "Polly.Aditi", language: "en-IN" }, message);
    twiml.redirect(
      `${buildAbsoluteUrl(
        request,
        `/api/voice/continue?sessionId=${sessionId}`
      )}`
    );
  }

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
