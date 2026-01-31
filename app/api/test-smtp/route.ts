import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { SmtpConfig } from '../../../types/index';

import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { checkIpAllowlist } from '../../../lib/security';

export async function POST(request: Request) {
    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const security = checkIpAllowlist(clientIp);

    if (!security.allowed) {
        return NextResponse.json(
            { success: false, message: security.reason },
            { status: 403 }
        );
    }
    try {
        const body = await request.json();
        const config: SmtpConfig = body;

        const transportOptions: any = {
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.pass,
            },
        };

        if (config.proxy?.enabled) {
            const { protocol, host, port, auth } = config.proxy;
            const proxyUrl = `${protocol}://${auth?.user ? `${auth.user}:${auth.pass}@` : ''}${host}:${port}`;

            if (protocol.startsWith('socks')) {
                transportOptions.agent = new SocksProxyAgent(proxyUrl);
            } else {
                transportOptions.agent = new HttpsProxyAgent(proxyUrl);
            }
        }

        const transporter = nodemailer.createTransport(transportOptions);

        await transporter.verify();

        return NextResponse.json({ success: true, message: 'Connection successful' });
    } catch (error: any) {
        console.error('SMTP Test Error:', error);

        let message = error.message || 'Connection failed';

        // Enhance error messages for common issues
        if (message.includes('Greeting never received')) {
            message = 'Handshake failed: Greeting never received. This usually means the port expects SSL/TLS but "Use SSL/TLS" is unchecked, or vice versa. Try toggling the SSL setting.';
        } else if (message.includes('wrong version number')) {
            message = 'Handshake failed: SSL version mismatch. You enabled SSL/TLS but the server might want a plaintext connection (STARTTLS). Try unchecking "Use SSL/TLS".';
        }

        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
    }
}
