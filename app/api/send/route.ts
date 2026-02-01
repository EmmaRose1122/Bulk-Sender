import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { SmtpConfig } from '../../../types/index';
import { checkIpAllowlist } from '../../../lib/security';

interface SendRequest {
    smtpConfig: SmtpConfig;
    to: string;
    subject: string;
    html: string;
    trackingId?: string;
    baseUrl?: string;
}

export async function POST(request: Request) {
    try {
        const body: SendRequest = await request.json();
        const { smtpConfig, to, subject, html, trackingId } = body;

        console.log('=== SMTP Send Request ===');
        console.log('To:', to);
        console.log('SMTP Host:', smtpConfig.host);
        console.log('SMTP Port:', smtpConfig.port);
        console.log('SMTP User:', smtpConfig.user);
        console.log('SMTP Secure:', smtpConfig.secure);

        if (!smtpConfig) {
            return NextResponse.json(
                { success: false, message: 'SMTP Configuration is missing' },
                { status: 400 }
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transportOptions: any = {
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: {
                user: smtpConfig.user,
                pass: smtpConfig.pass,
            }
        };

        // For Gmail, add specific settings
        if (smtpConfig.host.includes('gmail')) {
            console.log('Detected Gmail - using specific settings');
            transportOptions.service = 'gmail';
            transportOptions.host = 'smtp.gmail.com';
            transportOptions.port = 587;
            transportOptions.secure = false; // Use STARTTLS instead of SSL
            transportOptions.tls = {
                rejectUnauthorized: false
            };
        }

        if (smtpConfig.proxy?.enabled) {
            const { protocol, host, port, auth } = smtpConfig.proxy;
            const proxyUrl = `${protocol}://${auth?.user ? `${auth.user}:${auth.pass}@` : ''}${host}:${port}`;

            // Masked logging for security
            console.log(`Using Proxy: ${protocol}://${host}:${port}${auth?.user ? ' (Authenticated)' : ''}`);

            if (protocol.startsWith('socks')) {
                transportOptions.agent = new SocksProxyAgent(proxyUrl);
            } else {
                transportOptions.agent = new HttpsProxyAgent(proxyUrl);
            }
        }

        console.log('Creating transporter with config:', {
            host: transportOptions.host,
            port: transportOptions.port,
            secure: transportOptions.secure,
            service: transportOptions.service
        });

        const transporter = nodemailer.createTransport(transportOptions);

        // Verify connection first
        try {
            console.log('Verifying SMTP connection...');
            await transporter.verify();
            console.log('SMTP connection verified successfully');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (verifyError: any) {
            console.error('SMTP Verify Error:', verifyError);

            let errorMessage = `SMTP Connection Failed: ${verifyError.message}`;

            // Handle specific DNS/Network errors
            if (verifyError.code === 'ENOTFOUND' || verifyError.message?.includes('getaddrinfo')) {
                errorMessage = `SMTP Connection Failed: Could not resolve hostname '${smtpConfig.host}'. Please check your SMTP host settings.`;
            } else if (verifyError.code === 'EBUSY') {
                errorMessage = `SMTP Connection Failed: System busy or unable to resolve hostname '${smtpConfig.host}'.`;
            }

            return NextResponse.json(
                { success: false, message: errorMessage },
                { status: 500 }
            );
        }

        // Inject tracking pixel if trackingId is provided
        let finalHtml = html;
        if (trackingId) {
            const trackingUrl = body.baseUrl || request.headers.get('origin') || 'http://localhost:3000';
            const trackingPixel = `<img src="${trackingUrl}/api/track?id=${trackingId}" width="1" height="1" style="display:none;" alt="" />`;

            if (finalHtml.includes('</body>')) {
                finalHtml = finalHtml.replace('</body>', `${trackingPixel}</body>`);
            } else {
                finalHtml += trackingPixel;
            }
        }

        // Construct advanced headers to bypass spam filters
        const senderEmail = smtpConfig.fromEmail || smtpConfig.user;
        const trackingUrl = body.baseUrl || request.headers.get('origin') || 'http://localhost:3000';
        const unsubscribeUrl = `${trackingUrl}/api/unsubscribe?id=${trackingId || 'general'}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const headers: any = {
            'Precedence': 'bulk',
            'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:${senderEmail}?subject=unsubscribe>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'X-Mailer': 'BulkSender Intelligence 1.0',
            'List-ID': `<${senderEmail.split('@')[1]}>`,
            'X-Report-Abuse': `Please report abuse to abuse@${senderEmail.split('@')[1]}`
        };

        console.log('Sending email with anti-spam headers...');
        const info = await transporter.sendMail({
            from: `"${smtpConfig.fromName || smtpConfig.user}" <${senderEmail}>`,
            to,
            subject,
            html: finalHtml,
            headers
        });

        console.log('Email sent successfully:', info.messageId);
        return NextResponse.json({ success: true, messageId: info.messageId });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('=== Send API Error ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error code:', error.code);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
