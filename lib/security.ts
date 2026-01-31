import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SECURITY_FILE = path.join(DATA_DIR, 'security.json');

export function checkIpAllowlist(clientIp: string): { allowed: boolean; reason?: string } {
    try {
        if (!fs.existsSync(SECURITY_FILE)) {
            return { allowed: true };
        }

        const data = JSON.parse(fs.readFileSync(SECURITY_FILE, 'utf8'));
        const allowlist = data.ipAllowlist || [];

        if (allowlist.length === 0) {
            return { allowed: true };
        }

        // Clean client IP (handle ::1 for localhost)
        const normalizedIp = clientIp === '::1' ? '127.0.0.1' : clientIp;

        const isAllowed = allowlist.some((pattern: string) => {
            if (pattern === normalizedIp) return true;
            // Simple prefix match for subnet simulation
            if (pattern.includes('/') && normalizedIp.startsWith(pattern.split('/')[0].split('.').slice(0, 3).join('.'))) {
                return true;
            }
            return false;
        });

        if (!isAllowed) {
            return { allowed: false, reason: 'IP Address not authorized in Cloud Infrastructure' };
        }

        return { allowed: true };
    } catch (error) {
        console.error('Security Check Error:', error);
        return { allowed: true }; // Default to allow if check fails to avoid lockout
    }
}
