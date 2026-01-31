import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TRACKING_FILE = path.join(DATA_DIR, 'tracking.json');

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const target = searchParams.get('target') || '/';

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
                clicked: true,
                clickedAt: Date.now(),
                // Append target to linksClicked array or create it
                linksClicked: [...(existing.linksClicked || []), target],
                ip: request.headers.get('x-forwarded-for') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown'
            };
            fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Click Tracking Error:', error);
        }
    }

    return NextResponse.redirect(target);
}
