import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const INBOUND_FILE = path.join(DATA_DIR, 'inbound.json');

export async function GET() {
    try {
        if (!fs.existsSync(INBOUND_FILE)) {
            return NextResponse.json({ success: true, messages: [] });
        }

        const data = JSON.parse(fs.readFileSync(INBOUND_FILE, 'utf8'));
        return NextResponse.json({ success: true, messages: data });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
