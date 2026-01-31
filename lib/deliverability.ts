/**
 * Simple deliverability utility to analyze email content for spam risk.
 */

const SPAM_TRIGGER_WORDS = [
    'free', 'win', 'winner', 'money', 'cash', 'prize', 'earn', 'income',
    'bitcoin', 'crypto', 'investment', 'offer', 'urgent', 'act now',
    'exclusive', 'limited time', 'guaranteed', '100%', 'no strings',
    'viagra', 'pharmacy', 'loan', 'debt', 'remove', 'unsubscribe'
];

export interface DeliverabilityScore {
    score: number; // 0 to 100
    risk: 'Low' | 'Medium' | 'High';
    suggestions: string[];
}

export function analyzeDeliverability(subject: string, body: string): DeliverabilityScore {
    let score = 100;
    const suggestions: string[] = [];

    // 1. Check Subject Length
    if (subject.length < 5) {
        score -= 10;
        suggestions.push('Subject is too short.');
    } else if (subject.length > 60) {
        score -= 5;
        suggestions.push('Subject line is slightly long.');
    }

    // 2. Check for Spam Words in Subject (High Impact)
    const lowerSubject = subject.toLowerCase();
    SPAM_TRIGGER_WORDS.forEach(word => {
        if (lowerSubject.includes(word)) {
            score -= 15;
            suggestions.push(`Spam trigger word "${word}" found in subject.`);
        }
    });

    // 3. Check for Spam Words in Body
    const lowerBody = body.toLowerCase();
    let spamWordCount = 0;
    SPAM_TRIGGER_WORDS.forEach(word => {
        if (lowerBody.includes(word)) {
            spamWordCount++;
            score -= 5;
        }
    });
    if (spamWordCount > 3) {
        suggestions.push(`High frequency of spam trigger words in body (${spamWordCount}).`);
    }

    // 4. Check for ALL CAPS (Spammy)
    if (subject === subject.toUpperCase() && subject.length > 5) {
        score -= 20;
        suggestions.push('Avoid using ALL CAPS in the subject.');
    }

    // 5. Check for Unsubscribe Link/Word in body (Critical for bulk)
    if (!lowerBody.includes('unsubscribe')) {
        score -= 25;
        suggestions.push('Missing "Unsubscribe" link in the email body. This is a major spam trigger.');
    }

    // 6. Check for Spintax Usage (Good for deliverability)
    if (!subject.includes('{') && !body.includes('{')) {
        score -= 10;
        suggestions.push('Use Spintax to randomize content and reduce spam risk.');
    } else {
        score += 5; // Bonus for using spintax
    }

    // 7. Check Image to Text ratio (Simplified: look for many imgs and little text)
    const imgCount = (body.match(/<img/g) || []).length;
    if (imgCount > 2 && body.length < 500) {
        score -= 15;
        suggestions.push('High image-to-text ratio detected. Add more text content.');
    }

    // Normalize score
    score = Math.max(0, Math.min(100, score));

    let risk: 'Low' | 'Medium' | 'High' = 'Low';
    if (score < 40) risk = 'High';
    else if (score < 75) risk = 'Medium';

    return { score, risk, suggestions };
}
