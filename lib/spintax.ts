/**
 * Spintax utility for email content randomization.
 * Supports nested spintax like: {Hello|Hi {there|friend}}
 */
export function resolveSpintax(text: string): string {
    const regex = /\{([^{}]+)\}/g;

    let resolved = text;
    let match;

    // Process nested spintax from inside out
    while ((match = regex.exec(resolved)) !== null) {
        const options = match[1].split('|');
        const choice = options[Math.floor(Math.random() * options.length)];

        resolved = resolved.substring(0, match.index) +
            choice +
            resolved.substring(match.index + match[0].length);

        // Reset regex index because the string length changed
        regex.lastIndex = 0;
    }

    return resolved;
}

/**
 * Generates an invisible mathematical fingerprint.
 * This adds a unique "signature" to each email body to prevent fingerprinting by spam filters.
 */
export function generateFingerprint(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    const entropy = (Math.random() * 0xFFFFFFFF >>> 0).toString(16);

    // We wrap it in a hidden span with a unique class name
    // The CSS display:none makes it invisible to humans but present in the DOM
    const id = `sig-${timestamp}-${random}`;
    return `<span class="${id}" style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; font-size:0;">${entropy}</span>`;
}
