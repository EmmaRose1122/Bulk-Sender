import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { SmtpConfig } from '../../../../types/index';

interface LeadEmailRequest {
  smtpConfig: SmtpConfig;
  to: string;
  subject: string;
  html: string;
  leadId: string;
}

export async function POST(request: Request) {
  try {
    const body: LeadEmailRequest = await request.json();
    const { smtpConfig, to, subject, html, leadId } = body;

    if (!smtpConfig || !to) {
      return NextResponse.json({ success: false, message: 'SMTP config and recipient are required' }, { status: 400 });
    }

    const transportOptions: any = {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    };

    if (smtpConfig.host.includes('gmail')) {
      transportOptions.service = 'gmail';
      transportOptions.host = 'smtp.gmail.com';
      transportOptions.port = 587;
      transportOptions.secure = false;
      transportOptions.tls = { rejectUnauthorized: false };
    }

    const transporter = nodemailer.createTransport(transportOptions);
    await transporter.verify();

    const senderEmail = smtpConfig.fromEmail || smtpConfig.user;
    const trackingPixel = `<img src="https://lead-finder-bulk-sender.vercel.app/api/track?id=${encodeURIComponent(leadId)}" width="1" height="1" style="display:none;width:1px;height:1px;opacity:0;" alt="" />`;
    const optOutFooter = `<div style="margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;line-height:1.4;">If you would prefer not to receive future communications, please reply "Unsubscribe" to this email.</div>`;

    let finalHtml = html;
    if (!finalHtml.includes('Unsubscribe')) {
      finalHtml += optOutFooter;
    }
    finalHtml += trackingPixel;

    const info = await transporter.sendMail({
      from: `"${smtpConfig.fromName || 'Dot Skills Team'}" <${senderEmail}>`,
      to,
      subject,
      html: finalHtml,
      headers: {
        'X-Lead-ID': leadId,
        'X-Mailer': 'DotSkills LeadCRM 2.0 (Spam-Shielded)',
        'List-Unsubscribe': `<mailto:${senderEmail}?subject=Unsubscribe>`,
        'Precedence': 'bulk',
        'X-Report-Abuse-To': `<mailto:${senderEmail}>`
      }
    });

    console.log(`[Anti-Spam SMTP] Email successfully sent to ${to} (Lead ID: ${leadId}):`, info.messageId);
    return NextResponse.json({ success: true, messageId: info.messageId });

  } catch (error: any) {
    console.error('Lead Email Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to send email' }, { status: 500 });
  }
}
