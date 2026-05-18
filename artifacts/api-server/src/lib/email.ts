import { Resend } from "resend";
import { logger } from "./logger";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = "INNDOS <notifications@inndos.com>";

export interface NewBookingEmailParams {
  ownerEmail: string;
  ownerName: string;
  guestName: string;
  propertyTitle: string;
  startDate: string;
  endDate: string;
  dashboardUrl: string;
}

export async function sendNewBookingEmail(params: NewBookingEmailParams): Promise<void> {
  const { ownerEmail, ownerName, guestName, propertyTitle, startDate, endDate, dashboardUrl } = params;

  const { error } = await resend.emails.send({
    from: "INNDOS <notifications@inndos.com>",
    to: ownerEmail,
    subject: `New booking request for "${propertyTitle}"`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Booking Request</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a2e;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">INNDOS</p>
              <p style="margin:6px 0 0;font-size:13px;color:#9b9bb4;">Property Management Platform</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">New Booking Request</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Hi ${ownerName}, you have a new booking request waiting for your review.</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Property</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${propertyTitle}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Guest</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${guestName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Check-in</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${startDate}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Check-out</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${endDate}</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">Review Booking</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You're receiving this because you're a property owner on INNDOS.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) {
    logger.error({ error }, "Failed to send new booking email to owner");
    throw new Error(`Resend error: ${error.message}`);
  }
}

export interface ListingApprovedEmailParams {
  ownerEmail: string;
  ownerName: string;
  propertyTitle: string;
  dashboardUrl: string;
}

export async function sendListingApprovedEmail(params: ListingApprovedEmailParams): Promise<void> {
  const { ownerEmail, ownerName, propertyTitle, dashboardUrl } = params;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: ownerEmail,
    subject: `Your listing "${propertyTitle}" has been approved`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Listing Approved</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a2e;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">INNDOS</p>
              <p style="margin:6px 0 0;font-size:13px;color:#9b9bb4;">Property Management Platform</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Listing Approved</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Hi ${ownerName}, great news! Your property listing has been reviewed and approved by our team.</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;">Approved Listing</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${propertyTitle}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Your listing is now live and visible to guests on INNDOS. Head to your dashboard to manage bookings and track performance.</p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">Go to Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You're receiving this because you're a property owner on INNDOS.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) {
    logger.error({ error }, "Failed to send listing approved email to owner");
    throw new Error(`Resend error: ${error.message}`);
  }
}

export interface ListingRejectedEmailParams {
  ownerEmail: string;
  ownerName: string;
  propertyTitle: string;
  reason?: string;
  dashboardUrl: string;
}

export async function sendListingRejectedEmail(params: ListingRejectedEmailParams): Promise<void> {
  const { ownerEmail, ownerName, propertyTitle, reason, dashboardUrl } = params;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: ownerEmail,
    subject: `Your listing "${propertyTitle}" could not be approved`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Listing Not Approved</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a2e;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">INNDOS</p>
              <p style="margin:6px 0 0;font-size:13px;color:#9b9bb4;">Property Management Platform</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Listing Not Approved</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Hi ${ownerName}, after reviewing your property listing, our team was unable to approve it at this time.</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:8px;border:1px solid #fecaca;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;${reason ? "border-bottom:1px solid #fecaca;" : ""}">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#b91c1c;text-transform:uppercase;letter-spacing:0.5px;">Listing</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${propertyTitle}</p>
                  </td>
                </tr>
                ${reason ? `
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#b91c1c;text-transform:uppercase;letter-spacing:0.5px;">Reason</p>
                    <p style="margin:4px 0 0;font-size:15px;color:#374151;">${reason}</p>
                  </td>
                </tr>
                ` : ""}
              </table>

              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">You may update your listing and resubmit it for review. Visit your dashboard to make the necessary changes.</p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">Go to Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You're receiving this because you're a property owner on INNDOS.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) {
    logger.error({ error }, "Failed to send listing rejected email to owner");
    throw new Error(`Resend error: ${error.message}`);
  }
}
