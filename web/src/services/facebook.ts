import { z } from "zod";
import { socialConfig } from "@/lib/config";

const facebookLeadSchema = z.object({
  id: z.string(),
  created_time: z.string(),
  field_data: z
    .array(
      z.object({
        name: z.string(),
        values: z.array(z.string()).optional(),
      })
    )
    .default([]),
});

export type FacebookLead = z.infer<typeof facebookLeadSchema>;

function mapField(
  lead: FacebookLead,
  key: string
): string | undefined {
  const field = lead.field_data.find((item) => item.name === key);
  return field?.values?.[0];
}

export async function fetchFacebookLeads() {
  if (!socialConfig.facebookAccessToken || socialConfig.facebookLeadFormIds.length === 0) {
    return [];
  }

  const results: FacebookLead[] = [];

  for (const formId of socialConfig.facebookLeadFormIds) {
    const url = new URL(`https://graph.facebook.com/v19.0/${formId}/leads`);
    url.searchParams.set("access_token", socialConfig.facebookAccessToken);
    url.searchParams.set("limit", "50");

    const response = await fetch(url, {
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error("Facebook lead fetch failed", await response.text());
      continue;
    }

    const payload = await response.json();
    const data = z
      .object({ data: z.array(facebookLeadSchema).default([]) })
      .parse(payload);

    results.push(...data.data);
  }

  return results.map((lead) => ({
    sourceId: lead.id,
    createdAt: new Date(lead.created_time),
    firstName: mapField(lead, "first_name") ?? mapField(lead, "full_name") ?? "Prospect",
    lastName: mapField(lead, "last_name") ?? "",
    phone: mapField(lead, "phone_number") ?? "",
    email: mapField(lead, "email") ?? "",
    city: mapField(lead, "city") ?? "",
    studentGrade: mapField(lead, "student_class") ?? "",
    preferredExam: mapField(lead, "preferred_exam") ?? "Sainik School",
    guardianName: mapField(lead, "guardian_name") ?? "",
    studentName: mapField(lead, "student_name") ?? "",
    metadata: lead.field_data,
  }));
}
