import { Resend } from "resend";
import { logger } from "./logger";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = "inndos <notifications@resend.inndos.com>";

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
  const { ownerEmail, ownerName, guestName, propertyTitle, dashboardUrl } = params;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: ownerEmail,
    subject: `New link-up request for "${propertyTitle}"`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Link-Up Request</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a2e;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">inndos</p>
              <p style="margin:6px 0 0;font-size:13px;color:#9b9bb4;">Property Management Platform</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">New Link-Up Request</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Hi ${ownerName}, you have a new link-up request waiting for your review.</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
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
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">Review Link-Up</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You're receiving this because you're a property owner on inndos.</p>
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
    logger.error({ error }, "Failed to send new link-up email to owner");
    throw new Error(`Resend error: ${error.message}`);
  }
}

export interface BookingStatusEmailParams {
  guestEmail: string;
  guestName: string;
  propertyTitle: string;
  status: "confirmed" | "cancelled";
  dashboardUrl: string;
}

export async function sendBookingStatusEmail(params: BookingStatusEmailParams): Promise<void> {
  const { guestEmail, guestName, propertyTitle, status, dashboardUrl } = params;
  const isConfirmed = status === "confirmed";
  const subject = isConfirmed
    ? `Your link-up for "${propertyTitle}" is confirmed!`
    : `Your link-up request for "${propertyTitle}" was declined`;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: guestEmail,
    subject,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isConfirmed ? "Link-Up Confirmed" : "Link-Up Declined"}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:${isConfirmed ? "#1a1a2e" : "#7f1d1d"};padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">inndos</p>
              <p style="margin:6px 0 0;font-size:13px;color:#9b9bb4;">Property Management Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">${isConfirmed ? "🎉 Link-Up Confirmed!" : "Link-Up Not Approved"}</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Hi ${guestName}, ${isConfirmed
                ? "great news — the property owner has confirmed your link-up request."
                : "the property owner was unable to approve your link-up request at this time."}</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${isConfirmed ? "#f0fdf4" : "#fef2f2"};border-radius:8px;border:1px solid ${isConfirmed ? "#bbf7d0" : "#fecaca"};overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:${isConfirmed ? "#15803d" : "#b91c1c"};text-transform:uppercase;letter-spacing:0.5px;">Property</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${propertyTitle}</p>
                  </td>
                </tr>
              </table>

              ${isConfirmed
                ? '<p style="margin:0 0 24px;font-size:14px;color:#6b7280;">You\'re all set! Head to your dashboard to view your booking details.</p>'
                : '<p style="margin:0 0 24px;font-size:14px;color:#6b7280;">You can browse other available properties on inndos and send a new link-up request.</p>'}

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">View Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You're receiving this because you made a link-up request on inndos.</p>
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
    logger.error({ error }, "Failed to send booking status email to guest");
    throw new Error(`Resend error: ${error.message}`);
  }
}

export interface GuestCancelledEmailParams {
  ownerEmail: string;
  ownerName: string;
  guestName: string;
  propertyTitle: string;
  startDate: string;
  endDate: string;
  dashboardUrl: string;
}

export async function sendGuestCancelledEmail(params: GuestCancelledEmailParams): Promise<void> {
  const { ownerEmail, ownerName, guestName, propertyTitle, dashboardUrl } = params;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: ownerEmail,
    subject: `Link-up cancelled: "${propertyTitle}"`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Link-Up Cancelled by Guest</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#1a1a2e;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">inndos</p>
              <p style="margin:6px 0 0;font-size:13px;color:#9b9bb4;">Property Management Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Link-Up Cancelled</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Hi ${ownerName}, a guest has cancelled their link-up for one of your properties.</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:8px;border:1px solid #fecaca;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#b91c1c;text-transform:uppercase;letter-spacing:0.5px;">Property</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${propertyTitle}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #fecaca;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#b91c1c;text-transform:uppercase;letter-spacing:0.5px;">Guest</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${guestName}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Head to your dashboard to see your updated link-up requests.</p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">Go to Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You're receiving this because you're a property owner on inndos.</p>
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
    logger.error({ error }, "Failed to send guest-cancelled email to owner");
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
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">inndos</p>
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

              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Your listing is now live and visible to guests on inndos. Head to your dashboard to manage bookings and track performance.</p>

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
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You're receiving this because you're a property owner on inndos.</p>
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

export interface PasswordResetEmailParams {
  to: string;
  name: string;
  resetLink: string;
}

export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<void> {
  const { to, name, resetLink } = params;
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: "Reset your inndos password",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#111827;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">inndos</p>
              <p style="margin:6px 0 0;font-size:13px;color:#9b9bb4;">Unified Property Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Reset your password</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Hi ${name}, we received a request to reset your inndos password. Click the button below to set a new one.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Or copy and paste this link into your browser:</p>
              <p style="margin:0 0 24px;font-size:12px;color:#9ca3af;word-break:break-all;">${resetLink}</p>
              <p style="margin:0;font-size:13px;color:#9ca3af;">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You're receiving this because you have an account on inndos.</p>
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
    logger.error({ error }, "Failed to send password reset email");
    throw new Error(`Resend error: ${error.message}`);
  }
}

export interface SubscriptionReminderEmailParams {
  toEmail: string;
  clientName: string;
  planName: string;
  amount: number;
  expiryDate: string;
  renewalUrl: string;
  helpUrl: string;
  daysLeft: number;
  activeListings?: number;
}

export async function sendSubscriptionReminderEmail(params: SubscriptionReminderEmailParams): Promise<void> {
  const { toEmail, clientName, planName, amount, expiryDate, renewalUrl, helpUrl, daysLeft, activeListings } = params;

  const isFinal  = daysLeft === 1;
  const isUrgent = daysLeft <= 3;
  const bannerBg = isFinal ? "#991b1b" : isUrgent ? "#92400e" : "#1a1a2e";
  const ctaBg    = isFinal ? "#b91c1c" : isUrgent ? "#d97706" : "#1a1a2e";

  const urgencyBadge = isFinal
    ? "🚨 FINAL WARNING — Expires Tomorrow"
    : isUrgent
    ? `⚠️ URGENT — ${daysLeft} Days Left`
    : `⏰ ${daysLeft} Days Remaining`;

  const subject = isFinal
    ? `🚨 FINAL WARNING: Your inndos subscription expires TOMORROW`
    : isUrgent
    ? `⚠️ URGENT: Your inndos subscription expires in ${daysLeft} days – Renew Now`
    : `⏰ Reminder: Your inndos ${planName} subscription expires in ${daysLeft} days`;

  const headline = isFinal
    ? "Your subscription expires tomorrow"
    : isUrgent
    ? `Only ${daysLeft} days left — act now`
    : "Time to renew your subscription";

  const intro = isFinal
    ? `Hi ${clientName}, this is your <strong>final warning</strong>. Your inndos subscription expires <strong>tomorrow (${expiryDate})</strong>. After expiry your listings will be hidden and you will stop receiving link-up requests.`
    : isUrgent
    ? `Hi ${clientName}, your inndos subscription expires in just <strong>${daysLeft} days on ${expiryDate}</strong>. Renew now to keep your properties visible and your leads flowing.`
    : `Hi ${clientName}, this is a friendly reminder that your inndos <strong>${planName}</strong> subscription expires on <strong>${expiryDate}</strong>. Renew to stay connected with seekers.`;

  const listingsRow = (activeListings != null && activeListings > 0)
    ? `<tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><p style="margin:0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Active Listings</p><p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${activeListings} listing${activeListings === 1 ? "" : "s"} affected</p></td></tr>`
    : "";

  const consequencesHtml = isFinal ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:8px;border:1px solid #fecaca;margin-bottom:24px;">
                <tr><td style="padding:16px 20px;"><p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#b91c1c;">What happens after expiry:</p><p style="margin:0;font-size:13px;color:#374151;line-height:1.8;">❌ Listings disappear from search<br/>❌ Seekers can no longer find your properties<br/>❌ You stop receiving link-up requests<br/>❌ Verified status is paused</p></td></tr>
              </table>` : "";

  const benefitsHtml = !isFinal ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin-bottom:24px;">
                <tr><td style="padding:16px 20px;"><p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#15803d;">Why renew?</p><p style="margin:0;font-size:13px;color:#374151;line-height:1.8;">✅ Stay visible to thousands of active seekers<br/>✅ Keep receiving link-up requests and inquiries<br/>✅ Maintain your verified badge and search ranking<br/>✅ Avoid rebuilding your listing from scratch</p></td></tr>
              </table>` : "";

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: toEmail,
    subject,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background-color:${bannerBg};padding:28px 32px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">inndos</p>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Property Management Platform</p>
        </td></tr>
        <tr><td style="background-color:${ctaBg};padding:10px 32px;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:0.5px;">${urgencyBadge}</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">${headline}</p>
          <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.7;">${intro}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;margin-bottom:24px;">
            ${listingsRow}
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><p style="margin:0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Plan</p><p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${planName}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><p style="margin:0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Renewal Amount</p><p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">KES ${amount.toLocaleString()}</p></td></tr>
            <tr><td style="padding:14px 20px;"><p style="margin:0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Expiry Date</p><p style="margin:4px 0 0;font-size:15px;font-weight:700;color:${ctaBg};">${expiryDate}</p></td></tr>
          </table>
          ${consequencesHtml}
          ${benefitsHtml}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="${renewalUrl}" style="display:inline-block;background-color:${ctaBg};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 40px;border-radius:8px;">Renew My Subscription</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#6b7280;">Need help? <a href="${helpUrl}" style="color:${bannerBg};font-weight:600;">Contact our support team</a>.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You're receiving this because you have an active subscription on inndos. © Fortisec inndos Ltd.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) {
    logger.error({ error }, "Failed to send subscription reminder email");
    throw new Error(`Resend error: ${error.message}`);
  }
}

// ─── Subscription Expired Email ───────────────────────────────────────────────

export interface SubscriptionExpiredEmailParams {
  toEmail: string;
  ownerName: string;
  planName: string;
  expiryDate: string;
  activeListings: number;
  reactivateUrl: string;
}

export async function sendSubscriptionExpiredEmail(params: SubscriptionExpiredEmailParams): Promise<void> {
  const { toEmail, ownerName, planName, expiryDate, activeListings, reactivateUrl } = params;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: toEmail,
    subject: `⚠️ Your inndos subscription has expired – Reactivate now`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Subscription Expired</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background-color:#7f1d1d;padding:28px 32px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">inndos</p>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Property Management Platform</p>
        </td></tr>
        <tr><td style="background-color:#b91c1c;padding:10px 32px;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#ffffff;text-align:center;">⚠️ SUBSCRIPTION EXPIRED</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Your subscription has expired</p>
          <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.7;">Hi ${ownerName}, your inndos <strong>${planName}</strong> subscription expired on <strong>${expiryDate}</strong>. Your ${activeListings} listing${activeListings === 1 ? " is" : "s are"} now hidden from search and you are no longer receiving link-up requests.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:8px;border:1px solid #fecaca;margin-bottom:24px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#b91c1c;">What this means:</p>
              <p style="margin:0;font-size:13px;color:#374151;line-height:1.8;">❌ Properties no longer appear in search<br/>❌ Seekers cannot contact you<br/>❌ Link-up requests have stopped<br/>❌ Verified status is paused</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin-bottom:28px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#15803d;">Reactivate and get back instantly:</p>
              <p style="margin:0;font-size:13px;color:#374151;line-height:1.8;">✅ Listings go live the moment you renew<br/>✅ Keep your verified status and history<br/>✅ Resume receiving link-up requests<br/>✅ Retain all analytics and performance data</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="${reactivateUrl}" style="display:inline-block;background-color:#b91c1c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 40px;border-radius:8px;">Reactivate My Subscription</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#6b7280;">Questions? Visit your <a href="${reactivateUrl}" style="color:#111827;font-weight:600;">inndos dashboard</a>.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You're receiving this because you had an active subscription on inndos. © Fortisec inndos Ltd.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) {
    logger.error({ error }, "Failed to send subscription expired email");
    throw new Error(`Resend error: ${error.message}`);
  }
}

// ─── Subscription Renewal Confirmation Email ──────────────────────────────────

export interface SubscriptionRenewalConfirmationEmailParams {
  toEmail: string;
  ownerName: string;
  planName: string;
  amount: number;
  newExpiryDate: string;
  billingCycle: string;
  dashboardUrl: string;
}

export async function sendSubscriptionRenewalConfirmationEmail(params: SubscriptionRenewalConfirmationEmailParams): Promise<void> {
  const { toEmail, ownerName, planName, amount, newExpiryDate, billingCycle, dashboardUrl } = params;
  const cycleLabel = billingCycle === "yearly" ? "12 months" : billingCycle === "monthly" ? "1 month" : billingCycle;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: toEmail,
    subject: `✅ Subscription renewed – Your inndos ${planName} plan is active`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Subscription Renewed</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background-color:#14532d;padding:28px 32px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">inndos</p>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Property Management Platform</p>
        </td></tr>
        <tr><td style="background-color:#16a34a;padding:10px 32px;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#ffffff;text-align:center;">✅ SUBSCRIPTION RENEWED SUCCESSFULLY</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">You're all set, ${ownerName}!</p>
          <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.7;">Your inndos <strong>${planName}</strong> subscription has been renewed. Your listings are live and visible to seekers.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;margin-bottom:24px;">
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><p style="margin:0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Plan</p><p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${planName}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><p style="margin:0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Amount Paid</p><p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">KES ${amount.toLocaleString()}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><p style="margin:0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Billing Period</p><p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${cycleLabel}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><p style="margin:0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Next Renewal</p><p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#15803d;">${newExpiryDate}</p></td></tr>
            <tr><td style="padding:14px 20px;"><p style="margin:0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Status</p><p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#16a34a;">✅ Active</p></td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin-bottom:28px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#15803d;">Your active benefits:</p>
              <p style="margin:0;font-size:13px;color:#374151;line-height:1.8;">✅ Full visibility in search results<br/>✅ Verified badge maintained<br/>✅ Link-up requests enabled<br/>✅ Analytics dashboard access<br/>✅ Direct messaging with seekers</p>
            </td></tr>
          </table>
          <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">Make the most of your listing:</p>
          <p style="margin:0 0 24px;font-size:13px;color:#4b5563;line-height:1.8;">📸 Add more photos — properties with 10+ photos get more views<br/>📅 Keep your availability updated<br/>💬 Respond to requests within the hour for best results<br/>📊 Track your performance in the analytics dashboard</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="${dashboardUrl}" style="display:inline-block;background-color:#16a34a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 40px;border-radius:8px;">Go to My Dashboard</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#6b7280;">Thank you for choosing inndos. We're excited to keep connecting you with seekers.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You're receiving this because you renewed your inndos subscription. © Fortisec inndos Ltd.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) {
    logger.error({ error }, "Failed to send subscription renewal confirmation email");
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
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">inndos</p>
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
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You're receiving this because you're a property owner on inndos.</p>
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

// ─── Transaction Confirmation Email ───────────────────────────────────────────

export interface TransactionConfirmationEmailParams {
  toEmail: string;
  toName: string;
  propertyTitle: string;
  transactionType: "rental" | "sale";
  eventType: "prompt" | "confirmed" | "reminder";
  status?: string;
  dashboardUrl: string;
  daysElapsed?: number;
}

export async function sendTransactionConfirmationEmail(
  params: TransactionConfirmationEmailParams
): Promise<void> {
  const { toEmail, toName, propertyTitle, transactionType, eventType, status, dashboardUrl, daysElapsed } = params;

  const typeLabel = transactionType === "sale" ? "Property Sale" : "Rental";
  const actionLabel = transactionType === "sale" ? "sold" : "rented";

  let subject = "";
  let headingColor = "#16a34a";
  let headingBg = "#f0fdf4";
  let headingBorder = "#bbf7d0";
  let mainHeading = "";
  let bodyText = "";
  let ctaLabel = "Go to Dashboard";
  let bannerBg = "#16a34a";

  if (eventType === "prompt") {
    subject = `Action required: Confirm your ${typeLabel} transaction for "${propertyTitle}"`;
    mainHeading = `Confirm Your ${typeLabel} Transaction`;
    bodyText = `Hi ${toName}, a Link-Up for <strong>${propertyTitle}</strong> has been confirmed. Please log in to your dashboard to confirm whether the ${actionLabel} was completed via inndos.`;
    bannerBg = "#2563eb";
    headingColor = "#1d4ed8";
    headingBg = "#eff6ff";
    headingBorder = "#bfdbfe";
  } else if (eventType === "reminder") {
    const days = daysElapsed ?? 1;
    subject = `Reminder (${days} day${days === 1 ? "" : "s"}): Please confirm your ${typeLabel} for "${propertyTitle}"`;
    mainHeading = `Reminder: Confirm Your ${typeLabel}`;
    bodyText = `Hi ${toName}, this is a ${days}-day reminder to confirm the ${typeLabel.toLowerCase()} transaction for <strong>${propertyTitle}</strong>. Your confirmation helps keep platform records accurate.`;
    bannerBg = days >= 3 ? "#d97706" : "#2563eb";
    headingColor = days >= 3 ? "#92400e" : "#1d4ed8";
    headingBg = days >= 3 ? "#fffbeb" : "#eff6ff";
    headingBorder = days >= 3 ? "#fde68a" : "#bfdbfe";
  } else {
    // confirmed
    subject = `Transaction confirmed: "${propertyTitle}" has been marked as ${status?.replace(/_/g, " ") ?? "confirmed"}`;
    mainHeading = `Transaction Fully Confirmed 🎉`;
    bodyText = `Hi ${toName}, the ${typeLabel.toLowerCase()} for <strong>${propertyTitle}</strong> has been fully confirmed by both parties. This transaction is now recorded in the platform analytics.`;
    bannerBg = "#16a34a";
  }

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: toEmail,
    subject,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:${bannerBg};padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">inndos</p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Property Transaction Confirmation</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">${mainHeading}</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">${bodyText}</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${headingBg};border-radius:8px;border:1px solid ${headingBorder};overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid ${headingBorder};">
                    <p style="margin:0;font-size:11px;font-weight:600;color:${headingColor};text-transform:uppercase;letter-spacing:0.5px;">Property</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${propertyTitle}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:${headingColor};text-transform:uppercase;letter-spacing:0.5px;">Transaction Type</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${typeLabel}</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:${bannerBg};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You're receiving this because you have an active transaction on inndos.</p>
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
    logger.error({ error }, "Failed to send transaction confirmation email");
    throw new Error(`Resend error: ${error.message}`);
  }
}
