import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertLead } from "@/services/leads";
import { LeadSource } from "@prisma/client";

const leadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  phone: z.string().min(6),
  email: z.string().email({ message: "Invalid email" }).optional(),
  city: z.string().optional(),
  studentGrade: z.string().optional(),
  preferredExam: z.string().optional(),
  guardianName: z.string().optional(),
  studentName: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const data = await request.json();
  const parsed = leadSchema.safeParse(data);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { lead, created } = await upsertLead({
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

  return NextResponse.json({ ok: true, lead, created });
}
