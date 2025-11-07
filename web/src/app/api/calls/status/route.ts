import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const form = await request.formData();
  const callSid = (form.get("CallSid") || "").toString();
  const callStatus = (form.get("CallStatus") || "").toString();
  const recordingUrl = (form.get("RecordingUrl") || "").toString();
  const callDuration = Number(form.get("CallDuration") || "0");

  if (!callSid) {
    return NextResponse.json({ ok: true });
  }

  await prisma.callLog.updateMany({
    where: { twilioCallSid: callSid },
    data: {
      notes: callStatus
        ? `Status: ${callStatus}`
        : undefined,
      recordingUrl: recordingUrl || undefined,
      duration: callDuration || undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
