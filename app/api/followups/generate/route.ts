import { NextResponse } from 'next/server';
import { Lead } from '../../../../types/index';

interface GenerateRequest {
  leads: Lead[];
  senderName?: string;
  senderEmail?: string;
  geminiApiKey?: string;
}

// Smart template-based follow-up generation for Dot Skills
function generateTemplateFollowUp(lead: Lead, senderName: string): { subject: string; body: string } {
  const companyName = senderName && senderName !== 'Your Team' ? senderName : 'Dot Skills';
  const businessBold = `<strong>${lead.businessName}</strong>`;

  const subjects = [
    `Quick follow-up: Growth strategy for ${lead.businessName}`,
    `Following up — ${lead.businessName} x Dot Skills`,
    `${lead.businessName} — Quick question about your online reach`,
  ];

  const subject = subjects[Math.floor(Math.random() * subjects.length)];

  const body = `Hi team at ${lead.businessName},

I reached out recently regarding potential digital growth opportunities for ${lead.businessName}${lead.city ? ` in ${lead.city}` : ''}. At ${companyName}, we specialize in helping local businesses scale through high-converting Web Development, SEO, Local SEO, and Social Media Marketing.

Here is what we recently helped similar ${lead.niche} businesses achieve:
• Google Maps 3-Pack Ranking: Driving 3x more local calls and walk-in leads.
• Modern High-Speed Website: Converting visitors into paying clients with high conversion design.
• Social Media Marketing: Building brand authority and consistent customer engagement.

I'd love to share a free 5-minute video audit customized for ${lead.businessName}. Would you be open to a quick 10-minute call this week?

Best regards,
${companyName} Team
Web Development · SEO · Local SEO · Social Media Marketing`;

  return { subject, body };
}

// Gemini AI-powered follow-up generation with model failovers
async function generateAiFollowUp(lead: Lead, senderName: string, geminiApiKey: string): Promise<{ subject: string; body: string }> {
  const companyName = senderName && senderName !== 'Your Team' ? senderName : 'Dot Skills';

  const prompt = `Write a professional, warm, and concise follow-up email for a business outreach.

Target Business: ${lead.businessName}
Industry: ${lead.niche}
Location: ${lead.city}, ${lead.country}
Sender Company: ${companyName} (Services: Web Development, SEO, Local SEO, Social Media Marketing)

Requirements:
- Always wrap the target business name in <strong>${lead.businessName}</strong> HTML bold tags.
- Mention Dot Skills agency and services (Web Development, SEO, Local SEO, Social Media Marketing).
- Subject line: compelling, personalized, under 60 chars.
- Body: 3 short paragraphs in HTML format with bullet points.
- Include a clear CTA (10-min call or free video audit).

Return JSON format: {"subject": "...", "body": "...html..."}`;

  const models = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ];

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, responseMimeType: 'application/json' }
          })
        }
      );

      if (!res.ok) continue;

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        return { subject: parsed.subject || '', body: parsed.body || '' };
      }
    } catch { }
  }

  return generateTemplateFollowUp(lead, senderName);
}

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();
    const { leads, senderName = 'Dot Skills', geminiApiKey } = body;

    if (!leads || leads.length === 0) {
      return NextResponse.json({ success: true, followUps: [] });
    }

    const followUps = [];

    for (const lead of leads) {
      let generated: { subject: string; body: string };

      if (geminiApiKey && geminiApiKey.trim().length > 5) {
        generated = await generateAiFollowUp(lead, senderName, geminiApiKey.trim());
        await new Promise(r => setTimeout(r, 200));
      } else {
        generated = generateTemplateFollowUp(lead, senderName);
      }

      followUps.push({
        id: crypto.randomUUID(),
        leadId: lead.id,
        leadName: lead.businessName,
        leadEmail: lead.email,
        subject: generated.subject,
        body: generated.body,
        status: 'pending',
        createdAt: Date.now(),
      });
    }

    return NextResponse.json({ success: true, followUps });

  } catch (error: any) {
    console.error('Follow-up generation error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Generation failed' }, { status: 500 });
  }
}
