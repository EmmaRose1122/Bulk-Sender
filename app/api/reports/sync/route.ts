import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TRACKING_FILE = path.join(DATA_DIR, 'tracking.json');

export async function GET() {
    try {
        if (!fs.existsSync(TRACKING_FILE)) {
            return NextResponse.json({ success: true, tracking: {} });
        }
        const fileContent = fs.readFileSync(TRACKING_FILE, 'utf8');
        const data = fileContent ? JSON.parse(fileContent) : {};
        return NextResponse.json({ success: true, tracking: data });
    } catch (error) {
        console.error('Sync Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to sync tracking data' }, { status: 500 });
    }
}
