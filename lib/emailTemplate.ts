// lib/emailTemplate.ts
// Clean HTML email template with CareCircle logo, large text, nickname, and link back to app.

export function buildEmailHtml(
  title: string,
  bodyText: string,
  appUrl: string = process.env.APP_URL || 'https://carecircle.vercel.app'
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fef3c7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="500" cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; background-color: #ffffff; border-radius: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden; border: 2px solid #fde68a;">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 24px 16px; text-align: center; background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);">
              <span style="font-size: 48px; line-height: 1; display: inline-block;">💊</span>
              <h1 style="margin: 8px 0 0; color: #92400e; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Aarohi</h1>
              <p style="margin: 4px 0 0; color: #b45309; font-size: 15px; font-weight: 600;">Elderly Care & Medication Management</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 28px 24px 20px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #1f2937;">${title}</h2>
              <div style="font-size: 19px; line-height: 1.5; color: #374151; background-color: #fffbeb; border: 1px solid #fef08a; padding: 18px 20px; border-radius: 16px; margin-bottom: 24px;">
                ${bodyText.replace(/\n/g, '<br/>')}
              </div>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${appUrl}" style="display: inline-block; background-color: #f59e0b; color: #ffffff; font-size: 19px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 18px; box-shadow: 0 4px 8px rgba(245, 158, 11, 0.35);">
                      Open Aarohi 🏠
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer / Disclaimer -->
          <tr>
            <td style="padding: 16px 24px 24px; text-align: center; border-top: 1px solid #f3f4f6; color: #6b7280; font-size: 13px; line-height: 1.4;">
              <p style="margin: 0 0 8px; font-weight: 600; color: #4b5563;">Aarohi • Your Family Care Companion</p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                Medical disclaimer: Aarohi assists with reminders and routine adherence. It does not replace professional medical advice or diagnoses. Always consult licensed medical professionals.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
