import { NextResponse } from 'next/server';
import { Lead } from '../../../../types/index';

interface GenerateRequest {
  leads: Lead[];
  senderName?: string;
  senderEmail?: string;
  geminiApiKey?: string;
}

// Smart template-based follow-up generation (works without API key)
function generateTemplateFollowUp(lead: Lead, senderName: string): { subject: string; body: string } {
  const serviceAreas = {
    'beauty salon': 'online booking system and website',
    'restaurant': 'online ordering system and digital presence',
    'plumber': 'lead generation website and local SEO',
    'dentist': 'patient booking system and online presence',
    'real estate': 'property listing platform and CRM',
    'gym': 'member management system and fitness app',
    'lawyer': 'client intake system and legal website',
    'accountant': 'client portal and business website',
    'photographer': 'portfolio website and online booking',
    'cleaning service': 'booking system and local SEO',
  };

  const service = serviceAreas[lead.niche.toLowerCase() as keyof typeof serviceAreas] || 'digital presence and website';

  const subjects = [
    `Quick follow-up: ${lead.businessName}'s online growth`,
    `Following up — ${lead.businessName}`,
    `${lead.businessName} — One quick question`,
  ];

  const subject = subjects[Math.floor(Math.random() * subjects.length)];

  const body = `<p>Hi there,</p>

<p>I reached out recently about helping <strong>${lead.businessName}</strong> with your ${service}. I know you're busy running your ${lead.niche} business${lead.city ? ` in ${lead.city}` : ''}, so I wanted to follow up briefly.</p>

<p>Many ${lead.niche} businesses I've worked with were able to:</p>
<ul>
  <li>Increase online bookings by 40%+</li>
  <li>Save hours every week on manual tasks</li>
  <li>Attract more local customers through Google</li>
</ul>

<p>I'd love to show you what I put together specifically for ${lead.businessName}. It would only take 15 minutes of your time.</p>

<p>Would this week work for a quick call?</p>

<p>Best regards,<br>
<strong>${senderName}</strong></p>

<p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
  If you're not interested, just reply "No thanks" and I won't reach out again.
</p>`;

  return { subject, body };
}

// Gemini AI-powered follow-up generation with model failovers
async function generateAiFollowUp(lead: Lead, senderName: string, geminiApiKey: string): Promise<{ subject: string; body: string }> {
  const prompt = `Write a professional, warm, and concise follow-up email for a business outreach.

Business: ${lead.businessName}
Industry: ${lead.niche}
Location: ${lead.city}, ${lead.country}
Sender: ${senderName}
Context: We reached out previously about helping them with their digital presence/website but got no reply.

Requirements:
- Subject line: compelling, personalized, under 60 chars
- Body: 3-4 short paragraphs, HTML format
- Tone: professional but friendly, not pushy
- Include a clear CTA (15-min call)
- End with an easy opt-out line

Return JSON: {"subject": "...", "body": "...html..."}`;

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

  // Fallback to smart template if AI models fail or key is invalid
  return generateTemplateFollowUp(lead, senderName);
}

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();
    const { leads, senderName = 'Your Name', geminiApiKey } = body;

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
