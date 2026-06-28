interface EmailLayoutProps {
  title: string;
  preview: string;
  body: string;
}

function emailLayout({ title, preview, body }: EmailLayoutProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0a0612;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preview}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0612;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:linear-gradient(145deg,#151022,#1a1230);border:1px solid rgba(168,85,247,0.25);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 12px;text-align:center;">
              <div style="display:inline-block;width:44px;height:44px;border-radius:12px;background:rgba(168,85,247,0.2);border:1px solid rgba(168,85,247,0.35);line-height:44px;font-size:20px;">⚡</div>
              <h1 style="margin:16px 0 4px;color:#f5f3ff;font-size:22px;font-weight:700;">Trade-Pulse</h1>
              <p style="margin:0;color:#a78bfa;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Real-Time Opportunity Scanner</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;color:#e2e8f0;font-size:15px;line-height:1.65;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;text-align:center;color:#64748b;font-size:12px;line-height:1.5;">
              © ${new Date().getFullYear()} Trade-Pulse · tradepulse252@gmail.com
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function passwordResetEmail(params: {
  name?: string | null;
  code: string;
  resetUrl: string;
}): { subject: string; html: string } {
  const greeting = params.name ? `Hi ${params.name},` : 'Hi there,';
  const html = emailLayout({
    title: 'Reset your Trade-Pulse password',
    preview: `Your password reset code is ${params.code}`,
    body: `
      <p style="margin:0 0 16px;color:#f8fafc;font-size:18px;font-weight:600;">Password reset request</p>
      <p style="margin:0 0 20px;">${greeting}<br/>We received a request to reset your Trade-Pulse password. Use the code below or click the button to choose a new password.</p>
      <p style="margin:0 0 8px;color:#cbd5e1;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Reset code</p>
      <div style="margin:0 0 24px;padding:16px;background:rgba(168,85,247,0.12);border:1px solid rgba(168,85,247,0.35);border-radius:12px;text-align:center;">
        <span style="font-size:32px;font-weight:700;letter-spacing:0.35em;color:#c4b5fd;font-family:ui-monospace,monospace;">${params.code}</span>
      </div>
      <p style="margin:0 0 20px;color:#94a3b8;font-size:13px;">This code expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
        <tr>
          <td style="border-radius:10px;background:linear-gradient(135deg,#9333ea,#7c3aed);">
            <a href="${params.resetUrl}" style="display:inline-block;padding:14px 28px;color:#fff;text-decoration:none;font-weight:600;font-size:15px;">Reset password</a>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#64748b;font-size:12px;word-break:break-all;">Or paste this link:<br/><a href="${params.resetUrl}" style="color:#a78bfa;">${params.resetUrl}</a></p>
    `,
  });

  return { subject: 'Trade-Pulse — Reset your password', html };
}
