import { NextResponse } from "next/server";
import { z } from "zod";
import { initiateOutboundCall } from "@/services/leads";
import { featureFlags } from "@/lib/config";

const schema = z.object({
  leadId: z.string().min(1),
});

export async function POST(request: Request) {
  if (!featureFlags.enableTelephony) {
    return NextResponse.json(
      { ok: false, reason: "Telephony is not configured." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const call = await initiateOutboundCall(parsed.data.leadId);

  return NextResponse.json({
    ok: true,
    callSid: call?.sid ?? null,
  });
}
