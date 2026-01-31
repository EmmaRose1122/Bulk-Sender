import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SECURITY_FILE = path.join(DATA_DIR, 'security.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(SECURITY_FILE)) {
    fs.writeFileSync(SECURITY_FILE, JSON.stringify({ ipAllowlist: [] }));
}

export async function GET() {
    try {
        const data = JSON.parse(fs.readFileSync(SECURITY_FILE, 'utf8'));
        return NextResponse.json({ success: true, config: data });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { ipAllowlist } = body;

        if (!Array.isArray(ipAllowlist)) {
            return NextResponse.json({ success: false, message: 'Invalid allowlist format' }, { status: 400 });
        }

        const data = { ipAllowlist };
        fs.writeFileSync(SECURITY_FILE, JSON.stringify(data, null, 2));

        return NextResponse.json({ success: true, message: 'Security shield synchronized' });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
