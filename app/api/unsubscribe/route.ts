import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TRACKING_FILE = path.join(DATA_DIR, 'tracking.json');

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
        try {
            if (!fs.existsSync(TRACKING_FILE)) {
                if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
                fs.writeFileSync(TRACKING_FILE, '{}');
            }
            const data = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
            const existing = data[id] || {};
            data[id] = {
                ...existing,
                unsubscribed: true,
                unsubscribedAt: Date.now(),
                ip: request.headers.get('x-forwarded-for') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown'
            };
            fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Unsubscribe Error:', error);
        }
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Unsubscribed</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: -apple-system, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #334155; }
            .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; max-width: 400px; width: 90%; }
            h1 { color: #0f172a; margin-bottom: 16px; font-size: 24px; font-weight: 700; }
            p { line-height: 1.5; color: #64748b; margin: 0; }
            .icon { font-size: 48px; margin-bottom: 24px; display: block; }
        </style>
    </head>
    <body>
        <div class="card">
            <span class="icon">🔕</span>
            <h1>Unsubscribed</h1>
            <p>You have been successfully removed from our mailing list. You will no longer receive updates from this channel.</p>
        </div>
    </body>
    </html>
    `;

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' }
    });
}
