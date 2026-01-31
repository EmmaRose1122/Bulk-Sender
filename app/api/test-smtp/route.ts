import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { SmtpConfig } from '@/types';

import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

export async function POST(request: Request) {
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
        return NextResponse.json(
            { success: false, message: error.message || 'Connection failed' },
            { status: 500 }
        );
    }
}
