import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const INBOUND_FILE = path.join(DATA_DIR, 'inbound.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(INBOUND_FILE)) {
    fs.writeFileSync(INBOUND_FILE, JSON.stringify([]));
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { from, to, subject, body: messageBody } = body;

        const inboundData = JSON.parse(fs.readFileSync(INBOUND_FILE, 'utf8'));
        const newMessage = {
            id: crypto.randomUUID(),
            from: from || 'unknown@domain.com',
            to: to || 'catchall@agency.com',
            subject: subject || 'No Subject',
            body: messageBody || '',
            receivedAt: Date.now()
        };

        inboundData.unshift(newMessage);
        // Keep only last 100 messages for simulation
        const limitedData = inboundData.slice(0, 100);

        fs.writeFileSync(INBOUND_FILE, JSON.stringify(limitedData, null, 2));

        return NextResponse.json({ success: true, message: 'Transmission intercepted' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
