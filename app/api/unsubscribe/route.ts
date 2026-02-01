import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TRACKING_FILE = path.join(process.cwd(), 'data', 'tracking.json');

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
        try {
            const data = fs.existsSync(TRACKING_FILE) ? JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8')) : {};
            const existing = data[id] || {};
            data[id] = {
                ...existing,
                unsubscribed: true,
                unsubscribedAt: Date.now()
            };
            fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
            console.log(`User unsubscribed: ${id}`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Unsubscribe Error:', error);
        }
    }

    return new NextResponse(`
        <html>
            <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc;">
                <div style="text-align: center; padding: 2rem; background: white; border-radius: 1rem; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                    <h1 style="color: #6366f1;">Unsubscribed</h1>
                    <p style="color: #64748b;">You have been successfully removed from this mailing list.</p>
                </div>
            </body>
        </html>
    `, {
        headers: { 'Content-Type': 'text/html' }
    });
}

export async function POST(request: Request) {
    // Handle One-Click Unsubscribe (RFC 8058)
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
        try {
            const data = fs.existsSync(TRACKING_FILE) ? JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8')) : {};
            const existing = data[id] || {};
            data[id] = {
                ...existing,
                unsubscribed: true,
                unsubscribedAt: Date.now()
            };
            fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
            console.log(`One-click Unsubscribe: ${id}`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Unsubscribe POST Error:', error);
        }
    }

    return NextResponse.json({ success: true });
}
