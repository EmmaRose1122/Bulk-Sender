import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TRACKING_FILE = path.join(process.cwd(), 'data', 'tracking.json');

export async function GET() {
    try {
        if (!fs.existsSync(TRACKING_FILE)) {
            return NextResponse.json({});
        }
        const data = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
        return NextResponse.json(data);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to read tracking data' }, { status: 500 });
    }
}
