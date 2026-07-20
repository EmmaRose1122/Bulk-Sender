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
    const info = await transporter.sendMail({
      from: `"${smtpConfig.fromName || smtpConfig.user}" <${senderEmail}>`,
      to,
      subject,
      html,
      headers: {
        'X-Lead-ID': leadId,
        'X-Mailer': 'BulkSender LeadCRM 1.0',
      }
    });

    console.log(`Lead email sent to ${to}:`, info.messageId);
    return NextResponse.json({ success: true, messageId: info.messageId });

  } catch (error: any) {
    console.error('Lead Email Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to send email' }, { status: 500 });
  }
}
