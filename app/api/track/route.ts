import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import geoip from 'geoip-lite';

const DATA_DIR = path.join(process.cwd(), 'data');
const TRACKING_FILE = path.join(DATA_DIR, 'tracking.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
    console.log('Creating data directory at:', DATA_DIR);
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(TRACKING_FILE)) {
    console.log('Creating tracking file at:', TRACKING_FILE);
    fs.writeFileSync(TRACKING_FILE, JSON.stringify({}));
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
        try {
            const data = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
            const existing = data[id] || {};

            const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
            const cleanIp = ip.split(',')[0].trim();
            const geo = geoip.lookup(cleanIp);
            const location = geo ? `${geo.city || ''}, ${geo.country || ''}`.replace(/^, /, '') : 'Unknown Location';

            data[id] = {
                ...existing,
                opened: true,
                openedAt: existing.openedAt || Date.now(),
                lastOpenedAt: Date.now(),
                ip: cleanIp,
                userAgent: request.headers.get('user-agent') || 'unknown',
                location: geo ? { city: geo.city, country: geo.country, region: geo.region } : null,
                locationString: location
            };
            fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
            console.log(`Email opened: ${id} from ${location} (${cleanIp})`);
        } catch (error) {
            console.error('Tracking Error:', error);
        }
    }

    // Return a 1x1 transparent GIF
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
