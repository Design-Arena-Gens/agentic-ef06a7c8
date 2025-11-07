import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const leads = await prisma.lead.findMany({
    include: {
      callLogs: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Leads");

  worksheet.columns = [
    { header: "Lead ID", key: "id", width: 24 },
    { header: "Created At", key: "createdAt", width: 20 },
    { header: "First Name", key: "firstName", width: 16 },
    { header: "Last Name", key: "lastName", width: 16 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Email", key: "email", width: 24 },
    { header: "City", key: "city", width: 16 },
    { header: "Preferred Exam", key: "preferredExam", width: 20 },
    { header: "Student Grade", key: "studentGrade", width: 14 },
    { header: "Guardian Name", key: "guardianName", width: 18 },
    { header: "Status", key: "status", width: 18 },
    { header: "Source", key: "source", width: 18 },
    { header: "Call Count", key: "callCount", width: 12 },
    { header: "Last Contacted", key: "lastContactedAt", width: 18 },
    { header: "Demo Scheduled", key: "demoScheduledAt", width: 18 },
    { header: "Latest Call Outcome", key: "latestOutcome", width: 22 },
    { header: "Notes", key: "notes", width: 32 },
  ];

  leads.forEach((lead) => {
    const latestCall = lead.callLogs[0];
    worksheet.addRow({
      id: lead.id,
      createdAt: lead.createdAt.toISOString(),
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      email: lead.email,
      city: lead.city,
      preferredExam: lead.preferredExam,
      studentGrade: lead.studentGrade,
      guardianName: lead.guardianName,
      status: lead.status,
      source: lead.source,
      callCount: lead.callCount,
      lastContactedAt: lead.lastContactedAt?.toISOString() ?? "",
      demoScheduledAt: lead.demoScheduledAt?.toISOString() ?? "",
      latestOutcome: latestCall?.outcome ?? "",
      notes:
        latestCall?.notes ??
        (typeof lead.metadata === "object"
          ? JSON.stringify(lead.metadata)
          : ""),
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="leads-export.xlsx"`,
      "Content-Length": buffer.byteLength.toString(),
    },
  });
}
