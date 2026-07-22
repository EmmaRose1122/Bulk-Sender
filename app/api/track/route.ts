import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TRACKING_FILE = path.join(DATA_DIR, 'tracking.json');

// Helper to ensure data directory and file exist
function ensureDataFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(TRACKING_FILE)) {
        fs.writeFileSync(TRACKING_FILE, JSON.stringify({}));
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('leadId');

    // If client is fetching tracking stats (JSON endpoint)
    if (searchParams.get('action') === 'stats') {
        try {
            ensureDataFile();
            const data = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
            return NextResponse.json({ success: true, tracking: data });
        } catch (error) {
            return NextResponse.json({ success: false, tracking: {} });
        }
    }

    if (id) {
        try {
            ensureDataFile();
            let data: Record<string, any> = {};
            try {
                data = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
            } catch (e) {
                data = {};
            }

            const existing = data[id] || { openCount: 0 };
            const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
            const cleanIp = ip.split(',')[0].trim();

            data[id] = {
                ...existing,
                opened: true,
                openCount: (existing.openCount || 0) + 1,
                openedAt: existing.openedAt || Date.now(),
                lastOpenedAt: Date.now(),
                ip: cleanIp,
                userAgent: request.headers.get('user-agent') || 'unknown'
            };
            fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
            console.log(`[Email Tracking] Open recorded for lead ID: ${id} (Count: ${data[id].openCount})`);
        } catch (error) {
            console.error('Tracking Record Error:', error);
        }
    }

    // Return a 1x1 transparent GIF image
    const buffer = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
    );

    return new NextResponse(buffer, {
        headers: {
            'Content-Type': 'image/gif',
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
    });
}
