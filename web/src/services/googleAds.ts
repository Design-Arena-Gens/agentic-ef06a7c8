import { z } from "zod";
import { socialConfig } from "@/lib/config";

const submissionSchema = z.object({
  leadFormSubmissionData: z.object({
    leadFormId: z.string().optional(),
    asset: z.string().optional(),
    campaign: z.string().optional(),
    adGroup: z.string().optional(),
    leadFormSubmissionFields: z
      .array(
        z.object({
          fieldType: z.string(),
          fieldValue: z.string().optional(),
        })
      )
      .default([]),
    submissionDateTime: z.string().optional(),
  }),
});

function mapField(
  fields: z.infer<typeof submissionSchema>["leadFormSubmissionData"]["leadFormSubmissionFields"],
  fieldType: string
) {
  return fields.find((field) => field.fieldType === fieldType)?.fieldValue;
}

async function getGoogleAccessToken() {
  const { clientId, clientSecret, refreshToken } = socialConfig.googleAds;
  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    console.error("Failed to refresh Google Ads token", await response.text());
    return null;
  }

  const data = await response.json();
  return data.access_token as string;
}

export async function fetchGoogleAdsLeads() {
  const {
    developerToken,
    loginCustomerId,
    customerId,
  } = socialConfig.googleAds;

  if (!developerToken || !customerId) {
    return [];
  }

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return [];
  }

  const endpoint = `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:search`;
  const query = `
    SELECT
      lead_form_submission_data.asset,
      lead_form_submission_data.campaign,
      lead_form_submission_data.ad_group,
      lead_form_submission_data.lead_form_submission_fields,
      lead_form_submission_data.lead_form_id,
      lead_form_submission_data.submission_datetime
    FROM lead_form_submission_data
    WHERE lead_form_submission_data.submission_datetime DURING LAST_7_DAYS
    LIMIT 50
  `;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      ...(loginCustomerId
        ? { "login-customer-id": loginCustomerId }
        : {}),
    },
    body: JSON.stringify({ query }),
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    console.error("Google Ads lead fetch failed", await response.text());
    return [];
  }

  const payload = await response.json();
  const rows = z
    .object({
      results: z.array(submissionSchema).default([]),
    })
    .parse(payload).results;

  return rows.map((row) => {
    const fields = row.leadFormSubmissionData.leadFormSubmissionFields;
    const submissionTime =
      row.leadFormSubmissionData.submissionDateTime ?? undefined;

    return {
      sourceId: row.leadFormSubmissionData.leadFormId ?? undefined,
      createdAt: submissionTime ? new Date(submissionTime) : new Date(),
      firstName:
        mapField(fields, "FULL_NAME") ??
        mapField(fields, "FIRST_NAME") ??
        "Prospect",
      lastName: mapField(fields, "LAST_NAME") ?? "",
      phone:
        mapField(fields, "PHONE_NUMBER") ??
        mapField(fields, "PHONE_NUMBER_EXTENSION") ??
        "",
      email: mapField(fields, "EMAIL") ?? "",
      city:
        mapField(fields, "CITY") ??
        mapField(fields, "POSTAL_CODE") ??
        "",
      studentGrade: mapField(fields, "GRADUATION_YEAR") ?? "",
      preferredExam:
        mapField(fields, "PREFERRED_CONTACT_TIME") ?? "Sainik School",
      guardianName: mapField(fields, "NAME") ?? "",
      studentName: mapField(fields, "FIRST_NAME") ?? "",
      campaignResource: row.leadFormSubmissionData.campaign ?? "",
      adGroupResource: row.leadFormSubmissionData.adGroup ?? "",
      metadata: fields,
    };
  });
}
